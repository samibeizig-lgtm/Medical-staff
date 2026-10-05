import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { AppEnv, Flash, User } from '../types';
import { NOW, one, run, val } from './db';
import { randomHex, safeEqualStr, sha256 } from './crypto';

export type Ctx = Context<AppEnv>;

const SESSION_COOKIE = 'ms_sid';
const CSRF_COOKIE = 'ms_csrf';
const FLASH_COOKIE = 'ms_flash';
const NEXT_COOKIE = 'ms_next';
const SESSION_DAYS = 7;

const isHttps = (c: Ctx) => new URL(c.req.url).protocol === 'https:';
const cookieOpts = (c: Ctx, maxAge?: number) => ({
  path: '/',
  httpOnly: true,
  secure: isHttps(c),
  sameSite: 'Lax' as const,
  ...(maxAge !== undefined ? { maxAge } : {}),
});

/* ---------- Encodage des cookies (base64url UTF-8) ---------- */
const b64e = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0)));

/* ---------- Middleware principal : session, CSRF, flash, en-têtes ---------- */
export const appMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  // Session
  let user: User | null = null;
  const token = getCookie(c, SESSION_COOKIE);
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    user = await one<User>(
      c.env.DB,
      `SELECT u.id, u.email, u.type FROM sessions s JOIN utilisateurs u ON u.id = s.utilisateur_id
       WHERE s.id = ? AND s.expire_le > ${NOW} AND u.actif = 1`,
      await sha256(token),
    );
    if (!user) deleteCookie(c, SESSION_COOKIE, { path: '/' });
  }
  c.set('user', user);

  // Jeton CSRF (double soumission : cookie HttpOnly + champ de formulaire)
  let csrf = getCookie(c, CSRF_COOKIE);
  if (!csrf || !/^[a-f0-9]{48}$/.test(csrf)) {
    csrf = randomHex(24);
    setCookie(c, CSRF_COOKIE, csrf, cookieOpts(c));
  }
  c.set('csrf', csrf);

  // Messages flash
  let flashes: Flash[] = [];
  const f = getCookie(c, FLASH_COOKIE);
  if (f) {
    try { flashes = JSON.parse(b64d(f)); } catch { flashes = []; }
    deleteCookie(c, FLASH_COOKIE, { path: '/' });
  }
  c.set('flashes', Array.isArray(flashes) ? flashes.slice(0, 5) : []);
  c.set('flashOut', []);

  if (c.req.method === 'POST') {
    // Vérification d'origine + jeton
    const origin = c.req.header('Origin');
    const self = new URL(c.req.url).origin;
    const sent = c.req.header('X-CSRF-Token') ?? (await readForm(c)).get('_csrf');
    if ((origin && origin !== self) || typeof sent !== 'string' || !safeEqualStr(sent, csrf)) {
      return c.text('Session expirée ou requête invalide. Veuillez recharger la page.', 419 as any);
    }
  }

  await next();

  const out = c.get('flashOut');
  if (out.length) setCookie(c, FLASH_COOKIE, b64e(JSON.stringify(out)), cookieOpts(c, 60));

  // En-têtes de sécurité (toutes les ressources sont servies localement)
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('Referrer-Policy', 'same-origin');
  if (!c.res.headers.get('Content-Security-Policy')) c.header(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; frame-ancestors 'self'; form-action 'self'; base-uri 'self'",
  );
  if (!c.res.headers.get('Cache-Control')) c.header('Cache-Control', 'no-store');
};

/* ---------- Formulaires ---------- */
const FORM_KEY = Symbol('form');

/** Lit le corps (urlencoded ou multipart) une seule fois et le met en cache */
export async function readForm(c: Ctx): Promise<FormData> {
  const anyC = c as any;
  if (!anyC[FORM_KEY]) {
    const ct = c.req.header('Content-Type') ?? '';
    if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      anyC[FORM_KEY] = await c.req.raw.clone().formData();
    } else {
      anyC[FORM_KEY] = new FormData();
    }
  }
  return anyC[FORM_KEY] as FormData;
}

/** Champ texte d'un formulaire */
export async function field(c: Ctx, name: string, max = 500): Promise<string> {
  const v = (await readForm(c)).get(name);
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/** Champs indexés : diplomes[0][intitule] → [{ intitule: … }] */
export async function indexed(c: Ctx, prefix: string): Promise<Record<string, string>[]> {
  const fd = await readForm(c);
  const map = new Map<string, Record<string, string>>();
  const re = new RegExp(`^${prefix}\\[([\\w-]+)\\]\\[(\\w+)\\]$`);
  for (const [k, v] of fd.entries()) {
    const m = re.exec(k);
    if (!m || typeof v !== 'string') continue;
    if (!map.has(m[1])) map.set(m[1], {});
    map.get(m[1])![m[2]] = v.trim();
  }
  return [...map.values()];
}

/** Paramètre de requête GET */
export const q = (c: Ctx, name: string, max = 200) => (c.req.query(name) ?? '').trim().slice(0, max);

/* ---------- Flash & redirections ---------- */
export function flash(c: Ctx, type: string, message: string): void {
  c.get('flashOut').push({ type, message });
}

export function redirect(c: Ctx, path: string) {
  return c.redirect(path.startsWith('/') ? path : '/' + path, 302);
}

/* ---------- Authentification ---------- */
export async function loginUser(c: Ctx, userId: number): Promise<void> {
  const token = randomHex(32);
  await run(
    c.env.DB,
    `INSERT INTO sessions (id, utilisateur_id, expire_le) VALUES (?, ?, datetime('now', '+1 hour', '+${SESSION_DAYS} days'))`,
    await sha256(token),
    userId,
  );
  await run(c.env.DB, `UPDATE utilisateurs SET derniere_connexion = ${NOW} WHERE id = ?`, userId);
  // Nettoyage opportuniste des sessions expirées
  c.executionCtx.waitUntil(c.env.DB.prepare(`DELETE FROM sessions WHERE expire_le < ${NOW}`).run().then(() => undefined));
  setCookie(c, SESSION_COOKIE, token, cookieOpts(c, SESSION_DAYS * 86400));
}

export async function logoutUser(c: Ctx): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await run(c.env.DB, 'DELETE FROM sessions WHERE id = ?', await sha256(token));
  }
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  setCookie(c, CSRF_COOKIE, randomHex(24), cookieOpts(c));
}

const LOGIN_PAGES = { candidat: '/candidat/login', recruteur: '/recruteur/login', admin: '/admin/login' } as const;
export const loginPath = (type: string) => LOGIN_PAGES[type as keyof typeof LOGIN_PAGES] ?? '/candidat/login';

/** Middleware : réservé à un type d'utilisateur */
export function requireRole(type: User['type']): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const u = c.get('user');
    if (!u || u.type !== type) {
      flash(c, 'warning', 'Veuillez vous connecter pour accéder à cet espace.');
      if (c.req.method === 'GET') {
        const url = new URL(c.req.url);
        setCookie(c, NEXT_COOKIE, url.pathname + url.search, cookieOpts(c, 600));
      }
      return redirect(c, loginPath(type));
    }
    await next();
  };
}

export function redirectAfterLogin(c: Ctx, fallback: string) {
  const next = getCookie(c, NEXT_COOKIE);
  deleteCookie(c, NEXT_COOKIE, { path: '/' });
  if (next && next.startsWith('/') && !next.startsWith('//')) return c.redirect(next, 302);
  return redirect(c, fallback);
}

export function setNext(c: Ctx, path: string) {
  setCookie(c, NEXT_COOKIE, path, cookieOpts(c, 600));
}

/** Limitation : 5 échecs par compte ou 30 échecs par adresse IP sur 15 minutes */
export async function loginThrottled(c: Ctx, email: string): Promise<boolean> {
  const ip = c.req.header('CF-Connecting-IP') ?? 'local';
  const r = await one<{ e: number; i: number }>(
    c.env.DB,
    `SELECT SUM(cle = ?1) AS e, SUM(cle = ?2) AS i FROM tentatives_connexion
     WHERE cle IN (?1, ?2) AND created_at > datetime('now', '+1 hour', '-15 minutes')`,
    'email:' + email,
    'ip:' + ip,
  );
  return (r?.e ?? 0) >= 5 || (r?.i ?? 0) >= 30;
}

export async function recordLoginFailure(c: Ctx, email: string): Promise<void> {
  const ip = c.req.header('CF-Connecting-IP') ?? 'local';
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO tentatives_connexion (cle) VALUES (?)').bind('email:' + email),
    c.env.DB.prepare('INSERT INTO tentatives_connexion (cle) VALUES (?)').bind('ip:' + ip),
    c.env.DB.prepare(`DELETE FROM tentatives_connexion WHERE created_at < datetime('now', '+1 hour', '-1 day')`),
  ]);
}

export const origin = (c: Ctx) => new URL(c.req.url).origin;
