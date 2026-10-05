-- Medical Staff – schéma D1 (SQLite)
-- Les dates sont stockées en texte 'AAAA-MM-JJ HH:MM:SS', heure de Tunis (UTC+1).

CREATE TABLE utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    mot_de_passe TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('candidat','recruteur','admin')),
    actif INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour')),
    derniere_connexion TEXT
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,               -- SHA-256 du jeton de session
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    expire_le TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour'))
);
CREATE INDEX idx_sessions_user ON sessions(utilisateur_id);

CREATE TABLE candidats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utilisateur_id INTEGER NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    date_naissance TEXT,
    lieu_naissance TEXT,
    telephone TEXT,
    photo TEXT,                        -- clé aléatoire de la photo (table photos)
    adresse TEXT,
    ville TEXT,
    pays TEXT DEFAULT 'Tunisie',
    poste_recherche TEXT,
    salaire_souhaite INTEGER,
    disponibilite TEXT,
    coordonnees_visibles INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT
);
CREATE INDEX idx_cand_poste ON candidats(poste_recherche);
CREATE INDEX idx_cand_ville ON candidats(ville);

-- Photos de profil (stockées dans D1 : pas besoin d'activer R2)
CREATE TABLE photos (
    cle TEXT PRIMARY KEY,              -- 24 caractères hexadécimaux aléatoires (URL non devinable)
    candidat_id INTEGER NOT NULL REFERENCES candidats(id) ON DELETE CASCADE,
    mime TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour'))
);
CREATE INDEX idx_photos_cand ON photos(candidat_id);

CREATE TABLE recruteurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utilisateur_id INTEGER NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
    nom_etablissement TEXT NOT NULL,
    type_etablissement TEXT NOT NULL,
    matricule_fiscal TEXT,
    adresse TEXT,
    ville TEXT,
    telephone TEXT,
    contact_nom TEXT NOT NULL,
    contact_prenom TEXT NOT NULL,
    contact_fonction TEXT
);

CREATE TABLE abonnements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recruteur_id INTEGER NOT NULL REFERENCES recruteurs(id) ON DELETE CASCADE,
    montant REAL NOT NULL DEFAULT 1000,
    date_debut TEXT NOT NULL,
    date_fin TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif','expire','annule')),
    reference_paiement TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour'))
);
CREATE INDEX idx_abo_rec ON abonnements(recruteur_id, date_fin);

CREATE TABLE offres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recruteur_id INTEGER NOT NULL REFERENCES recruteurs(id) ON DELETE CASCADE,
    titre TEXT NOT NULL,
    type_contrat TEXT NOT NULL,
    description TEXT NOT NULL,
    ville TEXT NOT NULL,
    salaire_min INTEGER,
    salaire_max INTEGER,
    diplome_requis TEXT,
    experience_min INTEGER NOT NULL DEFAULT 0,
    date_limite TEXT,
    competences_requises TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour')),
    updated_at TEXT
);
CREATE INDEX idx_offre_titre ON offres(titre);
CREATE INDEX idx_offre_ville ON offres(ville);
CREATE INDEX idx_offre_rec ON offres(recruteur_id);

CREATE TABLE diplomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidat_id INTEGER NOT NULL REFERENCES candidats(id) ON DELETE CASCADE,
    intitule TEXT NOT NULL,
    etablissement TEXT,
    date_obtention TEXT,
    mention TEXT
);
CREATE INDEX idx_dip_cand ON diplomes(candidat_id);

CREATE TABLE experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidat_id INTEGER NOT NULL REFERENCES candidats(id) ON DELETE CASCADE,
    poste TEXT NOT NULL,
    etablissement TEXT,
    date_debut TEXT,
    date_fin TEXT,
    poste_actuel INTEGER NOT NULL DEFAULT 0,
    description TEXT
);
CREATE INDEX idx_exp_cand ON experiences(candidat_id);

CREATE TABLE competences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidat_id INTEGER NOT NULL REFERENCES candidats(id) ON DELETE CASCADE,
    nom TEXT NOT NULL
);
CREATE INDEX idx_comp_cand ON competences(candidat_id);

CREATE TABLE langues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidat_id INTEGER NOT NULL REFERENCES candidats(id) ON DELETE CASCADE,
    langue TEXT NOT NULL,
    niveau TEXT NOT NULL
);
CREATE INDEX idx_lang_cand ON langues(candidat_id);

CREATE TABLE candidatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offre_id INTEGER NOT NULL REFERENCES offres(id) ON DELETE CASCADE,
    candidat_id INTEGER NOT NULL REFERENCES candidats(id) ON DELETE CASCADE,
    statut TEXT NOT NULL DEFAULT 'envoyee' CHECK (statut IN ('envoyee','vue','entretien','refusee','retenue')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour')),
    UNIQUE (offre_id, candidat_id)
);
CREATE INDEX idx_cdt_cand ON candidatures(candidat_id);

CREATE TABLE cv_consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recruteur_id INTEGER NOT NULL REFERENCES recruteurs(id) ON DELETE CASCADE,
    candidat_id INTEGER NOT NULL REFERENCES candidats(id) ON DELETE CASCADE,
    consulte_le TEXT NOT NULL DEFAULT (datetime('now', '+1 hour'))
);
CREATE INDEX idx_cons ON cv_consultations(recruteur_id, candidat_id);
CREATE INDEX idx_cons_cand ON cv_consultations(candidat_id);

CREATE TABLE entretiens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recruteur_id INTEGER NOT NULL REFERENCES recruteurs(id) ON DELETE CASCADE,
    candidat_id INTEGER NOT NULL REFERENCES candidats(id) ON DELETE CASCADE,
    offre_id INTEGER REFERENCES offres(id) ON DELETE SET NULL,
    date_debut TEXT NOT NULL,
    date_fin TEXT NOT NULL,
    lieu TEXT NOT NULL,
    contact TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','confirme','refuse')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour')),
    updated_at TEXT
);
CREATE INDEX idx_ent_rec ON entretiens(recruteur_id, date_debut);
CREATE INDEX idx_ent_cand ON entretiens(candidat_id);

CREATE TABLE tests_personnalite (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidat_id INTEGER NOT NULL UNIQUE REFERENCES candidats(id) ON DELETE CASCADE,
    ouverture INTEGER NOT NULL,
    conscience INTEGER NOT NULL,
    extraversion INTEGER NOT NULL,
    agreabilite INTEGER NOT NULL,
    stabilite INTEGER NOT NULL,
    adaptation_medicale INTEGER NOT NULL,
    portrait TEXT NOT NULL,
    reponses TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour'))
);

CREATE TABLE password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expire_le TEXT NOT NULL,
    utilise_le TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour'))
);
CREATE INDEX idx_reset_user ON password_resets(utilisateur_id, created_at);

-- Journal des emails (mode « log » : consultable dans l'administration)
CREATE TABLE emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destinataire TEXT NOT NULL,
    sujet TEXT NOT NULL,
    corps_html TEXT NOT NULL,
    statut TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour'))
);

-- Journal des actions d'administration
CREATE TABLE admin_journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour'))
);

-- Limitation des tentatives de connexion (anti force brute)
CREATE TABLE tentatives_connexion (
    cle TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour'))
);
CREATE INDEX idx_tentatives ON tentatives_connexion(cle, created_at);
