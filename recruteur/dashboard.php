<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require_role('recruteur');
$r = current_recruteur();
$rid = (int)$r['id'];
$abo = abonnement_actif($rid);
$nbOffres = (int)db_val('SELECT COUNT(*) FROM offres WHERE recruteur_id = ? AND active = 1', [$rid]);
$nbCand = (int)db_val('SELECT COUNT(*) FROM candidatures ca JOIN offres o ON o.id = ca.offre_id WHERE o.recruteur_id = ?', [$rid]);
$nbEnt = (int)db_val('SELECT COUNT(*) FROM entretiens WHERE recruteur_id = ? AND date_debut >= NOW()', [$rid]);
$nbCv = (int)db_val("SELECT COUNT(*) FROM candidats WHERE poste_recherche IS NOT NULL AND poste_recherche <> ''");
$offres = db_all(
    'SELECT o.*, (SELECT COUNT(*) FROM candidatures ca WHERE ca.offre_id = o.id) AS nb FROM offres o
     WHERE o.recruteur_id = ? ORDER BY o.created_at DESC LIMIT 5',
    [$rid]
);
$prochains = db_all(
    'SELECT e.*, c.nom, c.prenom, o.titre FROM entretiens e JOIN candidats c ON c.id = e.candidat_id LEFT JOIN offres o ON o.id = e.offre_id
     WHERE e.recruteur_id = ? AND e.date_debut >= NOW() ORDER BY e.date_debut LIMIT 5',
    [$rid]
);
$pageTitle = 'Tableau de bord établissement';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
            <h1 class="h3 mb-0"><?= e($r['nom_etablissement']) ?></h1>
            <p class="text-muted mb-0"><?= e($r['type_etablissement']) ?> · <?= e($r['ville']) ?> · Responsable : <?= e($r['contact_prenom'] . ' ' . $r['contact_nom']) ?></p>
        </div>
        <div class="d-flex flex-wrap gap-2">
            <a href="<?= url('recruteur/offres.php') ?>" class="btn btn-outline-primary"><i class="fa-solid fa-briefcase me-1"></i>Gérer mes offres</a>
            <a href="<?= url('recruteur/offre_form.php') ?>" class="btn btn-primary"><i class="fa-solid fa-plus me-1"></i>Nouvelle offre</a>
            <a href="<?= url('recruteur/entretiens.php') ?>" class="btn btn-outline-primary"><i class="fa-solid fa-calendar-days me-1"></i>Mes entretiens</a>
        </div>
    </div>

    <div class="card border-0 shadow-sm mb-4 subscription-card <?= $abo ? 'active' : 'inactive' ?>">
        <div class="card-body d-flex flex-wrap align-items-center gap-3">
            <i class="fa-solid fa-<?= $abo ? 'crown' : 'circle-exclamation' ?> fa-2x"></i>
            <div class="flex-grow-1">
                <?php if ($abo): ?>
                    <strong>Abonnement annuel actif</strong><br>
                    <small>Valable jusqu'au <?= date_fr($abo['date_fin']) ?> · Réf. <?= e($abo['reference_paiement']) ?></small>
                <?php else: ?>
                    <strong>Aucun abonnement actif</strong><br>
                    <small>Souscrivez l'abonnement annuel (<?= number_format((int)cfg('abonnement_prix'), 0, ',', ' ') ?> TND) pour publier des offres et accéder à la CVthèque.</small>
                <?php endif; ?>
            </div>
            <a href="<?= url('recruteur/abonnement.php') ?>" class="btn <?= $abo ? 'btn-outline-light' : 'btn-warning' ?>"><?= $abo ? 'Détails' : 'S\'abonner maintenant' ?></a>
        </div>
    </div>

    <div class="row g-3 mb-4">
        <div class="col-6 col-md-3"><div class="kpi"><i class="fa-solid fa-briefcase"></i><strong><?= $nbOffres ?></strong><span>offres actives</span></div></div>
        <div class="col-6 col-md-3"><div class="kpi"><i class="fa-solid fa-inbox"></i><strong><?= $nbCand ?></strong><span>candidatures reçues</span></div></div>
        <div class="col-6 col-md-3"><div class="kpi"><i class="fa-solid fa-calendar"></i><strong><?= $nbEnt ?></strong><span>entretiens à venir</span></div></div>
        <div class="col-6 col-md-3"><div class="kpi"><i class="fa-solid fa-address-book"></i><strong><?= $nbCv ?></strong><span>CV dans la CVthèque</span></div></div>
    </div>

    <div class="row g-4">
        <div class="col-lg-7">
            <div class="card border-0 shadow-sm h-100">
                <div class="card-header bg-white d-flex justify-content-between align-items-center">
                    <h2 class="h5 mb-0"><i class="fa-solid fa-briefcase text-primary me-2"></i>Mes offres d'emploi</h2>
                    <a href="<?= url('recruteur/offres.php') ?>" class="small">Tout voir</a>
                </div>
                <ul class="list-group list-group-flush">
                    <?php foreach ($offres as $o): ?>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div><strong><?= e($o['titre']) ?></strong> <?= $o['active'] ? '' : '<span class="badge text-bg-secondary">Désactivée</span>' ?><br><small class="text-muted"><?= e($o['type_contrat']) ?> · <?= e($o['ville']) ?></small></div>
                        <div class="d-flex gap-1">
                            <a class="btn btn-sm btn-outline-primary" href="<?= url('recruteur/candidatures.php?offre=' . (int)$o['id']) ?>"><?= (int)$o['nb'] ?> candidature(s)</a>
                            <a class="btn btn-sm btn-outline-secondary" href="<?= url('recruteur/suggestions.php?offre=' . (int)$o['id']) ?>" title="Suggestions IA">🧠</a>
                        </div>
                    </li>
                    <?php endforeach; if (!$offres): ?>
                        <li class="list-group-item text-muted small">Aucune offre publiée. <a href="<?= url('recruteur/offre_form.php') ?>">Créer ma première offre</a></li>
                    <?php endif; ?>
                </ul>
            </div>
        </div>
        <div class="col-lg-5">
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-body">
                    <h2 class="h5"><i class="fa-solid fa-address-book text-primary me-2"></i>CVthèque</h2>
                    <p class="small text-muted">Recherchez parmi <?= $nbCv ?> professionnels de santé par poste, diplôme, expérience, salaire et ville.</p>
                    <a href="<?= url('recruteur/cvtheque.php') ?>" class="btn btn-primary btn-sm"><i class="fa-solid fa-magnifying-glass me-1"></i>Explorer la CVthèque</a>
                </div>
            </div>
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white"><h2 class="h5 mb-0"><i class="fa-solid fa-calendar-days text-primary me-2"></i>Prochains entretiens</h2></div>
                <ul class="list-group list-group-flush small">
                    <?php foreach ($prochains as $p): ?>
                        <li class="list-group-item d-flex justify-content-between"><span><strong><?= e($p['prenom'] . ' ' . $p['nom']) ?></strong><br><?= e($p['titre'] ?: '') ?></span><span class="text-end"><?= date_fr($p['date_debut']) ?><br><?= e(plage_horaire($p['date_debut'], $p['date_fin'])) ?> <?= statut_entretien_badge($p['statut']) ?></span></li>
                    <?php endforeach; if (!$prochains): ?><li class="list-group-item text-muted">Aucun entretien planifié.</li><?php endif; ?>
                </ul>
            </div>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
