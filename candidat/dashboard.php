<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require_role('candidat');
$me = current_candidat();
$c = candidat_full((int)$me['id']);
$cvOk = cv_complet((int)$c['id']);
$testOk = (bool)$c['test'];
$nbCandidatures = (int)db_val('SELECT COUNT(*) FROM candidatures WHERE candidat_id = ?', [$c['id']]);
$nbEntretiens = (int)db_val("SELECT COUNT(*) FROM entretiens WHERE candidat_id = ? AND statut = 'en_attente'", [$c['id']]);
$nbVues = (int)db_val('SELECT COUNT(*) FROM cv_consultations WHERE candidat_id = ?', [$c['id']]);
$candidatures = db_all(
    'SELECT ca.*, o.titre, o.ville, r.nom_etablissement FROM candidatures ca
     JOIN offres o ON o.id = ca.offre_id JOIN recruteurs r ON r.id = o.recruteur_id
     WHERE ca.candidat_id = ? ORDER BY ca.created_at DESC LIMIT 5',
    [$c['id']]
);
$pageTitle = 'Mon tableau de bord';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <h1 class="h3 mb-0">Bonjour <?= e($c['prenom']) ?> 👋</h1>
        <div class="d-flex flex-wrap gap-2">
            <a href="<?= url('candidat/cv.php') ?>" class="btn btn-primary"><i class="fa-solid fa-file-pen me-1"></i>Modifier mon CV</a>
            <a href="<?= url('candidat/test.php') ?>" class="btn btn-outline-primary"><i class="fa-solid fa-brain me-1"></i>Test de personnalité</a>
            <a href="<?= url('candidat/offres.php') ?>" class="btn btn-outline-primary"><i class="fa-solid fa-magnifying-glass me-1"></i>Voir les offres</a>
            <a href="<?= url('candidat/entretiens.php') ?>" class="btn btn-outline-primary position-relative"><i class="fa-solid fa-calendar-check me-1"></i>Mes entretiens
                <?php if ($nbEntretiens): ?><span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"><?= $nbEntretiens ?></span><?php endif; ?></a>
        </div>
    </div>

    <?php if (!$cvOk || !$testOk): ?>
    <div class="alert alert-warning d-flex flex-wrap align-items-center gap-2">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Pour postuler aux offres, vous devez <?= !$cvOk ? '<strong>compléter votre CV</strong> (poste recherché + au moins un diplôme)' : '' ?><?= (!$cvOk && !$testOk) ? ' et ' : '' ?><?= !$testOk ? '<strong>passer le test de personnalité</strong>' : '' ?>.</span>
    </div>
    <?php endif; ?>

    <div class="row g-3 mb-4">
        <div class="col-6 col-md-3"><div class="kpi"><i class="fa-solid fa-paper-plane"></i><strong><?= $nbCandidatures ?></strong><span>candidatures</span></div></div>
        <div class="col-6 col-md-3"><div class="kpi"><i class="fa-solid fa-calendar"></i><strong><?= $nbEntretiens ?></strong><span>entretiens en attente</span></div></div>
        <div class="col-6 col-md-3"><div class="kpi"><i class="fa-solid fa-eye"></i><strong><?= $nbVues ?></strong><span>consultations du CV</span></div></div>
        <div class="col-6 col-md-3"><div class="kpi"><i class="fa-solid fa-<?= $cvOk && $testOk ? 'circle-check text-success' : 'hourglass-half text-warning' ?>"></i><strong><?= $cvOk && $testOk ? 'Prêt' : 'Incomplet' ?></strong><span>statut du profil</span></div></div>
    </div>

    <div class="row g-4">
        <div class="col-lg-4">
            <div class="card border-0 shadow-sm">
                <div class="card-body text-center p-4">
                    <img src="<?= e(photo_url($c['photo'])) ?>" class="profile-photo mb-3" alt="Photo de profil">
                    <h2 class="h5 mb-0"><?= e($c['prenom'] . ' ' . $c['nom']) ?></h2>
                    <p class="text-primary mb-2"><?= e($c['poste_recherche'] ?: 'Poste recherché non renseigné') ?></p>
                    <span class="badge text-bg-secondary"><?= e(ref_candidat((int)$c['id'])) ?></span>
                </div>
                <ul class="list-group list-group-flush small">
                    <li class="list-group-item"><i class="fa-solid fa-envelope me-2 text-muted"></i><?= e($c['email']) ?></li>
                    <li class="list-group-item"><i class="fa-solid fa-phone me-2 text-muted"></i><?= e($c['telephone'] ?: '—') ?></li>
                    <li class="list-group-item"><i class="fa-solid fa-location-dot me-2 text-muted"></i><?= e(trim(($c['adresse'] ?? '') . ', ' . ($c['ville'] ?? '') . ', ' . ($c['pays'] ?? ''), ', ') ?: '—') ?></li>
                    <li class="list-group-item"><i class="fa-solid fa-cake-candles me-2 text-muted"></i><?= $c['date_naissance'] ? date_fr($c['date_naissance']) . ($c['lieu_naissance'] ? ' à ' . e($c['lieu_naissance']) : '') : '—' ?></li>
                    <li class="list-group-item"><i class="fa-solid fa-money-bill-wave me-2 text-muted"></i>Salaire souhaité : <?= money($c['salaire_souhaite']) ?></li>
                    <li class="list-group-item"><i class="fa-solid fa-clock me-2 text-muted"></i>Disponibilité : <?= e($c['disponibilite'] ?: '—') ?></li>
                    <li class="list-group-item"><i class="fa-solid fa-<?= $c['coordonnees_visibles'] ? 'eye' : 'eye-slash' ?> me-2 text-muted"></i>Coordonnées <?= $c['coordonnees_visibles'] ? 'visibles' : 'masquées' ?> aux recruteurs</li>
                </ul>
            </div>
            <?php if ($c['test']): ?>
            <div class="card border-0 shadow-sm mt-4">
                <div class="card-body">
                    <h3 class="h6"><i class="fa-solid fa-brain text-primary me-1"></i>Mon profil de personnalité</h3>
                    <?php require_once APP_ROOT . '/includes/personality.php'; echo render_jauges($c['test'], true); ?>
                </div>
            </div>
            <?php endif; ?>
        </div>
        <div class="col-lg-8">
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-body">
                    <h3 class="h5"><i class="fa-solid fa-graduation-cap text-primary me-2"></i>Diplômes</h3>
                    <?php foreach ($c['diplomes'] as $d): ?>
                        <div class="timeline-item"><strong><?= e($d['intitule']) ?></strong><?= $d['mention'] ? ' <span class="badge text-bg-light border">' . e($d['mention']) . '</span>' : '' ?><br><small class="text-muted"><?= e($d['etablissement']) ?> · <?= date_fr($d['date_obtention']) ?></small></div>
                    <?php endforeach; if (!$c['diplomes']): ?><p class="text-muted small mb-0">Aucun diplôme renseigné.</p><?php endif; ?>
                </div>
            </div>
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-body">
                    <h3 class="h5"><i class="fa-solid fa-briefcase text-primary me-2"></i>Expériences <small class="text-muted fs-6">(<?= $c['experience_annees'] ?> an(s))</small></h3>
                    <?php foreach ($c['experiences'] as $x): ?>
                        <div class="timeline-item"><strong><?= e($x['poste']) ?></strong> – <?= e($x['etablissement']) ?><br>
                            <small class="text-muted"><?= date_fr($x['date_debut']) ?> → <?= $x['poste_actuel'] ? 'aujourd\'hui' : date_fr($x['date_fin']) ?></small>
                            <?php if ($x['description']): ?><p class="small mb-0"><?= nl2br(e($x['description'])) ?></p><?php endif; ?></div>
                    <?php endforeach; if (!$c['experiences']): ?><p class="text-muted small mb-0">Aucune expérience renseignée.</p><?php endif; ?>
                </div>
            </div>
            <div class="row g-4 mb-4">
                <div class="col-md-7">
                    <div class="card border-0 shadow-sm h-100"><div class="card-body">
                        <h3 class="h5"><i class="fa-solid fa-star text-primary me-2"></i>Compétences</h3>
                        <?php foreach ($c['competences'] as $k): ?><span class="badge rounded-pill bg-primary-subtle text-primary me-1 mb-1"><?= e($k['nom']) ?></span><?php endforeach; ?>
                        <?php if (!$c['competences']): ?><p class="text-muted small mb-0">Aucune compétence.</p><?php endif; ?>
                    </div></div>
                </div>
                <div class="col-md-5">
                    <div class="card border-0 shadow-sm h-100"><div class="card-body">
                        <h3 class="h5"><i class="fa-solid fa-language text-primary me-2"></i>Langues</h3>
                        <?php foreach ($c['langues'] as $l): ?><div class="d-flex justify-content-between small border-bottom py-1"><span><?= e($l['langue']) ?></span><span class="text-muted"><?= e($l['niveau']) ?></span></div><?php endforeach; ?>
                        <?php if (!$c['langues']): ?><p class="text-muted small mb-0">Aucune langue.</p><?php endif; ?>
                    </div></div>
                </div>
            </div>
            <div class="card border-0 shadow-sm">
                <div class="card-body">
                    <h3 class="h5"><i class="fa-solid fa-paper-plane text-primary me-2"></i>Mes dernières candidatures</h3>
                    <?php if (!$candidatures): ?><p class="text-muted small mb-0">Vous n'avez pas encore postulé. <a href="<?= url('candidat/offres.php') ?>">Voir les offres</a></p><?php endif; ?>
                    <?php foreach ($candidatures as $ca): ?>
                        <div class="d-flex justify-content-between border-bottom py-2 small">
                            <span><strong><?= e($ca['titre']) ?></strong> – <?= e($ca['nom_etablissement']) ?> (<?= e($ca['ville']) ?>)</span>
                            <span class="text-muted"><?= date_fr($ca['created_at']) ?></span>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
