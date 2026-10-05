<?php
defined('APP_ROOT') || exit;
if (user_type() === 'recruteur') {
    redirect('recruteur/dashboard');
}
$errors = [];
if (is_post()) {
    csrf_check();
    $d = [
        'nom_etablissement'  => input('nom_etablissement'),
        'type_etablissement' => input('type_etablissement'),
        'matricule_fiscal'   => input('matricule_fiscal'),
        'adresse'            => input('adresse'),
        'ville'              => input('ville'),
        'telephone'          => input('telephone'),
        'contact_nom'        => input('contact_nom'),
        'contact_prenom'     => input('contact_prenom'),
        'contact_fonction'   => input('contact_fonction'),
    ];
    $email = mb_strtolower(input('email'));
    $pass = (string)($_POST['password'] ?? '');
    if ($d['nom_etablissement'] === '') $errors[] = 'Le nom de l\'établissement est obligatoire.';
    if (!in_array($d['type_etablissement'], TYPES_ETABLISSEMENT, true)) $errors[] = 'Type d\'établissement invalide.';
    if (!in_array($d['ville'], GOUVERNORATS, true)) $errors[] = 'Veuillez choisir un gouvernorat.';
    if ($d['contact_nom'] === '' || $d['contact_prenom'] === '') $errors[] = 'Le nom et le prénom du responsable sont obligatoires.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Adresse email invalide.';
    if (strlen($pass) < 8) $errors[] = 'Le mot de passe doit contenir au moins 8 caractères.';
    if ($pass !== ($_POST['password2'] ?? '')) $errors[] = 'Les mots de passe ne correspondent pas.';
    if (!$errors && db_val('SELECT 1 FROM utilisateurs WHERE email = ?', [$email])) $errors[] = 'Un compte existe déjà avec cet email.';

    if (!$errors) {
        $pdo = db();
        $pdo->beginTransaction();
        db_exec('INSERT INTO utilisateurs (email, mot_de_passe, type) VALUES (?, ?, ?)', [$email, password_hash($pass, PASSWORD_BCRYPT), 'recruteur']);
        $uid = (int)$pdo->lastInsertId();
        db_exec(
            'INSERT INTO recruteurs (utilisateur_id, nom_etablissement, type_etablissement, matricule_fiscal, adresse, ville, telephone, contact_nom, contact_prenom, contact_fonction)
             VALUES (?,?,?,?,?,?,?,?,?,?)',
            [$uid, $d['nom_etablissement'], $d['type_etablissement'], $d['matricule_fiscal'] ?: null, $d['adresse'] ?: null, $d['ville'],
             $d['telephone'] ?: null, $d['contact_nom'], $d['contact_prenom'], $d['contact_fonction'] ?: null]
        );
        $pdo->commit();
        login_user($uid);
        send_mail($email, 'Bienvenue sur Medical Staff', '<p>Bonjour ' . e($d['contact_prenom']) . ',</p><p>L\'établissement <strong>' . e($d['nom_etablissement']) . '</strong> est maintenant inscrit. Activez votre abonnement pour publier des offres et accéder à la CVthèque.</p>');
        flash('success', 'Établissement inscrit ! Activez votre abonnement pour commencer à recruter.');
        redirect('recruteur/abonnement');
    }
}
$pageTitle = 'Inscription établissement';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-lg-8">
            <div class="card border-0 shadow auth-card">
                <div class="card-body p-4 p-md-5">
                    <div class="text-center mb-4">
                        <div class="icon-circle icon-teal mx-auto mb-2"><i class="fa-solid fa-hospital"></i></div>
                        <h1 class="h3">Inscrire mon établissement</h1>
                    </div>
                    <?php foreach ($errors as $err): ?><div class="alert alert-danger py-2"><?= e($err) ?></div><?php endforeach; ?>
                    <form method="post">
                        <?= csrf_field() ?>
                        <h2 class="h6 text-uppercase text-muted mb-3">Établissement</h2>
                        <div class="row g-3 mb-4">
                            <div class="col-md-7"><label class="form-label">Nom de l'établissement *</label><input name="nom_etablissement" class="form-control" value="<?= e(input('nom_etablissement')) ?>" required></div>
                            <div class="col-md-5"><label class="form-label">Type *</label><select name="type_etablissement" class="form-select" required><?= options(TYPES_ETABLISSEMENT, input('type_etablissement'), 'Choisir…') ?></select></div>
                            <div class="col-md-6"><label class="form-label">Adresse</label><input name="adresse" class="form-control" value="<?= e(input('adresse')) ?>"></div>
                            <div class="col-md-3"><label class="form-label">Gouvernorat *</label><select name="ville" class="form-select" required><?= options(GOUVERNORATS, input('ville'), 'Choisir…') ?></select></div>
                            <div class="col-md-3"><label class="form-label">Téléphone</label><input name="telephone" class="form-control" value="<?= e(input('telephone')) ?>"></div>
                            <div class="col-md-6"><label class="form-label">Matricule fiscal</label><input name="matricule_fiscal" class="form-control" value="<?= e(input('matricule_fiscal')) ?>"></div>
                        </div>
                        <h2 class="h6 text-uppercase text-muted mb-3">Responsable du recrutement</h2>
                        <div class="row g-3 mb-4">
                            <div class="col-md-4"><label class="form-label">Nom *</label><input name="contact_nom" class="form-control" value="<?= e(input('contact_nom')) ?>" required></div>
                            <div class="col-md-4"><label class="form-label">Prénom *</label><input name="contact_prenom" class="form-control" value="<?= e(input('contact_prenom')) ?>" required></div>
                            <div class="col-md-4"><label class="form-label">Fonction</label><input name="contact_fonction" class="form-control" placeholder="DRH, Directeur…" value="<?= e(input('contact_fonction')) ?>"></div>
                        </div>
                        <h2 class="h6 text-uppercase text-muted mb-3">Identifiants</h2>
                        <div class="row g-3 mb-4">
                            <div class="col-md-12"><label class="form-label">Email professionnel *</label><input type="email" name="email" class="form-control" value="<?= e(input('email')) ?>" required></div>
                            <div class="col-md-6"><label class="form-label">Mot de passe *</label><input type="password" name="password" class="form-control" minlength="8" required></div>
                            <div class="col-md-6"><label class="form-label">Confirmation *</label><input type="password" name="password2" class="form-control" required></div>
                        </div>
                        <button class="btn btn-teal w-100 btn-lg">Créer le compte établissement</button>
                    </form>
                    <p class="text-center small mt-3 mb-0">Déjà inscrit ? <a href="<?= url('recruteur/login') ?>">Se connecter</a></p>
                </div>
            </div>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
