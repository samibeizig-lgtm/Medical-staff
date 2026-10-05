<?php
/**
 * Configuration de Medical Staff.
 * Les valeurs peuvent être surchargées via des variables d'environnement
 * ou via un fichier config/config.local.php (non versionné).
 */
$config = [
    'db_host'    => getenv('MS_DB_HOST') ?: '127.0.0.1',
    'db_port'    => getenv('MS_DB_PORT') ?: '3306',
    'db_name'    => getenv('MS_DB_NAME') ?: 'medical_staff',
    'db_user'    => getenv('MS_DB_USER') ?: 'root',
    'db_pass'    => getenv('MS_DB_PASS') ?: '',

    // URL de base (vide si le site est à la racine, ex. '/medical-staff' sinon)
    'base_url'   => getenv('MS_BASE_URL') ?: '',
    'site_name'  => 'Medical Staff',
    'mail_from'  => getenv('MS_MAIL_FROM') ?: 'no-reply@medicalstaff.tn',
    'mail_from_name' => getenv('MS_MAIL_FROM_NAME') ?: 'Medical Staff',

    // SMTP (PHPMailer). Laisser smtp_host vide pour utiliser mail() de PHP.
    // Exemples : Gmail → smtp.gmail.com / 587 / tls (mot de passe d'application)
    //            Brevo → smtp-relay.brevo.com / 587 / tls
    'smtp_host'   => getenv('MS_SMTP_HOST') ?: '',
    'smtp_port'   => (int)(getenv('MS_SMTP_PORT') ?: 587),
    'smtp_user'   => getenv('MS_SMTP_USER') ?: '',
    'smtp_pass'   => getenv('MS_SMTP_PASS') ?: '',
    'smtp_secure' => getenv('MS_SMTP_SECURE') ?: 'tls', // 'tls', 'ssl' ou 'none' (relais local sans chiffrement)
    // Si true, les emails sont aussi journalisés dans storage/mails.log
    'mail_log'   => true,

    'abonnement_prix' => 1000,

    // Chatbot : 'local', 'ollama' ou 'huggingface'
    'chatbot_engine'   => getenv('MS_CHATBOT_ENGINE') ?: 'local',
    'ollama_url'       => getenv('MS_OLLAMA_URL') ?: 'http://localhost:11434/api/chat',
    'ollama_model'     => getenv('MS_OLLAMA_MODEL') ?: 'llama3',
    'hf_token'         => getenv('MS_HF_TOKEN') ?: '',
    'hf_model'         => getenv('MS_HF_MODEL') ?: 'mistralai/Mistral-7B-Instruct-v0.3',
];

if (is_file(__DIR__ . '/config.local.php')) {
    $config = array_merge($config, require __DIR__ . '/config.local.php');
}

return $config;
