/**
 * Charge les données de démonstration dans la base D1.
 * Usage : npm run seed:local   ou   npm run seed:remote
 *         (option --print : affiche seulement le SQL)
 * Comptes créés (mot de passe : demo1234)
 *   - administrateur : admin@demo.tn
 *   - candidats : amira@demo.tn, youssef@demo.tn, salma@demo.tn, mehdi@demo.tn, ines@demo.tn
 *   - établissements : clinique@demo.tn (abonné), hopital@demo.tn (non abonné)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { hashPassword } from '../src/lib/crypto.ts';
import { FAMILLES_QCM, TRONC_COMMUN } from '../src/lib/qcm-banque.ts';
import { DIM_KEYS, QUESTIONS, personalityPortrait, personalityScores } from '../src/lib/personality.ts';

const s = (v: unknown) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const tunis = (days = 0) => new Date(Date.now() + 3600_000 + days * 86400_000);
const d = (days = 0) => tunis(days).toISOString().slice(0, 10);
const dt = (days = 0) => tunis(days).toISOString().slice(0, 19).replace('T', ' ');

const pass = await hashPassword('demo1234');
const out: string[] = [
  '-- Données de démonstration Medical Staff',
  "DELETE FROM utilisateurs WHERE email LIKE '%@demo.tn';",
];

let uid = 1000; // identifiants fixes pour pouvoir lier les tables dans un seul script
const user = (email: string, type: string, daysAgo: number) => {
  uid++;
  out.push(`INSERT INTO utilisateurs (id, email, mot_de_passe, type, created_at) VALUES (${uid}, ${s(email)}, ${s(pass)}, ${s(type)}, ${s(dt(-daysAgo))});`);
  return uid;
};

user('admin@demo.tn', 'admin', 150);

// Établissements
const recs = [
  { email: 'clinique@demo.tn', nom: 'Clinique Les Oliviers', type: 'Clinique privée', ville: 'Sousse', adr: 'Avenue Taïeb Mhiri', p: 'Karim', n: 'Mansour', f: 'Directeur', abonne: true, ago: 120 },
  { email: 'hopital@demo.tn', nom: 'Polyclinique El Manar', type: 'Polyclinique', ville: 'Tunis', adr: 'Rue du Lac Léman, Les Berges du Lac', p: 'Leila', n: 'Ben Salah', f: 'DRH', abonne: false, ago: 40 },
];
const recIds: number[] = [];
recs.forEach((r, i) => {
  const u = user(r.email, 'recruteur', r.ago);
  const rid = 1000 + i + 1;
  recIds.push(rid);
  out.push(`INSERT INTO recruteurs (id, utilisateur_id, nom_etablissement, type_etablissement, adresse, ville, telephone, contact_nom, contact_prenom, contact_fonction) VALUES (${rid}, ${u}, ${s(r.nom)}, ${s(r.type)}, ${s(r.adr)}, ${s(r.ville)}, '+216 73 000 000', ${s(r.n)}, ${s(r.p)}, ${s(r.f)});`);
  if (r.abonne) out.push(`INSERT INTO abonnements (recruteur_id, montant, date_debut, date_fin, statut, reference_paiement) VALUES (${rid}, 1000, ${s(d(-30))}, ${s(d(334))}, 'actif', 'MS-DEMO-0001');`);
});

// Offres
const offres: [number, string, string, string, string, number, number, string, number, string][] = [
  [recIds[0], 'Sage-femme', 'CDI', 'Notre maternité recherche une sage-femme pour renforcer son équipe (salle de naissance et suites de couches). Gardes rémunérées, transport assuré.', 'Sousse', 1200, 1700, 'Licence en sciences obstétricales (sage-femme)', 2, 'Accouchement eutocique, Suivi de grossesse, Soins néonataux, Allaitement maternel'],
  [recIds[0], 'Technicien(ne) supérieur(e) en anesthésie-réanimation', 'CDI', "Bloc opératoire multidisciplinaire (6 salles). Vous assurez la préparation et la surveillance de l'anesthésie en collaboration avec les médecins anesthésistes.", 'Sousse', 1500, 2200, 'Licence en anesthésie-réanimation', 3, 'Anesthésie générale, Intubation et ventilation, Monitorage hémodynamique, Surveillance post-interventionnelle'],
  [recIds[0], 'Infirmier(ère) polyvalent(e)', 'CDD', 'Poste en service de médecine/chirurgie. Jeunes diplômés bienvenus, accompagnement par un tuteur pendant 3 mois.', 'Monastir', 1000, 1300, 'Licence en sciences infirmières', 0, 'Pose de perfusion, Prélèvements sanguins, Préparation et administration des médicaments, Hygiène et prévention des infections'],
  [recIds[1], 'Infirmier(ère) aux urgences', 'CDI', "Service d'urgences 24h/24. Nous recherchons un(e) infirmier(ère) réactif(ve), à l'aise avec le triage et les gestes d'urgence.", 'Tunis', 1300, 1900, 'Licence en sciences infirmières', 2, "Gestes d'urgence, Surveillance des paramètres vitaux, Pose de perfusion, Sécurité du patient"],
  [recIds[1], 'Technicien(ne) de laboratoire / biologie médicale', 'Stage', "Stage de 6 mois au sein de notre laboratoire d'analyses. Possibilité d'embauche.", 'Tunis', 500, 700, 'Licence en biologie médicale / analyses', 0, 'Phase pré-analytique, Analyses biochimiques, Hématologie, Microbiologie'],
];
offres.forEach((o, i) => {
  out.push(`INSERT INTO offres (id, recruteur_id, titre, type_contrat, description, ville, salaire_min, salaire_max, diplome_requis, experience_min, competences_requises, date_limite, created_at) VALUES (${1001 + i}, ${o.map(s).join(', ')}, ${s(d(60))}, ${s(dt(-20 + i))});`);
});

// Candidats
type Cand = { email: string; nom: string; prenom: string; poste: string; ville: string; sal: number; dispo: string; ago: number;
  dips: [string, string, string, string][]; exps: [string, string, string, string | null, number, string][]; comps: string[]; test: number[] | null };
const cands: Cand[] = [
  { email: 'amira@demo.tn', nom: 'Ben Ali', prenom: 'Amira', poste: 'Sage-femme', ville: 'Sfax', sal: 1400, dispo: 'Sous 1 mois', ago: 140,
    dips: [['Licence en sciences obstétricales (sage-femme)', 'ESSS Sfax', '2018-07-01', 'Bien']],
    exps: [['Sage-femme', 'Clinique El Bassatine', '2018-10-01', null, 1, 'Salle de naissance, suivi prénatal.']],
    comps: ['Accouchement eutocique', 'Suivi de grossesse', 'Soins néonataux', 'Allaitement maternel', 'Hygiène et prévention des infections'], test: [5, 5, 4, 4, 5, 4] },
  { email: 'youssef@demo.tn', nom: 'Trabelsi', prenom: 'Youssef', poste: 'Technicien(ne) supérieur(e) en anesthésie-réanimation', ville: 'Sousse', sal: 1800, dispo: 'Immédiate', ago: 100,
    dips: [['Licence en anesthésie-réanimation', 'ESSTS Sousse', '2016-07-01', 'Très bien']],
    exps: [['Technicien anesthésiste', 'Hôpital Sahloul', '2016-09-01', '2021-12-31', 0, 'Bloc de chirurgie générale.'], ['Technicien anesthésiste', 'Clinique Essalema', '2022-01-15', null, 1, 'Bloc orthopédie et urgences.']],
    comps: ['Anesthésie générale', 'Intubation et ventilation', 'Monitorage hémodynamique', "Gestes d'urgence"], test: [4, 5, 3, 4, 5, 4] },
  { email: 'salma@demo.tn', nom: 'Gharbi', prenom: 'Salma', poste: 'Sage-femme', ville: 'Sousse', sal: 1100, dispo: 'Immédiate', ago: 65,
    dips: [['Licence en sciences obstétricales (sage-femme)', 'ESSTS Monastir', '2023-07-01', 'Assez bien']],
    exps: [['Sage-femme stagiaire', 'CHU Farhat Hached', '2023-01-01', '2023-06-30', 0, "Stage de fin d'études."]],
    comps: ['Accouchement eutocique', 'Soins néonataux'], test: [4, 4, 4, 5, 3, 4] },
  { email: 'mehdi@demo.tn', nom: 'Jlassi', prenom: 'Mehdi', poste: 'Infirmier(ère) aux urgences', ville: 'Tunis', sal: 1600, dispo: 'Sous 15 jours', ago: 33,
    dips: [['Licence en sciences infirmières', 'ISSTS Tunis', '2017-07-01', 'Bien']],
    exps: [['Infirmier urgentiste', 'Hôpital Charles Nicolle', '2017-09-01', null, 1, "Accueil, triage et soins d'urgence."]],
    comps: ["Gestes d'urgence", 'Surveillance des paramètres vitaux', 'Pose de perfusion', 'Sécurité du patient'], test: [3, 4, 5, 3, 5, 4] },
  { email: 'ines@demo.tn', nom: 'Hammami', prenom: 'Inès', poste: 'Infirmier(ère) polyvalent(e)', ville: 'Monastir', sal: 1000, dispo: 'Immédiate', ago: 3,
    dips: [['Licence en sciences infirmières', 'ISSTS Monastir', '2024-07-01', 'Très bien']], exps: [],
    comps: ['Prélèvements sanguins', 'Hygiène et prévention des infections'], test: null },
];
const noms = new Set([TRONC_COMMUN, ...FAMILLES_QCM].flatMap((f) => f.competences.map((c) => c.nom)));
for (const x of [...cands.flatMap((c) => c.comps), ...offres.flatMap((o) => o[9].split(', '))]) if (!noms.has(x)) throw new Error(`Compétence hors catalogue : ${x}`);
const candIds: number[] = [];
cands.forEach((cd, i) => {
  const u = user(cd.email, 'candidat', cd.ago);
  const cid = 1001 + i;
  candIds.push(cid);
  out.push(`INSERT INTO candidats (id, utilisateur_id, nom, prenom, date_naissance, lieu_naissance, telephone, adresse, ville, pays, poste_recherche, salaire_souhaite, disponibilite, coordonnees_visibles, updated_at) VALUES (${cid}, ${u}, ${s(cd.nom)}, ${s(cd.prenom)}, '1994-03-12', ${s(cd.ville)}, '+216 20 000 000', 'Rue de la République', ${s(cd.ville)}, 'Tunisie', ${s(cd.poste)}, ${cd.sal}, ${s(cd.dispo)}, 1, ${s(dt(-cd.ago))});`);
  for (const x of cd.dips) out.push(`INSERT INTO diplomes (candidat_id, intitule, etablissement, date_obtention, mention) VALUES (${cid}, ${x.map(s).join(', ')});`);
  for (const x of cd.exps) out.push(`INSERT INTO experiences (candidat_id, poste, etablissement, date_debut, date_fin, poste_actuel, description) VALUES (${cid}, ${x.map(s).join(', ')});`);
  // Compétences validées par QCM (démonstration)
  cd.comps.forEach((k, j) => out.push(`INSERT INTO competences (candidat_id, nom, bonnes, total, valide_le) VALUES (${cid}, ${s(k)}, ${j % 2 ? 2 : 3}, 3, ${s(dt(-Math.min(cd.ago, 20) + j))});`));
  out.push(`INSERT INTO langues (candidat_id, langue, niveau) VALUES (${cid}, 'Arabe', 'Langue maternelle'), (${cid}, 'Français', 'Courant');`);
  if (cd.test) {
    // Réponses simulées : chaque dimension reçoit la note indiquée (items inversés compris)
    const answers = QUESTIONS.map((q) => { const v = cd.test![DIM_KEYS.indexOf(q.d)]; return q.r ? 6 - v : v; });
    const sc = personalityScores(answers);
    out.push(`INSERT INTO tests_personnalite (candidat_id, ouverture, conscience, extraversion, agreabilite, stabilite, adaptation_medicale, portrait, reponses) VALUES (${cid}, ${DIM_KEYS.map((k) => sc[k]).join(', ')}, ${s(personalityPortrait(sc, cd.prenom))}, ${s(JSON.stringify(answers))});`);
  }
});

// Candidatures et un entretien
out.push(`INSERT INTO candidatures (offre_id, candidat_id, created_at) VALUES (1001, ${candIds[0]}, ${s(dt(-10))}), (1002, ${candIds[1]}, ${s(dt(-8))}), (1001, ${candIds[2]}, ${s(dt(-5))});`);
const next = tunis(1);
while (next.getUTCDay() !== 1) next.setUTCDate(next.getUTCDate() + 1); // lundi prochain
const day = next.toISOString().slice(0, 10);
out.push(`INSERT INTO entretiens (recruteur_id, candidat_id, offre_id, date_debut, date_fin, lieu, contact) VALUES (${recIds[0]}, ${candIds[1]}, 1002, '${day} 10:00:00', '${day} 10:30:00', 'Clinique Les Oliviers, Avenue Taïeb Mhiri, Sousse', 'Karim Mansour – +216 73 000 000');`);


// Entretiens IA d'exemple (données de démonstration, non issues d'une vraie évaluation)
const eiaDemo = [
  { cid: candIds[0], poste: 'Sage-femme', scores: [82, 76, 91, 85, 80], synthese: "Réponses claires et chaleureuses, avec une vraie attention portée aux patientes et à leur entourage. Le vocabulaire obstétrical est maîtrisé ; certaines réponses gagneraient à être plus structurées.", forts: ["Empathie et capacité à rassurer", "Vocabulaire professionnel précis"], conseils: ["Structurez vos réponses : situation, action, résultat.", "Concluez chaque réponse par une phrase de synthèse."],
    qr: [
      ["Présentez-vous en quelques phrases et expliquez pourquoi vous avez choisi ce métier.", "Je suis sage-femme depuis huit ans à Sfax. J'ai choisi ce métier pour accompagner les femmes à un moment unique de leur vie, avec bienveillance et rigueur."],
      ["Une future maman très inquiète vous demande si son accouchement va bien se passer. Que lui dites-vous ?", "Je commence par l'écouter et reconnaître son inquiétude, c'est normal. Je lui explique comment se déroule le suivi, que nous surveillons le cœur du bébé en continu et que l'équipe est présente à chaque étape. Je l'invite à poser toutes ses questions."],
      ["Comment expliqueriez-vous les premiers gestes de l'allaitement à une jeune mère fatiguée ?", "Je m'assieds à côté d'elle, je lui montre une position confortable et je la laisse essayer à son rythme, sans pression. Je la rassure en lui disant que la fatigue est normale et que nous allons y aller progressivement."],
      ["Comment transmettez-vous les informations importantes à l'équipe lors d'un changement de garde ?", "Je fais une transmission ciblée : l'état de chaque patiente, les constantes, les traitements en cours et les points de vigilance. Je note tout dans le dossier pour assurer la traçabilité."],
      ["Un patient anxieux refuse un soin. Que lui dites-vous pour le rassurer ?", "Je respecte son refus, je lui demande ce qui l'inquiète et je lui explique simplement le soin et son intérêt. S'il refuse toujours, j'informe le médecin et je le note dans le dossier."],
    ] },
  { cid: candIds[1], poste: 'Technicien(ne) supérieur(e) en anesthésie-réanimation', scores: [70, 74, 58, 88, 66], synthese: "Communication précise et technique, très à l'aise avec l'équipe médicale. L'écoute du patient et la reformulation pourraient être davantage mises en avant.", forts: ["Vocabulaire technique maîtrisé", "Transmissions structurées avec l'équipe"], conseils: ["Prenez le temps de reformuler l'inquiétude du patient avant d'expliquer.", "Utilisez des mots simples face aux patients."],
    qr: [
      ["Présentez-vous en quelques phrases et expliquez pourquoi vous avez choisi ce métier.", "Technicien anesthésiste depuis 2016, j'ai travaillé à Sahloul puis en clinique. J'aime la précision du bloc et le travail d'équipe."],
      ["Un patient a peur de l'anesthésie générale. Comment le rassurez-vous avant l'intervention ?", "Je lui explique le monitorage, que nous surveillons ses constantes en permanence et que l'anesthésiste reste avec lui pendant toute l'intervention."],
      ["Comment communiquez-vous avec le médecin anesthésiste lors d'une complication au bloc ?", "J'annonce clairement les paramètres : saturation, tension, fréquence cardiaque, puis j'applique le protocole et je confirme chaque consigne à voix haute."],
      ["Comment transmettez-vous les informations importantes à l'équipe lors d'un changement de garde ?", "Transmission ciblée en salle de réveil : produits administrés, incidents, score de réveil et consignes de surveillance."],
      ["Un médecin vous donne une consigne qui vous semble incorrecte. Comment réagissez-vous ?", "Je lui fais part de mon doute avec respect et je vérifie la prescription avant d'agir, pour la sécurité du patient."],
    ] },
];
for (const e of eiaDemo) {
  const [cl, st, em, vo, ad] = e.scores;
  const g = Math.round((cl + st + em + vo + ad) / 5);
  out.push(`INSERT INTO entretiens_ia (candidat_id, statut, poste, questions, reponses, clarte, structure, empathie, vocabulaire, adaptation, score_global, synthese, points_forts, conseils, moteur, created_at, termine_le) VALUES (${e.cid}, 'termine', ${s(e.poste)}, ${s(JSON.stringify(e.qr.map((x) => x[0])))}, ${s(JSON.stringify(e.qr.map((x) => ({ texte: x[1], mode: 'oral', duree: 60, source: 'demo' }))))}, ${cl}, ${st}, ${em}, ${vo}, ${ad}, ${g}, ${s(e.synthese)}, ${s(JSON.stringify(e.forts))}, ${s(JSON.stringify(e.conseils))}, 'demo', ${s(dt(-4))}, ${s(dt(-4))});`);
}

const sql = out.join('\n') + '\n';
const args = process.argv.slice(2);
if (args.includes('--print')) {
  process.stdout.write(sql);
} else {
  const where = args.includes('--remote') ? '--remote' : '--local';
  mkdirSync('.wrangler', { recursive: true });
  writeFileSync('.wrangler/seed.sql', sql);
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'medical-staff', where, '--file=.wrangler/seed.sql'], { stdio: 'inherit', shell: process.platform === 'win32' });
  console.log(`Données de démonstration chargées (${where === '--remote' ? 'base en ligne' : 'base locale'}). Mot de passe des comptes @demo.tn : demo1234`);
}
