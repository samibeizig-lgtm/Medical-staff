<?php
/** Outils communs de l'espace administrateur. */

function admin_nav(string $active): string
{
    $items = [
        'dashboard'    => ['fa-gauge', 'Tableau de bord'],
        'utilisateurs' => ['fa-users', 'Utilisateurs'],
        'offres'       => ['fa-briefcase', 'Offres'],
        'abonnements'  => ['fa-credit-card', 'Abonnements'],
    ];
    $html = '<ul class="nav nav-pills admin-nav mb-4 flex-nowrap overflow-auto">';
    foreach ($items as $k => [$icon, $label]) {
        $html .= '<li class="nav-item"><a class="nav-link text-nowrap' . ($k === $active ? ' active' : '') . '" href="' . url('admin/' . $k) . '"><i class="fa-solid ' . $icon . ' me-1"></i>' . $label . '</a></li>';
    }
    return $html . '</ul>';
}

/** Journalise une action d'administration dans storage/admin.log */
function admin_log(string $action): void
{
    $dir = APP_ROOT . '/storage';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $u = current_user();
    @file_put_contents($dir . '/admin.log', sprintf("[%s] %s : %s\n", date('Y-m-d H:i:s'), $u['email'] ?? '?', $action), FILE_APPEND);
}

/** Libellé lisible d'un utilisateur (nom ou établissement) */
function admin_user_label(array $u): string
{
    if ($u['type'] === 'candidat') {
        return trim(($u['prenom'] ?? '') . ' ' . ($u['nom'] ?? ''));
    }
    if ($u['type'] === 'recruteur') {
        return (string)($u['nom_etablissement'] ?? '');
    }
    return 'Administrateur';
}
