-- Un seul poste « Infirmier(ère) » (fin des intitulés urgences, bloc, réanimation, pédiatrie, polyvalent)
UPDATE candidats SET poste_recherche = 'Infirmier(ère)' WHERE poste_recherche LIKE 'Infirmier(ère)%';
UPDATE offres SET titre = 'Infirmier(ère)' WHERE titre LIKE 'Infirmier(ère)%';
UPDATE entretiens_ia SET poste = 'Infirmier(ère)' WHERE poste LIKE 'Infirmier(ère)%';
