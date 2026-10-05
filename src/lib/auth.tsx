import type { Row, User } from '../types';
import { one, run } from './db';
import { DUMMY_HASH, hashPassword, iterationsFromEnv, verifyPassword } from './crypto';
import { field, flash, loginThrottled, loginUser, recordLoginFailure, redirectAfterLogin, type Ctx } from './http';
import { page } from '../views/layout';
import { AuthCard, Csrf } from '../views/ui';

/** Vérifie les identifiants. Retourne l'utilisateur, ou un message d'erreur. */
export async function attemptLogin(c: Ctx, email: string, password: string, type: User['type']): Promise<Row | string> {
  email = email.trim().toLowerCase();
  if (await loginThrottled(c, email)) {
    return 'Trop de tentatives de connexion. Réessayez dans 15 minutes.';
  }
  const u = await one<Row>(c.env.DB, 'SELECT * FROM utilisateurs WHERE email = ? AND type = ?', email, type);
  const ok = await verifyPassword(password, u?.mot_de_passe ?? DUMMY_HASH);
  if (!u || !ok) {
    await recordLoginFailure(c, email);
    return 'Email ou mot de passe incorrect.';
  }
  if (!u.actif) return "Ce compte a été suspendu. Contactez l'administrateur de la plateforme.";
  return u;
}

type LoginOpts = {
  type: User['type'];
  title: string;
  icon: string;
  iconClass?: string;
  btnClass: string;
  dashboard: string;
  subtitle?: string;
  links?: any;
};

/** Page de connexion commune (GET + POST) */
export async function loginPage(c: Ctx, o: LoginOpts) {
  let error: string | null = null;
  let email = '';
  if (c.req.method === 'POST') {
    email = await field(c, 'email', 190);
    const res = await attemptLogin(c, email, await field(c, 'password', 200), o.type);
    if (typeof res !== 'string') {
      await loginUser(c, res.id);
      return redirectAfterLogin(c, o.dashboard, o.type);
    }
    error = res;
  } else if (c.get('user')?.type === o.type) {
    return redirectAfterLogin(c, o.dashboard, o.type);
  }
  return page(c, { title: o.title }, (
    <AuthCard icon={o.icon} iconClass={o.iconClass} title={o.title} subtitle={o.subtitle}>
      {error && <div class="alert alert-danger py-2">{error}</div>}
      <form method="post">
        <Csrf token={c.get('csrf')} />
        <div class="mb-3"><label class="form-label" for="email">Email</label><input type="email" id="email" name="email" class="form-control" value={email} required autofocus autocomplete="username" /></div>
        <div class="mb-4"><label class="form-label" for="password">Mot de passe</label><input type="password" id="password" name="password" class="form-control" required autocomplete="current-password" />
          <div class="text-end mt-1"><a class="small" href={`/mot-de-passe-oublie?type=${o.type}`}>Mot de passe oublié ?</a></div></div>
        <button class={`btn ${o.btnClass} w-100`}>Se connecter</button>
      </form>
      {o.links}
    </AuthCard>
  ));
}

/** Création d'un utilisateur ; retourne son id */
export async function createUser(c: Ctx, email: string, password: string, type: User['type']): Promise<number> {
  const { lastId } = await run(c.env.DB, 'INSERT INTO utilisateurs (email, mot_de_passe, type) VALUES (?, ?, ?)', email, await hashPassword(password, iterationsFromEnv(c.env.PASSWORD_ITERATIONS)), type);
  return lastId;
}

export function validatePassword(p: string, p2: string): string[] {
  const errors: string[] = [];
  if (p.length < 8) errors.push('Le mot de passe doit contenir au moins 8 caractères.');
  if (p !== p2) errors.push('Les mots de passe ne correspondent pas.');
  return errors;
}

export { flash };
