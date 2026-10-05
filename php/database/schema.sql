-- Medical Staff – schéma de base de données MySQL
-- Usage : mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS medical_staff CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medical_staff;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS password_resets, tests_personnalite, entretiens, cv_consultations, candidatures, langues, competences,
    experiences, diplomes, offres, abonnements, recruteurs, candidats, utilisateurs;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE utilisateurs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    type ENUM('candidat','recruteur','admin') NOT NULL,
    actif TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    derniere_connexion DATETIME NULL
) ENGINE=InnoDB;

CREATE TABLE candidats (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT UNSIGNED NOT NULL UNIQUE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    date_naissance DATE NULL,
    lieu_naissance VARCHAR(100) NULL,
    telephone VARCHAR(30) NULL,
    photo VARCHAR(255) NULL,
    adresse VARCHAR(255) NULL,
    ville VARCHAR(60) NULL,
    pays VARCHAR(60) NULL DEFAULT 'Tunisie',
    poste_recherche VARCHAR(150) NULL,
    salaire_souhaite INT UNSIGNED NULL,
    disponibilite VARCHAR(60) NULL,
    coordonnees_visibles TINYINT(1) NOT NULL DEFAULT 1,
    updated_at DATETIME NULL,
    CONSTRAINT fk_cand_user FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    INDEX idx_cand_poste (poste_recherche),
    INDEX idx_cand_ville (ville)
) ENGINE=InnoDB;

CREATE TABLE recruteurs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT UNSIGNED NOT NULL UNIQUE,
    nom_etablissement VARCHAR(190) NOT NULL,
    type_etablissement VARCHAR(60) NOT NULL,
    matricule_fiscal VARCHAR(60) NULL,
    adresse VARCHAR(255) NULL,
    ville VARCHAR(60) NULL,
    telephone VARCHAR(30) NULL,
    contact_nom VARCHAR(100) NOT NULL,
    contact_prenom VARCHAR(100) NOT NULL,
    contact_fonction VARCHAR(100) NULL,
    CONSTRAINT fk_rec_user FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE abonnements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recruteur_id INT UNSIGNED NOT NULL,
    montant DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    statut ENUM('actif','expire','annule') NOT NULL DEFAULT 'actif',
    reference_paiement VARCHAR(60) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_abo_rec FOREIGN KEY (recruteur_id) REFERENCES recruteurs(id) ON DELETE CASCADE,
    INDEX idx_abo_rec (recruteur_id, date_fin)
) ENGINE=InnoDB;

CREATE TABLE offres (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recruteur_id INT UNSIGNED NOT NULL,
    titre VARCHAR(150) NOT NULL,
    type_contrat VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    ville VARCHAR(60) NOT NULL,
    salaire_min INT UNSIGNED NULL,
    salaire_max INT UNSIGNED NULL,
    diplome_requis VARCHAR(150) NULL,
    experience_min TINYINT UNSIGNED NOT NULL DEFAULT 0,
    date_limite DATE NULL,
    competences_requises TEXT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    CONSTRAINT fk_offre_rec FOREIGN KEY (recruteur_id) REFERENCES recruteurs(id) ON DELETE CASCADE,
    INDEX idx_offre_titre (titre),
    INDEX idx_offre_ville (ville)
) ENGINE=InnoDB;

CREATE TABLE diplomes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    candidat_id INT UNSIGNED NOT NULL,
    intitule VARCHAR(190) NOT NULL,
    etablissement VARCHAR(190) NULL,
    date_obtention DATE NULL,
    mention VARCHAR(40) NULL,
    CONSTRAINT fk_dip_cand FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE experiences (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    candidat_id INT UNSIGNED NOT NULL,
    poste VARCHAR(150) NOT NULL,
    etablissement VARCHAR(190) NULL,
    date_debut DATE NULL,
    date_fin DATE NULL,
    poste_actuel TINYINT(1) NOT NULL DEFAULT 0,
    description TEXT NULL,
    CONSTRAINT fk_exp_cand FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE competences (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    candidat_id INT UNSIGNED NOT NULL,
    nom VARCHAR(120) NOT NULL,
    CONSTRAINT fk_comp_cand FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE langues (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    candidat_id INT UNSIGNED NOT NULL,
    langue VARCHAR(60) NOT NULL,
    niveau VARCHAR(40) NOT NULL,
    CONSTRAINT fk_lang_cand FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE candidatures (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    offre_id INT UNSIGNED NOT NULL,
    candidat_id INT UNSIGNED NOT NULL,
    statut ENUM('envoyee','vue','entretien','refusee','retenue') NOT NULL DEFAULT 'envoyee',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_candidature (offre_id, candidat_id),
    CONSTRAINT fk_cdt_offre FOREIGN KEY (offre_id) REFERENCES offres(id) ON DELETE CASCADE,
    CONSTRAINT fk_cdt_cand FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cv_consultations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recruteur_id INT UNSIGNED NOT NULL,
    candidat_id INT UNSIGNED NOT NULL,
    consulte_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cons_rec FOREIGN KEY (recruteur_id) REFERENCES recruteurs(id) ON DELETE CASCADE,
    CONSTRAINT fk_cons_cand FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE,
    INDEX idx_cons (recruteur_id, candidat_id)
) ENGINE=InnoDB;

CREATE TABLE entretiens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recruteur_id INT UNSIGNED NOT NULL,
    candidat_id INT UNSIGNED NOT NULL,
    offre_id INT UNSIGNED NULL,
    date_debut DATETIME NOT NULL,
    date_fin DATETIME NOT NULL,
    lieu VARCHAR(255) NOT NULL,
    contact VARCHAR(190) NOT NULL,
    statut ENUM('en_attente','confirme','refuse') NOT NULL DEFAULT 'en_attente',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    CONSTRAINT fk_ent_rec FOREIGN KEY (recruteur_id) REFERENCES recruteurs(id) ON DELETE CASCADE,
    CONSTRAINT fk_ent_cand FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE,
    CONSTRAINT fk_ent_offre FOREIGN KEY (offre_id) REFERENCES offres(id) ON DELETE SET NULL,
    INDEX idx_ent_rec (recruteur_id, date_debut)
) ENGINE=InnoDB;

CREATE TABLE tests_personnalite (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    candidat_id INT UNSIGNED NOT NULL UNIQUE,
    ouverture TINYINT UNSIGNED NOT NULL,
    conscience TINYINT UNSIGNED NOT NULL,
    extraversion TINYINT UNSIGNED NOT NULL,
    agreabilite TINYINT UNSIGNED NOT NULL,
    stabilite TINYINT UNSIGNED NOT NULL,
    adaptation_medicale TINYINT UNSIGNED NOT NULL,
    portrait TEXT NOT NULL,
    reponses JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_test_cand FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE password_resets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expire_le DATETIME NOT NULL,
    utilise_le DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reset_user FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    INDEX idx_reset_user (utilisateur_id, created_at)
) ENGINE=InnoDB;
