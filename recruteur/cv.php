<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require APP_ROOT . '/includes/personality.php';
require_role('recruteur');
$r = current_recruteur();
$rid = (int)$r['id'];
$id = (int)($_GET['id'] ?? 0);
$c = candidat_full($id);
if (!$c) {
    http_response_code(404);
    exit('Candidat introuvable.');
}
if (!recruteur_peut_voir_cv($rid, $id)) {
    flash('warning', 'Un abonnement actif est nécessaire pour consulter ce CV.');
    redirect('recruteur/abonnement.php');
}
db_exec('INSERT INTO cv_consultations (recruteur_id, candidat_id) VALUES (?, ?)', [$rid, $id]);
$offreId = (int)($_GET['offre'] ?? 0);
$entretien = db_one('SELECT id, statut FROM entretiens WHERE recruteur_id = ? AND candidat_id = ? ' . ($offreId ? 'AND offre_id = ?' : '') . ' ORDER BY id DESC LIMIT 1',
    $offreId ? [$rid, $id, $offreId] : [$rid, $id]);
$pageTitle = 'CV – ' . $c['prenom'] . ' ' . $c['nom'];
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <a href="javascript:history.back()" class="btn btn-light btn-sm"><i class="fa-solid fa-arrow-left me-1"></i>Retour</a>
        <div class="d-flex gap-2">
            <a href="<?= url('recruteur/cv_pdf.php?id=' . $id) ?>" class="btn btn-outline-secondary"><i class="fa-solid fa-file-pdf me-1"></i>Télécharger en PDF</a>
            <?php if ($entretien): ?>
                <a href="<?= url('recruteur/entretien.php?id=' . (int)$entretien['id']) ?>" class="btn btn-warning"><i class="fa-solid fa-calendar-pen me-1"></i>Modifier entretien</a>
            <?php else: ?>
                <a href="<?= url('recruteur/entretien.php?candidat=' . $id . ($offreId ? '&offre=' . $offreId : '')) ?>" class="btn btn-success"><i class="fa-solid fa-calendar-plus me-1"></i>Proposer un entretien</a>
            <?php endif; ?>
        </div>
    </div>
    <div class="row g-4">
        <div class="col-lg-4">
            <div class="card border-0 shadow-sm">
                <div class="card-body text-center p-4">
                    <img src="<?= e(photo_url($c['photo'])) ?>" class="profile-photo mb-3" alt="">
                    <h1 class="h4 mb-0"><?= e($c['prenom'] . ' ' . $c['nom']) ?></h1>
                    <p class="text-primary mb-1"><?= e($c['poste_recherche']) ?></p>
                    <span class="badge text-bg-secondary"><?= e(ref_candidat($id)) ?></span>
                </div>
                <ul class="list-group list-group-flush small">
                    <?php if ($c['coordonnees_visibles']): ?>
                        <li class="list-group-item"><i class="fa-solid fa-envelope me-2 text-muted"></i><a href="mailto:<?= e($c['email']) ?>"><?= e($c['email']) ?></a></li>
                        <li class="list-group-item"><i class="fa-solid fa-phone me-2 text-muted"></i><?= e($c['telephone'] ?: '—') ?></li>
                        <li class="list-group-item"><i class="fa-solid fa-location-dot me-2 text-muted"></i><?= e(trim(($c['adresse'] ?? '') . ', ' . ($c['ville'] ?? '') . ', ' . ($c['pays'] ?? ''), ', ')) ?></li>
                    <?php else: ?>
                        <li class="list-group-item text-muted"><i class="fa-solid fa-eye-slash me-2"></i>Coordonnées masquées par le candidat. Proposez un entretien : il sera notifié par email.</li>
                        <li class="list-group-item"><i class="fa-solid fa-location-dot me-2 text-muted"></i><?= e($c['ville'] ?: '—') ?></li>
                    <?php endif; ?>
                    <li class="list-group-item"><i class="fa-solid fa-cake-candles me-2 text-muted"></i><?= $c['date_naissance'] ? date_fr($c['date_naissance']) . ($c['lieu_naissance'] ? ' à ' . e($c['lieu_naissance']) : '') : '—' ?></li>
                    <li class="list-group-item"><i class="fa-solid fa-briefcase me-2 text-muted"></i>Expérience totale : <strong><?= $c['experience_annees'] ?> an(s)</strong></li>
                    <li class="list-group-item"><i class="fa-solid fa-money-bill-wave me-2 text-muted"></i>Salaire souhaité : <?= money($c['salaire_souhaite']) ?></li>
                    <li class="list-group-item"><i class="fa-solid fa-clock me-2 text-muted"></i>Disponibilité : <?= e($c['disponibilite'] ?: '—') ?></li>
                </ul>
            </div>
            <div class="card border-0 shadow-sm mt-4"><div class="card-body">
                <h2 class="h6"><i class="fa-solid fa-language text-primary me-1"></i>Langues</h2>
                <?php foreach ($c['langues'] as $l): ?><div class="d-flex justify-content-between small border-bottom py-1"><span><?= e($l['langue']) ?></span><span class="text-muted"><?= e($l['niveau']) ?></span></div><?php endforeach; ?>
                <?php if (!$c['langues']): ?><p class="small text-muted mb-0">—</p><?php endif; ?>
            </div></div>
        </div>
        <div class="col-lg-8">
            <div class="card border-0 shadow-sm mb-4"><div class="card-body">
                <h2 class="h5"><i class="fa-solid fa-graduation-cap text-primary me-2"></i>Diplômes</h2>
                <?php foreach ($c['diplomes'] as $d): ?>
                    <div class="timeline-item"><strong><?= e($d['intitule']) ?></strong><?= $d['mention'] ? ' <span class="badge text-bg-light border">' . e($d['mention']) . '</span>' : '' ?><br><small class="text-muted"><?= e($d['etablissement']) ?> · <?= date_fr($d['date_obtention']) ?></small></div>
                <?php endforeach; if (!$c['diplomes']): ?><p class="text-muted small mb-0">—</p><?php endif; ?>
            </div></div>
            <div class="card border-0 shadow-sm mb-4"><div class="card-body">
                <h2 class="h5"><i class="fa-solid fa-briefcase text-primary me-2"></i>Expériences</h2>
                <?php foreach ($c['experiences'] as $x): ?>
                    <div class="timeline-item"><strong><?= e($x['poste']) ?></strong> – <?= e($x['etablissement']) ?><br>
                        <small class="text-muted"><?= date_fr($x['date_debut']) ?> → <?= $x['poste_actuel'] ? 'aujourd\'hui' : date_fr($x['date_fin']) ?></small>
                        <?php if ($x['description']): ?><p class="small mb-0"><?= nl2br(e($x['description'])) ?></p><?php endif; ?></div>
                <?php endforeach; if (!$c['experiences']): ?><p class="text-muted small mb-0">—</p><?php endif; ?>
            </div></div>
            <div class="card border-0 shadow-sm mb-4"><div class="card-body">
                <h2 class="h5"><i class="fa-solid fa-star text-primary me-2"></i>Compétences</h2>
                <?php foreach ($c['competences'] as $k): ?><span class="badge rounded-pill bg-primary-subtle text-primary me-1 mb-1"><?= e($k['nom']) ?></span><?php endforeach; ?>
                <?php if (!$c['competences']): ?><p class="text-muted small mb-0">—</p><?php endif; ?>
            </div></div>
            <?php if ($c['test']): ?>
            <div class="card border-0 shadow-sm"><div class="card-body">
                <h2 class="h5"><i class="fa-solid fa-brain text-primary me-2"></i>Profil de personnalité</h2>
                <?= render_jauges($c['test'], true) ?>
                <p class="small mt-3 mb-0 fst-italic"><?= e($c['test']['portrait']) ?></p>
            </div></div>
            <?php endif; ?>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
