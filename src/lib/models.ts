import type { Row } from '../types';
import { all, one, val, TODAY } from './db';
import { experienceAnnees } from './dates';

export type CandidatFull = Row & {
  diplomes: Row[];
  experiences: Row[];
  competences: Row[];
  langues: Row[];
  test: Row | null;
  experience_annees: number;
};

export async function candidatFull(db: D1Database, id: number): Promise<CandidatFull | null> {
  const [c, diplomes, experiences, competences, langues, test] = await db.batch([
    db.prepare('SELECT c.*, u.email FROM candidats c JOIN utilisateurs u ON u.id = c.utilisateur_id WHERE c.id = ?').bind(id),
    db.prepare('SELECT * FROM diplomes WHERE candidat_id = ? ORDER BY date_obtention DESC').bind(id),
    db.prepare('SELECT * FROM experiences WHERE candidat_id = ? ORDER BY poste_actuel DESC, date_debut DESC').bind(id),
    db.prepare('SELECT * FROM competences WHERE candidat_id = ? ORDER BY nom').bind(id),
    db.prepare('SELECT * FROM langues WHERE candidat_id = ? ORDER BY id').bind(id),
    db.prepare('SELECT * FROM tests_personnalite WHERE candidat_id = ?').bind(id),
  ]);
  const cand = (c.results as Row[])[0];
  if (!cand) return null;
  const exps = experiences.results as Row[];
  return {
    ...cand,
    diplomes: diplomes.results as Row[],
    experiences: exps,
    competences: competences.results as Row[],
    langues: langues.results as Row[],
    test: ((test.results as Row[])[0] ?? null) as Row | null,
    experience_annees: experienceAnnees(exps),
  };
}

/** Plusieurs candidats complets en 6 requêtes (suggestions IA) */
export async function candidatsFull(db: D1Database, ids: number[]): Promise<CandidatFull[]> {
  if (!ids.length) return [];
  const ph = ids.map(() => '?').join(',');
  const [cs, dips, exps, comps, langs, tests] = await db.batch([
    db.prepare(`SELECT c.*, u.email FROM candidats c JOIN utilisateurs u ON u.id = c.utilisateur_id WHERE c.id IN (${ph})`).bind(...ids),
    db.prepare(`SELECT * FROM diplomes WHERE candidat_id IN (${ph})`).bind(...ids),
    db.prepare(`SELECT * FROM experiences WHERE candidat_id IN (${ph})`).bind(...ids),
    db.prepare(`SELECT * FROM competences WHERE candidat_id IN (${ph})`).bind(...ids),
    db.prepare(`SELECT * FROM langues WHERE candidat_id IN (${ph})`).bind(...ids),
    db.prepare(`SELECT * FROM tests_personnalite WHERE candidat_id IN (${ph})`).bind(...ids),
  ]);
  const group = (rows: Row[]) => {
    const m = new Map<number, Row[]>();
    for (const r of rows) (m.get(r.candidat_id) ?? m.set(r.candidat_id, []).get(r.candidat_id)!).push(r);
    return m;
  };
  const gd = group(dips.results as Row[]), ge = group(exps.results as Row[]), gc = group(comps.results as Row[]), gl = group(langs.results as Row[]);
  const gt = group(tests.results as Row[]);
  return (cs.results as Row[]).map((c) => {
    const e = ge.get(c.id) ?? [];
    return {
      ...c,
      diplomes: gd.get(c.id) ?? [],
      experiences: e,
      competences: gc.get(c.id) ?? [],
      langues: gl.get(c.id) ?? [],
      test: gt.get(c.id)?.[0] ?? null,
      experience_annees: experienceAnnees(e),
    };
  });
}

/** CV complet = poste recherché + au moins un diplôme */
export async function cvComplet(db: D1Database, candidatId: number): Promise<boolean> {
  return !!(await val(
    db,
    `SELECT 1 FROM candidats c WHERE c.id = ? AND c.poste_recherche IS NOT NULL AND c.poste_recherche <> ''
     AND EXISTS (SELECT 1 FROM diplomes d WHERE d.candidat_id = c.id)`,
    candidatId,
  ));
}

export async function testPasse(db: D1Database, candidatId: number): Promise<boolean> {
  return !!(await val(db, 'SELECT 1 FROM tests_personnalite WHERE candidat_id = ?', candidatId));
}

export async function currentCandidat(db: D1Database, userId: number): Promise<Row | null> {
  return one(db, 'SELECT * FROM candidats WHERE utilisateur_id = ?', userId);
}

export async function currentRecruteur(db: D1Database, userId: number): Promise<Row | null> {
  return one(db, 'SELECT * FROM recruteurs WHERE utilisateur_id = ?', userId);
}

export async function abonnementActif(db: D1Database, recruteurId: number): Promise<Row | null> {
  return one(
    db,
    `SELECT * FROM abonnements WHERE recruteur_id = ? AND statut = 'actif' AND date_fin >= ${TODAY} ORDER BY date_fin DESC LIMIT 1`,
    recruteurId,
  );
}

/** Le recruteur peut voir un CV complet s'il est abonné ou si le candidat a postulé à l'une de ses offres */
export async function peutVoirCv(db: D1Database, recruteurId: number, candidatId: number): Promise<boolean> {
  if (await abonnementActif(db, recruteurId)) return true;
  return !!(await val(
    db,
    'SELECT 1 FROM candidatures ca JOIN offres o ON o.id = ca.offre_id WHERE o.recruteur_id = ? AND ca.candidat_id = ? LIMIT 1',
    recruteurId,
    candidatId,
  ));
}

/** Expression SQL : expérience totale (en mois) du candidat c */
export const SQL_EXP_MOIS = `(SELECT COALESCE(SUM(MAX(0,
    (CAST(strftime('%Y', CASE WHEN x.poste_actuel = 1 OR x.date_fin IS NULL THEN date('now','+1 hour') ELSE x.date_fin END) AS INTEGER) - CAST(strftime('%Y', x.date_debut) AS INTEGER)) * 12
  + (CAST(strftime('%m', CASE WHEN x.poste_actuel = 1 OR x.date_fin IS NULL THEN date('now','+1 hour') ELSE x.date_fin END) AS INTEGER) - CAST(strftime('%m', x.date_debut) AS INTEGER))
  )), 0) FROM experiences x WHERE x.candidat_id = c.id AND x.date_debut IS NOT NULL)`;

export { all };

/** Dernier entretien IA terminé d'un candidat (ou null) */
export async function dernierEntretienIa(db: D1Database, candidatId: number): Promise<Row | null> {
  return one(db, "SELECT * FROM entretiens_ia WHERE candidat_id = ? AND statut = 'termine' ORDER BY termine_le DESC, id DESC LIMIT 1", candidatId);
}

/** Derniers scores de communication de plusieurs candidats : Map candidat_id → score */
export async function scoresCommunication(db: D1Database, ids: number[]): Promise<Map<number, number>> {
  const m = new Map<number, number>();
  if (!ids.length) return m;
  const rows = await all<Row>(db,
    `SELECT e.candidat_id, e.score_global FROM entretiens_ia e
     WHERE e.statut = 'termine' AND e.candidat_id IN (${ids.map(() => '?').join(',')})
       AND e.id = (SELECT MAX(x.id) FROM entretiens_ia x WHERE x.candidat_id = e.candidat_id AND x.statut = 'termine')`, ...ids);
  for (const r of rows) m.set(r.candidat_id, r.score_global);
  return m;
}
