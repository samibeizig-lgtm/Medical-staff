import { Hono } from 'hono';
import type { AppEnv, Row } from '../types';
import { all, one, val, TODAY } from '../lib/db';
import { page } from '../views/layout';
import { CarteArticle } from './blog';
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
  const [stats, dernieres, articles] = await Promise.all([
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
    all<Row>(db, 'SELECT id, slug, titre, categorie, resume, image, photo, lecture, created_at FROM articles WHERE publie = 1 ORDER BY created_at DESC, id DESC LIMIT 3').catch(() => [] as Row[]),
  ]);
  const prix = formatNombre(Number(c.env.ABONNEMENT_PRIX));
  const temoignages = [
    { nom: 'Amira B.', role: 'Sage-femme, Sfax', texte: "J'ai trouvé un poste dans une maternité à Sfax trois semaines après mon inscription. Le test de personnalité m'a vraiment démarquée." },
    { nom: 'Dr. Karim M.', role: 'Directeur, Clinique Les Oliviers', texte: 'Les suggestions IA nous font gagner un temps précieux : nous recevons directement les profils les plus pertinents pour chaque offre.' },
    { nom: 'Youssef T.', role: 'Technicien anesthésiste, Sousse', texte: 'Une plateforme claire, spécialisée, et des recruteurs sérieux. Les entretiens se planifient en un clic.' },
  ];
  const atouts = [
    { icon: 'fa-file-medical', titre: 'CV structuré santé', texte: 'Diplômes, services, gestes maîtrisés : un CV pensé pour les métiers médicaux et paramédicaux.' },
    { icon: 'fa-list-check', titre: 'Compétences validées par QCM', texte: 'Chaque compétence affichée est prouvée par un sans-faute chronométré.' },
    { icon: 'fa-brain', titre: 'Test de personnalité', texte: 'Un Big Five adapté au milieu médical pour révéler votre savoir-être.' },
    { icon: 'fa-microphone-lines', titre: 'Entretien IA', texte: 'Un entretien oral guidé qui évalue votre communication, à passer quand vous voulez.' },
    { icon: 'fa-location-crosshairs', titre: 'Matching intelligent', texte: 'Compétences, diplôme, expérience et proximité : les meilleurs profils remontent en premier.' },
    { icon: 'fa-calendar-check', titre: 'Entretiens planifiés', texte: 'Un calendrier intégré pour proposer et confirmer les rendez-vous en un clic.' },
  ];
  return page(c, { title: 'Accueil', active: 'home' }, (
    <>
      <section class="hero" aria-label="Recherche d'emploi dans la santé">
        <div class="container">
          <div class="row align-items-center g-4 g-lg-5">
            <div class="col-lg-7 col-xl-6">
              <span class="eyebrow eyebrow-clair mb-3"><i class="fa-solid fa-heart-pulse" aria-hidden="true"></i>N°1 du recrutement paramédical en Tunisie</span>
              <h1 class="hero-titre text-white">Les talents de la santé rencontrent les <span class="surligne">établissements</span> qui les recherchent</h1>
              <p class="lead mt-3">Infirmiers, sages-femmes, techniciens, kinésithérapeutes… Trouvez votre prochain poste ou recrutez les meilleurs profils en quelques clics.</p>
              <form class="hero-search mt-4" action="/offres" role="search">
                <label class="hero-champ"><i class="fa-solid fa-user-nurse" aria-hidden="true"></i><span class="visually-hidden">Poste</span>
                  <select name="poste" class="form-select"><Options items={POSTES} placeholder="Quel poste ?" /></select></label>
                <label class="hero-champ"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span class="visually-hidden">Ville</span>
                  <select name="ville" class="form-select"><Options items={GOUVERNORATS} placeholder="Où ?" /></select></label>
                <button class="btn btn-primary btn-lg"><i class="fa-solid fa-magnifying-glass me-2" aria-hidden="true"></i>Rechercher</button>
              </form>
              <ul class="hero-confiance list-unstyled mt-4 mb-0">
                <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i>Inscription gratuite pour les candidats</li>
                <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i>24 gouvernorats couverts</li>
                <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i>Compétences vérifiées</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section class="container stats-bar" aria-label="Chiffres clés">
        <div class="stats-grille">
          <div class="stat"><i class="fa-solid fa-briefcase-medical" aria-hidden="true"></i><div><strong data-count={stats?.offres ?? 0}>{stats?.offres ?? 0}</strong><span>offres actives</span></div></div>
          <div class="stat"><i class="fa-solid fa-user-nurse" aria-hidden="true"></i><div><strong data-count={stats?.candidats ?? 0}>{stats?.candidats ?? 0}</strong><span>professionnels inscrits</span></div></div>
          <div class="stat"><i class="fa-solid fa-hospital" aria-hidden="true"></i><div><strong data-count={stats?.recruteurs ?? 0}>{stats?.recruteurs ?? 0}</strong><span>établissements</span></div></div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-entete text-center mx-auto">
            <span class="eyebrow">Comment ça marche ?</span>
            <h2 class="section-title">Deux parcours, un même objectif : le bon soignant au bon poste</h2>
          </div>
          <div class="row g-4">
            <div class="col-lg-6">
              <div class="parcours parcours-candidat h-100">
                <div class="parcours-icone"><i class="fa-solid fa-user-nurse" aria-hidden="true"></i></div>
                <h3>Vous êtes candidat</h3>
                <ol class="etapes">
                  <li><strong>Créez votre compte</strong> gratuitement en 1 minute.</li>
                  <li><strong>Déposez votre CV</strong> : diplômes, expériences, compétences, langues.</li>
                  <li><strong>Passez le test de personnalité</strong> pour mettre en valeur votre profil.</li>
                  <li><strong>Postulez</strong> aux offres et gérez vos entretiens depuis votre espace.</li>
                </ol>
                <a href="/candidat/register" class="btn btn-primary btn-lg">Je crée mon CV <i class="fa-solid fa-arrow-right ms-1" aria-hidden="true"></i></a>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="parcours parcours-etablissement h-100">
                <div class="parcours-icone"><i class="fa-solid fa-hospital" aria-hidden="true"></i></div>
                <h3>Vous êtes un établissement</h3>
                <ol class="etapes">
                  <li><strong>Inscrivez votre établissement</strong> et son responsable.</li>
                  <li><strong>Activez votre abonnement</strong> annuel ({prix} TND).</li>
                  <li><strong>Publiez vos offres</strong> et explorez la CVthèque.</li>
                  <li><strong>Laissez l'IA vous suggérer</strong> les meilleurs profils et planifiez vos entretiens.</li>
                </ol>
                <a href="/recruteur/register" class="btn btn-light btn-lg">Je recrute <i class="fa-solid fa-arrow-right ms-1" aria-hidden="true"></i></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section bg-soft">
        <div class="container">
          <div class="row g-4 g-lg-5 align-items-end mb-4">
            <div class="col-lg-6">
              <span class="eyebrow">Une plateforme pensée pour la santé</span>
              <h2 class="section-title mb-0">Tout ce qu'il faut pour recruter vite et bien</h2>
            </div>
            <div class="col-lg-6">
              <p class="text-muted mb-0">medicalstaff.tn met en relation les professionnels de santé avec les cliniques, hôpitaux, cabinets, laboratoires et centres spécialisés partout en Tunisie. Notre plateforme combine CV structuré, test de personnalité, matching intelligent et planification d'entretiens pour accélérer chaque recrutement.</p>
            </div>
          </div>
          <div class="row g-3 g-lg-4">
            {atouts.map((a) => (
              <div class="col-sm-6 col-lg-4">
                <div class="card atout h-100"><div class="card-body">
                  <div class="icon-circle mb-3"><i class={`fa-solid ${a.icon}`} aria-hidden="true"></i></div>
                  <h3 class="h6 mb-2">{a.titre}</h3>
                  <p class="small text-muted mb-0">{a.texte}</p>
                </div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-entete">
            <span class="eyebrow">Explorer par profil</span>
            <h2 class="section-title">Les métiers les plus recherchés</h2>
          </div>
          <div class="row g-3 g-lg-4">
            {RUBRIQUES.map((rb) => (
              <div class="col-md-4">
                <a class="rubrique card h-100 text-decoration-none" href={`/offres?${rb.q}`}>
                  <div class="card-body">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                      <div class="icon-circle"><i class={`fa-solid ${rb.icon}`} aria-hidden="true"></i></div>
                      <span class="rubrique-fleche" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></span>
                    </div>
                    <h3 class="h5 mb-1 text-dark">{rb.titre}</h3>
                    <p class="mb-0 text-muted small">{rb.texte}</p>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {dernieres.length > 0 && (
        <section class="section pt-0">
          <div class="container">
            <div class="section-entete d-flex flex-wrap justify-content-between align-items-end gap-2">
              <div><span class="eyebrow">Recrutements en cours</span><h2 class="section-title mb-0">Dernières offres</h2></div>
              <a class="lien-fleche" href="/offres">Toutes les offres <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
            </div>
            <div class="row g-3 g-lg-4">
              {dernieres.map((o) => (
                <div class="col-md-4">
                  <a class="card h-100 offer-card offre-mini text-decoration-none" href={`/offres#offre-${o.id}`}><div class="card-body">
                    <span class="badge bg-primary-subtle text-primary mb-3">{o.type_contrat}</span>
                    <h3 class="h6 text-dark mb-2">{o.titre}</h3>
                    <p class="text-muted small mb-1"><i class="fa-solid fa-hospital me-2" aria-hidden="true"></i>{o.nom_etablissement}</p>
                    <p class="text-muted small mb-3"><i class="fa-solid fa-location-dot me-2" aria-hidden="true"></i>{o.ville}</p>
                    <p class="small mb-0 text-body">{excerpt(o.description, 110)}</p>
                  </div></a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {articles.length > 0 && (
        <section class="section bg-soft">
          <div class="container">
            <div class="section-entete d-flex flex-wrap justify-content-between align-items-end gap-2">
              <div><span class="eyebrow">Le blog</span><h2 class="section-title mb-0">Conseils et actualités</h2></div>
              <a class="lien-fleche" href="/blog">Tous les articles <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
            </div>
            <div class="row g-4">{articles.map((x) => <div class="col-md-4"><CarteArticle a={x} /></div>)}</div>
          </div>
        </section>
      )}

      <section class="section">
        <div class="container">
          <div class="section-entete text-center mx-auto">
            <span class="eyebrow">Témoignages</span>
            <h2 class="section-title">Ils nous font confiance</h2>
          </div>
          <div class="row g-4">
            {temoignages.map((t) => (
              <div class="col-md-4">
                <figure class="card h-100 testimonial m-0"><div class="card-body">
                  <div class="etoiles mb-3" aria-label="5 étoiles sur 5">{[1, 2, 3, 4, 5].map(() => <i class="fa-solid fa-star" aria-hidden="true"></i>)}</div>
                  <blockquote class="mb-0"><p>« {t.texte} »</p></blockquote>
                  <figcaption class="d-flex align-items-center gap-3 mt-4">
                    <div class="avatar-initials" aria-hidden="true">{t.nom.replace(/^Dr\.\s*/, '').slice(0, 1)}</div>
                    <div><strong>{t.nom}</strong><br /><small class="text-muted">{t.role}</small></div>
                  </figcaption>
                </div></figure>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section class="container pb-2">
        <div class="cta-final">
          <div>
            <h2 class="h3 text-white mb-2">Prêt(e) à donner un nouvel élan à votre carrière ?</h2>
            <p class="mb-0">Créez votre profil en une minute ou publiez votre première offre dès aujourd'hui.</p>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <a href="/candidat/register" class="btn btn-light btn-lg">Créer mon compte</a>
            <a href="/recruteur/register" class="btn btn-outline-light btn-lg">Inscrire mon établissement</a>
          </div>
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
          <p class="fs-5 text-muted">Le système de santé tunisien repose sur des milliers de professionnels paramédicaux engagés. Pourtant, trouver le bon poste ou le bon profil reste souvent long et opaque. medicalstaff.tn est né pour changer cela : une plateforme spécialisée, moderne et équitable, au service des soignants comme des établissements.</p>
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
