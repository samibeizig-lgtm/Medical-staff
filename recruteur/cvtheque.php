<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require APP_ROOT . '/includes/offres.php';
require_role('recruteur');
$r = current_recruteur();
$abo = abonnement_actif((int)$r['id']);

$f = [
    'poste'          => input('poste'),
    'annee_diplome'  => int_or_null(input('annee_diplome')),
    'experience_min' => int_or_null(input('experience_min')),
    'salaire_max'    => int_or_null(input('salaire_max')),
    'ville'          => input('ville'),
];
$expSql = sql_experience_mois();
$where = ["c.poste_recherche IS NOT NULL", "c.poste_recherche <> ''"];
$params = [];
if ($f['poste'])  { $where[] = 'c.poste_recherche = ?'; $params[] = $f['poste']; }
if ($f['ville'])  { $where[] = 'c.ville = ?'; $params[] = $f['ville']; }
if ($f['salaire_max']) { $where[] = '(c.salaire_souhaite IS NULL OR c.salaire_souhaite <= ?)'; $params[] = $f['salaire_max']; }
if ($f['annee_diplome']) { $where[] = 'EXISTS (SELECT 1 FROM diplomes d WHERE d.candidat_id = c.id AND YEAR(d.date_obtention) >= ?)'; $params[] = $f['annee_diplome']; }
if ($f['experience_min'] !== null && $f['experience_min'] > 0) { $where[] = "$expSql >= ?"; $params[] = $f['experience_min'] * 12; }
$sqlWhere = implode(' AND ', $where);

$perPage = 12;
$page = max(1, (int)input('page', 1));
$total = (int)db_val("SELECT COUNT(*) FROM candidats c WHERE $sqlWhere", $params);
$rows = db_all("SELECT c.id, c.nom, c.prenom, c.photo, c.poste_recherche, c.ville, c.salaire_souhaite, c.disponibilite, $expSql AS exp_mois,
                (SELECT 1 FROM tests_personnalite t WHERE t.candidat_id = c.id) AS has_test
                FROM candidats c WHERE $sqlWhere ORDER BY c.updated_at DESC, c.id DESC LIMIT $perPage OFFSET " . (($page - 1) * $perPage), $params);
$ids = array_column($rows, 'id');
$diplomes = [];
if ($ids) {
    $in = implode(',', array_fill(0, count($ids), '?'));
    foreach (db_all("SELECT candidat_id, intitule, date_obtention FROM diplomes WHERE candidat_id IN ($in) ORDER BY date_obtention DESC", $ids) as $d) {
        $diplomes[$d['candidat_id']][] = $d;
    }
}
$res = ['total' => $total, 'page' => $page, 'pages' => max(1, (int)ceil($total / $perPage))];
$pageTitle = 'CVthèque';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <h1 class="h3 mb-3"><i class="fa-solid fa-address-book text-primary me-2"></i>CVthèque</h1>
    <?php if (!$abo): ?>
        <div class="alert alert-warning"><i class="fa-solid fa-lock me-1"></i>L'accès au détail des CV est réservé aux abonnés. <a href="<?= url('recruteur/abonnement.php') ?>" class="alert-link">Activer mon abonnement</a></div>
    <?php endif; ?>
    <form class="card border-0 shadow-sm mb-4" method="get">
        <div class="card-body row g-2 align-items-end">
            <div class="col-md-3"><label class="form-label small">Poste</label><select name="poste" class="form-select"><?= options(POSTES, $f['poste'], 'Tous') ?></select></div>
            <div class="col-md-2"><label class="form-label small">Diplôme obtenu en (≥)</label><input type="number" name="annee_diplome" min="1970" max="<?= date('Y') ?>" class="form-control" placeholder="ex. 2020" value="<?= e($f['annee_diplome']) ?>"></div>
            <div class="col-md-2"><label class="form-label small">Expérience min. (ans)</label><input type="number" min="0" name="experience_min" class="form-control" value="<?= e($f['experience_min']) ?>"></div>
            <div class="col-md-2"><label class="form-label small">Salaire max. (TND)</label><input type="number" min="0" step="50" name="salaire_max" class="form-control" value="<?= e($f['salaire_max']) ?>"></div>
            <div class="col-md-2"><label class="form-label small">Ville</label><select name="ville" class="form-select"><?= options(GOUVERNORATS, $f['ville'], 'Toutes') ?></select></div>
            <div class="col-md-1 d-grid"><button class="btn btn-primary" title="Rechercher"><i class="fa-solid fa-magnifying-glass"></i></button></div>
        </div>
    </form>
    <p class="text-muted"><?= $total ?> profil(s)</p>
    <div class="row g-3">
    <?php foreach ($rows as $c): ?>
        <div class="col-md-6 col-xl-4">
            <div class="card border-0 shadow-sm h-100 cv-card">
                <div class="card-body">
                    <div class="d-flex gap-3 align-items-center mb-2">
                        <?php if ($abo): ?><img src="<?= e(photo_url($c['photo'])) ?>" class="avatar-sm" alt=""><?php else: ?><div class="avatar-initials"><i class="fa-solid fa-user"></i></div><?php endif; ?>
                        <div>
                            <strong><?= $abo ? e($c['prenom'] . ' ' . $c['nom']) : e(ref_candidat((int)$c['id'])) ?></strong>
                            <div class="small text-primary"><?= e($c['poste_recherche']) ?></div>
                        </div>
                        <?php if ($c['has_test']): ?><span class="ms-auto badge bg-info-subtle text-info" title="Test de personnalité passé"><i class="fa-solid fa-brain"></i></span><?php endif; ?>
                    </div>
                    <ul class="list-unstyled small mb-2">
                        <li><i class="fa-solid fa-briefcase me-2 text-muted"></i>Expérience : <strong><?= e(round($c['exp_mois'] / 12, 1)) ?> an(s)</strong></li>
                        <li><i class="fa-solid fa-money-bill-wave me-2 text-muted"></i>Salaire souhaité : <?= money($c['salaire_souhaite']) ?></li>
                        <li><i class="fa-solid fa-clock me-2 text-muted"></i>Disponibilité : <?= e($c['disponibilite'] ?: '—') ?></li>
                        <li><i class="fa-solid fa-location-dot me-2 text-muted"></i><?= e($c['ville'] ?: '—') ?></li>
                    </ul>
                    <div class="small">
                        <?php foreach (array_slice($diplomes[$c['id']] ?? [], 0, 2) as $d): ?>
                            <div><i class="fa-solid fa-graduation-cap me-1 text-muted"></i><?= e($d['intitule']) ?> <?= $d['date_obtention'] ? '(' . date('Y', strtotime($d['date_obtention'])) . ')' : '' ?></div>
                        <?php endforeach; ?>
                    </div>
                </div>
                <div class="card-footer bg-white border-0 pt-0">
                    <?php if ($abo): ?>
                        <a href="<?= url('recruteur/cv.php?id=' . (int)$c['id']) ?>" class="btn btn-sm btn-outline-primary"><i class="fa-solid fa-eye me-1"></i>Voir le CV</a>
                        <a href="<?= url('recruteur/cv_pdf.php?id=' . (int)$c['id']) ?>" class="btn btn-sm btn-outline-secondary"><i class="fa-solid fa-file-pdf me-1"></i>PDF</a>
                        <a href="<?= url('recruteur/entretien.php?candidat=' . (int)$c['id']) ?>" class="btn btn-sm btn-outline-success"><i class="fa-solid fa-calendar-plus me-1"></i>Entretien</a>
                    <?php else: ?>
                        <button class="btn btn-sm btn-outline-secondary" disabled><i class="fa-solid fa-lock me-1"></i>Abonnement requis</button>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
    </div>
    <?php if (!$rows): ?><div class="empty-state"><i class="fa-solid fa-user-slash"></i><p>Aucun profil ne correspond à ces critères.</p></div><?php endif; ?>
    <div class="mt-3"><?= pagination($res) ?></div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
