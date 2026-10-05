# Medical Staff

Plateforme tunisienne de recrutement **médical et paramédical** : elle met en relation les professionnels de santé (candidats) et les établissements de santé (cliniques, hôpitaux, cabinets, laboratoires…).

**Stack** : PHP 8 (PDO) · MySQL/MariaDB · Bootstrap 5 · Font Awesome · FullCalendar · Dompdf · chatbot local / Ollama / Hugging Face.

## Installation

```bash
# 1. Dépendances PHP (Dompdf)
composer install

# 2. Base de données
mysql -u root -p < database/schema.sql

# 3. (optionnel) Données de démonstration
php database/seed.php

# 4. Lancer le serveur de développement
php -S localhost:8000
```

Configuration : `config/config.php`, surchargeable par variables d'environnement (`MS_DB_HOST`, `MS_DB_NAME`, `MS_DB_USER`, `MS_DB_PASS`, `MS_BASE_URL`, `MS_CHATBOT_ENGINE`…) ou par un fichier `config/config.local.php` non versionné retournant un tableau.

Si le site est installé dans un sous-dossier (ex. `http://localhost/medical-staff/`), définissez `base_url` à `/medical-staff`.

### Comptes de démonstration (mot de passe `demo1234`)

| Rôle | Email |
|---|---|
| Candidats | `amira@demo.tn`, `youssef@demo.tn`, `salma@demo.tn`, `mehdi@demo.tn`, `ines@demo.tn` (sans test de personnalité) |
| Établissement abonné | `clinique@demo.tn` |
| Établissement non abonné | `hopital@demo.tn` |

Paiement de l'abonnement simulé : carte `4242 4242 4242 4242`, `12/30`, CVV `123`.

## Structure

```
index.php, mission.php, offres.php, demandes.php, logout.php   Pages publiques
candidat/     register, login, dashboard, cv, test, offres, entretiens
recruteur/    register, login, dashboard, abonnement, offres, offre_form, cvtheque,
              candidatures, cv, cv_pdf, suggestions, entretien (calendrier), entretiens
api/          chatbot.php (Dr. Jobs), competences.php (autocomplétion)
includes/     bootstrap, db, auth, functions, data (référentiels), offres, personality,
              matching (IA), chatbot, mailer, header/footer
database/     schema.sql, seed.php
assets/       css, js (répéteurs, tags, chatbot), img
uploads/      photos de profil (exécution de scripts interdite)
```

## Fonctionnalités

- **Visiteur** : accueil, mission, offres filtrables (poste, gouvernorat, contrat), demandes d'emploi anonymisées (ID, poste, expérience, ville, salaire, disponibilité).
- **Candidat** : CV structuré (photo ≤ 2 Mo, 24 gouvernorats, diplômes, expériences, compétences avec autocomplétion, langues, prétentions, confidentialité des coordonnées) ; test de personnalité de 30 questions (Big Five + adaptation au milieu médical, scores /100, jauges, portrait généré) ; recherche d'offres avec bouton « Postuler » verrouillé tant que le CV (poste + 1 diplôme) et le test ne sont pas complétés ; emails de confirmation ; validation / refus des entretiens.
- **Établissement** : abonnement annuel 1 000 TND (paiement simulé) ; création / modification / désactivation d'offres avec compétences en tags ; CVthèque multicritères (poste, année de diplôme ≥, expérience min., salaire max., ville) ; candidatures par offre ; détail du CV (consultation journalisée dans `cv_consultations`) et PDF avec photo ; **suggestions IA 🧠** (compétences 45 %, diplôme 25 %, expérience 20 %, bonus personnalité 10 %, top 5) ; planification d'entretiens sur FullCalendar (semaine/jour, 8h–18h, créneaux de 30 min, contrôle des chevauchements) et notification email.
- **Chatbot Dr. Jobs** : bulle flottante, moteur local par intentions, bascule optionnelle vers Ollama (`MS_CHATBOT_ENGINE=ollama`) ou Hugging Face (`huggingface` + `MS_HF_TOKEN`) pour les questions complexes, historique limité aux 10 derniers messages.

## Sécurité

Mots de passe bcrypt · `session_regenerate_id` à la connexion · cookies `HttpOnly` / `SameSite=Lax` · jeton CSRF sur tous les formulaires et l'API du chatbot · requêtes préparées PDO · échappement HTML systématique · contrôle d'accès par rôle et par abonnement · upload validé par `getimagesize` et renommé aléatoirement · déconnexion centralisée (`/logout.php`) avec suppression du cookie · en-têtes anti-cache · PWA désactivée.

## Emails

Les emails sont envoyés via `mail()` et journalisés dans `storage/mails.log` (pratique en développement sans serveur SMTP).

## Évolutions possibles

Vérification d'identité et badge « Vérifié », entretiens vidéo asynchrones, recommandation de formations, analyse prédictive des besoins, application mobile, messagerie interne, tableau de bord administrateur.
