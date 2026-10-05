<?php
/** @var string $pageTitle */
$u = current_user();
$pageTitle = $pageTitle ?? 'Recrutement médical et paramédical en Tunisie';
$active = $active ?? '';
function nav_active(string $key, string $active): string { return $key === $active ? ' active' : ''; }
?>
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?= e(csrf_token()) ?>">
    <meta name="description" content="Medical Staff : la plateforme tunisienne de recrutement médical et paramédical.">
    <title><?= e($pageTitle) ?> | Medical Staff</title>
    <link rel="icon" href="<?= url('assets/img/logo.svg') ?>" type="image/svg+xml">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="<?= url('assets/css/style.css') ?>" rel="stylesheet">
    <?= $extraHead ?? '' ?>
</head>
<body data-base="<?= e(url('')) ?>">
<nav class="navbar navbar-expand-xl navbar-light bg-white shadow-sm sticky-top">
    <div class="container">
        <a class="navbar-brand fw-bold text-primary" href="<?= url('index.php') ?>">
            <img src="<?= url('assets/img/logo.svg') ?>" alt="" width="34" height="34" class="me-1"> Medical <span class="text-teal">Staff</span>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-label="Menu">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
            <ul class="navbar-nav me-auto">
                <li class="nav-item"><a class="nav-link<?= nav_active('home', $active) ?>" href="<?= url('index.php') ?>">Accueil</a></li>
                <li class="nav-item"><a class="nav-link<?= nav_active('mission', $active) ?>" href="<?= url('mission.php') ?>">Notre mission</a></li>
                <li class="nav-item"><a class="nav-link<?= nav_active('offres', $active) ?>" href="<?= url($u && $u['type'] === 'candidat' ? 'candidat/offres.php' : 'offres.php') ?>">Offres d'emploi</a></li>
                <li class="nav-item"><a class="nav-link<?= nav_active('demandes', $active) ?>" href="<?= url('demandes.php') ?>">Demandes d'emploi</a></li>
            </ul>
            <ul class="navbar-nav">
            <?php if (!$u): ?>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown"><i class="fa-solid fa-user-nurse me-1"></i>Espace candidat</a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="<?= url('candidat/login.php') ?>">Connexion</a></li>
                        <li><a class="dropdown-item" href="<?= url('candidat/register.php') ?>">Créer un compte</a></li>
                    </ul>
                </li>
                <li class="nav-item dropdown">
                    <a class="btn btn-primary ms-xl-2 dropdown-toggle" href="#" data-bs-toggle="dropdown"><i class="fa-solid fa-hospital me-1"></i>Établissement</a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="<?= url('recruteur/login.php') ?>">Connexion</a></li>
                        <li><a class="dropdown-item" href="<?= url('recruteur/register.php') ?>">Inscrire mon établissement</a></li>
                    </ul>
                </li>
            <?php elseif ($u['type'] === 'candidat'): ?>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown"><i class="fa-solid fa-circle-user me-1"></i>Mon espace</a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="<?= url('candidat/dashboard.php') ?>"><i class="fa-solid fa-gauge me-2"></i>Tableau de bord</a></li>
                        <li><a class="dropdown-item" href="<?= url('candidat/cv.php') ?>"><i class="fa-solid fa-file-pen me-2"></i>Mon CV</a></li>
                        <li><a class="dropdown-item" href="<?= url('candidat/test.php') ?>"><i class="fa-solid fa-brain me-2"></i>Test de personnalité</a></li>
                        <li><a class="dropdown-item" href="<?= url('candidat/offres.php') ?>"><i class="fa-solid fa-magnifying-glass me-2"></i>Rechercher des offres</a></li>
                        <li><a class="dropdown-item" href="<?= url('candidat/entretiens.php') ?>"><i class="fa-solid fa-calendar-check me-2"></i>Mes entretiens</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="<?= url('logout.php') ?>"><i class="fa-solid fa-right-from-bracket me-2"></i>Déconnexion</a></li>
                    </ul>
                </li>
            <?php elseif ($u['type'] === 'recruteur'): ?>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown"><i class="fa-solid fa-hospital me-1"></i>Mon établissement</a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="<?= url('recruteur/dashboard.php') ?>"><i class="fa-solid fa-gauge me-2"></i>Tableau de bord</a></li>
                        <li><a class="dropdown-item" href="<?= url('recruteur/offres.php') ?>"><i class="fa-solid fa-briefcase me-2"></i>Mes offres</a></li>
                        <li><a class="dropdown-item" href="<?= url('recruteur/offre_form.php') ?>"><i class="fa-solid fa-plus me-2"></i>Nouvelle offre</a></li>
                        <li><a class="dropdown-item" href="<?= url('recruteur/cvtheque.php') ?>"><i class="fa-solid fa-address-book me-2"></i>CVthèque</a></li>
                        <li><a class="dropdown-item" href="<?= url('recruteur/entretiens.php') ?>"><i class="fa-solid fa-calendar-days me-2"></i>Mes entretiens</a></li>
                        <li><a class="dropdown-item" href="<?= url('recruteur/abonnement.php') ?>"><i class="fa-solid fa-credit-card me-2"></i>Abonnement</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="<?= url('logout.php') ?>"><i class="fa-solid fa-right-from-bracket me-2"></i>Déconnexion</a></li>
                    </ul>
                </li>
            <?php endif; ?>
            </ul>
        </div>
    </div>
</nav>
<main>
<?php $fl = flashes(); if ($fl): ?>
    <div class="container mt-3">
        <?php foreach ($fl as $flashItem): ?>
            <div class="alert alert-<?= e($flashItem['type']) ?> alert-dismissible fade show" role="alert">
                <?= e($flashItem['message']) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
