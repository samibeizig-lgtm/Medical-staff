# Medical Staff – version PHP / MySQL

> Version d'origine du projet, conservée pour référence. La version déployée gratuitement sur Cloudflare (Workers + D1) se trouve à la racine du dépôt : voir le [README principal](../README.md).
>
> Toutes les commandes ci-dessous s'exécutent depuis ce dossier `php/`.

Plateforme tunisienne de recrutement **médical et paramédical** : elle met en relation les professionnels de santé (candidats) et les établissements de santé (cliniques, hôpitaux, cabinets, laboratoires…).

**Stack** : PHP 8.1+ (PDO) · MySQL/MariaDB · Bootstrap 5 · Font Awesome · FullCalendar · Dompdf · PHPMailer · chatbot local / Ollama / Hugging Face.
Toutes les bibliothèques front sont servies **localement** (`public/assets/vendor/`) : le site fonctionne sans connexion Internet, par exemple pour une démonstration.

## Installation

```bash
# 1. Dépendances PHP (Dompdf, PHPMailer)
composer install

# 2. Base de données
mysql -u root -p < database/schema.sql

# 3. Configuration locale (base de données, SMTP)
cp config/config.local.example.php config/config.local.php

# 4. Compte administrateur
php database/create_admin.php admin@exemple.tn "MotDePasseSolide"

# 5. (optionnel) Données de démonstration
php database/seed.php

# 6. Serveur de développement
php -S localhost:8000 -t public public/index.php
```

**Mise à jour d'une base existante** (créée avec la première version) :
`mysql -u root -p medical_staff < database/migrations/001_admin_et_mot_de_passe.sql`

### Déploiement (Apache)

- **Recommandé** : faire pointer la racine web (DocumentRoot) sur le dossier `public/`.
- **Hébergement mutualisé** où la racine ne peut pas être changée : déposer tout le projet, le `.htaccess` racine redirige automatiquement vers `public/`. Le code source (`config/`, `includes/`, `pages/`…) reste inaccessible depuis le web.
- `mod_rewrite` doit être actif. Si le site est dans un sous-dossier (ex. `/medical-staff`), définir `base_url` à `/medical-staff`.

### Emails (SMTP)

Renseigner `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass` et `smtp_secure` (`tls`, `ssl` ou `none`) dans `config/config.local.php` ou via les variables d'environnement `MS_SMTP_*`.
Exemples : Gmail (`smtp.gmail.com`, 587, `tls`, avec un mot de passe d'application), Brevo (`smtp-relay.brevo.com`, 587, `tls`).
Sans `smtp_host`, la fonction `mail()` de PHP est utilisée. Chaque envoi est aussi journalisé dans `storage/mails.log`.

### Comptes de démonstration (mot de passe `demo1234`)

| Rôle | Email |
|---|---|
| Administrateur | `admin@demo.tn` |
| Candidats | `amira@demo.tn`, `youssef@demo.tn`, `salma@demo.tn`, `mehdi@demo.tn`, `ines@demo.tn` (sans test de personnalité) |
| Établissement abonné | `clinique@demo.tn` |
| Établissement non abonné | `hopital@demo.tn` |

Paiement de l'abonnement simulé : carte `4242 4242 4242 4242`, `12/30`, CVV `123`.

## Structure

```
public/            Seule partie exposée au web
  index.php        Front controller (toutes les requêtes)
  assets/          css, js, img, vendor (Bootstrap, Font Awesome, FullCalendar, Poppins)
  uploads/photos/  Photos de profil (exécution de scripts interdite)
pages/             Une page = un fichier, associé à une URL propre
  accueil, mission, offres, demandes, logout, 404,
  mot-de-passe-oublie, reinitialiser-mot-de-passe
  candidat/        register, login, dashboard, cv, test, offres, entretiens
  recruteur/       register, login, dashboard, abonnement, offres, offre_form, cvtheque,
                   candidatures, cv, cv_pdf, suggestions, entretien, entretiens
  admin/           login, dashboard, utilisateurs, offres, abonnements
  api/             chatbot, competences
includes/          bootstrap, router, db, auth, functions, data (référentiels), offres,
                   personality, matching (IA), chatbot, mailer, password_reset, admin, header/footer
config/            config.php (+ config.local.php non versionné)
database/          schema.sql, migrations/, seed.php, create_admin.php
storage/           mails.log, admin.log (non versionné)
```

### URLs

`/chemin` correspond à `pages/chemin.php` : `/offres`, `/candidat/cv`, `/recruteur/cvtheque`, `/admin/utilisateurs`…
`/candidat`, `/recruteur` et `/admin` mènent au tableau de bord correspondant. Les anciennes adresses en `.php` sont redirigées (301) vers les nouvelles.

## Fonctionnalités

- **Visiteur** : accueil, mission, offres filtrables (poste, gouvernorat, contrat), demandes d'emploi anonymisées.
- **Candidat** : CV structuré (photo ≤ 2 Mo, 24 gouvernorats, diplômes, expériences, compétences avec autocomplétion, langues, prétentions, confidentialité des coordonnées) ; test de personnalité de 30 questions (Big Five + adaptation au milieu médical, jauges, portrait) ; bouton « Postuler » verrouillé tant que le CV et le test ne sont pas complétés ; emails de confirmation ; validation / refus des entretiens.
- **Établissement** : abonnement annuel 1 000 TND (paiement simulé) ; gestion des offres avec compétences en tags ; CVthèque multicritères ; candidatures ; CV détaillé (consultations journalisées) et PDF avec photo ; **suggestions IA 🧠** (compétences 45 %, diplôme 25 %, expérience 20 %, bonus personnalité 10 %) ; calendrier d'entretiens (créneaux de 30 min, 8h–18h, détection des chevauchements).
- **Administrateur** : tableau de bord (indicateurs clés, inscriptions par mois, offre et demande par métier) ; gestion des utilisateurs (recherche, suspension, réactivation, suppression) ; modération des offres ; activation manuelle d'abonnements (virement, chèque) et annulation. Toutes les actions sont tracées dans `storage/admin.log`.
- **Mot de passe oublié** : lien à usage unique envoyé par email, valable 1 heure, 3 demandes maximum par heure, sans révéler si l'adresse existe.
- **Chatbot Dr. Jobs** : moteur local par intentions, bascule optionnelle vers Ollama (`MS_CHATBOT_ENGINE=ollama`) ou Hugging Face (`huggingface` + `MS_HF_TOKEN`), historique limité aux 10 derniers messages.

## Sécurité

Mots de passe bcrypt · `session_regenerate_id` à la connexion · cookies `HttpOnly` / `SameSite=Lax` · jeton CSRF sur tous les formulaires et l'API · requêtes préparées PDO · échappement HTML systématique · contrôle d'accès par rôle et par abonnement · comptes suspendus déconnectés immédiatement · jetons de réinitialisation stockés hachés (SHA-256) · Content-Security-Policy restrictive (aucune ressource externe) · code source hors de la racine web · upload validé par `getimagesize` et renommé aléatoirement · déconnexion centralisée avec suppression du cookie · en-têtes anti-cache · PWA désactivée.

## Évolutions possibles

Vérification d'identité et badge « Vérifié », entretiens vidéo asynchrones, recommandation de formations, analyse prédictive des besoins, application mobile, messagerie interne, paiement en ligne réel (Konnect, Paymee, carte e-Dinar).
