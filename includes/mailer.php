<?php
/**
 * Envoi d'emails HTML via mail(). Chaque envoi est aussi journalisé
 * dans storage/mails.log (utile en développement sans serveur SMTP).
 */
function send_mail(string $to, string $subject, string $htmlBody): bool
{
    $site = cfg('site_name');
    $html = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;">'
        . '<div style="max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">'
        . '<div style="background:#0d6efd;color:#fff;padding:16px 20px;font-size:20px;font-weight:bold">' . e($site) . '</div>'
        . '<div style="padding:20px">' . $htmlBody . '</div>'
        . '<div style="background:#f3f4f6;padding:12px 20px;font-size:12px;color:#6b7280">Plateforme de recrutement médical et paramédical en Tunisie.</div>'
        . '</div></body></html>';

    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . $site . ' <' . cfg('mail_from') . '>',
    ];
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    if (cfg('mail_log')) {
        $dir = APP_ROOT . '/storage';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        @file_put_contents($dir . '/mails.log', sprintf("[%s] To: %s | %s\n%s\n\n", date('Y-m-d H:i:s'), $to, $subject, strip_tags(str_replace(['<br>', '</p>'], "\n", $htmlBody))), FILE_APPEND);
    }
    return @mail($to, $encodedSubject, $html, implode("\r\n", $headers));
}
