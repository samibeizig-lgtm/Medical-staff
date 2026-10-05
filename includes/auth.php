<?php

function current_user(): ?array
{
    static $user = false;
    if ($user === false) {
        $user = null;
        if (!empty($_SESSION['user_id'])) {
            $user = db_one('SELECT id, email, type FROM utilisateurs WHERE id = ?', [$_SESSION['user_id']]);
            if (!$user) {
                unset($_SESSION['user_id']);
            }
        }
    }
    return $user;
}

function user_type(): ?string
{
    return current_user()['type'] ?? null;
}

function login_user(int $userId): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
    db_exec('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?', [$userId]);
}

function attempt_login(string $email, string $password, string $type): ?array
{
    $u = db_one('SELECT * FROM utilisateurs WHERE email = ? AND type = ?', [mb_strtolower($email), $type]);
    if ($u && password_verify($password, $u['mot_de_passe'])) {
        if (password_needs_rehash($u['mot_de_passe'], PASSWORD_BCRYPT)) {
            db_exec('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?', [password_hash($password, PASSWORD_BCRYPT), $u['id']]);
        }
        return $u;
    }
    return null;
}

function require_role(string $type): array
{
    $u = current_user();
    if (!$u || $u['type'] !== $type) {
        flash('warning', 'Veuillez vous connecter pour accéder à cet espace.');
        $_SESSION['redirect_after_login'] = $_SERVER['REQUEST_URI'] ?? null;
        redirect($type === 'recruteur' ? 'recruteur/login.php' : 'candidat/login.php');
    }
    return $u;
}

function current_candidat(): ?array
{
    $u = current_user();
    if (!$u || $u['type'] !== 'candidat') {
        return null;
    }
    return db_one('SELECT * FROM candidats WHERE utilisateur_id = ?', [$u['id']]);
}

function current_recruteur(): ?array
{
    $u = current_user();
    if (!$u || $u['type'] !== 'recruteur') {
        return null;
    }
    return db_one('SELECT * FROM recruteurs WHERE utilisateur_id = ?', [$u['id']]);
}

function abonnement_actif(int $recruteurId): ?array
{
    return db_one(
        "SELECT * FROM abonnements WHERE recruteur_id = ? AND statut = 'actif' AND date_fin >= CURDATE()
         ORDER BY date_fin DESC LIMIT 1",
        [$recruteurId]
    );
}

function require_abonnement(array $recruteur): array
{
    $abo = abonnement_actif((int)$recruteur['id']);
    if (!$abo) {
        flash('warning', 'Cette fonctionnalité est réservée aux établissements disposant d\'un abonnement actif.');
        redirect('recruteur/abonnement.php');
    }
    return $abo;
}

/** Redirection post-connexion (uniquement vers un chemin local) */
function redirect_after_login(string $default): never
{
    $to = $_SESSION['redirect_after_login'] ?? null;
    unset($_SESSION['redirect_after_login']);
    if (is_string($to) && str_starts_with($to, '/') && !str_starts_with($to, '//')) {
        header('Location: ' . $to);
        exit;
    }
    redirect($default);
}

/** Un recruteur peut voir un CV complet s'il est abonné ou si le candidat a postulé à l'une de ses offres */
function recruteur_peut_voir_cv(int $recruteurId, int $candidatId): bool
{
    if (abonnement_actif($recruteurId)) {
        return true;
    }
    return (bool)db_val('SELECT 1 FROM candidatures ca JOIN offres o ON o.id = ca.offre_id WHERE o.recruteur_id = ? AND ca.candidat_id = ? LIMIT 1',
        [$recruteurId, $candidatId]);
}
