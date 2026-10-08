/**
 * Génère migrations/0006_blog.sql à partir des articles rédigés dans content/blog/*.md.
 * Usage : node --experimental-strip-types --no-warnings scripts/blog-sql.ts
 * (Les articles se modifient ensuite depuis l'administration : /admin/blog.)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../content/blog/', import.meta.url);
const s = (v: unknown) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const fichiers = readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
const out: string[] = [
  '-- Blog : articles sur le milieu de travail (générés par scripts/blog-sql.ts depuis content/blog)',
  `CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    titre TEXT NOT NULL,
    categorie TEXT NOT NULL,
    resume TEXT NOT NULL,
    contenu TEXT NOT NULL,              -- Markdown simplifié
    image TEXT,                         -- illustration fournie (chemin /assets/…)
    photo TEXT,                         -- photo téléversée (clé de blog_photos), prioritaire sur l'image
    lecture INTEGER NOT NULL DEFAULT 5, -- minutes de lecture
    publie INTEGER NOT NULL DEFAULT 1,
    vues INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour')),
    updated_at TEXT
);`,
  'CREATE INDEX idx_articles_pub ON articles(publie, created_at);',
  `CREATE TABLE blog_photos (
    cle TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+1 hour'))
);`,
];
fichiers.forEach((f, i) => {
  const brut = readFileSync(new URL(f, dir), 'utf8');
  const m = brut.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`En-tête manquant : ${f}`);
  const meta = Object.fromEntries(m[1].split('\n').map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
  const slug = f.replace(/^\d+-/, '').replace(/\.md$/, '');
  // Le premier article reprend la photo de l'accueil ; les autres ont une illustration aux couleurs de la charte
  // Photo fournie (public/assets/img/blog/<slug>.jpg) si elle existe, sinon illustration aux couleurs de la charte
  const photo = new URL(`../public/assets/img/blog/${slug}.jpg`, import.meta.url);
  const image = i === 0 ? '/assets/img/infirmiere.jpg' : existsSync(photo) ? `/assets/img/blog/${slug}.jpg` : `/assets/img/blog/${f.replace(/\.md$/, '')}.svg`;
  const jours = (i + 1) * 4; // publication étalée dans le temps (le premier article est le plus récent)
  out.push(`INSERT INTO articles (slug, titre, categorie, resume, contenu, image, lecture, created_at) VALUES (${[slug, meta.titre, meta.categorie, meta.resume, m[2].trim(), image, Number(meta.lecture) || 5].map(s).join(', ')}, datetime('now', '+1 hour', '-${jours} days'));`);
});
// 0006 est déjà appliquée en production : on n'écrit le fichier que sur demande explicite
if (process.argv.includes('--ecrire')) writeFileSync(new URL('../migrations/0006_blog.sql', import.meta.url), out.join('\n') + '\n');
console.log(`${fichiers.length} articles → migrations/0006_blog.sql`);
