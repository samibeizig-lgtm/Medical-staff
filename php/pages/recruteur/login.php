<?php
defined('APP_ROOT') || exit;
if (user_type() === 'recruteur') {
    redirect_after_login('recruteur/dashboard');
}
$error = null;
if (is_post()) {
    csrf_check();
    $u = attempt_login(input('email'), (string)($_POST['password'] ?? ''), 'recruteur');
    if (is_array($u)) {
        login_user((int)$u['id']);
        redirect_after_login('recruteur/dashboard');
    }
    $error = $u;
}
$pageTitle = 'Connexion établissement';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-md-6 col-lg-4">
            <div class="card border-0 shadow auth-card">
                <div class="card-body p-4 p-md-5">
                    <div class="text-center mb-4">
                        <div class="icon-circle icon-teal mx-auto mb-2"><i class="fa-solid fa-hospital"></i></div>
                        <h1 class="h3">Espace établissement</h1>
                    </div>
                    <?php if ($error): ?><div class="alert alert-danger py-2"><?= e($error) ?></div><?php endif; ?>
                    <form method="post">
                        <?= csrf_field() ?>
                        <div class="mb-3"><label class="form-label">Email</label><input type="email" name="email" class="form-control" value="<?= e(input('email')) ?>" required autofocus></div>
                        <div class="mb-4"><label class="form-label">Mot de passe</label><input type="password" name="password" class="form-control" required>
                            <div class="text-end mt-1"><a class="small" href="<?= url('mot-de-passe-oublie?type=recruteur') ?>">Mot de passe oublié ?</a></div></div>
                        <button class="btn btn-teal w-100">Se connecter</button>
                    </form>
                    <p class="text-center small mt-3 mb-0">Nouvel établissement ? <a href="<?= url('recruteur/register') ?>">S'inscrire</a></p>
                    <p class="text-center small mt-1 mb-0"><a href="<?= url('candidat/login') ?>">Vous êtes candidat ?</a></p>
                </div>
            </div>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
