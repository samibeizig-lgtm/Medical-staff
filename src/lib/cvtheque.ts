/**
 * Recherche multicritère de profils (CVthèque des établissements, chatbot).
 */
import { DIPLOMES, DISPONIBILITES, GOUVERNORATS, LANGUES, NIVEAUX_LANGUE, POSTES, inList } from './data';
import { intOrNull } from './format';
import { SQL_EXP_MOIS } from './models';
import { distanceKm, gouvernoratsDansRayon, rayonValide } from './proximite';
import { competenceDuCatalogue } from './qcm';

export const TRIS = {
  recent: 'Profils mis à jour récemment',
  experience: 'Plus expérimentés',
  distance: 'Plus proches',
  communication: 'Meilleure communication (entretien IA)',
  competences: 'Plus de compétences validées',
  salaire: 'Salaire souhaité croissant',
} as const;
export type Tri = keyof typeof TRIS;
export const SCORES_COMM = [50, 60, 70, 80] as const;
export const ACTIVITE = { '7': 'Cette semaine', '30': 'Ce mois-ci', '90': '3 derniers mois' } as const;

export type FiltresCv = {
  poste: string;
  ville: string;
  rayon: number | null;
  dispo: string;
  experience_min: number | null;
  experience_max: number | null;
  competence: string;
  diplome: string;
  annee_diplome: number | null;
  langue: string;
  niveau: string;
  salaire_max: number | null;
  comm_min: number | null;
  test: string;
  mot: string;
  actif: string;
  tri: Tri;
};

/** Lecture et validation des paramètres de recherche */
export function lireFiltres(get: (k: string) => string): FiltresCv {
  const n = (k: string, max = 100000) => { const v = intOrNull(get(k)); return v === null ? null : Math.min(v, max); };
  const comm = n('comm_min');
  const tri = get('tri');
  return {
    poste: inList(POSTES, get('poste')) ? get('poste') : '',
    ville: inList(GOUVERNORATS, get('ville')) ? get('ville') : '',
    rayon: rayonValide(get('rayon')),
    dispo: inList(DISPONIBILITES, get('dispo')) ? get('dispo') : '',
    experience_min: n('experience_min', 50),
    experience_max: n('experience_max', 50),
    competence: competenceDuCatalogue(get('competence')) ?? '',
    diplome: inList(DIPLOMES, get('diplome')) ? get('diplome') : '',
    annee_diplome: n('annee_diplome', 2100),
    langue: inList(LANGUES, get('langue')) ? get('langue') : '',
    niveau: inList(NIVEAUX_LANGUE, get('niveau')) ? get('niveau') : '',
    salaire_max: n('salaire_max'),
    comm_min: comm !== null && (SCORES_COMM as readonly number[]).includes(comm) ? comm : null,
    test: get('test') === '1' ? '1' : '',
    mot: get('mot').slice(0, 60),
    actif: get('actif') in ACTIVITE ? get('actif') : '',
    tri: tri in TRIS ? (tri as Tri) : 'recent',
  };
}

const like = (s: string) => `%${s.replace(/[\\%_]/g, (m) => '\\' + m)}%`;

/** Clauses SQL (table candidats aliasée `c`) */
export function clausesRecherche(f: FiltresCv, centre: string) {
  const where = ["c.poste_recherche IS NOT NULL", "c.poste_recherche <> ''"];
  const params: unknown[] = [];
  if (f.poste) { where.push('c.poste_recherche = ?'); params.push(f.poste); }
  if (f.rayon && centre) {
    const proches = gouvernoratsDansRayon(centre, f.rayon);
    where.push(`c.ville IN (${proches.map(() => '?').join(',')})`); params.push(...proches);
  } else if (f.ville) { where.push('c.ville = ?'); params.push(f.ville); }
  if (f.dispo) {
    // « Disponible au plus tard » : toutes les disponibilités jusqu'à celle choisie
    const ok = DISPONIBILITES.slice(0, DISPONIBILITES.indexOf(f.dispo) + 1);
    where.push(`c.disponibilite IN (${ok.map(() => '?').join(',')})`); params.push(...ok);
  }
  if (f.experience_min) { where.push(`${SQL_EXP_MOIS} >= ?`); params.push(f.experience_min * 12); }
  if (f.experience_max !== null) { where.push(`${SQL_EXP_MOIS} <= ?`); params.push(f.experience_max * 12 + 11); }
  if (f.competence) { where.push('EXISTS (SELECT 1 FROM competences k WHERE k.candidat_id = c.id AND k.nom = ?)'); params.push(f.competence); }
  if (f.diplome) { where.push('EXISTS (SELECT 1 FROM diplomes d WHERE d.candidat_id = c.id AND d.intitule = ?)'); params.push(f.diplome); }
  if (f.annee_diplome) { where.push("EXISTS (SELECT 1 FROM diplomes d WHERE d.candidat_id = c.id AND CAST(strftime('%Y', d.date_obtention) AS INTEGER) >= ?)"); params.push(f.annee_diplome); }
  if (f.langue) {
    const niveaux = f.niveau ? NIVEAUX_LANGUE.slice(NIVEAUX_LANGUE.indexOf(f.niveau)) : NIVEAUX_LANGUE;
    where.push(`EXISTS (SELECT 1 FROM langues l WHERE l.candidat_id = c.id AND l.langue = ? AND l.niveau IN (${niveaux.map(() => '?').join(',')}))`);
    params.push(f.langue, ...niveaux);
  }
  if (f.salaire_max) { where.push('(c.salaire_souhaite IS NULL OR c.salaire_souhaite <= ?)'); params.push(f.salaire_max); }
  if (f.test) where.push('EXISTS (SELECT 1 FROM tests_personnalite t WHERE t.candidat_id = c.id)');
  if (f.comm_min) {
    where.push(`(SELECT e.score_global FROM entretiens_ia e WHERE e.candidat_id = c.id AND e.statut = 'termine' ORDER BY e.id DESC LIMIT 1) >= ?`);
    params.push(f.comm_min);
  }
  if (f.mot) {
    // Mot-clé dans les expériences (poste, établissement, service décrit) et les diplômes
    where.push(`(EXISTS (SELECT 1 FROM experiences x WHERE x.candidat_id = c.id AND (x.poste LIKE ? ESCAPE '\\' OR x.etablissement LIKE ? ESCAPE '\\' OR x.description LIKE ? ESCAPE '\\'))
      OR EXISTS (SELECT 1 FROM diplomes d WHERE d.candidat_id = c.id AND (d.intitule LIKE ? ESCAPE '\\' OR d.etablissement LIKE ? ESCAPE '\\')))`);
    params.push(...Array(5).fill(like(f.mot)));
  }
  if (f.actif) { where.push(`c.updated_at >= datetime('now', '+1 hour', ?)`); params.push(`-${f.actif} days`); }

  const orderParams: unknown[] = [];
  let order = 'c.updated_at DESC, c.id DESC';
  if (f.tri === 'experience') order = `exp_mois DESC, ${order}`;
  else if (f.tri === 'communication') order = `comm IS NULL, comm DESC, ${order}`;
  else if (f.tri === 'competences') order = `nb_comp DESC, ${order}`;
  else if (f.tri === 'salaire') order = `c.salaire_souhaite IS NULL, c.salaire_souhaite ASC, ${order}`;
  else if (f.tri === 'distance' && centre) {
    order = `CASE c.ville ${GOUVERNORATS.map(() => 'WHEN ? THEN ?').join(' ')} ELSE 99999 END, ${order}`;
    for (const g of GOUVERNORATS) orderParams.push(g, distanceKm(centre, g));
  }
  return { where: where.join(' AND '), params, order, orderParams };
}

/** Libellés des filtres actifs : [libellé, paramètres à retirer] */
export function filtresActifs(f: FiltresCv): [string, (keyof FiltresCv)[]][] {
  const out: [string, (keyof FiltresCv)[]][] = [];
  if (f.poste) out.push([f.poste, ['poste']]);
  if (f.ville) out.push([`Ville : ${f.ville}`, ['ville']]);
  if (f.rayon) out.push([`≤ ${f.rayon} km`, ['rayon']]);
  if (f.dispo) out.push([`Disponible : ${f.dispo.toLowerCase()} au plus tard`, ['dispo']]);
  if (f.experience_min) out.push([`Expérience ≥ ${f.experience_min} an(s)`, ['experience_min']]);
  if (f.experience_max !== null) out.push([f.experience_max === 0 ? "Moins d'1 an d'expérience" : `Expérience ≤ ${f.experience_max} an(s)`, ['experience_max']]);
  if (f.competence) out.push([`✓ ${f.competence}`, ['competence']]);
  if (f.diplome) out.push([f.diplome, ['diplome']]);
  if (f.annee_diplome) out.push([`Diplômé(e) depuis ${f.annee_diplome}`, ['annee_diplome']]);
  if (f.langue) out.push([`${f.langue}${f.niveau ? ` (${f.niveau.toLowerCase()} min.)` : ''}`, ['langue', 'niveau']]);
  if (f.salaire_max) out.push([`Salaire ≤ ${f.salaire_max} TND`, ['salaire_max']]);
  if (f.test) out.push(['Test de personnalité passé', ['test']]);
  if (f.comm_min) out.push([`Communication ≥ ${f.comm_min}/100`, ['comm_min']]);
  if (f.mot) out.push([`« ${f.mot} »`, ['mot']]);
  if (f.actif) out.push([`Actif : ${ACTIVITE[f.actif as keyof typeof ACTIVITE].toLowerCase()}`, ['actif']]);
  return out;
}
