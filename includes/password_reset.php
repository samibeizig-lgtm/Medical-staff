<?php
/** Réinitialisation de mot de passe par lien à usage unique (valable 1 heure). */

const RESET_TTL_MINUTES = 60;
const RESET_MAX_PAR_HEURE = 3;

function reset_request(string $email): void
{
    $u = db_one('SELECT id, email, type FROM utilisateurs WHERE email = ? AND actif = 1', [mb_strtolower(trim($email))]);
    if (!$u) {
        return; // Pas de message différent : on ne révèle pas si l'email existe
    }
    $recent = (int)db_val('SELECT COUNT(*) FROM password_resets WHERE utilisateur_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)', [$u['id']]);
    if ($recent >= RESET_MAX_PAR_HEURE) {
        return;
    }
    $token = bin2hex(random_bytes(32));
    db_exec('INSERT INTO password_resets (utilisateur_id, token_hash, expire_le) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ' . RESET_TTL_MINUTES . ' MINUTE))',
        [$u['id'], hash('sha256', $token)]);
    $link = absolute_url('reinitialiser-mot-de-passe?token=' . $token);
    send_mail($u['email'], 'Réinitialisation de votre mot de passe',
        '<p>Bonjour,</p><p>Vous avez demandé la réinitialisation du mot de passe de votre compte Medical Staff.</p>'
        . '<p style="text-align:center;margin:24px 0"><a href="' . e($link) . '" style="background:#0d6efd;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none">Choisir un nouveau mot de passe</a></p>'
        . '<p style="font-size:13px;color:#6b7280">Ce lien est valable ' . RESET_TTL_MINUTES . ' minutes et ne peut être utilisé qu\'une seule fois. Si vous n\'êtes pas à l\'origine de cette demande, ignorez simplement cet email.</p>');
}

/** Retourne la demande valide associée au jeton, ou null */
function reset_find(string $token): ?array
{
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        return null;
    }
    return db_one(
        'SELECT r.*, u.email, u.type FROM password_resets r JOIN utilisateurs u ON u.id = r.utilisateur_id
         WHERE r.token_hash = ? AND r.utilise_le IS NULL AND r.expire_le > NOW() AND u.actif = 1',
        [hash('sha256', $token)]
    );
}

function reset_apply(array $reset, string $password): void
{
    $pdo = db();
    $pdo->beginTransaction();
    db_exec('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?', [password_hash($password, PASSWORD_BCRYPT), $reset['utilisateur_id']]);
    // Le lien utilisé et toutes les autres demandes en cours sont invalidés
    db_exec('UPDATE password_resets SET utilise_le = NOW() WHERE utilisateur_id = ? AND utilise_le IS NULL', [$reset['utilisateur_id']]);
    $pdo->commit();
    send_mail($reset['email'], 'Votre mot de passe a été modifié',
        '<p>Bonjour,</p><p>Le mot de passe de votre compte Medical Staff vient d\'être modifié. Si vous n\'êtes pas à l\'origine de ce changement, contactez-nous immédiatement.</p>');
}
