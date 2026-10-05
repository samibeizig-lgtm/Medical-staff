import { Hono } from 'hono';
import type { AppEnv, Row } from '../types';
import { all, NOW, one, run, TODAY, val } from '../lib/db';
import { field, flash, q, redirect, requireRole, type Ctx } from '../lib/http';
import { loginPage } from '../lib/auth';
import { abonnementActif } from '../lib/models';
import { esc, formatNombre, intOrNull, money, refCandidat, salaireRange } from '../lib/format';
import { addDays, addYears, dateFr, today, tunis } from '../lib/dates';
import { sendMail } from '../lib/mail';
import { randomHex } from '../lib/crypto';
import { cleanQuery } from '../lib/offres';
import { page } from '../views/layout';
import { Csrf, Kpi, Options, Pagination } from '../views/ui';

const r = new Hono<AppEnv>();

r.on(['GET', 'POST'], '/login', (c) =>
  loginPage(c, { type: 'admin', title: 'Administration', icon: 'fa-user-shield', iconClass: 'icon-dark', btnClass: 'btn-dark', dashboard: '/admin/dashboard' }),
);

r.use('*', async (c, next) => {
  if (new URL(c.req.url).pathname.endsWith('/login')) return next();
  return requireRole('admin')(c, next);
});

async function journal(c: Ctx, action: string) {
  await run(c.env.DB, 'INSERT INTO admin_journal (admin_email, action) VALUES (?, ?)', c.get('user')!.email, action);
}

const NAV: [string, string, string][] = [
  ['dashboard', 'fa-gauge', 'Tableau de bord'],
  ['utilisateurs', 'fa-users', 'Utilisateurs'],
  ['offres', 'fa-briefcase', 'Offres'],
  ['abonnements', 'fa-credit-card', 'Abonnements'],
  ['emails', 'fa-envelope', 'Emails'],
  ['journal', 'fa-clock-rotate-left', 'Journal'],
];

function AdminPage({ active, children }: { active: string; children?: any }) {
  return (
    <div class="container py-4">
      <h1 class="h3 mb-3"><i class="fa-solid fa-user-shield me-2"></i>Administration</h1>
      <ul class="nav nav-pills admin-nav mb-4 flex-nowrap overflow-auto">
        {NAV.map(([k, icon, label]) => (
          <li class="nav-item"><a class={`nav-link text-nowrap${k === active ? ' active' : ''}`} href={`/admin/${k}`}><i class={`fa-solid ${icon} me-1`}></i>{label}</a></li>
        ))}
      </ul>
      {children}
    </div>
  );
}

const label = (u: Row) => (u.type === 'candidat' ? `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() : u.type === 'recruteur' ? u.nom_etablissement ?? '' : 'Administrateur');
const NOMS_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

r.get('/', (c) => redirect(c, '/admin/dashboard'));

/* ---------- Tableau de bord ---------- */
r.get('/dashboard', async (c) => {
  const db = c.env.DB;
  const k = (await one<Row>(db, `SELECT
    (SELECT COUNT(*) FROM candidats) AS candidats,
    (SELECT COUNT(*) FROM candidats c WHERE c.poste_recherche IS NOT NULL AND c.poste_recherche <> '' AND EXISTS (SELECT 1 FROM diplomes d WHERE d.candidat_id = c.id)) AS cv_complets,
    (SELECT COUNT(*) FROM tests_personnalite) AS tests,
    (SELECT COUNT(*) FROM recruteurs) AS recruteurs,
    (SELECT COUNT(DISTINCT recruteur_id) FROM abonnements WHERE statut = 'actif' AND date_fin >= ${TODAY}) AS abonnes,
    (SELECT COUNT(*) FROM offres WHERE active = 1 AND (date_limite IS NULL OR date_limite >= ${TODAY})) AS offres,
    (SELECT COUNT(*) FROM candidatures) AS candidatures,
    (SELECT COUNT(*) FROM entretiens) AS entretiens,
    (SELECT COUNT(*) FROM entretiens WHERE statut = 'confirme') AS confirmes,
    (SELECT COALESCE(SUM(montant), 0) FROM abonnements WHERE statut <> 'annule' AND strftime('%Y', created_at) = strftime('%Y', ${NOW})) AS ca_annee,
    (SELECT COUNT(*) FROM utilisateurs WHERE actif = 0) AS suspendus,
    (SELECT COUNT(*) FROM cv_consultations WHERE consulte_le >= datetime('now', '+1 hour', '-30 days')) AS consultations`))!;

  // Inscriptions des 6 derniers mois
  const now = tunis();
  const mois: { key: string; label: string; candidat: number; recruteur: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    mois.push({ key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, label: `${NOMS_MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, candidat: 0, recruteur: 0 });
  }
  for (const row of await all<Row>(db, `SELECT strftime('%Y-%m', created_at) AS m, type, COUNT(*) AS n FROM utilisateurs WHERE created_at >= ? AND type <> 'admin' GROUP BY m, type`, `${mois[0].key}-01`)) {
    const m = mois.find((x) => x.key === row.m);
    if (m && (row.type === 'candidat' || row.type === 'recruteur')) m[row.type as 'candidat' | 'recruteur'] = row.n;
  }
  const maxCand = Math.max(1, ...mois.map((m) => m.candidat));

  const [postes, derniers] = await Promise.all([
    all<Row>(db, `SELECT p.poste, COALESCE(d.n, 0) AS demandes, COALESCE(o.n, 0) AS offres FROM (
        SELECT poste_recherche AS poste FROM candidats WHERE poste_recherche IS NOT NULL AND poste_recherche <> ''
        UNION SELECT titre FROM offres WHERE active = 1) p
      LEFT JOIN (SELECT poste_recherche, COUNT(*) AS n FROM candidats GROUP BY poste_recherche) d ON d.poste_recherche = p.poste
      LEFT JOIN (SELECT titre, COUNT(*) AS n FROM offres WHERE active = 1 GROUP BY titre) o ON o.titre = p.poste
      ORDER BY (COALESCE(d.n, 0) + COALESCE(o.n, 0)) DESC LIMIT 8`),
    all<Row>(db, `SELECT u.id, u.email, u.type, u.created_at, c.nom, c.prenom, r.nom_etablissement FROM utilisateurs u
      LEFT JOIN candidats c ON c.utilisateur_id = u.id LEFT JOIN recruteurs r ON r.utilisateur_id = u.id
      WHERE u.type <> 'admin' ORDER BY u.created_at DESC, u.id DESC LIMIT 6`),
  ]);
  const taux = k.candidatures ? Math.round((k.entretiens / k.candidatures) * 100) : 0;
  return page(c, { title: 'Administration' }, (
    <AdminPage active="dashboard">
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3"><Kpi icon="fa-user-nurse" value={k.candidats} label={`candidats · ${k.cv_complets} CV complets · ${k.tests} tests`} /></div>
        <div class="col-6 col-lg-3"><Kpi icon="fa-hospital" value={k.recruteurs} label={`établissements · ${k.abonnes} abonnés`} /></div>
        <div class="col-6 col-lg-3"><Kpi icon="fa-briefcase" value={k.offres} label={`offres actives · ${k.candidatures} candidatures`} /></div>
        <div class="col-6 col-lg-3"><Kpi icon="fa-coins" value={`${formatNombre(k.ca_annee)} TND`} label={`abonnements encaissés en ${now.getUTCFullYear()}`} /></div>
        <div class="col-6 col-lg-3"><Kpi icon="fa-calendar-check" value={k.entretiens} label={`entretiens · ${k.confirmes} confirmés`} /></div>
        <div class="col-6 col-lg-3"><Kpi icon="fa-eye" value={k.consultations} label="CV consultés (30 jours)" /></div>
        <div class="col-6 col-lg-3"><Kpi icon="fa-user-lock" value={k.suspendus} label="comptes suspendus" /></div>
        <div class="col-6 col-lg-3"><Kpi icon="fa-percent" value={`${taux} %`} label="candidatures menant à un entretien" /></div>
      </div>
      <div class="row g-4">
        <div class="col-lg-6"><div class="card border-0 shadow-sm h-100"><div class="card-body">
          <h2 class="h6 mb-1">Nouveaux candidats par mois</h2>
          <p class="small text-muted mb-3">6 derniers mois</p>
          <div class="bar-chart" role="img" aria-label="Nouveaux candidats par mois">
            {mois.map((m) => (
              <div class="bar-col" tabindex={0}>
                <span class="bar-tip">{m.label} : {m.candidat} candidat(s), {m.recruteur} établissement(s)</span>
                <div class="bar-track"><div class="bar" style={`height:${Math.round((m.candidat / maxCand) * 100)}%`}></div></div>
                <span class="bar-value">{m.candidat}</span>
                <span class="bar-label">{m.label.split(' ')[0]}</span>
              </div>
            ))}
          </div>
          <details class="mt-3 small">
            <summary class="text-muted">Voir le tableau</summary>
            <table class="table table-sm mt-2 mb-0">
              <thead><tr><th>Mois</th><th class="text-end">Candidats</th><th class="text-end">Établissements</th></tr></thead>
              <tbody>{mois.map((m) => <tr><td>{m.label}</td><td class="text-end">{m.candidat}</td><td class="text-end">{m.recruteur}</td></tr>)}</tbody>
            </table>
          </details>
        </div></div></div>
        <div class="col-lg-6"><div class="card border-0 shadow-sm h-100"><div class="card-body">
          <h2 class="h6 mb-1">Offre et demande par métier</h2>
          <p class="small text-muted mb-3">Candidats qui recherchent le poste / offres actives</p>
          <table class="table table-sm align-middle mb-0 small">
            <thead><tr><th>Métier</th><th class="text-end">Candidats</th><th class="text-end">Offres</th><th class="text-end">Candidats / offre</th></tr></thead>
            <tbody>
              {postes.map((p) => (
                <tr><td>{p.poste}</td><td class="text-end">{p.demandes}</td><td class="text-end">{p.offres}</td>
                  <td class="text-end">{p.offres ? (p.demandes / p.offres).toFixed(1).replace('.', ',') : <span class="text-muted">aucune offre</span>}</td></tr>
              ))}
              {!postes.length && <tr><td colspan={4} class="text-muted">Aucune donnée.</td></tr>}
            </tbody>
          </table>
        </div></div></div>
        <div class="col-12"><div class="card border-0 shadow-sm">
          <div class="card-header bg-white d-flex justify-content-between"><h2 class="h6 mb-0">Dernières inscriptions</h2><a class="small" href="/admin/utilisateurs">Tous les utilisateurs</a></div>
          <ul class="list-group list-group-flush small">
            {derniers.map((d) => (
              <li class="list-group-item d-flex justify-content-between"><span><span class={`badge ${d.type === 'candidat' ? 'bg-primary' : 'bg-teal'} me-2`}>{d.type === 'candidat' ? 'Candidat' : 'Établissement'}</span>{label(d)} <span class="text-muted">· {d.email}</span></span><span class="text-muted">{dateFr(d.created_at)}</span></li>
            ))}
          </ul>
        </div></div>
      </div>
    </AdminPage>
  ));
});

/* ---------- Utilisateurs ---------- */
r.on(['GET', 'POST'], '/utilisateurs', async (c) => {
  const db = c.env.DB;
  if (c.req.method === 'POST') {
    const id = Number(await field(c, 'user_id', 12)) || 0;
    const action = await field(c, 'action', 20);
    const u = await one<Row>(db, 'SELECT id, email, type FROM utilisateurs WHERE id = ?', id);
    if (!u || u.type === 'admin') flash(c, 'danger', 'Action impossible sur ce compte.');
    else if (action === 'suspendre' || action === 'reactiver') {
      const actif = action === 'reactiver' ? 1 : 0;
      const s = [db.prepare('UPDATE utilisateurs SET actif = ? WHERE id = ?').bind(actif, id)];
      if (!actif) {
        s.push(db.prepare('DELETE FROM sessions WHERE utilisateur_id = ?').bind(id)); // déconnexion immédiate
        if (u.type === 'recruteur') s.push(db.prepare('UPDATE offres SET active = 0 WHERE recruteur_id = (SELECT id FROM recruteurs WHERE utilisateur_id = ?)').bind(id));
      }
      await db.batch(s);
      await journal(c, `${actif ? 'Réactivation' : 'Suspension'} du compte ${u.email}`);
      flash(c, 'success', `Compte ${u.email} ${actif ? 'réactivé' : 'suspendu'}.`);
    } else if (action === 'supprimer') {
      await run(db, 'DELETE FROM utilisateurs WHERE id = ?', id); // cascade sur toutes les données liées (CV, photo, offres…)
      await journal(c, `Suppression du compte ${u.email}`);
      flash(c, 'success', `Compte ${u.email} supprimé définitivement.`);
    }
    return c.redirect('/admin/utilisateurs' + new URL(c.req.url).search, 302);
  }
  const f = {
    type: ['candidat', 'recruteur'].includes(q(c, 'type')) ? q(c, 'type') : '',
    statut: ['actif', 'suspendu'].includes(q(c, 'statut')) ? q(c, 'statut') : '',
    q: q(c, 'q', 100),
  };
  const where = ["u.type <> 'admin'"];
  const params: unknown[] = [];
  if (f.type) { where.push('u.type = ?'); params.push(f.type); }
  if (f.statut) { where.push('u.actif = ?'); params.push(f.statut === 'actif' ? 1 : 0); }
  if (f.q) {
    where.push("(u.email LIKE ?1 ESCAPE '\\' OR c.nom LIKE ?1 ESCAPE '\\' OR c.prenom LIKE ?1 ESCAPE '\\' OR r.nom_etablissement LIKE ?1 ESCAPE '\\')".replace(/\?1/g, `?${params.length + 1}`));
    params.push('%' + f.q.replace(/[\\%_]/g, (m) => '\\' + m) + '%');
  }
  const from = 'FROM utilisateurs u LEFT JOIN candidats c ON c.utilisateur_id = u.id LEFT JOIN recruteurs r ON r.utilisateur_id = u.id';
  const w = where.join(' AND ');
  const perPage = 20;
  const total = (await val<number>(db, `SELECT COUNT(*) ${from} WHERE ${w}`, ...params)) ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pg = Math.min(Math.max(1, Number(q(c, 'page')) || 1), pages);
  const rows = await all<Row>(db,
    `SELECT u.*, c.id AS candidat_id, c.nom, c.prenom, c.poste_recherche, r.id AS recruteur_id, r.nom_etablissement, r.ville AS rec_ville,
            (SELECT MAX(a.date_fin) FROM abonnements a WHERE a.recruteur_id = r.id AND a.statut = 'actif') AS abo_fin
     ${from} WHERE ${w} ORDER BY u.created_at DESC, u.id DESC LIMIT ${perPage} OFFSET ${(pg - 1) * perPage}`, ...params);
  const t = today();
  const csrf = c.get('csrf');
  return page(c, { title: 'Utilisateurs' }, (
    <AdminPage active="utilisateurs">
      <form class="card border-0 shadow-sm mb-3" method="get"><div class="card-body row g-2 align-items-end">
        <div class="col-md-5"><label class="form-label small">Recherche</label><input name="q" class="form-control" placeholder="Nom, établissement ou email" value={f.q} /></div>
        <div class="col-md-3"><label class="form-label small">Type</label><select name="type" class="form-select"><Options items={{ candidat: 'Candidats', recruteur: 'Établissements' }} selected={f.type} placeholder="Tous" /></select></div>
        <div class="col-md-2"><label class="form-label small">Statut</label><select name="statut" class="form-select"><Options items={{ actif: 'Actifs', suspendu: 'Suspendus' }} selected={f.statut} placeholder="Tous" /></select></div>
        <div class="col-md-2 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-magnifying-glass me-1"></i>Filtrer</button></div>
      </div></form>
      <p class="text-muted small">{total} utilisateur(s)</p>
      <div class="card border-0 shadow-sm table-responsive">
        <table class="table align-middle mb-0 small">
          <thead class="table-light"><tr><th>Utilisateur</th><th>Type</th><th>Détail</th><th>Inscription</th><th>Dernière connexion</th><th>Statut</th><th class="text-end">Actions</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr class={u.actif ? '' : 'table-secondary'}>
                <td><strong>{label(u)}</strong><br /><span class="text-muted">{u.email}</span></td>
                <td>{u.type === 'candidat' ? <span class="badge bg-primary">Candidat</span> : <span class="badge bg-teal">Établissement</span>}</td>
                <td>{u.type === 'candidat' ? `${u.poste_recherche || 'CV non renseigné'} · ${refCandidat(u.candidat_id)}` : (
                  <>{u.rec_ville} · {u.abo_fin && u.abo_fin >= t ? <span class="text-success">abonné jusqu'au {dateFr(u.abo_fin)}</span> : <span class="text-muted">non abonné</span>}</>
                )}</td>
                <td>{dateFr(u.created_at)}</td>
                <td>{u.derniere_connexion ? dateFr(u.derniere_connexion, true) : '—'}</td>
                <td>{u.actif ? <span class="badge bg-success"><i class="fa-solid fa-check me-1"></i>Actif</span> : <span class="badge bg-secondary"><i class="fa-solid fa-lock me-1"></i>Suspendu</span>}</td>
                <td class="text-end text-nowrap">
                  <form method="post" class="d-inline">
                    <Csrf token={csrf} /><input type="hidden" name="user_id" value={u.id} />
                    {u.actif
                      ? <button name="action" value="suspendre" class="btn btn-sm btn-outline-warning" title="Suspendre" aria-label="Suspendre" onclick="return confirm('Suspendre ce compte ? L\\'utilisateur ne pourra plus se connecter.')"><i class="fa-solid fa-lock"></i></button>
                      : <button name="action" value="reactiver" class="btn btn-sm btn-outline-success" title="Réactiver" aria-label="Réactiver"><i class="fa-solid fa-lock-open"></i></button>}{' '}
                    <button name="action" value="supprimer" class="btn btn-sm btn-outline-danger" title="Supprimer" aria-label="Supprimer" onclick="return confirm('Supprimer définitivement ce compte et toutes ses données (CV, offres, candidatures, entretiens) ? Cette action est irréversible.')"><i class="fa-solid fa-trash"></i></button>
                  </form>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colspan={7} class="text-center text-muted py-4">Aucun utilisateur.</td></tr>}
          </tbody>
        </table>
      </div>
      <div class="mt-3"><Pagination page={pg} pages={pages} query={cleanQuery(f)} /></div>
    </AdminPage>
  ));
});

/* ---------- Offres ---------- */
r.on(['GET', 'POST'], '/offres', async (c) => {
  const db = c.env.DB;
  if (c.req.method === 'POST') {
    const id = Number(await field(c, 'offre_id', 12)) || 0;
    const action = await field(c, 'action', 20);
    const o = await one<Row>(db, 'SELECT o.id, o.titre, r.nom_etablissement FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id WHERE o.id = ?', id);
    if (o && action === 'toggle') {
      await run(db, `UPDATE offres SET active = 1 - active, updated_at = ${NOW} WHERE id = ?`, id);
      await journal(c, `Changement de statut de l'offre #${id} (${o.titre})`);
      flash(c, 'success', "Statut de l'offre mis à jour.");
    } else if (o && action === 'supprimer') {
      await run(db, 'DELETE FROM offres WHERE id = ?', id);
      await journal(c, `Suppression de l'offre #${id} (${o.titre} – ${o.nom_etablissement})`);
      flash(c, 'success', 'Offre supprimée.');
    }
    return c.redirect('/admin/offres' + new URL(c.req.url).search, 302);
  }
  const f = { statut: ['active', 'inactive'].includes(q(c, 'statut')) ? q(c, 'statut') : '', q: q(c, 'q', 100) };
  const where = ['1 = 1'];
  const params: unknown[] = [];
  if (f.statut) { where.push('o.active = ?'); params.push(f.statut === 'active' ? 1 : 0); }
  if (f.q) {
    const n = params.length + 1;
    where.push(`(o.titre LIKE ?${n} ESCAPE '\\' OR r.nom_etablissement LIKE ?${n} ESCAPE '\\' OR o.ville LIKE ?${n} ESCAPE '\\')`);
    params.push('%' + f.q.replace(/[\\%_]/g, (m) => '\\' + m) + '%');
  }
  const w = where.join(' AND ');
  const perPage = 20;
  const total = (await val<number>(db, `SELECT COUNT(*) FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id WHERE ${w}`, ...params)) ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pg = Math.min(Math.max(1, Number(q(c, 'page')) || 1), pages);
  const rows = await all<Row>(db,
    `SELECT o.*, r.nom_etablissement, (SELECT COUNT(*) FROM candidatures ca WHERE ca.offre_id = o.id) AS nb FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id
     WHERE ${w} ORDER BY o.created_at DESC, o.id DESC LIMIT ${perPage} OFFSET ${(pg - 1) * perPage}`, ...params);
  const csrf = c.get('csrf');
  return page(c, { title: 'Offres' }, (
    <AdminPage active="offres">
      <form class="card border-0 shadow-sm mb-3" method="get"><div class="card-body row g-2 align-items-end">
        <div class="col-md-7"><label class="form-label small">Recherche</label><input name="q" class="form-control" placeholder="Poste, établissement ou ville" value={f.q} /></div>
        <div class="col-md-3"><label class="form-label small">Statut</label><select name="statut" class="form-select"><Options items={{ active: 'Actives', inactive: 'Désactivées' }} selected={f.statut} placeholder="Toutes" /></select></div>
        <div class="col-md-2 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-magnifying-glass me-1"></i>Filtrer</button></div>
      </div></form>
      <p class="text-muted small">{total} offre(s)</p>
      <div class="card border-0 shadow-sm table-responsive">
        <table class="table align-middle mb-0 small">
          <thead class="table-light"><tr><th>Offre</th><th>Établissement</th><th>Publiée</th><th>Date limite</th><th class="text-end">Candidatures</th><th>Statut</th><th class="text-end">Actions</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr class={o.active ? '' : 'text-muted'}>
                <td><strong>{o.titre}</strong><br />{o.type_contrat} · {o.ville} · {salaireRange(o.salaire_min, o.salaire_max)}</td>
                <td>{o.nom_etablissement}</td>
                <td>{dateFr(o.created_at)}</td>
                <td>{dateFr(o.date_limite)}</td>
                <td class="text-end">{o.nb}</td>
                <td>{o.active ? <span class="badge bg-success">Active</span> : <span class="badge bg-secondary">Désactivée</span>}</td>
                <td class="text-end text-nowrap">
                  <form method="post" class="d-inline">
                    <Csrf token={csrf} /><input type="hidden" name="offre_id" value={o.id} />
                    <button name="action" value="toggle" class={`btn btn-sm ${o.active ? 'btn-outline-warning' : 'btn-outline-success'}`} title={o.active ? 'Désactiver' : 'Réactiver'} aria-label={o.active ? 'Désactiver' : 'Réactiver'}><i class="fa-solid fa-power-off"></i></button>{' '}
                    <button name="action" value="supprimer" class="btn btn-sm btn-outline-danger" title="Supprimer" aria-label="Supprimer" onclick="return confirm('Supprimer définitivement cette offre et ses candidatures ?')"><i class="fa-solid fa-trash"></i></button>
                  </form>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colspan={7} class="text-center text-muted py-4">Aucune offre.</td></tr>}
          </tbody>
        </table>
      </div>
      <div class="mt-3"><Pagination page={pg} pages={pages} query={cleanQuery(f)} /></div>
    </AdminPage>
  ));
});

/* ---------- Abonnements ---------- */
r.on(['GET', 'POST'], '/abonnements', async (c) => {
  const db = c.env.DB;
  const prix = Number(c.env.ABONNEMENT_PRIX) || 1000;
  if (c.req.method === 'POST') {
    const action = await field(c, 'action', 20);
    if (action === 'activer') {
      // Activation manuelle (virement, chèque, offre commerciale…)
      const rid = Number(await field(c, 'recruteur_id', 12)) || 0;
      const rec = await one<Row>(db, 'SELECT r.id, r.nom_etablissement, u.email FROM recruteurs r JOIN utilisateurs u ON u.id = r.utilisateur_id WHERE r.id = ?', rid);
      const montant = intOrNull(await field(c, 'montant', 10)) ?? prix;
      const ref = (await field(c, 'reference', 60)).replace(/[^A-Za-z0-9\-_/ ]/g, '') || `ADMIN-${today().replace(/-/g, '')}-${randomHex(2).toUpperCase()}`;
      if (rec) {
        const current = await abonnementActif(db, rid);
        const debut = current ? addDays(current.date_fin, 1) : today();
        const fin = addDays(addYears(debut, 1), -1);
        await run(db, 'INSERT INTO abonnements (recruteur_id, montant, date_debut, date_fin, statut, reference_paiement) VALUES (?,?,?,?,?,?)', rid, montant, debut, fin, 'actif', ref);
        sendMail(c, rec.email, 'Votre abonnement medicalstaff.tn est actif',
          `<p>Bonjour,</p><p>L'abonnement annuel de <strong>${esc(rec.nom_etablissement)}</strong> est actif du ${dateFr(debut)} au ${dateFr(fin)}.</p><p>Référence : ${esc(ref)}</p>`);
        await journal(c, `Activation manuelle d'abonnement pour ${rec.nom_etablissement} (${ref}, ${montant} TND)`);
        flash(c, 'success', `Abonnement activé pour ${rec.nom_etablissement} jusqu'au ${dateFr(fin)}.`);
      }
    } else if (action === 'annuler') {
      const id = Number(await field(c, 'abonnement_id', 12)) || 0;
      if ((await run(db, "UPDATE abonnements SET statut = 'annule' WHERE id = ? AND statut = 'actif'", id)).changes) {
        await journal(c, `Annulation de l'abonnement #${id}`);
        flash(c, 'success', 'Abonnement annulé.');
      }
    }
    return redirect(c, '/admin/abonnements');
  }
  const perPage = 25;
  const total = (await val<number>(db, 'SELECT COUNT(*) FROM abonnements')) ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pg = Math.min(Math.max(1, Number(q(c, 'page')) || 1), pages);
  const [rows, recruteurs] = await Promise.all([
    all<Row>(db, `SELECT a.*, r.nom_etablissement, r.ville FROM abonnements a JOIN recruteurs r ON r.id = a.recruteur_id ORDER BY a.created_at DESC, a.id DESC LIMIT ${perPage} OFFSET ${(pg - 1) * perPage}`),
    all<Row>(db, 'SELECT id, nom_etablissement, ville FROM recruteurs ORDER BY nom_etablissement'),
  ]);
  const t = today();
  const csrf = c.get('csrf');
  return page(c, { title: 'Abonnements' }, (
    <AdminPage active="abonnements">
      <div class="row g-4">
        <div class="col-lg-4">
          <form method="post" class="card border-0 shadow-sm"><div class="card-body">
            <h2 class="h6">Activer un abonnement manuellement</h2>
            <p class="small text-muted">Pour un paiement reçu hors plateforme (virement, chèque…). L'abonnement d'un an s'ajoute à la suite de l'abonnement en cours.</p>
            <Csrf token={csrf} /><input type="hidden" name="action" value="activer" />
            <div class="mb-2"><label class="form-label small" for="rid">Établissement</label>
              <select id="rid" name="recruteur_id" class="form-select" required><option value="">Choisir…</option>
                {recruteurs.map((rc) => <option value={rc.id}>{rc.nom_etablissement} – {rc.ville}</option>)}
              </select></div>
            <div class="mb-2"><label class="form-label small" for="mt">Montant (TND)</label><input type="number" min="0" id="mt" name="montant" class="form-control" value={prix} /></div>
            <div class="mb-3"><label class="form-label small" for="ref">Référence du paiement</label><input id="ref" name="reference" class="form-control" placeholder="ex. VIR-2026-0042" /></div>
            <button class="btn btn-success w-100"><i class="fa-solid fa-check me-1"></i>Activer pour 1 an</button>
          </div></form>
        </div>
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm table-responsive">
            <table class="table align-middle mb-0 small">
              <thead class="table-light"><tr><th>Établissement</th><th>Référence</th><th>Période</th><th class="text-end">Montant</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                {rows.map((a) => {
                  const enCours = a.statut === 'actif' && a.date_fin >= t;
                  return (
                    <tr>
                      <td><strong>{a.nom_etablissement}</strong><br /><span class="text-muted">{a.ville}</span></td>
                      <td>{a.reference_paiement}</td>
                      <td class="text-nowrap">{dateFr(a.date_debut)} → {dateFr(a.date_fin)}</td>
                      <td class="text-end">{money(a.montant)}</td>
                      <td>{a.statut === 'annule' ? <span class="badge bg-danger">Annulé</span> : enCours ? <span class="badge bg-success">Actif</span> : <span class="badge bg-secondary">Expiré</span>}</td>
                      <td class="text-end">{enCours && (
                        <form method="post" class="d-inline"><Csrf token={csrf} /><input type="hidden" name="action" value="annuler" /><input type="hidden" name="abonnement_id" value={a.id} />
                          <button class="btn btn-sm btn-outline-danger" title="Annuler" aria-label="Annuler" onclick="return confirm('Annuler cet abonnement ? L\\'établissement perdra l\\'accès à la CVthèque et à la publication d\\'offres.')"><i class="fa-solid fa-ban"></i></button></form>
                      )}</td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colspan={6} class="text-center text-muted py-4">Aucun abonnement.</td></tr>}
              </tbody>
            </table>
          </div>
          <div class="mt-3"><Pagination page={pg} pages={pages} query={{}} /></div>
        </div>
      </div>
    </AdminPage>
  ));
});

/* ---------- Emails envoyés (journal) ---------- */
r.get('/emails', async (c) => {
  const db = c.env.DB;
  const dest = q(c, 'q', 190);
  const perPage = 30;
  const params: unknown[] = dest ? ['%' + dest.replace(/[\\%_]/g, (m) => '\\' + m) + '%'] : [];
  const w = dest ? "WHERE destinataire LIKE ? ESCAPE '\\'" : '';
  const total = (await val<number>(db, `SELECT COUNT(*) FROM emails ${w}`, ...params)) ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pg = Math.min(Math.max(1, Number(q(c, 'page')) || 1), pages);
  const rows = await all<Row>(db, `SELECT id, destinataire, sujet, statut, created_at FROM emails ${w} ORDER BY id DESC LIMIT ${perPage} OFFSET ${(pg - 1) * perPage}`, ...params);
  const provider = (c.env.MAIL_PROVIDER || 'log').toLowerCase();
  return page(c, { title: 'Emails envoyés' }, (
    <AdminPage active="emails">
      <div class={`alert ${provider === 'log' ? 'alert-info' : 'alert-success'} small`}>
        {provider === 'log'
          ? <><i class="fa-solid fa-flask me-1"></i>Mode test : les emails ne sont <strong>pas</strong> envoyés, ils sont enregistrés ici (liens de réinitialisation de mot de passe compris). Pour de vrais envois, configurez Brevo ou Resend (voir le README).</>
          : <><i class="fa-solid fa-paper-plane me-1"></i>Envoi réel via <strong>{provider}</strong>. Chaque email est aussi archivé ici.</>}
      </div>
      <form class="card border-0 shadow-sm mb-3" method="get"><div class="card-body row g-2 align-items-end">
        <div class="col-md-10"><label class="form-label small">Destinataire</label><input name="q" class="form-control" placeholder="email@exemple.tn" value={dest} /></div>
        <div class="col-md-2 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-magnifying-glass me-1"></i>Filtrer</button></div>
      </div></form>
      <div class="card border-0 shadow-sm table-responsive">
        <table class="table align-middle mb-0 small">
          <thead class="table-light"><tr><th>Date</th><th>Destinataire</th><th>Sujet</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr>
                <td class="text-nowrap">{dateFr(m.created_at, true)}</td>
                <td>{m.destinataire}</td>
                <td>{m.sujet}</td>
                <td><span class={`badge ${m.statut.includes('échec') ? 'bg-danger' : m.statut === 'journal' ? 'bg-secondary' : 'bg-success'}`}>{m.statut}</span></td>
                <td class="text-end"><a class="btn btn-sm btn-outline-primary" href={`/admin/emails/${m.id}`} target="_blank"><i class="fa-solid fa-eye me-1"></i>Lire</a></td>
              </tr>
            ))}
            {!rows.length && <tr><td colspan={5} class="text-center text-muted py-4">Aucun email.</td></tr>}
          </tbody>
        </table>
      </div>
      <div class="mt-3"><Pagination page={pg} pages={pages} query={cleanQuery({ q: dest })} /></div>
    </AdminPage>
  ));
});

r.get('/emails/:id{[0-9]+}', async (c) => {
  const m = await one<Row>(c.env.DB, 'SELECT * FROM emails WHERE id = ?', Number(c.req.param('id')));
  if (!m) return c.notFound();
  // Le corps est affiché dans une page isolée (aucun script autorisé)
  c.header('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
  return c.html(`<!doctype html><meta charset="utf-8"><title>${esc(m.sujet)}</title>
<div style="font-family:Arial,sans-serif;max-width:640px;margin:16px auto;padding:12px 16px;background:#fff8e1;border:1px solid #ffe08a;border-radius:8px;font-size:13px">
<strong>À :</strong> ${esc(m.destinataire)}<br><strong>Sujet :</strong> ${esc(m.sujet)}<br><strong>Date :</strong> ${esc(dateFr(m.created_at, true))} · <strong>Statut :</strong> ${esc(m.statut)}</div>${m.corps_html}`);
});

/* ---------- Journal des actions ---------- */
r.get('/journal', async (c) => {
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM admin_journal ORDER BY id DESC LIMIT 200');
  return page(c, { title: "Journal d'administration" }, (
    <AdminPage active="journal">
      <div class="card border-0 shadow-sm table-responsive">
        <table class="table align-middle mb-0 small">
          <thead class="table-light"><tr><th>Date</th><th>Administrateur</th><th>Action</th></tr></thead>
          <tbody>
            {rows.map((j) => <tr><td class="text-nowrap">{dateFr(j.created_at, true)}</td><td>{j.admin_email}</td><td>{j.action}</td></tr>)}
            {!rows.length && <tr><td colspan={3} class="text-center text-muted py-4">Aucune action enregistrée.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminPage>
  ));
});

export default r;
