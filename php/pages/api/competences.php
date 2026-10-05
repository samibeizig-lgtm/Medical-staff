<?php
defined('APP_ROOT') || exit;
require APP_ROOT . '/includes/matching.php';

$q = normalize_text((string)($_GET['q'] ?? ''));
$pool = COMPETENCES_PARAMEDICALES;
// Enrichissement avec les compétences déjà saisies sur la plateforme
foreach (db_all('SELECT nom, COUNT(*) n FROM competences GROUP BY nom ORDER BY n DESC LIMIT 200') as $row) {
    $pool[] = $row['nom'];
}
$pool = array_values(array_unique($pool));
$out = [];
foreach ($pool as $c) {
    $n = normalize_text($c);
    if ($q === '' || str_contains($n, trim($q))) {
        $out[] = ['v' => $c, 's' => ($q !== '' && str_starts_with($n, trim($q))) ? 0 : 1];
    }
}
usort($out, fn($a, $b) => [$a['s'], $a['v']] <=> [$b['s'], $b['v']]);
json_response(array_slice(array_column($out, 'v'), 0, 10));
