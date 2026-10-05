-- Entretien IA : évaluation de la communication (réponses orales transcrites)
CREATE TABLE entretiens_ia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidat_id INTEGER NOT NULL REFERENCES candidats(id) ON DELETE CASCADE,
    statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','termine','abandonne')),
    poste TEXT,
    questions TEXT NOT NULL,              -- JSON : liste des questions posées
    reponses TEXT NOT NULL DEFAULT '[]',  -- JSON : [{ texte, mode, duree, source }] (aucun audio n'est conservé)
    clarte INTEGER,
    structure INTEGER,
    empathie INTEGER,
    vocabulaire INTEGER,
    adaptation INTEGER,
    score_global INTEGER,
    synthese TEXT,
    points_forts TEXT,                    -- JSON
    conseils TEXT,                        -- JSON
    moteur TEXT,                          -- 'workers-ai' ou 'simplifie'
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour')),
    termine_le TEXT
);
CREATE INDEX idx_eia_cand ON entretiens_ia(candidat_id, statut, created_at);
