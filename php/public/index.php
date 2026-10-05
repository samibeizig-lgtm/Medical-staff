<?php
/**
 * Front controller : toutes les requêtes passent ici.
 * Les URL propres (/offres, /candidat/cv…) sont associées aux fichiers de pages/.
 */
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Serveur PHP intégré : laisser servir les fichiers statiques
if (PHP_SAPI === 'cli-server' && $path !== '/' && is_file(__DIR__ . $path)) {
    return false;
}

require dirname(__DIR__) . '/includes/bootstrap.php';
require APP_ROOT . '/includes/router.php';

$page = resolve_route($path);
if ($page === null) {
    http_response_code(404);
    $page = APP_ROOT . '/pages/404.php';
}
require $page;
