/**
 * Test de personnalité inspiré du modèle Big Five, enrichi d'une dimension
 * « Adaptation au milieu médical ». 30 questions, 5 par dimension, échelle de Likert 1–5.
 */
export const DIMENSIONS = {
  ouverture: { label: 'Ouverture', color: '#6f42c1', icon: 'fa-lightbulb' },
  conscience: { label: 'Conscience', color: '#1F5FAD', icon: 'fa-list-check' },
  extraversion: { label: 'Extraversion', color: '#fd7e14', icon: 'fa-comments' },
  agreabilite: { label: 'Agréabilité', color: '#20c997', icon: 'fa-hand-holding-heart' },
  stabilite: { label: 'Stabilité émotionnelle', color: '#0dcaf0', icon: 'fa-scale-balanced' },
  adaptation_medicale: { label: 'Adaptation au milieu médical', color: '#dc3545', icon: 'fa-hospital-user' },
} as const;

export type Dim = keyof typeof DIMENSIONS;
export type Scores = Record<Dim, number>;
export const DIM_KEYS = Object.keys(DIMENSIONS) as Dim[];

export const QUESTIONS: { d: Dim; t: string; r?: boolean }[] = [
  { d: "ouverture", t: "J'aime découvrir de nouvelles techniques de soins ou de nouveaux protocoles." },
  { d: "ouverture", t: "Je m'intéresse aux avancées scientifiques et médicales." },
  { d: "ouverture", t: "Je préfère suivre la routine plutôt que d'essayer de nouvelles méthodes.", r: true },
  { d: "ouverture", t: "Je propose facilement des idées pour améliorer l'organisation du service." },
  { d: "ouverture", t: "Je suis curieux(se) de comprendre les cultures et les croyances des patients." },
  { d: "conscience", t: "Je vérifie systématiquement les prescriptions avant d'administrer un traitement." },
  { d: "conscience", t: "Mes transmissions écrites sont précises et complètes." },
  { d: "conscience", t: "Il m'arrive d'oublier certaines tâches en fin de garde.", r: true },
  { d: "conscience", t: "Je respecte scrupuleusement les règles d'hygiène et d'asepsie." },
  { d: "conscience", t: "J'organise ma journée de travail en fixant des priorités claires." },
  { d: "extraversion", t: "Je me sens à l'aise pour parler avec des patients que je ne connais pas." },
  { d: "extraversion", t: "J'aime travailler au sein d'une grande équipe animée." },
  { d: "extraversion", t: "Je préfère rester en retrait lors des réunions de service.", r: true },
  { d: "extraversion", t: "Je prends facilement la parole pour expliquer un soin à une famille." },
  { d: "extraversion", t: "L'activité intense d'un service me donne de l'énergie." },
  { d: "agreabilite", t: "Je fais preuve de patience face à un patient anxieux ou exigeant." },
  { d: "agreabilite", t: "J'aide spontanément mes collègues lorsqu'ils sont débordés." },
  { d: "agreabilite", t: "Je peux me montrer sec(che) ou impatient(e) avec les familles.", r: true },
  { d: "agreabilite", t: "Je cherche le compromis en cas de désaccord dans l'équipe." },
  { d: "agreabilite", t: "Le bien-être et la dignité du patient sont ma priorité." },
  { d: "stabilite", t: "Je reste calme dans les situations d'urgence." },
  { d: "stabilite", t: "Je me sens souvent submergé(e) par le stress.", r: true },
  { d: "stabilite", t: "Je récupère rapidement après une journée difficile." },
  { d: "stabilite", t: "Les critiques me déstabilisent longtemps.", r: true },
  { d: "stabilite", t: "Je garde la maîtrise de mes émotions face à la souffrance ou au décès d'un patient." },
  { d: "adaptation_medicale", t: "Je m'adapte facilement aux horaires de garde, de nuit et de week-end." },
  { d: "adaptation_medicale", t: "Je supporte bien la vue du sang et des plaies." },
  { d: "adaptation_medicale", t: "Je respecte la hiérarchie et les protocoles médicaux établis." },
  { d: "adaptation_medicale", t: "Changer de service ou de poste au pied levé me pose problème.", r: true },
  { d: "adaptation_medicale", t: "Je respecte strictement le secret médical et la confidentialité." },
];

export const ECHELLE: Record<number, string> = {
  1: "Pas du tout d'accord",
  2: "Plutôt pas d'accord",
  3: 'Neutre',
  4: "Plutôt d'accord",
  5: 'Tout à fait d\'accord',
};

export function personalityScores(answers: number[]): Scores {
  const sums = {} as Record<Dim, number>;
  const counts = {} as Record<Dim, number>;
  for (const k of DIM_KEYS) { sums[k] = 0; counts[k] = 0; }
  QUESTIONS.forEach((q, i) => {
    let v = Math.max(1, Math.min(5, Math.round(answers[i] ?? 3)));
    if (q.r) v = 6 - v;
    sums[q.d] += v;
    counts[q.d]++;
  });
  const s = {} as Scores;
  for (const k of DIM_KEYS) s[k] = Math.round(((sums[k] - counts[k]) / (4 * counts[k])) * 100);
  return s;
}

type Lvl = 'h' | 'm' | 'l';
const lvl = (v: number): Lvl => (v >= 70 ? 'h' : v >= 40 ? 'm' : 'l');

const TXT: Record<Dim, Record<Lvl, string>> = {
  ouverture: {
    h: "curieux(se) et ouvert(e) à l'innovation, vous aimez apprendre et faire évoluer les pratiques de soins",
    m: 'vous savez concilier méthodes éprouvées et nouveautés lorsque celles-ci ont fait leurs preuves',
    l: 'vous appréciez les cadres stables et les protocoles bien établis, gages de sécurité pour les patients',
  },
  conscience: {
    h: "Rigoureux(se) et organisé(e), vous accordez une grande importance à la précision des gestes, à l'hygiène et à la traçabilité.",
    m: 'Vous êtes globalement fiable et organisé(e), avec une marge de progression sur la planification des tâches.',
    l: 'Vous gagneriez à structurer davantage votre organisation et vos vérifications, essentielles en milieu de soins.',
  },
  extraversion: {
    h: "Communicatif(ve) et énergique, vous êtes à l'aise dans les échanges avec les patients, les familles et l'équipe.",
    m: "Vous communiquez volontiers lorsque c'est utile tout en sachant travailler de façon autonome.",
    l: "Plutôt réservé(e), vous privilégiez l'écoute et la concentration, des atouts dans les postes techniques.",
  },
  agreabilite: {
    h: "Votre empathie et votre sens de l'entraide font de vous un(e) collègue apprécié(e) et un soutien précieux pour les patients.",
    m: "Vous savez être bienveillant(e) tout en restant ferme lorsque la situation l'exige.",
    l: "Direct(e) et franc(he), vous gagneriez à cultiver la patience et l'écoute dans les situations relationnelles délicates.",
  },
  stabilite: {
    h: "Vous gardez votre sang-froid face à l'urgence et à la pression, une qualité majeure en milieu hospitalier.",
    m: 'Vous gérez correctement le stress, même si les périodes intenses peuvent vous éprouver.',
    l: 'Les situations de forte pression peuvent vous affecter : des techniques de gestion du stress vous seraient bénéfiques.',
  },
  adaptation_medicale: {
    h: 'Enfin, vous êtes parfaitement adapté(e) aux contraintes du milieu médical (gardes, protocoles, secret professionnel).',
    m: 'Enfin, vous vous adaptez convenablement aux contraintes du milieu médical.',
    l: 'Enfin, certaines contraintes du milieu médical (horaires, mobilité, imprévus) peuvent représenter un défi pour vous.',
  },
};

export function personalityPortrait(s: Scores, prenom = ''): string {
  let p = (prenom ? `${prenom}, v` : 'V') + `ous présentez un profil où ${TXT.ouverture[lvl(s.ouverture)]}. `;
  for (const d of ['conscience', 'extraversion', 'agreabilite', 'stabilite', 'adaptation_medicale'] as Dim[]) p += TXT[d][lvl(s[d])] + ' ';
  const top = [...DIM_KEYS].sort((a, b) => s[b] - s[a]).slice(0, 2);
  p += `Vos points forts : ${DIMENSIONS[top[0]].label.toLowerCase()} et ${DIMENSIONS[top[1]].label.toLowerCase()}.`;
  const postes: string[] = [];
  if (s.stabilite >= 65 && s.conscience >= 65) postes.push('urgences, réanimation ou bloc opératoire');
  if (s.agreabilite >= 65 && s.extraversion >= 55) postes.push('pédiatrie, maternité ou gériatrie');
  if (s.conscience >= 70 && s.extraversion < 50) postes.push('laboratoire ou imagerie médicale');
  if (postes.length) p += ` Environnements recommandés : ${postes.join(' ; ')}.`;
  return p.trim();
}
