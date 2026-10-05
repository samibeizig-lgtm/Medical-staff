<?php
defined('APP_ROOT') || exit;
$pageTitle = 'Notre mission';
$active = 'mission';
require APP_ROOT . '/includes/header.php';
$piliers = [
    ['icon' => 'fa-eye', 'titre' => 'Transparence', 'texte' => 'Des offres détaillées (salaire, diplôme, expérience requise) et des candidatures suivies en temps réel. Chacun sait où il en est.'],
    ['icon' => 'fa-bolt', 'titre' => 'Rapidité', 'texte' => 'Matching intelligent, CVthèque multicritères et planification d\'entretiens intégrée : un recrutement en jours, pas en mois.'],
    ['icon' => 'fa-handshake', 'titre' => 'Proximité', 'texte' => 'Une plateforme tunisienne couvrant les 24 gouvernorats, au plus près des réalités du terrain et des établissements régionaux.'],
    ['icon' => 'fa-scale-balanced', 'titre' => 'Équité', 'texte' => 'CVthèque anonymisée pour le public, critères objectifs et égalité des chances entre tous les professionnels de santé.'],
];
?>
<section class="page-header">
    <div class="container">
        <h1 class="fw-bold">Notre mission</h1>
        <p class="lead mb-0">Faciliter l'accès à l'emploi des professionnels de santé et renforcer les équipes soignantes de Tunisie.</p>
    </div>
</section>
<section class="container py-5">
    <div class="row justify-content-center">
        <div class="col-lg-9 text-center">
            <p class="fs-5 text-muted">Le système de santé tunisien repose sur des milliers de professionnels paramédicaux engagés. Pourtant, trouver le bon poste ou le bon profil reste souvent long et opaque. Medical Staff est né pour changer cela : une plateforme spécialisée, moderne et équitable, au service des soignants comme des établissements.</p>
        </div>
    </div>
    <div class="row g-4 mt-3">
        <?php foreach ($piliers as $p): ?>
        <div class="col-md-6 col-lg-3">
            <div class="card h-100 border-0 shadow-sm text-center pilier">
                <div class="card-body p-4">
                    <div class="icon-circle mx-auto mb-3"><i class="fa-solid <?= $p['icon'] ?>"></i></div>
                    <h4><?= e($p['titre']) ?></h4>
                    <p class="text-muted small mb-0"><?= e($p['texte']) ?></p>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</section>
<section class="bg-soft py-5">
    <div class="container">
        <div class="row g-4">
            <div class="col-md-6">
                <div class="cta-box cta-primary">
                    <h3>Vous êtes un professionnel de santé ?</h3>
                    <p>Créez votre CV, passez le test de personnalité et accédez aux meilleures offres du secteur.</p>
                    <a class="btn btn-light" href="<?= url('candidat/register') ?>">Créer mon compte candidat</a>
                </div>
            </div>
            <div class="col-md-6">
                <div class="cta-box cta-teal">
                    <h3>Vous représentez un établissement ?</h3>
                    <p>Publiez vos offres, explorez la CVthèque et laissez l'IA vous proposer les meilleurs profils.</p>
                    <a class="btn btn-light" href="<?= url('recruteur/register') ?>">Inscrire mon établissement</a>
                </div>
            </div>
        </div>
    </div>
</section>
<?php require APP_ROOT . '/includes/footer.php';
