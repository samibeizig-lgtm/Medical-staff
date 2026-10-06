-- Nouvelle règle : une compétence n'est validée qu'avec 3 bonnes réponses sur 3.
-- Les validations obtenues avec 2/3 sous l'ancienne règle sont retirées.
DELETE FROM competences WHERE bonnes IS NOT NULL AND total IS NOT NULL AND bonnes < total;
