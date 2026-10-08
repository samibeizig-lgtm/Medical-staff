/**
 * Banque de QCM de compétences.
 * Chaque compétence regroupe des questions à 4 choix ; la bonne réponse est TOUJOURS
 * la première de la liste (les choix sont mélangés à l'affichage).
 * Format d'une question : [énoncé, bonne réponse, distracteur, distracteur, distracteur]
 */
import { SUITE } from './qcm-suite';
export type QuestionBrute = readonly [string, string, string, string, string];
export type CompetenceQcm = { nom: string; questions: readonly QuestionBrute[] };
export type FamilleQcm = { cle: string; label: string; competences: readonly CompetenceQcm[] };

/* ---------- Tronc commun : tous les métiers ---------- */
export const TRONC_COMMUN: FamilleQcm = {
  cle: 'tronc',
  label: 'Tronc commun',
  competences: [
    {
      nom: 'Hygiène et prévention des infections',
      questions: [
        ["Quelle est la mesure la plus efficace pour prévenir les infections associées aux soins ?", "L'hygiène des mains", 'Le port permanent de gants', "L'antibiothérapie préventive systématique", 'Le changement quotidien de blouse'],
        ["Combien de temps dure une friction hydro-alcoolique des mains correctement réalisée ?", 'Environ 20 à 30 secondes', 'Environ 5 secondes, juste le temps de mouiller les paumes et les doigts', 'Environ 2 minutes, avant chaque soin', '5 minutes au moins, avec une brosse'],
        ["Dans quel cas la friction hydro-alcoolique ne suffit pas et un lavage des mains au savon est nécessaire ?", 'Mains visiblement sales ou patient porteur de Clostridioides difficile', 'Avant tout contact avec un patient', 'Après avoir retiré des gants propres utilisés pour un soin sans contact avec du sang', 'Avant une injection intramusculaire'],
        ["Après utilisation, une aiguille doit être :", 'Jetée immédiatement, sans la recapuchonner, dans un collecteur pour objets piquants-coupants', 'Recapuchonnée soigneusement à deux mains pour éviter toute piqûre, puis jetée à la fin du soin', 'Jetée dans le sac à déchets ménagers', "Posée sur le plateau jusqu'à la fin du soin"],
        ["Que faire en premier après une piqûre accidentelle avec une aiguille souillée ?", "Ne pas faire saigner, nettoyer à l'eau et au savon, rincer puis désinfecter (au moins 5 minutes), puis déclarer l'accident", 'Faire saigner fortement la plaie en pressant autour pendant plusieurs minutes, puis désinfecter et déclarer', "Appliquer de l'alcool à 70° pendant 5 secondes et reprendre le travail", "Attendre la fin de la garde pour consulter"],
        ["Les précautions « standard » s'appliquent :", 'À tous les patients, quel que soit leur statut infectieux', 'Uniquement aux patients dont le statut infectieux est connu et documenté dans le dossier', 'Uniquement en réanimation, aux urgences et dans les services infectieux', 'Uniquement au bloc opératoire'],
      ],
    },
    {
      nom: "Gestes d'urgence",
      questions: [
        ["Face à un adulte inconscient qui ne respire pas normalement, quel est le rythme des compressions thoraciques ?", '100 à 120 compressions par minute', '60 compressions par minute', '150 à 180 compressions par minute', '30 compressions par minute'],
        ["Chez l'adulte, quel est le rapport compressions / insufflations lors de la réanimation cardio-pulmonaire ?", '30 compressions pour 2 insufflations', '15 pour 2', '5 pour 1', '10 pour 1'],
        ["Quelle est la profondeur recommandée des compressions thoraciques chez l'adulte ?", 'Environ 5 cm (sans dépasser 6 cm)', 'Environ 1 à 2 cm, pour ne pas fracturer de côtes', 'Environ 8 à 10 cm, avec un relâchement partiel', 'Aussi profond que possible, au moins 8 cm, pour être sûr que le cœur soit comprimé'],
        ["Une victime inconsciente qui respire normalement doit être placée :", 'En position latérale de sécurité', 'Assise', 'Sur le dos, jambes surélevées, sans surveillance', 'Sur le ventre'],
        ["Face à une hémorragie externe importante, le premier geste est :", 'La compression directe de la plaie', "La pose immédiate d'un garrot sur toute plaie", 'La surélévation du membre uniquement', "L'application de glace"],
        ["Un adulte conscient s'étouffe et ne peut plus parler ni tousser. Que faire en premier ?", '5 claques dans le dos, puis 5 compressions abdominales si besoin', "Le faire boire de l'eau par petites gorgées, puis attendre qu'il reprenne son souffle", 'Le coucher sur le dos et attendre', "L'allonger sur le dos et commencer immédiatement le bouche-à-bouche pour lui apporter de l'air"],
      ],
    },
    {
      nom: 'Sécurité du patient',
      questions: [
        ["Avant tout soin ou administration d'un traitement, l'identité du patient se vérifie :", 'En lui demandant de décliner ses nom, prénom et date de naissance et en contrôlant le bracelet', 'En lisant le numéro de la chambre', 'En lui demandant simplement « Vous êtes bien M. X ? » et en vérifiant le numéro de chambre', 'En se fiant au lit occupé'],
        ["La règle des « 5 B » de l'administration médicamenteuse vise à donner :", 'Bon médicament, bonne dose, bonne voie, bon moment, bon patient', 'Le bon médicament, au bon moment, dans le bon service, avec la bonne ordonnance et le bon prix', 'Le bon médicament au bon service', 'Le bon traitement donné uniquement le matin, au moment de la tournée médicale'],
        ["Quelle mesure réduit le risque de chute d'un patient hospitalisé ?", 'Lit en position basse, sonnette et objets usuels à portée de main', 'Contention systématique de tous les patients âgés', 'Barrières de lit relevées pour tous les patients et contention la nuit pour les personnes âgées', 'Éclairage éteint la nuit dans toute la chambre'],
        ["Vous découvrez une erreur d'administration d'un médicament. Que faites-vous ?", "Surveiller le patient, prévenir le médecin et déclarer l'événement", 'Ne rien dire si le patient va bien', "Corriger le dossier sans informer personne", "Attendre la visite du lendemain pour en parler"],
        ["Lors d'une transmission orale d'une prescription urgente, la bonne pratique est :", 'La répéter à voix haute pour confirmation, puis la faire tracer par écrit', 'La mémoriser sans la répéter', "La noter sur un papier libre et l'administrer, la traçabilité pouvant être faite le lendemain", 'Attendre la fin de la garde pour la noter'],
        ["Le bracelet d'identification d'un patient hospitalisé doit être posé :", "Dès l'admission et vérifié avant chaque acte", 'Uniquement avant un passage au bloc', "Uniquement si le patient est confus", "À la demande du patient"],
      ],
    },
    {
      nom: 'Éthique et secret professionnel',
      questions: [
        ["Le secret professionnel s'applique :", "À tout ce que l'on apprend, voit ou comprend en exerçant", 'Uniquement au diagnostic et aux traitements inscrits dans le dossier médical du patient', "Uniquement pendant les heures de service", "Uniquement aux médecins"],
        ["Un voisin du patient vous téléphone pour connaître son diagnostic. Que répondez-vous ?", "Vous ne donnez aucune information médicale", "Vous donnez le diagnostic s'il connaît bien le patient", "Vous donnez seulement le nom du service", "Vous lui lisez le compte rendu"],
        ["Avant un soin, le consentement du patient doit être :", 'Libre et éclairé, après une information claire', 'Obtenu uniquement pour les interventions chirurgicales', 'Donné par la famille dans tous les cas', 'Présumé pour tous les soins courants, sans information'],
        ["Publier sur un réseau social la photo d'un patient, même sans son nom :", 'Est interdit sans son accord', "Est autorisé si le visage est flouté et que le nom de l'établissement n'apparaît pas", 'Est autorisé si le compte est privé', 'Est autorisé après sa sortie'],
        ["Un patient majeur et lucide refuse un soin après avoir été informé. Que faire ?", 'Respecter son refus, le réinformer, prévenir le médecin et tracer', 'Réaliser le soin malgré tout', 'Demander à la famille de signer à sa place', 'Le sortir immédiatement du service'],
      ],
    },
  ],
};

/* ---------- Familles de métiers ---------- */
const FAMILLES_BASE: readonly FamilleQcm[] = [
  {
    cle: 'infirmier',
    label: 'Infirmier(ère)',
    competences: [
      {
        nom: 'Préparation et administration des médicaments',
        questions: [
          ["Prescription : 500 mg d'un antibiotique. Le flacon contient 1 g à diluer dans 10 mL. Quel volume prélever ?", '5 mL', '2 mL', '10 mL', '0,5 mL'],
          ["Prescription : 1 000 mL de sérum en 8 heures avec un perfuseur standard (20 gouttes/mL). Quel débit régler ?", 'Environ 42 gouttes/min', 'Environ 21 gouttes/min', 'Environ 125 gouttes/min', 'Environ 8 gouttes/min'],
          ["Une seringue électrique doit délivrer 48 mL en 24 heures. Quel débit programmer ?", '2 mL/h', '4 mL/h', '0,5 mL/h', '24 mL/h'],
          ["Combien de microgrammes y a-t-il dans 1 milligramme ?", '1 000 µg', '10 µg', '100 µg', '1 000 000 µg'],
          ["Le chlorure de potassium (KCl) concentré :", 'Jamais en IV directe : toujours dilué et perfusé lentement', "S'injecte en IV directe rapide en cas d'hypokaliémie", "S'administre uniquement en sous-cutané", "Peut être injecté pur dans la tubulure"],
          ["Un médicament prescrit « per os » s'administre :", 'Par la bouche', 'Par voie intraveineuse', 'Par voie sous-cutanée', 'Par voie rectale'],
        ],
      },
      {
        nom: 'Pose de perfusion',
        questions: [
          ["Combien de temps peut-on laisser en place un garrot lors de la pose d'un cathéter veineux périphérique ?", "Moins d'une minute environ", 'Au moins 5 minutes, pour bien gonfler la veine avant de piquer', "Jusqu'à la fin de la perfusion", '15 minutes'],
          ["Quel site privilégier pour un cathéter veineux périphérique chez l'adulte ?", "L'avant-bras, côté non dominant", 'Le pli du coude en première intention, car la veine y est plus grosse et plus facile à piquer', 'Une veine du membre inférieur', "Le bras porteur d'une fistule artério-veineuse"],
          ["Quel signe doit faire suspecter une extravasation (diffusion) au point de perfusion ?", 'Gonflement, peau froide et pâle, douleur', 'Reflux de sang dans la tubulure', 'Débit de perfusion qui augmente brusquement', 'Peau chaude et rouge le long du trajet de la veine, sans gonflement autour du point de ponction'],
          ["Rougeur, chaleur et cordon induré le long de la veine perfusée évoquent :", 'Une phlébite', 'Une hypoglycémie', 'Une réaction allergique généralisée', 'Un fonctionnement normal'],
          ["Avant de brancher une perfusion, la tubulure doit être :", "Purgée afin d'en chasser tout l'air", 'Remplie à moitié', "Laissée vide, l'air étant sans danger", 'Rincée à l\'alcool'],
        ],
      },
      {
        nom: 'Prélèvements sanguins',
        questions: [
          ["Pour une hémoculture, la désinfection de la peau doit être :", 'Soigneuse, antiseptique, séchage respecté', 'Inutile si le patient est propre', "Rapide, avec un coton imbibé d'alcool, la ponction pouvant se faire sur la peau encore humide", "Faite à l'eau uniquement, sans antiseptique"],
          ["Le tube à bouchon violet (EDTA) est principalement utilisé pour :", 'La numération formule sanguine (NFS)', 'La glycémie', "Le bilan d'hémostase (TP, TCA) et la vitesse de sédimentation", 'Les hémocultures'],
          ["Le tube citraté (bouchon bleu) pour le bilan d'hémostase doit être :", 'Rempli jusqu\'au trait de remplissage', 'Rempli à moitié', 'Prélevé en dernier impérativement après plusieurs tubes secs', 'Agité vigoureusement pendant une minute'],
          ["Pour éviter une hémolyse lors d'un prélèvement, il faut :", 'Éviter un garrot trop long et ne pas secouer les tubes', 'Utiliser une aiguille la plus fine possible et aspirer fort', 'Laisser le garrot en place plusieurs minutes', 'Agiter énergiquement les tubes'],
          ["Où réaliser un prélèvement sanguin chez un patient perfusé au bras droit ?", 'Au bras opposé, de préférence', 'Au-dessus de la perfusion, sur le même bras', 'Directement dans la tubulure de la perfusion en cours', "Il n'y a aucune précaution particulière"],
        ],
      },
      {
        nom: 'Surveillance des paramètres vitaux',
        questions: [
          ["Quelle est la fréquence cardiaque normale d'un adulte au repos ?", '60 à 100 battements/min', '40 à 50 battements/min', '110 à 140 battements/min', '20 à 40 battements/min'],
          ["Quelle est la fréquence respiratoire normale d'un adulte au repos ?", '12 à 20 cycles/min', '4 à 8 cycles/min', '25 à 35 cycles/min', '40 à 50 cycles/min'],
          ["Une saturation (SpO2) de 85 % chez un adulte sans pathologie respiratoire chronique :", 'Est une hypoxémie qui nécessite une prise en charge immédiate', 'Est normale', 'Est normale la nuit', 'Est acceptable chez un adulte qui dort, une nouvelle mesure au réveil suffisant'],
          ["À partir de quelle température parle-t-on habituellement de fièvre ?", '38 °C', '37 °C', '36,5 °C', '39,5 °C'],
          ["Une glycémie capillaire à 0,50 g/L (2,8 mmol/L) chez un patient diabétique correspond à :", 'Une hypoglycémie', 'Une glycémie normale', 'Une hyperglycémie', 'Une acidocétose'],
          ["Hypotension, tachycardie, pâleur et sueurs après une intervention doivent faire suspecter :", 'Une hémorragie / un état de choc', 'Une hypertension', 'Un réveil normal', "Une simple réaction à l'anesthésie, qui disparaît sans traitement au réveil complet"],
        ],
      },
      {
        nom: 'Pansements et soins des plaies',
        questions: [
          ["Le nettoyage d'une plaie propre se fait :", 'Du plus propre vers le plus sale', 'Du plus sale vers le plus propre', 'Par mouvements de va-et-vient', "Uniquement à l'alcool"],
          ["Quel est le produit de première intention pour nettoyer une plaie chronique (ulcère, escarre) ?", "Sérum physiologique (ou eau et savon doux)", 'Eau oxygénée pure puis Bétadine, pour désinfecter à chaque soin', 'Alcool à 90°', 'Éosine aqueuse systématique'],
          ["Une escarre de stade 1 se caractérise par :", "Une rougeur persistante qui ne blanchit pas à la pression, peau intacte", 'Une plaie profonde avec os visible', 'Une phlyctène (ampoule) ouverte avec une perte de substance superficielle', 'Une nécrose noire'],
          ["Quels signes locaux évoquent l'infection d'une plaie ?", 'Rougeur, chaleur, douleur, œdème, écoulement purulent', 'Un bourgeonnement rose vif, humide et indolore qui recouvre le fond de la plaie', 'Plaie qui se rétrécit', 'Absence de douleur'],
          ["Un pansement doit être refait :", 'Selon la prescription ou s\'il est souillé, décollé ou mouillé', 'Toutes les heures pour vérifier la plaie, même si le pansement est propre et sec', 'Jamais avant la sortie', 'Uniquement si le patient le demande'],
        ],
      },
    ],
  },
  {
    cle: 'bloc',
    label: 'Bloc opératoire et stérilisation',
    competences: [
      {
        nom: 'Instrumentation chirurgicale',
        questions: [
          ["Le compte des compresses, aiguilles et instruments au bloc opératoire est réalisé :", "Avant l'incision, avant la fermeture, en fin d'intervention", 'Uniquement en fin de journée', 'Uniquement si le chirurgien le demande', 'Une seule fois en début de programme'],
          ["Un instrument stérile tombe au sol pendant l'intervention. Que faites-vous ?", 'Il est contaminé : retiré et remplacé', "Il est réutilisé après l'avoir essuyé", 'Il est trempé dans une solution antiseptique pendant quelques minutes puis réutilisé', 'Il est réutilisé si personne ne l\'a vu'],
          ["Quel instrument sert principalement à saisir et clamper un vaisseau ?", 'Une pince hémostatique (type Kocher ou Pean)', 'Un écarteur de Farabeuf', 'Une curette', 'Un écarteur autostatique de type Gosset'],
          ["Le porte-aiguille sert à :", "Tenir l'aiguille lors de la suture", 'Couper les fils', 'Écarter les berges de la plaie', 'Aspirer le sang'],
          ["Qui peut toucher la table d'instrumentation stérile ?", "Uniquement les personnes habillées stérilement", "Toute l'équipe du bloc, avec une tenue de bloc propre", "L'infirmier circulant, s'il a réalisé une friction hydro-alcoolique des mains", "Toute l'équipe présente en salle"],
        ],
      },
      {
        nom: 'Asepsie et stérilisation',
        questions: [
          ["Avant la stérilisation, un dispositif médical réutilisable doit être :", 'Pré-désinfecté, nettoyé, séché puis conditionné', 'Directement mis dans l\'autoclave sale', "Rincé à l'eau puis directement mis dans l'autoclave, la vapeur suffisant à le nettoyer", "Désinfecté à l'alcool, essuyé puis rangé dans l'armoire du bloc"],
          ["Quel est le cycle de référence de l'autoclave pour les dispositifs médicaux en stérilisation hospitalière ?", '134 °C pendant au moins 18 minutes', '100 °C pendant 5 minutes', '60 °C pendant 1 heure', '121 °C pendant 2 minutes, quel que soit le type de dispositif'],
          ["Le test de Bowie-Dick sert à vérifier :", "La bonne pénétration de la vapeur et l'évacuation de l'air dans l'autoclave", "La stérilité d'un instrument", 'La stérilité de chaque instrument contenu dans la charge', "La date de péremption des emballages"],
          ["Un sachet de stérilisation est déchiré ou humide :", "Le contenu est considéré comme non stérile", "Il peut être utilisé s'il est récent", "Il suffit de le scotcher", "Il peut être utilisé au bloc si l'intervention est courte"],
          ["Le lavage chirurgical des mains est réalisé :", "Avant d'enfiler la casaque et les gants stériles", "Après l'intervention uniquement", "Uniquement si les mains sont sales", "Avec une solution hydro-alcoolique sur des mains souillées"],
        ],
      },
      {
        nom: 'Bloc opératoire',
        questions: [
          ["La check-list « sécurité du patient au bloc opératoire » se déroule :", "Avant l'induction, l'incision et après", 'Uniquement à la sortie du bloc', 'Seulement pour les urgences', "Uniquement à l'arrivée du patient au bloc, avant son installation en salle"],
          ["Le « temps de pause » avant l'incision permet de vérifier :", 'Identité, côté, site et intervention', 'Le nombre de lits disponibles', "Les horaires de l'équipe et le planning de garde", "Le nombre de compresses et d'instruments disponibles pour l'intervention"],
          ["Lors de l'installation du patient sur la table, le principal risque à prévenir est :", 'Les compressions et lésions cutanées ou nerveuses', "L'hypothermie liée au contact avec la table, plus que les compressions", "L'hyperglycémie", "L'allergie au latex chez tous les patients"],
          ["La plaque neutre du bistouri électrique doit être placée :", 'Sur une zone musculaire bien vascularisée, propre et sèche, proche du site opératoire', 'Sur une saillie osseuse, loin du site opératoire, pour éviter toute brûlure', 'Sur une cicatrice ou une saillie osseuse, à distance du site opératoire', 'Sur une zone humide'],
          ["Dans la salle d'opération, les portes doivent rester :", 'Fermées autant que possible', 'Ouvertes en permanence pour aérer', "Ouvertes pendant l'intervention pour faciliter le passage du matériel", 'Sans importance'],
        ],
      },
    ],
  },
  {
    cle: 'sagefemme',
    label: 'Sage-femme',
    competences: [
      {
        nom: 'Suivi de grossesse',
        questions: [
          ["Quelle est la durée moyenne d'une grossesse en semaines d'aménorrhée (SA) ?", 'Environ 41 SA', 'Environ 36 SA', 'Environ 45 SA', 'Environ 32 SA'],
          ["À partir de quel terme une naissance est-elle considérée « à terme » ?", '37 SA révolues', '32 SA', '34 SA', '40 SA uniquement'],
          ["Une tension artérielle ≥ 140/90 mmHg avec protéinurie après 20 SA évoque :", 'Une prééclampsie', 'Un diabète gestationnel', 'Une grossesse normale', 'Une anémie'],
          ["Quelle supplémentation est recommandée en début de grossesse pour prévenir les anomalies de fermeture du tube neural ?", 'Acide folique (vitamine B9)', 'Vitamine A à forte dose', 'Vitamine K', 'Fer injectable systématique'],
          ["Le dépistage du diabète gestationnel par HGPO 75 g se fait habituellement :", 'Entre 24 et 28 SA', 'À 8 SA', 'À 38 SA', 'Après l\'accouchement'],
        ],
      },
      {
        nom: 'Accouchement eutocique',
        questions: [
          ["Le travail actif est défini par une dilatation du col :", "À partir d'environ 5 à 6 cm", 'À partir de 1 cm', 'Uniquement à 10 cm', 'Dès la perte du bouchon muqueux, même sans contractions régulières'],
          ["La délivrance correspond à :", "L'expulsion du placenta", "La sortie de l'enfant", "La rupture de la poche des eaux qui précède l'expulsion de l'enfant", "Le début des contractions"],
          ["Une hémorragie du post-partum est définie par une perte sanguine d'au moins :", '500 mL dans les 24 heures', '100 mL', '200 mL', '2 000 mL'],
          ["Quel médicament est recommandé en prévention de l'hémorragie de la délivrance ?", "L'ocytocine", "L'insuline", "Le paracétamol", "Le salbutamol"],
          ["La présentation la plus fréquente à l'accouchement est :", 'Céphalique (sommet)', 'Le siège', 'La présentation transverse', 'La présentation de la face'],
        ],
      },
      {
        nom: 'Soins néonataux',
        questions: [
          ["Le score d'Apgar est évalué :", 'À 1, 5 et 10 minutes de vie', 'À 1 heure de vie', 'Au 3e jour', 'Uniquement si l\'enfant est prématuré'],
          ["Quels éléments composent le score d'Apgar ?", 'Fréquence cardiaque, respiration, tonus, réactivité, coloration', 'Poids, taille, périmètre crânien', 'Température, glycémie, bilirubine', 'Pleurs, sommeil, alimentation et couleur des selles'],
          ["Quelle vitamine est administrée au nouveau-né pour prévenir la maladie hémorragique ?", 'Vitamine K', 'Vitamine C', 'Vitamine D à forte dose', 'Vitamine B12'],
          ["Quelle est la fréquence cardiaque normale d'un nouveau-né ?", '120 à 160 battements/min', '60 à 80 battements/min', '80 à 100 battements/min', '200 à 240 battements/min'],
          ["Pour prévenir l'hypothermie du nouveau-né, on privilégie :", 'Séchage immédiat et peau-à-peau', 'Le bain immédiat', 'Le laisser nu sur la table', 'Une pièce non chauffée'],
        ],
      },
      {
        nom: 'Allaitement maternel',
        questions: [
          ["L'OMS recommande un allaitement maternel exclusif jusqu'à :", '6 mois', '1 mois', '3 mois', '12 mois'],
          ["Quand débuter idéalement la première tétée ?", "Dans l'heure qui suit la naissance", 'Après 24 heures', 'Après le bain et les premiers soins, vers la 6e heure de vie, quand la mère est reposée', 'Après le premier bain'],
          ["Le colostrum est :", 'Le premier lait, riche en anticorps', 'Un lait de mauvaise qualité à jeter', 'Un lait artificiel', 'Un signe d\'infection'],
          ["Une bonne prise du sein se reconnaît à :", 'Bouche grande ouverte, lèvres retroussées, aréole prise', "Le bébé qui tète uniquement le bout du mamelon", "Une douleur intense chez la mère", 'Des bruits de claquement réguliers et des joues qui se creusent à chaque succion'],
        ],
      },
    ],
  },
  {
    cle: 'anesthesie',
    label: 'Anesthésie-réanimation',
    competences: [
      {
        nom: 'Anesthésie générale',
        questions: [
          ["Avant une anesthésie programmée, le jeûne habituel pour les solides est d'au moins :", '6 heures', '30 minutes', '1 heure', '24 heures'],
          ["Les liquides clairs (eau, thé sans lait) sont généralement autorisés jusqu'à :", '2 heures avant l\'anesthésie', '12 heures avant', '24 heures avant', 'Ils sont interdits dès la veille'],
          ["Le propofol est :", 'Un hypnotique intraveineux', 'Un curare non dépolarisant de courte durée', 'Un antalgique morphinique', "Un morphinique puissant utilisé pour l'analgésie peropératoire"],
          ["Quel est l'antidote des morphiniques ?", 'La naloxone', 'Le flumazénil', 'La néostigmine', "L'atropine"],
          ["Quel est l'antidote des benzodiazépines ?", 'Le flumazénil', 'La naloxone', 'La protamine', 'La vitamine K'],
          ["La consultation d'anesthésie a lieu :", "Quelques jours avant l'intervention", "Uniquement après l'intervention", "Au bloc, juste avant l'induction, pour gagner du temps sur le programme", 'Elle est facultative pour les interventions programmées'],
        ],
      },
      {
        nom: 'Intubation et ventilation',
        questions: [
          ["La manœuvre de Sellick consiste à :", 'Appuyer sur le cartilage cricoïde', 'Surélever les jambes du patient en position déclive', "Basculer la tête en arrière et tirer la mâchoire vers l'avant pour dégager la langue", 'Comprimer le thorax'],
          ["Quel est le moyen le plus fiable pour confirmer la position de la sonde d'intubation dans la trachée ?", 'La capnographie', "La buée dans la sonde et le soulèvement du thorax à l'insufflation", 'La couleur de la peau', 'Le nombre de centimètres seul'],
          ["Avant l'intubation, la pré-oxygénation se fait :", "Avec de l'oxygène pur environ 3 minutes", "À l'air ambiant, patient en position assise", "Avec de l'air enrichi à 30 % d'oxygène pendant une dizaine de secondes", "Uniquement après l'intubation et l'induction"],
          ["Le ballon auto-remplisseur à valve unidirectionnelle (BAVU) sert à :", 'Ventiler manuellement un patient', 'Aspirer les sécrétions', "Administrer de l'oxygène à un patient qui respire seul, sans aucune pression", 'Réchauffer le patient'],
          ["Une désaturation brutale chez un patient intubé et ventilé doit faire rechercher en priorité :", 'Un problème de sonde ou de ventilateur', 'Une hypoglycémie', 'Une hyperthermie ou une réaction allergique aux produits anesthésiques', 'Une erreur de la tension'],
        ],
      },
      {
        nom: 'Monitorage hémodynamique',
        questions: [
          ["La pression artérielle moyenne (PAM) se calcule approximativement par :", '(PAS + 2 × PAD) / 3', '(PAS + 2 × PAD) / 2', 'PAS − PAD', 'PAS × 2'],
          ["Le monitorage minimal d'une anesthésie générale comprend :", 'ECG, PA, SpO2, capnographie', 'Uniquement la température', 'La SpO2 et la fréquence cardiaque, la capnographie étant réservée à la réanimation', 'Uniquement la diurèse et la température cutanée'],
          ["Sur l'ECG du scope, une ligne plate chez un patient inconscient doit d'abord faire :", 'Vérifier patient et électrodes', "Attendre la fin de l'intervention", "Changer d'imprimante", "Changer d'abord les électrodes et le câble, puis attendre une minute avant de conclure"],
          ["Une bradycardie sévère au bloc peut être traitée en première intention par :", "L'atropine", 'Le propofol', 'Un bêtabloquant injectable, pour régulariser le rythme cardiaque', 'Le furosémide'],
        ],
      },
      {
        nom: 'Surveillance post-interventionnelle',
        questions: [
          ["Le score d'Aldrete sert à :", 'Autoriser la sortie de SSPI', 'Évaluer la douleur postopératoire et adapter les doses de morphine', 'Évaluer le risque d\'escarre', 'Évaluer la profondeur de l\'anesthésie'],
          ["Quel est le premier signe de dépression respiratoire liée aux morphiniques à surveiller ?", 'La sédation', 'La fièvre', 'Une hypertension isolée', "Des démangeaisons et des nausées, qui précèdent toujours l'arrêt respiratoire"],
          ["En salle de réveil, des frissons avec température à 35 °C nécessitent :", 'Un réchauffement actif', 'Une sortie immédiate', 'Un bain froid', 'Une surveillance simple : les frissons disparaissent toujours seuls en quelques minutes'],
          ["Une échelle numérique de la douleur à 7/10 en SSPI signifie :", 'Une douleur importante', 'Une douleur absente', 'Une douleur normale à ignorer', 'Une douleur modérée, habituelle après une chirurgie, à réévaluer dans 2 heures'],
        ],
      },
    ],
  },
  {
    cle: 'imagerie',
    label: 'Imagerie médicale',
    competences: [
      {
        nom: 'Radioprotection',
        questions: [
          ["Les trois principes de la radioprotection sont :", 'Justification, optimisation, limitation', 'Rapidité, précision, efficacité', 'Temps, distance et écran, appliqués à chaque examen', 'Prévention, traitement, suivi'],
          ["Quels sont les trois moyens de se protéger d'une source de rayonnement ?", 'Temps, distance, écran', 'Gants, masque, lunettes de soleil', 'Lavage, désinfection, stérilisation', 'Température, pression, humidité'],
          ["Avant un examen radiologique chez une femme en âge de procréer, il faut :", 'Rechercher une grossesse', "Vérifier son groupe sanguin", "Vérifier son groupe sanguin et ses allergies à l'iode, même sans injection", "Rien de particulier"],
          ["Le dosimètre individuel porté par le personnel sert à :", 'Mesurer la dose reçue', 'Mesurer la tension artérielle', 'Mesurer le temps de travail', "Prévenir le manipulateur par une alarme lorsqu'il entre dans la zone contrôlée"],
          ["Le principe ALARA signifie :", 'Des doses aussi basses que raisonnablement possible', 'Augmenter les doses pour une meilleure image', 'Ne jamais faire de radiographie', 'Appliquer à chaque patient le même réglage standard pour comparer les images'],
        ],
      },
      {
        nom: 'Radiologie conventionnelle',
        questions: [
          ["Une radiographie pulmonaire de face standard se fait de préférence :", 'Debout, en inspiration bloquée', 'Couché, en expiration forcée', 'Assis, en expiration complète, pour mieux voir les bases pulmonaires', "Debout, en toussant pendant l'exposition"],
          ["Pour la radiographie d'un membre traumatisé, on réalise habituellement :", 'Deux incidences : face et profil', 'Une seule incidence de face', 'Uniquement un profil', 'Une incidence oblique seule'],
          ["Avant une radiographie, on demande au patient de retirer :", 'Le métal de la zone examinée', 'Ses chaussettes uniquement', "Tous ses vêtements, même pour une radiographie d'un doigt", 'Rien du tout, la radiographie traversant le métal'],
          ["Sur une radiographie standard, l'os apparaît :", 'Blanc (radio-opaque)', 'Noir', 'Transparent', 'Gris foncé comme l\'air'],
        ],
      },
      {
        nom: 'Scanner et IRM',
        questions: [
          ["Quelle est la principale contre-indication à l'IRM ?", 'Certains implants (pacemaker non compatible…)', 'Le diabète', 'Une prothèse dentaire en résine ou des lentilles de contact souples', 'Le port de lentilles de contact ou de lunettes'],
          ["Avant l'injection d'un produit de contraste iodé, on recherche notamment :", 'Une allergie et une insuffisance rénale', 'Une myopie ou un daltonisme', 'Un groupe sanguin rare', "Un antécédent d'appendicectomie"],
          ["L'IRM utilise :", 'Un champ magnétique et des radiofréquences', 'Des rayons X', 'Des ultrasons', 'Des rayons X à faible dose associés à un champ électrique'],
          ["Le scanner (tomodensitométrie) utilise :", 'Des rayons X', 'Un champ magnétique', 'Des ultrasons', 'Aucun rayonnement'],
          ["Chez un patient diabétique traité par metformine, l'injection d'iode impose surtout de :", "Vérifier la fonction rénale et suivre le protocole d'arrêt temporaire si nécessaire", "Doubler la dose de metformine", "Arrêter définitivement la metformine et la remplacer par de l'insuline", "Contre-indiquer définitivement l'examen"],
        ],
      },
    ],
  },
  {
    cle: 'laboratoire',
    label: 'Laboratoire / biologie médicale',
    competences: [
      {
        nom: 'Phase pré-analytique',
        questions: [
          ["Un tube arrive au laboratoire sans étiquette d'identification. Que faire ?", 'Le refuser, redemander un prélèvement', 'Le traiter et deviner le patient', "L'étiqueter avec le patient le plus probable", "L'analyser et rendre le résultat au service, qui retrouvera le patient concerné"],
          ["La glycémie à jeun se prélève après un jeûne d'au moins :", '8 heures', '1 heure', '30 minutes', '24 heures'],
          ["Une hémolyse de l'échantillon augmente faussement notamment :", 'Le potassium', 'Le sodium', 'La glycémie', 'Les plaquettes'],
          ["Un tube pour bilan d'hémostase (citrate) insuffisamment rempli :", 'Fausse les résultats', 'Donne des résultats plus précis', 'Est sans conséquence', 'Peut être analysé normalement si le laboratoire corrige le résultat par le calcul'],
          ["Un échantillon pour gazométrie artérielle doit être :", 'Analysé vite, sans bulle', 'Laissé à l\'air libre une heure', 'Congelé avant analyse', "Laissé débouché quelques minutes pour équilibrer l'oxygène avant l'analyse"],
        ],
      },
      {
        nom: 'Hématologie',
        questions: [
          ["Le taux normal d'hémoglobine chez une femme adulte est d'environ :", '12 à 16 g/dL', '5 à 8 g/dL', '18 à 22 g/dL', '1 à 3 g/dL'],
          ["Le nombre normal de plaquettes chez l'adulte est d'environ :", '150 000 à 400 000 /mm³', '10 000 à 50 000 /mm³', '1 à 2 millions /mm³ de sang', '4 000 à 10 000 /mm³ de sang'],
          ["Le nombre normal de leucocytes chez l'adulte est d'environ :", '4 000 à 10 000 /mm³', '150 000 à 400 000 /mm³', '500 à 1 000 /mm³', '50 000 /mm³'],
          ["Un VGM (volume globulaire moyen) bas évoque principalement :", 'Une anémie microcytaire', 'Une carence en vitamine B12 ou en folates, très fréquente', 'Une polyglobulie', 'Une leucémie certaine'],
          ["Le receveur universel en transfusion de globules rouges est de groupe :", 'AB Rh+', 'O Rh−', 'O Rh+', 'AB Rh−'],
        ],
      },
      {
        nom: 'Analyses biochimiques',
        questions: [
          ["La glycémie à jeun normale est d'environ :", '0,70 à 1,10 g/L', '0,20 à 0,40 g/L', '2 à 3 g/L', '1,50 à 2 g/L'],
          ["La kaliémie (potassium) normale est d'environ :", '3,5 à 5,0 mmol/L', '135 à 145 mmol/L', '0,5 à 1,0 mmol/L', '8 à 10 mmol/L'],
          ["La natrémie (sodium) normale est d'environ :", '135 à 145 mmol/L', '3,5 à 5 mmol/L', '95 à 105 mmol/L', '160 à 180 mmol/L'],
          ["La créatininémie est surtout utilisée pour évaluer :", 'La fonction rénale', 'La fonction hépatique', 'La coagulation', 'La thyroïde'],
          ["L'HbA1c (hémoglobine glyquée) reflète l'équilibre glycémique des :", '2 à 3 derniers mois', '24 dernières heures', '7 derniers jours', '2 dernières années'],
        ],
      },
      {
        nom: 'Microbiologie',
        questions: [
          ["La coloration de Gram permet de distinguer :", 'Gram positif et Gram négatif', 'Les virus des bactéries', 'Les groupes sanguins', 'Les cellules cancéreuses'],
          ["Pour un ECBU, le recueil des urines se fait :", 'Après toilette, milieu de jet, flacon stérile', 'Au premier jet, sans toilette', 'Dans n\'importe quel récipient propre', 'Au premier jet du matin, sans toilette, pour recueillir le plus de bactéries'],
          ["Un échantillon pour culture bactériologique qui ne peut être analysé immédiatement est :", 'Conservé selon le protocole (souvent à +4 °C)', 'Laissé à 37 °C au soleil', 'Congelé systématiquement à −80 °C', "Laissé à température ambiante jusqu'au lendemain, les bactéries ne se multipliant pas"],
          ["Escherichia coli est :", 'Un bacille Gram négatif', 'Un coque Gram positif', 'Un champignon levuriforme', 'Un coque Gram positif qui se dispose en chaînettes'],
        ],
      },
    ],
  },
  {
    cle: 'pharmacie',
    label: 'Pharmacie',
    competences: [
      {
        nom: 'Gestion des stocks pharmaceutiques',
        questions: [
          ["La règle de rotation des stocks recommandée pour les médicaments est :", 'Premier périmé, premier sorti', 'Premier entré, premier sorti, quelle que soit la date de péremption', 'Au hasard', 'Le plus cher en premier'],
          ["Un médicament périmé trouvé en rayon doit être :", 'Retiré, isolé, éliminé', 'Délivré en priorité', 'Remis en rayon après vérification visuelle', "Délivré en priorité s'il est périmé depuis moins d'un mois"],
          ["Le stock de sécurité correspond à :", 'La quantité minimale gardée pour faire face aux retards ou à une hausse de consommation', "Le stock de médicaments périmés", 'Le stock maximal autorisé pour une seule commande', "La quantité de médicaments rangée dans l'armoire sécurisée"],
          ["L'inventaire permet de :", 'Comparer stock réel et stock théorique', 'Fixer les prix de vente', 'Remplacer les ordonnances', 'Calculer les salaires'],
        ],
      },
      {
        nom: 'Délivrance et conseil',
        questions: [
          ["Avant de délivrer un médicament, il faut vérifier sur l'ordonnance :", 'Patient, prescripteur, date, posologie, durée', 'Uniquement le nom du médicament', 'Uniquement le nom du médicament et la signature du prescripteur', 'Uniquement le prix'],
          ["Un médicament « générique » est :", 'Une copie du médicament de référence, avec le même principe actif et la même efficacité', 'Un médicament moins dosé, donc moins efficace, mais moins cher', 'Un médicament sans principe actif, utilisé comme placebo', "Un médicament réservé à l'hôpital"],
          ["La posologie « 1 cp 3 fois par jour pendant 7 jours » correspond à :", '21 comprimés', '7 comprimés', '10 comprimés', '3 comprimés'],
          ["Un patient sous anticoagulant (AVK) demande de l'aspirine pour un mal de tête. Que conseiller ?", "Éviter l'aspirine et orienter", "Délivrer de l'aspirine à forte dose", "Doubler l'anticoagulant", "Délivrer de l'aspirine à faible dose, qui ne pose pas de problème avec les AVK"],
        ],
      },
      {
        nom: 'Conservation des médicaments',
        questions: [
          ["La plupart des vaccins et insulines non entamées se conservent :", 'Entre +2 et +8 °C', 'Au congélateur, pour prolonger leur durée de conservation', 'À température ambiante au soleil', 'À plus de 30 °C'],
          ["La « chaîne du froid » signifie :", 'Une température maintenue sans interruption', "Le stockage des médicaments au congélateur", 'Le stockage de tous les médicaments au réfrigérateur dès leur réception', "Le refroidissement du patient"],
          ["Un flacon d'insuline en cours d'utilisation peut généralement être conservé :", 'À température ambiante (moins de 25-30 °C) pendant environ 4 semaines, selon la notice', 'Au congélateur', "Au réfrigérateur uniquement, jusqu'à la date de péremption de la boîte", 'Au soleil'],
          ["La température du réfrigérateur à médicaments doit être :", 'Contrôlée et tracée régulièrement', 'Vérifiée une fois par an', 'Jamais vérifiée', 'Réglée sur la position la plus froide (négative)'],
        ],
      },
    ],
  },
  {
    cle: 'reeducation',
    label: 'Rééducation',
    competences: [
      {
        nom: 'Rééducation fonctionnelle',
        questions: [
          ["Après une prothèse totale de hanche par voie postérieure, quel mouvement est à éviter en début de rééducation ?", 'Flexion, adduction et rotation interne', 'La marche avec aide technique', 'La marche avec cannes et la contraction statique du quadriceps dès le lendemain', 'La respiration profonde'],
          ["Le testing musculaire coté de 0 à 5 : la cote 3 correspond à :", 'Un mouvement complet contre la pesanteur, sans résistance', 'Une contraction visible sans aucun mouvement', 'Une force normale', 'Une contraction sans mouvement'],
          ["Pour un patient hémiplégique, la canne se tient :", 'Du côté sain', 'Du côté atteint', 'Avec les deux mains', 'Elle est déconseillée'],
          ["La mobilisation précoce après une chirurgie vise notamment à prévenir :", 'Phlébite, escarres, enraidissement', 'La fièvre', 'L\'hypoglycémie', 'La fièvre postopératoire et les infections du site opératoire'],
          ["Une entorse récente de la cheville se prend en charge initialement par :", 'Glace, compression, surélévation', 'Massage profond immédiat de la zone', 'Chaleur, massage et reprise immédiate de la marche sans limitation', 'Chaleur et reprise immédiate de la course'],
        ],
      },
      {
        nom: 'Kinésithérapie respiratoire',
        questions: [
          ["Le désencombrement bronchique vise à :", 'Évacuer les sécrétions bronchiques', 'Augmenter la tension artérielle', 'Diminuer la fréquence cardiaque', 'Augmenter la capacité respiratoire par un renforcement des muscles'],
          ["Chez le patient BPCO, la ventilation lèvres pincées permet de :", "Freiner l'expiration", 'Accélérer la respiration', "Accélérer l'inspiration pour mieux oxygéner le sang", 'Augmenter la toux sèche'],
          ["La spirométrie incitative après chirurgie abdominale sert à :", 'Prévenir les atélectasies en encourageant les inspirations profondes', 'Mesurer la capacité pulmonaire avant la sortie', "Renforcer les muscles abdominaux après l'intervention", 'Faire travailler les abdominaux après la chirurgie'],
          ["Pendant une séance, une SpO2 qui chute à 86 % impose de :", "Interrompre l'effort et surveiller / alerter selon la prescription d'oxygène", 'Augmenter l\'intensité', "Poursuivre l'exercice : la saturation remonte toujours à l'arrêt", 'Retirer l\'oxygène'],
        ],
      },
      {
        nom: 'Bilan et évaluation',
        questions: [
          ["Le bilan initial en rééducation sert à :", 'Poser un diagnostic fonctionnel', 'Remplacer la prescription médicale', 'Remplacer la prescription médicale et choisir le nombre de séances', 'Choisir les horaires'],
          ["La goniométrie mesure :", 'Les amplitudes articulaires', 'La force musculaire de chaque muscle', 'La fréquence respiratoire', 'La force musculaire de chaque groupe de muscles'],
          ["L'échelle visuelle analogique (EVA) évalue :", 'La douleur', "L'équilibre", "La force de préhension", "L'anxiété et la qualité du sommeil du patient"],
          ["Un objectif de rééducation bien formulé est :", 'Précis, mesurable et daté', 'Vague pour pouvoir s\'adapter', 'Fixé uniquement par la famille', 'Le même pour tous les patients'],
        ],
      },
    ],
  },
  {
    cle: 'nutrition',
    label: 'Diététique et nutrition',
    competences: [
      {
        nom: 'Nutrition clinique',
        questions: [
          ["L'indice de masse corporelle (IMC) se calcule ainsi :", 'Poids / taille²', 'Taille divisée par le poids', 'Poids (kg) divisé par la taille (cm), multiplié par 100', 'Poids moins la taille en cm'],
          ["Chez l'adulte, un IMC entre 18,5 et 25 correspond à :", 'Une corpulence normale', 'Une obésité', 'Une dénutrition sévère', 'Un surpoids'],
          ["Combien de kilocalories apporte 1 g de lipides ?", 'Environ 9 kcal', 'Environ 4 kcal', 'Environ 7 kcal', 'Environ 1 kcal'],
          ["Combien de kilocalories apporte 1 g de protéines ou de glucides ?", 'Environ 4 kcal', 'Environ 9 kcal', 'Environ 12 kcal', 'Environ 0,5 kcal'],
          ["Une perte de poids involontaire de plus de 5 % en un mois doit faire évoquer :", 'Une dénutrition', 'Un régime réussi', 'Une situation normale', 'Une déshydratation bénigne uniquement'],
        ],
      },
      {
        nom: 'Prise en charge du diabète',
        questions: [
          ["Quels sont les signes typiques d'une hypoglycémie ?", 'Sueurs, tremblements, faim, palpitations, confusion', 'Soif intense, urines abondantes et bouche sèche', 'Fièvre et toux', 'Démangeaisons'],
          ["Face à une hypoglycémie chez un patient conscient, on donne :", '15 g de sucre rapide, puis contrôle', 'Un repas complet riche en graisses et en protéines', "De l'insuline rapide en sous-cutané, puis contrôle", 'Rien, cela passera seul en quelques minutes'],
          ["Les aliments à index glycémique bas :", 'Font monter la glycémie plus lentement', 'Font monter la glycémie très rapidement', 'Ne contiennent aucun glucide', 'Sont interdits aux diabétiques'],
          ["Chez le diabétique, l'activité physique régulière :", 'Améliore l\'équilibre glycémique', 'Est contre-indiquée', 'Fait toujours monter la glycémie', 'N\'a aucun effet'],
        ],
      },
    ],
  },
  {
    cle: 'aide',
    label: 'Aide-soignant(e) / auxiliaire',
    competences: [
      {
        nom: "Soins d'hygiène et de confort",
        questions: [
          ["Lors d'une toilette au lit, on procède :", 'Du plus propre vers le plus sale', 'Du plus sale vers le plus propre', 'Dans n\'importe quel ordre', 'Uniquement le visage'],
          ["Pendant la toilette d'un patient, il faut préserver :", 'Son intimité et son autonomie', 'Uniquement la rapidité du soin', 'La rapidité du soin, pour réduire le temps où il est découvert', 'La fenêtre ouverte en hiver'],
          ["Un patient qui peut faire une partie de sa toilette seul :", 'Doit être encouragé à la faire', "Doit être lavé entièrement par le soignant pour éviter qu'il se fatigue", 'Ne doit pas être lavé', 'Doit attendre sa famille pour faire sa toilette'],
          ["Pendant la toilette, vous remarquez une rougeur au sacrum. Que faites-vous ?", 'Vous le signalez et le notez', 'Vous la massez énergiquement avec une crème pour réactiver la circulation', 'Vous n\'en parlez pas', 'Vous appliquez de l\'alcool'],
          ["Les soins de bouche chez un patient alité permettent de prévenir :", 'Infections buccales et inconfort', 'Les fractures', 'L\'hypertension', 'Les escarres du talon'],
        ],
      },
      {
        nom: 'Prévention des escarres',
        questions: [
          ["Quelles sont les zones les plus à risque d'escarre chez un patient alité sur le dos ?", 'Sacrum, talons, coudes', 'Ventre et cuisses', 'Mains et doigts', 'Ventre, cuisses et face antérieure des genoux'],
          ["Pour prévenir les escarres, il faut changer la position d'un patient à risque :", 'Toutes les 2 à 3 heures environ', 'Une fois par jour, au moment de la toilette du matin', 'Une fois par jour, lors de la toilette du matin', 'Jamais pour ne pas le réveiller'],
          ["Quel facteur favorise l'apparition d'une escarre ?", "La dénutrition et l'immobilité", 'Une marche régulière', 'Une hydratation suffisante et une alimentation riche en protéines', 'Un matelas adapté et des changements de position réguliers'],
          ["Quel outil sert à évaluer le risque d'escarre ?", "L'échelle de Braden", "Le score de Glasgow", "L'échelle visuelle analogique (EVA) d'évaluation de la douleur", "Le score d'Apgar du nouveau-né"],
        ],
      },
      {
        nom: 'Manutention des patients',
        questions: [
          ["Pour soulever une charge ou aider un patient, il faut :", 'Dos droit, genoux fléchis', 'Plier le dos en gardant les jambes tendues pour protéger les genoux', 'Faire une torsion du tronc', 'Porter seul, loin du corps'],
          ["Avant de lever un patient, la première chose à faire est :", 'Expliquer et évaluer ses capacités', 'Le lever rapidement sans prévenir', 'Appeler sa famille', "Retirer les freins du lit pour pouvoir l'approcher du fauteuil"],
          ["Lors d'un transfert lit-fauteuil, le fauteuil doit être :", 'Près du lit, freins serrés', 'Placé loin du lit', 'Freins desserrés', 'Sans repose-pieds réglés'],
          ["Un lève-personne (soulève-malade) est utilisé :", 'Pour les patients non participants', 'Uniquement pour les enfants et les patients légers', 'Pour tous les patients, y compris ceux qui peuvent se lever seuls', 'Pour tous les patients autonomes qui marchent seuls'],
        ],
      },
      {
        nom: 'Aide aux repas et hydratation',
        questions: [
          ["Pour aider un patient présentant des troubles de la déglutition à manger, il faut l'installer :", 'Assis, tête fléchie en avant', 'Allongé à plat sur le dos', 'Tête en arrière', 'Assis, tête en arrière'],
          ["Un patient tousse et s'étouffe à chaque gorgée d'eau. Vous devez :", 'Arrêter et le signaler', 'Lui donner plus vite à boire', "Lui donner plus vite à boire, par grandes gorgées, pour éviter qu'il tousse", 'Ne rien signaler'],
          ["Quels signes peuvent évoquer une déshydratation chez une personne âgée ?", 'Bouche sèche, urines foncées, confusion', 'Prise de poids rapide', 'Œdèmes des jambes uniquement', 'Une prise de poids et des œdèmes'],
          ["La surveillance des repas consiste notamment à :", 'Noter les quantités consommées', 'Débarrasser rapidement pour libérer la table', 'Forcer le patient à finir', 'Supprimer les collations entre les repas'],
        ],
      },
    ],
  },
  {
    cle: 'accueil',
    label: 'Accueil et secrétariat médical',
    competences: [
      {
        nom: 'Accueil et relation patient',
        questions: [
          ["Un patient s'énerve à l'accueil après une longue attente. La meilleure attitude est :", 'Rester calme, écouter, informer', 'Lui répondre sur le même ton', "L'ignorer jusqu'à ce qu'il se calme", 'Appeler immédiatement la sécurité pour le faire sortir de la salle'],
          ["Au téléphone, un appelant décrit une douleur thoracique intense. Que faire ?", 'Orienter vers le SAMU (190)', 'Lui donner un rendez-vous la semaine suivante', 'Lui conseiller de prendre un antalgique et de rappeler si la douleur persiste', 'Raccrocher'],
          ["L'écoute active consiste à :", 'Reformuler et questionner', 'Préparer sa réponse pendant que la personne parle, pour gagner du temps', 'Couper la parole pour gagner du temps', 'Écouter en faisant autre chose'],
          ["Pour accueillir une personne malentendante, il est préférable de :", 'Être face à elle, parler lentement', 'Crier', 'Parler en tournant le dos', "S'adresser uniquement à l'accompagnant, qui transmettra les informations"],
        ],
      },
      {
        nom: 'Gestion du dossier patient',
        questions: [
          ["Le dossier patient doit être :", 'Confidentiel et à jour', 'Laissé sur le bureau d\'accueil', 'Communiqué à toute personne de la famille qui en fait la demande', 'Détruit après chaque consultation'],
          ["Deux patients portent le même nom et prénom. Pour éviter une erreur, vous vérifiez :", 'Date de naissance et n° de dossier', "Uniquement l'adresse, qui suffit à différencier les deux patients", 'La couleur des vêtements', 'Rien, ils sont identiques'],
          ["Votre session sur le logiciel du cabinet doit être :", 'Verrouillée dès que vous quittez votre poste', 'Laissée ouverte pour les collègues', 'Partagée avec un mot de passe commun affiché', 'Ouverte en permanence'],
          ["Un résultat d'analyse arrive pour un patient. Vous pouvez le communiquer par téléphone :", 'Non, sauf procédure prévue : les résultats sont remis au patient ou au médecin de façon sécurisée', 'Oui, à toute personne qui donne le nom et la date de naissance du patient', 'À l\'employeur du patient', 'Au voisin'],
        ],
      },
      {
        nom: 'Terminologie médicale',
        questions: [
          ["Le suffixe « -ite » signifie :", 'Inflammation', 'Ablation chirurgicale', 'Douleur', "Tumeur bénigne d'un organe ou d'un tissu"],
          ["Le suffixe « -ectomie » signifie :", 'Ablation', 'Inflammation', "Examen visuel à l'aide d'un instrument optique", 'Suture'],
          ["« Tachycardie » signifie :", 'Cœur rapide', 'Rythme cardiaque lent', 'Arrêt du cœur', 'Tension artérielle élevée de façon permanente'],
          ["Le préfixe « hyper- » signifie :", 'Au-dessus, excès', 'En dessous, insuffisance', 'Autour', 'À l\'intérieur'],
          ["Un « ORL » est spécialiste :", 'Oreilles, nez, gorge', 'Des os, des articulations et des ligaments', 'Du cœur et des vaisseaux', 'De la peau et des muqueuses'],
        ],
      },
    ],
  },
  {
    cle: 'ambulance',
    label: 'Transport sanitaire',
    competences: [
      {
        nom: 'Transport sanitaire',
        questions: [
          ["Quel est le numéro du SAMU en Tunisie ?", '190', '197', '198', '1 899'],
          ["Pendant le transport, un patient devient pâle, en sueurs et ne répond plus. Que faire ?", "Arrêter le véhicule en sécurité, évaluer conscience et respiration, alerter et débuter les gestes d'urgence", "Accélérer sans rien vérifier", "Ouvrir les fenêtres et continuer en accélérant vers l'hôpital", "Attendre l'arrivée à l'hôpital"],
          ["Après un transport de patient contagieux, l'ambulance doit être :", 'Désinfectée selon le protocole', 'Utilisée immédiatement', 'Aérée pendant quelques minutes avant le transport suivant', 'Lavée une fois par mois'],
          ["Lors du transport, le brancard doit être :", 'Verrouillé dans son système de fixation, patient sanglé', 'Libre de bouger, pour amortir les secousses de la route', 'Retiré du véhicule', 'Sans sangles'],
        ],
      },
      {
        nom: 'Immobilisation et relevage',
        questions: [
          ["Chez un blessé suspect de traumatisme du rachis, il faut :", "Maintenir la tête dans l'axe", "Le faire asseoir rapidement pour vérifier qu'il peut bouger les jambes", 'Lui tourner la tête pour le faire parler', 'Le soulever par les bras'],
          ["Le matelas immobilisateur à dépression (coquille) sert à :", 'Immobiliser tout le corps', 'Réchauffer le patient et le protéger du sol pendant le transport', 'Réchauffer le patient pendant le trajet', 'Mesurer la tension et le pouls'],
          ["Une attelle doit immobiliser :", 'Les articulations sus- et sous-jacentes', 'Uniquement le foyer de fracture', "Tout le corps", "Aucune articulation"],
          ["Avant de poser une attelle sur un membre, on vérifie :", 'Sensibilité, motricité, circulation', 'Uniquement la douleur', 'La température corporelle et la tension artérielle du blessé', 'Rien'],
        ],
      },
    ],
  },
];

/* ---------- Compétences propres aux nouveaux métiers ---------- */
const SOINS_PEDIATRIQUES: CompetenceQcm = {
  nom: 'Soins pédiatriques',
  questions: [
    ["Chez l'enfant, la dose d'un médicament est généralement calculée :", 'En fonction du poids (mg/kg)', "Uniquement selon l'âge en années", 'Comme chez l\'adulte, divisée par deux', 'Selon la taille seulement'],
    ["Le paracétamol chez l'enfant se donne habituellement à la dose de :", '15 mg/kg toutes les 6 heures', '50 mg/kg par prise', '1 g par prise quel que soit l\'âge', '5 mg/kg toutes les 2 heures, sans dose maximale journalière'],
    ["Un nourrisson a une diarrhée, la fontanelle déprimée et les yeux creux. Il faut suspecter :", 'Une déshydratation', 'Une constipation', 'Une poussée dentaire', 'Une otite simple'],
    ["Pour prévenir la mort inattendue du nourrisson, on le couche :", 'Sur le dos, sans oreiller', 'Sur le ventre', "Sur le côté, calé par des coussins pour éviter qu'il ne se retourne", 'Dans le lit des parents avec un oreiller'],
    ["Un enfant fait une convulsion avec de la fièvre. Que faire en premier ?", 'Le protéger des chocs, ne rien mettre dans sa bouche, le placer en position latérale de sécurité après la crise et alerter', 'Lui mettre un objet entre les dents', "Le plonger dans un bain d'eau froide pour faire baisser la fièvre", 'Le maintenir fermement et lui mettre un objet entre les dents'],
    ["La fréquence cardiaque normale d'un nourrisson au repos est d'environ :", '100 à 160 battements/min', '40 à 60 battements/min', '60 à 80 battements/min', '200 à 240 battements/min'],
  ],
};
const PMA: CompetenceQcm = {
  nom: 'Laboratoire de PMA',
  questions: [
    ["L'ICSI consiste à :", "Injecter un spermatozoïde directement dans le cytoplasme de l'ovocyte", 'Déposer les spermatozoïdes dans l\'utérus', 'Congeler les ovocytes', "Mettre en contact ovocytes et spermatozoïdes dans une boîte sans micro-injection"],
    ["Les gamètes et les embryons sont cryoconservés dans :", "L'azote liquide", 'Un congélateur à −80 °C, dans des paillettes étiquetées', 'Un réfrigérateur à +4 °C', "L'incubateur à 37 °C"],
    ["Règle essentielle à chaque manipulation de gamètes ou d'embryons au laboratoire de PMA :", "La double vérification de l'identité", "La vérification par une seule personne en fin de journée", "L'étiquetage des boîtes après la manipulation", "Le contrôle uniquement lors du transfert"],
    ["Le stade blastocyste est généralement atteint :", 'Vers J5–J6', 'Au 1er jour', "Au 2e jour, quand l'embryon compte environ quatre cellules", 'Au 10e jour'],
    ["Avant un spermogramme, la durée d'abstinence recommandée est généralement de :", '2 à 7 jours', '12 heures', '15 jours au minimum', '1 mois'],
    ["Les incubateurs de culture embryonnaire sont réglés à :", 'Environ 37 °C, CO2 contrôlé', '+4 °C', 'La température ambiante, avec une atmosphère enrichie en oxygène pur', '42 °C'],
  ],
};
const ENCADREMENT: CompetenceQcm = {
  nom: 'Encadrement et organisation des soins',
  questions: [
    ["Le planning de l'équipe soignante doit avant tout garantir :", 'La continuité et la sécurité des soins', 'Le même nombre de gardes pour tous, quelle que soit l\'activité', 'Les préférences de chacun avant les besoins du service', 'Un minimum de personnel la nuit, sans exception'],
    ["Un nouvel infirmier arrive dans le service. La bonne pratique est :", "L'intégrer avec un tuteur", 'Le laisser seul dès le premier jour pour le tester', "Lui confier uniquement les nuits, plus calmes, pour qu'il s'adapte seul", 'Attendre qu\'il pose des questions'],
    ["Deux soignants se disputent devant les patients. Que faites-vous en premier ?", 'Les recevoir à part et écouter chacun', 'Laisser faire, ils finiront par se calmer', 'Sanctionner immédiatement les deux devant l\'équipe', 'Changer l\'un d\'eux de service sans discussion'],
    ["Un infirmier peut confier un soin à un aide-soignant :", "S'il relève de ses compétences", 'Toujours, quel que soit le soin', "Uniquement la nuit, lorsque l'effectif infirmier est réduit, quel que soit le soin", 'Si le médecin est absent'],
    ["Les transmissions lors de la relève servent avant tout à :", 'Assurer la continuité des soins', 'Remplir le temps de la relève', "Évaluer le travail des soignants de l'équipe précédente", 'Remplacer le dossier de soins par un échange oral'],
  ],
};
const QUALITE: CompetenceQcm = {
  nom: 'Qualité et gestion des risques',
  questions: [
    ["Après un événement indésirable grave, l'encadrant doit :", 'Sécuriser, déclarer, analyser les causes', 'Rechercher le responsable pour le sanctionner rapidement', 'Ne rien déclarer si le patient va bien', "Attendre une plainte écrite de la famille avant d'agir"],
    ["Une revue de morbi-mortalité (RMM) a pour but :", "D'analyser les causes ensemble", "D'identifier le soignant fautif pour le sanctionner devant ses collègues", 'De calculer les primes', 'D\'informer la presse'],
    ["Le chariot d'urgence du service doit être :", 'Vérifié régulièrement, avec traçabilité', 'Vérifié uniquement après une utilisation', 'Fermé à clé, clé chez le médecin chef', "Rangé dans une réserve éloignée, à l'abri des patients"],
    ["Un audit montre une faible observance de l'hygiène des mains. L'action la plus pertinente est :", 'Former, équiper, réauditer', 'Supprimer la solution hydro-alcoolique', 'Ne rien changer', 'Imposer le port permanent de gants, changés une fois par poste'],
    ["La traçabilité des soins dans le dossier patient permet :", 'Prouver les soins et assurer la continuité', 'Uniquement de facturer', 'De remplacer toutes les transmissions orales, même les plus urgentes', 'Rien de particulier'],
  ],
};

const comp = (nom: string): CompetenceQcm => {
  const c = FAMILLES_BASE.flatMap((f) => f.competences).find((x) => x.nom === nom);
  if (!c) throw new Error(`Compétence inconnue : ${nom}`);
  return c;
};

/** Familles complètes (les nouvelles combinent des compétences propres et des compétences existantes) */
export const FAMILLES_QCM: readonly FamilleQcm[] = [
  ...FAMILLES_BASE,
  { cle: 'pediatrie', label: 'Pédiatrie', competences: [SOINS_PEDIATRIQUES, comp('Soins néonataux'), comp('Préparation et administration des médicaments')] },
  { cle: 'pma', label: 'Laboratoire de PMA', competences: [PMA, comp('Phase pré-analytique')] },
  { cle: 'sterilisation', label: 'Stérilisation', competences: [comp('Asepsie et stérilisation'), comp('Instrumentation chirurgicale')] },
  { cle: 'panseur', label: 'Panseur(se)', competences: [comp('Pansements et soins des plaies'), comp('Prévention des escarres')] },
  { cle: 'encadrement', label: 'Encadrement des soins', competences: [ENCADREMENT, QUALITE, comp('Préparation et administration des médicaments'), comp('Surveillance des paramètres vitaux')] },
  { cle: 'encadrement_bloc', label: 'Encadrement du bloc opératoire', competences: [ENCADREMENT, QUALITE, comp('Bloc opératoire'), comp('Asepsie et stérilisation')] },
  { cle: 'encadrement_radio', label: "Encadrement de l'imagerie", competences: [ENCADREMENT, QUALITE, comp('Radioprotection'), comp('Scanner et IRM')] },
];

/* ---------- Questions complémentaires (src/lib/qcm-suite) : objectif 20 questions par compétence ---------- */
for (const c of new Set([TRONC_COMMUN, ...FAMILLES_QCM].flatMap((f) => f.competences))) {
  const suite = SUITE[c.nom];
  if (suite) (c as { questions: readonly QuestionBrute[] }).questions = [...c.questions, ...suite];
}
