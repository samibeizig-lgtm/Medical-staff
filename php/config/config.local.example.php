<?php
/**
 * Copiez ce fichier en config/config.local.php (non versionné) et adaptez les valeurs.
 * Toute clé définie ici remplace celle de config/config.php.
 */
return [
    'db_host' => '127.0.0.1',
    'db_name' => 'medical_staff',
    'db_user' => 'medical_staff',
    'db_pass' => 'mot-de-passe-de-la-base',

    // Envoi des emails par SMTP (laisser smtp_host vide pour utiliser mail())
    'smtp_host'   => 'smtp.gmail.com',
    'smtp_port'   => 587,
    'smtp_user'   => 'votre.adresse@gmail.com',
    'smtp_pass'   => 'mot-de-passe-d-application', // Gmail : https://myaccount.google.com/apppasswords
    'smtp_secure' => 'tls',
    'mail_from'   => 'votre.adresse@gmail.com',

    // 'chatbot_engine' => 'ollama',
];
