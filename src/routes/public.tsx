import { Hono } from 'hono';
import type { AppEnv, Row } from '../types';
import { all, one, val, TODAY } from '../lib/db';
import { page } from '../views/layout';
import { Empty, OffreCard, Options, Pagination } from '../views/ui';
import { GOUVERNORATS, POSTES, RUBRIQUES, TYPES_CONTRAT, inList } from '../lib/data';
import { excerpt, formatNombre, money, refCandidat } from '../lib/format';
import { cleanQuery, searchOffres } from '../lib/offres';
import { q } from '../lib/http';
import { abonnementActif, currentRecruteur, SQL_EXP_MOIS } from '../lib/models';

const r = new Hono<AppEnv>();

/* ---------- Accueil ---------- */
r.get('/', async (c) => {
  const db = c.env.DB;
  const [stats, dernieres] = await Promise.all([
    one<Row>(
      db,
      `SELECT (SELECT COUNT(*) FROM offres WHERE active = 1 AND (date_limite IS NULL OR date_limite >= ${TODAY})) AS offres,
              (SELECT COUNT(*) FROM candidats WHERE poste_recherche IS NOT NULL) AS candidats,
              (SELECT COUNT(*) FROM recruteurs) AS recruteurs`,
    ),
    all<Row>(
      db,
      `SELECT o.*, r.nom_etablissement FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id
       WHERE o.active = 1 AND (o.date_limite IS NULL OR o.date_limite >= ${TODAY}) ORDER BY o.created_at DESC, o.id DESC LIMIT 3`,
    ),
  ]);
  const prix = formatNombre(Number(c.env.ABONNEMENT_PRIX));
  const temoignages = [
    { nom: 'Amira B.', role: 'Sage-femme, Sfax', texte: "J'ai trouvé un poste dans une maternité à Sfax trois semaines après mon inscription. Le test de personnalité m'a vraiment démarquée." },
    { nom: 'Dr. Karim M.', role: 'Directeur, Clinique Les Oliviers', texte: 'Les suggestions IA nous font gagner un temps précieux : nous recevons directement les profils les plus pertinents pour chaque offre.' },
    { nom: 'Youssef T.', role: 'Technicien anesthésiste, Sousse', texte: 'Une plateforme claire, spécialisée, et des recruteurs sérieux. Les entretiens se planifient en un clic.' },
  ];
  return page(c, { title: 'Accueil', active: 'home' }, (
    <>
      <section class="hero">
        <div class="container">
          <div class="row align-items-center g-4 g-lg-5">
            <div class="col-lg-6">
              <span class="badge rounded-pill bg-light text-primary mb-3"><i class="fa-solid fa-heart-pulse me-1"></i>N°1 du recrutement paramédical en Tunisie</span>
              <h1 class="display-5 fw-bold text-white">Les talents de la santé rencontrent les établissements qui les recherchent</h1>
              <p class="lead text-white-50 mt-3">Infirmiers, sages-femmes, techniciens, kinésithérapeutes… Trouvez votre prochain poste ou recrutez les meilleurs profils en quelques clics.</p>
              <form class="hero-search bg-white rounded-3 p-2 mt-4 d-flex flex-column flex-md-row gap-2" action="/offres">
                <select name="poste" class="form-select border-0" aria-label="Poste"><Options items={POSTES} placeholder="Quel poste ?" /></select>
                <select name="ville" class="form-select border-0" aria-label="Ville"><Options items={GOUVERNORATS} placeholder="Où ?" /></select>
                <button class="btn btn-primary px-4"><i class="fa-solid fa-magnifying-glass me-1"></i>Rechercher</button>
              </form>
            </div>
            <div class="col-lg-6 d-none d-lg-block"><img src="/assets/img/hero.svg" class="img-fluid" alt="Équipe médicale" /></div>
          </div>
        </div>
      </section>

      <section class="container stats-bar">
        <div class="row g-3 text-center">
          <div class="col-4"><div class="stat"><strong>{stats?.offres ?? 0}</strong><span>offres actives</span></div></div>
          <div class="col-4"><div class="stat"><strong>{stats?.candidats ?? 0}</strong><span>professionnels inscrits</span></div></div>
          <div class="col-4"><div class="stat"><strong>{stats?.recruteurs ?? 0}</strong><span>établissements</span></div></div>
        </div>
      </section>

      <section class="container py-5">
        <div class="row align-items-center g-4 g-lg-5">
          <div class="col-lg-6">
            <h2 class="section-title">Une plateforme pensée pour la santé</h2>
            <p class="text-muted">Medical Staff met en relation les professionnels de santé avec les cliniques, hôpitaux, cabinets, laboratoires et centres spécialisés partout en Tunisie. Notre plateforme combine CV structuré, test de personnalité, matching intelligent et planification d'entretiens pour accélérer chaque recrutement.</p>
            <ul class="list-unstyled check-list">
              <li><i class="fa-solid fa-circle-check"></i>CV structuré adapté aux métiers paramédicaux</li>
              <li><i class="fa-solid fa-circle-check"></i>Test de personnalité Big Five adapté au milieu médical</li>
              <li><i class="fa-solid fa-circle-check"></i>Suggestions de profils par intelligence artificielle</li>
              <li><i class="fa-solid fa-circle-check"></i>Calendrier d'entretiens intégré</li>
            </ul>
          </div>
          <div class="col-lg-6">
            <div class="row g-3">
              {RUBRIQUES.map((rb) => (
                <div class="col-12">
                  <a class="rubrique card border-0 shadow-sm text-decoration-none" href={`/offres?${rb.q}`}>
                    <div class="card-body d-flex align-items-center gap-3">
                      <div class="icon-circle"><i class={`fa-solid ${rb.icon}`}></i></div>
                      <div><h5 class="mb-1 text-dark">{rb.titre}</h5><p class="mb-0 text-muted small">{rb.texte}</p></div>
                      <i class="fa-solid fa-chevron-right ms-auto text-primary"></i>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section class="bg-soft py-5">
        <div class="container">
          <h2 class="section-title text-center">Comment ça marche ?</h2>
          <div class="row g-4 mt-2">
            <div class="col-lg-6">
              <div class="card h-100 border-0 shadow-sm"><div class="card-body p-4">
                <h4 class="text-primary"><i class="fa-solid fa-user-nurse me-2"></i>Vous êtes candidat</h4>
                <ol class="steps">
                  <li><strong>Créez votre compte</strong> gratuitement en 1 minute.</li>
                  <li><strong>Déposez votre CV</strong> : diplômes, expériences, compétences, langues.</li>
                  <li><strong>Passez le test de personnalité</strong> pour mettre en valeur votre profil.</li>
                  <li><strong>Postulez</strong> aux offres et gérez vos entretiens depuis votre espace.</li>
                </ol>
                <a href="/candidat/register" class="btn btn-primary">Je crée mon CV</a>
              </div></div>
            </div>
            <div class="col-lg-6">
              <div class="card h-100 border-0 shadow-sm"><div class="card-body p-4">
                <h4 class="text-teal"><i class="fa-solid fa-hospital me-2"></i>Vous êtes un établissement</h4>
                <ol class="steps">
                  <li><strong>Inscrivez votre établissement</strong> et son responsable.</li>
                  <li><strong>Activez votre abonnement</strong> annuel ({prix} TND).</li>
                  <li><strong>Publiez vos offres</strong> et explorez la CVthèque.</li>
                  <li><strong>Laissez l'IA vous suggérer</strong> les meilleurs profils et planifiez vos entretiens.</li>
                </ol>
                <a href="/recruteur/register" class="btn btn-teal">Je recrute</a>
              </div></div>
            </div>
          </div>
        </div>
      </section>

      {dernieres.length > 0 && (
        <section class="container py-5">
          <div class="d-flex justify-content-between align-items-end mb-3">
            <h2 class="section-title mb-0">Dernières offres</h2>
            <a href="/offres">Toutes les offres <i class="fa-solid fa-arrow-right"></i></a>
          </div>
          <div class="row g-3">
            {dernieres.map((o) => (
              <div class="col-md-4">
                <div class="card h-100 border-0 shadow-sm offer-card"><div class="card-body">
                  <span class="badge bg-primary-subtle text-primary mb-2">{o.type_contrat}</span>
                  <h5 class="card-title">{o.titre}</h5>
                  <p class="text-muted small mb-1"><i class="fa-solid fa-hospital me-1"></i>{o.nom_etablissement}</p>
                  <p class="text-muted small"><i class="fa-solid fa-location-dot me-1"></i>{o.ville}</p>
                  <p class="small mb-0">{excerpt(o.description, 110)}</p>
                </div></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section class="container py-5">
        <h2 class="section-title text-center">Ils nous font confiance</h2>
        <div class="row g-4 mt-2">
          {temoignages.map((t) => (
            <div class="col-md-4">
              <div class="card h-100 border-0 shadow-sm testimonial"><div class="card-body p-4">
                <i class="fa-solid fa-quote-left fa-2x text-primary opacity-25"></i>
                <p class="mt-2">{t.texte}</p>
                <div class="d-flex align-items-center gap-2 mt-3">
                  <div class="avatar-initials">{t.nom.slice(0, 1)}</div>
                  <div><strong>{t.nom}</strong><br /><small class="text-muted">{t.role}</small></div>
                </div>
              </div></div>
            </div>
          ))}
        </div>
      </section>
    </>
  ));
});

/* ---------- Mission ---------- */
r.get('/mission', (c) => {
  const piliers = [
    { icon: 'fa-eye', titre: 'Transparence', texte: 'Des offres détaillées (salaire, diplôme, expérience requise) et des candidatures suivies en temps réel. Chacun sait où il en est.' },
    { icon: 'fa-bolt', titre: 'Rapidité', texte: "Matching intelligent, CVthèque multicritères et planification d'entretiens intégrée : un recrutement en jours, pas en mois." },
    { icon: 'fa-handshake', titre: 'Proximité', texte: 'Une plateforme tunisienne couvrant les 24 gouvernorats, au plus près des réalités du terrain et des établissements régionaux.' },
    { icon: 'fa-scale-balanced', titre: 'Équité', texte: 'CVthèque anonymisée pour le public, critères objectifs et égalité des chances entre tous les professionnels de santé.' },
  ];
  return page(c, { title: 'Notre mission', active: 'mission' }, (
    <>
      <section class="page-header"><div class="container">
        <h1 class="fw-bold">Notre mission</h1>
        <p class="lead mb-0">Faciliter l'accès à l'emploi des professionnels de santé et renforcer les équipes soignantes de Tunisie.</p>
      </div></section>
      <section class="container py-5">
        <div class="row justify-content-center"><div class="col-lg-9 text-center">
          <p class="fs-5 text-muted">Le système de santé tunisien repose sur des milliers de professionnels paramédicaux engagés. Pourtant, trouver le bon poste ou le bon profil reste souvent long et opaque. Medical Staff est né pour changer cela : une plateforme spécialisée, moderne et équitable, au service des soignants comme des établissements.</p>
        </div></div>
        <div class="row g-4 mt-3">
          {piliers.map((p) => (
            <div class="col-md-6 col-lg-3">
              <div class="card h-100 border-0 shadow-sm text-center pilier"><div class="card-body p-4">
                <div class="icon-circle mx-auto mb-3"><i class={`fa-solid ${p.icon}`}></i></div>
                <h4>{p.titre}</h4>
                <p class="text-muted small mb-0">{p.texte}</p>
              </div></div>
            </div>
          ))}
        </div>
      </section>
      <section class="bg-soft py-5"><div class="container"><div class="row g-4">
        <div class="col-md-6"><div class="cta-box cta-primary">
          <h3>Vous êtes un professionnel de santé ?</h3>
          <p>Créez votre CV, passez le test de personnalité et accédez aux meilleures offres du secteur.</p>
          <a class="btn btn-light" href="/candidat/register">Créer mon compte candidat</a>
        </div></div>
        <div class="col-md-6"><div class="cta-box cta-teal">
          <h3>Vous représentez un établissement ?</h3>
          <p>Publiez vos offres, explorez la CVthèque et laissez l'IA vous proposer les meilleurs profils.</p>
          <a class="btn btn-light" href="/recruteur/register">Inscrire mon établissement</a>
        </div></div>
      </div></div></section>
    </>
  ));
});

/* ---------- Offres publiques ---------- */
r.get('/offres', async (c) => {
  const user = c.get('user');
  if (user?.type === 'candidat') return c.redirect('/candidat/offres' + (new URL(c.req.url).search || ''));
  const f = {
    poste: inList(POSTES, q(c, 'poste')) ? q(c, 'poste') : '',
    ville: inList(GOUVERNORATS, q(c, 'ville')) ? q(c, 'ville') : '',
    contrat: inList(TYPES_CONTRAT, q(c, 'contrat')) ? q(c, 'contrat') : '',
  };
  const res = await searchOffres(c.env.DB, f, Number(q(c, 'page')) || 1);
  return page(c, { title: "Offres d'emploi", active: 'offres' }, (
    <>
      <section class="page-header"><div class="container">
        <h1 class="fw-bold">Offres d'emploi</h1>
        <p class="lead mb-0">Les postes médicaux et paramédicaux à pourvoir partout en Tunisie.</p>
      </div></section>
      <div class="container py-4">
        <form class="card border-0 shadow-sm mb-4" method="get">
          <div class="card-body row g-2 align-items-end">
            <div class="col-md-4"><label class="form-label small">Poste</label><select name="poste" class="form-select"><Options items={POSTES} selected={f.poste} placeholder="Tous les postes" /></select></div>
            <div class="col-md-3"><label class="form-label small">Ville (gouvernorat)</label><select name="ville" class="form-select"><Options items={GOUVERNORATS} selected={f.ville} placeholder="Toute la Tunisie" /></select></div>
            <div class="col-md-3"><label class="form-label small">Type de contrat</label><select name="contrat" class="form-select"><Options items={TYPES_CONTRAT} selected={f.contrat} placeholder="Tous" /></select></div>
            <div class="col-md-2 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-filter me-1"></i>Filtrer</button></div>
          </div>
        </form>
        <p class="text-muted">{res.total} offre(s) trouvée(s)</p>
        {!res.rows.length && <Empty icon="fa-regular fa-folder-open">Aucune offre ne correspond à vos critères.</Empty>}
        {res.rows.map((o) => (
          <OffreCard o={o} actions={user?.type === 'recruteur' || user?.type === 'admin' ? null : (
            <>
              <a class="btn btn-primary" href={`/candidat/login?offre=${o.id}`}><i class="fa-solid fa-paper-plane me-1"></i>Postuler</a>
              <div class="small text-muted mt-1">Connexion requise</div>
            </>
          )} />
        ))}
        <Pagination page={res.page} pages={res.pages} query={cleanQuery(f)} />
      </div>
    </>
  ));
});

/* ---------- Demandes d'emploi (anonymisées) ---------- */
r.get('/demandes', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const rec = user?.type === 'recruteur' ? await currentRecruteur(db, user.id) : null;
  const abonne = rec ? !!(await abonnementActif(db, rec.id)) : false;
  const f = {
    poste: inList(POSTES, q(c, 'poste')) ? q(c, 'poste') : '',
    ville: inList(GOUVERNORATS, q(c, 'ville')) ? q(c, 'ville') : '',
  };
  const where = ["c.poste_recherche IS NOT NULL", "c.poste_recherche <> ''"];
  const params: unknown[] = [];
  if (f.poste) { where.push('c.poste_recherche = ?'); params.push(f.poste); }
  if (f.ville) { where.push('c.ville = ?'); params.push(f.ville); }
  const w = where.join(' AND ');
  const perPage = 15;
  const total = (await val<number>(db, `SELECT COUNT(*) FROM candidats c WHERE ${w}`, ...params)) ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pg = Math.min(Math.max(1, Number(q(c, 'page')) || 1), pages);
  // Seules des données non identifiantes sont sélectionnées (anonymisation)
  const rows = await all<Row>(
    db,
    `SELECT c.id, c.poste_recherche, c.ville, c.salaire_souhaite, c.disponibilite, ${SQL_EXP_MOIS} AS exp_mois
     FROM candidats c WHERE ${w} ORDER BY c.updated_at DESC, c.id DESC LIMIT ${perPage} OFFSET ${(pg - 1) * perPage}`,
    ...params,
  );
  return page(c, { title: "Demandes d'emploi", active: 'demandes' }, (
    <>
      <section class="page-header"><div class="container">
        <h1 class="fw-bold">Demandes d'emploi</h1>
        <p class="lead mb-0">Les professionnels de santé disponibles. Profils anonymisés pour protéger leur vie privée.</p>
      </div></section>
      <div class="container py-4">
        <form class="card border-0 shadow-sm mb-4" method="get">
          <div class="card-body row g-2 align-items-end">
            <div class="col-md-5"><label class="form-label small">Poste recherché</label><select name="poste" class="form-select"><Options items={POSTES} selected={f.poste} placeholder="Tous les postes" /></select></div>
            <div class="col-md-4"><label class="form-label small">Ville</label><select name="ville" class="form-select"><Options items={GOUVERNORATS} selected={f.ville} placeholder="Toute la Tunisie" /></select></div>
            <div class="col-md-3 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-filter me-1"></i>Filtrer</button></div>
          </div>
        </form>
        {!abonne && (
          <div class="alert alert-info"><i class="fa-solid fa-lock me-1"></i>Les noms et coordonnées sont masqués.{' '}
            {rec ? <a href="/recruteur/abonnement">Activez votre abonnement</a> : <a href="/recruteur/login">Connectez-vous en tant qu'établissement abonné</a>} pour consulter les CV complets.
          </div>
        )}
        <p class="text-muted">{total} candidat(s)</p>
        <div class="table-responsive card border-0 shadow-sm">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr><th>ID</th><th>Poste recherché</th><th>Expérience</th><th>Ville</th><th>Salaire souhaité</th><th>Disponibilité</th><th></th></tr></thead>
            <tbody>
              {rows.map((rw) => (
                <tr>
                  <td><span class="badge text-bg-secondary">{refCandidat(rw.id)}</span></td>
                  <td>{rw.poste_recherche}</td>
                  <td>{Math.round((rw.exp_mois / 12) * 10) / 10} an(s)</td>
                  <td>{rw.ville || '—'}</td>
                  <td>{money(rw.salaire_souhaite)}</td>
                  <td>{rw.disponibilite || '—'}</td>
                  <td class="text-end">{abonne
                    ? <a class="btn btn-sm btn-outline-primary" href={`/recruteur/cv/${rw.id}`}><i class="fa-solid fa-eye me-1"></i>CV complet</a>
                    : <span class="text-muted small"><i class="fa-solid fa-lock"></i></span>}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colspan={7} class="text-center text-muted py-4">Aucun candidat pour ces critères.</td></tr>}
            </tbody>
          </table>
        </div>
        <div class="mt-3"><Pagination page={pg} pages={pages} query={cleanQuery(f)} /></div>
      </div>
    </>
  ));
});

/* ---------- Photos de profil (stockées en D1) ---------- */
r.get('/photo/:cle{[a-f0-9]{24}}', async (c) => {
  const p = await one<Row>(c.env.DB, 'SELECT mime, data FROM photos WHERE cle = ?', c.req.param('cle'));
  if (!p) return c.notFound();
  const data = p.data instanceof ArrayBuffer ? new Uint8Array(p.data) : new Uint8Array(p.data as number[]);
  return new Response(data, {
    headers: { 'Content-Type': p.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
});

export default r;
