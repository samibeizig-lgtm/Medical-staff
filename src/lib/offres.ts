import type { Row } from '../types';
import { all, val, TODAY } from './db';

export type OffreFiltres = { poste?: string; ville?: string; contrat?: string; salaire_min?: number | null };

export const PER_PAGE = 10;

/** Recherche d'offres actives et non expirées */
export async function searchOffres(db: D1Database, f: OffreFiltres, page = 1, perPage = PER_PAGE) {
  const where = ['o.active = 1', `(o.date_limite IS NULL OR o.date_limite >= ${TODAY})`];
  const params: unknown[] = [];
  if (f.poste) { where.push('o.titre = ?'); params.push(f.poste); }
  if (f.ville) { where.push('o.ville = ?'); params.push(f.ville); }
  if (f.contrat) { where.push('o.type_contrat = ?'); params.push(f.contrat); }
  if (f.salaire_min) { where.push('COALESCE(o.salaire_max, o.salaire_min) >= ?'); params.push(f.salaire_min); }
  const w = where.join(' AND ');
  const total = (await val<number>(db, `SELECT COUNT(*) FROM offres o WHERE ${w}`, ...params)) ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  page = Math.min(Math.max(1, page), pages);
  const rows = await all<Row>(
    db,
    `SELECT o.*, r.nom_etablissement, r.type_etablissement FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id
     WHERE ${w} ORDER BY o.created_at DESC, o.id DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`,
    ...params,
  );
  return { rows, total, page, pages };
}

/** Garde uniquement les paramètres non vides (liens de pagination) */
export function cleanQuery(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== null && v !== undefined && v !== '') out[k] = String(v);
  return out;
}
