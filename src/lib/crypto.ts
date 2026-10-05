/**
 * Hachage des mots de passe : PBKDF2-SHA256.
 * 50 000 itérations par défaut : environ 7 ms de calcul, compatible avec la limite de 10 ms de CPU
 * par requête de l'offre gratuite de Workers. Sur un plan payant, PASSWORD_ITERATIONS peut monter
 * jusqu'à 100 000 (maximum autorisé par Workers). Le nombre d'itérations est enregistré dans chaque
 * hash : modifier ce réglage n'invalide pas les mots de passe existants.
 */
export const DEFAULT_ITERATIONS = 50_000;
const MAX_ITERATIONS = 100_000;
const enc = new TextEncoder();

const toHex = (buf: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => new Uint8Array((hex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)));

export function randomHex(bytes = 32): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Format : pbkdf2$<itérations>$<sel hex>$<hash hex> */
export async function hashPassword(password: string, iterations: number = DEFAULT_ITERATIONS): Promise<string> {
  const it = Math.min(MAX_ITERATIONS, Math.max(10_000, Math.floor(iterations) || DEFAULT_ITERATIONS));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, it);
  return `pbkdf2$${it}$${toHex(salt)}$${toHex(hash)}`;
}

/** Nombre d'itérations configuré (variable PASSWORD_ITERATIONS) */
export const iterationsFromEnv = (v: string | undefined) => Number(v) || DEFAULT_ITERATIONS;

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function safeEqualStr(a: string, b: string): boolean {
  return timingSafeEqual(enc.encode(a), enc.encode(b));
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, it, saltHex, hashHex] = stored.split('$');
  const n = Number(it);
  if (algo !== 'pbkdf2' || !(n >= 1 && n <= MAX_ITERATIONS) || !saltHex || !hashHex) return false;
  const hash = await pbkdf2(password, fromHex(saltHex), n);
  return timingSafeEqual(hash, fromHex(hashHex));
}

/** Hash factice pour garder un temps de réponse constant quand l'email est inconnu */
export const DUMMY_HASH = 'pbkdf2$50000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
