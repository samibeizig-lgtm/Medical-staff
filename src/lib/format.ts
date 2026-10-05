/** Échappement HTML pour les contenus construits en chaîne (emails). Le JSX échappe déjà automatiquement. */
export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const nf = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');

export function money(v: unknown): string {
  return v === null || v === undefined || v === '' ? '—' : `${nf(Number(v))} TND`;
}

export function salaireRange(min: unknown, max: unknown): string {
  const a = Number(min) || 0;
  const b = Number(max) || 0;
  if (a && b) return `${nf(a)} – ${nf(b)} TND`;
  if (a) return `À partir de ${money(a)}`;
  if (b) return `Jusqu'à ${money(b)}`;
  return 'Salaire à négocier';
}

export const formatNombre = nf;

export const refCandidat = (id: number) => 'MS-C' + String(id).padStart(5, '0');

export function excerpt(text: string, len = 180): string {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t.length > len ? t.slice(0, len) + '…' : t;
}

export function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

export function str(v: unknown, max = 255): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export function competencesList(csv: string | null | undefined): string[] {
  return String(csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Normalisation sans accents pour les comparaisons */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 190;
