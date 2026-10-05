/** Utilitaires de dates en heure de Tunis (UTC+1, pas d'heure d'été). */
const OFFSET_MS = 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');

/** Date « décalée » : ses getters UTC donnent l'heure de Tunis */
export function tunis(d: Date = new Date()): Date {
  return new Date(d.getTime() + OFFSET_MS);
}

export function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function fmtDateTime(d: Date): string {
  return `${fmtDate(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export const today = () => fmtDate(tunis());
export const nowStr = () => fmtDateTime(tunis());

/** Parse 'AAAA-MM-JJ' ou 'AAAA-MM-JJ HH:MM[:SS]' (ou avec T) en Date « Tunis » */
export function parseLocal(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)));
  if (d.getUTCMonth() !== +m[2] - 1) return null;
  return d;
}

export function isValidDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && parseLocal(s) !== null;
}

export function addDays(dateStr: string, days: number): string {
  const d = parseLocal(dateStr)!;
  d.setUTCDate(d.getUTCDate() + days);
  return fmtDate(d);
}

export function addYears(dateStr: string, years: number): string {
  const d = parseLocal(dateStr)!;
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return fmtDate(d);
}

export function dateFr(s: string | null | undefined, withTime = false): string {
  const d = parseLocal(s ?? '');
  if (!d) return '—';
  const base = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  return withTime ? `${base} à ${d.getUTCHours()}h${pad(d.getUTCMinutes())}` : base;
}

export function heureFr(s: string): string {
  const d = parseLocal(s);
  return d ? `${d.getUTCHours()}h${pad(d.getUTCMinutes())}` : '';
}

export const plageHoraire = (debut: string, fin: string) => `${heureFr(debut)} - ${heureFr(fin)}`;

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export function dateLongue(s: string): string {
  const d = parseLocal(s);
  return d ? `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : '';
}

/** Expérience totale en années (1 décimale) */
export function experienceAnnees(exps: { date_debut?: string | null; date_fin?: string | null; poste_actuel?: number | null }[]): number {
  let months = 0;
  const now = tunis();
  for (const x of exps) {
    const start = parseLocal(x.date_debut);
    if (!start) continue;
    const end = x.poste_actuel || !x.date_fin ? now : parseLocal(x.date_fin);
    if (!end || end < start) continue;
    let m = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
    if (end.getUTCDate() < start.getUTCDate()) m--;
    months += Math.max(0, m);
  }
  return Math.round((months / 12) * 10) / 10;
}
