/**
 * Banque de QCM de compétences.
 * Chaque compétence regroupe des questions à 4 choix ; la bonne réponse est TOUJOURS
 * la première de la liste (les choix sont mélangés à l'affichage).
 * Format d'une question : [énoncé, bonne réponse, distracteur, distracteur, distracteur]
 */
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
        ["Combien de temps dure une friction hydro-alcoolique des mains correctement réalisée ?", 'Environ 20 à 30 secondes', '5 secondes', '2 minutes', '5 minutes'],
        ["Dans quel cas la friction hydro-alcoolique ne suffit pas et un lavage des mains au savon est nécessaire ?", 'Mains visiblement souillées ou contact avec un patient atteint de Clostridioides difficile', 'Avant tout contact avec un patient', 'Après avoir retiré des gants propres', 'Avant une injection intramusculaire'],
        ["Après utilisation, une aiguille doit être :", 'Jetée immédiatement, sans la recapuchonner, dans un collecteur pour objets piquants-coupants', 'Recapuchonnée à deux mains puis jetée', 'Jetée dans le sac à déchets ménagers', "Posée sur le plateau jusqu'à la fin du soin"],
        ["Que faire en premier après une piqûre accidentelle avec une aiguille souillée ?", "Ne pas faire saigner, nettoyer à l'eau et au savon, rincer puis désinfecter (au moins 5 minutes), puis déclarer l'accident", 'Faire saigner fortement la plaie en pressant', "Appliquer de l'alcool à 70° pendant 5 secondes et reprendre le travail", "Attendre la fin de la garde pour consulter"],
        ["Les précautions « standard » s'appliquent :", 'À tous les patients, quel que soit leur statut infectieux', 'Uniquement aux patients infectés connus', 'Uniquement en réanimation', 'Uniquement au bloc opératoire'],
      ],
    },
    {
      nom: "Gestes d'urgence",
      questions: [
        ["Face à un adulte inconscient qui ne respire pas normalement, quel est le rythme des compressions thoraciques ?", '100 à 120 compressions par minute', '60 compressions par minute', '150 à 180 compressions par minute', '30 compressions par minute'],
        ["Chez l'adulte, quel est le rapport compressions / insufflations lors de la réanimation cardio-pulmonaire ?", '30 compressions pour 2 insufflations', '15 pour 2', '5 pour 1', '10 pour 1'],
        ["Quelle est la profondeur recommandée des compressions thoraciques chez l'adulte ?", 'Environ 5 cm (sans dépasser 6 cm)', 'Environ 1 à 2 cm', 'Environ 8 à 10 cm', 'Aussi profond que possible'],
        ["Une victime inconsciente qui respire normalement doit être placée :", 'En position latérale de sécurité', 'Assise', 'Sur le dos, jambes surélevées, sans surveillance', 'Sur le ventre'],
        ["Face à une hémorragie externe importante, le premier geste est :", 'La compression directe de la plaie', "La pose immédiate d'un garrot sur toute plaie", 'La surélévation du membre uniquement', "L'application de glace"],
        ["Un adulte conscient s'étouffe et ne peut plus parler ni tousser. Que faire en premier ?", "Jusqu'à 5 claques vigoureuses dans le dos, puis jusqu'à 5 compressions abdominales si besoin", "Le faire boire de l'eau", 'Le coucher sur le dos et attendre', 'Commencer immédiatement le bouche-à-bouche'],
      ],
    },
    {
      nom: 'Sécurité du patient',
      questions: [
        ["Avant tout soin ou administration d'un traitement, l'identité du patient se vérifie :", 'En lui demandant de décliner ses nom, prénom et date de naissance et en contrôlant le bracelet', 'En lisant le numéro de la chambre', "En lui demandant simplement « Vous êtes bien M. X ? »", 'En se fiant au lit occupé'],
        ["La règle des « 5 B » de l'administration médicamenteuse vise à donner :", 'Le bon médicament, à la bonne dose, par la bonne voie, au bon moment, au bon patient', 'Le médicament le moins cher au bon moment', 'Le bon médicament au bon service', 'Le bon traitement uniquement le matin'],
        ["Quelle mesure réduit le risque de chute d'un patient hospitalisé ?", 'Lit en position basse, sonnette et objets usuels à portée de main', 'Contention systématique de tous les patients âgés', 'Barrières de lit relevées pour tous les patients', 'Éclairage éteint la nuit dans toute la chambre'],
        ["Vous découvrez une erreur d'administration d'un médicament. Que faites-vous ?", "Surveiller le patient, prévenir immédiatement le médecin et déclarer l'événement indésirable", "Ne rien dire si le patient va bien", "Corriger le dossier sans informer personne", "Attendre la visite du lendemain pour en parler"],
        ["Lors d'une transmission orale d'une prescription urgente, la bonne pratique est :", 'Répéter la prescription à voix haute pour la faire confirmer, puis la faire tracer par écrit', 'La mémoriser sans la répéter', "La noter sur un papier libre que l'on jette après", 'Attendre la fin de la garde pour la noter'],
        ["Le bracelet d'identification d'un patient hospitalisé doit être posé :", "Dès l'admission et vérifié avant chaque acte", "Uniquement avant un passage au bloc", "Uniquement si le patient est confus", "À la demande du patient"],
      ],
    },
    {
      nom: 'Éthique et secret professionnel',
      questions: [
        ["Le secret professionnel s'applique :", "À toutes les informations apprises, vues ou comprises dans l'exercice de la profession", 'Uniquement au diagnostic médical', "Uniquement pendant les heures de service", "Uniquement aux médecins"],
        ["Un voisin du patient vous téléphone pour connaître son diagnostic. Que répondez-vous ?", "Vous ne donnez aucune information médicale", "Vous donnez le diagnostic s'il connaît bien le patient", "Vous donnez seulement le nom du service", "Vous lui lisez le compte rendu"],
        ["Avant un soin, le consentement du patient doit être :", 'Libre et éclairé, après une information claire', 'Obtenu uniquement pour les interventions chirurgicales', 'Donné par la famille dans tous les cas', 'Présumé pour tous les soins courants, sans information'],
        ["Publier sur un réseau social la photo d'un patient, même sans son nom :", 'Est interdit sans son accord : cela porte atteinte à sa vie privée et au secret', 'Est autorisé si le visage est flou', 'Est autorisé si le compte est privé', 'Est autorisé après sa sortie'],
        ["Un patient majeur et lucide refuse un soin après avoir été informé. Que faire ?", 'Respecter son refus, le réinformer des risques, prévenir le médecin et tracer le refus', 'Réaliser le soin malgré tout', 'Demander à la famille de signer à sa place', 'Le sortir immédiatement du service'],
      ],
    },
  ],
};

/* ---------- Familles de métiers ---------- */
export const FAMILLES_QCM: readonly FamilleQcm[] = [
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
          ["Le chlorure de potassium (KCl) concentré :", "Ne s'injecte jamais en intraveineuse directe : il doit être dilué et perfusé lentement", "S'injecte en IV directe rapide en cas d'hypokaliémie", "S'administre uniquement en sous-cutané", "Peut être injecté pur dans la tubulure"],
          ["Un médicament prescrit « per os » s'administre :", 'Par la bouche', 'Par voie intraveineuse', 'Par voie sous-cutanée', 'Par voie rectale'],
        ],
      },
      {
        nom: 'Pose de perfusion',
        questions: [
          ["Combien de temps peut-on laisser en place un garrot lors de la pose d'un cathéter veineux périphérique ?", "Le moins longtemps possible, idéalement moins d'une minute", '5 minutes minimum', "Jusqu'à la fin de la perfusion", '15 minutes'],
          ["Quel site privilégier pour un cathéter veineux périphérique chez l'adulte ?", "L'avant-bras, sur le membre non dominant de préférence", 'Le pli du coude en première intention', 'Une veine du membre inférieur', "Le bras porteur d'une fistule artério-veineuse"],
          ["Quel signe doit faire suspecter une extravasation (diffusion) au point de perfusion ?", 'Gonflement, peau froide et pâle, douleur, ralentissement du débit', 'Reflux de sang dans la tubulure', 'Débit qui augmente', 'Peau chaude et rouge le long de la veine sans gonflement'],
          ["Rougeur, chaleur et cordon induré le long de la veine perfusée évoquent :", 'Une phlébite', 'Une hypoglycémie', 'Une réaction allergique généralisée', 'Un fonctionnement normal'],
          ["Avant de brancher une perfusion, la tubulure doit être :", "Purgée afin d'en chasser tout l'air", 'Remplie à moitié', "Laissée vide, l'air étant sans danger", 'Rincée à l\'alcool'],
        ],
      },
      {
        nom: 'Prélèvements sanguins',
        questions: [
          ["Pour une hémoculture, la désinfection de la peau doit être :", 'Soigneuse, avec un antiseptique et un temps de séchage respecté avant la ponction', 'Inutile si le patient est propre', "Réalisée après la ponction", "Faite à l'eau uniquement"],
          ["Le tube à bouchon violet (EDTA) est principalement utilisé pour :", 'La numération formule sanguine (NFS)', 'La glycémie', "Le bilan d'hémostase (TP, TCA)", 'Les hémocultures'],
          ["Le tube citraté (bouchon bleu) pour le bilan d'hémostase doit être :", 'Rempli jusqu\'au trait de remplissage', 'Rempli à moitié', 'Prélevé en dernier impérativement après plusieurs tubes secs', 'Agité vigoureusement pendant une minute'],
          ["Pour éviter une hémolyse lors d'un prélèvement, il faut :", 'Éviter un garrot trop long et ne pas secouer les tubes', 'Utiliser une aiguille la plus fine possible et aspirer fort', 'Laisser le garrot en place plusieurs minutes', 'Agiter énergiquement les tubes'],
          ["Où réaliser un prélèvement sanguin chez un patient perfusé au bras droit ?", 'Au bras opposé (ou en aval de la perfusion après arrêt, selon le protocole)', 'Au-dessus de la perfusion, sur le même bras', 'Directement dans la tubulure de la perfusion en cours', "Il n'y a aucune précaution particulière"],
        ],
      },
      {
        nom: 'Surveillance des paramètres vitaux',
        questions: [
          ["Quelle est la fréquence cardiaque normale d'un adulte au repos ?", '60 à 100 battements/min', '40 à 50 battements/min', '110 à 140 battements/min', '20 à 40 battements/min'],
          ["Quelle est la fréquence respiratoire normale d'un adulte au repos ?", '12 à 20 cycles/min', '4 à 8 cycles/min', '25 à 35 cycles/min', '40 à 50 cycles/min'],
          ["Une saturation (SpO2) de 85 % chez un adulte sans pathologie respiratoire chronique :", 'Est une hypoxémie qui nécessite une prise en charge immédiate', 'Est normale', 'Est normale la nuit', "Ne nécessite qu'une nouvelle mesure le lendemain"],
          ["À partir de quelle température parle-t-on habituellement de fièvre ?", '38 °C', '37 °C', '36,5 °C', '39,5 °C'],
          ["Une glycémie capillaire à 0,50 g/L (2,8 mmol/L) chez un patient diabétique correspond à :", 'Une hypoglycémie', 'Une glycémie normale', 'Une hyperglycémie', 'Une acidocétose'],
          ["Hypotension, tachycardie, pâleur et sueurs après une intervention doivent faire suspecter :", 'Une hémorragie / un état de choc', 'Une hypertension', 'Un réveil normal', 'Une hypothermie bénigne'],
        ],
      },
      {
        nom: 'Pansements et soins des plaies',
        questions: [
          ["Le nettoyage d'une plaie propre se fait :", 'Du plus propre vers le plus sale', 'Du plus sale vers le plus propre', 'Par mouvements de va-et-vient', "Uniquement à l'alcool"],
          ["Quel est le produit de première intention pour nettoyer une plaie chronique (ulcère, escarre) ?", "Sérum physiologique (ou eau et savon doux)", 'Eau oxygénée pure', 'Alcool à 90°', 'Éosine aqueuse systématique'],
          ["Une escarre de stade 1 se caractérise par :", "Une rougeur persistante qui ne blanchit pas à la pression, peau intacte", 'Une plaie profonde avec os visible', 'Une phlyctène ouverte', 'Une nécrose noire'],
          ["Quels signes locaux évoquent l'infection d'une plaie ?", 'Rougeur, chaleur, douleur, œdème, écoulement purulent', 'Bourgeonnement rose et indolore', 'Plaie qui se rétrécit', 'Absence de douleur'],
          ["Un pansement doit être refait :", 'Selon la prescription ou s\'il est souillé, décollé ou mouillé', 'Toutes les heures', 'Jamais avant la sortie', 'Uniquement si le patient le demande'],
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
          ["Le compte des compresses, aiguilles et instruments au bloc opératoire est réalisé :", "Avant l'incision, avant la fermeture et en fin d'intervention, et tracé", 'Uniquement en fin de journée', 'Uniquement si le chirurgien le demande', 'Une seule fois en début de programme'],
          ["Un instrument stérile tombe au sol pendant l'intervention. Que faites-vous ?", 'Il est considéré comme contaminé : il est retiré et remplacé', "Il est réutilisé après l'avoir essuyé", "Il est trempé dans l'alcool puis réutilisé", 'Il est réutilisé si personne ne l\'a vu'],
          ["Quel instrument sert principalement à saisir et clamper un vaisseau ?", 'Une pince hémostatique (type Kocher ou Pean)', 'Un écarteur de Farabeuf', 'Une curette', 'Un porte-aiguille'],
          ["Le porte-aiguille sert à :", "Tenir l'aiguille lors de la suture", 'Couper les fils', 'Écarter les berges de la plaie', 'Aspirer le sang'],
          ["Qui peut toucher la table d'instrumentation stérile ?", "Uniquement les personnes habillées stérilement", "Toute l'équipe du bloc", "L'infirmier circulant", "Le brancardier"],
        ],
      },
      {
        nom: 'Asepsie et stérilisation',
        questions: [
          ["Avant la stérilisation, un dispositif médical réutilisable doit être :", 'Pré-désinfecté, nettoyé, séché puis conditionné', 'Directement mis dans l\'autoclave sale', 'Seulement rincé à l\'eau', "Désinfecté à l'alcool et rangé"],
          ["Quel est le cycle de référence de l'autoclave pour les dispositifs médicaux en stérilisation hospitalière ?", '134 °C pendant au moins 18 minutes', '100 °C pendant 5 minutes', '60 °C pendant 1 heure', '200 °C pendant 2 minutes'],
          ["Le test de Bowie-Dick sert à vérifier :", "La bonne pénétration de la vapeur et l'évacuation de l'air dans l'autoclave", "La stérilité d'un instrument", "La propreté des mains", "La date de péremption des emballages"],
          ["Un sachet de stérilisation est déchiré ou humide :", "Le contenu est considéré comme non stérile", "Il peut être utilisé s'il est récent", "Il suffit de le scotcher", "Il peut être utilisé au bloc si l'intervention est courte"],
          ["Le lavage chirurgical des mains est réalisé :", "Avant d'enfiler la casaque et les gants stériles", "Après l'intervention uniquement", "Uniquement si les mains sont sales", "Avec une solution hydro-alcoolique sur des mains souillées"],
        ],
      },
      {
        nom: 'Bloc opératoire',
        questions: [
          ["La check-list « sécurité du patient au bloc opératoire » se déroule :", "Avant l'induction, avant l'incision et après l'intervention", 'Uniquement à la sortie du bloc', 'Seulement pour les urgences', 'Le lendemain de l\'intervention'],
          ["Le « temps de pause » avant l'incision permet de vérifier :", "L'identité du patient, le côté et le site opératoire, l'intervention prévue", 'Le nombre de lits disponibles', 'Les horaires de l\'équipe', 'Le programme du lendemain'],
          ["Lors de l'installation du patient sur la table, le principal risque à prévenir est :", 'Les compressions et lésions cutanées ou nerveuses', 'La fièvre', "L'hyperglycémie", "L'allergie au latex chez tous les patients"],
          ["La plaque neutre du bistouri électrique doit être placée :", 'Sur une zone musculaire bien vascularisée, propre et sèche, proche du site opératoire', 'Sur une saillie osseuse', 'Sur une cicatrice', 'Sur une zone humide'],
          ["Dans la salle d'opération, les portes doivent rester :", 'Fermées autant que possible pour limiter la contamination de l\'air', 'Ouvertes en permanence pour aérer', 'Ouvertes pendant l\'incision', 'Sans importance'],
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
          ["Le travail actif est défini par une dilatation du col :", 'À partir d\'environ 5 à 6 cm avec des contractions régulières', 'À partir de 1 cm', 'Uniquement à 10 cm', 'Dès la perte du bouchon muqueux'],
          ["La délivrance correspond à :", "L'expulsion du placenta et des membranes", "La sortie de l'enfant", "La rupture de la poche des eaux", "Le début des contractions"],
          ["Une hémorragie du post-partum est définie par une perte sanguine d'au moins :", '500 mL dans les 24 heures suivant l\'accouchement', '100 mL', '200 mL', '2 000 mL'],
          ["Quel médicament est recommandé en prévention de l'hémorragie de la délivrance ?", "L'ocytocine", "L'insuline", "Le paracétamol", "Le salbutamol"],
          ["La présentation la plus fréquente à l'accouchement est :", 'La présentation céphalique (sommet)', 'Le siège', 'La présentation transverse', 'La présentation de la face'],
        ],
      },
      {
        nom: 'Soins néonataux',
        questions: [
          ["Le score d'Apgar est évalué :", 'À 1, 5 et 10 minutes de vie', 'À 1 heure de vie', 'Au 3e jour', 'Uniquement si l\'enfant est prématuré'],
          ["Quels éléments composent le score d'Apgar ?", 'Fréquence cardiaque, respiration, tonus, réactivité, coloration', 'Poids, taille, périmètre crânien', 'Température, glycémie, bilirubine', 'Pleurs, sommeil, alimentation'],
          ["Quelle vitamine est administrée au nouveau-né pour prévenir la maladie hémorragique ?", 'Vitamine K', 'Vitamine C', 'Vitamine D à forte dose', 'Vitamine B12'],
          ["Quelle est la fréquence cardiaque normale d'un nouveau-né ?", '120 à 160 battements/min', '60 à 80 battements/min', '80 à 100 battements/min', '200 à 240 battements/min'],
          ["Pour prévenir l'hypothermie du nouveau-né, on privilégie :", 'Le séchage immédiat et le peau-à-peau avec la mère', 'Le bain immédiat', 'Le laisser nu sur la table', 'Une pièce non chauffée'],
        ],
      },
      {
        nom: 'Allaitement maternel',
        questions: [
          ["L'OMS recommande un allaitement maternel exclusif jusqu'à :", '6 mois', '1 mois', '3 mois', '12 mois'],
          ["Quand débuter idéalement la première tétée ?", "Dans l'heure qui suit la naissance", 'Après 24 heures', 'Au 3e jour, à la montée de lait', 'Après le premier bain'],
          ["Le colostrum est :", 'Le premier lait, riche en anticorps', 'Un lait de mauvaise qualité à jeter', 'Un lait artificiel', 'Un signe d\'infection'],
          ["Une bonne prise du sein se reconnaît à :", "Une bouche grande ouverte, lèvres retroussées, menton contre le sein, aréole largement prise", "Le bébé qui tète uniquement le bout du mamelon", "Une douleur intense chez la mère", "Des bruits de claquement"],
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
          ["Le propofol est :", "Un hypnotique d'induction intraveineux", 'Un curare', 'Un antalgique morphinique', 'Un antidote des benzodiazépines'],
          ["Quel est l'antidote des morphiniques ?", 'La naloxone', 'Le flumazénil', 'La néostigmine', "L'atropine"],
          ["Quel est l'antidote des benzodiazépines ?", 'Le flumazénil', 'La naloxone', 'La protamine', 'La vitamine K'],
          ["La consultation d'anesthésie a lieu :", 'Plusieurs jours avant une intervention programmée', "Uniquement après l'intervention", 'Au bloc, juste avant l\'induction', 'Elle est facultative'],
        ],
      },
      {
        nom: 'Intubation et ventilation',
        questions: [
          ["La manœuvre de Sellick consiste à :", 'Exercer une pression sur le cartilage cricoïde', 'Surélever les jambes', 'Tourner la tête du patient sur le côté', 'Comprimer le thorax'],
          ["Quel est le moyen le plus fiable pour confirmer la position de la sonde d'intubation dans la trachée ?", 'La capnographie (présence de CO2 expiré)', 'La buée dans la sonde', 'La couleur de la peau', 'Le nombre de centimètres seul'],
          ["Avant l'intubation, la pré-oxygénation se fait :", "Avec de l'oxygène pur au masque pendant environ 3 minutes", 'À l\'air ambiant', 'Pendant 10 secondes', 'Après l\'intubation'],
          ["Le ballon auto-remplisseur à valve unidirectionnelle (BAVU) sert à :", 'Ventiler manuellement un patient', 'Aspirer les sécrétions', 'Mesurer la tension artérielle', 'Réchauffer le patient'],
          ["Une désaturation brutale chez un patient intubé et ventilé doit faire rechercher en priorité :", 'Un déplacement ou une obstruction de la sonde, un problème de ventilateur', 'Une hypoglycémie', 'Une hyperthermie', 'Une erreur de la tension'],
        ],
      },
      {
        nom: 'Monitorage hémodynamique',
        questions: [
          ["La pression artérielle moyenne (PAM) se calcule approximativement par :", '(PAS + 2 × PAD) / 3', '(PAS + PAD) / 2', 'PAS − PAD', 'PAS × 2'],
          ["Le monitorage minimal d'une anesthésie générale comprend :", 'ECG, pression artérielle, SpO2, capnographie', 'Uniquement la température', 'Uniquement la SpO2', 'Uniquement la diurèse'],
          ["Sur l'ECG du scope, une ligne plate chez un patient inconscient doit d'abord faire :", "Vérifier le patient et les électrodes, et débuter la réanimation si arrêt cardiaque", "Attendre la fin de l'intervention", "Changer d'imprimante", "Diminuer le volume des alarmes"],
          ["Une bradycardie sévère au bloc peut être traitée en première intention par :", "L'atropine (selon prescription / protocole)", 'Le propofol', 'La morphine', 'Le furosémide'],
        ],
      },
      {
        nom: 'Surveillance post-interventionnelle',
        questions: [
          ["Le score d'Aldrete sert à :", 'Évaluer la récupération et autoriser la sortie de salle de réveil', 'Mesurer la douleur', 'Évaluer le risque d\'escarre', 'Évaluer la profondeur de l\'anesthésie'],
          ["Quel est le premier signe de dépression respiratoire liée aux morphiniques à surveiller ?", 'La sédation (somnolence) et la baisse de la fréquence respiratoire', 'La fièvre', 'Une hypertension isolée', 'Des démangeaisons uniquement'],
          ["En salle de réveil, des frissons avec température à 35 °C nécessitent :", 'Un réchauffement actif du patient', 'Une sortie immédiate', 'Un bain froid', 'Aucune action'],
          ["Une échelle numérique de la douleur à 7/10 en SSPI signifie :", 'Une douleur importante à traiter selon le protocole', 'Une douleur absente', 'Une douleur normale à ignorer', 'Une erreur de mesure'],
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
          ["Les trois principes de la radioprotection sont :", 'Justification, optimisation, limitation', 'Rapidité, précision, efficacité', 'Distance, lumière, silence', 'Prévention, traitement, suivi'],
          ["Quels sont les trois moyens de se protéger d'une source de rayonnement ?", 'Temps, distance, écran', 'Gants, masque, lunettes de soleil', 'Lavage, désinfection, stérilisation', 'Température, pression, humidité'],
          ["Avant un examen radiologique chez une femme en âge de procréer, il faut :", "Rechercher une éventuelle grossesse", "Vérifier son groupe sanguin", "Prendre sa température", "Rien de particulier"],
          ["Le dosimètre individuel porté par le personnel sert à :", 'Mesurer la dose de rayonnement reçue', 'Mesurer la tension artérielle', 'Mesurer le temps de travail', 'Détecter les métaux'],
          ["Le principe ALARA signifie :", 'Maintenir les doses aussi basses que raisonnablement possible', 'Augmenter les doses pour une meilleure image', 'Ne jamais faire de radiographie', 'Utiliser toujours le même réglage'],
        ],
      },
      {
        nom: 'Radiologie conventionnelle',
        questions: [
          ["Une radiographie pulmonaire de face standard se fait de préférence :", 'Debout, en inspiration profonde bloquée', 'Couché, en expiration forcée', 'Assis, en respirant normalement', 'Debout, en toussant'],
          ["Pour la radiographie d'un membre traumatisé, on réalise habituellement :", 'Au moins deux incidences orthogonales (face et profil)', 'Une seule incidence de face', 'Uniquement un profil', 'Une incidence oblique seule'],
          ["Avant une radiographie, on demande au patient de retirer :", 'Les objets métalliques dans la zone examinée', 'Ses chaussettes uniquement', 'Ses lunettes pour toute radiographie', 'Rien du tout'],
          ["Sur une radiographie standard, l'os apparaît :", 'Blanc (radio-opaque)', 'Noir', 'Transparent', 'Gris foncé comme l\'air'],
        ],
      },
      {
        nom: 'Scanner et IRM',
        questions: [
          ["Quelle est la principale contre-indication à l'IRM ?", 'Certains dispositifs implantés (pacemaker non compatible, corps étranger métallique intraoculaire…)', 'Le diabète', 'Une prothèse dentaire en résine', 'Le port de lentilles'],
          ["Avant l'injection d'un produit de contraste iodé, on recherche notamment :", 'Une allergie antérieure et une insuffisance rénale', 'Une myopie', 'Un groupe sanguin rare', 'Un antécédent d\'appendicectomie'],
          ["L'IRM utilise :", 'Un champ magnétique et des ondes radiofréquence', 'Des rayons X', 'Des ultrasons', 'Des rayons gamma'],
          ["Le scanner (tomodensitométrie) utilise :", 'Des rayons X', 'Un champ magnétique', 'Des ultrasons', 'Aucun rayonnement'],
          ["Chez un patient diabétique traité par metformine, l'injection d'iode impose surtout de :", 'Vérifier la fonction rénale et suivre le protocole d\'arrêt temporaire si nécessaire', "Doubler la dose de metformine", "Faire un jeûne de 48 h", "Contre-indiquer définitivement l'examen"],
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
          ["Un tube arrive au laboratoire sans étiquette d'identification. Que faire ?", 'Le refuser et demander un nouveau prélèvement', 'Le traiter et deviner le patient', "L'étiqueter avec le patient le plus probable", 'Le conserver sans rien dire'],
          ["La glycémie à jeun se prélève après un jeûne d'au moins :", '8 heures', '1 heure', '30 minutes', '24 heures'],
          ["Une hémolyse de l'échantillon augmente faussement notamment :", 'Le potassium', 'Le sodium', 'La glycémie', 'Les plaquettes'],
          ["Un tube pour bilan d'hémostase (citrate) insuffisamment rempli :", 'Fausse les résultats et doit être refusé', 'Donne des résultats plus précis', 'Est sans conséquence', 'Peut être complété avec un autre tube'],
          ["Un échantillon pour gazométrie artérielle doit être :", 'Analysé rapidement, sans bulle d\'air', 'Laissé à l\'air libre une heure', 'Congelé avant analyse', 'Agité à l\'air'],
        ],
      },
      {
        nom: 'Hématologie',
        questions: [
          ["Le taux normal d'hémoglobine chez une femme adulte est d'environ :", '12 à 16 g/dL', '5 à 8 g/dL', '18 à 22 g/dL', '1 à 3 g/dL'],
          ["Le nombre normal de plaquettes chez l'adulte est d'environ :", '150 000 à 400 000 /mm³', '10 000 à 50 000 /mm³', '1 à 2 millions /mm³', '4 000 à 10 000 /mm³'],
          ["Le nombre normal de leucocytes chez l'adulte est d'environ :", '4 000 à 10 000 /mm³', '150 000 à 400 000 /mm³', '500 à 1 000 /mm³', '50 000 /mm³'],
          ["Un VGM (volume globulaire moyen) bas évoque principalement :", 'Une anémie microcytaire, souvent par carence en fer', 'Une carence en vitamine B12', 'Une polyglobulie', 'Une leucémie certaine'],
          ["Le receveur universel en transfusion de globules rouges est de groupe :", 'AB Rh+', 'O Rh−', 'A Rh+', 'B Rh−'],
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
          ["La coloration de Gram permet de distinguer :", 'Les bactéries Gram positif (violettes) et Gram négatif (roses)', 'Les virus des bactéries', 'Les groupes sanguins', 'Les cellules cancéreuses'],
          ["Pour un ECBU, le recueil des urines se fait :", 'Après toilette, en milieu de jet, dans un flacon stérile', 'Au premier jet, sans toilette', 'Dans n\'importe quel récipient propre', 'Sur 24 heures dans un bocal non stérile'],
          ["Un échantillon pour culture bactériologique qui ne peut être analysé immédiatement est :", 'Conservé selon le protocole (souvent au réfrigérateur à +4 °C pour les urines)', 'Laissé à 37 °C au soleil', 'Congelé systématiquement à −80 °C', 'Jeté'],
          ["Escherichia coli est :", 'Un bacille Gram négatif', 'Un coque Gram positif', 'Un virus', 'Un champignon'],
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
          ["La règle de rotation des stocks recommandée pour les médicaments est :", 'Premier périmé, premier sorti (FEFO)', 'Dernier entré, premier sorti', 'Au hasard', 'Le plus cher en premier'],
          ["Un médicament périmé trouvé en rayon doit être :", 'Retiré, isolé et éliminé selon la filière dédiée', 'Délivré en priorité', 'Remis en rayon', 'Jeté à la poubelle ménagère'],
          ["Le stock de sécurité correspond à :", "La quantité minimale gardée pour faire face aux retards ou à une hausse de consommation", "Le stock de médicaments périmés", "Le stock du concurrent", "La quantité commandée chaque jour"],
          ["L'inventaire permet de :", 'Comparer le stock réel au stock théorique', 'Fixer les prix de vente', 'Remplacer les ordonnances', 'Calculer les salaires'],
        ],
      },
      {
        nom: 'Délivrance et conseil',
        questions: [
          ["Avant de délivrer un médicament, il faut vérifier sur l'ordonnance :", "L'identité du patient, le prescripteur, la date, la posologie et la durée", 'Uniquement le nom du médicament', 'Uniquement la signature', 'Uniquement le prix'],
          ["Un médicament « générique » est :", 'Une copie du médicament de référence, avec le même principe actif et la même efficacité', "Un médicament moins efficace", "Un médicament sans principe actif", "Un médicament réservé à l'hôpital"],
          ["La posologie « 1 cp 3 fois par jour pendant 7 jours » correspond à :", '21 comprimés', '7 comprimés', '10 comprimés', '3 comprimés'],
          ["Un patient sous anticoagulant (AVK) demande de l'aspirine pour un mal de tête. Que conseiller ?", "Éviter l'aspirine (risque hémorragique) et orienter vers le pharmacien / médecin, le paracétamol étant généralement préféré", "Délivrer de l'aspirine à forte dose", "Doubler l'anticoagulant", "Aucune précaution"],
        ],
      },
      {
        nom: 'Conservation des médicaments',
        questions: [
          ["La plupart des vaccins et insulines non entamées se conservent :", 'Au réfrigérateur entre +2 °C et +8 °C', 'Au congélateur', 'À température ambiante au soleil', 'À plus de 30 °C'],
          ["La « chaîne du froid » signifie :", "Le maintien de la température de conservation sans interruption, de la fabrication à l'administration", "Le stockage des médicaments au congélateur", "Une méthode de livraison rapide", "Le refroidissement du patient"],
          ["Un flacon d'insuline en cours d'utilisation peut généralement être conservé :", "À température ambiante (moins de 25-30 °C) pendant environ 4 semaines, selon la notice", 'Au congélateur', 'Indéfiniment', 'Au soleil'],
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
          ["Après une prothèse totale de hanche par voie postérieure, quel mouvement est à éviter en début de rééducation ?", "L'association flexion, adduction et rotation interne (risque de luxation)", 'La marche avec aide technique', 'La contraction du quadriceps', 'La respiration profonde'],
          ["Le testing musculaire coté de 0 à 5 : la cote 3 correspond à :", "Un mouvement complet contre la pesanteur, sans résistance", 'Aucune contraction', 'Une force normale', 'Une contraction sans mouvement'],
          ["Pour un patient hémiplégique, la canne se tient :", 'Du côté sain', 'Du côté atteint', 'Avec les deux mains', 'Elle est déconseillée'],
          ["La mobilisation précoce après une chirurgie vise notamment à prévenir :", 'La phlébite, les escarres et l\'enraidissement', 'La fièvre', 'L\'hypoglycémie', 'Les allergies'],
          ["Une entorse récente de la cheville se prend en charge initialement par :", 'Repos relatif, glace, compression, surélévation', 'Massage profond immédiat', 'Chaleur intense', 'Course à pied'],
        ],
      },
      {
        nom: 'Kinésithérapie respiratoire',
        questions: [
          ["Le désencombrement bronchique vise à :", 'Faciliter l\'évacuation des sécrétions bronchiques', 'Augmenter la tension artérielle', 'Diminuer la fréquence cardiaque', 'Traiter une fracture'],
          ["Chez le patient BPCO, la ventilation lèvres pincées permet de :", "Freiner l'expiration et limiter le piégeage de l'air", 'Accélérer la respiration', 'Bloquer la respiration', 'Augmenter la toux sèche'],
          ["La spirométrie incitative après chirurgie abdominale sert à :", 'Prévenir les atélectasies en encourageant les inspirations profondes', 'Mesurer la glycémie', 'Traiter la douleur', 'Faire maigrir le patient'],
          ["Pendant une séance, une SpO2 qui chute à 86 % impose de :", 'Interrompre l\'effort et surveiller / alerter selon la prescription d\'oxygène', 'Augmenter l\'intensité', 'Ignorer la valeur', 'Retirer l\'oxygène'],
        ],
      },
      {
        nom: 'Bilan et évaluation',
        questions: [
          ["Le bilan initial en rééducation sert à :", 'Établir un diagnostic fonctionnel et fixer des objectifs mesurables', 'Remplacer la prescription médicale', 'Facturer la séance', 'Choisir les horaires'],
          ["La goniométrie mesure :", 'Les amplitudes articulaires', 'La force musculaire', 'La fréquence respiratoire', 'La sensibilité'],
          ["L'échelle visuelle analogique (EVA) évalue :", "L'intensité de la douleur", "L'équilibre", "La force de préhension", "Le niveau d'études"],
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
          ["L'indice de masse corporelle (IMC) se calcule ainsi :", 'Poids (kg) divisé par la taille (m) au carré', 'Taille divisée par le poids', 'Poids multiplié par la taille', 'Poids moins la taille en cm'],
          ["Chez l'adulte, un IMC entre 18,5 et 25 correspond à :", 'Une corpulence normale', 'Une obésité', 'Une dénutrition sévère', 'Un surpoids'],
          ["Combien de kilocalories apporte 1 g de lipides ?", 'Environ 9 kcal', 'Environ 4 kcal', 'Environ 7 kcal', 'Environ 1 kcal'],
          ["Combien de kilocalories apporte 1 g de protéines ou de glucides ?", 'Environ 4 kcal', 'Environ 9 kcal', 'Environ 12 kcal', 'Environ 0,5 kcal'],
          ["Une perte de poids involontaire de plus de 5 % en un mois doit faire évoquer :", 'Une dénutrition', 'Un régime réussi', 'Une situation normale', 'Une déshydratation bénigne uniquement'],
        ],
      },
      {
        nom: 'Prise en charge du diabète',
        questions: [
          ["Quels sont les signes typiques d'une hypoglycémie ?", 'Sueurs, tremblements, faim, palpitations, confusion', 'Soif intense et urines abondantes', 'Fièvre et toux', 'Démangeaisons'],
          ["Face à une hypoglycémie chez un patient conscient, on donne :", 'Environ 15 g de sucre rapide (ex. 3 morceaux de sucre), puis contrôle', 'Un repas riche en graisses', 'De l\'insuline', 'Rien, cela passera'],
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
          ["Pendant la toilette d'un patient, il faut préserver :", 'Son intimité (porte fermée, corps couvert) et son autonomie', 'Uniquement la rapidité du soin', 'La présence de tous les visiteurs', 'La fenêtre ouverte en hiver'],
          ["Un patient qui peut faire une partie de sa toilette seul :", 'Doit être encouragé à la faire pour préserver son autonomie', 'Doit être lavé entièrement pour gagner du temps', 'Ne doit pas être lavé', 'Doit attendre sa famille'],
          ["Pendant la toilette, vous remarquez une rougeur au sacrum. Que faites-vous ?", 'Vous le signalez à l\'infirmier et le notez dans les transmissions', 'Vous la massez énergiquement', 'Vous n\'en parlez pas', 'Vous appliquez de l\'alcool'],
          ["Les soins de bouche chez un patient alité permettent de prévenir :", 'Les infections buccales et l\'inconfort', 'Les fractures', 'L\'hypertension', 'Les escarres du talon'],
        ],
      },
      {
        nom: 'Prévention des escarres',
        questions: [
          ["Quelles sont les zones les plus à risque d'escarre chez un patient alité sur le dos ?", 'Sacrum, talons, coudes, omoplates, arrière de la tête', 'Ventre et cuisses', 'Mains et doigts', 'Genoux uniquement'],
          ["Pour prévenir les escarres, il faut changer la position d'un patient à risque :", 'Régulièrement, environ toutes les 2 à 3 heures selon le plan de soins', 'Une fois par jour', 'Uniquement la nuit', 'Jamais pour ne pas le réveiller'],
          ["Quel facteur favorise l'apparition d'une escarre ?", 'Une dénutrition et une immobilité prolongée', 'Une marche régulière', 'Une bonne hydratation', 'Un matelas adapté'],
          ["Quel outil sert à évaluer le risque d'escarre ?", "L'échelle de Braden ou de Norton", "Le score de Glasgow", "L'échelle EVA de la douleur", "Le score d'Apgar"],
        ],
      },
      {
        nom: 'Manutention des patients',
        questions: [
          ["Pour soulever une charge ou aider un patient, il faut :", 'Garder le dos droit et plier les genoux', 'Plier le dos jambes tendues', 'Faire une torsion du tronc', 'Porter seul, loin du corps'],
          ["Avant de lever un patient, la première chose à faire est :", "Lui expliquer le soin et évaluer ce qu'il peut faire lui-même", 'Le lever rapidement sans prévenir', 'Appeler sa famille', 'Retirer les freins du lit'],
          ["Lors d'un transfert lit-fauteuil, le fauteuil doit être :", 'Placé près du lit, freins serrés', 'Placé loin du lit', 'Freins desserrés', 'Sans repose-pieds réglés'],
          ["Un lève-personne (soulève-malade) est utilisé :", "Pour les patients qui ne peuvent pas participer au transfert", "Uniquement pour les enfants", "Pour tous les patients autonomes", "Jamais en établissement"],
        ],
      },
      {
        nom: 'Aide aux repas et hydratation',
        questions: [
          ["Pour aider un patient présentant des troubles de la déglutition à manger, il faut l'installer :", 'Assis, tête légèrement fléchie vers l\'avant', 'Allongé à plat sur le dos', 'Tête en arrière', 'Couché sur le ventre'],
          ["Un patient tousse et s'étouffe à chaque gorgée d'eau. Vous devez :", "Arrêter, le signaler à l'infirmier (risque de fausse route) et adapter les textures selon la prescription", 'Lui donner plus vite à boire', 'Lui donner de l\'eau gazeuse', 'Ne rien signaler'],
          ["Quels signes peuvent évoquer une déshydratation chez une personne âgée ?", 'Bouche sèche, urines foncées, confusion', 'Prise de poids rapide', 'Œdèmes des jambes uniquement', 'Hypersalivation'],
          ["La surveillance des repas consiste notamment à :", 'Noter les quantités consommées et signaler une baisse d\'appétit', 'Débarrasser sans regarder', 'Forcer le patient à finir', 'Supprimer les collations'],
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
          ["Un patient s'énerve à l'accueil après une longue attente. La meilleure attitude est :", "Rester calme, l'écouter, reconnaître son attente et l'informer du délai", 'Lui répondre sur le même ton', "L'ignorer jusqu'à ce qu'il se calme", 'Appeler immédiatement la sécurité'],
          ["Au téléphone, un appelant décrit une douleur thoracique intense. Que faire ?", "Le réorienter immédiatement vers les urgences (SAMU 190) et prévenir un soignant", 'Lui donner un rendez-vous la semaine suivante', 'Lui conseiller de patienter', 'Raccrocher'],
          ["L'écoute active consiste à :", 'Reformuler et poser des questions pour bien comprendre la demande', 'Préparer sa réponse pendant que la personne parle', 'Couper la parole pour gagner du temps', 'Écouter en faisant autre chose'],
          ["Pour accueillir une personne malentendante, il est préférable de :", 'Se placer face à elle, parler lentement et distinctement, écrire si besoin', 'Crier', 'Parler en tournant le dos', 'S\'adresser uniquement à l\'accompagnant'],
        ],
      },
      {
        nom: 'Gestion du dossier patient',
        questions: [
          ["Le dossier patient doit être :", 'Confidentiel, à jour et accessible uniquement aux personnes habilitées', 'Laissé sur le bureau d\'accueil', 'Communiqué à toute personne qui le demande', 'Détruit après chaque consultation'],
          ["Deux patients portent le même nom et prénom. Pour éviter une erreur, vous vérifiez :", 'La date de naissance et un autre identifiant (numéro de dossier)', 'Uniquement le prénom', 'La couleur des vêtements', 'Rien, ils sont identiques'],
          ["Votre session sur le logiciel du cabinet doit être :", 'Verrouillée dès que vous quittez votre poste', 'Laissée ouverte pour les collègues', 'Partagée avec un mot de passe commun affiché', 'Ouverte en permanence'],
          ["Un résultat d'analyse arrive pour un patient. Vous pouvez le communiquer par téléphone :", 'Non, sauf procédure prévue : les résultats sont remis au patient ou au médecin de façon sécurisée', 'À toute personne qui appelle', 'À l\'employeur du patient', 'Au voisin'],
        ],
      },
      {
        nom: 'Terminologie médicale',
        questions: [
          ["Le suffixe « -ite » signifie :", 'Inflammation (ex. : appendicite)', 'Ablation chirurgicale', 'Douleur', 'Tumeur bénigne'],
          ["Le suffixe « -ectomie » signifie :", 'Ablation (ex. : appendicectomie)', 'Inflammation', 'Examen visuel', 'Suture'],
          ["« Tachycardie » signifie :", 'Rythme cardiaque rapide', 'Rythme cardiaque lent', 'Arrêt du cœur', 'Tension élevée'],
          ["Le préfixe « hyper- » signifie :", 'Au-dessus, excès', 'En dessous, insuffisance', 'Autour', 'À l\'intérieur'],
          ["Un « ORL » est spécialiste :", 'Des oreilles, du nez et de la gorge', 'Des os et des articulations', 'Du cœur', 'De la peau'],
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
          ["Pendant le transport, un patient devient pâle, en sueurs et ne répond plus. Que faire ?", "Arrêter le véhicule en sécurité, évaluer conscience et respiration, alerter et débuter les gestes d'urgence", "Accélérer sans rien vérifier", "Ouvrir les fenêtres et continuer", "Attendre l'arrivée à l'hôpital"],
          ["Après un transport de patient contagieux, l'ambulance doit être :", 'Nettoyée et désinfectée selon le protocole avant un autre transport', 'Utilisée immédiatement', 'Aérée seulement', 'Lavée une fois par mois'],
          ["Lors du transport, le brancard doit être :", 'Verrouillé dans son système de fixation, patient sanglé', 'Libre pour plus de confort', 'Retiré du véhicule', 'Sans sangles'],
        ],
      },
      {
        nom: 'Immobilisation et relevage',
        questions: [
          ["Chez un blessé suspect de traumatisme du rachis, il faut :", "Maintenir la tête dans l'axe tête-cou-tronc et limiter les mouvements", 'Le faire asseoir rapidement', 'Lui tourner la tête pour le faire parler', 'Le soulever par les bras'],
          ["Le matelas immobilisateur à dépression (coquille) sert à :", "Immobiliser l'ensemble du corps lors du transport d'un traumatisé", "Réchauffer le patient", "Réanimer le patient", "Mesurer la tension"],
          ["Une attelle doit immobiliser :", "Les articulations situées au-dessus et au-dessous de la fracture", "Uniquement le foyer de fracture", "Tout le corps", "Aucune articulation"],
          ["Avant de poser une attelle sur un membre, on vérifie :", 'La sensibilité, la motricité et la circulation (pouls, coloration) en aval', 'Uniquement la douleur', 'La température corporelle', 'Rien'],
        ],
      },
    ],
  },
];
