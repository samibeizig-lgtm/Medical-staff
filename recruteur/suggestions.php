<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require APP_ROOT . '/includes/matching.php';
require_role('recruteur');
$r = current_recruteur();
require_abonnement($r);
$offre = db_one('SELECT * FROM offres WHERE id = ? AND recruteur_id = ?', [(int)($_GET['offre'] ?? 0), $r['id']]);
if (!$offre) {
    http_response_code(404);
    exit('Offre introuvable.');
}
$suggestions = suggestions_pour_offre($offre, 5);
$postules = array_flip(array_map('intval', array_column(db_all('SELECT candidat_id FROM candidatures WHERE offre_id = ?', [$offre['id']]), 'candidat_id')));
$pageTitle = 'Suggestions IA';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <a href="<?= url('recruteur/offres.php') ?>" class="btn btn-light btn-sm mb-3"><i class="fa-solid fa-arrow-left me-1"></i>Mes offres</a>
    <div class="ai-header mb-4">
        <h1 class="h3 mb-1">🧠 Suggestions IA</h1>
        <p class="mb-0">Les 5 profils les plus pertinents pour <strong><?= e($offre['titre']) ?></strong> (<?= e($offre['ville']) ?>)</p>
        <small>Score = compétences 45 % · diplôme 25 % · expérience 20 % · bonus personnalité jusqu'à 10 %</small>
    </div>
    <?php if (!$suggestions): ?>
        <div class="empty-state"><i class="fa-solid fa-robot"></i><p>Aucun candidat ne recherche actuellement le poste « <?= e($offre['titre']) ?> ».</p></div>
    <?php endif; ?>
    <?php foreach ($suggestions as $rank => $c): $s = $c['score'];
        $col = $s['total'] >= 75 ? 'success' : ($s['total'] >= 50 ? 'warning' : 'danger'); ?>
    <div class="card border-0 shadow-sm mb-3 suggestion">
        <div class="card-body">
            <div class="row align-items-center g-3">
                <div class="col-auto text-center">
                    <div class="score-ring text-<?= $col ?>" style="--p:<?= $s['total'] ?>"><span><?= $s['total'] ?>%</span></div>
                    <small class="text-muted">#<?= $rank + 1 ?></small>
                </div>
                <div class="col-md-4">
                    <div class="d-flex align-items-center gap-2">
                        <img src="<?= e(photo_url($c['photo'])) ?>" class="avatar-sm" alt="">
                        <div><strong><?= e($c['prenom'] . ' ' . $c['nom']) ?></strong><?= isset($postules[(int)$c['id']]) ? ' <span class="badge bg-info">A postulé</span>' : '' ?><br>
                        <small class="text-muted"><?= $c['experience_annees'] ?> an(s) d'exp. · <?= e($c['ville'] ?: '—') ?> · <?= money($c['salaire_souhaite']) ?></small></div>
                    </div>
                    <?php if ($s['competences_matchees']): ?>
                    <div class="mt-2"><?php foreach ($s['competences_matchees'] as $m): ?><span class="badge rounded-pill bg-success-subtle text-success me-1"><i class="fa-solid fa-check me-1"></i><?= e($m) ?></span><?php endforeach; ?></div>
                    <?php endif; ?>
                </div>
                <div class="col-md">
                    <?php foreach (['competences' => ['Compétences', 45], 'diplome' => ['Diplôme', 25], 'experience' => ['Expérience', 20], 'personnalite' => ['Personnalité', 10]] as $k => [$label, $max]): ?>
                    <div class="d-flex align-items-center small mb-1">
                        <span style="width:110px"><?= $label ?></span>
                        <div class="progress flex-grow-1" style="height:6px"><div class="progress-bar" style="width:<?= $s[$k] / $max * 100 ?>%"></div></div>
                        <span class="ms-2 text-muted" style="width:60px"><?= $s[$k] ?>/<?= $max ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>
                <div class="col-md-auto d-flex flex-md-column gap-1">
                    <a class="btn btn-sm btn-outline-primary" href="<?= url('recruteur/cv.php?id=' . (int)$c['id'] . '&offre=' . (int)$offre['id']) ?>"><i class="fa-solid fa-eye me-1"></i>CV</a>
                    <a class="btn btn-sm btn-success" href="<?= url('recruteur/entretien.php?candidat=' . (int)$c['id'] . '&offre=' . (int)$offre['id']) ?>"><i class="fa-solid fa-calendar-plus me-1"></i>Entretien</a>
                </div>
            </div>
        </div>
    </div>
    <?php endforeach; ?>
</div>
<?php require APP_ROOT . '/includes/footer.php';
