<?php
defined('APP_ROOT') || exit;
require APP_ROOT . '/includes/admin.php';
require APP_ROOT . '/includes/offres.php';
require_role('admin');
$prix = (int)cfg('abonnement_prix');

if (is_post()) {
    csrf_check();
    $action = $_POST['action'] ?? '';
    if ($action === 'activer') {
        // Activation manuelle (paiement par virement, chèque, offre commerciale…)
        $rid = (int)($_POST['recruteur_id'] ?? 0);
        $rec = db_one('SELECT r.id, r.nom_etablissement, u.email FROM recruteurs r JOIN utilisateurs u ON u.id = r.utilisateur_id WHERE r.id = ?', [$rid]);
        $montant = max(0, (int)($_POST['montant'] ?? $prix));
        $ref = preg_replace('/[^A-Za-z0-9\-_\/ ]/', '', input('reference')) ?: 'ADMIN-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));
        if ($rec) {
            $current = abonnement_actif($rid);
            $debut = $current ? date('Y-m-d', strtotime($current['date_fin'] . ' +1 day')) : date('Y-m-d');
            $fin = date('Y-m-d', strtotime($debut . ' +1 year -1 day'));
            db_exec('INSERT INTO abonnements (recruteur_id, montant, date_debut, date_fin, statut, reference_paiement) VALUES (?,?,?,?,?,?)',
                [$rid, $montant, $debut, $fin, 'actif', mb_substr($ref, 0, 60)]);
            send_mail($rec['email'], 'Votre abonnement Medical Staff est actif',
                '<p>Bonjour,</p><p>L\'abonnement annuel de <strong>' . e($rec['nom_etablissement']) . '</strong> est actif du ' . date_fr($debut) . ' au ' . date_fr($fin) . '.</p><p>Référence : ' . e($ref) . '</p>');
            admin_log('Activation manuelle d\'abonnement pour ' . $rec['nom_etablissement'] . ' (' . $ref . ', ' . $montant . ' TND)');
            flash('success', 'Abonnement activé pour ' . $rec['nom_etablissement'] . ' jusqu\'au ' . date_fr($fin) . '.');
        }
    } elseif ($action === 'annuler') {
        $id = (int)($_POST['abonnement_id'] ?? 0);
        if (db_exec("UPDATE abonnements SET statut = 'annule' WHERE id = ? AND statut = 'actif'", [$id])) {
            admin_log('Annulation de l\'abonnement #' . $id);
            flash('success', 'Abonnement annulé.');
        }
    }
    redirect('admin/abonnements');
}

$perPage = 25;
$page = max(1, (int)input('page', 1));
$total = (int)db_val('SELECT COUNT(*) FROM abonnements');
$rows = db_all(
    'SELECT a.*, r.nom_etablissement, r.ville FROM abonnements a JOIN recruteurs r ON r.id = a.recruteur_id
     ORDER BY a.created_at DESC LIMIT ' . $perPage . ' OFFSET ' . (($page - 1) * $perPage)
);
$recruteurs = db_all('SELECT id, nom_etablissement, ville FROM recruteurs ORDER BY nom_etablissement');
$res = ['total' => $total, 'page' => $page, 'pages' => max(1, (int)ceil($total / $perPage))];
$pageTitle = 'Abonnements';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <h1 class="h3 mb-3"><i class="fa-solid fa-user-shield me-2"></i>Administration</h1>
    <?= admin_nav('abonnements') ?>
    <div class="row g-4">
        <div class="col-lg-4">
            <form method="post" class="card border-0 shadow-sm">
                <div class="card-body">
                    <h2 class="h6">Activer un abonnement manuellement</h2>
                    <p class="small text-muted">Pour un paiement reçu hors plateforme (virement, chèque…). L'abonnement d'un an s'ajoute à la suite de l'abonnement en cours.</p>
                    <?= csrf_field() ?><input type="hidden" name="action" value="activer">
                    <div class="mb-2"><label class="form-label small">Établissement</label>
                        <select name="recruteur_id" class="form-select" required><option value="">Choisir…</option>
                        <?php foreach ($recruteurs as $r): ?><option value="<?= (int)$r['id'] ?>"><?= e($r['nom_etablissement'] . ' – ' . $r['ville']) ?></option><?php endforeach; ?>
                        </select></div>
                    <div class="mb-2"><label class="form-label small">Montant (TND)</label><input type="number" min="0" name="montant" class="form-control" value="<?= $prix ?>"></div>
                    <div class="mb-3"><label class="form-label small">Référence du paiement</label><input name="reference" class="form-control" placeholder="ex. VIR-2026-0042"></div>
                    <button class="btn btn-success w-100"><i class="fa-solid fa-check me-1"></i>Activer pour 1 an</button>
                </div>
            </form>
        </div>
        <div class="col-lg-8">
            <div class="card border-0 shadow-sm table-responsive">
                <table class="table align-middle mb-0 small">
                    <thead class="table-light"><tr><th>Établissement</th><th>Référence</th><th>Période</th><th class="text-end">Montant</th><th>Statut</th><th></th></tr></thead>
                    <tbody>
                    <?php foreach ($rows as $a):
                        $enCours = $a['statut'] === 'actif' && $a['date_fin'] >= date('Y-m-d'); ?>
                        <tr>
                            <td><strong><?= e($a['nom_etablissement']) ?></strong><br><span class="text-muted"><?= e($a['ville']) ?></span></td>
                            <td><?= e($a['reference_paiement']) ?></td>
                            <td class="text-nowrap"><?= date_fr($a['date_debut']) ?> → <?= date_fr($a['date_fin']) ?></td>
                            <td class="text-end"><?= money($a['montant']) ?></td>
                            <td><?= $a['statut'] === 'annule' ? '<span class="badge bg-danger">Annulé</span>' : ($enCours ? '<span class="badge bg-success">Actif</span>' : '<span class="badge bg-secondary">Expiré</span>') ?></td>
                            <td class="text-end"><?php if ($enCours): ?>
                                <form method="post" class="d-inline"><?= csrf_field() ?><input type="hidden" name="action" value="annuler"><input type="hidden" name="abonnement_id" value="<?= (int)$a['id'] ?>">
                                    <button class="btn btn-sm btn-outline-danger" title="Annuler" onclick="return confirm('Annuler cet abonnement ? L\'établissement perdra l\'accès à la CVthèque et à la publication d\'offres.')"><i class="fa-solid fa-ban"></i></button></form>
                            <?php endif; ?></td>
                        </tr>
                    <?php endforeach; if (!$rows): ?><tr><td colspan="6" class="text-center text-muted py-4">Aucun abonnement.</td></tr><?php endif; ?>
                    </tbody>
                </table>
            </div>
            <div class="mt-3"><?= pagination($res) ?></div>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
