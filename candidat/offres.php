<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require APP_ROOT . '/includes/offres.php';
require_role('candidat');
$me = current_candidat();
$cid = (int)$me['id'];
$cvOk = cv_complet($cid);
$testOk = test_passe($cid);

if (is_post()) {
    csrf_check();
    $offreId = (int)($_POST['offre_id'] ?? 0);
    $o = db_one(
        'SELECT o.*, r.nom_etablissement, u.email AS rec_email FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id
         JOIN utilisateurs u ON u.id = r.utilisateur_id
         WHERE o.id = ? AND o.active = 1 AND (o.date_limite IS NULL OR o.date_limite >= CURDATE())',
        [$offreId]
    );
    if (!$o) {
        flash('danger', 'Cette offre n\'est plus disponible.');
    } elseif (!$cvOk || !$testOk) {
        flash('warning', 'Complétez votre CV et passez le test de personnalité avant de postuler.');
    } elseif (db_val('SELECT 1 FROM candidatures WHERE offre_id = ? AND candidat_id = ?', [$offreId, $cid])) {
        flash('info', 'Vous avez déjà postulé à cette offre.');
    } else {
        db_exec('INSERT INTO candidatures (offre_id, candidat_id) VALUES (?, ?)', [$offreId, $cid]);
        $user = current_user();
        send_mail($user['email'], 'Confirmation de candidature – ' . $o['titre'],
            '<p>Bonjour ' . e($me['prenom']) . ',</p><p>Votre candidature au poste <strong>' . e($o['titre']) . '</strong> chez <strong>' . e($o['nom_etablissement']) . '</strong> (' . e($o['ville']) . ') a bien été transmise.</p><p>Vous serez notifié(e) si l\'établissement vous propose un entretien.</p>');
        send_mail($o['rec_email'], 'Nouvelle candidature – ' . $o['titre'],
            '<p>Bonjour,</p><p>Une nouvelle candidature (' . e(ref_candidat($cid)) . ' – ' . e($me['prenom'] . ' ' . $me['nom']) . ') a été reçue pour votre offre <strong>' . e($o['titre']) . '</strong>.</p><p><a href="' . e(absolute_url('recruteur/candidatures.php?offre=' . $offreId)) . '">Voir les candidatures</a></p>');
        flash('success', 'Votre candidature au poste « ' . $o['titre'] . ' » a bien été envoyée ! Un email de confirmation vous a été adressé.');
    }
    redirect('candidat/offres.php?' . http_build_query(array_intersect_key($_GET, array_flip(['poste', 'ville', 'contrat', 'salaire_min', 'page']))) . '#offre-' . $offreId);
}

$f = [
    'poste'       => input('poste', ''),
    'ville'       => input('ville'),
    'contrat'     => input('contrat'),
    'salaire_min' => int_or_null(input('salaire_min')),
];
// Par défaut, proposer les offres correspondant au poste recherché
if (!isset($_GET['poste']) && $me['poste_recherche']) {
    $f['poste'] = $me['poste_recherche'];
}
$res = search_offres($f, (int)input('page', 1));
$deja = array_flip(array_map('intval', array_column(db_all('SELECT offre_id FROM candidatures WHERE candidat_id = ?', [$cid]), 'offre_id')));

$pageTitle = 'Rechercher des offres';
$active = 'offres';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <h1 class="h3 mb-3">Rechercher des offres</h1>
    <?php if (!$cvOk || !$testOk): ?>
    <div class="alert alert-warning">
        <i class="fa-solid fa-lock me-1"></i>Le bouton « Postuler » est verrouillé tant que votre profil n'est pas prêt :
        <?= !$cvOk ? '<a class="btn btn-sm btn-warning ms-2" href="' . url('candidat/cv.php') . '">Compléter mon CV</a>' : '' ?>
        <?= !$testOk ? '<a class="btn btn-sm btn-warning ms-2" href="' . url('candidat/test.php') . '">Passer le test de personnalité</a>' : '' ?>
    </div>
    <?php endif; ?>
    <form class="card border-0 shadow-sm mb-4" method="get">
        <div class="card-body row g-2 align-items-end">
            <div class="col-md-4"><label class="form-label small">Poste</label><select name="poste" class="form-select"><?= options(POSTES, $f['poste'], 'Tous les postes') ?></select></div>
            <div class="col-md-2"><label class="form-label small">Ville</label><select name="ville" class="form-select"><?= options(GOUVERNORATS, $f['ville'], 'Toutes') ?></select></div>
            <div class="col-md-2"><label class="form-label small">Contrat</label><select name="contrat" class="form-select"><?= options(TYPES_CONTRAT, $f['contrat'], 'Tous') ?></select></div>
            <div class="col-md-2"><label class="form-label small">Salaire min. (TND)</label><input type="number" min="0" step="50" name="salaire_min" class="form-control" value="<?= e($f['salaire_min']) ?>"></div>
            <div class="col-md-2 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-filter me-1"></i>Filtrer</button></div>
        </div>
    </form>
    <p class="text-muted"><?= $res['total'] ?> offre(s) trouvée(s)</p>
    <?php if (!$res['rows']): ?>
        <div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>Aucune offre ne correspond à vos critères. <a href="?poste=">Voir toutes les offres</a></p></div>
    <?php endif; ?>
    <?php foreach ($res['rows'] as $o):
        if (isset($deja[(int)$o['id']])) {
            $btn = '<span class="btn btn-success disabled"><i class="fa-solid fa-check me-1"></i>Candidature envoyée</span>';
        } elseif (!$cvOk || !$testOk) {
            $btn = '<button class="btn btn-secondary" disabled><i class="fa-solid fa-lock me-1"></i>Postuler</button><div class="mt-2">'
                . (!$cvOk ? '<a class="btn btn-sm btn-outline-warning d-block mb-1" href="' . url('candidat/cv.php') . '">Compléter mon CV</a>' : '')
                . (!$testOk ? '<a class="btn btn-sm btn-outline-warning d-block" href="' . url('candidat/test.php') . '">Passer le test de personnalité</a>' : '')
                . '</div>';
        } else {
            $btn = '<form method="post">' . csrf_field() . '<input type="hidden" name="offre_id" value="' . (int)$o['id'] . '">'
                . '<button class="btn btn-primary" onclick="return confirm(\'Confirmer votre candidature à cette offre ?\')"><i class="fa-solid fa-paper-plane me-1"></i>Postuler</button></form>';
        }
        echo render_offre_card($o, $btn);
    endforeach; ?>
    <?= pagination($res) ?>
</div>
<?php require APP_ROOT . '/includes/footer.php';
