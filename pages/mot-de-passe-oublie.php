<?php
defined('APP_ROOT') || exit;
require APP_ROOT . '/includes/password_reset.php';
$type = in_array($_GET['type'] ?? '', ['candidat', 'recruteur'], true) ? $_GET['type'] : 'candidat';
$envoye = false;
$error = null;
if (is_post()) {
    csrf_check();
    $email = input('email');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Adresse email invalide.';
    } else {
        reset_request($email);
        $envoye = true;
    }
}
$pageTitle = 'Mot de passe oublié';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-md-6 col-lg-4">
            <div class="card border-0 shadow auth-card">
                <div class="card-body p-4 p-md-5">
                    <div class="text-center mb-4">
                        <div class="icon-circle mx-auto mb-2"><i class="fa-solid fa-key"></i></div>
                        <h1 class="h4">Mot de passe oublié</h1>
                    </div>
                    <?php if ($envoye): ?>
                        <div class="alert alert-success"><i class="fa-solid fa-envelope-circle-check me-1"></i>Si un compte est associé à cette adresse, vous allez recevoir un email contenant un lien de réinitialisation (valable 1 heure). Pensez à vérifier vos courriers indésirables.</div>
                    <?php else: ?>
                        <p class="small text-muted">Saisissez l'adresse email de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
                        <?php if ($error): ?><div class="alert alert-danger py-2"><?= e($error) ?></div><?php endif; ?>
                        <form method="post">
                            <?= csrf_field() ?>
                            <div class="mb-3"><label class="form-label">Email</label><input type="email" name="email" class="form-control" value="<?= e(input('email')) ?>" required autofocus></div>
                            <button class="btn btn-primary w-100">Envoyer le lien</button>
                        </form>
                    <?php endif; ?>
                    <p class="text-center small mt-3 mb-0"><a href="<?= url($type . '/login') ?>"><i class="fa-solid fa-arrow-left me-1"></i>Retour à la connexion</a></p>
                </div>
            </div>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
