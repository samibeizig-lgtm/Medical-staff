import { Hono } from 'hono';
import { raw } from 'hono/html';
import type { AppEnv, Row } from '../types';
import { all, one, run, val } from '../lib/db';
import { q } from '../lib/http';
import { dateLongue } from '../lib/dates';
import { markdown } from '../lib/markdown';
import { page } from '../views/layout';
import { Empty, Pagination } from '../views/ui';

const r = new Hono<AppEnv>();
const PAR_PAGE = 9;
/** « 6 octobre 2026 » */
const datePub = (d: string) => dateLongue(d).split(' ').slice(1).join(' ');

export const imageArticle = (a: Row) => (a.photo ? `/blog/photo/${a.photo}` : a.image || '/assets/img/blog/01-reussir-entretien-embauche.svg');

export function CarteArticle({ a, grand = false }: { a: Row; grand?: boolean }) {
  return (
    <a href={`/blog/${a.slug}`} class={`card border-0 shadow-sm h-100 text-decoration-none article-card${grand ? ' article-une' : ''}`}>
      <div class="article-img"><img src={imageArticle(a)} alt="" loading="lazy" /></div>
      <div class="card-body">
        <span class="badge rounded-pill bg-primary-subtle text-primary mb-2">{a.categorie}</span>
        <h3 class={grand ? 'h4 text-dark' : 'h6 text-dark'}>{a.titre}</h3>
        <p class="small text-muted mb-2">{a.resume}</p>
        <small class="text-muted"><i class="fa-regular fa-calendar me-1"></i>{datePub(a.created_at)} · <i class="fa-regular fa-clock ms-1 me-1"></i>{a.lecture} min</small>
      </div>
    </a>
  );
}

/* ---------- Liste ---------- */
r.get('/blog', async (c) => {
  const db = c.env.DB;
  const cats = await all<Row>(db, 'SELECT categorie, COUNT(*) AS n FROM articles WHERE publie = 1 GROUP BY categorie ORDER BY n DESC, categorie');
  const cat = cats.some((x) => x.categorie === q(c, 'categorie')) ? q(c, 'categorie') : '';
  const w = cat ? 'publie = 1 AND categorie = ?' : 'publie = 1';
  const params = cat ? [cat] : [];
  const total = (await val<number>(db, `SELECT COUNT(*) FROM articles WHERE ${w}`, ...params)) ?? 0;
  // Sans filtre, la page 1 a un article « à la une » en plus de la grille : les rangées de 3 restent complètes
  const alaUne = cat ? 0 : 1;
  const pages = Math.max(1, Math.ceil(Math.max(0, total - alaUne) / PAR_PAGE));
  const pg = Math.min(Math.max(1, Number(q(c, 'page')) || 1), pages);
  const limite = PAR_PAGE + (pg === 1 ? alaUne : 0);
  const decalage = pg === 1 ? 0 : alaUne + (pg - 1) * PAR_PAGE;
  const rows = await all<Row>(db, `SELECT id, slug, titre, categorie, resume, image, photo, lecture, created_at FROM articles WHERE ${w} ORDER BY created_at DESC, id DESC LIMIT ${limite} OFFSET ${decalage}`, ...params);
  const [une, ...autres] = pg === 1 && alaUne ? rows : [null, ...rows];
  return page(c, { title: 'Blog', active: 'blog' }, (
    <>
      <section class="page-header"><div class="container">
        <h1 class="fw-bold">Le blog medicalstaff.tn</h1>
        <p class="lead mb-0 text-white-50">Conseils carrière, portraits de soignants, marché de l'emploi et vie au travail dans le secteur de la santé.</p>
      </div></section>
      <div class="container py-4">
        <nav class="d-flex flex-wrap gap-2 mb-4" aria-label="Catégories">
          <a href="/blog" class={`btn btn-sm rounded-pill ${cat ? 'btn-outline-primary' : 'btn-primary'}`}>Tous les articles</a>
          {cats.map((x) => <a href={`/blog?categorie=${encodeURIComponent(x.categorie)}`} class={`btn btn-sm rounded-pill ${cat === x.categorie ? 'btn-primary' : 'btn-outline-primary'}`}>{x.categorie} <span class="opacity-75">({x.n})</span></a>)}
        </nav>
        {!rows.length && <Empty icon="fa-regular fa-newspaper">Aucun article pour le moment.</Empty>}
        {une && <div class="mb-4"><CarteArticle a={une} grand /></div>}
        <div class="row g-4">
          {autres.map((a) => <div class="col-md-6 col-lg-4"><CarteArticle a={a!} /></div>)}
        </div>
        <div class="mt-4"><Pagination page={pg} pages={pages} query={cat ? { categorie: cat } : {}} /></div>
      </div>
    </>
  ));
});

/* ---------- Article ---------- */
r.get('/blog/:slug{[a-z0-9-]+}', async (c) => {
  const db = c.env.DB;
  const a = await one<Row>(db, 'SELECT * FROM articles WHERE slug = ? AND publie = 1', c.req.param('slug'));
  if (!a) return c.notFound();
  c.executionCtx.waitUntil(run(db, 'UPDATE articles SET vues = vues + 1 WHERE id = ?', a.id).catch(() => {}));
  const autres = await all<Row>(db,
    `SELECT id, slug, titre, categorie, resume, image, photo, lecture, created_at FROM articles WHERE publie = 1 AND id <> ?
     ORDER BY (categorie = ?) DESC, created_at DESC LIMIT 3`, a.id, a.categorie);
  const url = new URL(c.req.url);
  const lien = encodeURIComponent(`${url.origin}/blog/${a.slug}`);
  const titre = encodeURIComponent(a.titre);
  const u = c.get('user');
  return page(c, {
    title: a.titre, active: 'blog',
    head: <>
      <meta property="og:title" content={a.titre} />
      <meta property="og:description" content={a.resume} />
      <meta property="og:type" content="article" />
      {!String(imageArticle(a)).endsWith('.svg') && <meta property="og:image" content={`${url.origin}${imageArticle(a)}`} />}
    </>,
  }, (
    <article class="container py-4 article">
      <nav aria-label="Fil d'Ariane" class="small mb-3"><a href="/blog"><i class="fa-solid fa-arrow-left me-1"></i>Blog</a> <span class="text-muted">/ {a.categorie}</span></nav>
      <div class="row justify-content-center"><div class="col-lg-9">
        <span class="badge rounded-pill bg-primary-subtle text-primary mb-2">{a.categorie}</span>
        <h1 class="article-titre">{a.titre}</h1>
        <p class="lead text-muted">{a.resume}</p>
        <p class="small text-muted"><i class="fa-regular fa-calendar me-1"></i>{datePub(a.created_at)} · <i class="fa-regular fa-clock ms-1 me-1"></i>{a.lecture} min de lecture · La rédaction medicalstaff.tn</p>
        <div class="article-cover mb-4"><img src={imageArticle(a)} alt="" /></div>
        <div class="article-contenu">{raw(markdown(a.contenu))}</div>
        <div class="d-flex flex-wrap align-items-center gap-2 border-top pt-3 mt-4">
          <span class="small text-muted me-1">Partager :</span>
          <a class="btn btn-sm btn-outline-primary" target="_blank" rel="noopener" href={`https://wa.me/?text=${titre}%20${lien}`}><i class="fa-brands fa-whatsapp me-1"></i>WhatsApp</a>
          <a class="btn btn-sm btn-outline-primary" target="_blank" rel="noopener" href={`https://www.facebook.com/sharer/sharer.php?u=${lien}`}><i class="fa-brands fa-facebook me-1"></i>Facebook</a>
          <a class="btn btn-sm btn-outline-primary" target="_blank" rel="noopener" href={`https://www.linkedin.com/sharing/share-offsite/?url=${lien}`}><i class="fa-brands fa-linkedin me-1"></i>LinkedIn</a>
        </div>
        {!u && (
          <div class="cta-box cta-primary mt-4">
            <h2 class="h5">Prêt(e) pour la suite de votre carrière ?</h2>
            <p class="mb-3">Créez votre profil gratuitement, validez vos compétences et postulez aux offres des établissements de santé partout en Tunisie.</p>
            <a href="/candidat/register" class="btn btn-light me-2">Créer mon compte</a>
            <a href="/offres" class="btn btn-outline-light">Voir les offres</a>
          </div>
        )}
      </div></div>
      {autres.length > 0 && (
        <section class="mt-5">
          <h2 class="section-title h4">À lire aussi</h2>
          <div class="row g-4">{autres.map((x) => <div class="col-md-4"><CarteArticle a={x} /></div>)}</div>
        </section>
      )}
    </article>
  ));
});

/* ---------- Photos téléversées par l'administration ---------- */
r.get('/blog/photo/:cle{[a-f0-9]{24}}', async (c) => {
  const p = await one<Row>(c.env.DB, 'SELECT mime, data FROM blog_photos WHERE cle = ?', c.req.param('cle'));
  if (!p) return c.notFound();
  const data = p.data instanceof ArrayBuffer ? new Uint8Array(p.data) : new Uint8Array(p.data as number[]);
  return new Response(data, { headers: { 'Content-Type': p.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
});

export default r;
