/**
 * IA de matching offre ↔ candidat.
 * Pondération : compétences 45 %, diplôme 25 %, expérience 20 %, personnalité (bonus) jusqu'à 10 %.
 */
import type { Row } from '../types';
import type { CandidatFull } from './models';
import { normalize } from './format';

const STOP = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'en', 'et', 'un', 'une', 'ou', 'au', 'aux', 'sciences', 'diplome', 'licence', 'master']);

export function keywords(s: string): string[] {
  return [...new Set(normalize(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w)))];
}

export function similarTerms(a: string, b: string): boolean {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const ka = keywords(a), kb = keywords(b);
  if (!ka.length || !kb.length) return false;
  const inter = ka.filter((w) => kb.includes(w)).length;
  return inter / Math.min(ka.length, kb.length) >= 0.6;
}

export type Score = {
  total: number;
  competences: number;
  diplome: number;
  experience: number;
  personnalite: number;
  competences_matchees: string[];
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export function matchScore(offre: Row, cand: CandidatFull): Score {
  // 1. Compétences (45)
  const req = String(offre.competences_requises ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const candComps = cand.competences.map((c) => String(c.nom));
  const matched = req.filter((rc) => candComps.some((cc) => similarTerms(rc, cc)));
  const sComp = req.length ? (45 * matched.length) / req.length : 45 * Math.min(1, candComps.length / 5);

  // 2. Diplôme (25)
  let sDip = 0;
  if (cand.diplomes.length) {
    if (!offre.diplome_requis) {
      sDip = 25;
    } else {
      let best = 0;
      const kReq = keywords(offre.diplome_requis);
      for (const d of cand.diplomes) {
        if (similarTerms(offre.diplome_requis, d.intitule)) { best = 1; break; }
        const kD = keywords(d.intitule);
        if (kReq.length && kD.length) best = Math.max(best, kReq.filter((w) => kD.includes(w)).length / kReq.length);
      }
      sDip = 25 * Math.max(0.2, best); // un diplôme paramédical vaut au moins 20 % du critère
    }
  }

  // 3. Expérience (20)
  const min = Number(offre.experience_min) || 0;
  const sExp = min <= 0 ? 20 : 20 * Math.min(1, cand.experience_annees / min);

  // 4. Personnalité (bonus jusqu'à 10)
  let sPers = 0;
  if (cand.test) {
    const t = cand.test;
    sPers = (10 * (t.conscience + t.agreabilite + t.stabilite + t.adaptation_medicale)) / 400;
  }

  return {
    total: Math.round(Math.min(100, sComp + sDip + sExp + sPers)),
    competences: r1(sComp),
    diplome: r1(sDip),
    experience: r1(sExp),
    personnalite: r1(sPers),
    competences_matchees: matched,
  };
}
