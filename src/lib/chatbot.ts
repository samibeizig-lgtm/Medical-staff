/**
 * Dr. Jobs – assistant de medicalstaff.tn.
 *
 * 1. Analyse de la question : mots entiers (avec racines simples), expressions, métier et ville détectés.
 * 2. Réponses « vivantes » calculées sur les données du site (offres, profils, salaires publiés,
 *    état du profil de l'utilisateur connecté).
 * 3. Base de connaissances sur le fonctionnement de la plateforme.
 * 4. Question hors base : Workers AI (si activé), guidé par la base de connaissances ; sinon,
 *    une reformulation est proposée avec des sujets cliquables.
 * Le sujet et les critères de la question précédente sont mémorisés pour les relances
 * (« et à Sfax ? », « et pour une sage-femme ? »).
 */
import type { Env, User } from '../types';
import { all, one, val, TODAY } from './db';
import { DISPONIBILITES, GOUVERNORATS, POSTES } from './data';
import { normalize } from './format';
import { distanceKm, gouvernoratsDansRayon } from './proximite';

export type Lien = { label: string; url: string };
export type Entites = { postes?: string[]; metier?: string; ville?: string; dispo?: string; rayon?: number };
export type ChatMsg = { role: 'user' | 'assistant'; content: string; s?: string; e?: Entites };
export type Reponse = { reply: string; liens?: Lien[]; suggestions?: string[]; sujet?: string; entites?: Entites };
export type Contexte = { db: D1Database; env: Env; user: User | null; prix: string; history: ChatMsg[] };

/* ---------- Analyse du texte ---------- */
const racine = (w: string) => (w.length > 4 ? w.replace(/(es|s|x|e)$/, '') : w);
const mots = (s: string) => normalize(s).split(' ').filter(Boolean).map(racine);

/** Un mot-clé est présent s'il apparaît comme mot entier (ou expression), « xxx* » = préfixe */
function contient(m: string[], cle: string): boolean {
  const pref = cle.endsWith('*');
  const k = mots(pref ? cle.slice(0, -1) : cle);
  if (!k.length) return false;
  for (let i = 0; i + k.length <= m.length; i++) {
    let ok = true;
    for (let j = 0; j < k.length && ok; j++) {
      const last = j === k.length - 1;
      ok = pref && last ? m[i + j].startsWith(k[j]) : m[i + j] === k[j];
    }
    if (ok) return true;
  }
  return false;
}

const METIERS: [RegExp, string, (p: string) => boolean][] = [
  [/\bsurveillant\w*.*\bbloc/, 'surveillant(e) de bloc opératoire', (p) => p.includes('surveillant') && p.includes('bloc')],
  [/\bsurveillant\w*.*\bradio/, 'surveillant(e) de radiologie', (p) => p.includes('surveillant') && p.includes('radiologie')],
  [/\bsurveillant\w*.*\bnuit/, 'surveillant(e) de nuit', (p) => p.includes('surveillant') && p.includes('nuit')],
  [/\bsurveillant\w*.*\bgenera/, 'surveillant(e) général(e)', (p) => p.includes('surveillant') && p.includes('general')],
  [/\bsurveillant\w*.*\betage/, "surveillant(e) d'étage", (p) => p.includes('surveillant') && p.includes('etage')],
  [/\bsurveillant/, 'surveillant(e)', (p) => p.includes('surveillant')],
  [/\binfirmi\w*.*\burgence|\burgentiste/, 'infirmier(ère) aux urgences', (p) => p.includes('urgences')],
  [/\binfirmi\w*.*\bbloc|\bibode\b/, 'infirmier(ère) de bloc', (p) => p.includes('bloc operatoire') && p.includes('infirmier')],
  [/\binfirmi\w*.*\breanimation/, 'infirmier(ère) en réanimation', (p) => p.includes('infirmier') && p.includes('reanimation')],
  [/\binfirmi\w*.*\bpediatr/, 'infirmier(ère) en pédiatrie', (p) => p.includes('infirmier') && p.includes('pediatrie')],
  [/\binfirmi|\bide\b/, 'infirmier(ère)', (p) => p.startsWith('infirmier')],
  [/\btechnicien\w* (en |de )?pediatr|\bpediatrie\b/, 'technicien(ne) en pédiatrie', (p) => p.startsWith('technicien') && p.includes('pediatrie')],
  [/\bpanseu/, 'panseur(se)', (p) => p.includes('panseu')],
  [/\bsages? ?femmes?\b|\bmaieuti/, 'sage-femme', (p) => p.includes('sage femme')],
  [/\banesthesi|\btsar\b/, 'technicien(ne) en anesthésie-réanimation', (p) => p.includes('anesthesie')],
  [/\bradio\b|\bradiolog|\bimagerie|\bmanipulateur|\bscanner\b|\birm\b/, "technicien(ne) en imagerie", (p) => p.includes('imagerie')],
  [/\bpma\b|\bprocreation|\bfiv\b|\bembryolog/, 'technicien(ne) de laboratoire PMA', (p) => p.includes('pma')],
  [/\blabo\b|\blaborat|\blaborantin|\bbiolog/, 'technicien(ne) de laboratoire', (p) => p.includes('laboratoire')],
  [/\bsterilisation|\bsterilisat/, 'agent(e) de stérilisation', (p) => p.includes('sterilisation')],
  [/\bkine|\bphysiotherap/, 'kinésithérapeute', (p) => p.includes('kinesitherapeute')],
  [/\bdieteti|\bnutritionni/, 'diététicien(ne)', (p) => p.includes('dieteticien')],
  [/\bpreparat\w*|\bpharmacie\b/, 'préparateur(trice) en pharmacie', (p) => p.includes('pharmacie')],
  [/\baides? soignant/, 'aide-soignant(e)', (p) => p.includes('aide soignant')],
  [/\bauxiliaire|\bpuericult/, 'auxiliaire de puériculture', (p) => p.includes('auxiliaire')],
  [/\binstrumentist|\binstrumentation/, 'technicien(ne) en instrumentation', (p) => p.includes('instrumentation')],
  [/\bhygiene hospitaliere|\bhygieniste/, 'technicien(ne) en hygiène hospitalière', (p) => p.includes('hygiene hospitaliere')],
  [/\bassistant\w*( e)? dentaire/, 'assistant(e) dentaire', (p) => p.includes('assistant')],
  [/\bsecretaire/, 'secrétaire médical(e)', (p) => p.includes('secretaire')],
  [/\bambulanc/, 'ambulancier(ère)', (p) => p.includes('ambulancier')],
];

/** Villes et localités courantes → gouvernorat */
const LOCALITES: Record<string, string> = {
  hammamet: 'Nabeul', 'korba': 'Nabeul', djerba: 'Médenine', jerba: 'Médenine', zarzis: 'Médenine', kef: 'Le Kef',
  manouba: 'La Manouba', marsa: 'Tunis', carthage: 'Tunis', 'lac': 'Tunis', menzah: 'Ariana', ennasr: 'Ariana', 'rades': 'Ben Arous',
  msaken: 'Sousse', 'kantaoui': 'Sousse', moknine: 'Monastir', 'ksar hellal': 'Monastir', 'menzel bourguiba': 'Bizerte', 'el jem': 'Mahdia',
  metlaoui: 'Gafsa', 'nefta': 'Tozeur', 'douz': 'Kébili', tabarka: 'Jendouba', 'grand tunis': 'Tunis',
};

export function entites(message: string): Entites {
  const n = ' ' + normalize(message) + ' ';
  const e: Entites = {};
  for (const [re, label, f] of METIERS) {
    if (re.test(n)) { e.metier = label; e.postes = POSTES.filter((p) => f(normalize(p))); break; }
  }
  for (const g of [...GOUVERNORATS].sort((a, b) => b.length - a.length)) {
    if (n.includes(' ' + normalize(g) + ' ')) { e.ville = g; break; }
  }
  if (!e.ville) for (const [k, g] of Object.entries(LOCALITES)) if (n.includes(' ' + k + ' ')) { e.ville = g; break; }
  if (/\bimmediat|\btout de suite|\bdisponible maintenant|\burgent\b/.test(n)) e.dispo = DISPONIBILITES[0];
  if (/\b(pres|proches?|autour) de (chez )?(moi|ma ville)\b|\bma region\b|\bmon gouvernorat\b/.test(n)) e.rayon = 50;
  return e;
}

/* ---------- Base de connaissances ---------- */
type Intent = { id: string; k: string[]; fort?: string[]; r: (x: Contexte) => string; liens?: Lien[]; suggestions?: string[]; roles?: string[] };

function base(prix: string): Intent[] {
  return [
    { id: 'bonjour', k: ['bonjour', 'salut', 'bonsoir', 'hello', 'aslema', 'salam', 'coucou', 'hey'],
      r: (x) => `Bonjour 👋 Je suis Dr. Jobs, l'assistant de medicalstaff.tn. ${x.user?.type === 'recruteur' ? 'Je peux vous aider à trouver des profils, publier une offre ou planifier un entretien.' : 'Je peux vous indiquer les offres disponibles, les salaires, comment compléter votre profil ou préparer un entretien.'} Posez-moi votre question !`,
      suggestions: ['Offres infirmier à Tunis', 'Salaire sage-femme', 'Comment postuler ?'] },
    { id: 'merci', k: ['merci', 'parfait', 'super', 'genial', 'top', 'cool', 'ok merci'], r: () => `Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Bonne chance dans vos démarches 🍀` },
    { id: 'aurevoir', k: ['au revoir', 'bye', 'a bientot', 'bonne journee', 'bonne soiree'], r: () => `Au revoir et à bientôt sur medicalstaff.tn 👋` },
    { id: 'qui', k: ['qui es tu', 'tu es qui', 'robot', 'humain', 'dr jobs', 'assistant'], r: () => `Je suis Dr. Jobs, l'assistant automatique de medicalstaff.tn, la plateforme tunisienne de recrutement médical et paramédical. Je réponds à partir des informations et des données du site (offres, profils, salaires publiés).` },
    { id: 'inscription', k: ['inscri*', 'creer un compte', 'creer mon compte', 'ouvrir un compte', 's enregistrer', 'nouveau compte'], fort: ['inscri*'],
      r: () => `Candidat : « Espace candidat › Créer un compte » (gratuit, 1 minute). Établissement : « Établissement › Inscrire mon établissement », puis activation de l'abonnement annuel (${prix} TND).`,
      liens: [{ label: 'Créer un compte candidat', url: '/candidat/register' }, { label: 'Inscrire un établissement', url: '/recruteur/register' }] },
    { id: 'postuler', k: ['postuler', 'candidater', 'candidature', 'verrouille', 'bouton', 'peux pas postuler', 'envoyer mon cv'], fort: ['postuler', 'candidater', 'verrouille'],
      r: () => `Pour postuler, il faut : 1) un CV complet (poste recherché + au moins un diplôme) et 2) le test de personnalité. Le bouton « Postuler » se déverrouille alors sur chaque offre, et un email de confirmation vous est envoyé. Les QCM de compétences et l'entretien IA ne sont pas obligatoires mais améliorent votre classement.`,
      liens: [{ label: 'Rechercher des offres', url: '/candidat/offres' }], suggestions: ['Mon profil est-il complet ?'] },
    { id: 'qcm', k: ['qcm', 'quiz', 'chronometre', 'competences validees', 'valider une competence', 'valider mes competences', 'question chronometree', 'tester mes competences'], fort: ['qcm', 'quiz'],
      r: () => `Le QCM de compétences : 15 questions tirées au hasard sur votre métier et le tronc commun (hygiène, gestes d'urgence, sécurité du patient, secret professionnel), 30 secondes par question, sans retour en arrière. Une compétence est validée uniquement avec un sans-faute (3 bonnes réponses sur 3) et le reste. 2 QCM par semaine. Seules les compétences validées figurent sur le CV et comptent pour 45 % du matching.`,
      liens: [{ label: 'Passer un QCM', url: '/candidat/qcm' }] },
    { id: 'competence', k: ['competence', 'ajouter une competence', 'mes competences', 'savoir faire'],
      r: () => `Sur medicalstaff.tn, les compétences ne se déclarent pas : elles s'obtiennent en réussissant les QCM chronométrés de votre métier (menu « QCM compétences »). Les établissements voient la mention « validée par QCM » sur votre CV.`,
      liens: [{ label: 'Valider des compétences', url: '/candidat/qcm' }] },
    { id: 'entretien_ia', k: ['entretien ia', 'entretien oral', 'communication', 'micro', 'oral', 'whisper', 'score de communication'], fort: ['entretien ia', 'communication'],
      r: () => `L'entretien IA : 5 questions de mise en situation adaptées à votre métier, découvertes au moment où l'enregistrement démarre (pas de temps de préparation), réponses uniquement à l'oral (2 min max). L'IA évalue la clarté, la structure, l'empathie, le vocabulaire professionnel et l'adaptation. Le score est visible par les recruteurs et compte dans le bonus du matching. 2 passages par 24 h.`,
      liens: [{ label: "Passer l'entretien IA", url: '/candidat/entretien-ia' }] },
    { id: 'test', k: ['test de personnalite', 'personnalite', 'big five', 'psychologique', 'test psychotechnique', 'test'], fort: ['personnalite', 'big five'],
      r: () => `Le test de personnalité compte 30 affirmations (environ 5 minutes) et mesure 6 dimensions : ouverture, conscience professionnelle, extraversion, agréabilité, stabilité émotionnelle et adaptation au milieu médical. Il est obligatoire pour postuler. Répondez spontanément, il n'y a pas de bonne ou de mauvaise réponse ; vous pouvez le repasser.`,
      liens: [{ label: 'Passer le test', url: '/candidat/test' }] },
    { id: 'proximite', k: ['distance', 'proximite', 'pres de chez moi', 'proche de chez moi', 'loin', 'km', 'kilometre*', 'rayon'], fort: ['distance', 'proximite'],
      r: () => `La proximité du lieu de travail compte pour 15 % du score de matching : 100 % jusqu'à 25 km, puis de moins en moins jusqu'à 300 km (distance à vol d'oiseau entre gouvernorats). Le filtre « Distance max. » (25 à 200 km) existe dans la recherche d'offres et dans la CVthèque.` },
    { id: 'matching', k: ['ia', 'intelligence artificielle', 'matching', 'suggestion*', 'score', 'classement', 'pourcentage'], fort: ['matching', 'suggestion*'],
      r: () => `Les suggestions IA 🧠 classent, pour chaque offre, les candidats qui recherchent ce poste : compétences requises validées par QCM 45 %, diplôme 20 %, expérience 20 %, proximité 15 %, plus un bonus jusqu'à 10 % (test de personnalité et entretien IA). Les 5 meilleurs profils sont affichés avec le détail du score.` },
    { id: 'cv', k: ['cv', 'curriculum', 'modifier mon cv', 'remplir mon cv', 'photo', 'diplome', 'experience', 'langue'], fort: ['cv', 'curriculum'],
      r: () => `Un CV complet sur medicalstaff.tn = poste recherché + au moins un diplôme (obligatoire pour postuler). Ajoutez aussi : photo professionnelle, expériences avec le service (urgences, bloc, réanimation…), langues, gouvernorat (utilisé pour la proximité), disponibilité et salaire souhaité. Les compétences, elles, se valident par QCM.`,
      liens: [{ label: 'Modifier mon CV', url: '/candidat/cv' }] },
    { id: 'diplome', k: ['diplome', 'licence', 'formation', 'etude*', 'issbat', 'esss', 'isss', 'equivalence', 'master', 'bts'], fort: ['diplome', 'equivalence'],
      r: () => `En Tunisie, les métiers paramédicaux demandent en général une licence d'un Institut / École supérieure des sciences de la santé (sciences infirmières, obstétrique, anesthésie-réanimation, imagerie, biologie, kinésithérapie…). Indiquez la date d'obtention et la mention dans votre CV : les établissements peuvent filtrer par diplôme et par année. Pour un diplôme étranger, l'équivalence relève du ministère de l'Enseignement supérieur.` },
    { id: 'conseils_entretien', k: ['conseil* entretien', 'preparer un entretien', 'preparer mon entretien', 'reussir un entretien', 'question* entretien', 'entretien d embauche'], fort: ['preparer', 'reussir'],
      r: () => `Pour réussir un entretien : préparez 2 ou 3 exemples concrets (une urgence gérée, un patient difficile, un travail d'équipe), révisez les protocoles d'hygiène et de sécurité du patient, renseignez-vous sur l'établissement et le service, et préparez vos questions (horaires, gardes, intégration). Soyez ponctuel(le). Vous pouvez vous entraîner avec l'entretien IA.`,
      liens: [{ label: "S'entraîner avec l'entretien IA", url: '/candidat/entretien-ia' }] },
    { id: 'mes_entretiens', k: ['mes entretiens', 'rendez vous', 'rdv', 'convocation', 'confirmer un entretien', 'refuser un entretien', 'entretien'],
      r: (x) => x.user?.type === 'recruteur'
        ? `Planifiez un entretien depuis un CV, une candidature ou les suggestions IA : le calendrier propose des créneaux de 30 minutes entre 8h et 18h et refuse les chevauchements. Le candidat est prévenu par email et peut confirmer ou refuser.`
        : `Les entretiens proposés par les établissements apparaissent dans « Mes entretiens », avec la date, le lieu et le contact. Vous pouvez les confirmer ou les refuser ; l'établissement est prévenu par email.`,
      liens: [] },
    { id: 'abonnement', k: ['abonnement', 'prix', 'tarif', 'payer', 'paiement', 'combien coute', 'cout', 'gratuit', 'facture'], fort: ['abonnement', 'tarif'],
      r: () => `Pour les candidats, la plateforme est entièrement gratuite. Les établissements souscrivent un abonnement annuel de ${prix} TND : publication d'offres illimitée, CVthèque complète (CV, PDF, coordonnées), suggestions IA et calendrier d'entretiens. Sans abonnement, un établissement voit uniquement les profils anonymisés.`,
      liens: [{ label: "Voir l'abonnement", url: '/recruteur/abonnement' }] },
    { id: 'cvtheque', k: ['cvtheque', 'chercher un candidat', 'trouver un candidat', 'recherche de profil', 'chercher un profil', 'trouver un profil', 'filtrer les candidats', 'critere*'], fort: ['cvtheque'],
      r: () => `La CVthèque permet de combiner de nombreux critères : poste, ville et distance maximale, disponibilité, expérience minimale et maximale, compétence validée par QCM, diplôme et année, langue et niveau, salaire maximum, score de communication, test de personnalité, mot-clé (service, établissement) et profils actifs récemment. Les résultats se trient par expérience, proximité, communication ou compétences.`,
      liens: [{ label: 'Ouvrir la CVthèque', url: '/recruteur/cvtheque' }] },
    { id: 'publier', k: ['publier une offre', 'publier', 'deposer une offre', 'creer une offre', 'nouvelle offre', 'annonce'], fort: ['publier', 'annonce'],
      r: () => `Pour publier une offre : « Mon établissement › Mes offres › Nouvelle offre » (abonnement actif requis). Choisissez le métier, le contrat, le lieu, le salaire, le diplôme, l'expérience et les compétences requises (catalogue des compétences validées par QCM). Consultez ensuite les suggestions IA 🧠 de l'offre.`,
      liens: [{ label: 'Publier une offre', url: '/recruteur/offre' }] },
    { id: 'jeune', k: ['jeune diplome', 'premier emploi', 'debutant', 'stage', 'sivp', 'sans experience', 'etudiant'], fort: ['sivp', 'debutant', 'stage', 'jeune diplome'],
      r: () => `Jeune diplômé(e) ? Détaillez vos stages hospitaliers (service, durée, gestes réalisés), validez vos compétences par QCM, passez le test et l'entretien IA, puis filtrez les offres « Stage » ou « SIVP » et celles qui acceptent les débutants (expérience min. 0).`,
      liens: [{ label: 'Offres de stage', url: '/offres?contrat=Stage' }, { label: 'Offres SIVP', url: '/offres?contrat=SIVP' }] },
    { id: 'confidentialite', k: ['confidential*', 'coordonnee*', 'anonym*', 'vie privee', 'donnee*', 'masquer', 'qui voit mon cv'], fort: ['confidential*', 'anonym*', 'qui voit', 'qui peut voir', 'visible*'],
      r: () => `Le public ne voit que des profils anonymisés (référence, poste, expérience, ville). Le CV complet n'est visible que par les établissements abonnés ou ceux à qui vous avez postulé, et vous pouvez masquer vos coordonnées dans « Mon CV › Confidentialité ». L'audio de l'entretien IA n'est pas conservé.` },
    { id: 'mot_de_passe', k: ['mot de passe', 'oublie', 'reinitialiser', 'connexion', 'connecter', 'deconnexion', 'compte bloque'], fort: ['mot de passe', 'oublie'],
      r: () => `Mot de passe oublié : utilisez le lien « Mot de passe oublié ? » sur la page de connexion ; vous recevez un lien valable 1 heure. Après 5 tentatives échouées, la connexion est bloquée 15 minutes.`,
      liens: [{ label: 'Mot de passe oublié', url: '/mot-de-passe-oublie' }] },
    { id: 'lettre', k: ['lettre de motivation', 'motivation'], fort: ['lettre de motivation'],
      r: () => `Une lettre de motivation paramédicale tient en une page : 1) pourquoi cet établissement et ce service, 2) vos compétences clés illustrées par une expérience concrète, 3) vos qualités humaines (empathie, rigueur, gestion du stress) et votre disponibilité.` },
    { id: 'contact', k: ['contact', 'contacter', 'email', 'telephone', 'support', 'reclamation', 'probleme technique'],
      r: () => `Vous pouvez écrire à contact@medicalstaff.tn. Décrivez votre problème (page concernée, message affiché) pour une réponse plus rapide.` },
  ];
}

function scorer(m: string[], it: Intent): number {
  let s = 0;
  for (const k of it.k) if (contient(m, k)) s += k.includes(' ') ? 2 : 1;
  for (const k of it.fort ?? []) if (contient(m, k)) s += 2;
  return s;
}

/* ---------- Réponses calculées sur les données du site ---------- */
const OFFRE_ACTIVE = `o.active = 1 AND (o.date_limite IS NULL OR o.date_limite >= ${TODAY})`;
const inPh = (l: readonly unknown[]) => l.map(() => '?').join(',');
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');

/** Ordres de grandeur indicatifs (secteur privé, brut mensuel en TND) si aucune offre ne publie de salaire */
const GRILLE: [RegExp, string][] = [
  [/infirmier/, '900 à 1 300 TND en début de carrière, 1 300 à 2 000 TND avec expérience ou spécialisation'],
  [/sage femme/, '1 000 à 1 800 TND'],
  [/anesthesie/, '1 200 à 2 200 TND'],
  [/kinesitherapeute/, '1 000 à 2 000 TND'],
  [/imagerie|laboratoire|instrumentation|hygiene/, '900 à 1 700 TND'],
  [/aide soignant|auxiliaire|secretaire|ambulancier|assistant/, '600 à 1 100 TND'],
];

async function repOffres(x: Contexte, e: Entites): Promise<Reponse> {
  const where = [OFFRE_ACTIVE];
  const params: unknown[] = [];
  if (e.postes?.length) { where.push(`o.titre IN (${inPh(e.postes)})`); params.push(...e.postes); }
  const zone = e.ville && e.rayon ? gouvernoratsDansRayon(e.ville, e.rayon) : null;
  if (zone) { where.push(`o.ville IN (${inPh(zone)})`); params.push(...zone); }
  else if (e.ville) { where.push('o.ville = ?'); params.push(e.ville); }
  const w = where.join(' AND ');
  const [n, rows] = await Promise.all([
    val<number>(x.db, `SELECT COUNT(*) FROM offres o WHERE ${w}`, ...params),
    all<any>(x.db, `SELECT o.id, o.titre, o.ville, o.type_contrat, o.salaire_min, o.salaire_max, r.nom_etablissement FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id WHERE ${w} ORDER BY o.created_at DESC LIMIT 3`, ...params),
  ]);
  const quoi = e.metier ? `pour ${e.metier}` : '';
  const ou = zone ? `à moins de ${e.rayon} km de ${e.ville}` : e.ville ? `à ${e.ville}` : 'en Tunisie';
  const base = x.user?.type === 'candidat' ? '/candidat/offres' : '/offres';
  const qs = new URLSearchParams();
  // Un seul intitulé trouvé : le lien filtre directement sur ce poste
  const titres = [...new Set(rows.map((o) => o.titre as string))];
  const poste = e.postes?.length === 1 ? e.postes[0] : e.postes?.length && n === titres.length && titres.length === 1 ? titres[0] : '';
  if (poste) qs.set('poste', poste); else if (x.user?.type === 'candidat') qs.set('poste', '');
  if (e.ville) qs.set('ville', e.ville);
  // Le filtre de distance de la recherche candidat part de la ville choisie
  if (zone && x.user?.type === 'candidat') { qs.set('rayon', String(e.rayon)); }
  else if (zone) qs.delete('ville');
  const url = qs.toString() ? `${base}?${qs}` : base;
  if (n) {
    const liste = rows.map((o) => `• ${o.titre} – ${o.nom_etablissement} (${o.ville}, ${o.type_contrat}${o.salaire_min || o.salaire_max ? `, ${o.salaire_min ? fmt(o.salaire_min) : '…'}–${o.salaire_max ? fmt(o.salaire_max) : '…'} TND` : ''})`).join('\n');
    return { reply: `Il y a actuellement ${n} offre(s) active(s) ${quoi} ${ou}${n > 3 ? ', dont les plus récentes' : ''} :\n${liste}`.replace(/\s+:/, ' :').replace(/ {2,}/g, ' '),
      liens: [{ label: `Voir ${n > 1 ? 'les offres' : "l'offre"}`, url }], sujet: 'offres', entites: e };
  }
  // Aucune offre ici : on cherche les plus proches pour ce métier
  if (e.ville) {
    const ailleurs = await all<any>(x.db, `SELECT o.ville, COUNT(*) AS n FROM offres o WHERE ${OFFRE_ACTIVE}${e.postes?.length ? ` AND o.titre IN (${inPh(e.postes)})` : ''} GROUP BY o.ville`, ...(e.postes ?? []));
    const proches = ailleurs.map((a) => ({ ...a, d: distanceKm(e.ville, a.ville) ?? 999 })).sort((a, b) => a.d - b.d).slice(0, 3);
    if (proches.length) {
      return { reply: `Aucune offre active ${quoi} à ${e.ville} pour le moment. Les plus proches : ${proches.map((p) => `${p.ville} (${p.n} offre${p.n > 1 ? 's' : ''}, ≈ ${p.d} km)`).join(', ')}. Astuce : complétez votre profil, les établissements de votre région peuvent aussi vous trouver dans la CVthèque.`.replace(/ {2,}/g, ' '),
        liens: [{ label: `Offres à ${proches[0].ville}`, url: `${base}?${new URLSearchParams({ ...(e.postes?.length === 1 ? { poste: e.postes[0] } : x.user?.type === 'candidat' ? { poste: '' } : {}), ville: proches[0].ville })}` }], sujet: 'offres', entites: e };
    }
  }
  return { reply: `Aucune offre active ${quoi} ${ou} pour le moment. Les établissements publient régulièrement : complétez votre profil (CV, QCM, test) pour être visible dans la CVthèque et dans les suggestions IA.`.replace(/ {2,}/g, ' '),
    liens: [{ label: 'Toutes les offres', url: base }], sujet: 'offres', entites: e };
}

async function repSalaire(x: Contexte, e: Entites): Promise<Reponse> {
  if (!e.postes?.length) {
    return { reply: `Les salaires dépendent beaucoup du métier. Ordres de grandeur indicatifs (secteur privé, brut mensuel) : infirmier(ère) 900–2 000 TND, sage-femme 1 000–1 800 TND, technicien(ne) anesthésiste 1 200–2 200 TND, kinésithérapeute 1 000–2 000 TND, aide-soignant(e) 600–1 100 TND. Précisez un métier pour voir les salaires réellement proposés sur le site.`,
      suggestions: ['Salaire infirmier', 'Salaire sage-femme', 'Salaire anesthésiste'], sujet: 'salaire', entites: e };
  }
  const where = [OFFRE_ACTIVE, `o.titre IN (${inPh(e.postes)})`, '(o.salaire_min IS NOT NULL OR o.salaire_max IS NOT NULL)'];
  const params: unknown[] = [...e.postes];
  if (e.ville) { where.push('o.ville = ?'); params.push(e.ville); }
  const s = await one<any>(x.db, `SELECT COUNT(*) AS n, MIN(COALESCE(o.salaire_min, o.salaire_max)) AS mini, MAX(COALESCE(o.salaire_max, o.salaire_min)) AS maxi,
      AVG((COALESCE(o.salaire_min, o.salaire_max) + COALESCE(o.salaire_max, o.salaire_min)) / 2.0) AS moy FROM offres o WHERE ${where.join(' AND ')}`, ...params);
  const p = normalize(e.postes[0]);
  const grille = GRILLE.find(([re]) => re.test(p))?.[1];
  const ref = grille ? `Ordre de grandeur indicatif sur le marché (privé, brut mensuel) : ${grille}. ` : '';
  const ou = e.ville ? ` à ${e.ville}` : '';
  if (s?.n) {
    return { reply: `D'après ${s.n} offre(s) active(s) publiée(s) sur medicalstaff.tn pour ${e.metier}${ou} : de ${fmt(s.mini)} à ${fmt(s.maxi)} TND par mois, ${fmt(s.moy)} TND en moyenne. ${ref}Les gardes, la spécialisation, l'expérience et la région font varier le salaire.`,
      liens: [{ label: 'Voir ces offres', url: `${x.user?.type === 'candidat' ? '/candidat/offres' : '/offres'}?${new URLSearchParams({ ...(e.postes.length === 1 ? { poste: e.postes[0] } : {}), ...(e.ville ? { ville: e.ville } : {}) })}` }], sujet: 'salaire', entites: e };
  }
  return { reply: `Aucune offre publiée en ce moment n'indique de salaire pour ${e.metier}${ou}. ${ref || 'Je n\'ai pas de référence fiable pour ce métier. '}Les gardes, la spécialisation, l'expérience et la région font varier le salaire.`.replace(/ {2,}/g, ' '),
    sujet: 'salaire', entites: e };
}

async function repProfils(x: Contexte, e: Entites): Promise<Reponse> {
  const where = ["c.poste_recherche IS NOT NULL", "c.poste_recherche <> ''"];
  const params: unknown[] = [];
  if (e.postes?.length) { where.push(`c.poste_recherche IN (${inPh(e.postes)})`); params.push(...e.postes); }
  if (e.ville) { where.push('c.ville = ?'); params.push(e.ville); }
  if (e.dispo) { where.push('c.disponibilite = ?'); params.push(e.dispo); }
  const n = (await val<number>(x.db, `SELECT COUNT(*) FROM candidats c WHERE ${where.join(' AND ')}`, ...params)) ?? 0;
  let proches = 0;
  if (e.ville) {
    const autour = gouvernoratsDansRayon(e.ville, 50);
    const w2 = where.filter((c) => c !== 'c.ville = ?');
    const p2 = params.filter((p) => p !== e.ville);
    proches = (await val<number>(x.db, `SELECT COUNT(*) FROM candidats c WHERE ${w2.join(' AND ')} AND c.ville IN (${inPh(autour)})`, ...p2, ...autour)) ?? 0;
  }
  const qui = e.metier ? `${e.metier}` : 'professionnel(le)s de santé';
  const dispo = e.dispo ? ' disponibles immédiatement' : '';
  const recruteur = x.user?.type === 'recruteur';
  const qs = new URLSearchParams({ ...(e.postes?.length === 1 ? { poste: e.postes[0] } : {}), ...(e.ville ? { ville: e.ville } : {}), ...(e.dispo ? { dispo: e.dispo } : {}) });
  return {
    reply: `${n} profil(s) ${qui}${dispo}${e.ville ? ` à ${e.ville}` : ' inscrits'} sur medicalstaff.tn${e.ville && proches > n ? `, ${proches} dans un rayon de 50 km` : ''}. ${recruteur ? 'Affinez dans la CVthèque : disponibilité, expérience, compétence validée, diplôme, langue, communication…' : 'Les établissements abonnés peuvent les rechercher dans la CVthèque multicritère.'}`,
    liens: recruteur ? [{ label: 'Ouvrir la CVthèque filtrée', url: `/recruteur/cvtheque?${qs}${e.ville && proches > n ? '&rayon=50' : ''}` }] : [{ label: "Demandes d'emploi (anonymisées)", url: `/demandes?${qs}` }],
    sujet: 'profils', entites: e,
  };
}

async function repMonProfil(x: Contexte): Promise<Reponse | null> {
  const u = x.user;
  if (u?.type === 'candidat') {
    const c = await one<any>(x.db, `SELECT c.id, c.poste_recherche, c.ville, c.disponibilite,
        (SELECT COUNT(*) FROM diplomes d WHERE d.candidat_id = c.id) AS nb_dip,
        (SELECT 1 FROM tests_personnalite t WHERE t.candidat_id = c.id) AS test,
        (SELECT COUNT(*) FROM competences k WHERE k.candidat_id = c.id) AS nb_comp,
        (SELECT score_global FROM entretiens_ia e WHERE e.candidat_id = c.id AND e.statut = 'termine' ORDER BY e.id DESC LIMIT 1) AS comm,
        (SELECT COUNT(*) FROM candidatures ca WHERE ca.candidat_id = c.id) AS nb_cand,
        (SELECT COUNT(*) FROM entretiens en WHERE en.candidat_id = c.id AND en.statut = 'en_attente') AS nb_ent
      FROM candidats c WHERE c.utilisateur_id = ?`, u.id);
    if (!c) return null;
    const cvOk = c.poste_recherche && c.nb_dip > 0;
    const l: string[] = [
      `${cvOk ? '✅' : '❌'} CV complet${cvOk ? '' : ' (poste recherché + au moins un diplôme)'}`,
      `${c.test ? '✅' : '❌'} Test de personnalité`,
      `${c.nb_comp ? '✅' : '⬜'} ${c.nb_comp} compétence(s) validée(s) par QCM`,
      `${c.comm !== null ? '✅' : '⬜'} Entretien IA${c.comm !== null ? ` : ${c.comm}/100` : ' non passé'}`,
      `${c.ville ? '✅' : '⬜'} Gouvernorat${c.ville ? ` : ${c.ville}` : ' non renseigné (utile pour la proximité)'}`,
    ];
    const liens: Lien[] = [];
    if (!cvOk) liens.push({ label: 'Compléter mon CV', url: '/candidat/cv' });
    if (!c.test) liens.push({ label: 'Passer le test', url: '/candidat/test' });
    if (!c.nb_comp) liens.push({ label: 'Passer un QCM', url: '/candidat/qcm' });
    if (c.comm === null) liens.push({ label: "Passer l'entretien IA", url: '/candidat/entretien-ia' });
    if (cvOk && c.test) liens.push({ label: 'Voir les offres', url: '/candidat/offres' });
    return { reply: `Votre profil :\n${l.join('\n')}\n${cvOk && c.test ? `Vous pouvez postuler. ${c.nb_cand} candidature(s) envoyée(s)${c.nb_ent ? `, ${c.nb_ent} entretien(s) à confirmer` : ''}.` : 'Il manque des éléments obligatoires pour postuler.'}`, liens, sujet: 'profil' };
  }
  if (u?.type === 'recruteur') {
    const r = await one<any>(x.db, `SELECT r.id, (SELECT MAX(a.date_fin) FROM abonnements a WHERE a.recruteur_id = r.id AND a.statut = 'actif' AND a.date_fin >= ${TODAY}) AS fin,
        (SELECT COUNT(*) FROM offres o WHERE o.recruteur_id = r.id AND ${OFFRE_ACTIVE}) AS nb_off,
        (SELECT COUNT(*) FROM candidatures ca JOIN offres o ON o.id = ca.offre_id WHERE o.recruteur_id = r.id AND ca.statut = 'envoyee') AS nb_new,
        (SELECT COUNT(*) FROM entretiens en WHERE en.recruteur_id = r.id AND en.date_debut >= datetime('now', '+1 hour')) AS nb_ent
      FROM recruteurs r WHERE r.utilisateur_id = ?`, u.id);
    if (!r) return null;
    return { reply: `Votre établissement : abonnement ${r.fin ? `actif jusqu'au ${r.fin.split('-').reverse().join('/')}` : 'inactif'}, ${r.nb_off} offre(s) active(s), ${r.nb_new} nouvelle(s) candidature(s) non consultée(s), ${r.nb_ent} entretien(s) à venir.`,
      liens: [{ label: 'Mes candidatures', url: '/recruteur/candidatures' }, ...(r.fin ? [] : [{ label: "Activer l'abonnement", url: '/recruteur/abonnement' }])], sujet: 'profil' };
  }
  return { reply: `Connectez-vous à votre espace pour que je puisse vérifier votre profil.`, liens: [{ label: 'Espace candidat', url: '/candidat/login' }, { label: 'Espace établissement', url: '/recruteur/login' }], sujet: 'profil' };
}

async function repStats(x: Contexte): Promise<Reponse> {
  const s = await one<any>(x.db, `SELECT (SELECT COUNT(*) FROM offres o WHERE ${OFFRE_ACTIVE}) AS offres,
      (SELECT COUNT(*) FROM candidats WHERE poste_recherche IS NOT NULL) AS candidats, (SELECT COUNT(*) FROM recruteurs) AS etab`);
  return { reply: `medicalstaff.tn compte actuellement ${s.offres} offre(s) active(s), ${s.candidats} professionnel(le)s de santé inscrit(e)s et ${s.etab} établissement(s).`, sujet: 'stats' };
}

/* ---------- Aiguillage ---------- */
const DEM_OFFRES = ['offre*', 'emploi', 'poste', 'travail', 'job', 'boulot', 'recrute', 'embauche', 'cherche du travail', 'trouver du travail', 'chercher un emploi', 'vacance*', 'recrutement'];
const DEM_SALAIRE = ['salaire*', 'remuneration', 'paye', 'gagne', 'combien gagne', 'tnd', 'dinar*', 'revenu'];
const DEM_PROFILS = ['candidat*', 'profil*', 'cv disponible*', 'recruter', 'trouver un', 'chercher un', 'cherche un', 'cherche une', 'besoin d un', 'besoin d une', 'combien de'];
const DEM_MONPROFIL = ['mon profil', 'mon compte', 'mon cv est', 'profil complet', 'ma situation', 'mes candidatures', 'mon abonnement', 'ou j en suis', 'il me manque', 'que me manque', 'pourquoi je ne peux pas'];
const DEM_STATS = ['combien d offre*', 'combien d inscrit*', 'combien de candidat* inscrit*', 'statistique*', 'nombre d offre*'];

export async function repondre(x: Contexte, message: string): Promise<Reponse | null> {
  const m = mots(message);
  const has = (l: string[]) => l.some((k) => contient(m, k));
  let e = entites(message);
  if (e.rayon && !e.ville && x.user?.type === 'candidat') {
    e.ville = (await val<string>(x.db, 'SELECT ville FROM candidats WHERE utilisateur_id = ?', x.user.id)) ?? undefined;
    if (!e.ville) return { reply: "Indiquez votre gouvernorat dans votre CV pour que je puisse chercher les offres proches de chez vous, ou précisez une ville (ex. « offres à Sousse »).", liens: [{ label: 'Compléter mon CV', url: '/candidat/cv' }], sujet: 'offres' };
  }
  if (e.rayon && !e.ville) delete e.rayon;
  const intents = base(x.prix);
  const scores = intents.map((it) => ({ it, s: scorer(m, it) })).sort((a, b) => b.s - a.s);
  const meilleur = scores[0];

  // Relance courte (« et à Sfax ? », « et pour une sage-femme ? ») : on reprend le sujet précédent
  const prec = [...x.history].reverse().find((h) => h.role === 'assistant' && h.s);
  const relance = m.length <= 6 && (e.ville || e.metier || e.dispo) && meilleur.s === 0 && !has(DEM_OFFRES) && !has(DEM_SALAIRE);
  if (relance && prec?.s && ['offres', 'salaire', 'profils'].includes(prec.s)) {
    e = { ...prec.e, ...e };
    if (prec.s === 'offres') return repOffres(x, e);
    if (prec.s === 'salaire') return repSalaire(x, e);
    return repProfils(x, e);
  }

  if (has(DEM_MONPROFIL)) return repMonProfil(x);
  if (has(DEM_STATS) && !e.metier && !e.ville) return repStats(x);
  if (has(DEM_SALAIRE)) return repSalaire(x, e);
  // Profils : surtout pour les établissements (« je cherche une sage-femme à Sousse »)
  const veutProfils = has(['candidat*', 'profil*', 'cvtheque']) || (x.user?.type === 'recruteur' && (e.metier || has(DEM_PROFILS)) && !has(['offre*']));
  if (veutProfils && (e.metier || e.ville || e.dispo || has(['combien de']))) return repProfils(x, e);
  if (has(DEM_OFFRES) || ((e.metier || e.ville) && meilleur.s < 2)) {
    if (!(meilleur.s >= 3 && !e.metier && !e.ville)) return repOffres(x, e);
  }
  if (meilleur.s > 0) {
    const it = meilleur.it;
    return { reply: it.r(x), liens: it.liens?.length ? it.liens : undefined, suggestions: it.suggestions, sujet: it.id };
  }
  return null;
}

/** Faits fiables transmis à l'IA pour les questions hors base */
export function connaissances(x: Contexte): string {
  return base(x.prix).filter((i) => !['bonjour', 'merci', 'aurevoir'].includes(i.id)).map((i) => '- ' + i.r(x)).join('\n');
}

export const FALLBACK: Reponse = {
  reply: "Je n'ai pas bien compris votre question 🤔. Pouvez-vous la reformuler en précisant, si possible, le métier et la ville ? Par exemple : « offres de sage-femme à Sousse », « salaire infirmier », « comment valider mes compétences ? ».",
  suggestions: ['Offres près de chez moi', 'Salaire infirmier', 'Mon profil est-il complet ?', 'Abonnement établissement'],
};

export const CHATBOT_SYSTEM =
  "Tu es Dr. Jobs, l'assistant de medicalstaff.tn, plateforme tunisienne de recrutement médical et paramédical. " +
  'Réponds en français, en 4 phrases maximum, de façon précise, bienveillante et concrète. ' +
  "Pour tout ce qui concerne le fonctionnement du site, appuie-toi UNIQUEMENT sur les faits ci-dessous ; n'invente jamais de fonctionnalité, de prix, de chiffre ni de lien. " +
  "Si tu ne sais pas, dis-le et propose d'écrire à contact@medicalstaff.tn. " +
  'Hors du domaine (recrutement, carrière et métiers de la santé en Tunisie), recentre poliment.';

export async function chatbotRemote(x: Contexte, history: ChatMsg[]): Promise<string | null> {
  const env = x.env;
  if (env.CHATBOT_ENGINE !== 'workers-ai' || !env.AI) return null;
  const messages = [
    { role: 'system', content: `${CHATBOT_SYSTEM}\n\nFAITS SUR LA PLATEFORME :\n${connaissances(x)}` },
    ...history.map((h) => ({ role: h.role, content: h.content })),
  ];
  for (const model of ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct-fast']) {
    try {
      const r = (await env.AI.run(model as any, { messages, max_tokens: 300, temperature: 0.2 } as any)) as { response?: string };
      const t = r.response?.trim();
      if (t) return t;
    } catch (e) {
      console.error('Workers AI indisponible', model, e);
    }
  }
  return null;
}
