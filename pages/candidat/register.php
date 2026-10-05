<?php
defined('APP_ROOT') || exit;
if (user_type() === 'candidat') {
    redirect('candidat/dashboard');
}
$errors = [];
if (is_post()) {
    csrf_check();
    $nom = input('nom');
    $prenom = input('prenom');
    $email = mb_strtolower(input('email'));
    $pass = (string)($_POST['password'] ?? '');
    $pass2 = (string)($_POST['password2'] ?? '');

    if ($nom === '' || $prenom === '') $errors[] = 'Le nom et le prénom sont obligatoires.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Adresse email invalide.';
    if (strlen($pass) < 8) $errors[] = 'Le mot de passe doit contenir au moins 8 caractères.';
    if ($pass !== $pass2) $errors[] = 'Les mots de passe ne correspondent pas.';
    if (!$errors && db_val('SELECT 1 FROM utilisateurs WHERE email = ?', [$email])) $errors[] = 'Un compte existe déjà avec cet email.';

    if (!$errors) {
        $pdo = db();
        $pdo->beginTransaction();
        db_exec('INSERT INTO utilisateurs (email, mot_de_passe, type) VALUES (?, ?, ?)', [$email, password_hash($pass, PASSWORD_BCRYPT), 'candidat']);
        $uid = (int)$pdo->lastInsertId();
        db_exec('INSERT INTO candidats (utilisateur_id, nom, prenom, updated_at) VALUES (?, ?, ?, NOW())', [$uid, $nom, $prenom]);
        $pdo->commit();
        login_user($uid);
        send_mail($email, 'Bienvenue sur Medical Staff', '<p>Bonjour ' . e($prenom) . ',</p><p>Votre compte candidat a bien été créé. Complétez votre CV et passez le test de personnalité pour postuler aux offres.</p>');
        flash('success', 'Bienvenue ' . $prenom . ' ! Complétez maintenant votre CV.');
        redirect('candidat/cv');
    }
}
$pageTitle = 'Inscription candidat';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-md-7 col-lg-5">
            <div class="card border-0 shadow auth-card">
                <div class="card-body p-4 p-md-5">
                    <div class="text-center mb-4">
                        <div class="icon-circle mx-auto mb-2"><i class="fa-solid fa-user-nurse"></i></div>
                        <h1 class="h3">Créer mon compte candidat</h1>
                        <p class="text-muted small">Gratuit et sans engagement</p>
                    </div>
                    <?php foreach ($errors as $err): ?><div class="alert alert-danger py-2"><?= e($err) ?></div><?php endforeach; ?>
                    <form method="post" novalidate>
                        <?= csrf_field() ?>
                        <div class="row g-2">
                            <div class="col-6 mb-3"><label class="form-label">Nom</label><input name="nom" class="form-control" value="<?= e(input('nom')) ?>" required></div>
                            <div class="col-6 mb-3"><label class="form-label">Prénom</label><input name="prenom" class="form-control" value="<?= e(input('prenom')) ?>" required></div>
                        </div>
                        <div class="mb-3"><label class="form-label">Email</label><input type="email" name="email" class="form-control" value="<?= e(input('email')) ?>" required></div>
                        <div class="mb-3"><label class="form-label">Mot de passe</label><input type="password" name="password" class="form-control" minlength="8" required><div class="form-text">8 caractères minimum.</div></div>
                        <div class="mb-4"><label class="form-label">Confirmer le mot de passe</label><input type="password" name="password2" class="form-control" required></div>
                        <button class="btn btn-primary w-100">Créer mon compte</button>
                    </form>
                    <p class="text-center small mt-3 mb-0">Déjà inscrit ? <a href="<?= url('candidat/login') ?>">Se connecter</a></p>
                </div>
            </div>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
