<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require_role('recruteur');
$r = current_recruteur();
$rid = (int)$r['id'];

$entId = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
$ent = $entId ? db_one('SELECT * FROM entretiens WHERE id = ? AND recruteur_id = ?', [$entId, $rid]) : null;
if ($entId && !$ent) {
    http_response_code(404);
    exit('Entretien introuvable.');
}
$candId = $ent ? (int)$ent['candidat_id'] : (int)($_GET['candidat'] ?? $_POST['candidat'] ?? 0);
$offreId = $ent ? (int)$ent['offre_id'] : (int)($_GET['offre'] ?? $_POST['offre'] ?? 0);
$cand = db_one('SELECT c.*, u.email FROM candidats c JOIN utilisateurs u ON u.id = c.utilisateur_id WHERE c.id = ?', [$candId]);
if (!$cand) {
    http_response_code(404);
    exit('Candidat introuvable.');
}
if (!recruteur_peut_voir_cv($rid, $candId)) {
    flash('warning', 'Un abonnement actif est nécessaire pour proposer un entretien à ce candidat.');
    redirect('recruteur/abonnement.php');
}
$mesOffres = db_all('SELECT id, titre, ville FROM offres WHERE recruteur_id = ? ORDER BY active DESC, created_at DESC', [$rid]);
$errors = [];

if (is_post()) {
    csrf_check();
    $debut = (string)($_POST['date_debut'] ?? '');
    $fin = (string)($_POST['date_fin'] ?? '');
    $lieu = input('lieu');
    $contact = input('contact');
    $offreId = (int)($_POST['offre'] ?? 0);
    $tsD = strtotime($debut);
    $tsF = strtotime($fin);
    if (!$tsD || !$tsF || $tsF <= $tsD) $errors[] = 'Veuillez sélectionner un créneau dans le calendrier.';
    elseif ($tsD < time()) $errors[] = 'Le créneau doit être dans le futur.';
    elseif ((int)date('G', $tsD) < 8 || (int)date('G', $tsF - 1) >= 18) $errors[] = 'Le créneau doit être compris entre 8h et 18h.';
    if ($lieu === '') $errors[] = 'Le lieu est obligatoire.';
    if ($contact === '') $errors[] = 'La personne à contacter est obligatoire.';
    if ($offreId && !db_val('SELECT 1 FROM offres WHERE id = ? AND recruteur_id = ?', [$offreId, $rid])) $offreId = 0;
    if (!$errors) {
        $chevauche = db_val('SELECT 1 FROM entretiens WHERE recruteur_id = ? AND statut <> \'refuse\' AND id <> ? AND date_debut < ? AND date_fin > ?',
            [$rid, $entId, date('Y-m-d H:i:s', $tsF), date('Y-m-d H:i:s', $tsD)]);
        if ($chevauche) $errors[] = 'Ce créneau chevauche un autre entretien déjà planifié.';
    }
    if (!$errors) {
        $d1 = date('Y-m-d H:i:s', $tsD);
        $d2 = date('Y-m-d H:i:s', $tsF);
        if ($ent) {
            db_exec("UPDATE entretiens SET date_debut=?, date_fin=?, lieu=?, contact=?, offre_id=?, statut='en_attente', updated_at=NOW() WHERE id=?",
                [$d1, $d2, $lieu, $contact, $offreId ?: null, $entId]);
        } else {
            db_exec('INSERT INTO entretiens (recruteur_id, candidat_id, offre_id, date_debut, date_fin, lieu, contact) VALUES (?,?,?,?,?,?,?)',
                [$rid, $candId, $offreId ?: null, $d1, $d2, $lieu, $contact]);
        }
        if ($offreId) {
            db_exec("UPDATE candidatures SET statut='entretien' WHERE offre_id=? AND candidat_id=?", [$offreId, $candId]);
        }
        $titre = $offreId ? db_val('SELECT titre FROM offres WHERE id = ?', [$offreId]) : null;
        send_mail($cand['email'], ($ent ? 'Modification de votre entretien' : 'Proposition d\'entretien') . ' – ' . $r['nom_etablissement'],
            '<p>Bonjour ' . e($cand['prenom']) . ',</p><p><strong>' . e($r['nom_etablissement']) . '</strong> ' . ($ent ? 'a modifié' : 'vous propose') . ' un entretien'
            . ($titre ? ' pour le poste « ' . e($titre) . ' »' : '') . ' :</p><ul>'
            . '<li>Date : <strong>' . date_fr($d1) . '</strong></li><li>Horaire : <strong>' . e(plage_horaire($d1, $d2)) . '</strong></li>'
            . '<li>Lieu : ' . e($lieu) . '</li><li>Contact : ' . e($contact) . '</li></ul>'
            . '<p><a href="' . e(absolute_url('candidat/entretiens.php')) . '">Valider ou refuser cet entretien depuis votre espace</a></p>');
        flash('success', 'Entretien ' . ($ent ? 'modifié' : 'planifié') . ' le ' . date_fr($d1) . ' (' . plage_horaire($d1, $d2) . '). Le candidat a été notifié par email.');
        redirect('recruteur/entretiens.php');
    }
}

// Événements existants du recruteur pour le calendrier
$events = [];
foreach (db_all("SELECT e.*, c.prenom, c.nom FROM entretiens e JOIN candidats c ON c.id = e.candidat_id
                 WHERE e.recruteur_id = ? AND e.statut <> 'refuse' AND e.date_fin >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [$rid]) as $ev) {
    if ($ent && (int)$ev['id'] === $entId) continue;
    $events[] = [
        'title' => plage_horaire($ev['date_debut'], $ev['date_fin']) . ' · ' . $ev['prenom'] . ' ' . $ev['nom'],
        'start' => str_replace(' ', 'T', $ev['date_debut']),
        'end' => str_replace(' ', 'T', $ev['date_fin']),
        'color' => $ev['statut'] === 'confirme' ? '#0d6efd' : '#6c757d',
    ];
}
$sel = null;
if (!empty($_POST['date_debut'])) {
    $sel = ['start' => $_POST['date_debut'], 'end' => $_POST['date_fin']];
} elseif ($ent) {
    $sel = ['start' => str_replace(' ', 'T', $ent['date_debut']), 'end' => str_replace(' ', 'T', $ent['date_fin'])];
}
$defaultContact = $r['contact_prenom'] . ' ' . $r['contact_nom'] . ($r['telephone'] ? ' – ' . $r['telephone'] : '');
$pageTitle = $ent ? 'Modifier l\'entretien' : 'Planifier un entretien';
$extraHead = '<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js"></script>'
    . '<script src="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.15/locales/fr.global.min.js"></script>';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <h1 class="h3 mb-1"><i class="fa-solid fa-calendar-plus text-primary me-2"></i><?= $ent ? 'Modifier l\'entretien' : 'Planifier un entretien' ?></h1>
    <p class="text-muted">Avec <strong><?= e($cand['prenom'] . ' ' . $cand['nom']) ?></strong> (<?= e($cand['poste_recherche']) ?>). Cliquez sur une case horaire pour choisir un créneau de 30 minutes.</p>
    <?php foreach ($errors as $err): ?><div class="alert alert-danger py-2"><?= e($err) ?></div><?php endforeach; ?>
    <div class="row g-4">
        <div class="col-lg-8">
            <div class="card border-0 shadow-sm"><div class="card-body"><div id="calendar"></div></div></div>
            <div class="small text-muted mt-2">
                <span class="legend" style="background:#198754"></span>Créneau sélectionné
                <span class="legend ms-3" style="background:#0d6efd"></span>Entretien confirmé
                <span class="legend ms-3" style="background:#6c757d"></span>Entretien en attente
            </div>
        </div>
        <div class="col-lg-4">
            <form method="post" class="card border-0 shadow-sm" id="entretien-form">
                <div class="card-body">
                    <?= csrf_field() ?>
                    <input type="hidden" name="id" value="<?= $entId ?>">
                    <input type="hidden" name="candidat" value="<?= $candId ?>">
                    <input type="hidden" name="date_debut" id="date_debut" value="<?= e($sel['start'] ?? '') ?>">
                    <input type="hidden" name="date_fin" id="date_fin" value="<?= e($sel['end'] ?? '') ?>">
                    <div class="mb-3">
                        <label class="form-label">Créneau</label>
                        <div id="slot-display" class="slot-display <?= $sel ? 'has-slot' : '' ?>">Aucun créneau sélectionné</div>
                    </div>
                    <div class="mb-3"><label class="form-label">Offre concernée</label>
                        <select name="offre" class="form-select"><option value="0">— Aucune (CVthèque) —</option>
                        <?php foreach ($mesOffres as $o): ?><option value="<?= (int)$o['id'] ?>" <?= $o['id'] == $offreId ? 'selected' : '' ?>><?= e($o['titre'] . ' – ' . $o['ville']) ?></option><?php endforeach; ?>
                        </select></div>
                    <div class="mb-3"><label class="form-label">Lieu *</label><input name="lieu" class="form-control" required value="<?= e(input('lieu', $ent['lieu'] ?? trim(($r['adresse'] ? $r['adresse'] . ', ' : '') . $r['ville']))) ?>"></div>
                    <div class="mb-3"><label class="form-label">Personne à contacter *</label><input name="contact" class="form-control" required value="<?= e(input('contact', $ent['contact'] ?? $defaultContact)) ?>"></div>
                    <button class="btn btn-success w-100"><i class="fa-solid fa-paper-plane me-1"></i><?= $ent ? 'Enregistrer et notifier' : 'Envoyer la proposition' ?></button>
                    <p class="small text-muted mt-2 mb-0"><i class="fa-solid fa-envelope me-1"></i>Le candidat recevra un email et pourra valider ou refuser depuis son espace.</p>
                </div>
            </form>
        </div>
    </div>
</div>
<?php
$jsEvents = json_encode($events, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG);
$jsSel = json_encode($sel, JSON_HEX_TAG);
$extraScripts = <<<JS
<script>
document.addEventListener('DOMContentLoaded', function () {
  const events = $jsEvents;
  let sel = $jsSel;
  const pad = n => String(n).padStart(2, '0');
  const local = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00';
  const h = d => d.getHours() + 'h' + pad(d.getMinutes());
  const display = document.getElementById('slot-display');
  let selEvent = null;

  const cal = new FullCalendar.Calendar(document.getElementById('calendar'), {
    locale: 'fr', initialView: window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek',
    initialDate: sel ? sel.start : undefined,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' },
    slotMinTime: '08:00:00', slotMaxTime: '18:00:00', slotDuration: '00:30:00', allDaySlot: false,
    hiddenDays: [0], height: 'auto', displayEventTime: false, nowIndicator: true, selectable: true, selectMirror: true,
    businessHours: { daysOfWeek: [1,2,3,4,5,6], startTime: '08:00', endTime: '18:00' },
    events: events,
    selectAllow: info => info.start >= new Date(),
    dateClick: info => { if (info.date < new Date()) return; setSlot(info.date, new Date(info.date.getTime() + 30 * 60000)); },
    select: info => { setSlot(info.start, info.end); cal.unselect(); },
  });
  function setSlot(start, end) {
    const label = h(start) + ' - ' + h(end);
    if (selEvent) selEvent.remove();
    selEvent = cal.addEvent({ title: '✔ ' + label, start, end, color: '#198754', classNames: ['slot-selected'] });
    document.getElementById('date_debut').value = local(start);
    document.getElementById('date_fin').value = local(end);
    display.textContent = start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + label;
    display.classList.add('has-slot');
  }
  cal.render();
  if (sel) setSlot(new Date(sel.start), new Date(sel.end));
  document.getElementById('entretien-form').addEventListener('submit', e => {
    if (!document.getElementById('date_debut').value) { e.preventDefault(); alert('Veuillez cliquer sur une case horaire du calendrier.'); }
  });
});
</script>
JS;
require APP_ROOT . '/includes/footer.php';
