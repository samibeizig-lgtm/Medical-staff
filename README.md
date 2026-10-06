# medicalstaff.tn

Plateforme tunisienne de recrutement **médical et paramédical** : elle met en relation les professionnels de santé (candidats) et les établissements de santé (cliniques, hôpitaux, cabinets, laboratoires…).

Cette version tourne **gratuitement sur Cloudflare** :

| Élément | Technologie | Coût |
|---|---|---|
| Site et logique | Cloudflare Workers + [Hono](https://hono.dev) (TypeScript, pages générées côté serveur) | Gratuit jusqu'à 100 000 requêtes / jour |
| Base de données | Cloudflare D1 (SQLite), photos comprises | Gratuit jusqu'à 5 Go |
| Fichiers statiques | Workers Static Assets (Bootstrap, Font Awesome, FullCalendar, Poppins servis localement) | Gratuit |
| Emails | Journal consultable dans l'administration, ou envoi réel via Brevo / Resend | Gratuit (300 emails / jour avec Brevo) |
| Entretien IA et chatbot | Workers AI (transcription Whisper, évaluation Llama) | Gratuit dans le quota quotidien |

> La version d'origine en **PHP / MySQL** est conservée dans le dossier [`php/`](php/README.md).

## 🎨 Charte graphique

Le site applique la [charte du logo](docs/charte-logo-medicalstaff.pdf) (octobre 2026) :

| Rôle | Couleur |
|---|---|
| Bleu – couleur principale (titres, boutons, liens) | `#1F5FAD` |
| Vert – accent graphique | `#2BA84A` (texte en grande taille : `#23913F`) |
| Turquoise – accent graphique, pas de texte courant | `#14B8B0` (texte en grande taille : `#0E9F9A`) |
| Encre – texte | `#14212B` |
| Gris – texte secondaire | `#5B6770` |
| Bleu nuit – fonds sombres | `#0E2236` |

- **Logos** (`public/assets/img/`) : `logo-medicalstaff.svg` (principal, avec slogan), `logo-entete.svg` (barre de navigation), `logo-fond-sombre.svg` (pied de page), `symbole.svg`, `favicon.svg` et `logo-email.png` (emails, car les messageries bloquent le SVG). Tous sont extraits des tracés vectoriels de la charte.
- **Typographie** : Poppins, en Bold pour les titres, Medium pour les sous-titres et Regular pour le texte.
- **Nom** : toujours en minuscules, « medicalstaff.tn ».
- **Bandeau tricolore** vert, bleu, turquoise, dans cet ordre, en haut des pages, des emails et des CV.
- **Accessibilité** : le turquoise n'offre pas assez de contraste sous un texte blanc ; les boutons « établissement » sont donc en bleu nuit.

---

## 🚀 Mettre le site en ligne (gratuit, sans carte bancaire)

Comptez environ 15 minutes. Tout se fait depuis le navigateur.

### 1. Créer un compte Cloudflare

1. Inscrivez-vous sur <https://dash.cloudflare.com/sign-up> (gratuit).
2. Dans le menu de gauche, ouvrez **Workers & Pages** (en anglais : *Compute (Workers)*). À la première visite, Cloudflare vous demande de **choisir un sous-domaine** `xxx.workers.dev` : choisissez-en un (par exemple `medicalstaff`). Votre site aura l'adresse `https://medical-staff.medicalstaff.workers.dev`.
3. Notez votre **Account ID** : il est affiché sur la page d'accueil de **Workers & Pages**, colonne de droite (ou dans l'URL du tableau de bord : `dash.cloudflare.com/<ACCOUNT_ID>/…`).

### 2. Créer un jeton d'API

1. Allez sur <https://dash.cloudflare.com/profile/api-tokens> → **Create Token**.
2. Choisissez le modèle **Edit Cloudflare Workers** → **Use template**.
3. Dans **Permissions**, cliquez sur **+ Add more** et ajoutez : `Account` → `D1` → `Edit`, puis `Account` → `Workers AI` → `Read` (pour l'entretien IA et le chatbot).
4. **Continue to summary** → **Create Token**, puis copiez le jeton (il ne sera plus affiché).

### 3. Ajouter les secrets dans GitHub

Dans ce dépôt GitHub : **Settings → Secrets and variables → Actions → New repository secret**.

| Nom | Valeur | Obligatoire |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | le jeton de l'étape 2 | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | l'Account ID de l'étape 1 | ✅ |
| `ADMIN_EMAIL` | votre email d'administrateur | recommandé |
| `ADMIN_PASSWORD` | un mot de passe solide (10 caractères minimum) | recommandé |
| `BREVO_API_KEY` et `MAIL_FROM` | pour envoyer de vrais emails (voir plus bas) | facultatif |

### 4. Lancer le déploiement

1. Onglet **Actions** du dépôt → workflow **Déployer sur Cloudflare** → **Run workflow**.
2. Cochez **Charger les données de démonstration** si vous voulez des comptes de test, puis **Run workflow**.
3. Après 1 à 2 minutes, le site est en ligne. L'adresse s'affiche dans les journaux de l'étape « Déployer le Worker » (et dans Cloudflare → Workers & Pages → `medical-staff`).

Le workflow crée la base D1 au premier lancement, applique le schéma, crée le compte administrateur et déploie le site. Ensuite, **chaque `git push` redéploie automatiquement**.

### Comptes de démonstration (mot de passe `demo1234`)

| Rôle | Email |
|---|---|
| Administrateur | `admin@demo.tn` |
| Candidats | `amira@demo.tn`, `youssef@demo.tn`, `salma@demo.tn`, `mehdi@demo.tn`, `ines@demo.tn` (sans test de personnalité) |
| Établissement abonné | `clinique@demo.tn` |
| Établissement non abonné | `hopital@demo.tn` |

> ⚠️ Ces comptes ont un mot de passe public : ne chargez les données de démonstration que pour tester, puis supprimez les comptes `@demo.tn` depuis l'administration avant d'ouvrir le site à de vrais utilisateurs.

Paiement de l'abonnement simulé : carte `4242 4242 4242 4242`, `12/30`, CVV `123`.

---

## ✉️ Emails

Par défaut (`MAIL_PROVIDER = "log"`), **aucun email n'est envoyé** : ils sont enregistrés dans la base et lisibles dans **Administration → Emails**. C'est idéal pour tester : les liens de réinitialisation de mot de passe y apparaissent.

Pour de vrais envois, gratuitement avec **Brevo** (300 emails / jour) :

1. Créez un compte sur <https://www.brevo.com>, puis validez votre adresse d'expéditeur dans **Senders, Domains & Dedicated IPs → Senders**.
2. Créez une clé dans **SMTP & API → API Keys**.
3. Ajoutez dans GitHub les secrets `BREVO_API_KEY` (la clé) et `MAIL_FROM` (l'adresse d'expéditeur validée), puis relancez le workflow.

Resend est aussi pris en charge (`MAIL_PROVIDER = "resend"` + secret `RESEND_API_KEY`), mais il exige un nom de domaine vérifié pour écrire à d'autres adresses que la vôtre.

## 🎙️ Entretien IA (communication)

Depuis son espace, le candidat passe un entretien de **5 questions orales** de mise en situation (3 générales, 2 propres à son métier), **comme lors d'un vrai entretien** :

- **Pas de temps de préparation** : après un décompte de 3 secondes, la question s'affiche et l'enregistrement démarre aussitôt. La question n'est envoyée au navigateur qu'à ce moment-là, elle n'est donc pas lisible à l'avance.
- **Uniquement à l'oral** : 2 minutes maximum par question. Le micro est vérifié avant de commencer.
- **Contrôles côté serveur** : l'heure d'affichage de chaque question est enregistrée ; une réponse hors délai est refusée ; recharger ou quitter la page pendant une question la compte « sans réponse » ; une réponse inaudible aussi (pas de seconde chance). En cas de coupure réseau, l'envoi peut être relancé dans le délai imparti.

- **Transcription** : Whisper (`@cf/openai/whisper-large-v3-turbo`). L'audio n'est jamais stocké, seul le texte est conservé.
- **Évaluation** : Llama 3.3 70B (Llama 3.1 8B en secours) note 5 critères sur 100 (clarté, structure, empathie, vocabulaire professionnel, adaptation à l'interlocuteur), avec une synthèse, des points forts et des conseils.
- **Garde-fous** : seul le contenu des réponses est évalué (ni voix, ni visage, ni émotions) ; les réponses vides ou recopiées sont pénalisées ; le score est indicatif et ne bloque jamais une candidature ; consentement demandé ; 2 entretiens maximum par 24 h ; seul le dernier résultat est montré.
- **Côté établissement** : score et détail sur le CV, le PDF, la CVthèque, les candidatures et les suggestions IA (sans modifier le score de matching).
- **Sans Workers AI** (jeton sans la permission, quota épuisé, ou développement local) : transcription par la reconnaissance vocale du navigateur (**Chrome ou Edge obligatoires**) et **évaluation simplifiée** plafonnée à 80, signalée comme telle.

Le workflow de déploiement active Workers AI automatiquement. Si le jeton n'a pas la permission `Workers AI → Read`, il redéploie sans IA et affiche un avertissement. Coût indicatif : environ 300 à 500 « neurones » par entretien, soit une vingtaine d'entretiens par jour dans le quota gratuit (10 000 neurones par jour).

**Lecture vocale** : chaque question est lue à voix haute par une voix féminine française (synthèse vocale du navigateur : Denise sur Edge, « Google français » sur Chrome, Audrey/Amélie sur Mac et iPhone…). L'enregistrement démarre à la fin de la lecture, pour que la voix ne soit pas captée par le micro. Le candidat peut couper la lecture (« Répondre maintenant ») ou la désactiver.

## ✅ Compétences validées par QCM

Les candidats ne déclarent plus leurs compétences : ils les **obtiennent en réussissant des QCM chronométrés** propres à leur métier (menu « QCM compétences »). Seules les compétences validées figurent sur le CV et comptent dans le matching.

- **15 questions tirées au hasard** : 3 questions sur chacune de 5 compétences, choisies parmi celles du métier (familles : infirmier, bloc, sage-femme, anesthésie, imagerie, laboratoire, laboratoire de PMA, pédiatrie, stérilisation, panseur, encadrement des soins pour les surveillant(e)s, pharmacie, rééducation, nutrition, aide-soignant, accueil/secrétariat, ambulancier) et du tronc commun (hygiène, gestes d'urgence, sécurité du patient, secret professionnel). Les compétences pas encore validées passent en priorité. Les 4 choix sont mélangés à chaque fois.
- **30 secondes par question**, contrôlées par le serveur : les questions s'enchaînent sans retour en arrière, une réponse arrivée trop tard ou une page quittée compte faux, et la bonne réponse n'est jamais envoyée au navigateur.
- Une compétence est **validée uniquement avec 3 bonnes réponses sur 3** (sans-faute), et le reste. **2 QCM par semaine** au maximum.
- Banque : 48 compétences, 230 questions (`src/lib/qcm-banque.ts`, la bonne réponse est toujours écrite en premier). Les offres choisissent leurs compétences requises dans ce même catalogue.
- La migration `0004` supprime les compétences saisies librement auparavant (non vérifiées).

## 📍 Proximité et score de matching

Les suggestions IA 🧠 classent les candidats selon :

| Critère | Poids |
|---|---|
| Compétences requises validées par QCM | 45 % |
| Diplôme | 20 % |
| Expérience | 20 % |
| **Proximité du lieu de travail** | 15 % |
| Bonus : personnalité (5) + communication à l'entretien IA (5) | jusqu'à 10 % |

La proximité se calcule à vol d'oiseau entre les chefs-lieux des gouvernorats du candidat et de l'offre : 100 % jusqu'à 25 km, puis décroissante jusqu'à 0 à 300 km (Tunis–Sousse ≈ 116 km → 67 %, Tunis–Sfax ≈ 236 km → 23 %). La CVthèque (filtres « Distance max. » et « Compétence validée ») et la recherche d'offres des candidats (« Distance max. » autour de leur ville) affichent les distances.

## 🤖 Chatbot Dr. Jobs

Dr. Jobs comprend la question (mots entiers, métier et ville détectés, y compris « kiné », « labo », « Djerba »…) et répond **à partir des données réelles du site** :

- **offres** : « offres de sage-femme à Sousse », « offres près de chez moi » (candidat connecté, 50 km autour de sa ville) ; s'il n'y en a pas, les villes les plus proches qui en ont ;
- **salaires** réellement publiés dans les offres actives pour un métier (et une ville), avec un ordre de grandeur indicatif ;
- **profils** pour les établissements : « je cherche une sage-femme disponible immédiatement à Sousse » → nombre de profils et lien vers la CVthèque déjà filtrée ;
- **état du compte** : « mon profil est-il complet ? » (candidat : CV, test, QCM, entretien IA) ou « mon abonnement » (établissement : échéance, offres, nouvelles candidatures) ;
- **fonctionnement du site** : postuler, QCM, entretien IA, test, abonnement, CVthèque, matching, confidentialité, mot de passe…

Les relances courtes (« et à Sfax ? », « et pour une sage-femme ? ») reprennent le sujet précédent. Chaque réponse propose des liens directs et des suggestions cliquables. Les questions hors base sont transmises à Workers AI (si activé) avec la base de connaissances du site et la consigne de ne rien inventer ; sinon, Dr. Jobs demande de reformuler.

---

## 💻 Développement local

Prérequis : [Node.js](https://nodejs.org) 22 ou plus récent.

```bash
npm install
npm run db:migrate:local      # crée la base D1 locale
npm run seed:local            # données de démonstration (facultatif)
npm run admin:local -- admin@exemple.tn "MotDePasseSolide"
npm run dev                   # http://localhost:8787
```

`npm run check` vérifie le code TypeScript.

### Déployer en ligne de commande (sans GitHub Actions)

```bash
npx wrangler login
npx wrangler d1 create medical-staff        # copiez l'identifiant affiché dans wrangler.jsonc (database_id)
npm run db:migrate:remote
npm run admin:remote -- admin@exemple.tn "MotDePasseSolide"
npm run seed:remote                          # facultatif
npm run deploy
```

---

## Structure

```
src/
  index.tsx              Point d'entrée : middlewares, routes, pages 404 / erreur
  routes/
    public.tsx           Accueil, mission, offres, demandes anonymisées, photos
    auth.tsx             Déconnexion, mot de passe oublié, réinitialisation
    candidat.tsx         Inscription, tableau de bord, CV + photo, test, offres, entretiens
    entretien-ia.tsx     Entretien IA : questions orales chronométrées, transcription, évaluation
    qcm.tsx              QCM de compétences chronométré (30 s par question, contrôle serveur)
    recruteur.tsx        Inscription, abonnement, offres, CVthèque, candidatures, CV + PDF,
                         suggestions IA, calendrier d'entretiens
    admin.tsx            Statistiques, utilisateurs, offres, abonnements, emails, journal
    api.tsx              Chatbot, liste des compétences du catalogue
  lib/                   Base D1, sessions / CSRF, hachage, dates, emails, données de référence,
                         test de personnalité, matching IA, proximité, banque de QCM, chatbot
  views/                 Gabarit de page et composants (JSX)
public/assets/           CSS, JavaScript, images, bibliothèques (servis directement par Cloudflare)
migrations/              Schéma SQL de la base D1
scripts/                 Données de démonstration, création d'administrateur
.github/workflows/       Déploiement automatique
php/                     Version d'origine PHP / MySQL
```

## Fonctionnalités

- **QCM de compétences et proximité** : voir plus haut.
- **Visiteur** : accueil, mission, offres filtrables (poste, gouvernorat, contrat), demandes d'emploi anonymisées.
- **Entretien IA** : voir plus haut.
- **Candidat** : CV structuré (photo redimensionnée dans le navigateur, 24 gouvernorats, diplômes, expériences, compétences validées par QCM chronométré, langues, prétentions, confidentialité des coordonnées) ; test de personnalité de 30 questions (Big Five + adaptation au milieu médical, jauges, portrait) ; bouton « Postuler » verrouillé tant que le CV et le test ne sont pas complétés ; emails de confirmation ; validation ou refus des entretiens.
- **Établissement** : abonnement annuel de 1 000 TND (paiement simulé) ; gestion des offres ; **CVthèque multicritère** (poste, ville et distance maximale, disponibilité, expérience min./max., compétence validée par QCM, diplôme et année, langue et niveau, salaire maximum, score de communication, test passé, mot-clé dans les expériences, profils actifs récemment ; tri par expérience, proximité, communication, compétences ou salaire ; critères actifs retirables en un clic) ; candidatures ; CV détaillé (consultations enregistrées) ; **CV en PDF** (page imprimable avec photo → « Enregistrer en PDF » du navigateur) ; **suggestions IA 🧠** (compétences validées 45 %, diplôme 20 %, expérience 20 %, proximité 15 %, bonus personnalité + communication jusqu'à 10 %) ; calendrier d'entretiens FullCalendar (créneaux de 30 min, 8h–18h, chevauchements refusés).
- **Animations** : soulignement tricolore et menus déroulants animés, ombre du menu au défilement, apparition progressive des cartes et articles, compteurs animés, survols ; tout est désactivé si le système demande de réduire les animations.
- **Administrateur** : statistiques, gestion des utilisateurs (suspension avec déconnexion immédiate, réactivation, suppression), modération des offres, activation manuelle et annulation d'abonnements, journal des emails et des actions.
- **Mot de passe oublié** : lien à usage unique valable 1 heure, 3 demandes maximum par heure, sans révéler si l'adresse existe ; toutes les sessions sont fermées après le changement.

## Sécurité

- **Mots de passe** : PBKDF2-SHA256 avec sel aléatoire. 50 000 itérations par défaut, pour respecter la limite de calcul de l'offre gratuite (10 ms par requête) ; réglable jusqu'à 100 000 sur un plan payant via `PASSWORD_ITERATIONS`, sans invalider les comptes existants.
- **Connexion** : limitée à 5 échecs par compte ou 30 par adresse IP sur 15 minutes.
- **Sessions** : stockées en base (jeton haché), cookies `HttpOnly` / `Secure` / `SameSite=Lax`, déconnexion par formulaire protégé.
- **CSRF** : jeton sur tous les formulaires et l'API, en plus d'une vérification de l'origine des requêtes.
- **Requêtes et affichage** : toutes les requêtes sont paramétrées, et l'affichage JSX échappe automatiquement les données.
- **Content-Security-Policy** : restrictive, aucune ressource externe.
- **Photos** : type vérifié par signature binaire, adresse aléatoire non devinable (l'anonymat des candidats est préservé).
- **Accès** : contrôle par rôle et par abonnement. Les jetons de réinitialisation sont stockés hachés.

## Évolutions possibles

Vérification d'identité et badge « Vérifié », entretiens vidéo asynchrones, recommandation de formations, analyse prédictive des besoins, application mobile, messagerie interne, paiement en ligne réel (Konnect, Paymee, carte e-Dinar), nom de domaine personnalisé (gratuit à brancher sur Cloudflare).
