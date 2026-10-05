import type { Ctx } from './http';
import { esc } from './format';
import { run } from './db';

function layout(body: string, baseUrl: string): string {
  return (
    '<!doctype html><html><body style="margin:0;padding:24px;background:#F3F6FA;font-family:Poppins,Arial,sans-serif;color:#14212B;">' +
    '<div style="max-width:600px;margin:auto;background:#fff;border:1px solid #E1E7EE;border-radius:10px;overflow:hidden">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr>' +
    '<td style="height:5px;width:28%;background:#2BA84A"></td><td style="height:5px;width:44%;background:#1F5FAD"></td><td style="height:5px;width:28%;background:#14B8B0"></td></tr></table>' +
    `<div style="padding:18px 20px 8px"><img src="${baseUrl}/assets/img/logo-email.png" width="280" height="62" alt="medicalstaff.tn – Recrutement paramédical · Tunisie" style="display:block;border:0;width:280px;height:auto"></div>` +
    `<div style="padding:10px 20px 20px;line-height:1.55">${body}</div>` +
    '<div style="background:#0E2236;padding:12px 20px;font-size:12px;color:#C9D3DC">medicalstaff.tn · Plateforme de recrutement médical et paramédical en Tunisie.</div>' +
    '</div></body></html>'
  );
}

async function deliver(c: Ctx, to: string, subject: string, html: string): Promise<string> {
  const env = c.env;
  const provider = (env.MAIL_PROVIDER || 'log').toLowerCase();
  try {
    if (provider === 'brevo' && env.BREVO_API_KEY) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM }, to: [{ email: to }], subject, htmlContent: html }),
      });
      return r.ok ? 'brevo' : `brevo-échec (${r.status})`;
    }
    if (provider === 'resend' && env.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: `${env.MAIL_FROM_NAME} <${env.MAIL_FROM}>`, to: [to], subject, html }),
      });
      return r.ok ? 'resend' : `resend-échec (${r.status})`;
    }
  } catch (e) {
    return `échec (${(e as Error).message})`.slice(0, 80);
  }
  return 'journal';
}

/**
 * Envoie un email en arrière-plan (la page n'attend pas l'envoi).
 * Chaque email est enregistré dans la table `emails`, consultable dans l'administration.
 */
export function sendMail(c: Ctx, to: string, subject: string, body: string): void {
  const html = layout(body, new URL(c.req.url).origin);
  c.executionCtx.waitUntil(
    (async () => {
      const statut = await deliver(c, to, subject, html);
      await run(c.env.DB, 'INSERT INTO emails (destinataire, sujet, corps_html, statut) VALUES (?, ?, ?, ?)', to, subject, html, statut);
    })().catch((e) => console.error('Email non envoyé', e)),
  );
}

export { esc };
