/**
 * QCM de compétences : tirage aléatoire chronométré par métier.
 * Une session = 5 compétences × 3 questions (15 questions, 30 s chacune), tirées parmi les
 * compétences du métier et du tronc commun, en priorité celles que le candidat n'a pas encore validées. Compétence validée si au moins 2 bonnes réponses sur 3.
 */
import { normalize } from './format';
import { FAMILLES_QCM, TRONC_COMMUN, type FamilleQcm } from './qcm-banque';

export const SECONDES_PAR_QUESTION = 30;
/** Marge accordée pour le temps de chargement de la page et l'envoi */
export const MARGE_SECONDES = 5;
export const QUESTIONS_PAR_COMPETENCE = 3;
export const SEUIL_VALIDATION = 2;
export const COMPETENCES_PAR_SESSION = 5;
export const MAX_COMPETENCES_METIER = 4;
export const MAX_SESSIONS_SEMAINE = 2;

/** Catalogue unique : compétences du tronc commun puis de chaque famille (sans doublon) */
export const CATALOGUE: readonly { nom: string; famille: string; label: string }[] = (() => {
  const out: { nom: string; famille: string; label: string }[] = [];
  for (const f of [TRONC_COMMUN, ...FAMILLES_QCM]) {
    for (const c of f.competences) if (!out.some((o) => o.nom === c.nom)) out.push({ nom: c.nom, famille: f.cle, label: f.label });
  }
  return out;
})();
export const NOMS_CATALOGUE: readonly string[] = CATALOGUE.map((c) => c.nom);

/** Ramène un libellé saisi à son nom exact dans le catalogue (ou null) */
export function competenceDuCatalogue(s: string): string | null {
  const n = normalize(s);
  return NOMS_CATALOGUE.find((c) => normalize(c) === n) ?? null;
}

export function familleQcm(poste: string | null | undefined): FamilleQcm {
  const p = normalize(poste ?? '');
  const cle =
    p.includes('sage femme') ? 'sagefemme'
    : p.includes('anesthesie') ? 'anesthesie'
    : /bloc|instrumentation|hygiene hospitaliere/.test(p) ? 'bloc'
    : p.includes('infirmier') ? 'infirmier'
    : p.includes('imagerie') || p.includes('radiologie') ? 'imagerie'
    : /laboratoire|biologie/.test(p) ? 'laboratoire'
    : p.includes('pharmacie') ? 'pharmacie'
    : /dieteticien|nutrition/.test(p) ? 'nutrition'
    : /kinesitherapeute|orthophoniste|orthoptiste|ergotherapeute|psychomotricien/.test(p) ? 'reeducation'
    : /aide soignant|auxiliaire/.test(p) ? 'aide'
    : p.includes('ambulancier') ? 'ambulance'
    : /secretaire|assistant|opticien|prothesiste/.test(p) ? 'accueil'
    : 'infirmier';
  return FAMILLES_QCM.find((f) => f.cle === cle)!;
}

/** Une question tirée : compétence, index dans la banque, ordre d'affichage des 4 choix */
export type QuestionTiree = { c: string; q: number; ordre: number[] };
/** Réponse : choix = index d'origine (0 = bonne réponse), null = pas de réponse / temps écoulé */
export type ReponseQcm = { choix: number | null; ok: boolean; duree: number };
export type ResultatCompetence = { nom: string; bonnes: number; total: number; validee: boolean };

export function melanger<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  const r = crypto.getRandomValues(new Uint32Array(Math.max(1, a.length)));
  for (let i = a.length - 1; i > 0; i--) {
    const j = r[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const trouver = (nom: string) => [TRONC_COMMUN, ...FAMILLES_QCM].flatMap((f) => f.competences).find((c) => c.nom === nom);

/**
 * Choix des compétences : d'abord celles que le candidat n'a pas validées (au plus 4 du métier,
 * puis le tronc commun), complétées si besoin par des compétences déjà validées (révision).
 */
function choisirCompetences(famille: FamilleQcm, dejaValidees: Set<string>): string[] {
  const metier = famille.competences.map((c) => c.nom), tronc = TRONC_COMMUN.competences.map((c) => c.nom);
  const non = (l: string[]) => melanger(l.filter((x) => !dejaValidees.has(x)));
  const oui = (l: string[]) => melanger(l.filter((x) => dejaValidees.has(x)));
  const choix = [...non(metier).slice(0, MAX_COMPETENCES_METIER), ...non(tronc)].slice(0, COMPETENCES_PAR_SESSION);
  for (const x of [...oui(metier), ...oui(tronc), ...non(metier)]) {
    if (choix.length >= COMPETENCES_PAR_SESSION) break;
    if (!choix.includes(x)) choix.push(x);
  }
  return choix;
}

export function tirerQuestions(poste: string | null | undefined, dejaValidees: Set<string>): QuestionTiree[] {
  const out: QuestionTiree[] = [];
  for (const nom of choisirCompetences(familleQcm(poste), dejaValidees)) {
    const comp = trouver(nom)!;
    const idx = melanger(comp.questions.map((_, i) => i)).slice(0, QUESTIONS_PAR_COMPETENCE);
    for (const q of idx) out.push({ c: nom, q, ordre: melanger([0, 1, 2, 3]) });
  }
  return melanger(out);
}

/** Énoncé et choix dans l'ordre d'affichage (la bonne réponse n'est pas signalée) */
export function questionAffichee(t: QuestionTiree): { enonce: string; choix: string[] } | null {
  const q = trouver(t.c)?.questions[t.q];
  if (!q) return null;
  return { enonce: q[0], choix: t.ordre.map((i) => q[1 + i]) };
}

export function resultats(questions: QuestionTiree[], reponses: ReponseQcm[]): ResultatCompetence[] {
  const m = new Map<string, ResultatCompetence>();
  questions.forEach((t, i) => {
    const r = m.get(t.c) ?? { nom: t.c, bonnes: 0, total: 0, validee: false };
    r.total++;
    if (reponses[i]?.ok) r.bonnes++;
    m.set(t.c, r);
  });
  for (const r of m.values()) r.validee = r.bonnes >= Math.min(SEUIL_VALIDATION, r.total);
  return [...m.values()];
}
