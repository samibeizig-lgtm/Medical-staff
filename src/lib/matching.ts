/**
 * IA de matching offre ↔ candidat.
 * Pondération : compétences validées par QCM 45 %, diplôme 20 %, expérience 20 %, proximité 15 %,
 * + bonus jusqu'à 10 % (personnalité et communication à l'entretien IA). Total plafonné à 100.
 */
import type { Row } from '../types';
import type { CandidatFull } from './models';
import { normalize } from './format';
import { competenceDuCatalogue } from './qcm';
import { distanceKm, proximite } from './proximite';

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
  proximite: number;
  bonus: number;
  competences_matchees: string[];
  competences_manquantes: string[];
  distance: number | null;
};

/** Pondération des critères (bonus en plus, total plafonné à 100) */
export const POIDS = { competences: 45, diplome: 20, experience: 20, proximite: 15, bonus: 10 } as const;
export const CRITERES_MATCHING = [
  ['competences', 'Compétences', POIDS.competences],
  ['diplome', 'Diplôme', POIDS.diplome],
  ['experience', 'Expérience', POIDS.experience],
  ['proximite', 'Proximité', POIDS.proximite],
  ['bonus', 'Bonus', POIDS.bonus],
] as const;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Compétences requises par une offre, limitées au catalogue des compétences vérifiables par QCM */
export function competencesRequises(offre: Row): string[] {
  return [...new Set(String(offre.competences_requises ?? '').split(',').map((x) => competenceDuCatalogue(x.trim())).filter((x): x is string => !!x))];
}

export function matchScore(offre: Row, cand: CandidatFull): Score {
  // 1. Compétences validées par QCM (45)
  const req = competencesRequises(offre);
  const valides = new Set(cand.competences.map((c) => String(c.nom)));
  const matched = req.filter((x) => valides.has(x));
  const sComp = req.length ? (POIDS.competences * matched.length) / req.length : POIDS.competences * Math.min(1, valides.size / 4);

  // 2. Diplôme (20)
  let sDip = 0;
  if (cand.diplomes.length) {
    if (!offre.diplome_requis) {
      sDip = POIDS.diplome;
    } else {
      let best = 0;
      const kReq = keywords(offre.diplome_requis);
      for (const d of cand.diplomes) {
        if (similarTerms(offre.diplome_requis, d.intitule)) { best = 1; break; }
        const kD = keywords(d.intitule);
        if (kReq.length && kD.length) best = Math.max(best, kReq.filter((w) => kD.includes(w)).length / kReq.length);
      }
      sDip = POIDS.diplome * Math.max(0.2, best); // un diplôme paramédical vaut au moins 20 % du critère
    }
  }

  // 3. Expérience (20)
  const min = Number(offre.experience_min) || 0;
  const sExp = min <= 0 ? POIDS.experience : POIDS.experience * Math.min(1, cand.experience_annees / min);

  // 4. Proximité du lieu de travail (15)
  const distance = distanceKm(cand.ville, offre.ville);
  const sProx = POIDS.proximite * proximite(distance);

  // 5. Bonus : personnalité (5) + communication à l'entretien IA (5)
  let sBonus = 0;
  if (cand.test) {
    const t = cand.test;
    sBonus += (5 * (t.conscience + t.agreabilite + t.stabilite + t.adaptation_medicale)) / 400;
  }
  if (cand.communication !== null) sBonus += (5 * cand.communication) / 100;

  return {
    total: Math.round(Math.min(100, sComp + sDip + sExp + sProx + sBonus)),
    competences: r1(sComp),
    diplome: r1(sDip),
    experience: r1(sExp),
    proximite: r1(sProx),
    bonus: r1(sBonus),
    competences_matchees: matched,
    competences_manquantes: req.filter((x) => !valides.has(x)),
    distance,
  };
}
