-- Compétences validées uniquement par QCM chronométré
-- Les compétences saisies librement jusqu'ici ne sont plus prises en compte : elles sont supprimées.
DELETE FROM competences;
ALTER TABLE competences ADD COLUMN bonnes INTEGER;
ALTER TABLE competences ADD COLUMN total INTEGER;
ALTER TABLE competences ADD COLUMN valide_le TEXT;
ALTER TABLE competences ADD COLUMN qcm_id INTEGER;
CREATE UNIQUE INDEX idx_comp_unique ON competences(candidat_id, nom);

CREATE TABLE qcm_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidat_id INTEGER NOT NULL REFERENCES candidats(id) ON DELETE CASCADE,
    statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','termine','abandonne')),
    famille TEXT NOT NULL,
    questions TEXT NOT NULL,              -- JSON : [{ c: compétence, q: index, ordre: [permutation des choix] }]
    reponses TEXT NOT NULL DEFAULT '[]',  -- JSON : [{ choix, ok, duree }]
    question_debut TEXT,                  -- horodatage serveur de l'affichage de la question en cours
    score INTEGER,                        -- % de bonnes réponses
    resultats TEXT,                       -- JSON : [{ nom, bonnes, total, validee }]
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour')),
    termine_le TEXT
);
CREATE INDEX idx_qcm_cand ON qcm_sessions(candidat_id, statut, created_at);
