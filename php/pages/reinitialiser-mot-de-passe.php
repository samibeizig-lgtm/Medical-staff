<?php
defined('APP_ROOT') || exit;
require APP_ROOT . '/includes/password_reset.php';
$token = (string)($_GET['token'] ?? $_POST['token'] ?? '');
$reset = reset_find($token);
$errors = [];
if ($reset && is_post()) {
    csrf_check();
    $pass = (string)($_POST['password'] ?? '');
    if (strlen($pass) < 8) $errors[] = 'Le mot de passe doit contenir au moins 8 caractères.';
    if ($pass !== ($_POST['password2'] ?? '')) $errors[] = 'Les mots de passe ne correspondent pas.';
    if (!$errors) {
        reset_apply($reset, $pass);
        flash('success', 'Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.');
        redirect(['recruteur' => 'recruteur/login', 'admin' => 'admin/login'][$reset['type']] ?? 'candidat/login');
    }
}
$pageTitle = 'Nouveau mot de passe';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-md-6 col-lg-4">
            <div class="card border-0 shadow auth-card">
                <div class="card-body p-4 p-md-5">
                    <div class="text-center mb-4">
                        <div class="icon-circle mx-auto mb-2"><i class="fa-solid fa-lock"></i></div>
                        <h1 class="h4">Nouveau mot de passe</h1>
                    </div>
                    <?php if (!$reset): ?>
                        <div class="alert alert-warning">Ce lien est invalide, expiré ou a déjà été utilisé.</div>
                        <a href="<?= url('mot-de-passe-oublie') ?>" class="btn btn-primary w-100">Demander un nouveau lien</a>
                    <?php else: ?>
                        <p class="small text-muted">Compte : <strong><?= e($reset['email']) ?></strong></p>
                        <?php foreach ($errors as $err): ?><div class="alert alert-danger py-2"><?= e($err) ?></div><?php endforeach; ?>
                        <form method="post">
                            <?= csrf_field() ?>
                            <input type="hidden" name="token" value="<?= e($token) ?>">
                            <div class="mb-3"><label class="form-label">Nouveau mot de passe</label><input type="password" name="password" class="form-control" minlength="8" required autofocus><div class="form-text">8 caractères minimum.</div></div>
                            <div class="mb-4"><label class="form-label">Confirmation</label><input type="password" name="password2" class="form-control" required></div>
                            <button class="btn btn-primary w-100">Enregistrer</button>
                        </form>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
