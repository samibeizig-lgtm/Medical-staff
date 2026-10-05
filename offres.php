<?php
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/offres.php';

// Un candidat connecté utilise la recherche avancée de son espace
if (user_type() === 'candidat') {
    redirect('candidat/offres.php?' . http_build_query($_GET));
}

$pageTitle = 'Offres d\'emploi';
$active = 'offres';
$f = [
    'poste'   => input('poste'),
    'ville'   => input('ville'),
    'contrat' => input('contrat'),
];
$res = search_offres($f, (int)input('page', 1));
require __DIR__ . '/includes/header.php';
?>
<section class="page-header">
    <div class="container">
        <h1 class="fw-bold">Offres d'emploi</h1>
        <p class="lead mb-0">Les postes médicaux et paramédicaux à pourvoir partout en Tunisie.</p>
    </div>
</section>
<div class="container py-4">
    <form class="card border-0 shadow-sm mb-4" method="get">
        <div class="card-body row g-2 align-items-end">
            <div class="col-md-4"><label class="form-label small">Poste</label><select name="poste" class="form-select"><?= options(POSTES, $f['poste'], 'Tous les postes') ?></select></div>
            <div class="col-md-3"><label class="form-label small">Ville (gouvernorat)</label><select name="ville" class="form-select"><?= options(GOUVERNORATS, $f['ville'], 'Toute la Tunisie') ?></select></div>
            <div class="col-md-3"><label class="form-label small">Type de contrat</label><select name="contrat" class="form-select"><?= options(TYPES_CONTRAT, $f['contrat'], 'Tous') ?></select></div>
            <div class="col-md-2 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-filter me-1"></i>Filtrer</button></div>
        </div>
    </form>
    <p class="text-muted"><?= $res['total'] ?> offre(s) trouvée(s)</p>
    <?php if (!$res['rows']): ?>
        <div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>Aucune offre ne correspond à vos critères.</p></div>
    <?php endif; ?>
    <?php foreach ($res['rows'] as $o):
        if (user_type() === 'recruteur') {
            $btn = '';
        } else {
            $btn = '<a class="btn btn-primary" href="' . url('candidat/login.php?offre=' . (int)$o['id']) . '"><i class="fa-solid fa-paper-plane me-1"></i>Postuler</a>'
                 . '<div class="small text-muted mt-1">Connexion requise</div>';
        }
        echo render_offre_card($o, $btn);
    endforeach; ?>
    <?= pagination($res) ?>
</div>
<?php require __DIR__ . '/includes/footer.php';
