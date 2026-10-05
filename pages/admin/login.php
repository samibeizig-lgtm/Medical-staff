<?php
defined('APP_ROOT') || exit;
if (user_type() === 'admin') {
    redirect_after_login('admin/dashboard');
}
$error = null;
if (is_post()) {
    csrf_check();
    $u = attempt_login(input('email'), (string)($_POST['password'] ?? ''), 'admin');
    if (is_array($u)) {
        login_user((int)$u['id']);
        redirect_after_login('admin/dashboard');
    }
    $error = $u;
}
$pageTitle = 'Administration';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-md-6 col-lg-4">
            <div class="card border-0 shadow auth-card">
                <div class="card-body p-4 p-md-5">
                    <div class="text-center mb-4">
                        <div class="icon-circle icon-dark mx-auto mb-2"><i class="fa-solid fa-user-shield"></i></div>
                        <h1 class="h3">Administration</h1>
                    </div>
                    <?php if ($error): ?><div class="alert alert-danger py-2"><?= e($error) ?></div><?php endif; ?>
                    <form method="post">
                        <?= csrf_field() ?>
                        <div class="mb-3"><label class="form-label">Email</label><input type="email" name="email" class="form-control" value="<?= e(input('email')) ?>" required autofocus></div>
                        <div class="mb-4"><label class="form-label">Mot de passe</label><input type="password" name="password" class="form-control" required>
                            <div class="text-end mt-1"><a class="small" href="<?= url('mot-de-passe-oublie') ?>">Mot de passe oublié ?</a></div></div>
                        <button class="btn btn-dark w-100">Se connecter</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
