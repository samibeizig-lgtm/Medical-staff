<?php
defined('APP_ROOT') || exit;
require APP_ROOT . '/includes/offres.php';

$pageTitle = 'Demandes d\'emploi';
$active = 'demandes';
$recruteur = current_recruteur();
$abonne = $recruteur && abonnement_actif((int)$recruteur['id']);

$f = ['poste' => input('poste'), 'ville' => input('ville')];
$where = ['c.poste_recherche IS NOT NULL', "c.poste_recherche <> ''"];
$params = [];
if ($f['poste']) { $where[] = 'c.poste_recherche = ?'; $params[] = $f['poste']; }
if ($f['ville']) { $where[] = 'c.ville = ?'; $params[] = $f['ville']; }
$sqlWhere = implode(' AND ', $where);
$perPage = 15;
$page = max(1, (int)input('page', 1));
$total = (int)db_val("SELECT COUNT(*) FROM candidats c WHERE $sqlWhere", $params);
$offset = ($page - 1) * $perPage;
// Seules des données non identifiantes sont sélectionnées (anonymisation)
$rows = db_all(
    "SELECT c.id, c.poste_recherche, c.ville, c.salaire_souhaite, c.disponibilite, " . sql_experience_mois() . " AS exp_mois
     FROM candidats c WHERE $sqlWhere ORDER BY c.updated_at DESC, c.id DESC LIMIT $perPage OFFSET $offset",
    $params
);
$res = ['total' => $total, 'page' => $page, 'pages' => max(1, (int)ceil($total / $perPage))];
require APP_ROOT . '/includes/header.php';
?>
<section class="page-header">
    <div class="container">
        <h1 class="fw-bold">Demandes d'emploi</h1>
        <p class="lead mb-0">Les professionnels de santé disponibles. Profils anonymisés pour protéger leur vie privée.</p>
    </div>
</section>
<div class="container py-4">
    <form class="card border-0 shadow-sm mb-4" method="get">
        <div class="card-body row g-2 align-items-end">
            <div class="col-md-5"><label class="form-label small">Poste recherché</label><select name="poste" class="form-select"><?= options(POSTES, $f['poste'], 'Tous les postes') ?></select></div>
            <div class="col-md-4"><label class="form-label small">Ville</label><select name="ville" class="form-select"><?= options(GOUVERNORATS, $f['ville'], 'Toute la Tunisie') ?></select></div>
            <div class="col-md-3 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-filter me-1"></i>Filtrer</button></div>
        </div>
    </form>
    <?php if (!$abonne): ?>
    <div class="alert alert-info"><i class="fa-solid fa-lock me-1"></i>Les noms et coordonnées sont masqués. <?= $recruteur ? '<a href="' . url('recruteur/abonnement') . '">Activez votre abonnement</a>' : '<a href="' . url('recruteur/login') . '">Connectez-vous en tant qu\'établissement abonné</a>' ?> pour consulter les CV complets.</div>
    <?php endif; ?>
    <p class="text-muted"><?= $total ?> candidat(s)</p>
    <div class="table-responsive card border-0 shadow-sm">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr><th>ID</th><th>Poste recherché</th><th>Expérience</th><th>Ville</th><th>Salaire souhaité</th><th>Disponibilité</th><th></th></tr></thead>
            <tbody>
            <?php foreach ($rows as $r): ?>
                <tr>
                    <td><span class="badge text-bg-secondary"><?= e(ref_candidat((int)$r['id'])) ?></span></td>
                    <td><?= e($r['poste_recherche']) ?></td>
                    <td><?= e(round($r['exp_mois'] / 12, 1)) ?> an(s)</td>
                    <td><?= e($r['ville'] ?: '—') ?></td>
                    <td><?= money($r['salaire_souhaite']) ?></td>
                    <td><?= e($r['disponibilite'] ?: '—') ?></td>
                    <td class="text-end">
                        <?php if ($abonne): ?>
                            <a class="btn btn-sm btn-outline-primary" href="<?= url('recruteur/cv?id=' . (int)$r['id']) ?>"><i class="fa-solid fa-eye me-1"></i>CV complet</a>
                        <?php else: ?>
                            <span class="text-muted small"><i class="fa-solid fa-lock"></i></span>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
            <?php if (!$rows): ?><tr><td colspan="7" class="text-center text-muted py-4">Aucun candidat pour ces critères.</td></tr><?php endif; ?>
            </tbody>
        </table>
    </div>
    <div class="mt-3"><?= pagination($res) ?></div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
