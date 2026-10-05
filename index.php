<?php
require __DIR__ . '/includes/bootstrap.php';
$pageTitle = 'Accueil';
$active = 'home';

$stats = [
    'offres'     => (int)db_val('SELECT COUNT(*) FROM offres WHERE active = 1 AND (date_limite IS NULL OR date_limite >= CURDATE())'),
    'candidats'  => (int)db_val('SELECT COUNT(*) FROM candidats WHERE poste_recherche IS NOT NULL'),
    'recruteurs' => (int)db_val('SELECT COUNT(*) FROM recruteurs'),
];
$dernieres = db_all(
    "SELECT o.*, r.nom_etablissement FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id
     WHERE o.active = 1 AND (o.date_limite IS NULL OR o.date_limite >= CURDATE())
     ORDER BY o.created_at DESC LIMIT 3"
);
require __DIR__ . '/includes/header.php';
?>
<section class="hero">
    <div class="container">
        <div class="row align-items-center g-5">
            <div class="col-lg-6">
                <span class="badge rounded-pill bg-light text-primary mb-3"><i class="fa-solid fa-heart-pulse me-1"></i>N°1 du recrutement paramédical en Tunisie</span>
                <h1 class="display-5 fw-bold text-white">Les talents de la santé rencontrent les établissements qui les recherchent</h1>
                <p class="lead text-white-50 mt-3">Infirmiers, sages-femmes, techniciens, kinésithérapeutes… Trouvez votre prochain poste ou recrutez les meilleurs profils en quelques clics.</p>
                <form class="hero-search bg-white rounded-3 p-2 mt-4 d-flex flex-column flex-md-row gap-2" action="<?= url('offres.php') ?>">
                    <select name="poste" class="form-select border-0"><?= options(POSTES, null, 'Quel poste ?') ?></select>
                    <select name="ville" class="form-select border-0"><?= options(GOUVERNORATS, null, 'Où ?') ?></select>
                    <button class="btn btn-primary px-4"><i class="fa-solid fa-magnifying-glass me-1"></i>Rechercher</button>
                </form>
            </div>
            <div class="col-lg-6 d-none d-lg-block">
                <img src="<?= url('assets/img/hero.svg') ?>" class="img-fluid" alt="Équipe médicale">
            </div>
        </div>
    </div>
</section>

<section class="container stats-bar">
    <div class="row g-3 text-center">
        <div class="col-4"><div class="stat"><strong><?= $stats['offres'] ?></strong><span>offres actives</span></div></div>
        <div class="col-4"><div class="stat"><strong><?= $stats['candidats'] ?></strong><span>professionnels inscrits</span></div></div>
        <div class="col-4"><div class="stat"><strong><?= $stats['recruteurs'] ?></strong><span>établissements</span></div></div>
    </div>
</section>

<section class="container py-5">
    <div class="row align-items-center g-5">
        <div class="col-lg-6">
            <h2 class="section-title">Une plateforme pensée pour la santé</h2>
            <p class="text-muted">Medical Staff met en relation les professionnels de santé avec les cliniques, hôpitaux, cabinets, laboratoires et centres spécialisés partout en Tunisie. Notre plateforme combine CV structuré, test de personnalité, matching intelligent et planification d'entretiens pour accélérer chaque recrutement.</p>
            <ul class="list-unstyled check-list">
                <li><i class="fa-solid fa-circle-check"></i>CV structuré adapté aux métiers paramédicaux</li>
                <li><i class="fa-solid fa-circle-check"></i>Test de personnalité Big Five adapté au milieu médical</li>
                <li><i class="fa-solid fa-circle-check"></i>Suggestions de profils par intelligence artificielle</li>
                <li><i class="fa-solid fa-circle-check"></i>Calendrier d'entretiens intégré</li>
            </ul>
        </div>
        <div class="col-lg-6">
            <div class="row g-3">
                <?php foreach (RUBRIQUES as $r): ?>
                <div class="col-12">
                    <a class="rubrique card border-0 shadow-sm text-decoration-none" href="<?= url('offres.php' . ($r['q'] ? '?poste=' . urlencode($r['q']) : '?contrat=Stage')) ?>">
                        <div class="card-body d-flex align-items-center gap-3">
                            <div class="icon-circle"><i class="fa-solid <?= $r['icon'] ?>"></i></div>
                            <div>
                                <h5 class="mb-1 text-dark"><?= e($r['titre']) ?></h5>
                                <p class="mb-0 text-muted small"><?= e($r['texte']) ?></p>
                            </div>
                            <i class="fa-solid fa-chevron-right ms-auto text-primary"></i>
                        </div>
                    </a>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</section>

<section class="bg-soft py-5">
    <div class="container">
        <h2 class="section-title text-center">Comment ça marche ?</h2>
        <div class="row g-4 mt-2">
            <div class="col-lg-6">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body p-4">
                        <h4 class="text-primary"><i class="fa-solid fa-user-nurse me-2"></i>Vous êtes candidat</h4>
                        <ol class="steps">
                            <li><strong>Créez votre compte</strong> gratuitement en 1 minute.</li>
                            <li><strong>Déposez votre CV</strong> : diplômes, expériences, compétences, langues.</li>
                            <li><strong>Passez le test de personnalité</strong> pour mettre en valeur votre profil.</li>
                            <li><strong>Postulez</strong> aux offres et gérez vos entretiens depuis votre espace.</li>
                        </ol>
                        <a href="<?= url('candidat/register.php') ?>" class="btn btn-primary">Je crée mon CV</a>
                    </div>
                </div>
            </div>
            <div class="col-lg-6">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body p-4">
                        <h4 class="text-teal"><i class="fa-solid fa-hospital me-2"></i>Vous êtes un établissement</h4>
                        <ol class="steps">
                            <li><strong>Inscrivez votre établissement</strong> et son responsable.</li>
                            <li><strong>Activez votre abonnement</strong> annuel (<?= number_format((int)cfg('abonnement_prix'), 0, ',', ' ') ?> TND).</li>
                            <li><strong>Publiez vos offres</strong> et explorez la CVthèque.</li>
                            <li><strong>Laissez l'IA vous suggérer</strong> les meilleurs profils et planifiez vos entretiens.</li>
                        </ol>
                        <a href="<?= url('recruteur/register.php') ?>" class="btn btn-teal">Je recrute</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<?php if ($dernieres): ?>
<section class="container py-5">
    <div class="d-flex justify-content-between align-items-end mb-3">
        <h2 class="section-title mb-0">Dernières offres</h2>
        <a href="<?= url('offres.php') ?>">Toutes les offres <i class="fa-solid fa-arrow-right"></i></a>
    </div>
    <div class="row g-3">
        <?php foreach ($dernieres as $o): ?>
        <div class="col-md-4">
            <div class="card h-100 border-0 shadow-sm offer-card">
                <div class="card-body">
                    <span class="badge bg-primary-subtle text-primary mb-2"><?= e($o['type_contrat']) ?></span>
                    <h5 class="card-title"><?= e($o['titre']) ?></h5>
                    <p class="text-muted small mb-1"><i class="fa-solid fa-hospital me-1"></i><?= e($o['nom_etablissement']) ?></p>
                    <p class="text-muted small"><i class="fa-solid fa-location-dot me-1"></i><?= e($o['ville']) ?></p>
                    <p class="small mb-0"><?= e(excerpt($o['description'], 110)) ?></p>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</section>
<?php endif; ?>

<section class="container py-5">
    <h2 class="section-title text-center">Ils nous font confiance</h2>
    <div class="row g-4 mt-2">
        <?php
        $temoignages = [
            ['nom' => 'Amira B.', 'role' => 'Sage-femme, Sfax', 'texte' => 'J\'ai trouvé un poste dans une maternité à Sfax trois semaines après mon inscription. Le test de personnalité m\'a vraiment démarquée.'],
            ['nom' => 'Dr. Karim M.', 'role' => 'Directeur, Clinique Les Oliviers', 'texte' => 'Les suggestions IA nous font gagner un temps précieux : nous recevons directement les profils les plus pertinents pour chaque offre.'],
            ['nom' => 'Youssef T.', 'role' => 'Technicien anesthésiste, Sousse', 'texte' => 'Une plateforme claire, spécialisée, et des recruteurs sérieux. Les entretiens se planifient en un clic.'],
        ];
        foreach ($temoignages as $t): ?>
        <div class="col-md-4">
            <div class="card h-100 border-0 shadow-sm testimonial">
                <div class="card-body p-4">
                    <i class="fa-solid fa-quote-left fa-2x text-primary opacity-25"></i>
                    <p class="mt-2"><?= e($t['texte']) ?></p>
                    <div class="d-flex align-items-center gap-2 mt-3">
                        <div class="avatar-initials"><?= e(mb_substr($t['nom'], 0, 1)) ?></div>
                        <div><strong><?= e($t['nom']) ?></strong><br><small class="text-muted"><?= e($t['role']) ?></small></div>
                    </div>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php';
