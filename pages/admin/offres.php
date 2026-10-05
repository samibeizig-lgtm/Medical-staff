<?php
defined('APP_ROOT') || exit;
require APP_ROOT . '/includes/admin.php';
require APP_ROOT . '/includes/offres.php';
require_role('admin');

if (is_post()) {
    csrf_check();
    $id = (int)($_POST['offre_id'] ?? 0);
    $o = db_one('SELECT o.id, o.titre, r.nom_etablissement FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id WHERE o.id = ?', [$id]);
    $action = $_POST['action'] ?? '';
    if ($o && $action === 'toggle') {
        db_exec('UPDATE offres SET active = 1 - active, updated_at = NOW() WHERE id = ?', [$id]);
        admin_log('Changement de statut de l\'offre #' . $id . ' (' . $o['titre'] . ')');
        flash('success', 'Statut de l\'offre mis à jour.');
    } elseif ($o && $action === 'supprimer') {
        db_exec('DELETE FROM offres WHERE id = ?', [$id]);
        admin_log('Suppression de l\'offre #' . $id . ' (' . $o['titre'] . ' – ' . $o['nom_etablissement'] . ')');
        flash('success', 'Offre supprimée.');
    }
    redirect('admin/offres?' . http_build_query(array_intersect_key($_GET, array_flip(['statut', 'q', 'page']))));
}

$statut = in_array($_GET['statut'] ?? '', ['active', 'inactive'], true) ? $_GET['statut'] : '';
$q = input('q');
$where = ['1 = 1'];
$params = [];
if ($statut) { $where[] = 'o.active = ?'; $params[] = $statut === 'active' ? 1 : 0; }
if ($q !== '') {
    $where[] = '(o.titre LIKE ? OR r.nom_etablissement LIKE ? OR o.ville LIKE ?)';
    $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $q) . '%';
    array_push($params, $like, $like, $like);
}
$sqlWhere = implode(' AND ', $where);
$perPage = 20;
$page = max(1, (int)input('page', 1));
$total = (int)db_val("SELECT COUNT(*) FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id WHERE $sqlWhere", $params);
$rows = db_all(
    "SELECT o.*, r.nom_etablissement, (SELECT COUNT(*) FROM candidatures ca WHERE ca.offre_id = o.id) AS nb
     FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id WHERE $sqlWhere ORDER BY o.created_at DESC LIMIT $perPage OFFSET " . (($page - 1) * $perPage),
    $params
);
$res = ['total' => $total, 'page' => $page, 'pages' => max(1, (int)ceil($total / $perPage))];
$pageTitle = 'Offres';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <h1 class="h3 mb-3"><i class="fa-solid fa-user-shield me-2"></i>Administration</h1>
    <?= admin_nav('offres') ?>
    <form class="card border-0 shadow-sm mb-3" method="get">
        <div class="card-body row g-2 align-items-end">
            <div class="col-md-7"><label class="form-label small">Recherche</label><input name="q" class="form-control" placeholder="Poste, établissement ou ville" value="<?= e($q) ?>"></div>
            <div class="col-md-3"><label class="form-label small">Statut</label><select name="statut" class="form-select"><?= options(['active' => 'Actives', 'inactive' => 'Désactivées'], $statut, 'Toutes') ?></select></div>
            <div class="col-md-2 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-magnifying-glass me-1"></i>Filtrer</button></div>
        </div>
    </form>
    <p class="text-muted small"><?= $total ?> offre(s)</p>
    <div class="card border-0 shadow-sm table-responsive">
        <table class="table align-middle mb-0 small">
            <thead class="table-light"><tr><th>Offre</th><th>Établissement</th><th>Publiée</th><th>Date limite</th><th class="text-end">Candidatures</th><th>Statut</th><th class="text-end">Actions</th></tr></thead>
            <tbody>
            <?php foreach ($rows as $o): ?>
                <tr class="<?= $o['active'] ? '' : 'text-muted' ?>">
                    <td><strong><?= e($o['titre']) ?></strong><br><?= e($o['type_contrat']) ?> · <?= e($o['ville']) ?> · <?= e(salaire_range($o['salaire_min'], $o['salaire_max'])) ?></td>
                    <td><?= e($o['nom_etablissement']) ?></td>
                    <td><?= date_fr($o['created_at']) ?></td>
                    <td><?= date_fr($o['date_limite']) ?></td>
                    <td class="text-end"><?= (int)$o['nb'] ?></td>
                    <td><?= $o['active'] ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Désactivée</span>' ?></td>
                    <td class="text-end text-nowrap">
                        <form method="post" class="d-inline">
                            <?= csrf_field() ?><input type="hidden" name="offre_id" value="<?= (int)$o['id'] ?>">
                            <button name="action" value="toggle" class="btn btn-sm <?= $o['active'] ? 'btn-outline-warning' : 'btn-outline-success' ?>" title="<?= $o['active'] ? 'Désactiver' : 'Réactiver' ?>"><i class="fa-solid fa-power-off"></i></button>
                            <button name="action" value="supprimer" class="btn btn-sm btn-outline-danger" title="Supprimer" onclick="return confirm('Supprimer définitivement cette offre et ses candidatures ?')"><i class="fa-solid fa-trash"></i></button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; if (!$rows): ?><tr><td colspan="7" class="text-center text-muted py-4">Aucune offre.</td></tr><?php endif; ?>
            </tbody>
        </table>
    </div>
    <div class="mt-3"><?= pagination($res) ?></div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
