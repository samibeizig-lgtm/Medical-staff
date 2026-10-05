-- Migration pour une base créée avec la première version du schéma :
-- suspension de comptes (administration) et réinitialisation de mot de passe.
-- Usage : mysql -u root -p medical_staff < database/migrations/001_admin_et_mot_de_passe.sql
ALTER TABLE utilisateurs ADD COLUMN actif TINYINT(1) NOT NULL DEFAULT 1 AFTER type;

CREATE TABLE IF NOT EXISTS password_resets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expire_le DATETIME NOT NULL,
    utilise_le DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reset_user FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    INDEX idx_reset_user (utilisateur_id, created_at)
) ENGINE=InnoDB;
