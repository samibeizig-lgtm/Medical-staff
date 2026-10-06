import { Hono } from 'hono';
import { raw } from 'hono/html';
import type { AppEnv, Row } from '../types';
import { all, NOW, one, run, TODAY, val } from '../lib/db';
import { field, flash, loginUser, origin, q, readForm, redirect, requireRole, type Ctx } from '../lib/http';
import { createUser, loginPage, validatePassword } from '../lib/auth';
import { abonnementActif, candidatFull, candidatsFull, currentRecruteur, dernierEntretienIa, peutVoirCv, scoresCommunication, SQL_EXP_MOIS } from '../lib/models';
import { CRITERES, CRITERE_KEYS } from '../lib/entretien-ia';
import { BadgeCommunication, ResultatEntretienIa } from '../views/entretien-ia';
import { DIPLOMES, DISPONIBILITES, GOUVERNORATS, LANGUES, NIVEAUX_LANGUE, POSTES, TYPES_CONTRAT, TYPES_ETABLISSEMENT, inList } from '../lib/data';
import { competencesList, esc, formatNombre, intOrNull, isEmail, money, refCandidat, salaireRange } from '../lib/format';
import { addDays, addYears, dateFr, dateLongue, fmtDateTime, isValidDate, parseLocal, plageHoraire, today, tunis } from '../lib/dates';
import { sendMail } from '../lib/mail';
import { CRITERES_MATCHING, matchScore } from '../lib/matching';
import { distanceKm, libelleDistance, RAYONS } from '../lib/proximite';
import { CATALOGUE, NOMS_CATALOGUE, competenceDuCatalogue } from '../lib/qcm';
import { ACTIVITE, SCORES_COMM, TRIS, clausesRecherche, filtresActifs, lireFiltres } from '../lib/cvtheque';

/** Catalogue groupé par famille : [clé, libellé, compétences] */
const FAMILLES_CATALOGUE: [string, string, string[]][] = [];
for (const x of CATALOGUE) {
  const f = FAMILLES_CATALOGUE.find((g) => g[0] === x.famille);
  if (f) f[2].push(x.nom); else FAMILLES_CATALOGUE.push([x.famille, x.label, [x.nom]]);
}
import { DIMENSIONS, DIM_KEYS } from '../lib/personality';
import { randomHex } from '../lib/crypto';
import { cleanQuery } from '../lib/offres';
import { page } from '../views/layout';
import { AuthCard, Csrf, CvSections, Empty, Errors, Jauges, Kpi, Langues, Options, Pagination, StatutEntretien, photoUrl } from '../views/ui';

const r = new Hono<AppEnv>();

/* ---------- Connexion / inscription ---------- */
r.on(['GET', 'POST'], '/login', (c) =>
  loginPage(c, {
    type: 'recruteur', title: 'Espace établissement', icon: 'fa-hospital', iconClass: 'icon-teal', btnClass: 'btn-teal', dashboard: '/recruteur/dashboard',
    links: (
      <>
        <p class="text-center small mt-3 mb-0">Nouvel établissement ? <a href="/recruteur/register">S'inscrire</a></p>
        <p class="text-center small mt-1 mb-0"><a href="/candidat/login">Vous êtes candidat ?</a></p>
      </>
    ),
  }),
);

r.on(['GET', 'POST'], '/register', async (c) => {
  if (c.get('user')?.type === 'recruteur') return redirect(c, '/recruteur/dashboard');
  const keys = ['nom_etablissement', 'type_etablissement', 'matricule_fiscal', 'adresse', 'ville', 'telephone', 'contact_nom', 'contact_prenom', 'contact_fonction', 'email'] as const;
  const d: Record<string, string> = Object.fromEntries(keys.map((k) => [k, '']));
  const errors: string[] = [];
  if (c.req.method === 'POST') {
    for (const k of keys) d[k] = await field(c, k, k === 'adresse' ? 255 : 190);
    d.email = d.email.toLowerCase();
    const p = await field(c, 'password', 200);
    if (!d.nom_etablissement) errors.push("Le nom de l'établissement est obligatoire.");
    if (!inList(TYPES_ETABLISSEMENT, d.type_etablissement)) errors.push("Type d'établissement invalide.");
    if (!inList(GOUVERNORATS, d.ville)) errors.push('Veuillez choisir un gouvernorat.');
    if (!d.contact_nom || !d.contact_prenom) errors.push('Le nom et le prénom du responsable sont obligatoires.');
    if (!isEmail(d.email)) errors.push('Adresse email invalide.');
    errors.push(...validatePassword(p, await field(c, 'password2', 200)));
    if (!errors.length && (await val(c.env.DB, 'SELECT 1 FROM utilisateurs WHERE email = ?', d.email))) errors.push('Un compte existe déjà avec cet email.');
    if (!errors.length) {
      const uid = await createUser(c, d.email, p, 'recruteur');
      await run(c.env.DB,
        `INSERT INTO recruteurs (utilisateur_id, nom_etablissement, type_etablissement, matricule_fiscal, adresse, ville, telephone, contact_nom, contact_prenom, contact_fonction)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        uid, d.nom_etablissement, d.type_etablissement, d.matricule_fiscal || null, d.adresse || null, d.ville, d.telephone || null, d.contact_nom, d.contact_prenom, d.contact_fonction || null);
      await loginUser(c, uid);
      sendMail(c, d.email, 'Bienvenue sur medicalstaff.tn', `<p>Bonjour ${esc(d.contact_prenom)},</p><p>L'établissement <strong>${esc(d.nom_etablissement)}</strong> est maintenant inscrit. Activez votre abonnement pour publier des offres et accéder à la CVthèque.</p>`);
      flash(c, 'success', 'Établissement inscrit ! Activez votre abonnement pour commencer à recruter.');
      return redirect(c, '/recruteur/abonnement');
    }
  }
  const inp = (k: string, label: string, col: string, extra: Record<string, unknown> = {}) => (
    <div class={col}><label class="form-label" for={k}>{label}</label><input id={k} name={k} class="form-control" value={d[k]} {...extra} /></div>
  );
  return page(c, { title: 'Inscription établissement' }, (
    <AuthCard icon="fa-hospital" iconClass="icon-teal" title="Inscrire mon établissement" width="col-lg-8">
      <Errors errors={errors} />
      <form method="post">
        <Csrf token={c.get('csrf')} />
        <h2 class="h6 text-uppercase text-muted mb-3">Établissement</h2>
        <div class="row g-3 mb-4">
          {inp('nom_etablissement', "Nom de l'établissement *", 'col-md-7', { required: true })}
          <div class="col-md-5"><label class="form-label" for="type">Type *</label><select id="type" name="type_etablissement" class="form-select" required><Options items={TYPES_ETABLISSEMENT} selected={d.type_etablissement} placeholder="Choisir…" /></select></div>
          {inp('adresse', 'Adresse', 'col-md-6')}
          <div class="col-md-3"><label class="form-label" for="ville">Gouvernorat *</label><select id="ville" name="ville" class="form-select" required><Options items={GOUVERNORATS} selected={d.ville} placeholder="Choisir…" /></select></div>
          {inp('telephone', 'Téléphone', 'col-md-3')}
          {inp('matricule_fiscal', 'Matricule fiscal', 'col-md-6')}
        </div>
        <h2 class="h6 text-uppercase text-muted mb-3">Responsable du recrutement</h2>
        <div class="row g-3 mb-4">
          {inp('contact_nom', 'Nom *', 'col-md-4', { required: true })}
          {inp('contact_prenom', 'Prénom *', 'col-md-4', { required: true })}
          {inp('contact_fonction', 'Fonction', 'col-md-4', { placeholder: 'DRH, Directeur…' })}
        </div>
        <h2 class="h6 text-uppercase text-muted mb-3">Identifiants</h2>
        <div class="row g-3 mb-4">
          {inp('email', 'Email professionnel *', 'col-md-12', { type: 'email', required: true, autocomplete: 'username' })}
          <div class="col-md-6"><label class="form-label" for="p1">Mot de passe *</label><input type="password" id="p1" name="password" class="form-control" minlength={8} required autocomplete="new-password" /></div>
          <div class="col-md-6"><label class="form-label" for="p2">Confirmation *</label><input type="password" id="p2" name="password2" class="form-control" required autocomplete="new-password" /></div>
        </div>
        <button class="btn btn-teal w-100 btn-lg">Créer le compte établissement</button>
      </form>
      <p class="text-center small mt-3 mb-0">Déjà inscrit ? <a href="/recruteur/login">Se connecter</a></p>
    </AuthCard>
  ));
});

/* ---------- Espace protégé ---------- */
r.use('*', async (c, next) => {
  const p = new URL(c.req.url).pathname;
  if (p.endsWith('/login') || p.endsWith('/register')) return next();
  return requireRole('recruteur')(c, next);
});

async function me(c: Ctx): Promise<Row> {
  const rec = await currentRecruteur(c.env.DB, c.get('user')!.id);
  if (!rec) throw new Error('Profil établissement introuvable');
  return rec;
}

/** Redirige vers l'abonnement si besoin ; retourne null si l'accès est accordé */
async function needAbonnement(c: Ctx, rec: Row) {
  if (await abonnementActif(c.env.DB, rec.id)) return null;
  flash(c, 'warning', "Cette fonctionnalité est réservée aux établissements disposant d'un abonnement actif.");
  return redirect(c, '/recruteur/abonnement');
}

const prixAbo = (c: Ctx) => Number(c.env.ABONNEMENT_PRIX) || 1000;

r.get('/', (c) => redirect(c, '/recruteur/dashboard'));

/* ---------- Tableau de bord ---------- */
r.get('/dashboard', async (c) => {
  const db = c.env.DB;
  const rec = await me(c);
  const [abo, k, offres, prochains] = await Promise.all([
    abonnementActif(db, rec.id),
    one<Row>(db, `SELECT (SELECT COUNT(*) FROM offres WHERE recruteur_id = ?1 AND active = 1) AS offres,
                         (SELECT COUNT(*) FROM candidatures ca JOIN offres o ON o.id = ca.offre_id WHERE o.recruteur_id = ?1) AS cand,
                         (SELECT COUNT(*) FROM entretiens WHERE recruteur_id = ?1 AND date_debut >= ${NOW}) AS ent,
                         (SELECT COUNT(*) FROM candidats WHERE poste_recherche IS NOT NULL AND poste_recherche <> '') AS cv`, rec.id),
    all<Row>(db, 'SELECT o.*, (SELECT COUNT(*) FROM candidatures ca WHERE ca.offre_id = o.id) AS nb FROM offres o WHERE o.recruteur_id = ? ORDER BY o.created_at DESC, o.id DESC LIMIT 5', rec.id),
    all<Row>(db, `SELECT e.*, c.nom, c.prenom, o.titre FROM entretiens e JOIN candidats c ON c.id = e.candidat_id LEFT JOIN offres o ON o.id = e.offre_id
                  WHERE e.recruteur_id = ? AND e.date_debut >= ${NOW} ORDER BY e.date_debut LIMIT 5`, rec.id),
  ]);
  return page(c, { title: 'Tableau de bord établissement' }, (
    <div class="container py-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 class="h3 mb-0">{rec.nom_etablissement}</h1>
          <p class="text-muted mb-0">{rec.type_etablissement} · {rec.ville} · Responsable : {rec.contact_prenom} {rec.contact_nom}</p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <a href="/recruteur/offres" class="btn btn-outline-primary"><i class="fa-solid fa-briefcase me-1"></i>Gérer mes offres</a>
          <a href="/recruteur/offre" class="btn btn-primary"><i class="fa-solid fa-plus me-1"></i>Nouvelle offre</a>
          <a href="/recruteur/entretiens" class="btn btn-outline-primary"><i class="fa-solid fa-calendar-days me-1"></i>Mes entretiens</a>
        </div>
      </div>
      <div class={`card border-0 shadow-sm mb-4 subscription-card ${abo ? 'active' : 'inactive'}`}>
        <div class="card-body d-flex flex-wrap align-items-center gap-3">
          <i class={`fa-solid fa-${abo ? 'crown' : 'circle-exclamation'} fa-2x`}></i>
          <div class="flex-grow-1">
            {abo ? (
              <><strong>Abonnement annuel actif</strong><br /><small>Valable jusqu'au {dateFr(abo.date_fin)} · Réf. {abo.reference_paiement}</small></>
            ) : (
              <><strong>Aucun abonnement actif</strong><br /><small>Souscrivez l'abonnement annuel ({formatNombre(prixAbo(c))} TND) pour publier des offres et accéder à la CVthèque.</small></>
            )}
          </div>
          <a href="/recruteur/abonnement" class={`btn ${abo ? 'btn-outline-light' : 'btn-warning'}`}>{abo ? 'Détails' : "S'abonner maintenant"}</a>
        </div>
      </div>
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3"><Kpi icon="fa-briefcase" value={k!.offres} label="offres actives" /></div>
        <div class="col-6 col-md-3"><Kpi icon="fa-inbox" value={k!.cand} label="candidatures reçues" /></div>
        <div class="col-6 col-md-3"><Kpi icon="fa-calendar" value={k!.ent} label="entretiens à venir" /></div>
        <div class="col-6 col-md-3"><Kpi icon="fa-address-book" value={k!.cv} label="CV dans la CVthèque" /></div>
      </div>
      <div class="row g-4">
        <div class="col-lg-7">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
              <h2 class="h5 mb-0"><i class="fa-solid fa-briefcase text-primary me-2"></i>Mes offres d'emploi</h2>
              <a href="/recruteur/offres" class="small">Tout voir</a>
            </div>
            <ul class="list-group list-group-flush">
              {offres.map((o) => (
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <div><strong>{o.titre}</strong> {!o.active && <span class="badge text-bg-secondary">Désactivée</span>}<br /><small class="text-muted">{o.type_contrat} · {o.ville}</small></div>
                  <div class="d-flex gap-1">
                    <a class="btn btn-sm btn-outline-primary" href={`/recruteur/candidatures?offre=${o.id}`}>{o.nb} candidature(s)</a>
                    <a class="btn btn-sm btn-outline-secondary" href={`/recruteur/suggestions/${o.id}`} title="Suggestions IA">🧠</a>
                  </div>
                </li>
              ))}
              {!offres.length && <li class="list-group-item text-muted small">Aucune offre publiée. <a href="/recruteur/offre">Créer ma première offre</a></li>}
            </ul>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="card border-0 shadow-sm mb-4"><div class="card-body">
            <h2 class="h5"><i class="fa-solid fa-address-book text-primary me-2"></i>CVthèque</h2>
            <p class="small text-muted">Recherchez parmi {k!.cv} professionnels de santé par poste, diplôme, expérience, salaire et ville.</p>
            <a href="/recruteur/cvtheque" class="btn btn-primary btn-sm"><i class="fa-solid fa-magnifying-glass me-1"></i>Explorer la CVthèque</a>
          </div></div>
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white"><h2 class="h5 mb-0"><i class="fa-solid fa-calendar-days text-primary me-2"></i>Prochains entretiens</h2></div>
            <ul class="list-group list-group-flush small">
              {prochains.map((p) => (
                <li class="list-group-item d-flex justify-content-between">
                  <span><strong>{p.prenom} {p.nom}</strong><br />{p.titre ?? ''}</span>
                  <span class="text-end">{dateFr(p.date_debut)}<br />{plageHoraire(p.date_debut, p.date_fin)} <StatutEntretien s={p.statut} /></span>
                </li>
              ))}
              {!prochains.length && <li class="list-group-item text-muted">Aucun entretien planifié.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  ));
});

/* ---------- Abonnement (paiement simulé) ---------- */
r.on(['GET', 'POST'], '/abonnement', async (c) => {
  const db = c.env.DB;
  const rec = await me(c);
  const prix = prixAbo(c);
  if (c.req.method === 'POST') {
    // Paiement simulé : validation basique des champs (aucune donnée bancaire n'est stockée)
    const num = (await field(c, 'carte', 30)).replace(/\D/g, '');
    if (num.length < 12 || !/^\d{2}\/\d{2}$/.test(await field(c, 'expiration', 5)) || !/^\d{3,4}$/.test(await field(c, 'cvv', 4))) {
      flash(c, 'danger', 'Informations de paiement invalides (simulation).');
      return redirect(c, '/recruteur/abonnement');
    }
    const current = await abonnementActif(db, rec.id);
    const debut = current ? addDays(current.date_fin, 1) : today();
    const fin = addDays(addYears(debut, 1), -1);
    const ref = `MS-${today().replace(/-/g, '')}-${randomHex(3).toUpperCase()}`;
    await run(db, 'INSERT INTO abonnements (recruteur_id, montant, date_debut, date_fin, statut, reference_paiement) VALUES (?,?,?,?,?,?)', rec.id, prix, debut, fin, 'actif', ref);
    sendMail(c, c.get('user')!.email, 'Confirmation de votre abonnement medicalstaff.tn',
      `<p>Bonjour,</p><p>Votre abonnement annuel (${prix} TND) est actif du ${dateFr(debut)} au ${dateFr(fin)}.</p><p>Référence de paiement : <strong>${esc(ref)}</strong></p>`);
    flash(c, 'success', `Paiement accepté ! Votre abonnement est actif jusqu'au ${dateFr(fin)}.`);
    return redirect(c, '/recruteur/dashboard');
  }
  const [abo, historique] = await Promise.all([
    abonnementActif(db, rec.id),
    all<Row>(db, 'SELECT * FROM abonnements WHERE recruteur_id = ? ORDER BY created_at DESC, id DESC', rec.id),
  ]);
  const t = today();
  return page(c, { title: 'Abonnement' }, (
    <div class="container py-4">
      <h1 class="h3 mb-4"><i class="fa-solid fa-credit-card text-primary me-2"></i>Abonnement</h1>
      <div class="row g-4">
        <div class="col-lg-5">
          <div class="card border-0 shadow pricing-card"><div class="card-body p-4 text-center">
            <span class="badge bg-warning text-dark mb-2">Annuel</span>
            <h2 class="display-5 fw-bold">{formatNombre(prix)} <small class="fs-5">TND / an</small></h2>
            <ul class="list-unstyled text-start my-4 check-list">
              <li><i class="fa-solid fa-circle-check"></i>Publication illimitée d'offres d'emploi</li>
              <li><i class="fa-solid fa-circle-check"></i>Accès complet à la CVthèque</li>
              <li><i class="fa-solid fa-circle-check"></i>Suggestions de profils par IA 🧠</li>
              <li><i class="fa-solid fa-circle-check"></i>Calendrier d'entretiens et notifications</li>
              <li><i class="fa-solid fa-circle-check"></i>CV imprimables et téléchargeables en PDF</li>
            </ul>
            {abo && <div class="alert alert-success mb-0"><i class="fa-solid fa-crown me-1"></i>Actif jusqu'au <strong>{dateFr(abo.date_fin)}</strong>. Vous pouvez renouveler par anticipation ci-contre.</div>}
          </div></div>
        </div>
        <div class="col-lg-7">
          <div class="card border-0 shadow-sm"><div class="card-body p-4">
            <h2 class="h5">{abo ? 'Renouveler mon abonnement' : 'Souscrire'}</h2>
            <div class="alert alert-info small"><i class="fa-solid fa-flask me-1"></i>Mode démonstration : le paiement est <strong>simulé</strong>. Utilisez par exemple la carte 4242 4242 4242 4242, 12/30, CVV 123. Aucune donnée bancaire n'est enregistrée.</div>
            <form method="post" autocomplete="off">
              <Csrf token={c.get('csrf')} />
              <div class="mb-3"><label class="form-label" for="tit">Titulaire de la carte</label><input class="form-control" id="tit" name="titulaire" value={`${rec.contact_prenom} ${rec.contact_nom}`} required /></div>
              <div class="mb-3"><label class="form-label" for="carte">Numéro de carte</label><input class="form-control" id="carte" name="carte" inputmode="numeric" placeholder="4242 4242 4242 4242" required /></div>
              <div class="row g-3 mb-4">
                <div class="col-6"><label class="form-label" for="exp">Expiration (MM/AA)</label><input class="form-control" id="exp" name="expiration" placeholder="12/30" required /></div>
                <div class="col-6"><label class="form-label" for="cvv">CVV</label><input class="form-control" id="cvv" name="cvv" inputmode="numeric" placeholder="123" required /></div>
              </div>
              <button class="btn btn-success btn-lg w-100"><i class="fa-solid fa-lock me-1"></i>Payer {formatNombre(prix)} TND</button>
            </form>
          </div></div>
          {historique.length > 0 && (
            <div class="card border-0 shadow-sm mt-4"><div class="card-body">
              <h2 class="h6">Historique</h2>
              <table class="table table-sm small mb-0">
                <thead><tr><th>Référence</th><th>Période</th><th>Montant</th><th>Statut</th></tr></thead>
                <tbody>
                  {historique.map((h) => (
                    <tr><td>{h.reference_paiement}</td><td>{dateFr(h.date_debut)} → {dateFr(h.date_fin)}</td><td>{money(h.montant)}</td>
                      <td>{h.statut === 'annule' ? <span class="badge bg-danger">Annulé</span> : h.date_fin >= t ? <span class="badge bg-success">Actif</span> : <span class="badge bg-secondary">Expiré</span>}</td></tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          )}
        </div>
      </div>
    </div>
  ));
});

/* ---------- Mes offres ---------- */
r.on(['GET', 'POST'], '/offres', async (c) => {
  const db = c.env.DB;
  const rec = await me(c);
  if (c.req.method === 'POST') {
    const id = Number(await field(c, 'offre_id', 12)) || 0;
    const o = await one<Row>(db, 'SELECT id, active FROM offres WHERE id = ? AND recruteur_id = ?', id, rec.id);
    if (o) {
      if (!o.active && !(await abonnementActif(db, rec.id))) {
        flash(c, 'warning', 'Un abonnement actif est nécessaire pour réactiver une offre.');
      } else {
        await run(db, `UPDATE offres SET active = 1 - active, updated_at = ${NOW} WHERE id = ?`, id);
        flash(c, 'success', o.active ? 'Offre désactivée.' : 'Offre réactivée.');
      }
    }
    return redirect(c, '/recruteur/offres');
  }
  const offres = await all<Row>(db, 'SELECT o.*, (SELECT COUNT(*) FROM candidatures ca WHERE ca.offre_id = o.id) AS nb FROM offres o WHERE o.recruteur_id = ? ORDER BY o.active DESC, o.created_at DESC, o.id DESC', rec.id);
  const t = today();
  const csrf = c.get('csrf');
  return page(c, { title: 'Mes offres' }, (
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h1 class="h3 mb-0"><i class="fa-solid fa-briefcase text-primary me-2"></i>Mes offres d'emploi</h1>
        <a href="/recruteur/offre" class="btn btn-primary"><i class="fa-solid fa-plus me-1"></i>Nouvelle offre</a>
      </div>
      <div class="card border-0 shadow-sm table-responsive">
        <table class="table align-middle mb-0">
          <thead class="table-light"><tr><th>Poste</th><th>Contrat</th><th>Lieu</th><th>Date limite</th><th>Candidatures</th><th>Statut</th><th class="text-end">Actions</th></tr></thead>
          <tbody>
            {offres.map((o) => (
              <tr class={o.active ? '' : 'text-muted'}>
                <td><strong>{o.titre}</strong><br /><small class="text-muted">Publiée le {dateFr(o.created_at)}</small></td>
                <td>{o.type_contrat}</td>
                <td>{o.ville}</td>
                <td>{dateFr(o.date_limite)}{o.date_limite && o.date_limite < t && <> <span class="badge text-bg-warning">Expirée</span></>}</td>
                <td><a href={`/recruteur/candidatures?offre=${o.id}`} class="badge rounded-pill text-bg-primary text-decoration-none fs-6">{o.nb}</a></td>
                <td>{o.active ? <span class="badge bg-success">Active</span> : <span class="badge bg-secondary">Désactivée</span>}</td>
                <td class="text-end text-nowrap">
                  <a class="btn btn-sm btn-outline-secondary" title="Suggestions IA" href={`/recruteur/suggestions/${o.id}`}>🧠</a>{' '}
                  <a class="btn btn-sm btn-outline-primary" title="Candidatures" aria-label="Candidatures" href={`/recruteur/candidatures?offre=${o.id}`}><i class="fa-solid fa-users"></i></a>{' '}
                  <a class="btn btn-sm btn-outline-primary" title="Modifier" aria-label="Modifier" href={`/recruteur/offre/${o.id}`}><i class="fa-solid fa-pen"></i></a>{' '}
                  <form method="post" class="d-inline">
                    <Csrf token={csrf} /><input type="hidden" name="offre_id" value={o.id} />
                    <button class={`btn btn-sm ${o.active ? 'btn-outline-danger' : 'btn-outline-success'}`} title={o.active ? 'Désactiver' : 'Réactiver'} aria-label={o.active ? 'Désactiver' : 'Réactiver'}><i class="fa-solid fa-power-off"></i></button>
                  </form>
                </td>
              </tr>
            ))}
            {!offres.length && <tr><td colspan={7} class="text-center text-muted py-5">Aucune offre. <a href="/recruteur/offre">Publiez votre première offre</a>.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  ));
});

/* ---------- Création / modification d'offre ---------- */
async function offreForm(c: Ctx) {
  const db = c.env.DB;
  const rec = await me(c);
  const block = await needAbonnement(c, rec);
  if (block) return block;
  const id = Number(c.req.param('id') ?? 0) || 0;
  let o: Row | null = id ? await one<Row>(db, 'SELECT * FROM offres WHERE id = ? AND recruteur_id = ?', id, rec.id) : null;
  if (id && !o) return c.notFound();
  o ??= { titre: '', type_contrat: 'CDI', description: '', ville: rec.ville, salaire_min: '', salaire_max: '', diplome_requis: '', experience_min: 0, date_limite: '', competences_requises: '' };
  const errors: string[] = [];
  if (c.req.method === 'POST') {
    const d = {
      titre: await field(c, 'titre', 150),
      type_contrat: await field(c, 'type_contrat', 30),
      description: await field(c, 'description', 5000),
      ville: await field(c, 'ville', 60),
      salaire_min: intOrNull(await field(c, 'salaire_min', 10)),
      salaire_max: intOrNull(await field(c, 'salaire_max', 10)),
      diplome_requis: await field(c, 'diplome_requis', 150),
      experience_min: Math.min(40, intOrNull(await field(c, 'experience_min', 3)) ?? 0),
      date_limite: await field(c, 'date_limite', 10),
      // Uniquement des compétences du catalogue (vérifiables par QCM côté candidat)
      competences_requises: [...new Set((await readForm(c)).getAll('competences').map((x) => competenceDuCatalogue(String(x))).filter(Boolean))].slice(0, 15).join(', '),
    };
    if (!inList(POSTES, d.titre)) errors.push('Veuillez choisir un titre de poste.');
    if (!inList(TYPES_CONTRAT, d.type_contrat)) errors.push('Type de contrat invalide.');
    if (!inList(GOUVERNORATS, d.ville)) errors.push('Veuillez choisir un lieu.');
    if (d.description.length < 20) errors.push('La description doit contenir au moins 20 caractères.');
    if (d.salaire_min && d.salaire_max && d.salaire_min > d.salaire_max) errors.push('Le salaire minimum doit être inférieur au salaire maximum.');
    const dl = isValidDate(d.date_limite) ? d.date_limite : null;
    if (dl && dl < today()) errors.push('La date limite doit être dans le futur.');
    if (!errors.length) {
      const params = [d.titre, d.type_contrat, d.description, d.ville, d.salaire_min, d.salaire_max, d.diplome_requis || null, d.experience_min, dl, d.competences_requises || null];
      if (id) {
        await run(db, `UPDATE offres SET titre=?, type_contrat=?, description=?, ville=?, salaire_min=?, salaire_max=?, diplome_requis=?, experience_min=?, date_limite=?, competences_requises=?, updated_at=${NOW} WHERE id=? AND recruteur_id=?`, ...params, id, rec.id);
        flash(c, 'success', 'Offre mise à jour.');
      } else {
        await run(db, 'INSERT INTO offres (titre, type_contrat, description, ville, salaire_min, salaire_max, diplome_requis, experience_min, date_limite, competences_requises, recruteur_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)', ...params, rec.id);
        flash(c, 'success', 'Offre publiée ! Consultez les suggestions IA pour trouver rapidement des candidats.');
      }
      return redirect(c, '/recruteur/offres');
    }
    o = { ...o, ...d };
  }
  const choisies = new Set(competencesList(o.competences_requises).map((x) => competenceDuCatalogue(x)).filter(Boolean));
  const horsCatalogue = competencesList(o.competences_requises).filter((x) => !competenceDuCatalogue(x));
  return page(c, { title: id ? "Modifier l'offre" : 'Nouvelle offre' }, (
    <div class="container py-4"><div class="row justify-content-center"><div class="col-lg-9">
      <h1 class="h3 mb-3">{id ? "Modifier l'offre" : 'Publier une nouvelle offre'}</h1>
      <Errors errors={errors} />
      <form method="post" class="card border-0 shadow-sm">
        <div class="card-body p-4">
          <Csrf token={c.get('csrf')} />
          <div class="row g-3">
            <div class="col-md-8"><label class="form-label" for="titre">Titre du poste *</label><select id="titre" name="titre" class="form-select" required><Options items={POSTES} selected={o.titre} placeholder="Choisir un métier…" /></select></div>
            <div class="col-md-4"><label class="form-label" for="tc">Type de contrat *</label><select id="tc" name="type_contrat" class="form-select"><Options items={TYPES_CONTRAT} selected={o.type_contrat} /></select></div>
            <div class="col-12"><label class="form-label" for="desc">Description du poste *</label><textarea id="desc" name="description" rows={6} class="form-control" required placeholder="Missions, service, horaires, avantages…">{o.description}</textarea></div>
            <div class="col-md-4"><label class="form-label" for="ville">Lieu (gouvernorat) *</label><select id="ville" name="ville" class="form-select"><Options items={GOUVERNORATS} selected={o.ville} placeholder="Choisir…" /></select></div>
            <div class="col-md-4"><label class="form-label" for="smin">Salaire min. (TND/mois)</label><input type="number" min="0" step="50" id="smin" name="salaire_min" class="form-control" value={o.salaire_min ?? ''} /></div>
            <div class="col-md-4"><label class="form-label" for="smax">Salaire max. (TND/mois)</label><input type="number" min="0" step="50" id="smax" name="salaire_max" class="form-control" value={o.salaire_max ?? ''} /></div>
            <div class="col-md-6"><label class="form-label" for="dip">Diplôme requis</label><input id="dip" name="diplome_requis" list="dl-diplomes" class="form-control" value={o.diplome_requis ?? ''} /><datalist id="dl-diplomes"><Options items={DIPLOMES} /></datalist></div>
            <div class="col-md-3"><label class="form-label" for="exp">Expérience min. (ans)</label><input type="number" min="0" max="40" id="exp" name="experience_min" class="form-control" value={o.experience_min ?? 0} /></div>
            <div class="col-md-3"><label class="form-label" for="dl">Date limite</label><input type="date" id="dl" name="date_limite" class="form-control" value={o.date_limite ?? ''} min={today()} /></div>
            <div class="col-12">
              <label class="form-label">Compétences requises <small class="text-muted fw-normal">(15 au maximum)</small></label>
              <div class="form-text mt-0 mb-2">Les candidats ne peuvent pas déclarer leurs compétences : elles sont <strong>validées par des QCM chronométrés</strong>. Choisissez celles qui comptent pour ce poste (45 % du score de matching IA).</div>
              {horsCatalogue.length > 0 && <div class="alert alert-warning small py-2">Anciennes compétences saisies librement, non vérifiables et retirées à l'enregistrement : {horsCatalogue.join(', ')}.</div>}
              <div class="comp-catalogue">
                {FAMILLES_CATALOGUE.map(([fam, label, noms]) => (
                  <details open={fam === 'tronc' || noms.some((n) => choisies.has(n))}>
                    <summary>{label} {noms.some((n) => choisies.has(n)) && <span class="badge text-bg-primary ms-1">{noms.filter((n) => choisies.has(n)).length}</span>}</summary>
                    <div class="row row-cols-1 row-cols-md-2 g-1 pt-1 pb-2">
                      {noms.map((n) => (
                        <div class="col"><div class="form-check">
                          <input class="form-check-input" type="checkbox" name="competences" value={n} id={`comp-${fam}-${noms.indexOf(n)}`} checked={choisies.has(n)} />
                          <label class="form-check-label small" for={`comp-${fam}-${noms.indexOf(n)}`}>{n}</label>
                        </div></div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div class="card-footer bg-white text-end p-3">
          <a href="/recruteur/offres" class="btn btn-light">Annuler</a>{' '}
          <button class="btn btn-primary"><i class="fa-solid fa-floppy-disk me-1"></i>{id ? 'Enregistrer' : "Publier l'offre"}</button>
        </div>
      </form>
    </div></div></div>
  ));
}
r.on(['GET', 'POST'], '/offre', offreForm);
r.on(['GET', 'POST'], '/offre/:id{[0-9]+}', offreForm);

/* ---------- CVthèque ---------- */
r.get('/cvtheque', async (c) => {
  const db = c.env.DB;
  const rec = await me(c);
  const abo = await abonnementActif(db, rec.id);
  const f = lireFiltres((k) => q(c, k, 100));
  // Distance calculée depuis la ville choisie, sinon depuis celle de l'établissement
  const centre = f.ville || (inList(GOUVERNORATS, rec.ville) ? rec.ville : '');
  const { where: w, params, order, orderParams } = clausesRecherche(f, centre);
  const perPage = 12;
  const total = (await val<number>(db, `SELECT COUNT(*) FROM candidats c WHERE ${w}`, ...params)) ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pg = Math.min(Math.max(1, Number(q(c, 'page')) || 1), pages);
  const rows = await all<Row>(db,
    `SELECT c.id, c.nom, c.prenom, c.photo, c.poste_recherche, c.ville, c.salaire_souhaite, c.disponibilite, c.updated_at, ${SQL_EXP_MOIS} AS exp_mois,
            (SELECT 1 FROM tests_personnalite t WHERE t.candidat_id = c.id) AS has_test,
            (SELECT COUNT(*) FROM competences k WHERE k.candidat_id = c.id) AS nb_comp,
            (SELECT e.score_global FROM entretiens_ia e WHERE e.candidat_id = c.id AND e.statut = 'termine' ORDER BY e.id DESC LIMIT 1) AS comm,
            (SELECT group_concat(l.langue, ', ') FROM langues l WHERE l.candidat_id = c.id) AS langues
     FROM candidats c WHERE ${w} ORDER BY ${order} LIMIT ${perPage} OFFSET ${(pg - 1) * perPage}`, ...params, ...orderParams);
  const dips = new Map<number, Row[]>();
  if (rows.length) {
    const ids = rows.map((x) => x.id);
    for (const d of await all<Row>(db, `SELECT candidat_id, intitule, date_obtention FROM diplomes WHERE candidat_id IN (${ids.map(() => '?').join(',')}) ORDER BY date_obtention DESC`, ...ids)) {
      (dips.get(d.candidat_id) ?? dips.set(d.candidat_id, []).get(d.candidat_id)!).push(d);
    }
  }
  const actifs = filtresActifs(f);
  const query = cleanQuery({ ...f, tri: f.tri === 'recent' ? '' : f.tri });
  const sans = (keys: string[]) => '?' + new URLSearchParams(Object.entries(query).filter(([k]) => !keys.includes(k) && k !== 'page')).toString();
  const avance = !!(f.competence || f.diplome || f.annee_diplome || f.langue || f.salaire_max || f.comm_min || f.test || f.mot || f.actif || f.experience_max !== null);
  const km = (cd: Row) => distanceKm(centre, cd.ville);
  return page(c, { title: 'CVthèque' }, (
    <div class="container py-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 class="h3 mb-0"><i class="fa-solid fa-address-book text-primary me-2"></i>CVthèque</h1>
        <span class="text-muted small">Recherche multicritère parmi les professionnels de santé inscrits</span>
      </div>
      {!abo && <div class="alert alert-warning"><i class="fa-solid fa-lock me-1"></i>L'accès au détail des CV est réservé aux abonnés. <a href="/recruteur/abonnement" class="alert-link">Activer mon abonnement</a></div>}
      <form class="card border-0 shadow-sm mb-3 recherche-cv" method="get">
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-md-6 col-lg-3"><label class="form-label small" for="f-poste">Poste</label><select id="f-poste" name="poste" class="form-select"><Options items={POSTES} selected={f.poste} placeholder="Tous les postes" /></select></div>
            <div class="col-6 col-md-3 col-lg-2"><label class="form-label small" for="f-ville">Ville</label><select id="f-ville" name="ville" class="form-select"><Options items={GOUVERNORATS} selected={f.ville} placeholder="Toutes" /></select></div>
            <div class="col-6 col-md-3 col-lg-2"><label class="form-label small" for="f-rayon">Distance max.</label><select id="f-rayon" name="rayon" class="form-select">
              <option value="">Toute distance</option>
              {RAYONS.map((x) => <option value={x} selected={f.rayon === x}>{x} km</option>)}
            </select></div>
            <div class="col-6 col-md-4 col-lg-2"><label class="form-label small" for="f-dispo">Disponible au plus tard</label><select id="f-dispo" name="dispo" class="form-select"><Options items={DISPONIBILITES} selected={f.dispo} placeholder="Peu importe" /></select></div>
            <div class="col-6 col-md-4 col-lg-1"><label class="form-label small" for="f-emin">Exp. min.</label><input id="f-emin" type="number" min="0" max="50" name="experience_min" class="form-control" placeholder="ans" value={f.experience_min ?? ''} /></div>
            <div class="col-md-4 col-lg-2 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-magnifying-glass me-1"></i>Rechercher</button></div>
          </div>
          <details class="mt-3 criteres-avances" open={avance}>
            <summary><i class="fa-solid fa-sliders me-1"></i>Plus de critères</summary>
            <div class="row g-2 align-items-end pt-2">
              <div class="col-6 col-md-3 col-lg-2"><label class="form-label small" for="f-emax">Exp. max. (ans)</label><input id="f-emax" type="number" min="0" max="50" name="experience_max" class="form-control" value={f.experience_max ?? ''} /></div>
              <div class="col-md-6 col-lg-4"><label class="form-label small" for="f-comp">Compétence validée par QCM</label><select id="f-comp" name="competence" class="form-select"><Options items={NOMS_CATALOGUE} selected={f.competence} placeholder="Toutes" /></select></div>
              <div class="col-md-6 col-lg-4"><label class="form-label small" for="f-dip">Diplôme</label><select id="f-dip" name="diplome" class="form-select"><Options items={DIPLOMES} selected={f.diplome} placeholder="Tous" /></select></div>
              <div class="col-6 col-md-3 col-lg-2"><label class="form-label small" for="f-annee">Diplômé(e) depuis</label><input id="f-annee" type="number" name="annee_diplome" min="1970" max={tunis().getUTCFullYear()} class="form-control" placeholder="ex. 2020" value={f.annee_diplome ?? ''} /></div>
              <div class="col-6 col-md-3 col-lg-2"><label class="form-label small" for="f-langue">Langue</label><select id="f-langue" name="langue" class="form-select"><Options items={LANGUES} selected={f.langue} placeholder="Toutes" /></select></div>
              <div class="col-6 col-md-3 col-lg-2"><label class="form-label small" for="f-niveau">Niveau minimum</label><select id="f-niveau" name="niveau" class="form-select"><Options items={NIVEAUX_LANGUE} selected={f.niveau} placeholder="Tous" /></select></div>
              <div class="col-6 col-md-3 col-lg-2"><label class="form-label small" for="f-sal">Salaire max. (TND)</label><input id="f-sal" type="number" min="0" step="50" name="salaire_max" class="form-control" value={f.salaire_max ?? ''} /></div>
              <div class="col-6 col-md-3 col-lg-2"><label class="form-label small" for="f-comm">Communication (IA)</label><select id="f-comm" name="comm_min" class="form-select">
                <option value="">Peu importe</option>
                {SCORES_COMM.map((x) => <option value={x} selected={f.comm_min === x}>{x}/100 et plus</option>)}
              </select></div>
              <div class="col-6 col-md-3 col-lg-2"><label class="form-label small" for="f-actif">Profil mis à jour</label><select id="f-actif" name="actif" class="form-select"><Options items={ACTIVITE} selected={f.actif} placeholder="Peu importe" /></select></div>
              <div class="col-md-6 col-lg-4"><label class="form-label small" for="f-mot">Mot-clé (service, établissement…)</label><input id="f-mot" name="mot" maxlength={60} class="form-control" placeholder="ex. réanimation, bloc, CHU" value={f.mot} /></div>
              <div class="col-md-6 col-lg-3"><div class="form-check mb-2"><input class="form-check-input" type="checkbox" name="test" value="1" id="f-test" checked={!!f.test} /><label class="form-check-label small" for="f-test">Test de personnalité passé</label></div></div>
            </div>
          </details>
          <input type="hidden" name="tri" value={f.tri === 'recent' ? '' : f.tri} />
          {(f.rayon || f.tri === 'distance') && centre && <p class="small text-muted mt-2 mb-0">Distances à vol d'oiseau depuis {centre}{f.ville ? '' : ' (votre établissement)'}.</p>}
        </div>
      </form>
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <strong>{total} profil(s)</strong>
        {actifs.map(([label, keys]) => (
          <a class="badge rounded-pill filtre-actif text-decoration-none" href={sans(keys as string[])} title="Retirer ce critère">{label} <i class="fa-solid fa-xmark ms-1"></i></a>
        ))}
        {actifs.length > 1 && <a class="small" href="/recruteur/cvtheque">Tout effacer</a>}
        <form method="get" class="ms-auto d-flex align-items-center gap-2">
          {Object.entries(query).filter(([k]) => k !== 'tri' && k !== 'page').map(([k, v]) => <input type="hidden" name={k} value={v} />)}
          <label class="small text-muted text-nowrap" for="f-tri">Trier par</label>
          <select id="f-tri" name="tri" class="form-select form-select-sm" data-autosubmit><Options items={TRIS} selected={f.tri} /></select>
          <noscript><button class="btn btn-sm btn-outline-primary">OK</button></noscript>
        </form>
      </div>
      <div class="row g-3">
        {rows.map((cd) => (
          <div class="col-md-6 col-xl-4">
            <div class="card border-0 shadow-sm h-100 cv-card">
              <div class="card-body">
                <div class="d-flex gap-3 align-items-center mb-2">
                  {abo ? <img src={photoUrl(cd.photo)} class="avatar-sm" alt="" /> : <div class="avatar-initials"><i class="fa-solid fa-user"></i></div>}
                  <div><strong>{abo ? `${cd.prenom} ${cd.nom}` : refCandidat(cd.id)}</strong><div class="small text-primary">{cd.poste_recherche}</div></div>
                  <span class="ms-auto d-flex gap-1">
                    {cd.comm !== null && <BadgeCommunication score={cd.comm} />}
                    {cd.has_test && <span class="badge bg-info-subtle text-info" title="Test de personnalité passé"><i class="fa-solid fa-brain"></i></span>}
                  </span>
                </div>
                <ul class="list-unstyled small mb-2">
                  <li><i class="fa-solid fa-briefcase me-2 text-muted"></i>Expérience : <strong>{Math.round((cd.exp_mois / 12) * 10) / 10} an(s)</strong></li>
                  <li><i class="fa-solid fa-clock me-2 text-muted"></i>Disponibilité : <strong>{cd.disponibilite || '—'}</strong></li>
                  <li><i class="fa-solid fa-location-dot me-2 text-muted"></i>{cd.ville || '—'}{centre && km(cd) !== null && <span class="text-muted"> · {km(cd) === 0 ? (f.ville ? 'même gouvernorat' : 'votre gouvernorat') : `≈ ${km(cd)} km${f.ville ? '' : ' de vous'}`}</span>}</li>
                  <li><i class="fa-solid fa-money-bill-wave me-2 text-muted"></i>Salaire souhaité : {money(cd.salaire_souhaite)}</li>
                  {cd.langues && <li><i class="fa-solid fa-language me-2 text-muted"></i>{cd.langues}</li>}
                  <li><i class="fa-solid fa-circle-check me-2 text-success"></i>{cd.nb_comp} compétence(s) validée(s) par QCM</li>
                </ul>
                <div class="small">
                  {(dips.get(cd.id) ?? []).slice(0, 2).map((d) => (
                    <div><i class="fa-solid fa-graduation-cap me-1 text-muted"></i>{d.intitule} {d.date_obtention ? `(${d.date_obtention.slice(0, 4)})` : ''}</div>
                  ))}
                </div>
              </div>
              <div class="card-footer bg-white border-0 pt-0">
                {abo ? (
                  <>
                    <a href={`/recruteur/cv/${cd.id}`} class="btn btn-sm btn-outline-primary"><i class="fa-solid fa-eye me-1"></i>Voir le CV</a>{' '}
                    <a href={`/recruteur/cv/${cd.id}/pdf`} class="btn btn-sm btn-outline-secondary" target="_blank"><i class="fa-solid fa-file-pdf me-1"></i>PDF</a>{' '}
                    <a href={`/recruteur/entretien?candidat=${cd.id}`} class="btn btn-sm btn-outline-success"><i class="fa-solid fa-calendar-plus me-1"></i>Entretien</a>
                  </>
                ) : <button class="btn btn-sm btn-outline-secondary" disabled><i class="fa-solid fa-lock me-1"></i>Abonnement requis</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {!rows.length && <Empty icon="fa-solid fa-user-slash">Aucun profil ne correspond à ces critères. {actifs.length > 0 && <a href={sans([actifs[actifs.length - 1][1]].flat() as string[])}>Retirer le dernier critère</a>}</Empty>}
      <div class="mt-3"><Pagination page={pg} pages={pages} query={query} /></div>
    </div>
  ));
});

/* ---------- Candidatures ---------- */
r.get('/candidatures', async (c) => {
  const db = c.env.DB;
  const rec = await me(c);
  const offreId = Number(q(c, 'offre')) || 0;
  const offres = await all<Row>(db, 'SELECT o.id, o.titre, o.ville, o.active, (SELECT COUNT(*) FROM candidatures ca WHERE ca.offre_id = o.id) AS nb FROM offres o WHERE o.recruteur_id = ? ORDER BY o.created_at DESC, o.id DESC', rec.id);
  const offre = offreId ? await one<Row>(db, 'SELECT * FROM offres WHERE id = ? AND recruteur_id = ?', offreId, rec.id) : null;
  let cands: Row[] = [];
  if (offre) {
    cands = await all<Row>(db,
      `SELECT ca.created_at AS postule_le, c.*, ${SQL_EXP_MOIS} AS exp_mois,
              (SELECT e.id FROM entretiens e WHERE e.candidat_id = c.id AND e.offre_id = ca.offre_id ORDER BY e.id DESC LIMIT 1) AS entretien_id,
              (SELECT e.statut FROM entretiens e WHERE e.candidat_id = c.id AND e.offre_id = ca.offre_id ORDER BY e.id DESC LIMIT 1) AS entretien_statut
       FROM candidatures ca JOIN candidats c ON c.id = ca.candidat_id WHERE ca.offre_id = ? ORDER BY ca.created_at DESC`, offreId);
    c.executionCtx.waitUntil(run(db, "UPDATE candidatures SET statut = 'vue' WHERE offre_id = ? AND statut = 'envoyee'", offreId).then(() => undefined));
  }
  const comm = await scoresCommunication(db, cands.map((x) => x.id));
  return page(c, { title: 'Candidatures' }, (
    <div class="container py-4">
      <h1 class="h3 mb-3"><i class="fa-solid fa-inbox text-primary me-2"></i>Candidatures</h1>
      <div class="row g-4">
        <div class="col-lg-4">
          <div class="list-group shadow-sm">
            {offres.map((o) => (
              <a href={`?offre=${o.id}`} class={`list-group-item list-group-item-action d-flex justify-content-between align-items-center${o.id === offreId ? ' active' : ''}`}>
                <span>{o.titre}<br /><small class={o.id === offreId ? '' : 'text-muted'}>{o.ville}{o.active ? '' : ' · désactivée'}</small></span>
                <span class={`badge rounded-pill ${o.id === offreId ? 'text-bg-light' : 'text-bg-primary'}`}>{o.nb}</span>
              </a>
            ))}
            {!offres.length && <div class="list-group-item text-muted">Aucune offre.</div>}
          </div>
        </div>
        <div class="col-lg-8">
          {!offre ? <Empty icon="fa-solid fa-arrow-left">Sélectionnez une offre pour voir ses candidats.</Empty> : (
            <>
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="h5 mb-0">{offre.titre} <small class="text-muted">({cands.length} candidat(s))</small></h2>
                <a href={`/recruteur/suggestions/${offreId}`} class="btn btn-sm btn-outline-secondary">🧠 Suggestions IA</a>
              </div>
              {cands.map((cd) => (
                <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex flex-wrap align-items-center gap-3">
                  <img src={photoUrl(cd.photo)} class="avatar-sm" alt="" />
                  <div class="flex-grow-1">
                    <strong>{cd.prenom} {cd.nom}</strong> <span class="badge text-bg-light border">{refCandidat(cd.id)}</span> <BadgeCommunication score={comm.get(cd.id)} /><br />
                    <small class="text-muted">{cd.poste_recherche} · {Math.round((cd.exp_mois / 12) * 10) / 10} an(s) d'exp. · {cd.ville || '—'} · postulé le {dateFr(cd.postule_le)}</small>
                    {cd.entretien_statut && <div class="mt-1">Entretien : <StatutEntretien s={cd.entretien_statut} /></div>}
                  </div>
                  <div class="d-flex gap-1">
                    <a class="btn btn-sm btn-outline-primary" href={`/recruteur/cv/${cd.id}?offre=${offreId}`}><i class="fa-solid fa-eye me-1"></i>CV</a>
                    <a class="btn btn-sm btn-outline-secondary" href={`/recruteur/cv/${cd.id}/pdf`} target="_blank" aria-label="PDF"><i class="fa-solid fa-file-pdf"></i></a>
                    {cd.entretien_id
                      ? <a class="btn btn-sm btn-warning" href={`/recruteur/entretien/${cd.entretien_id}`}><i class="fa-solid fa-pen me-1"></i>Modifier entretien</a>
                      : <a class="btn btn-sm btn-success" href={`/recruteur/entretien?candidat=${cd.id}&offre=${offreId}`}><i class="fa-solid fa-calendar-plus me-1"></i>Entretien</a>}
                  </div>
                </div></div>
              ))}
              {!cands.length && <Empty icon="fa-regular fa-envelope-open">Aucune candidature pour cette offre. Essayez les <a href={`/recruteur/suggestions/${offreId}`}>suggestions IA</a>.</Empty>}
            </>
          )}
        </div>
      </div>
    </div>
  ));
});

/* ---------- Détail d'un CV ---------- */
async function cvAccess(c: Ctx): Promise<{ rec: Row; cand: Awaited<ReturnType<typeof candidatFull>> } | Response> {
  const db = c.env.DB;
  const rec = await me(c);
  const id = Number(c.req.param('id')) || 0;
  const cand = await candidatFull(db, id);
  if (!cand) return c.notFound();
  if (!(await peutVoirCv(db, rec.id, id))) {
    flash(c, 'warning', 'Un abonnement actif est nécessaire pour consulter ce CV.');
    return redirect(c, '/recruteur/abonnement');
  }
  await run(db, 'INSERT INTO cv_consultations (recruteur_id, candidat_id) VALUES (?, ?)', rec.id, id);
  return { rec, cand };
}

r.get('/cv/:id{[0-9]+}', async (c) => {
  const res = await cvAccess(c);
  if (res instanceof Response) return res;
  const { rec, cand } = res;
  const ct = cand!;
  const offreId = Number(q(c, 'offre')) || 0;
  const [ent, eia] = await Promise.all([
    one<Row>(c.env.DB, `SELECT id FROM entretiens WHERE recruteur_id = ? AND candidat_id = ? ${offreId ? 'AND offre_id = ?' : ''} ORDER BY id DESC LIMIT 1`,
      ...(offreId ? [rec.id, ct.id, offreId] : [rec.id, ct.id])),
    dernierEntretienIa(c.env.DB, ct.id),
  ]);
  return page(c, { title: `CV – ${ct.prenom} ${ct.nom}` }, (
    <div class="container py-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <a href="/recruteur/cvtheque" class="btn btn-light btn-sm"><i class="fa-solid fa-arrow-left me-1"></i>CVthèque</a>
        <div class="d-flex gap-2">
          <a href={`/recruteur/cv/${ct.id}/pdf`} class="btn btn-outline-secondary" target="_blank"><i class="fa-solid fa-file-pdf me-1"></i>Télécharger en PDF</a>
          {ent
            ? <a href={`/recruteur/entretien/${ent.id}`} class="btn btn-warning"><i class="fa-solid fa-pen me-1"></i>Modifier entretien</a>
            : <a href={`/recruteur/entretien?candidat=${ct.id}${offreId ? `&offre=${offreId}` : ''}`} class="btn btn-success"><i class="fa-solid fa-calendar-plus me-1"></i>Proposer un entretien</a>}
        </div>
      </div>
      <div class="row g-4">
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body text-center p-4">
              <img src={photoUrl(ct.photo)} class="profile-photo mb-3" alt="" />
              <h1 class="h4 mb-0">{ct.prenom} {ct.nom}</h1>
              <p class="text-primary mb-1">{ct.poste_recherche}</p>
              <span class="badge text-bg-secondary">{refCandidat(ct.id)}</span>
            </div>
            <ul class="list-group list-group-flush small">
              {ct.coordonnees_visibles ? (
                <>
                  <li class="list-group-item"><i class="fa-solid fa-envelope me-2 text-muted"></i><a href={`mailto:${ct.email}`}>{ct.email}</a></li>
                  <li class="list-group-item"><i class="fa-solid fa-phone me-2 text-muted"></i>{ct.telephone || '—'}</li>
                  <li class="list-group-item"><i class="fa-solid fa-location-dot me-2 text-muted"></i>{[ct.adresse, ct.ville, ct.pays].filter(Boolean).join(', ')}</li>
                </>
              ) : (
                <>
                  <li class="list-group-item text-muted"><i class="fa-solid fa-eye-slash me-2"></i>Coordonnées masquées par le candidat. Proposez un entretien : il sera notifié par email.</li>
                  <li class="list-group-item"><i class="fa-solid fa-location-dot me-2 text-muted"></i>{ct.ville || '—'}</li>
                </>
              )}
              <li class="list-group-item"><i class="fa-solid fa-cake-candles me-2 text-muted"></i>{ct.date_naissance ? `${dateFr(ct.date_naissance)}${ct.lieu_naissance ? ' à ' + ct.lieu_naissance : ''}` : '—'}</li>
              <li class="list-group-item"><i class="fa-solid fa-briefcase me-2 text-muted"></i>Expérience totale : <strong>{ct.experience_annees} an(s)</strong></li>
              <li class="list-group-item"><i class="fa-solid fa-money-bill-wave me-2 text-muted"></i>Salaire souhaité : {money(ct.salaire_souhaite)}</li>
              <li class="list-group-item"><i class="fa-solid fa-clock me-2 text-muted"></i>Disponibilité : {ct.disponibilite || '—'}</li>
            </ul>
          </div>
          <div class="card border-0 shadow-sm mt-4"><div class="card-body">
            <h2 class="h6"><i class="fa-solid fa-language text-primary me-1"></i>Langues</h2>
            <Langues langues={ct.langues} />
          </div></div>
        </div>
        <div class="col-lg-8">
          <CvSections c={ct} />
          {eia ? <ResultatEntretienIa e={eia} /> : (
            <div class="alert alert-light border small"><i class="fa-solid fa-microphone-slash me-1"></i>Ce candidat n'a pas encore passé l'entretien IA de communication.</div>
          )}
          {ct.test && (
            <div class="card border-0 shadow-sm"><div class="card-body">
              <h2 class="h5"><i class="fa-solid fa-brain text-primary me-2"></i>Profil de personnalité</h2>
              <Jauges test={ct.test} compact />
              <p class="small mt-3 mb-0 fst-italic">{ct.test.portrait}</p>
            </div></div>
          )}
        </div>
      </div>
    </div>
  ));
});

/* ---------- CV imprimable / PDF (Enregistrer en PDF depuis le navigateur) ---------- */
r.get('/cv/:id{[0-9]+}/pdf', async (c) => {
  const res = await cvAccess(c);
  if (res instanceof Response) return res;
  const ct = res.cand!;
  const eia = await dernierEntretienIa(c.env.DB, ct.id);
  const css = `@page{size:A4;margin:14mm 16mm}*{box-sizing:border-box}body{font-family:Poppins,Arial,sans-serif;font-size:11.5px;color:#14212B;margin:0;background:#eef2f7}
.sheet{max-width:210mm;margin:16px auto;background:#fff;padding:18mm 16mm;box-shadow:0 4px 20px rgba(0,0,0,.08)}
.brand{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.brand img{height:34px}.brand span{font-size:9.5px;color:#5B6770;letter-spacing:.12em}
.band{height:4px;background:linear-gradient(90deg,#2BA84A 0 28%,#1F5FAD 28% 72%,#14B8B0 72% 100%);margin-bottom:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.head{display:flex;gap:18px;align-items:center;background:#0E2236;color:#fff;padding:16px;border-radius:8px}
.head img{width:92px;height:92px;border-radius:50%;object-fit:cover;border:3px solid #fff;background:#E6EEF8}
h1{font-size:22px;margin:0}h2{font-size:12.5px;color:#1F5FAD;border-bottom:2px solid #14B8B0;padding-bottom:3px;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.03em}
.muted{color:#6b7280}.item{margin-bottom:8px;break-inside:avoid}.tag{display:inline-block;background:#E6EEF8;color:#1F5FAD;padding:2px 8px;border-radius:9px;margin:0 4px 4px 0}
table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}.bar{background:#e5e7eb;height:8px;border-radius:4px}.bar div{height:8px;border-radius:4px}
.toolbar{max-width:210mm;margin:16px auto 0;display:flex;justify-content:flex-end;gap:8px}.toolbar button{background:#1F5FAD;color:#fff;border:0;padding:10px 18px;border-radius:6px;font:inherit;cursor:pointer}
.foot{margin-top:18px;text-align:center;font-size:9.5px;color:#9ca3af}
@media print{body{background:#fff}.sheet{margin:0;padding:0;box-shadow:none;max-width:none}.toolbar{display:none}.head{-webkit-print-color-adjust:exact;print-color-adjust:exact}.bar div,.tag{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
  const html = (
    <>
      {raw('<!doctype html>')}
      <html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`CV ${ct.prenom} ${ct.nom}`}</title>
        <link href="/assets/vendor/poppins/poppins.css" rel="stylesheet" />
        <style>{raw(css)}</style></head>
      <body>
        <div class="toolbar"><button type="button" id="print">Télécharger / imprimer en PDF</button></div>
        <div class="sheet">
          <div class="brand"><img src="/assets/img/logo-entete.svg" alt="medicalstaff.tn" /><span>CV CONFIDENTIEL</span></div>
          <div class="band"></div>
          <div class="head">
            <img src={photoUrl(ct.photo)} alt="" />
            <div><h1>{ct.prenom} {ct.nom}</h1><div style="font-size:14px">{ct.poste_recherche}</div>
              <div style="font-size:10.5px;margin-top:4px">Réf. {refCandidat(ct.id)} · {ct.experience_annees} an(s) d'expérience</div></div>
          </div>
          <h2>Informations</h2>
          <table>
            {ct.coordonnees_visibles ? (
              <>
                <tr><td style="width:30%" class="muted">Email</td><td>{ct.email}</td></tr>
                <tr><td class="muted">Téléphone</td><td>{ct.telephone || '—'}</td></tr>
                <tr><td class="muted">Adresse</td><td>{[ct.adresse, ct.ville, ct.pays].filter(Boolean).join(', ')}</td></tr>
              </>
            ) : <tr><td style="width:30%" class="muted">Ville</td><td>{ct.ville || '—'} (coordonnées masquées par le candidat)</td></tr>}
            <tr><td class="muted">Naissance</td><td>{ct.date_naissance ? `${dateFr(ct.date_naissance)}${ct.lieu_naissance ? ' à ' + ct.lieu_naissance : ''}` : '—'}</td></tr>
            <tr><td class="muted">Salaire souhaité</td><td>{money(ct.salaire_souhaite)}</td></tr>
            <tr><td class="muted">Disponibilité</td><td>{ct.disponibilite || '—'}</td></tr>
          </table>
          <h2>Diplômes</h2>
          {ct.diplomes.map((d) => <div class="item"><strong>{d.intitule}</strong>{d.mention ? ` – mention ${d.mention}` : ''}<br /><span class="muted">{d.etablissement} · {dateFr(d.date_obtention)}</span></div>)}
          {!ct.diplomes.length && <p class="muted">—</p>}
          <h2>Expériences professionnelles</h2>
          {ct.experiences.map((x) => (
            <div class="item"><strong>{x.poste}</strong> – {x.etablissement}<br /><span class="muted">{dateFr(x.date_debut)} → {x.poste_actuel ? "aujourd'hui" : dateFr(x.date_fin)}</span>
              {x.description && <div style="white-space:pre-line">{x.description}</div>}</div>
          ))}
          {!ct.experiences.length && <p class="muted">—</p>}
          <h2>Compétences validées par QCM</h2>
          <div>{ct.competences.map((k) => <span class="tag">✓ {k.nom}</span>)}{!ct.competences.length && <span class="muted">—</span>}</div>
          <h2>Langues</h2>
          <div>{ct.langues.length ? ct.langues.map((l) => `${l.langue} (${l.niveau})`).join(' · ') : <span class="muted">—</span>}</div>
          {ct.test && (
            <>
              <h2>Profil de personnalité</h2>
              <table>
                {DIM_KEYS.map((k) => (
                  <tr><td style="width:38%">{DIMENSIONS[k].label}</td>
                    <td style="padding:6px"><div class="bar"><div style={`width:${Number(ct.test![k])}%;background:${DIMENSIONS[k].color}`}></div></div></td>
                    <td style="width:50px;text-align:right">{ct.test![k]}/100</td></tr>
                ))}
              </table>
              <p style="font-style:italic;margin-top:8px">{ct.test.portrait}</p>
            </>
          )}
          {eia && (
            <>
              <h2>Communication – entretien IA ({eia.score_global}/100)</h2>
              <table>
                {CRITERE_KEYS.map((k) => (
                  <tr><td style="width:38%">{CRITERES[k].label}</td>
                    <td style="padding:6px"><div class="bar"><div style={`width:${Number(eia[k])}%;background:${CRITERES[k].color}`}></div></div></td>
                    <td style="width:50px;text-align:right">{eia[k]}/100</td></tr>
                ))}
              </table>
              {eia.synthese && <p style="margin-top:8px">{eia.synthese}</p>}
              <p class="muted" style="font-size:9.5px">Entretien passé le {dateFr(eia.termine_le)} · score indicatif fondé uniquement sur le contenu des réponses.</p>
            </>
          )}
          <div class="foot">CV généré par medicalstaff.tn le {dateFr(today())} – document confidentiel</div>
        </div>
        <script>{raw("document.getElementById('print').addEventListener('click',function(){window.print()});")}</script>
      </body></html>
    </>
  );
  return c.html(html);
});

/* ---------- Suggestions IA ---------- */
r.get('/suggestions/:id{[0-9]+}', async (c) => {
  const db = c.env.DB;
  const rec = await me(c);
  const block = await needAbonnement(c, rec);
  if (block) return block;
  const offre = await one<Row>(db, 'SELECT * FROM offres WHERE id = ? AND recruteur_id = ?', Number(c.req.param('id')), rec.id);
  if (!offre) return c.notFound();
  // Seuls les candidats recherchant le même poste que l'offre (200 plus récents au maximum)
  const ids = (await all<Row>(db, 'SELECT id FROM candidats WHERE poste_recherche = ? ORDER BY updated_at DESC LIMIT 200', offre.titre)).map((x) => x.id as number);
  const cands = await candidatsFull(db, ids);
  const scored = cands.map((cd) => ({ cd, s: matchScore(offre, cd) })).sort((a, b) => b.s.total - a.s.total).slice(0, 5);
  const postules = new Set((await all<Row>(db, 'SELECT candidat_id FROM candidatures WHERE offre_id = ?', offre.id)).map((x) => x.candidat_id));
  return page(c, { title: 'Suggestions IA' }, (
    <div class="container py-4">
      <a href="/recruteur/offres" class="btn btn-light btn-sm mb-3"><i class="fa-solid fa-arrow-left me-1"></i>Mes offres</a>
      <div class="ai-header mb-4">
        <h1 class="h3 mb-1">🧠 Suggestions IA</h1>
        <p class="mb-0">Les 5 profils les plus pertinents pour <strong>{offre.titre}</strong> ({offre.ville})</p>
        <small>Score = compétences validées par QCM 45 % · diplôme 20 % · expérience 20 % · proximité 15 % · bonus personnalité et communication jusqu'à 10 %</small>
      </div>
      {!scored.length && <Empty icon="fa-solid fa-robot">Aucun candidat ne recherche actuellement le poste « {offre.titre} ».</Empty>}
      {scored.map(({ cd, s }, rank) => {
        const col = s.total >= 75 ? 'success' : s.total >= 50 ? 'warning' : 'danger';
        return (
          <div class="card border-0 shadow-sm mb-3 suggestion"><div class="card-body"><div class="row align-items-center g-3">
            <div class="col-auto text-center">
              <div class={`score-ring text-${col}`} style={`--p:${s.total}`}><span>{s.total}%</span></div>
              <small class="text-muted">#{rank + 1}</small>
            </div>
            <div class="col-md-4">
              <div class="d-flex align-items-center gap-2">
                <img src={photoUrl(cd.photo)} class="avatar-sm" alt="" />
                <div><strong>{cd.prenom} {cd.nom}</strong>{postules.has(cd.id) && <> <span class="badge bg-info">A postulé</span></>} <BadgeCommunication score={cd.communication} /><br />
                  <small class="text-muted">{cd.experience_annees} an(s) d'exp. · {cd.ville || '—'}{s.distance !== null && <> ({libelleDistance(s.distance)})</>} · {money(cd.salaire_souhaite)}</small></div>
              </div>
              {(s.competences_matchees.length > 0 || s.competences_manquantes.length > 0) && (
                <div class="mt-2">
                  {s.competences_matchees.map((m) => <span class="badge rounded-pill bg-success-subtle text-success me-1 mb-1" title="Validée par QCM"><i class="fa-solid fa-circle-check me-1"></i>{m}</span>)}
                  {s.competences_manquantes.map((m) => <span class="badge rounded-pill bg-light text-muted border me-1 mb-1" title="Non validée par QCM"><i class="fa-regular fa-circle me-1"></i>{m}</span>)}
                </div>
              )}
            </div>
            <div class="col-md">
              {CRITERES_MATCHING.map(([k, label, max]) => (
                <div class="d-flex align-items-center small mb-1">
                  <span style="width:110px">{label}</span>
                  <div class="progress flex-grow-1" style="height:6px"><div class="progress-bar" style={`width:${(s[k] / max) * 100}%`}></div></div>
                  <span class="ms-2 text-muted" style="width:60px">{s[k]}/{max}</span>
                </div>
              ))}
            </div>
            <div class="col-md-auto d-flex flex-md-column gap-1">
              <a class="btn btn-sm btn-outline-primary" href={`/recruteur/cv/${cd.id}?offre=${offre.id}`}><i class="fa-solid fa-eye me-1"></i>CV</a>
              <a class="btn btn-sm btn-success" href={`/recruteur/entretien?candidat=${cd.id}&offre=${offre.id}`}><i class="fa-solid fa-calendar-plus me-1"></i>Entretien</a>
            </div>
          </div></div></div>
        );
      })}
    </div>
  ));
});

/* ---------- Planification d'entretien (FullCalendar) ---------- */
async function entretienForm(c: Ctx) {
  const db = c.env.DB;
  const rec = await me(c);
  const entId = Number(c.req.param('id') ?? 0) || 0;
  const ent = entId ? await one<Row>(db, 'SELECT * FROM entretiens WHERE id = ? AND recruteur_id = ?', entId, rec.id) : null;
  if (entId && !ent) return c.notFound();
  const candId = ent ? ent.candidat_id : Number(q(c, 'candidat') || (c.req.method === 'POST' ? await field(c, 'candidat', 12) : '')) || 0;
  let offreId = ent ? (ent.offre_id ?? 0) : Number(q(c, 'offre')) || 0;
  const cand = await one<Row>(db, 'SELECT c.*, u.email FROM candidats c JOIN utilisateurs u ON u.id = c.utilisateur_id WHERE c.id = ?', candId);
  if (!cand) return c.notFound();
  if (!(await peutVoirCv(db, rec.id, candId))) {
    flash(c, 'warning', 'Un abonnement actif est nécessaire pour proposer un entretien à ce candidat.');
    return redirect(c, '/recruteur/abonnement');
  }
  const mesOffres = await all<Row>(db, 'SELECT id, titre, ville FROM offres WHERE recruteur_id = ? ORDER BY active DESC, created_at DESC', rec.id);
  const errors: string[] = [];
  const defaultContact = `${rec.contact_prenom} ${rec.contact_nom}${rec.telephone ? ' – ' + rec.telephone : ''}`;
  let v = {
    debut: ent?.date_debut?.replace(' ', 'T') ?? '',
    fin: ent?.date_fin?.replace(' ', 'T') ?? '',
    lieu: ent?.lieu ?? [rec.adresse, rec.ville].filter(Boolean).join(', '),
    contact: ent?.contact ?? defaultContact,
  };

  if (c.req.method === 'POST') {
    v = { debut: await field(c, 'date_debut', 19), fin: await field(c, 'date_fin', 19), lieu: await field(c, 'lieu', 255), contact: await field(c, 'contact', 190) };
    offreId = Number(await field(c, 'offre', 12)) || 0;
    const d1 = parseLocal(v.debut), d2 = parseLocal(v.fin);
    if (!d1 || !d2 || d2 <= d1) errors.push('Veuillez sélectionner un créneau dans le calendrier.');
    else if (d1 < tunis()) errors.push('Le créneau doit être dans le futur.');
    else if (d1.getUTCHours() < 8 || new Date(d2.getTime() - 1).getUTCHours() >= 18) errors.push('Le créneau doit être compris entre 8h et 18h.');
    if (!v.lieu) errors.push('Le lieu est obligatoire.');
    if (!v.contact) errors.push('La personne à contacter est obligatoire.');
    if (offreId && !mesOffres.some((o) => o.id === offreId)) offreId = 0;
    if (!errors.length) {
      const s1 = fmtDateTime(d1!), s2 = fmtDateTime(d2!);
      const chevauche = await val(db, `SELECT 1 FROM entretiens WHERE recruteur_id = ? AND statut <> 'refuse' AND id <> ? AND date_debut < ? AND date_fin > ?`, rec.id, entId, s2, s1);
      if (chevauche) errors.push('Ce créneau chevauche un autre entretien déjà planifié.');
      else {
        if (ent) {
          await run(db, `UPDATE entretiens SET date_debut=?, date_fin=?, lieu=?, contact=?, offre_id=?, statut='en_attente', updated_at=${NOW} WHERE id=?`, s1, s2, v.lieu, v.contact, offreId || null, entId);
        } else {
          await run(db, 'INSERT INTO entretiens (recruteur_id, candidat_id, offre_id, date_debut, date_fin, lieu, contact) VALUES (?,?,?,?,?,?,?)', rec.id, candId, offreId || null, s1, s2, v.lieu, v.contact);
        }
        if (offreId) await run(db, "UPDATE candidatures SET statut='entretien' WHERE offre_id=? AND candidat_id=?", offreId, candId);
        const titre = mesOffres.find((o) => o.id === offreId)?.titre;
        sendMail(c, cand.email, `${ent ? 'Modification de votre entretien' : "Proposition d'entretien"} – ${rec.nom_etablissement}`,
          `<p>Bonjour ${esc(cand.prenom)},</p><p><strong>${esc(rec.nom_etablissement)}</strong> ${ent ? 'a modifié' : 'vous propose'} un entretien${titre ? ` pour le poste « ${esc(titre)} »` : ''} :</p><ul>` +
          `<li>Date : <strong>${dateFr(s1)}</strong></li><li>Horaire : <strong>${plageHoraire(s1, s2)}</strong></li><li>Lieu : ${esc(v.lieu)}</li><li>Contact : ${esc(v.contact)}</li></ul>` +
          `<p><a href="${esc(origin(c))}/candidat/entretiens">Valider ou refuser cet entretien depuis votre espace</a></p>`);
        flash(c, 'success', `Entretien ${ent ? 'modifié' : 'planifié'} le ${dateFr(s1)} (${plageHoraire(s1, s2)}). Le candidat a été notifié par email.`);
        return redirect(c, '/recruteur/entretiens');
      }
    }
  }

  // Entretiens existants du recruteur pour le calendrier
  const evs = await all<Row>(db,
    `SELECT e.*, c.prenom, c.nom FROM entretiens e JOIN candidats c ON c.id = e.candidat_id
     WHERE e.recruteur_id = ? AND e.statut <> 'refuse' AND e.date_fin >= datetime('now', '+1 hour', '-30 days')`, rec.id);
  const events = evs.filter((e) => e.id !== entId).map((e) => ({
    title: `${plageHoraire(e.date_debut, e.date_fin)} · ${e.prenom} ${e.nom}`,
    start: e.date_debut.replace(' ', 'T'), end: e.date_fin.replace(' ', 'T'),
    color: e.statut === 'confirme' ? '#1F5FAD' : '#6c757d',
  }));
  const sel = v.debut && v.fin ? { start: v.debut, end: v.fin } : null;
  const json = (x: unknown) => JSON.stringify(x).replace(/</g, '\\u003c');
  const script = `document.addEventListener('DOMContentLoaded', function () {
  var events = ${json(events)}, sel = ${json(sel)};
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var local = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00'; };
  var h = function (d) { return d.getHours() + 'h' + pad(d.getMinutes()); };
  var display = document.getElementById('slot-display'), selEvent = null;
  var cal = new FullCalendar.Calendar(document.getElementById('calendar'), {
    locale: 'fr', initialView: window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek', initialDate: sel ? sel.start : undefined,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' },
    slotMinTime: '08:00:00', slotMaxTime: '18:00:00', slotDuration: '00:30:00', allDaySlot: false,
    hiddenDays: [0], height: 'auto', displayEventTime: false, nowIndicator: true, selectable: true, selectMirror: true,
    businessHours: { daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: '08:00', endTime: '18:00' },
    events: events,
    selectAllow: function (info) { return info.start >= new Date(); },
    dateClick: function (info) { if (info.date < new Date()) return; setSlot(info.date, new Date(info.date.getTime() + 30 * 60000)); },
    select: function (info) { setSlot(info.start, info.end); cal.unselect(); }
  });
  function setSlot(start, end) {
    var label = h(start) + ' - ' + h(end);
    if (selEvent) selEvent.remove();
    selEvent = cal.addEvent({ title: '✔ ' + label, start: start, end: end, color: '#198754', classNames: ['slot-selected'] });
    document.getElementById('date_debut').value = local(start);
    document.getElementById('date_fin').value = local(end);
    display.textContent = start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + label;
    display.classList.add('has-slot');
  }
  cal.render();
  if (sel) setSlot(new Date(sel.start), new Date(sel.end));
  document.getElementById('entretien-form').addEventListener('submit', function (e) {
    if (!document.getElementById('date_debut').value) { e.preventDefault(); alert('Veuillez cliquer sur une case horaire du calendrier.'); }
  });
});`;
  return page(c, {
    title: ent ? "Modifier l'entretien" : 'Planifier un entretien',
    head: <><script src="/assets/vendor/fullcalendar/fullcalendar.min.js"></script><script src="/assets/vendor/fullcalendar/fr.min.js"></script></>,
    scripts: <script>{raw(script)}</script>,
  }, (
    <div class="container py-4">
      <h1 class="h3 mb-1"><i class="fa-solid fa-calendar-plus text-primary me-2"></i>{ent ? "Modifier l'entretien" : 'Planifier un entretien'}</h1>
      <p class="text-muted">Avec <strong>{cand.prenom} {cand.nom}</strong> ({cand.poste_recherche}). Cliquez sur une case horaire pour choisir un créneau de 30 minutes.</p>
      <Errors errors={errors} />
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm"><div class="card-body"><div id="calendar"></div></div></div>
          <div class="small text-muted mt-2">
            <span class="legend" style="background:#198754"></span>Créneau sélectionné
            <span class="legend ms-3" style="background:#1F5FAD"></span>Entretien confirmé
            <span class="legend ms-3" style="background:#6c757d"></span>Entretien en attente
          </div>
        </div>
        <div class="col-lg-4">
          <form method="post" class="card border-0 shadow-sm" id="entretien-form"><div class="card-body">
            <Csrf token={c.get('csrf')} />
            <input type="hidden" name="candidat" value={candId} />
            <input type="hidden" name="date_debut" id="date_debut" value={v.debut} />
            <input type="hidden" name="date_fin" id="date_fin" value={v.fin} />
            <div class="mb-3"><label class="form-label">Créneau</label><div id="slot-display" class={`slot-display${sel ? ' has-slot' : ''}`}>{sel ? `${dateLongue(v.debut)} · ${plageHoraire(v.debut, v.fin)}` : 'Aucun créneau sélectionné'}</div></div>
            <div class="mb-3"><label class="form-label" for="offre">Offre concernée</label>
              <select id="offre" name="offre" class="form-select"><option value="0">— Aucune (CVthèque) —</option>
                {mesOffres.map((o) => <option value={o.id} selected={o.id === offreId}>{o.titre} – {o.ville}</option>)}
              </select></div>
            <div class="mb-3"><label class="form-label" for="lieu">Lieu *</label><input id="lieu" name="lieu" class="form-control" required value={v.lieu} /></div>
            <div class="mb-3"><label class="form-label" for="contact">Personne à contacter *</label><input id="contact" name="contact" class="form-control" required value={v.contact} /></div>
            <button class="btn btn-success w-100"><i class="fa-solid fa-paper-plane me-1"></i>{ent ? 'Enregistrer et notifier' : 'Envoyer la proposition'}</button>
            <p class="small text-muted mt-2 mb-0"><i class="fa-solid fa-envelope me-1"></i>Le candidat recevra un email et pourra valider ou refuser depuis son espace.</p>
          </div></form>
        </div>
      </div>
    </div>
  ));
}
r.on(['GET', 'POST'], '/entretien', entretienForm);
r.on(['GET', 'POST'], '/entretien/:id{[0-9]+}', entretienForm);

/* ---------- Mes entretiens ---------- */
r.get('/entretiens', async (c) => {
  const db = c.env.DB;
  const rec = await me(c);
  const offreId = Number(q(c, 'offre')) || 0;
  const statut = ['en_attente', 'confirme', 'refuse'].includes(q(c, 'statut')) ? q(c, 'statut') : '';
  const where = ['e.recruteur_id = ?'];
  const params: unknown[] = [rec.id];
  if (offreId) { where.push('e.offre_id = ?'); params.push(offreId); }
  if (statut) { where.push('e.statut = ?'); params.push(statut); }
  const [rows, offres] = await Promise.all([
    all<Row>(db, `SELECT e.*, c.nom, c.prenom, c.photo, c.poste_recherche, o.titre FROM entretiens e JOIN candidats c ON c.id = e.candidat_id
                  LEFT JOIN offres o ON o.id = e.offre_id WHERE ${where.join(' AND ')}
                  ORDER BY (e.date_debut >= ${NOW}) DESC, abs(julianday(e.date_debut) - julianday(${NOW}))`, ...params),
    all<Row>(db, 'SELECT id, titre, ville FROM offres WHERE recruteur_id = ? ORDER BY created_at DESC', rec.id),
  ]);
  const now = tunis();
  return page(c, { title: 'Mes entretiens' }, (
    <div class="container py-4">
      <h1 class="h3 mb-3"><i class="fa-solid fa-calendar-days text-primary me-2"></i>Mes entretiens</h1>
      <form class="card border-0 shadow-sm mb-4" method="get">
        <div class="card-body row g-2 align-items-end">
          <div class="col-md-6"><label class="form-label small">Offre</label>
            <select name="offre" class="form-select"><option value="">Toutes les offres</option>
              {offres.map((o) => <option value={o.id} selected={o.id === offreId}>{o.titre} – {o.ville}</option>)}
            </select></div>
          <div class="col-md-4"><label class="form-label small">Statut</label><select name="statut" class="form-select"><Options items={{ en_attente: 'En attente', confirme: 'Confirmé', refuse: 'Refusé' }} selected={statut} placeholder="Tous" /></select></div>
          <div class="col-md-2 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-filter me-1"></i>Filtrer</button></div>
        </div>
      </form>
      <div class="card border-0 shadow-sm table-responsive">
        <table class="table align-middle mb-0">
          <thead class="table-light"><tr><th>Candidat</th><th>Offre</th><th>Date</th><th>Lieu / contact</th><th>Statut</th><th class="text-end">Actions</th></tr></thead>
          <tbody>
            {rows.map((e) => {
              const passe = (parseLocal(e.date_fin) ?? now) < now;
              return (
                <tr class={passe ? 'text-muted' : ''}>
                  <td><div class="d-flex align-items-center gap-2"><img src={photoUrl(e.photo)} class="avatar-xs" alt="" /><div><strong>{e.prenom} {e.nom}</strong><br /><small class="text-muted">{e.poste_recherche}</small></div></div></td>
                  <td>{e.titre || '—'}</td>
                  <td class="text-nowrap">{dateFr(e.date_debut)}<br /><strong>{plageHoraire(e.date_debut, e.date_fin)}</strong></td>
                  <td class="small">{e.lieu}<br /><span class="text-muted">{e.contact}</span></td>
                  <td><StatutEntretien s={e.statut} />{passe && <><br /><small>passé</small></>}</td>
                  <td class="text-end text-nowrap">
                    <a class="btn btn-sm btn-outline-primary" title="CV" aria-label="CV" href={`/recruteur/cv/${e.candidat_id}`}><i class="fa-solid fa-eye"></i></a>{' '}
                    <a class="btn btn-sm btn-outline-secondary" title="PDF" aria-label="PDF" href={`/recruteur/cv/${e.candidat_id}/pdf`} target="_blank"><i class="fa-solid fa-file-pdf"></i></a>{' '}
                    {!passe && <a class="btn btn-sm btn-outline-warning" title="Modifier" aria-label="Modifier" href={`/recruteur/entretien/${e.id}`}><i class="fa-solid fa-pen"></i></a>}
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colspan={6} class="text-center text-muted py-5">Aucun entretien.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  ));
});

export default r;
