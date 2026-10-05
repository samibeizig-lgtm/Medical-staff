/**
 * Dr. Jobs – moteur local de réponses (instantané) + Workers AI optionnel pour les questions complexes.
 */
import { normalize } from './format';
import type { Env } from '../types';

export const CHATBOT_SYSTEM =
  "Tu es Dr. Jobs, l'assistant de la plateforme tunisienne Medical Staff, spécialisée dans le recrutement médical et paramédical. " +
  'Tu réponds en français, de façon concise (5 phrases maximum), bienveillante et concrète, sur le recrutement médical, les CV, ' +
  "les salaires en Tunisie (en TND), les diplômes paramédicaux, les entretiens et l'utilisation de la plateforme. " +
  'Si la question sort de ce cadre, recentre poliment la conversation.';

export const FALLBACK =
  "Je n'ai pas bien compris votre question 🤔. Je peux vous renseigner sur : la création de CV, les offres, les salaires, les diplômes paramédicaux, le test de personnalité, les entretiens ou l'abonnement des établissements.";

function intents(prix: string) {
  return [
    { k: ["bonjour", "salut", "bonsoir", "hello", "aslema", "salam", "coucou"], r: `Bonjour 👋 Je suis Dr. Jobs, votre assistant recrutement médical. Je peux vous aider sur les CV, les offres, les salaires, les diplômes, les entretiens ou l'utilisation de Medical Staff. Que puis-je faire pour vous ?` },
    { k: ["merci", "parfait", "super", "genial"], r: `Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Bonne chance dans vos démarches 🍀` },
    { k: ["inscri", "creer un compte", "creer mon compte", "ouvrir un compte", "s enregistrer"], r: `Pour vous inscrire : en tant que candidat, cliquez sur « Espace candidat › Créer un compte » (gratuit). En tant qu'établissement, utilisez « Espace établissement › Inscrire mon établissement », puis activez l'abonnement annuel.` },
    { k: ["postuler", "candidater", "candidature", "bouton verrouille", "verrouille"], r: `Pour postuler, il faut : 1) un CV complet (poste recherché + au moins un diplôme) et 2) avoir passé le test de personnalité. Ensuite, le bouton « Postuler » se déverrouille sur chaque offre. Vous recevrez un email de confirmation.` },
    { k: ["cv", "curriculum", "competence", "experience"], r: `Un bon CV paramédical précise : vos diplômes (avec l'établissement et la mention), vos stages et expériences avec les services (urgences, bloc, réanimation…), vos compétences techniques (pose de perfusion, asepsie, ECG…) et vos langues. Sur Medical Staff, remplissez chaque rubrique : les compétences comptent pour 45 % du score de matching IA.` },
    { k: ["salaire", "remuneration", "paye", "combien gagne", "tnd", "dinar"], r: `À titre indicatif en Tunisie (secteur privé, brut mensuel) : infirmier(ère) débutant(e) 900–1 300 TND, confirmé(e) 1 300–2 000 TND ; sage-femme 1 000–1 800 TND ; technicien(ne) anesthésiste 1 200–2 200 TND ; kinésithérapeute 1 000–2 000 TND. Les gardes, la spécialisation et la région font varier ces montants.` },
    { k: ["diplome", "licence", "formation", "etude", "issp", "esss", "equivalence"], r: `Les métiers paramédicaux en Tunisie requièrent généralement une licence délivrée par une ISSTS / ESSS (sciences infirmières, obstétrique, anesthésie-réanimation, imagerie, biologie, kinésithérapie…). Ajoutez la date d'obtention et la mention : les recruteurs filtrent la CVthèque par année de diplôme.` },
    { k: ["entretien", "rendez-vous", "rdv", "convocation"], r: `Conseils d'entretien : préparez des exemples concrets (gestion d'une urgence, d'un patient difficile), révisez les protocoles d'hygiène, renseignez-vous sur l'établissement et soyez ponctuel(le). Sur Medical Staff, vos entretiens apparaissent dans « Mes entretiens » où vous pouvez les valider ou les refuser.` },
    { k: ["test", "personnalite", "big five", "psychologique"], r: `Le test de personnalité compte 30 affirmations (≈ 5 min) et mesure 6 dimensions : ouverture, conscience, extraversion, agréabilité, stabilité émotionnelle et adaptation au milieu médical. Répondez spontanément : il est obligatoire pour postuler et apporte un bonus au matching IA.` },
    { k: ["abonnement", "prix", "tarif", "payer", "paiement", "1000"], r: `Les établissements de santé souscrivent un abonnement annuel de ${prix} TND, qui donne accès à la publication illimitée d'offres, à la CVthèque complète, aux suggestions IA et au calendrier d'entretiens. Pour les candidats, la plateforme est entièrement gratuite.` },
    { k: ["cvtheque", "chercher un candidat", "trouver un candidat", "recruter", "profil"], r: `La CVthèque permet de filtrer les candidats par poste, année d'obtention du diplôme, expérience minimale, salaire maximum et ville. Avec un abonnement actif, vous accédez au CV complet, au PDF et pouvez proposer un entretien en un clic.` },
    { k: ["ia", "intelligence artificielle", "matching", "suggestion", "score"], r: `Les suggestions IA (icône 🧠 sur chaque offre) classent les candidats recherchant le même poste selon : compétences 45 %, diplôme 25 %, expérience 20 % et un bonus personnalité jusqu'à 10 %. Les 5 meilleurs profils sont affichés avec leur pourcentage.` },
    { k: ["offre", "emploi", "poste", "travail", "job", "recrute"], r: `Consultez toutes les offres actives dans « Offres d'emploi » et filtrez par poste, gouvernorat, type de contrat et salaire minimum. Les rubriques populaires : jeunes diplômés, sages-femmes et techniciens anesthésistes.` },
    { k: ["sage-femme", "sage femme", "maternite", "obstetri"], r: `Les sages-femmes sont très recherchées par les cliniques et maternités, surtout à Tunis, Sfax et Sousse. Mettez en avant vos compétences : accouchement eutocique, suivi de grossesse, soins néonataux, allaitement. Filtrez les offres sur le poste « Sage-femme ».` },
    { k: ["anesthes", "reanimation", "bloc"], r: `Les techniciens supérieurs en anesthésie-réanimation sont parmi les profils les plus demandés. Valorisez l'anesthésie générale et locorégionale, l'intubation, la ventilation et le monitorage. Les blocs opératoires privés offrent souvent des rémunérations attractives avec gardes.` },
    { k: ["jeune diplome", "premier emploi", "debutant", "stage", "sivp", "sans experience"], r: `Jeune diplômé(e) ? Mettez en avant vos stages hospitaliers (services, durée, gestes réalisés), passez le test de personnalité et ciblez les offres « Débutant accepté », Stage ou SIVP. Un CV complet et une photo professionnelle font la différence.` },
    { k: ["confidential", "coordonnees", "anonym", "vie privee", "donnees"], r: `Vos données sont protégées : les visiteurs ne voient que des profils anonymisés (ID, poste, expérience, ville). Seuls les établissements abonnés accèdent au CV complet, et vous pouvez masquer vos coordonnées depuis « Modifier mon CV › Confidentialité ».` },
    { k: ["mot de passe", "connexion", "connecter", "deconnexion"], r: `Connectez-vous via « Espace candidat » ou « Espace établissement » avec votre email et mot de passe. Pour vous déconnecter, utilisez le menu de votre espace › Déconnexion.` },
    { k: ["lettre de motivation", "motivation"], r: `Une bonne lettre de motivation paramédicale tient en une page : 1) pourquoi cet établissement/service, 2) vos compétences clés illustrées par une expérience, 3) votre disponibilité et vos qualités humaines (empathie, rigueur, gestion du stress).` },
  ];
}

export function chatbotLocal(message: string, prix: string): string | null {
  const m = ' ' + normalize(message) + ' ';
  let best: string | null = null;
  let bestScore = 0;
  for (const i of intents(prix)) {
    let score = 0;
    for (const k of i.k) {
      const nk = normalize(k);
      if (nk && m.includes(nk)) score += nk.length;
    }
    if (score > bestScore) { bestScore = score; best = i.r; }
  }
  return best;
}

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export async function chatbotRemote(env: Env, history: ChatMsg[]): Promise<string | null> {
  if (env.CHATBOT_ENGINE !== 'workers-ai' || !env.AI) return null;
  try {
    const r = (await env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
      messages: [{ role: 'system', content: CHATBOT_SYSTEM }, ...history],
      max_tokens: 350,
    } as any)) as { response?: string };
    return r.response?.trim() || null;
  } catch (e) {
    console.error('Workers AI indisponible', e);
    return null;
  }
}
