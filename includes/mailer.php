<?php
/**
 * Envoi d'emails HTML.
 * - Si smtp_host est configuré et PHPMailer installé (composer install) : envoi SMTP.
 * - Sinon : repli sur mail() de PHP.
 * Chaque envoi est aussi journalisé dans storage/mails.log si mail_log = true.
 */

function mail_layout(string $htmlBody): string
{
    return '<!doctype html><html><body style="margin:0;padding:24px;background:#f3f6fb;font-family:Arial,sans-serif;color:#1f2937;">'
        . '<div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">'
        . '<div style="background:#0d6efd;color:#fff;padding:16px 20px;font-size:20px;font-weight:bold">' . e(cfg('site_name')) . '</div>'
        . '<div style="padding:20px;line-height:1.5">' . $htmlBody . '</div>'
        . '<div style="background:#f3f4f6;padding:12px 20px;font-size:12px;color:#6b7280">Plateforme de recrutement médical et paramédical en Tunisie.</div>'
        . '</div></body></html>';
}

function mail_log(string $to, string $subject, string $htmlBody, string $status): void
{
    if (!cfg('mail_log')) {
        return;
    }
    $dir = APP_ROOT . '/storage';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $text = trim(html_entity_decode(strip_tags(str_replace(['<br>', '</p>', '</li>'], "\n", $htmlBody)), ENT_QUOTES, 'UTF-8'));
    @file_put_contents($dir . '/mails.log', sprintf("[%s] (%s) To: %s | %s\n%s\n\n", date('Y-m-d H:i:s'), $status, $to, $subject, $text), FILE_APPEND);
}

function send_mail(string $to, string $subject, string $htmlBody): bool
{
    $html = mail_layout($htmlBody);
    $ok = false;

    if (cfg('smtp_host') && class_exists(\PHPMailer\PHPMailer\PHPMailer::class)) {
        $m = new \PHPMailer\PHPMailer\PHPMailer(true);
        try {
            $m->isSMTP();
            $m->Host = cfg('smtp_host');
            $m->Port = (int)cfg('smtp_port');
            if (cfg('smtp_user')) {
                $m->SMTPAuth = true;
                $m->Username = cfg('smtp_user');
                $m->Password = cfg('smtp_pass');
            }
            $secure = cfg('smtp_secure');
            if ($secure === 'ssl') {
                $m->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($secure === 'tls') {
                $m->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $m->SMTPSecure = '';
                $m->SMTPAutoTLS = false;
            }
            $m->Timeout = 10;
            $m->CharSet = 'UTF-8';
            $m->setFrom(cfg('mail_from'), cfg('mail_from_name'));
            $m->addAddress($to);
            $m->isHTML(true);
            $m->Subject = $subject;
            $m->Body = $html;
            $m->AltBody = trim(html_entity_decode(strip_tags(str_replace(['<br>', '</p>', '</li>'], "\n", $htmlBody)), ENT_QUOTES, 'UTF-8'));
            $ok = $m->send();
        } catch (\PHPMailer\PHPMailer\Exception $ex) {
            error_log('[Medical Staff] Échec SMTP vers ' . $to . ' : ' . $m->ErrorInfo);
        }
        mail_log($to, $subject, $htmlBody, $ok ? 'smtp' : 'smtp-échec');
        return $ok;
    }

    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: =?UTF-8?B?' . base64_encode((string)cfg('mail_from_name')) . '?= <' . cfg('mail_from') . '>',
    ];
    $ok = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $html, implode("\r\n", $headers));
    mail_log($to, $subject, $htmlBody, $ok ? 'mail' : 'mail-échec');
    return $ok;
}
