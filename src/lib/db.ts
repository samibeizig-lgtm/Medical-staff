import type { Row } from '../types';

/** Expressions SQL de date, heure de Tunis (UTC+1, sans heure d'été) */
export const NOW = "datetime('now', '+1 hour')";
export const TODAY = "date('now', '+1 hour')";

const clean = (params: unknown[]) => params.map((p) => (p === undefined ? null : p));

export async function all<T = Row>(db: D1Database, sql: string, ...params: unknown[]): Promise<T[]> {
  const r = await db.prepare(sql).bind(...clean(params)).all<T>();
  return r.results ?? [];
}

export async function one<T = Row>(db: D1Database, sql: string, ...params: unknown[]): Promise<T | null> {
  return (await db.prepare(sql).bind(...clean(params)).first<T>()) ?? null;
}

export async function val<T = any>(db: D1Database, sql: string, ...params: unknown[]): Promise<T | null> {
  const r = await db.prepare(sql).bind(...clean(params)).first<Row>();
  if (!r) return null;
  const k = Object.keys(r)[0];
  return (r[k] ?? null) as T | null;
}

export async function run(db: D1Database, sql: string, ...params: unknown[]): Promise<{ changes: number; lastId: number }> {
  const r = await db.prepare(sql).bind(...clean(params)).run();
  return { changes: r.meta.changes ?? 0, lastId: Number(r.meta.last_row_id ?? 0) };
}

/** Prépare une requête pour un lot (db.batch), exécuté de façon atomique */
export function stmt(db: D1Database, sql: string, ...params: unknown[]): D1PreparedStatement {
  return db.prepare(sql).bind(...clean(params));
}

/** Placeholders « ?, ?, ? » */
export const placeholders = (n: number) => Array(n).fill('?').join(', ');
