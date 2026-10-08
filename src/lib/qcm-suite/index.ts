/** Regroupe les questions complémentaires des QCM, par compétence. */
import type { QuestionBrute } from '../qcm-banque';
import { SUITE_TRONC } from './tronc';
import { SUITE_INFIRMIER } from './infirmier';
import { SUITE_BLOC } from './bloc';
import { SUITE_SAGEFEMME } from './sagefemme';
import { SUITE_ANESTHESIE } from './anesthesie';
import { SUITE_IMAGERIE } from './imagerie';
import { SUITE_LABORATOIRE } from './laboratoire';
import { SUITE_PHARMACIE } from './pharmacie';
import { SUITE_REEDUCATION } from './reeducation';
import { SUITE_AIDE } from './aide';
import { SUITE_ACCUEIL } from './accueil';
import { SUITE_SPECIALITES } from './specialites';

const sources: Record<string, QuestionBrute[]>[] = [
  SUITE_TRONC, SUITE_INFIRMIER, SUITE_BLOC, SUITE_SAGEFEMME, SUITE_ANESTHESIE, SUITE_IMAGERIE, SUITE_LABORATOIRE,
  SUITE_PHARMACIE, SUITE_REEDUCATION, SUITE_AIDE, SUITE_ACCUEIL, SUITE_SPECIALITES,
];
export const SUITE: Record<string, QuestionBrute[]> = {};
for (const s of sources) for (const [k, v] of Object.entries(s)) (SUITE[k] ??= []).push(...v);
