import { Hono } from 'hono';
import type { AppEnv, Row } from '../types';
import { NOW, one, run, val } from '../lib/db';
import { hashPassword, iterationsFromEnv, randomHex, sha256 } from '../lib/crypto';
import { field, flash, logoutUser, origin, q, redirect } from '../lib/http';
import { esc, isEmail } from '../lib/format';
import { sendMail } from '../lib/mail';
import { validatePassword } from '../lib/auth';
import { page } from '../views/layout';
import { AuthCard, Csrf, Errors } from '../views/ui';

const r = new Hono<AppEnv>();
const RESET_TTL_MIN = 60;

/* Déconnexion centralisée (POST protégé par CSRF) */
r.post('/logout', async (c) => {
  await logoutUser(c);
  c.header('Clear-Site-Data', '"cache"');
  return redirect(c, '/');
});
// Ancienne URL : on affiche un bouton plutôt que de déconnecter sur un simple lien
r.get('/logout', (c) => redirect(c, '/'));

/* ---------- Mot de passe oublié ---------- */
r.on(['GET', 'POST'], '/mot-de-passe-oublie', async (c) => {
  const type = ['candidat', 'recruteur', 'admin'].includes(q(c, 'type')) ? q(c, 'type') : 'candidat';
  let envoye = false;
  let error: string | null = null;
  let email = '';
  if (c.req.method === 'POST') {
    email = (await field(c, 'email', 190)).toLowerCase();
    if (!isEmail(email)) {
      error = 'Adresse email invalide.';
    } else {
      envoye = true;
      const u = await one<Row>(c.env.DB, 'SELECT id, email FROM utilisateurs WHERE email = ? AND actif = 1', email);
      // Même message que l'email existe ou non ; 3 demandes maximum par heure
      const recent = u ? (await val<number>(c.env.DB, `SELECT COUNT(*) FROM password_resets WHERE utilisateur_id = ? AND created_at > datetime('now', '+1 hour', '-1 hour')`, u.id)) ?? 0 : 0;
      if (u && recent < 3) {
        const token = randomHex(32);
        await run(c.env.DB, `INSERT INTO password_resets (utilisateur_id, token_hash, expire_le) VALUES (?, ?, datetime('now', '+1 hour', '+${RESET_TTL_MIN} minutes'))`, u.id, await sha256(token));
        const link = `${origin(c)}/reinitialiser-mot-de-passe?token=${token}`;
        sendMail(c, u.email, 'Réinitialisation de votre mot de passe',
          '<p>Bonjour,</p><p>Vous avez demandé la réinitialisation du mot de passe de votre compte medicalstaff.tn.</p>' +
          `<p style="text-align:center;margin:24px 0"><a href="${esc(link)}" style="background:#1F5FAD;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none">Choisir un nouveau mot de passe</a></p>` +
          `<p style="font-size:13px;color:#6b7280">Ce lien est valable ${RESET_TTL_MIN} minutes et ne peut être utilisé qu'une seule fois. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>`);
      }
    }
  }
  return page(c, { title: 'Mot de passe oublié' }, (
    <AuthCard icon="fa-key" title="Mot de passe oublié">
      {envoye ? (
        <div class="alert alert-success"><i class="fa-solid fa-envelope-circle-check me-1"></i>Si un compte est associé à cette adresse, vous allez recevoir un email contenant un lien de réinitialisation (valable 1 heure). Pensez à vérifier vos courriers indésirables.</div>
      ) : (
        <>
          <p class="small text-muted">Saisissez l'adresse email de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
          {error && <div class="alert alert-danger py-2">{error}</div>}
          <form method="post">
            <Csrf token={c.get('csrf')} />
            <div class="mb-3"><label class="form-label" for="email">Email</label><input type="email" id="email" name="email" class="form-control" value={email} required autofocus /></div>
            <button class="btn btn-primary w-100">Envoyer le lien</button>
          </form>
        </>
      )}
      <p class="text-center small mt-3 mb-0"><a href={`/${type}/login`}><i class="fa-solid fa-arrow-left me-1"></i>Retour à la connexion</a></p>
    </AuthCard>
  ));
});

/* ---------- Nouveau mot de passe ---------- */
r.on(['GET', 'POST'], '/reinitialiser-mot-de-passe', async (c) => {
  const token = c.req.method === 'POST' ? await field(c, 'token', 64) : q(c, 'token', 64);
  const reset = /^[a-f0-9]{64}$/.test(token)
    ? await one<Row>(c.env.DB,
        `SELECT r.*, u.email, u.type FROM password_resets r JOIN utilisateurs u ON u.id = r.utilisateur_id
         WHERE r.token_hash = ? AND r.utilise_le IS NULL AND r.expire_le > ${NOW} AND u.actif = 1`, await sha256(token))
    : null;
  let errors: string[] = [];
  if (reset && c.req.method === 'POST') {
    const p = await field(c, 'password', 200);
    errors = validatePassword(p, await field(c, 'password2', 200));
    if (!errors.length) {
      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?').bind(await hashPassword(p, iterationsFromEnv(c.env.PASSWORD_ITERATIONS)), reset.utilisateur_id),
        // Le lien utilisé, les autres demandes et toutes les sessions ouvertes sont invalidés
        c.env.DB.prepare(`UPDATE password_resets SET utilise_le = ${NOW} WHERE utilisateur_id = ? AND utilise_le IS NULL`).bind(reset.utilisateur_id),
        c.env.DB.prepare('DELETE FROM sessions WHERE utilisateur_id = ?').bind(reset.utilisateur_id),
      ]);
      sendMail(c, reset.email, 'Votre mot de passe a été modifié',
        "<p>Bonjour,</p><p>Le mot de passe de votre compte medicalstaff.tn vient d'être modifié. Si vous n'êtes pas à l'origine de ce changement, contactez-nous immédiatement.</p>");
      flash(c, 'success', 'Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.');
      return redirect(c, `/${reset.type}/login`);
    }
  }
  return page(c, { title: 'Nouveau mot de passe' }, (
    <AuthCard icon="fa-lock" title="Nouveau mot de passe">
      {!reset ? (
        <>
          <div class="alert alert-warning">Ce lien est invalide, expiré ou a déjà été utilisé.</div>
          <a href="/mot-de-passe-oublie" class="btn btn-primary w-100">Demander un nouveau lien</a>
        </>
      ) : (
        <>
          <p class="small text-muted">Compte : <strong>{reset.email}</strong></p>
          <Errors errors={errors} />
          <form method="post">
            <Csrf token={c.get('csrf')} />
            <input type="hidden" name="token" value={token} />
            <div class="mb-3"><label class="form-label" for="p1">Nouveau mot de passe</label><input type="password" id="p1" name="password" class="form-control" minlength={8} required autofocus autocomplete="new-password" /><div class="form-text">8 caractères minimum.</div></div>
            <div class="mb-4"><label class="form-label" for="p2">Confirmation</label><input type="password" id="p2" name="password2" class="form-control" required autocomplete="new-password" /></div>
            <button class="btn btn-primary w-100">Enregistrer</button>
          </form>
        </>
      )}
    </AuthCard>
  ));
});

export default r;
