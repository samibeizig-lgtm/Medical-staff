<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require_role('candidat');
$me = current_candidat();
$cid = (int)$me['id'];
$errors = [];

if (is_post()) {
    csrf_check();
    $nom = input('nom');
    $prenom = input('prenom');
    if ($nom === '' || $prenom === '') {
        $errors[] = 'Le nom et le prénom sont obligatoires.';
    }
    $poste = input('poste_recherche');
    if ($poste !== '' && !in_array($poste, POSTES, true)) {
        $errors[] = 'Poste recherché invalide.';
    }
    $ville = input('ville');
    if ($ville !== '' && !in_array($ville, GOUVERNORATS, true)) {
        $errors[] = 'Ville invalide.';
    }
    $dispo = input('disponibilite');
    if ($dispo !== '' && !in_array($dispo, DISPONIBILITES, true)) {
        $dispo = '';
    }
    $photo = null;
    try {
        $photo = upload_photo($_FILES['photo'] ?? []);
    } catch (RuntimeException $ex) {
        $errors[] = $ex->getMessage();
    }

    if (!$errors) {
        $pdo = db();
        $pdo->beginTransaction();
        try {
            db_exec(
                'UPDATE candidats SET nom=?, prenom=?, date_naissance=?, lieu_naissance=?, telephone=?, adresse=?, ville=?, pays=?,
                 poste_recherche=?, salaire_souhaite=?, disponibilite=?, coordonnees_visibles=?, updated_at=NOW() WHERE id=?',
                [
                    $nom, $prenom, date_or_null(input('date_naissance')), input('lieu_naissance') ?: null,
                    input('telephone') ?: null, input('adresse') ?: null, $ville ?: null, input('pays') ?: 'Tunisie',
                    $poste ?: null, int_or_null(input('salaire_souhaite')), $dispo ?: null,
                    isset($_POST['coordonnees_visibles']) ? 1 : 0, $cid,
                ]
            );
            if ($photo) {
                if ($me['photo'] && is_file(APP_ROOT . '/uploads/photos/' . $me['photo'])) {
                    @unlink(APP_ROOT . '/uploads/photos/' . $me['photo']);
                }
                db_exec('UPDATE candidats SET photo=? WHERE id=?', [$photo, $cid]);
            }

            // Diplômes
            db_exec('DELETE FROM diplomes WHERE candidat_id=?', [$cid]);
            foreach ((array)($_POST['diplomes'] ?? []) as $d) {
                $intitule = trim((string)($d['intitule'] ?? ''));
                if ($intitule === '') continue;
                $mention = in_array($d['mention'] ?? '', MENTIONS, true) ? $d['mention'] : null;
                db_exec('INSERT INTO diplomes (candidat_id, intitule, etablissement, date_obtention, mention) VALUES (?,?,?,?,?)',
                    [$cid, mb_substr($intitule, 0, 190), trim((string)($d['etablissement'] ?? '')) ?: null, date_or_null($d['date_obtention'] ?? ''), $mention]);
            }
            // Expériences
            db_exec('DELETE FROM experiences WHERE candidat_id=?', [$cid]);
            foreach ((array)($_POST['experiences'] ?? []) as $x) {
                $p = trim((string)($x['poste'] ?? ''));
                if ($p === '') continue;
                $actuel = !empty($x['poste_actuel']) ? 1 : 0;
                db_exec('INSERT INTO experiences (candidat_id, poste, etablissement, date_debut, date_fin, poste_actuel, description) VALUES (?,?,?,?,?,?,?)',
                    [$cid, mb_substr($p, 0, 150), trim((string)($x['etablissement'] ?? '')) ?: null, date_or_null($x['date_debut'] ?? ''),
                     $actuel ? null : date_or_null($x['date_fin'] ?? ''), $actuel, trim((string)($x['description'] ?? '')) ?: null]);
            }
            // Compétences (tags séparés par des virgules)
            db_exec('DELETE FROM competences WHERE candidat_id=?', [$cid]);
            $comps = array_unique(array_filter(array_map('trim', explode(',', (string)($_POST['competences'] ?? '')))));
            foreach (array_slice($comps, 0, 40) as $k) {
                db_exec('INSERT INTO competences (candidat_id, nom) VALUES (?,?)', [$cid, mb_substr($k, 0, 120)]);
            }
            // Langues
            db_exec('DELETE FROM langues WHERE candidat_id=?', [$cid]);
            $seen = [];
            foreach ((array)($_POST['langues'] ?? []) as $l) {
                $lg = $l['langue'] ?? '';
                if (!in_array($lg, LANGUES, true) || isset($seen[$lg])) continue;
                $seen[$lg] = true;
                $niv = in_array($l['niveau'] ?? '', NIVEAUX_LANGUE, true) ? $l['niveau'] : 'Intermédiaire';
                db_exec('INSERT INTO langues (candidat_id, langue, niveau) VALUES (?,?,?)', [$cid, $lg, $niv]);
            }
            $pdo->commit();
            flash('success', 'Votre CV a été enregistré.');
            redirect('candidat/dashboard.php');
        } catch (Throwable $t) {
            $pdo->rollBack();
            throw $t;
        }
    }
}

$c = candidat_full($cid);
if (is_post()) {
    // Ré-affichage des valeurs saisies en cas d'erreur
    foreach (['nom','prenom','date_naissance','lieu_naissance','telephone','adresse','ville','pays','poste_recherche','salaire_souhaite','disponibilite'] as $k) {
        $c[$k] = input($k);
    }
}
$pageTitle = 'Mon CV';
require APP_ROOT . '/includes/header.php';

function diplome_row($i, array $d = []): string
{
    return '<div class="repeater-item card card-body mb-2"><div class="row g-2">'
        . '<div class="col-md-4"><label class="form-label small">Intitulé</label><input class="form-control" list="dl-diplomes" name="diplomes[' . $i . '][intitule]" value="' . e($d['intitule'] ?? '') . '"></div>'
        . '<div class="col-md-3"><label class="form-label small">Établissement</label><input class="form-control" name="diplomes[' . $i . '][etablissement]" value="' . e($d['etablissement'] ?? '') . '"></div>'
        . '<div class="col-md-2"><label class="form-label small">Date d\'obtention</label><input type="date" class="form-control" name="diplomes[' . $i . '][date_obtention]" value="' . e($d['date_obtention'] ?? '') . '"></div>'
        . '<div class="col-md-2"><label class="form-label small">Mention</label><select class="form-select" name="diplomes[' . $i . '][mention]">' . options(MENTIONS, $d['mention'] ?? '', '—') . '</select></div>'
        . '<div class="col-md-1 d-flex align-items-end"><button type="button" class="btn btn-outline-danger w-100 repeater-remove" title="Supprimer"><i class="fa-solid fa-trash"></i></button></div>'
        . '</div></div>';
}
function experience_row($i, array $x = []): string
{
    $actuel = !empty($x['poste_actuel']);
    return '<div class="repeater-item card card-body mb-2"><div class="row g-2">'
        . '<div class="col-md-4"><label class="form-label small">Poste</label><input class="form-control" list="dl-postes" name="experiences[' . $i . '][poste]" value="' . e($x['poste'] ?? '') . '"></div>'
        . '<div class="col-md-4"><label class="form-label small">Établissement</label><input class="form-control" name="experiences[' . $i . '][etablissement]" value="' . e($x['etablissement'] ?? '') . '"></div>'
        . '<div class="col-md-2"><label class="form-label small">Début</label><input type="date" class="form-control" name="experiences[' . $i . '][date_debut]" value="' . e($x['date_debut'] ?? '') . '"></div>'
        . '<div class="col-md-2"><label class="form-label small">Fin</label><input type="date" class="form-control exp-fin" name="experiences[' . $i . '][date_fin]" value="' . e($x['date_fin'] ?? '') . '"' . ($actuel ? ' disabled' : '') . '></div>'
        . '<div class="col-md-10"><label class="form-label small">Description</label><textarea class="form-control" rows="2" name="experiences[' . $i . '][description]">' . e($x['description'] ?? '') . '</textarea></div>'
        . '<div class="col-md-2 d-flex flex-column justify-content-end gap-2"><div class="form-check"><input class="form-check-input exp-actuel" type="checkbox" value="1" name="experiences[' . $i . '][poste_actuel]" id="act' . $i . '"' . ($actuel ? ' checked' : '') . '><label class="form-check-label small" for="act' . $i . '">Poste actuel</label></div>'
        . '<button type="button" class="btn btn-outline-danger repeater-remove"><i class="fa-solid fa-trash me-1"></i>Supprimer</button></div>'
        . '</div></div>';
}
function langue_row($i, array $l = []): string
{
    return '<div class="repeater-item row g-2 mb-2">'
        . '<div class="col-5"><select class="form-select" name="langues[' . $i . '][langue]">' . options(LANGUES, $l['langue'] ?? '', 'Langue') . '</select></div>'
        . '<div class="col-5"><select class="form-select" name="langues[' . $i . '][niveau]">' . options(NIVEAUX_LANGUE, $l['niveau'] ?? '', 'Niveau') . '</select></div>'
        . '<div class="col-2"><button type="button" class="btn btn-outline-danger w-100 repeater-remove"><i class="fa-solid fa-trash"></i></button></div>'
        . '</div>';
}
$competencesCsv = implode(', ', array_column($c['competences'], 'nom'));
?>
<div class="container py-4">
    <h1 class="h3 mb-1">Mon CV</h1>
    <p class="text-muted">Un CV complet (poste recherché + au moins un diplôme) est nécessaire pour postuler.</p>
    <?php foreach ($errors as $err): ?><div class="alert alert-danger py-2"><?= e($err) ?></div><?php endforeach; ?>

    <form method="post" enctype="multipart/form-data" class="cv-form">
        <?= csrf_field() ?>
        <datalist id="dl-diplomes"><?= options(DIPLOMES) ?></datalist>
        <datalist id="dl-postes"><?= options(POSTES) ?></datalist>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
            <h2 class="h5 section-label"><i class="fa-solid fa-id-card"></i>État civil</h2>
            <div class="row g-3">
                <div class="col-md-3 text-center">
                    <img src="<?= e(photo_url($c['photo'])) ?>" id="photo-preview" class="profile-photo mb-2" alt="Photo">
                    <input type="file" name="photo" id="photo-input" class="form-control form-control-sm" accept="image/jpeg,image/png,image/gif">
                    <div class="form-text">JPG, PNG ou GIF – 2 Mo max.</div>
                </div>
                <div class="col-md-9">
                    <div class="row g-3">
                        <div class="col-md-6"><label class="form-label">Nom *</label><input name="nom" class="form-control" value="<?= e($c['nom']) ?>" required></div>
                        <div class="col-md-6"><label class="form-label">Prénom *</label><input name="prenom" class="form-control" value="<?= e($c['prenom']) ?>" required></div>
                        <div class="col-md-4"><label class="form-label">Date de naissance</label><input type="date" name="date_naissance" class="form-control" value="<?= e($c['date_naissance']) ?>"></div>
                        <div class="col-md-4"><label class="form-label">Lieu de naissance</label><input name="lieu_naissance" class="form-control" value="<?= e($c['lieu_naissance']) ?>"></div>
                        <div class="col-md-4"><label class="form-label">Téléphone</label><input type="tel" name="telephone" class="form-control" placeholder="+216 ..." value="<?= e($c['telephone']) ?>"></div>
                    </div>
                </div>
            </div>
        </div></div>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
            <h2 class="h5 section-label"><i class="fa-solid fa-location-dot"></i>Adresse</h2>
            <div class="row g-3">
                <div class="col-md-6"><label class="form-label">Adresse</label><input name="adresse" class="form-control" placeholder="N°, rue, cité…" value="<?= e($c['adresse']) ?>"></div>
                <div class="col-md-3"><label class="form-label">Ville (gouvernorat)</label><select name="ville" class="form-select"><?= options(GOUVERNORATS, $c['ville'], 'Choisir…') ?></select></div>
                <div class="col-md-3"><label class="form-label">Pays</label><input name="pays" class="form-control" value="<?= e($c['pays'] ?: 'Tunisie') ?>"></div>
            </div>
        </div></div>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
            <h2 class="h5 section-label"><i class="fa-solid fa-bullseye"></i>Poste recherché et prétentions</h2>
            <div class="row g-3">
                <div class="col-md-6"><label class="form-label">Poste recherché *</label><select name="poste_recherche" class="form-select"><?= options(POSTES, $c['poste_recherche'], 'Choisir un métier…') ?></select></div>
                <div class="col-md-3"><label class="form-label">Salaire minimum souhaité (TND/mois)</label><input type="number" min="0" step="50" name="salaire_souhaite" class="form-control" value="<?= e($c['salaire_souhaite']) ?>"></div>
                <div class="col-md-3"><label class="form-label">Disponibilité</label><select name="disponibilite" class="form-select"><?= options(DISPONIBILITES, $c['disponibilite'], 'Choisir…') ?></select></div>
            </div>
        </div></div>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
            <h2 class="h5 section-label"><i class="fa-solid fa-graduation-cap"></i>Diplômes *</h2>
            <div class="repeater" data-template="tpl-diplome">
                <?php $i = 0; foreach ($c['diplomes'] ?: [[]] as $d) echo diplome_row($i++, $d); ?>
            </div>
            <button type="button" class="btn btn-sm btn-outline-primary repeater-add" data-target="tpl-diplome"><i class="fa-solid fa-plus me-1"></i>Ajouter un diplôme</button>
            <template id="tpl-diplome"><?= diplome_row('__i__') ?></template>
        </div></div>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
            <h2 class="h5 section-label"><i class="fa-solid fa-briefcase"></i>Expériences professionnelles</h2>
            <div class="repeater" data-template="tpl-experience">
                <?php $i = 0; foreach ($c['experiences'] as $x) echo experience_row($i++, $x); ?>
            </div>
            <button type="button" class="btn btn-sm btn-outline-primary repeater-add" data-target="tpl-experience"><i class="fa-solid fa-plus me-1"></i>Ajouter une expérience</button>
            <template id="tpl-experience"><?= experience_row('__i__') ?></template>
        </div></div>

        <div class="row g-4 mb-4">
            <div class="col-lg-7">
                <div class="card border-0 shadow-sm h-100"><div class="card-body p-4">
                    <h2 class="h5 section-label"><i class="fa-solid fa-star"></i>Compétences</h2>
                    <div class="tag-input" data-name="competences" data-source="<?= url('api/competences.php') ?>">
                        <input type="hidden" name="competences" value="<?= e($competencesCsv) ?>">
                    </div>
                    <div class="form-text">Tapez une compétence puis Entrée. Des suggestions paramédicales s'affichent automatiquement.</div>
                </div></div>
            </div>
            <div class="col-lg-5">
                <div class="card border-0 shadow-sm h-100"><div class="card-body p-4">
                    <h2 class="h5 section-label"><i class="fa-solid fa-language"></i>Langues</h2>
                    <div class="repeater" data-template="tpl-langue">
                        <?php $i = 0; foreach ($c['langues'] ?: [['langue' => 'Arabe', 'niveau' => 'Langue maternelle'], ['langue' => 'Français', 'niveau' => 'Courant']] as $l) echo langue_row($i++, $l); ?>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-primary repeater-add" data-target="tpl-langue"><i class="fa-solid fa-plus me-1"></i>Ajouter une langue</button>
                    <template id="tpl-langue"><?= langue_row('__i__') ?></template>
                </div></div>
            </div>
        </div>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
            <h2 class="h5 section-label"><i class="fa-solid fa-user-shield"></i>Confidentialité</h2>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" role="switch" id="coord" name="coordonnees_visibles" value="1" <?= $c['coordonnees_visibles'] ? 'checked' : '' ?>>
                <label class="form-check-label" for="coord">Rendre mes coordonnées (email, téléphone, adresse) visibles aux recruteurs abonnés</label>
            </div>
            <div class="form-text">Dans tous les cas, votre identité n'est jamais visible par les simples visiteurs.</div>
        </div></div>

        <div class="d-flex gap-2 justify-content-end">
            <a href="<?= url('candidat/dashboard.php') ?>" class="btn btn-light">Annuler</a>
            <button class="btn btn-primary btn-lg"><i class="fa-solid fa-floppy-disk me-1"></i>Enregistrer mon CV</button>
        </div>
    </form>
</div>
<?php
$extraScripts = '<script src="' . url('assets/js/tags.js') . '"></script>';
require APP_ROOT . '/includes/footer.php';
