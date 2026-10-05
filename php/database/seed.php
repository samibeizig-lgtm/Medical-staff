<?php
/**
 * Données de démonstration : php database/seed.php
 * Comptes créés (mot de passe : demo1234)
 *   - candidat : amira@demo.tn, youssef@demo.tn, salma@demo.tn, mehdi@demo.tn, ines@demo.tn
 *   - établissement : clinique@demo.tn (abonné), hopital@demo.tn (non abonné)
 *   - administrateur : admin@demo.tn
 */
require dirname(__DIR__) . '/includes/db.php';
$GLOBALS['config'] = require dirname(__DIR__) . '/config/config.php';
define('APP_ROOT', dirname(__DIR__));
date_default_timezone_set('Africa/Tunis');
define('PUBLIC_ROOT', APP_ROOT . '/public');
require APP_ROOT . '/includes/data.php';
require APP_ROOT . '/includes/functions.php';
require APP_ROOT . '/includes/personality.php';

$pdo = db();
$pass = password_hash('demo1234', PASSWORD_BCRYPT);

function user(string $email, string $type, string $pass): int
{
    db_exec('DELETE FROM utilisateurs WHERE email = ?', [$email]);
    db_exec('INSERT INTO utilisateurs (email, mot_de_passe, type) VALUES (?,?,?)', [$email, $pass, $type]);
    return (int)db()->lastInsertId();
}

// Administrateur
user('admin@demo.tn', 'admin', $pass);

// Établissements
$recs = [];
foreach ([
    ['clinique@demo.tn', 'Clinique Les Oliviers', 'Clinique privée', 'Sousse', 'Avenue Taïeb Mhiri', 'Karim', 'Mansour', 'Directeur', true],
    ['hopital@demo.tn', 'Polyclinique El Manar', 'Polyclinique', 'Tunis', 'Rue du Lac Léman, Les Berges du Lac', 'Leila', 'Ben Salah', 'DRH', false],
] as [$email, $nom, $type, $ville, $adr, $prenomC, $nomC, $fonction, $abonne]) {
    $uid = user($email, 'recruteur', $pass);
    db_exec('INSERT INTO recruteurs (utilisateur_id, nom_etablissement, type_etablissement, adresse, ville, telephone, contact_nom, contact_prenom, contact_fonction) VALUES (?,?,?,?,?,?,?,?,?)',
        [$uid, $nom, $type, $adr, $ville, '+216 73 000 000', $nomC, $prenomC, $fonction]);
    $rid = (int)$pdo->lastInsertId();
    $recs[] = $rid;
    if ($abonne) {
        db_exec("INSERT INTO abonnements (recruteur_id, montant, date_debut, date_fin, statut, reference_paiement) VALUES (?, 1000, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'actif', 'MS-DEMO-0001')", [$rid]);
    }
}

// Offres
$offres = [
    [$recs[0], 'Sage-femme', 'CDI', "Notre maternité recherche une sage-femme pour renforcer son équipe (salle de naissance et suites de couches). Gardes rémunérées, transport assuré.", 'Sousse', 1200, 1700, 'Licence en sciences obstétricales (sage-femme)', 2, 'Accouchement eutocique, Suivi de grossesse, Soins néonataux, Allaitement maternel'],
    [$recs[0], 'Technicien(ne) supérieur(e) en anesthésie-réanimation', 'CDI', "Bloc opératoire multidisciplinaire (6 salles). Vous assurez la préparation et la surveillance de l'anesthésie en collaboration avec les médecins anesthésistes.", 'Sousse', 1500, 2200, 'Licence en anesthésie-réanimation', 3, 'Anesthésie générale, Anesthésie locorégionale, Intubation, Monitorage hémodynamique, Bloc opératoire'],
    [$recs[0], 'Infirmier(ère) polyvalent(e)', 'CDD', "Poste en service de médecine/chirurgie. Jeunes diplômés bienvenus, accompagnement par un tuteur pendant 3 mois.", 'Monastir', 1000, 1300, 'Licence en sciences infirmières', 0, 'Soins infirmiers généraux, Pose de perfusion, Prélèvements sanguins, Hygiène hospitalière'],
    [$recs[1], 'Infirmier(ère) aux urgences', 'CDI', "Service d'urgences 24h/24. Nous recherchons un(e) infirmier(ère) réactif(ve), à l'aise avec le triage et les gestes d'urgence.", 'Tunis', 1300, 1900, 'Licence en sciences infirmières', 2, "Triage aux urgences, Gestes d'urgence (AFGSU), Réanimation cardio-pulmonaire, Électrocardiogramme (ECG)"],
    [$recs[1], 'Technicien(ne) de laboratoire / biologie médicale', 'Stage', "Stage de 6 mois au sein de notre laboratoire d'analyses. Possibilité d'embauche.", 'Tunis', 500, 700, 'Licence en biologie médicale / analyses', 0, 'Analyses biochimiques, Hématologie, Microbiologie'],
];
$offreIds = [];
foreach ($offres as $o) {
    db_exec('INSERT INTO offres (recruteur_id, titre, type_contrat, description, ville, salaire_min, salaire_max, diplome_requis, experience_min, competences_requises, date_limite) VALUES (?,?,?,?,?,?,?,?,?,?, DATE_ADD(CURDATE(), INTERVAL 60 DAY))', $o);
    $offreIds[] = (int)$pdo->lastInsertId();
}

// Candidats
$cands = [
    ['amira@demo.tn', 'Ben Ali', 'Amira', 'Sage-femme', 'Sfax', 1400, 'Sous 1 mois',
        [['Licence en sciences obstétricales (sage-femme)', 'ESSS Sfax', '2018-07-01', 'Bien']],
        [['Sage-femme', 'Clinique El Bassatine', '2018-10-01', null, 1, 'Salle de naissance, suivi prénatal.']],
        ['Accouchement eutocique', 'Suivi de grossesse', 'Soins néonataux', 'Allaitement maternel', 'Échographie obstétricale'], [5, 5, 4, 4, 5]],
    ['youssef@demo.tn', 'Trabelsi', 'Youssef', 'Technicien(ne) supérieur(e) en anesthésie-réanimation', 'Sousse', 1800, 'Immédiate',
        [['Licence en anesthésie-réanimation', 'ESSTS Sousse', '2016-07-01', 'Très bien']],
        [['Technicien anesthésiste', 'Hôpital Sahloul', '2016-09-01', '2021-12-31', 0, 'Bloc de chirurgie générale.'], ['Technicien anesthésiste', 'Clinique Essalema', '2022-01-15', null, 1, 'Bloc orthopédie et urgences.']],
        ['Anesthésie générale', 'Intubation', 'Ventilation mécanique', 'Monitorage hémodynamique'], [4, 5, 3, 4, 5]],
    ['salma@demo.tn', 'Gharbi', 'Salma', 'Sage-femme', 'Sousse', 1100, 'Immédiate',
        [['Licence en sciences obstétricales (sage-femme)', 'ESSTS Monastir', '2023-07-01', 'Assez bien']],
        [['Sage-femme stagiaire', 'CHU Farhat Hached', '2023-01-01', '2023-06-30', 0, 'Stage de fin d\'études.']],
        ['Accouchement eutocique', 'Soins néonataux'], [4, 4, 4, 5, 3]],
    ['mehdi@demo.tn', 'Jlassi', 'Mehdi', 'Infirmier(ère) aux urgences', 'Tunis', 1600, 'Sous 15 jours',
        [['Licence en sciences infirmières', 'ISSTS Tunis', '2017-07-01', 'Bien']],
        [['Infirmier urgentiste', 'Hôpital Charles Nicolle', '2017-09-01', null, 1, 'Accueil, triage et soins d\'urgence.']],
        ['Triage aux urgences', "Gestes d'urgence (AFGSU)", 'Réanimation cardio-pulmonaire', 'Pose de perfusion'], [3, 4, 5, 3, 5]],
    ['ines@demo.tn', 'Hammami', 'Inès', 'Infirmier(ère) polyvalent(e)', 'Monastir', 1000, 'Immédiate',
        [['Licence en sciences infirmières', 'ISSTS Monastir', '2024-07-01', 'Très bien']], [],
        ['Soins infirmiers généraux', 'Prélèvements sanguins', 'Hygiène hospitalière'], null],
];
$candIds = [];
foreach ($cands as [$email, $nom, $prenom, $poste, $ville, $sal, $dispo, $dips, $exps, $comps, $test]) {
    $uid = user($email, 'candidat', $pass);
    db_exec('INSERT INTO candidats (utilisateur_id, nom, prenom, date_naissance, lieu_naissance, telephone, adresse, ville, pays, poste_recherche, salaire_souhaite, disponibilite, coordonnees_visibles, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,NOW())',
        [$uid, $nom, $prenom, '1994-03-12', $ville, '+216 20 000 000', 'Rue de la République', $ville, 'Tunisie', $poste, $sal, $dispo]);
    $cid = (int)$pdo->lastInsertId();
    $candIds[] = $cid;
    foreach ($dips as $d) db_exec('INSERT INTO diplomes (candidat_id, intitule, etablissement, date_obtention, mention) VALUES (?,?,?,?,?)', [$cid, ...$d]);
    foreach ($exps as $x) db_exec('INSERT INTO experiences (candidat_id, poste, etablissement, date_debut, date_fin, poste_actuel, description) VALUES (?,?,?,?,?,?,?)', [$cid, ...$x]);
    foreach ($comps as $k) db_exec('INSERT INTO competences (candidat_id, nom) VALUES (?,?)', [$cid, $k]);
    db_exec("INSERT INTO langues (candidat_id, langue, niveau) VALUES (?, 'Arabe', 'Langue maternelle'), (?, 'Français', 'Courant')", [$cid, $cid]);
    if ($test) {
        // Réponses simulées : chaque dimension reçoit la note indiquée (items inversés compris)
        $dims = array_keys(DIMENSIONS);
        $answers = [];
        foreach (QUESTIONS as $i => $q) {
            $v = $test[array_search($q['d'], $dims)] ?? 4;
            $answers[$i] = !empty($q['r']) ? 6 - $v : $v;
        }
        $s = personality_scores($answers);
        db_exec('INSERT INTO tests_personnalite (candidat_id, ouverture, conscience, extraversion, agreabilite, stabilite, adaptation_medicale, portrait, reponses) VALUES (?,?,?,?,?,?,?,?,?)',
            [$cid, $s['ouverture'], $s['conscience'], $s['extraversion'], $s['agreabilite'], $s['stabilite'], $s['adaptation_medicale'], personality_portrait($s, $prenom), json_encode($answers)]);
    }
}

// Candidatures + un entretien
db_exec('INSERT INTO candidatures (offre_id, candidat_id) VALUES (?,?), (?,?), (?,?)', [$offreIds[0], $candIds[0], $offreIds[1], $candIds[1], $offreIds[0], $candIds[2]]);
$d = new DateTime('next monday 10:00');
db_exec("INSERT INTO entretiens (recruteur_id, candidat_id, offre_id, date_debut, date_fin, lieu, contact) VALUES (?,?,?,?,?,?,?)",
    [$recs[0], $candIds[1], $offreIds[1], $d->format('Y-m-d H:i:s'), $d->modify('+30 minutes')->format('Y-m-d H:i:s'), 'Clinique Les Oliviers, Avenue Taïeb Mhiri, Sousse', 'Karim Mansour – +216 73 000 000']);


// Étalement des dates d'inscription sur les derniers mois (statistiques de l'administration)
$decalages = ['amira@demo.tn' => 140, 'youssef@demo.tn' => 100, 'salma@demo.tn' => 65, 'mehdi@demo.tn' => 33, 'clinique@demo.tn' => 120, 'hopital@demo.tn' => 40];
foreach ($decalages as $email => $jours) {
    db_exec('UPDATE utilisateurs SET created_at = DATE_SUB(NOW(), INTERVAL ? DAY) WHERE email = ?', [$jours, $email]);
}

echo "Données de démonstration insérées. Mot de passe de tous les comptes : demo1234\n";
