<?php
/**
 * Routage : /chemin  →  pages/chemin.php
 *   /                    → pages/accueil.php
 *   /candidat            → pages/candidat/dashboard.php (idem recruteur, admin)
 *   /ancienne-page.php   → redirection 301 vers /ancienne-page (compatibilité)
 */

const ROUTE_ALIASES = [
    ''           => 'accueil',
    'index'      => 'accueil',
    'deconnexion' => 'logout',
    'candidat'   => 'candidat/dashboard',
    'recruteur'  => 'recruteur/dashboard',
    'admin'      => 'admin/dashboard',
];

function resolve_route(string $path): ?string
{
    $base = rtrim((string)cfg('base_url'), '/');
    if ($base !== '' && str_starts_with($path, $base)) {
        $path = substr($path, strlen($base));
    }
    $route = trim(rawurldecode($path), '/');

    if (str_ends_with($route, '.php')) {
        $clean = substr($route, 0, -4);
        $qs = $_SERVER['QUERY_STRING'] ?? '';
        if (resolve_route('/' . $clean) !== null) {
            header('Location: ' . url($clean === 'index' ? '' : $clean) . ($qs !== '' ? '?' . $qs : ''), true, 301);
            exit;
        }
        return null;
    }
    if (!preg_match('#^[a-z0-9_\-/]*$#', $route) || str_contains($route, '..')) {
        return null;
    }
    $route = ROUTE_ALIASES[$route] ?? $route;
    if ($route === '404') {
        return null;
    }
    $file = APP_ROOT . '/pages/' . $route . '.php';
    return is_file($file) ? $file : null;
}

/** Nom de la route courante (ex. 'candidat/cv') */
function current_route(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $base = rtrim((string)cfg('base_url'), '/');
    if ($base !== '' && str_starts_with($path, $base)) {
        $path = substr($path, strlen($base));
    }
    $r = trim($path, '/');
    return ROUTE_ALIASES[$r] ?? $r;
}
