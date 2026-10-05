<?php
declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__));
$GLOBALS['config'] = require APP_ROOT . '/config/config.php';

date_default_timezone_set('Africa/Tunis');
mb_internal_encoding('UTF-8');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('MEDSTAFFSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    session_start();
}

// En-têtes anti-cache : évite l'affichage résiduel du menu connecté après déconnexion
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

require_once APP_ROOT . '/includes/db.php';
require_once APP_ROOT . '/includes/data.php';
require_once APP_ROOT . '/includes/functions.php';
require_once APP_ROOT . '/includes/auth.php';
require_once APP_ROOT . '/includes/mailer.php';
