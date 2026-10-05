<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require_role('recruteur');
$r = current_recruteur();
$rid = (int)$r['id'];
$offreId = (int)($_GET['offre'] ?? 0);

$offres = db_all(
    'SELECT o.id, o.titre, o.ville, o.active, (SELECT COUNT(*) FROM candidatures ca WHERE ca.offre_id = o.id) AS nb
     FROM offres o WHERE o.recruteur_id = ? ORDER BY o.created_at DESC',
    [$rid]
);
$offre = $offreId ? db_one('SELECT * FROM offres WHERE id = ? AND recruteur_id = ?', [$offreId, $rid]) : null;
$cands = [];
if ($offre) {
    $cands = db_all(
        'SELECT ca.created_at AS postule_le, c.*, ' . sql_experience_mois() . ' AS exp_mois,
                (SELECT e.id FROM entretiens e WHERE e.candidat_id = c.id AND e.offre_id = ca.offre_id ORDER BY e.id DESC LIMIT 1) AS entretien_id,
                (SELECT e.statut FROM entretiens e WHERE e.candidat_id = c.id AND e.offre_id = ca.offre_id ORDER BY e.id DESC LIMIT 1) AS entretien_statut
         FROM candidatures ca JOIN candidats c ON c.id = ca.candidat_id WHERE ca.offre_id = ? ORDER BY ca.created_at DESC',
        [$offreId]
    );
    db_exec("UPDATE candidatures SET statut = 'vue' WHERE offre_id = ? AND statut = 'envoyee'", [$offreId]);
}
$pageTitle = 'Candidatures';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <h1 class="h3 mb-3"><i class="fa-solid fa-inbox text-primary me-2"></i>Candidatures</h1>
    <div class="row g-4">
        <div class="col-lg-4">
            <div class="list-group shadow-sm">
                <?php foreach ($offres as $o): ?>
                    <a href="?offre=<?= (int)$o['id'] ?>" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center<?= $o['id'] == $offreId ? ' active' : '' ?>">
                        <span><?= e($o['titre']) ?><br><small class="<?= $o['id'] == $offreId ? '' : 'text-muted' ?>"><?= e($o['ville']) ?><?= $o['active'] ? '' : ' · désactivée' ?></small></span>
                        <span class="badge rounded-pill <?= $o['id'] == $offreId ? 'text-bg-light' : 'text-bg-primary' ?>"><?= (int)$o['nb'] ?></span>
                    </a>
                <?php endforeach; if (!$offres): ?><div class="list-group-item text-muted">Aucune offre.</div><?php endif; ?>
            </div>
        </div>
        <div class="col-lg-8">
            <?php if (!$offre): ?>
                <div class="empty-state"><i class="fa-solid fa-arrow-left"></i><p>Sélectionnez une offre pour voir ses candidats.</p></div>
            <?php else: ?>
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="h5 mb-0"><?= e($offre['titre']) ?> <small class="text-muted">(<?= count($cands) ?> candidat(s))</small></h2>
                    <a href="<?= url('recruteur/suggestions.php?offre=' . $offreId) ?>" class="btn btn-sm btn-outline-secondary">🧠 Suggestions IA</a>
                </div>
                <?php foreach ($cands as $c): ?>
                <div class="card border-0 shadow-sm mb-2">
                    <div class="card-body d-flex flex-wrap align-items-center gap-3">
                        <img src="<?= e(photo_url($c['photo'])) ?>" class="avatar-sm" alt="">
                        <div class="flex-grow-1">
                            <strong><?= e($c['prenom'] . ' ' . $c['nom']) ?></strong> <span class="badge text-bg-light border"><?= e(ref_candidat((int)$c['id'])) ?></span><br>
                            <small class="text-muted"><?= e($c['poste_recherche']) ?> · <?= e(round($c['exp_mois'] / 12, 1)) ?> an(s) d'exp. · <?= e($c['ville'] ?: '—') ?> · postulé le <?= date_fr($c['postule_le']) ?></small>
                            <?php if ($c['entretien_statut']): ?><div class="mt-1">Entretien : <?= statut_entretien_badge($c['entretien_statut']) ?></div><?php endif; ?>
                        </div>
                        <div class="d-flex gap-1">
                            <a class="btn btn-sm btn-outline-primary" href="<?= url('recruteur/cv.php?id=' . (int)$c['id'] . '&offre=' . $offreId) ?>"><i class="fa-solid fa-eye me-1"></i>CV</a>
                            <a class="btn btn-sm btn-outline-secondary" href="<?= url('recruteur/cv_pdf.php?id=' . (int)$c['id']) ?>"><i class="fa-solid fa-file-pdf"></i></a>
                            <?php if ($c['entretien_id']): ?>
                                <a class="btn btn-sm btn-warning" href="<?= url('recruteur/entretien.php?id=' . (int)$c['entretien_id']) ?>"><i class="fa-solid fa-calendar-pen me-1"></i>Modifier entretien</a>
                            <?php else: ?>
                                <a class="btn btn-sm btn-success" href="<?= url('recruteur/entretien.php?candidat=' . (int)$c['id'] . '&offre=' . $offreId) ?>"><i class="fa-solid fa-calendar-plus me-1"></i>Entretien</a>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                <?php endforeach; if (!$cands): ?>
                    <div class="empty-state"><i class="fa-regular fa-envelope-open"></i><p>Aucune candidature pour cette offre. Essayez les <a href="<?= url('recruteur/suggestions.php?offre=' . $offreId) ?>">suggestions IA</a>.</p></div>
                <?php endif; ?>
            <?php endif; ?>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
