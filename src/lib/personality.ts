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

/**
 * Version pour les métiers techniques non soignants (technicien biomédical) : aucune question de soin.
 * Même ordre, mêmes dimensions et mêmes items inversés que QUESTIONS, pour un calcul de scores identique.
 */
export const QUESTIONS_TECHNIQUES: { d: Dim; t: string; r?: boolean }[] = [
  { d: "ouverture", t: "J'aime découvrir de nouvelles technologies et de nouveaux équipements." },
  { d: "ouverture", t: "Je m'intéresse aux évolutions techniques de mon domaine (électronique, informatique, normes)." },
  { d: "ouverture", t: "Je préfère suivre la routine plutôt que d'essayer de nouvelles méthodes de travail.", r: true },
  { d: "ouverture", t: "Je propose facilement des idées pour améliorer l'organisation ou les procédures de l'atelier." },
  { d: "ouverture", t: "Je suis curieux(se) de comprendre le fonctionnement interne des appareils." },
  { d: "conscience", t: "Je vérifie systématiquement mon travail avant de remettre un appareil en service." },
  { d: "conscience", t: "Mes rapports d'intervention sont précis et complets." },
  { d: "conscience", t: "Il m'arrive d'oublier certaines tâches en fin de journée.", r: true },
  { d: "conscience", t: "Je respecte scrupuleusement les procédures et les consignes de sécurité." },
  { d: "conscience", t: "J'organise ma journée de travail en fixant des priorités claires." },
  { d: "extraversion", t: "Je me sens à l'aise pour échanger avec des personnes que je ne connais pas." },
  { d: "extraversion", t: "J'aime travailler au sein d'une grande équipe animée." },
  { d: "extraversion", t: "Je préfère rester en retrait lors des réunions.", r: true },
  { d: "extraversion", t: "Je prends facilement la parole pour expliquer le fonctionnement d'un appareil à ses utilisateurs." },
  { d: "extraversion", t: "Une activité intense et variée me donne de l'énergie." },
  { d: "agreabilite", t: "Je fais preuve de patience face à un utilisateur pressé ou exigeant." },
  { d: "agreabilite", t: "J'aide spontanément mes collègues lorsqu'ils sont débordés." },
  { d: "agreabilite", t: "Je peux me montrer sec(che) ou impatient(e) avec les personnes qui me sollicitent.", r: true },
  { d: "agreabilite", t: "Je cherche le compromis en cas de désaccord dans l'équipe." },
  { d: "agreabilite", t: "Rendre service aux équipes qui dépendent de mon travail me motive." },
  { d: "stabilite", t: "Je reste calme lorsqu'une panne urgente doit être réglée rapidement." },
  { d: "stabilite", t: "Je me sens souvent submergé(e) par le stress.", r: true },
  { d: "stabilite", t: "Je récupère rapidement après une journée difficile." },
  { d: "stabilite", t: "Les critiques me déstabilisent longtemps.", r: true },
  { d: "stabilite", t: "Je garde mon sang-froid quand plusieurs demandes urgentes arrivent en même temps." },
  { d: "adaptation_medicale", t: "Je m'adapte facilement aux astreintes, aux horaires décalés et aux interventions de week-end." },
  { d: "adaptation_medicale", t: "Je sais intervenir avec discrétion dans un service en pleine activité." },
  { d: "adaptation_medicale", t: "Je respecte la hiérarchie et les procédures établies." },
  { d: "adaptation_medicale", t: "Changer de tâche ou de priorité au pied levé me pose problème.", r: true },
  { d: "adaptation_medicale", t: "Je respecte strictement la confidentialité des informations auxquelles j'ai accès." },
];

/** Questions du test selon le métier (technique : sans questions de soin) */
export const questionsTest = (technique: boolean) => (technique ? QUESTIONS_TECHNIQUES : QUESTIONS);

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

/** Formulations du portrait pour les métiers techniques (pas de vocabulaire de soin) */
const TXT_TECHNIQUE: Record<Dim, Record<Lvl, string>> = {
  ouverture: {
    h: "curieux(se) et ouvert(e) à l'innovation, vous aimez apprendre et suivre l'évolution des technologies",
    m: 'vous savez concilier méthodes éprouvées et nouveautés lorsque celles-ci ont fait leurs preuves',
    l: 'vous appréciez les cadres stables et les procédures bien établies, gages de fiabilité',
  },
  conscience: {
    h: 'Rigoureux(se) et organisé(e), vous accordez une grande importance à la précision, au respect des procédures et à la traçabilité.',
    m: 'Vous êtes globalement fiable et organisé(e), avec une marge de progression sur la planification des tâches.',
    l: 'Vous gagneriez à structurer davantage votre organisation et vos vérifications, essentielles pour la sécurité des équipements.',
  },
  extraversion: {
    h: "Communicatif(ve) et énergique, vous êtes à l'aise dans les échanges avec les utilisateurs et les équipes.",
    m: "Vous communiquez volontiers lorsque c'est utile tout en sachant travailler de façon autonome.",
    l: "Plutôt réservé(e), vous privilégiez l'écoute et la concentration, des atouts dans les postes techniques.",
  },
  agreabilite: {
    h: "Votre sens du service et de l'entraide fait de vous un(e) collègue apprécié(e) et un appui précieux pour les équipes.",
    m: "Vous savez être bienveillant(e) tout en restant ferme lorsque la situation l'exige.",
    l: "Direct(e) et franc(he), vous gagneriez à cultiver la patience et l'écoute avec les personnes qui vous sollicitent.",
  },
  stabilite: {
    h: "Vous gardez votre sang-froid face aux pannes urgentes et à la pression, une qualité majeure à l'hôpital.",
    m: 'Vous gérez correctement le stress, même si les périodes intenses peuvent vous éprouver.',
    l: 'Les situations de forte pression peuvent vous affecter : des techniques de gestion du stress vous seraient bénéfiques.',
  },
  adaptation_medicale: {
    h: "Enfin, vous êtes parfaitement adapté(e) aux contraintes de l'environnement hospitalier (astreintes, procédures, confidentialité).",
    m: "Enfin, vous vous adaptez convenablement aux contraintes de l'environnement hospitalier.",
    l: "Enfin, certaines contraintes de l'environnement hospitalier (astreintes, imprévus, changements de priorité) peuvent représenter un défi pour vous.",
  },
};

export function personalityPortrait(s: Scores, prenom = '', technique = false): string {
  const T = technique ? TXT_TECHNIQUE : TXT;
  let p = (prenom ? `${prenom}, v` : 'V') + `ous présentez un profil où ${T.ouverture[lvl(s.ouverture)]}. `;
  for (const d of ['conscience', 'extraversion', 'agreabilite', 'stabilite', 'adaptation_medicale'] as Dim[]) p += T[d][lvl(s[d])] + ' ';
  const top = [...DIM_KEYS].sort((a, b) => s[b] - s[a]).slice(0, 2);
  p += `Vos points forts : ${DIMENSIONS[top[0]].label.toLowerCase()} et ${DIMENSIONS[top[1]].label.toLowerCase()}.`;
  const postes: string[] = [];
  if (technique) {
    if (s.stabilite >= 65 && s.conscience >= 65) postes.push('interventions urgentes et astreintes (bloc, réanimation)');
    if (s.conscience >= 70) postes.push('maintenance préventive et contrôles qualité');
    if (s.agreabilite >= 65 && s.extraversion >= 55) postes.push('formation des utilisateurs et relation avec les services');
    if (postes.length) p += ` Missions recommandées : ${postes.join(' ; ')}.`;
    return p.trim();
  }
  if (s.stabilite >= 65 && s.conscience >= 65) postes.push('urgences, réanimation ou bloc opératoire');
  if (s.agreabilite >= 65 && s.extraversion >= 55) postes.push('pédiatrie, maternité ou gériatrie');
  if (s.conscience >= 70 && s.extraversion < 50) postes.push('laboratoire ou imagerie médicale');
  if (postes.length) p += ` Environnements recommandés : ${postes.join(' ; ')}.`;
  return p.trim();
}
