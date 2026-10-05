-- Entretien IA : heure à laquelle la question en cours a été affichée (pas de temps de préparation)
ALTER TABLE entretiens_ia ADD COLUMN question_debut TEXT;
