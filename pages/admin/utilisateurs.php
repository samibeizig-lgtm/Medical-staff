<?php
defined('APP_ROOT') || exit;
require APP_ROOT . '/includes/admin.php';
$me = require_role('admin');

if (is_post()) {
    csrf_check();
    $id = (int)($_POST['user_id'] ?? 0);
    $action = $_POST['action'] ?? '';
    $u = db_one('SELECT id, email, type FROM utilisateurs WHERE id = ?', [$id]);
    if (!$u || $u['type'] === 'admin') {
        flash('danger', 'Action impossible sur ce compte.');
    } elseif ($action === 'suspendre' || $action === 'reactiver') {
        $actif = $action === 'reactiver' ? 1 : 0;
        db_exec('UPDATE utilisateurs SET actif = ? WHERE id = ?', [$actif, $id]);
        if (!$actif && $u['type'] === 'recruteur') {
            // Les offres d'un établissement suspendu ne sont plus visibles
            db_exec('UPDATE offres o JOIN recruteurs r ON r.id = o.recruteur_id SET o.active = 0 WHERE r.utilisateur_id = ?', [$id]);
        }
        admin_log(($actif ? 'Réactivation' : 'Suspension') . ' du compte ' . $u['email']);
        flash('success', 'Compte ' . $u['email'] . ($actif ? ' réactivé.' : ' suspendu.'));
    } elseif ($action === 'supprimer') {
        $photo = db_val('SELECT photo FROM candidats WHERE utilisateur_id = ?', [$id]);
        db_exec('DELETE FROM utilisateurs WHERE id = ?', [$id]); // cascade sur toutes les données liées
        if ($photo && is_file(PUBLIC_ROOT . '/uploads/photos/' . basename($photo))) {
            @unlink(PUBLIC_ROOT . '/uploads/photos/' . basename($photo));
        }
        admin_log('Suppression du compte ' . $u['email']);
        flash('success', 'Compte ' . $u['email'] . ' supprimé définitivement.');
    }
    redirect('admin/utilisateurs?' . http_build_query(array_intersect_key($_GET, array_flip(['type', 'statut', 'q', 'page']))));
}

$f = [
    'type'   => in_array($_GET['type'] ?? '', ['candidat', 'recruteur'], true) ? $_GET['type'] : '',
    'statut' => in_array($_GET['statut'] ?? '', ['actif', 'suspendu'], true) ? $_GET['statut'] : '',
    'q'      => input('q'),
];
$where = ["u.type <> 'admin'"];
$params = [];
if ($f['type']) { $where[] = 'u.type = ?'; $params[] = $f['type']; }
if ($f['statut']) { $where[] = 'u.actif = ?'; $params[] = $f['statut'] === 'actif' ? 1 : 0; }
if ($f['q'] !== '') {
    $where[] = '(u.email LIKE ? OR c.nom LIKE ? OR c.prenom LIKE ? OR r.nom_etablissement LIKE ?)';
    $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $f['q']) . '%';
    array_push($params, $like, $like, $like, $like);
}
$sqlWhere = implode(' AND ', $where);
$from = 'FROM utilisateurs u LEFT JOIN candidats c ON c.utilisateur_id = u.id LEFT JOIN recruteurs r ON r.utilisateur_id = u.id';
$perPage = 20;
$page = max(1, (int)input('page', 1));
$total = (int)db_val("SELECT COUNT(*) $from WHERE $sqlWhere", $params);
$rows = db_all(
    "SELECT u.*, c.id AS candidat_id, c.nom, c.prenom, c.poste_recherche, r.id AS recruteur_id, r.nom_etablissement, r.ville AS rec_ville,
            (SELECT MAX(a.date_fin) FROM abonnements a WHERE a.recruteur_id = r.id AND a.statut = 'actif') AS abo_fin
     $from WHERE $sqlWhere ORDER BY u.created_at DESC LIMIT $perPage OFFSET " . (($page - 1) * $perPage),
    $params
);
require_once APP_ROOT . '/includes/offres.php';
$res = ['total' => $total, 'page' => $page, 'pages' => max(1, (int)ceil($total / $perPage))];
$pageTitle = 'Utilisateurs';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <h1 class="h3 mb-3"><i class="fa-solid fa-user-shield me-2"></i>Administration</h1>
    <?= admin_nav('utilisateurs') ?>
    <form class="card border-0 shadow-sm mb-3" method="get">
        <div class="card-body row g-2 align-items-end">
            <div class="col-md-5"><label class="form-label small">Recherche</label><input name="q" class="form-control" placeholder="Nom, établissement ou email" value="<?= e($f['q']) ?>"></div>
            <div class="col-md-3"><label class="form-label small">Type</label><select name="type" class="form-select"><?= options(['candidat' => 'Candidats', 'recruteur' => 'Établissements'], $f['type'], 'Tous') ?></select></div>
            <div class="col-md-2"><label class="form-label small">Statut</label><select name="statut" class="form-select"><?= options(['actif' => 'Actifs', 'suspendu' => 'Suspendus'], $f['statut'], 'Tous') ?></select></div>
            <div class="col-md-2 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-magnifying-glass me-1"></i>Filtrer</button></div>
        </div>
    </form>
    <p class="text-muted small"><?= $total ?> utilisateur(s)</p>
    <div class="card border-0 shadow-sm table-responsive">
        <table class="table align-middle mb-0 small">
            <thead class="table-light"><tr><th>Utilisateur</th><th>Type</th><th>Détail</th><th>Inscription</th><th>Dernière connexion</th><th>Statut</th><th class="text-end">Actions</th></tr></thead>
            <tbody>
            <?php foreach ($rows as $u): ?>
                <tr class="<?= $u['actif'] ? '' : 'table-secondary' ?>">
                    <td><strong><?= e(admin_user_label($u)) ?></strong><br><span class="text-muted"><?= e($u['email']) ?></span></td>
                    <td><?= $u['type'] === 'candidat' ? '<span class="badge bg-primary">Candidat</span>' : '<span class="badge bg-teal">Établissement</span>' ?></td>
                    <td><?php if ($u['type'] === 'candidat'): ?><?= e($u['poste_recherche'] ?: 'CV non renseigné') ?> · <?= e(ref_candidat((int)$u['candidat_id'])) ?>
                        <?php else: ?><?= e($u['rec_ville']) ?> · <?= $u['abo_fin'] && $u['abo_fin'] >= date('Y-m-d') ? '<span class="text-success">abonné jusqu\'au ' . date_fr($u['abo_fin']) . '</span>' : '<span class="text-muted">non abonné</span>' ?><?php endif; ?></td>
                    <td><?= date_fr($u['created_at']) ?></td>
                    <td><?= $u['derniere_connexion'] ? date_fr($u['derniere_connexion'], true) : '—' ?></td>
                    <td><?= $u['actif'] ? '<span class="badge bg-success"><i class="fa-solid fa-check me-1"></i>Actif</span>' : '<span class="badge bg-secondary"><i class="fa-solid fa-lock me-1"></i>Suspendu</span>' ?></td>
                    <td class="text-end text-nowrap">
                        <form method="post" class="d-inline">
                            <?= csrf_field() ?><input type="hidden" name="user_id" value="<?= (int)$u['id'] ?>">
                            <?php if ($u['actif']): ?>
                                <button name="action" value="suspendre" class="btn btn-sm btn-outline-warning" title="Suspendre" onclick="return confirm('Suspendre ce compte ? L\'utilisateur ne pourra plus se connecter.')"><i class="fa-solid fa-lock"></i></button>
                            <?php else: ?>
                                <button name="action" value="reactiver" class="btn btn-sm btn-outline-success" title="Réactiver"><i class="fa-solid fa-lock-open"></i></button>
                            <?php endif; ?>
                            <button name="action" value="supprimer" class="btn btn-sm btn-outline-danger" title="Supprimer" onclick="return confirm('Supprimer définitivement ce compte et toutes ses données (CV, offres, candidatures, entretiens) ? Cette action est irréversible.')"><i class="fa-solid fa-trash"></i></button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; if (!$rows): ?><tr><td colspan="7" class="text-center text-muted py-4">Aucun utilisateur.</td></tr><?php endif; ?>
            </tbody>
        </table>
    </div>
    <div class="mt-3"><?= pagination($res) ?></div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
