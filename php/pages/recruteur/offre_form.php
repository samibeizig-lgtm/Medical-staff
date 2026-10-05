<?php
defined('APP_ROOT') || exit;
require_role('recruteur');
$r = current_recruteur();
$rid = (int)$r['id'];
require_abonnement($r);

$id = (int)($_GET['id'] ?? 0);
$o = $id ? db_one('SELECT * FROM offres WHERE id = ? AND recruteur_id = ?', [$id, $rid]) : null;
if ($id && !$o) {
    http_response_code(404);
    exit('Offre introuvable.');
}
$o = $o ?: ['titre' => '', 'type_contrat' => 'CDI', 'description' => '', 'ville' => $r['ville'], 'salaire_min' => '', 'salaire_max' => '',
            'diplome_requis' => '', 'experience_min' => 0, 'date_limite' => '', 'competences_requises' => ''];
$errors = [];

if (is_post()) {
    csrf_check();
    $d = [
        'titre'          => input('titre'),
        'type_contrat'   => input('type_contrat'),
        'description'    => input('description'),
        'ville'          => input('ville'),
        'salaire_min'    => int_or_null(input('salaire_min')),
        'salaire_max'    => int_or_null(input('salaire_max')),
        'diplome_requis' => input('diplome_requis'),
        'experience_min' => min(40, (int)input('experience_min', 0)),
        'date_limite'    => date_or_null(input('date_limite')),
        'competences_requises' => implode(', ', array_slice(array_unique(array_filter(array_map('trim', explode(',', (string)input('competences_requises'))))), 0, 30)),
    ];
    if (!in_array($d['titre'], POSTES, true)) $errors[] = 'Veuillez choisir un titre de poste.';
    if (!in_array($d['type_contrat'], TYPES_CONTRAT, true)) $errors[] = 'Type de contrat invalide.';
    if (!in_array($d['ville'], GOUVERNORATS, true)) $errors[] = 'Veuillez choisir un lieu.';
    if (mb_strlen($d['description']) < 20) $errors[] = 'La description doit contenir au moins 20 caractères.';
    if ($d['salaire_min'] && $d['salaire_max'] && $d['salaire_min'] > $d['salaire_max']) $errors[] = 'Le salaire minimum doit être inférieur au salaire maximum.';
    if ($d['date_limite'] && $d['date_limite'] < date('Y-m-d')) $errors[] = 'La date limite doit être dans le futur.';

    if (!$errors) {
        $params = [$d['titre'], $d['type_contrat'], $d['description'], $d['ville'], $d['salaire_min'], $d['salaire_max'],
                   $d['diplome_requis'] ?: null, $d['experience_min'], $d['date_limite'], $d['competences_requises'] ?: null];
        if ($id) {
            db_exec('UPDATE offres SET titre=?, type_contrat=?, description=?, ville=?, salaire_min=?, salaire_max=?, diplome_requis=?,
                     experience_min=?, date_limite=?, competences_requises=?, updated_at=NOW() WHERE id=? AND recruteur_id=?', [...$params, $id, $rid]);
            flash('success', 'Offre mise à jour.');
        } else {
            db_exec('INSERT INTO offres (titre, type_contrat, description, ville, salaire_min, salaire_max, diplome_requis, experience_min,
                     date_limite, competences_requises, recruteur_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [...$params, $rid]);
            flash('success', 'Offre publiée ! Consultez les suggestions IA pour trouver rapidement des candidats.');
        }
        redirect('recruteur/offres');
    }
    $o = array_merge($o, $d);
}
$pageTitle = $id ? 'Modifier l\'offre' : 'Nouvelle offre';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <div class="row justify-content-center">
        <div class="col-lg-9">
            <h1 class="h3 mb-3"><?= $id ? 'Modifier l\'offre' : 'Publier une nouvelle offre' ?></h1>
            <?php foreach ($errors as $err): ?><div class="alert alert-danger py-2"><?= e($err) ?></div><?php endforeach; ?>
            <form method="post" class="card border-0 shadow-sm">
                <div class="card-body p-4">
                    <?= csrf_field() ?>
                    <div class="row g-3">
                        <div class="col-md-8"><label class="form-label">Titre du poste *</label><select name="titre" class="form-select" required><?= options(POSTES, $o['titre'], 'Choisir un métier…') ?></select></div>
                        <div class="col-md-4"><label class="form-label">Type de contrat *</label><select name="type_contrat" class="form-select"><?= options(TYPES_CONTRAT, $o['type_contrat']) ?></select></div>
                        <div class="col-12"><label class="form-label">Description du poste *</label><textarea name="description" rows="6" class="form-control" required placeholder="Missions, service, horaires, avantages…"><?= e($o['description']) ?></textarea></div>
                        <div class="col-md-4"><label class="form-label">Lieu (gouvernorat) *</label><select name="ville" class="form-select"><?= options(GOUVERNORATS, $o['ville'], 'Choisir…') ?></select></div>
                        <div class="col-md-4"><label class="form-label">Salaire min. (TND/mois)</label><input type="number" min="0" step="50" name="salaire_min" class="form-control" value="<?= e($o['salaire_min']) ?>"></div>
                        <div class="col-md-4"><label class="form-label">Salaire max. (TND/mois)</label><input type="number" min="0" step="50" name="salaire_max" class="form-control" value="<?= e($o['salaire_max']) ?>"></div>
                        <div class="col-md-6"><label class="form-label">Diplôme requis</label><input name="diplome_requis" list="dl-diplomes" class="form-control" value="<?= e($o['diplome_requis']) ?>"><datalist id="dl-diplomes"><?= options(DIPLOMES) ?></datalist></div>
                        <div class="col-md-3"><label class="form-label">Expérience min. (ans)</label><input type="number" min="0" max="40" name="experience_min" class="form-control" value="<?= e($o['experience_min']) ?>"></div>
                        <div class="col-md-3"><label class="form-label">Date limite</label><input type="date" name="date_limite" class="form-control" value="<?= e($o['date_limite']) ?>" min="<?= date('Y-m-d') ?>"></div>
                        <div class="col-12">
                            <label class="form-label">Compétences requises</label>
                            <div class="tag-input" data-name="competences_requises" data-source="<?= url('api/competences') ?>">
                                <input type="hidden" name="competences_requises" value="<?= e($o['competences_requises']) ?>">
                            </div>
                            <div class="form-text">Tapez puis Entrée pour ajouter. Ces compétences comptent pour 45 % du score de matching IA.</div>
                        </div>
                    </div>
                </div>
                <div class="card-footer bg-white text-end p-3">
                    <a href="<?= url('recruteur/offres') ?>" class="btn btn-light">Annuler</a>
                    <button class="btn btn-primary"><i class="fa-solid fa-floppy-disk me-1"></i><?= $id ? 'Enregistrer' : 'Publier l\'offre' ?></button>
                </div>
            </form>
        </div>
    </div>
</div>
<?php
$extraScripts = '<script src="' . url('assets/js/tags.js') . '"></script>';
require APP_ROOT . '/includes/footer.php';
