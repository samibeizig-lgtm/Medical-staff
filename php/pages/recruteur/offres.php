<?php
defined('APP_ROOT') || exit;
require_role('recruteur');
$r = current_recruteur();
$rid = (int)$r['id'];

if (is_post()) {
    csrf_check();
    $id = (int)($_POST['offre_id'] ?? 0);
    if (($_POST['action'] ?? '') === 'toggle') {
        if (db_exec('UPDATE offres SET active = 1 - active, updated_at = NOW() WHERE id = ? AND recruteur_id = ?', [$id, $rid])) {
            $active = (int)db_val('SELECT active FROM offres WHERE id = ?', [$id]);
            if ($active && !abonnement_actif($rid)) {
                db_exec('UPDATE offres SET active = 0 WHERE id = ?', [$id]);
                flash('warning', 'Un abonnement actif est nécessaire pour réactiver une offre.');
            } else {
                flash('success', $active ? 'Offre réactivée.' : 'Offre désactivée.');
            }
        }
    }
    redirect('recruteur/offres');
}

$offres = db_all(
    'SELECT o.*, (SELECT COUNT(*) FROM candidatures ca WHERE ca.offre_id = o.id) AS nb
     FROM offres o WHERE o.recruteur_id = ? ORDER BY o.active DESC, o.created_at DESC',
    [$rid]
);
$pageTitle = 'Mes offres';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h1 class="h3 mb-0"><i class="fa-solid fa-briefcase text-primary me-2"></i>Mes offres d'emploi</h1>
        <a href="<?= url('recruteur/offre_form') ?>" class="btn btn-primary"><i class="fa-solid fa-plus me-1"></i>Nouvelle offre</a>
    </div>
    <div class="card border-0 shadow-sm table-responsive">
        <table class="table align-middle mb-0">
            <thead class="table-light"><tr><th>Poste</th><th>Contrat</th><th>Lieu</th><th>Date limite</th><th>Candidatures</th><th>Statut</th><th class="text-end">Actions</th></tr></thead>
            <tbody>
            <?php foreach ($offres as $o):
                $expiree = $o['date_limite'] && $o['date_limite'] < date('Y-m-d'); ?>
                <tr class="<?= $o['active'] ? '' : 'text-muted' ?>">
                    <td><strong><?= e($o['titre']) ?></strong><br><small class="text-muted">Publiée le <?= date_fr($o['created_at']) ?></small></td>
                    <td><?= e($o['type_contrat']) ?></td>
                    <td><?= e($o['ville']) ?></td>
                    <td><?= date_fr($o['date_limite']) ?><?= $expiree ? ' <span class="badge text-bg-warning">Expirée</span>' : '' ?></td>
                    <td><a href="<?= url('recruteur/candidatures?offre=' . (int)$o['id']) ?>" class="badge rounded-pill text-bg-primary text-decoration-none fs-6"><?= (int)$o['nb'] ?></a></td>
                    <td><?= $o['active'] ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Désactivée</span>' ?></td>
                    <td class="text-end text-nowrap">
                        <a class="btn btn-sm btn-outline-secondary" title="Suggestions IA" href="<?= url('recruteur/suggestions?offre=' . (int)$o['id']) ?>">🧠</a>
                        <a class="btn btn-sm btn-outline-primary" title="Candidatures" href="<?= url('recruteur/candidatures?offre=' . (int)$o['id']) ?>"><i class="fa-solid fa-users"></i></a>
                        <a class="btn btn-sm btn-outline-primary" title="Modifier" href="<?= url('recruteur/offre_form?id=' . (int)$o['id']) ?>"><i class="fa-solid fa-pen"></i></a>
                        <form method="post" class="d-inline">
                            <?= csrf_field() ?><input type="hidden" name="offre_id" value="<?= (int)$o['id'] ?>"><input type="hidden" name="action" value="toggle">
                            <button class="btn btn-sm <?= $o['active'] ? 'btn-outline-danger' : 'btn-outline-success' ?>" title="<?= $o['active'] ? 'Désactiver' : 'Réactiver' ?>"><i class="fa-solid fa-power-off"></i></button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; if (!$offres): ?>
                <tr><td colspan="7" class="text-center text-muted py-5">Aucune offre. <a href="<?= url('recruteur/offre_form') ?>">Publiez votre première offre</a>.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
