<?php
/**
 * Création (ou mise à jour du mot de passe) d'un compte administrateur.
 * Usage : php database/create_admin.php admin@exemple.tn "MotDePasseSolide"
 */
if (PHP_SAPI !== 'cli') {
    exit("Script en ligne de commande uniquement.\n");
}
define('APP_ROOT', dirname(__DIR__));
date_default_timezone_set('Africa/Tunis');
$GLOBALS['config'] = require APP_ROOT . '/config/config.php';
require APP_ROOT . '/includes/db.php';

[$script, $email, $pass] = array_pad($argv, 3, null);
$email = mb_strtolower(trim((string)$email));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen((string)$pass) < 10) {
    exit("Usage : php database/create_admin.php email \"mot de passe (10 caractères minimum)\"\n");
}
$existing = db_one('SELECT id, type FROM utilisateurs WHERE email = ?', [$email]);
if ($existing && $existing['type'] !== 'admin') {
    exit("Cet email est déjà utilisé par un compte {$existing['type']}.\n");
}
$hash = password_hash($pass, PASSWORD_BCRYPT);
if ($existing) {
    db_exec('UPDATE utilisateurs SET mot_de_passe = ?, actif = 1 WHERE id = ?', [$hash, $existing['id']]);
    echo "Mot de passe administrateur mis à jour pour $email\n";
} else {
    db_exec("INSERT INTO utilisateurs (email, mot_de_passe, type) VALUES (?, ?, 'admin')", [$email, $hash]);
    echo "Compte administrateur créé : $email\n";
}
