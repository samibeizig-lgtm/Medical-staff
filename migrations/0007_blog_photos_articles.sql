-- Photos des articles du blog (fournies par medicalstaff.tn)
UPDATE articles SET image = '/assets/img/blog/portrait-sage-femme.jpg' WHERE slug = 'portrait-sage-femme';
UPDATE articles SET image = '/assets/img/blog/marche-emploi-tunisie.jpg' WHERE slug = 'marche-emploi-tunisie';
UPDATE articles SET image = '/assets/img/blog/travailler-etranger.jpg' WHERE slug = 'travailler-etranger';
UPDATE articles SET image = '/assets/img/blog/cv-paramedical.jpg' WHERE slug = 'cv-paramedical';
UPDATE articles SET image = '/assets/img/blog/stress-burn-out.jpg' WHERE slug = 'stress-burn-out';

-- Ordre de publication : l'article sur l'entretien est le plus récent, puis le portrait, le marché, l'international…
UPDATE articles SET created_at = datetime('now', '+1 hour', '-4 days') WHERE slug = 'reussir-entretien-embauche';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-8 days') WHERE slug = 'portrait-sage-femme';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-12 days') WHERE slug = 'marche-emploi-tunisie';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-16 days') WHERE slug = 'travailler-etranger';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-20 days') WHERE slug = 'cv-paramedical';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-24 days') WHERE slug = 'stress-burn-out';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-28 days') WHERE slug = 'travail-de-nuit';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-32 days') WHERE slug = 'jeunes-diplomes';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-36 days') WHERE slug = 'hygiene-des-mains';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-40 days') WHERE slug = 'communication-patient';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-44 days') WHERE slug = 'salaire-negociation';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-48 days') WHERE slug = 'fideliser-equipes';
UPDATE articles SET created_at = datetime('now', '+1 hour', '-52 days') WHERE slug = 'evoluer-carriere';
