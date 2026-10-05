<?php
defined('APP_ROOT') || exit;
require_role('candidat');
$me = current_candidat();
$cid = (int)$me['id'];

if (is_post()) {
    csrf_check();
    $id = (int)($_POST['entretien_id'] ?? 0);
    $action = $_POST['action'] ?? '';
    $ent = db_one(
        'SELECT e.*, o.titre, u.email AS rec_email, r.nom_etablissement FROM entretiens e
         JOIN recruteurs r ON r.id = e.recruteur_id JOIN utilisateurs u ON u.id = r.utilisateur_id
         LEFT JOIN offres o ON o.id = e.offre_id WHERE e.id = ? AND e.candidat_id = ?',
        [$id, $cid]
    );
    if ($ent && in_array($action, ['confirme', 'refuse'], true)) {
        db_exec('UPDATE entretiens SET statut = ?, updated_at = NOW() WHERE id = ?', [$action, $id]);
        $verbe = $action === 'confirme' ? 'a <strong style="color:#198754">confirmé</strong>' : 'a <strong style="color:#dc3545">refusé</strong>';
        send_mail($ent['rec_email'], 'Réponse à votre proposition d\'entretien',
            '<p>Bonjour,</p><p>Le candidat ' . e($me['prenom'] . ' ' . $me['nom']) . ' (' . e(ref_candidat($cid)) . ') ' . $verbe . ' l\'entretien du <strong>'
            . e(date_fr($ent['date_debut'])) . ' (' . e(plage_horaire($ent['date_debut'], $ent['date_fin'])) . ')</strong>'
            . ($ent['titre'] ? ' pour le poste « ' . e($ent['titre']) . ' »' : '') . '.</p>');
        flash('success', $action === 'confirme' ? 'Entretien confirmé. Le recruteur a été notifié.' : 'Entretien refusé. Le recruteur a été notifié.');
    }
    redirect('candidat/entretiens');
}

$rows = db_all(
    'SELECT e.*, o.titre, r.nom_etablissement, r.ville AS rec_ville FROM entretiens e
     JOIN recruteurs r ON r.id = e.recruteur_id LEFT JOIN offres o ON o.id = e.offre_id
     WHERE e.candidat_id = ? ORDER BY e.date_debut DESC',
    [$cid]
);
$pageTitle = 'Mes entretiens';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <h1 class="h3 mb-3"><i class="fa-solid fa-calendar-check text-primary me-2"></i>Mes entretiens</h1>
    <?php if (!$rows): ?>
        <div class="empty-state"><i class="fa-regular fa-calendar"></i><p>Aucun entretien pour le moment. Les propositions des recruteurs apparaîtront ici.</p></div>
    <?php endif; ?>
    <div class="row g-3">
    <?php foreach ($rows as $r): $passe = strtotime($r['date_debut']) < time(); ?>
        <div class="col-md-6">
            <div class="card border-0 shadow-sm h-100 interview-card status-<?= e($r['statut']) ?>">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h2 class="h5 mb-1"><?= e($r['titre'] ?: 'Entretien') ?></h2>
                        <?= statut_entretien_badge($r['statut']) ?>
                    </div>
                    <p class="text-muted mb-2"><i class="fa-solid fa-hospital me-1"></i><?= e($r['nom_etablissement']) ?></p>
                    <ul class="list-unstyled small mb-3">
                        <li><i class="fa-regular fa-calendar me-2 text-primary"></i><?= date_fr($r['date_debut']) ?> · <strong><?= e(plage_horaire($r['date_debut'], $r['date_fin'])) ?></strong></li>
                        <li><i class="fa-solid fa-location-dot me-2 text-primary"></i><?= e($r['lieu']) ?></li>
                        <li><i class="fa-solid fa-user-tie me-2 text-primary"></i>Contact : <?= e($r['contact']) ?></li>
                    </ul>
                    <?php if (!$passe && $r['statut'] !== 'refuse'): ?>
                    <form method="post" class="d-flex gap-2">
                        <?= csrf_field() ?>
                        <input type="hidden" name="entretien_id" value="<?= (int)$r['id'] ?>">
                        <?php if ($r['statut'] !== 'confirme'): ?>
                        <button name="action" value="confirme" class="btn btn-success btn-sm"><i class="fa-solid fa-check me-1"></i>Valider</button>
                        <?php endif; ?>
                        <button name="action" value="refuse" class="btn btn-outline-danger btn-sm" onclick="return confirm('Refuser cet entretien ?')"><i class="fa-solid fa-xmark me-1"></i>Refuser</button>
                    </form>
                    <?php elseif ($passe): ?>
                        <span class="small text-muted">Entretien passé</span>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
