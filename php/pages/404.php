<?php
defined('APP_ROOT') || exit;
$pageTitle = 'Page introuvable';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-5 text-center">
    <div class="empty-state">
        <i class="fa-solid fa-stethoscope"></i>
        <h1 class="h3 text-dark">Page introuvable</h1>
        <p>La page demandée n'existe pas ou a été déplacée.</p>
        <a href="<?= url('') ?>" class="btn btn-primary">Retour à l'accueil</a>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
