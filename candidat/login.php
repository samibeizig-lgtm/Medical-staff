<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
if (isset($_GET['offre'])) {
    $_SESSION['redirect_after_login'] = url('candidat/offres.php') . '#offre-' . (int)$_GET['offre'];
}
if (user_type() === 'candidat') {
    redirect_after_login('candidat/dashboard.php');
}
$error = null;
if (is_post()) {
    csrf_check();
    $u = attempt_login(input('email'), (string)($_POST['password'] ?? ''), 'candidat');
    if ($u) {
        login_user((int)$u['id']);
        redirect_after_login('candidat/dashboard.php');
    }
    $error = 'Email ou mot de passe incorrect.';
}
$pageTitle = 'Connexion candidat';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-md-6 col-lg-4">
            <div class="card border-0 shadow auth-card">
                <div class="card-body p-4 p-md-5">
                    <div class="text-center mb-4">
                        <div class="icon-circle mx-auto mb-2"><i class="fa-solid fa-user-nurse"></i></div>
                        <h1 class="h3">Espace candidat</h1>
                        <?php if (isset($_GET['offre'])): ?><p class="small text-muted">Connectez-vous pour postuler à cette offre.</p><?php endif; ?>
                    </div>
                    <?php if ($error): ?><div class="alert alert-danger py-2"><?= e($error) ?></div><?php endif; ?>
                    <form method="post">
                        <?= csrf_field() ?>
                        <div class="mb-3"><label class="form-label">Email</label><input type="email" name="email" class="form-control" value="<?= e(input('email')) ?>" required autofocus></div>
                        <div class="mb-4"><label class="form-label">Mot de passe</label><input type="password" name="password" class="form-control" required></div>
                        <button class="btn btn-primary w-100">Se connecter</button>
                    </form>
                    <p class="text-center small mt-3 mb-0">Pas encore de compte ? <a href="<?= url('candidat/register.php') ?>">Créer un compte</a></p>
                    <p class="text-center small mt-1 mb-0"><a href="<?= url('recruteur/login.php') ?>">Vous êtes un établissement ?</a></p>
                </div>
            </div>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
