<?php

function e($v): string
{
    return htmlspecialchars((string)($v ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function cfg(string $key)
{
    return $GLOBALS['config'][$key] ?? null;
}

function url(string $path = ''): string
{
    return rtrim((string)cfg('base_url'), '/') . '/' . ltrim($path, '/');
}

function absolute_url(string $path = ''): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $scheme . '://' . $host . url($path);
}

function redirect(string $path): never
{
    header('Location: ' . (preg_match('#^https?://#', $path) ? $path : url($path)));
    exit;
}

function is_post(): bool
{
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
}

/* ---------- CSRF ---------- */
function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="_csrf" value="' . e(csrf_token()) . '">';
}

function csrf_check(): void
{
    $t = $_POST['_csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($t) || !hash_equals(csrf_token(), $t)) {
        http_response_code(419);
        exit('Session expirée ou requête invalide. Veuillez recharger la page.');
    }
}

/* ---------- Messages flash ---------- */
function flash(string $type, string $message): void
{
    $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
}

function flashes(): array
{
    $f = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $f;
}

/* ---------- Formulaires ---------- */
function options(array $items, $selected = null, string $placeholder = ''): string
{
    $html = $placeholder !== '' ? '<option value="">' . e($placeholder) . '</option>' : '';
    foreach ($items as $k => $label) {
        $value = is_int($k) ? $label : $k;
        $sel = ((string)$selected === (string)$value) ? ' selected' : '';
        $html .= '<option value="' . e($value) . '"' . $sel . '>' . e($label) . '</option>';
    }
    return $html;
}

function input(string $key, $default = '')
{
    $v = $_POST[$key] ?? $_GET[$key] ?? $default;
    return is_string($v) ? trim($v) : $v;
}

function int_or_null($v): ?int
{
    if ($v === null || $v === '' || !is_numeric($v)) {
        return null;
    }
    return max(0, (int)$v);
}

function date_or_null($v): ?string
{
    if (!is_string($v) || $v === '') {
        return null;
    }
    $d = DateTime::createFromFormat('Y-m-d', $v);
    return ($d && $d->format('Y-m-d') === $v) ? $v : null;
}

/* ---------- Formatage ---------- */
function money($v): string
{
    return $v === null || $v === '' ? '—' : number_format((int)$v, 0, ',', ' ') . ' TND';
}

function salaire_range($min, $max): string
{
    if ($min && $max) {
        return number_format((int)$min, 0, ',', ' ') . ' – ' . number_format((int)$max, 0, ',', ' ') . ' TND';
    }
    if ($min) {
        return 'À partir de ' . money($min);
    }
    if ($max) {
        return 'Jusqu\'à ' . money($max);
    }
    return 'Salaire à négocier';
}

function date_fr(?string $d, bool $withTime = false): string
{
    if (!$d) {
        return '—';
    }
    $ts = strtotime($d);
    return $withTime ? date('d/m/Y à H\hi', $ts) : date('d/m/Y', $ts);
}

function heure_fr(string $d): string
{
    $ts = strtotime($d);
    return (int)date('G', $ts) . 'h' . date('i', $ts);
}

function plage_horaire(string $debut, string $fin): string
{
    return heure_fr($debut) . ' - ' . heure_fr($fin);
}

function ref_candidat(int $id): string
{
    return 'MS-C' . str_pad((string)$id, 5, '0', STR_PAD_LEFT);
}

function excerpt(string $text, int $len = 180): string
{
    $text = trim(preg_replace('/\s+/', ' ', $text));
    return mb_strlen($text) > $len ? mb_substr($text, 0, $len) . '…' : $text;
}

function statut_entretien_badge(string $s): string
{
    return match ($s) {
        'confirme' => '<span class="badge bg-success">Confirmé</span>',
        'refuse'   => '<span class="badge bg-danger">Refusé</span>',
        default    => '<span class="badge bg-warning text-dark">En attente</span>',
    };
}

/* ---------- Données candidat ---------- */

/** Expérience totale en années (décimale) à partir des expériences */
function experience_annees(array $experiences): float
{
    $months = 0;
    foreach ($experiences as $x) {
        if (empty($x['date_debut'])) {
            continue;
        }
        $start = new DateTime($x['date_debut']);
        $end = (!empty($x['poste_actuel']) || empty($x['date_fin'])) ? new DateTime() : new DateTime($x['date_fin']);
        if ($end < $start) {
            continue;
        }
        $diff = $start->diff($end);
        $months += $diff->y * 12 + $diff->m;
    }
    return round($months / 12, 1);
}

/** Expression SQL calculant l'expérience totale (en mois) d'un candidat c */
function sql_experience_mois(string $alias = 'c'): string
{
    return "(SELECT COALESCE(SUM(GREATEST(TIMESTAMPDIFF(MONTH, x.date_debut, IF(x.poste_actuel = 1 OR x.date_fin IS NULL, CURDATE(), x.date_fin)), 0)), 0)
             FROM experiences x WHERE x.candidat_id = {$alias}.id AND x.date_debut IS NOT NULL)";
}

function candidat_full(int $id): ?array
{
    $c = db_one('SELECT c.*, u.email FROM candidats c JOIN utilisateurs u ON u.id = c.utilisateur_id WHERE c.id = ?', [$id]);
    if (!$c) {
        return null;
    }
    $c['diplomes'] = db_all('SELECT * FROM diplomes WHERE candidat_id = ? ORDER BY date_obtention DESC', [$id]);
    $c['experiences'] = db_all('SELECT * FROM experiences WHERE candidat_id = ? ORDER BY poste_actuel DESC, date_debut DESC', [$id]);
    $c['competences'] = db_all('SELECT * FROM competences WHERE candidat_id = ? ORDER BY nom', [$id]);
    $c['langues'] = db_all('SELECT * FROM langues WHERE candidat_id = ? ORDER BY id', [$id]);
    $c['test'] = db_one('SELECT * FROM tests_personnalite WHERE candidat_id = ?', [$id]);
    $c['experience_annees'] = experience_annees($c['experiences']);
    return $c;
}

/** CV complet = titre de profil + au moins un diplôme */
function cv_complet(int $candidatId): bool
{
    $poste = db_val('SELECT poste_recherche FROM candidats WHERE id = ?', [$candidatId]);
    $nb = (int)db_val('SELECT COUNT(*) FROM diplomes WHERE candidat_id = ?', [$candidatId]);
    return !empty($poste) && $nb > 0;
}

function test_passe(int $candidatId): bool
{
    return (bool)db_val('SELECT 1 FROM tests_personnalite WHERE candidat_id = ?', [$candidatId]);
}

function photo_url(?string $photo): string
{
    return $photo ? url('uploads/photos/' . rawurlencode($photo)) : url('assets/img/avatar.svg');
}

/**
 * Upload d'une photo de profil (max 2 Mo, JPG/PNG/GIF).
 * Retourne le nom du fichier, null si aucun fichier, ou lève une exception.
 */
function upload_photo(array $file): ?string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Erreur lors de l\'envoi de la photo.');
    }
    if ($file['size'] > 2 * 1024 * 1024) {
        throw new RuntimeException('La photo ne doit pas dépasser 2 Mo.');
    }
    $info = @getimagesize($file['tmp_name']);
    $allowed = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif'];
    if (!$info || !isset($allowed[$info[2]])) {
        throw new RuntimeException('Format de photo non autorisé (JPG, PNG ou GIF uniquement).');
    }
    $name = bin2hex(random_bytes(12)) . '.' . $allowed[$info[2]];
    $dir = APP_ROOT . '/uploads/photos';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
        throw new RuntimeException('Impossible d\'enregistrer la photo.');
    }
    return $name;
}

function json_response($data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
