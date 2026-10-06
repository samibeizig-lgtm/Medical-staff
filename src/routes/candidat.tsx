import { Hono } from 'hono';
import { raw } from 'hono/html';
import type { AppEnv, Row } from '../types';
import { all, NOW, one, run, stmt, TODAY, val } from '../lib/db';
import { field, flash, indexed, q, readForm, redirect, requireRole, setNext, origin, type Ctx } from '../lib/http';
import { createUser, loginPage, validatePassword } from '../lib/auth';
import { loginUser } from '../lib/http';
import { candidatFull, currentCandidat, cvComplet, dernierEntretienIa, testPasse } from '../lib/models';
import { BadgeCommunication } from '../views/entretien-ia';
import { DIPLOMES, DISPONIBILITES, GOUVERNORATS, LANGUES, MENTIONS, NIVEAUX_LANGUE, POSTES, TYPES_CONTRAT, inList } from '../lib/data';
import { esc, intOrNull, isEmail, money, refCandidat } from '../lib/format';
import { dateFr, isValidDate, plageHoraire, parseLocal, tunis } from '../lib/dates';
import { sendMail } from '../lib/mail';
import { ECHELLE, QUESTIONS, personalityPortrait, personalityScores } from '../lib/personality';
import { cleanQuery, searchOffres } from '../lib/offres';
import { distanceKm, gouvernoratsDansRayon, rayonValide, RAYONS } from '../lib/proximite';
import { randomHex } from '../lib/crypto';
import { page } from '../views/layout';
import { AuthCard, Csrf, CvSections, Empty, Errors, Jauges, Kpi, Langues, OffreCard, Options, Pagination, StatutEntretien, photoUrl } from '../views/ui';

const r = new Hono<AppEnv>();

/* ---------- Connexion / inscription ---------- */
r.on(['GET', 'POST'], '/login', (c) => {
  const offre = q(c, 'offre');
  if (/^\d+$/.test(offre)) setNext(c, 'candidat', `/candidat/offres?poste=#offre-${offre}`);
  return loginPage(c, {
    type: 'candidat', title: 'Espace candidat', icon: 'fa-user-nurse', btnClass: 'btn-primary', dashboard: '/candidat/dashboard',
    subtitle: offre ? 'Connectez-vous pour postuler à cette offre.' : undefined,
    links: (
      <>
        <p class="text-center small mt-3 mb-0">Pas encore de compte ? <a href="/candidat/register">Créer un compte</a></p>
        <p class="text-center small mt-1 mb-0"><a href="/recruteur/login">Vous êtes un établissement ?</a></p>
      </>
    ),
  });
});

r.on(['GET', 'POST'], '/register', async (c) => {
  if (c.get('user')?.type === 'candidat') return redirect(c, '/candidat/dashboard');
  const v = { nom: '', prenom: '', email: '' };
  let errors: string[] = [];
  if (c.req.method === 'POST') {
    v.nom = await field(c, 'nom', 100);
    v.prenom = await field(c, 'prenom', 100);
    v.email = (await field(c, 'email', 190)).toLowerCase();
    const p = await field(c, 'password', 200);
    if (!v.nom || !v.prenom) errors.push('Le nom et le prénom sont obligatoires.');
    if (!isEmail(v.email)) errors.push('Adresse email invalide.');
    errors.push(...validatePassword(p, await field(c, 'password2', 200)));
    if (!errors.length && (await val(c.env.DB, 'SELECT 1 FROM utilisateurs WHERE email = ?', v.email))) errors.push('Un compte existe déjà avec cet email.');
    if (!errors.length) {
      const uid = await createUser(c, v.email, p, 'candidat');
      await run(c.env.DB, `INSERT INTO candidats (utilisateur_id, nom, prenom, updated_at) VALUES (?, ?, ?, ${NOW})`, uid, v.nom, v.prenom);
      await loginUser(c, uid);
      sendMail(c, v.email, 'Bienvenue sur medicalstaff.tn', `<p>Bonjour ${esc(v.prenom)},</p><p>Votre compte candidat a bien été créé. Complétez votre CV et passez le test de personnalité pour postuler aux offres.</p>`);
      flash(c, 'success', `Bienvenue ${v.prenom} ! Complétez maintenant votre CV.`);
      return redirect(c, '/candidat/cv');
    }
  }
  return page(c, { title: 'Inscription candidat' }, (
    <AuthCard icon="fa-user-nurse" title="Créer mon compte candidat" subtitle="Gratuit et sans engagement" width="col-md-7 col-lg-5">
      <Errors errors={errors} />
      <form method="post" novalidate>
        <Csrf token={c.get('csrf')} />
        <div class="row g-2">
          <div class="col-6 mb-3"><label class="form-label" for="nom">Nom</label><input id="nom" name="nom" class="form-control" value={v.nom} required /></div>
          <div class="col-6 mb-3"><label class="form-label" for="prenom">Prénom</label><input id="prenom" name="prenom" class="form-control" value={v.prenom} required /></div>
        </div>
        <div class="mb-3"><label class="form-label" for="email">Email</label><input type="email" id="email" name="email" class="form-control" value={v.email} required autocomplete="username" /></div>
        <div class="mb-3"><label class="form-label" for="p1">Mot de passe</label><input type="password" id="p1" name="password" class="form-control" minlength={8} required autocomplete="new-password" /><div class="form-text">8 caractères minimum.</div></div>
        <div class="mb-4"><label class="form-label" for="p2">Confirmer le mot de passe</label><input type="password" id="p2" name="password2" class="form-control" required autocomplete="new-password" /></div>
        <button class="btn btn-primary w-100">Créer mon compte</button>
      </form>
      <p class="text-center small mt-3 mb-0">Déjà inscrit ? <a href="/candidat/login">Se connecter</a></p>
    </AuthCard>
  ));
});

/* ---------- Espace protégé ---------- */
r.use('*', async (c, next) => {
  const p = new URL(c.req.url).pathname;
  if (p.endsWith('/login') || p.endsWith('/register')) return next();
  return requireRole('candidat')(c, next);
});

async function me(c: Ctx): Promise<Row> {
  const cand = await currentCandidat(c.env.DB, c.get('user')!.id);
  if (!cand) throw new Error('Profil candidat introuvable');
  return cand;
}

r.get('/', (c) => redirect(c, '/candidat/dashboard'));

/* ---------- Tableau de bord ---------- */
r.get('/dashboard', async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  const [cand, cvOk, stats, candidatures, eia] = await Promise.all([
    candidatFull(db, m.id),
    cvComplet(db, m.id),
    one<Row>(db, `SELECT (SELECT COUNT(*) FROM candidatures WHERE candidat_id = ?1) AS nb_cand,
                          (SELECT COUNT(*) FROM entretiens WHERE candidat_id = ?1 AND statut = 'en_attente') AS nb_ent,
                          (SELECT COUNT(*) FROM cv_consultations WHERE candidat_id = ?1) AS nb_vues`, m.id),
    all<Row>(db, `SELECT ca.*, o.titre, o.ville, r.nom_etablissement FROM candidatures ca JOIN offres o ON o.id = ca.offre_id
                  JOIN recruteurs r ON r.id = o.recruteur_id WHERE ca.candidat_id = ? ORDER BY ca.created_at DESC LIMIT 5`, m.id),
    dernierEntretienIa(db, m.id),
  ]);
  const ct = cand!;
  const testOk = !!ct.test;
  const pret = cvOk && testOk;
  const adresse = [ct.adresse, ct.ville, ct.pays].filter(Boolean).join(', ') || '—';
  return page(c, { title: 'Mon tableau de bord' }, (
    <div class="container py-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <h1 class="h3 mb-0">Bonjour {ct.prenom} 👋</h1>
        <div class="d-flex flex-wrap gap-2">
          <a href="/candidat/cv" class="btn btn-primary"><i class="fa-solid fa-file-pen me-1"></i>Modifier mon CV</a>
          <a href="/candidat/test" class="btn btn-outline-primary"><i class="fa-solid fa-brain me-1"></i>Test de personnalité</a>
          <a href="/candidat/qcm" class="btn btn-outline-primary"><i class="fa-solid fa-list-check me-1"></i>QCM compétences</a>
          <a href="/candidat/entretien-ia" class="btn btn-outline-primary"><i class="fa-solid fa-microphone-lines me-1"></i>Entretien IA</a>
          <a href="/candidat/offres" class="btn btn-outline-primary"><i class="fa-solid fa-magnifying-glass me-1"></i>Voir les offres</a>
          <a href="/candidat/entretiens" class="btn btn-outline-primary position-relative"><i class="fa-solid fa-calendar-check me-1"></i>Mes entretiens
            {stats!.nb_ent > 0 && <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{stats!.nb_ent}</span>}</a>
        </div>
      </div>
      {!pret && (
        <div class="alert alert-warning d-flex flex-wrap align-items-center gap-2">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Pour postuler aux offres, vous devez {!cvOk && <><strong>compléter votre CV</strong> (poste recherché + au moins un diplôme)</>}{!cvOk && !testOk && ' et '}{!testOk && <strong>passer le test de personnalité</strong>}.</span>
        </div>
      )}
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3"><Kpi icon="fa-paper-plane" value={stats!.nb_cand} label="candidatures" /></div>
        <div class="col-6 col-md-3"><Kpi icon="fa-calendar" value={stats!.nb_ent} label="entretiens en attente" /></div>
        <div class="col-6 col-md-3"><Kpi icon="fa-eye" value={stats!.nb_vues} label="consultations du CV" /></div>
        <div class="col-6 col-md-3"><Kpi icon={pret ? 'fa-circle-check text-success' : 'fa-hourglass-half text-warning'} value={pret ? 'Prêt' : 'Incomplet'} label="statut du profil" /></div>
      </div>
      <div class="row g-4">
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body text-center p-4">
              <img src={photoUrl(ct.photo)} class="profile-photo mb-3" alt="Photo de profil" />
              <h2 class="h5 mb-0">{ct.prenom} {ct.nom}</h2>
              <p class="text-primary mb-2">{ct.poste_recherche || 'Poste recherché non renseigné'}</p>
              <span class="badge text-bg-secondary">{refCandidat(ct.id)}</span>
            </div>
            <ul class="list-group list-group-flush small">
              <li class="list-group-item"><i class="fa-solid fa-envelope me-2 text-muted"></i>{ct.email}</li>
              <li class="list-group-item"><i class="fa-solid fa-phone me-2 text-muted"></i>{ct.telephone || '—'}</li>
              <li class="list-group-item"><i class="fa-solid fa-location-dot me-2 text-muted"></i>{adresse}</li>
              <li class="list-group-item"><i class="fa-solid fa-cake-candles me-2 text-muted"></i>{ct.date_naissance ? `${dateFr(ct.date_naissance)}${ct.lieu_naissance ? ' à ' + ct.lieu_naissance : ''}` : '—'}</li>
              <li class="list-group-item"><i class="fa-solid fa-money-bill-wave me-2 text-muted"></i>Salaire souhaité : {money(ct.salaire_souhaite)}</li>
              <li class="list-group-item"><i class="fa-solid fa-clock me-2 text-muted"></i>Disponibilité : {ct.disponibilite || '—'}</li>
              <li class="list-group-item"><i class={`fa-solid fa-${ct.coordonnees_visibles ? 'eye' : 'eye-slash'} me-2 text-muted`}></i>Coordonnées {ct.coordonnees_visibles ? 'visibles' : 'masquées'} aux recruteurs</li>
            </ul>
          </div>
          {ct.test && (
            <div class="card border-0 shadow-sm mt-4"><div class="card-body">
              <h3 class="h6"><i class="fa-solid fa-brain text-primary me-1"></i>Mon profil de personnalité</h3>
              <Jauges test={ct.test} compact />
            </div></div>
          )}
          <div class="card border-0 shadow-sm mt-4"><div class="card-body">
            <h3 class="h6"><i class="fa-solid fa-list-check text-primary me-1"></i>Compétences validées par QCM</h3>
            <p class="mb-2"><strong class="fs-4">{ct.competences.length}</strong> <span class="small text-muted">compétence(s) validée(s)</span></p>
            <p class="small text-muted mb-2">15 questions chronométrées (30 s chacune) sur votre métier : seules les compétences validées comptent dans le matching.</p>
            <a href="/candidat/qcm" class={`btn btn-sm ${ct.competences.length ? 'btn-outline-primary' : 'btn-primary'}`}><i class="fa-solid fa-stopwatch me-1"></i>{ct.competences.length ? 'Valider d\'autres compétences' : 'Passer mon premier QCM'}</a>
          </div></div>
          <div class="card border-0 shadow-sm mt-4"><div class="card-body">
            <h3 class="h6"><i class="fa-solid fa-microphone-lines text-primary me-1"></i>Entretien IA – communication</h3>
            {eia ? (
              <>
                <p class="mb-2">Score : <BadgeCommunication score={eia.score_global} /> <span class="small text-muted">· {dateFr(eia.termine_le)}</span></p>
                <a href="/candidat/entretien-ia" class="btn btn-sm btn-outline-primary">Voir le détail et les conseils</a>
              </>
            ) : (
              <>
                <p class="small text-muted mb-2">Entraînez-vous et démarquez-vous : 5 questions orales, évaluées par l'IA. Le score est visible par les recruteurs.</p>
                <a href="/candidat/entretien-ia" class="btn btn-sm btn-primary"><i class="fa-solid fa-play me-1"></i>Passer l'entretien IA</a>
              </>
            )}
          </div></div>
        </div>
        <div class="col-lg-8">
          <CvSections c={ct} />
          <div class="card border-0 shadow-sm mb-4"><div class="card-body">
            <h3 class="h5"><i class="fa-solid fa-language text-primary me-2"></i>Langues</h3>
            <Langues langues={ct.langues} />
          </div></div>
          <div class="card border-0 shadow-sm"><div class="card-body">
            <h3 class="h5"><i class="fa-solid fa-paper-plane text-primary me-2"></i>Mes dernières candidatures</h3>
            {!candidatures.length && <p class="text-muted small mb-0">Vous n'avez pas encore postulé. <a href="/candidat/offres">Voir les offres</a></p>}
            {candidatures.map((ca) => (
              <div class="d-flex justify-content-between border-bottom py-2 small">
                <span><strong>{ca.titre}</strong> – {ca.nom_etablissement} ({ca.ville})</span>
                <span class="text-muted">{dateFr(ca.created_at)}</span>
              </div>
            ))}
          </div></div>
        </div>
      </div>
    </div>
  ));
});

/* ---------- CV ---------- */
const MAX_PHOTO = 1_500_000; // la photo est redimensionnée dans le navigateur avant l'envoi

function detectImage(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

r.on(['GET', 'POST'], '/cv', async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  const errors: string[] = [];

  if (c.req.method === 'POST') {
    const fd = await readForm(c);
    const v = {
      nom: await field(c, 'nom', 100),
      prenom: await field(c, 'prenom', 100),
      date_naissance: await field(c, 'date_naissance', 10),
      lieu_naissance: await field(c, 'lieu_naissance', 100),
      telephone: await field(c, 'telephone', 30),
      adresse: await field(c, 'adresse', 255),
      ville: await field(c, 'ville', 60),
      pays: (await field(c, 'pays', 60)) || 'Tunisie',
      poste: await field(c, 'poste_recherche', 150),
      salaire: intOrNull(await field(c, 'salaire_souhaite', 10)),
      dispo: await field(c, 'disponibilite', 60),
      visibles: fd.get('coordonnees_visibles') ? 1 : 0,
    };
    if (!v.nom || !v.prenom) errors.push('Le nom et le prénom sont obligatoires.');
    if (v.poste && !inList(POSTES, v.poste)) errors.push('Poste recherché invalide.');
    if (v.ville && !inList(GOUVERNORATS, v.ville)) errors.push('Ville invalide.');
    if (v.dispo && !inList(DISPONIBILITES, v.dispo)) v.dispo = '';

    let photo: { cle: string; mime: string; data: ArrayBuffer } | null = null;
    const file = fd.get('photo');
    if (file && typeof file !== 'string' && file.size > 0) {
      if (file.size > MAX_PHOTO) errors.push('La photo est trop volumineuse (2 Mo maximum).');
      else {
        const data = await file.arrayBuffer();
        const mime = detectImage(new Uint8Array(data.slice(0, 12)));
        if (!mime) errors.push('Format de photo non autorisé (JPG, PNG ou GIF uniquement).');
        else photo = { cle: randomHex(12), mime, data };
      }
    }

    if (!errors.length) {
      const cid = m.id;
      const s: D1PreparedStatement[] = [
        stmt(db, `UPDATE candidats SET nom=?, prenom=?, date_naissance=?, lieu_naissance=?, telephone=?, adresse=?, ville=?, pays=?,
                  poste_recherche=?, salaire_souhaite=?, disponibilite=?, coordonnees_visibles=?, updated_at=${NOW} WHERE id=?`,
          v.nom, v.prenom, isValidDate(v.date_naissance) ? v.date_naissance : null, v.lieu_naissance || null, v.telephone || null,
          v.adresse || null, v.ville || null, v.pays, v.poste || null, v.salaire, v.dispo || null, v.visibles, cid),
        stmt(db, 'DELETE FROM diplomes WHERE candidat_id = ?', cid),
        stmt(db, 'DELETE FROM experiences WHERE candidat_id = ?', cid),
        stmt(db, 'DELETE FROM langues WHERE candidat_id = ?', cid),
      ];
      for (const d of (await indexed(c, 'diplomes')).slice(0, 20)) {
        if (!d.intitule) continue;
        s.push(stmt(db, 'INSERT INTO diplomes (candidat_id, intitule, etablissement, date_obtention, mention) VALUES (?,?,?,?,?)',
          cid, d.intitule.slice(0, 190), (d.etablissement ?? '').slice(0, 190) || null, isValidDate(d.date_obtention) ? d.date_obtention : null,
          inList(MENTIONS, d.mention) ? d.mention : null));
      }
      for (const x of (await indexed(c, 'experiences')).slice(0, 30)) {
        if (!x.poste) continue;
        const actuel = x.poste_actuel ? 1 : 0;
        s.push(stmt(db, 'INSERT INTO experiences (candidat_id, poste, etablissement, date_debut, date_fin, poste_actuel, description) VALUES (?,?,?,?,?,?,?)',
          cid, x.poste.slice(0, 150), (x.etablissement ?? '').slice(0, 190) || null, isValidDate(x.date_debut) ? x.date_debut : null,
          actuel ? null : isValidDate(x.date_fin) ? x.date_fin : null, actuel, (x.description ?? '').slice(0, 2000) || null));
      }
      const seen = new Set<string>();
      for (const l of await indexed(c, 'langues')) {
        if (!inList(LANGUES, l.langue) || seen.has(l.langue)) continue;
        seen.add(l.langue);
        s.push(stmt(db, 'INSERT INTO langues (candidat_id, langue, niveau) VALUES (?,?,?)', cid, l.langue, inList(NIVEAUX_LANGUE, l.niveau) ? l.niveau : 'Intermédiaire'));
      }
      if (photo) {
        s.push(stmt(db, 'DELETE FROM photos WHERE candidat_id = ?', cid));
        s.push(stmt(db, 'INSERT INTO photos (cle, candidat_id, mime, data) VALUES (?,?,?,?)', photo.cle, cid, photo.mime, photo.data));
        s.push(stmt(db, 'UPDATE candidats SET photo = ? WHERE id = ?', photo.cle, cid));
      }
      await db.batch(s); // transaction atomique
      flash(c, 'success', 'Votre CV a été enregistré.');
      return redirect(c, '/candidat/dashboard');
    }
  }

  const ct = (await candidatFull(db, m.id))!;
  if (c.req.method === 'POST') {
    // Ré-affichage des valeurs saisies en cas d'erreur
    for (const k of ['nom', 'prenom', 'date_naissance', 'lieu_naissance', 'telephone', 'adresse', 'ville', 'pays', 'poste_recherche', 'salaire_souhaite', 'disponibilite']) ct[k] = await field(c, k);
  }
  const langues = ct.langues.length ? ct.langues : [{ langue: 'Arabe', niveau: 'Langue maternelle' }, { langue: 'Français', niveau: 'Courant' }];
  return page(c, { title: 'Mon CV' }, (
    <div class="container py-4">
      <h1 class="h3 mb-1">Mon CV</h1>
      <p class="text-muted">Un CV complet (poste recherché + au moins un diplôme) est nécessaire pour postuler.</p>
      <Errors errors={errors} />
      <form method="post" enctype="multipart/form-data" class="cv-form">
        <Csrf token={c.get('csrf')} />
        <datalist id="dl-diplomes"><Options items={DIPLOMES} /></datalist>
        <datalist id="dl-postes"><Options items={POSTES} /></datalist>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
          <h2 class="h5 section-label"><i class="fa-solid fa-id-card"></i>État civil</h2>
          <div class="row g-3">
            <div class="col-md-3 text-center">
              <img src={photoUrl(ct.photo)} id="photo-preview" class="profile-photo mb-2" alt="Photo" />
              <input type="file" name="photo" id="photo-input" class="form-control form-control-sm" accept="image/jpeg,image/png,image/gif" aria-label="Photo de profil" />
              <div class="form-text">JPG, PNG ou GIF – 2 Mo max.</div>
            </div>
            <div class="col-md-9"><div class="row g-3">
              <div class="col-md-6"><label class="form-label" for="nom">Nom *</label><input id="nom" name="nom" class="form-control" value={ct.nom} required /></div>
              <div class="col-md-6"><label class="form-label" for="prenom">Prénom *</label><input id="prenom" name="prenom" class="form-control" value={ct.prenom} required /></div>
              <div class="col-md-4"><label class="form-label" for="dn">Date de naissance</label><input type="date" id="dn" name="date_naissance" class="form-control" value={ct.date_naissance ?? ''} /></div>
              <div class="col-md-4"><label class="form-label" for="ln">Lieu de naissance</label><input id="ln" name="lieu_naissance" class="form-control" value={ct.lieu_naissance ?? ''} /></div>
              <div class="col-md-4"><label class="form-label" for="tel">Téléphone</label><input type="tel" id="tel" name="telephone" class="form-control" placeholder="+216 ..." value={ct.telephone ?? ''} /></div>
            </div></div>
          </div>
        </div></div>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
          <h2 class="h5 section-label"><i class="fa-solid fa-location-dot"></i>Adresse</h2>
          <div class="row g-3">
            <div class="col-md-6"><label class="form-label" for="adr">Adresse</label><input id="adr" name="adresse" class="form-control" placeholder="N°, rue, cité…" value={ct.adresse ?? ''} /></div>
            <div class="col-md-3"><label class="form-label" for="ville">Ville (gouvernorat)</label><select id="ville" name="ville" class="form-select"><Options items={GOUVERNORATS} selected={ct.ville} placeholder="Choisir…" /></select></div>
            <div class="col-md-3"><label class="form-label" for="pays">Pays</label><input id="pays" name="pays" class="form-control" value={ct.pays || 'Tunisie'} /></div>
          </div>
        </div></div>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
          <h2 class="h5 section-label"><i class="fa-solid fa-bullseye"></i>Poste recherché et prétentions</h2>
          <div class="row g-3">
            <div class="col-md-6"><label class="form-label" for="poste">Poste recherché *</label><select id="poste" name="poste_recherche" class="form-select"><Options items={POSTES} selected={ct.poste_recherche} placeholder="Choisir un métier…" /></select></div>
            <div class="col-md-3"><label class="form-label" for="sal">Salaire minimum souhaité (TND/mois)</label><input type="number" min="0" step="50" id="sal" name="salaire_souhaite" class="form-control" value={ct.salaire_souhaite ?? ''} /></div>
            <div class="col-md-3"><label class="form-label" for="dispo">Disponibilité</label><select id="dispo" name="disponibilite" class="form-select"><Options items={DISPONIBILITES} selected={ct.disponibilite} placeholder="Choisir…" /></select></div>
          </div>
        </div></div>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
          <h2 class="h5 section-label"><i class="fa-solid fa-graduation-cap"></i>Diplômes *</h2>
          <div class="repeater" data-template="tpl-diplome">
            {(ct.diplomes.length ? ct.diplomes : [{}]).map((d, i) => <DiplomeRow i={String(i)} d={d} />)}
          </div>
          <button type="button" class="btn btn-sm btn-outline-primary repeater-add" data-target="tpl-diplome"><i class="fa-solid fa-plus me-1"></i>Ajouter un diplôme</button>
          <template id="tpl-diplome"><DiplomeRow i="__i__" d={{}} /></template>
        </div></div>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
          <h2 class="h5 section-label"><i class="fa-solid fa-briefcase"></i>Expériences professionnelles</h2>
          <div class="repeater" data-template="tpl-experience">
            {ct.experiences.map((x, i) => <ExperienceRow i={String(i)} x={x} />)}
          </div>
          <button type="button" class="btn btn-sm btn-outline-primary repeater-add" data-target="tpl-experience"><i class="fa-solid fa-plus me-1"></i>Ajouter une expérience</button>
          <template id="tpl-experience"><ExperienceRow i="__i__" x={{}} /></template>
        </div></div>

        <div class="row g-4 mb-4">
          <div class="col-lg-7"><div class="card border-0 shadow-sm h-100"><div class="card-body p-4">
            <h2 class="h5 section-label"><i class="fa-solid fa-star"></i>Compétences</h2>
            <p class="small text-muted">Les compétences ne se déclarent pas : elles s'obtiennent en réussissant des <strong>QCM chronométrés</strong> propres à votre métier. Seules les compétences validées figurent sur votre CV et comptent pour 45 % du matching.</p>
            <div class="mb-3">
              {ct.competences.map((k) => <span class="badge rounded-pill bg-success-subtle text-success me-1 mb-1"><i class="fa-solid fa-circle-check me-1"></i>{k.nom}</span>)}
              {!ct.competences.length && <span class="small text-muted">Aucune compétence validée pour l'instant.</span>}
            </div>
            <a href="/candidat/qcm" class="btn btn-sm btn-outline-primary"><i class="fa-solid fa-list-check me-1"></i>Valider des compétences par QCM</a>
          </div></div></div>
          <div class="col-lg-5"><div class="card border-0 shadow-sm h-100"><div class="card-body p-4">
            <h2 class="h5 section-label"><i class="fa-solid fa-language"></i>Langues</h2>
            <div class="repeater" data-template="tpl-langue">
              {langues.map((l, i) => <LangueRow i={String(i)} l={l} />)}
            </div>
            <button type="button" class="btn btn-sm btn-outline-primary repeater-add" data-target="tpl-langue"><i class="fa-solid fa-plus me-1"></i>Ajouter une langue</button>
            <template id="tpl-langue"><LangueRow i="__i__" l={{}} /></template>
          </div></div></div>
        </div>

        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
          <h2 class="h5 section-label"><i class="fa-solid fa-user-shield"></i>Confidentialité</h2>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" role="switch" id="coord" name="coordonnees_visibles" value="1" checked={!!ct.coordonnees_visibles} />
            <label class="form-check-label" for="coord">Rendre mes coordonnées (email, téléphone, adresse) visibles aux recruteurs abonnés</label>
          </div>
          <div class="form-text">Dans tous les cas, votre identité n'est jamais visible par les simples visiteurs.</div>
        </div></div>

        <div class="d-flex gap-2 justify-content-end">
          <a href="/candidat/dashboard" class="btn btn-light">Annuler</a>
          <button class="btn btn-primary btn-lg"><i class="fa-solid fa-floppy-disk me-1"></i>Enregistrer mon CV</button>
        </div>
      </form>
    </div>
  ));
});

function DiplomeRow({ i, d }: { i: string; d: Row }) {
  return (
    <div class="repeater-item card card-body mb-2"><div class="row g-2">
      <div class="col-md-4"><label class="form-label small">Intitulé</label><input class="form-control" list="dl-diplomes" name={`diplomes[${i}][intitule]`} value={d.intitule ?? ''} /></div>
      <div class="col-md-3"><label class="form-label small">Établissement</label><input class="form-control" name={`diplomes[${i}][etablissement]`} value={d.etablissement ?? ''} /></div>
      <div class="col-md-2"><label class="form-label small">Date d'obtention</label><input type="date" class="form-control" name={`diplomes[${i}][date_obtention]`} value={d.date_obtention ?? ''} /></div>
      <div class="col-md-2"><label class="form-label small">Mention</label><select class="form-select" name={`diplomes[${i}][mention]`}><Options items={MENTIONS} selected={d.mention} placeholder="—" /></select></div>
      <div class="col-md-1 d-flex align-items-end"><button type="button" class="btn btn-outline-danger w-100 repeater-remove" title="Supprimer" aria-label="Supprimer"><i class="fa-solid fa-trash"></i></button></div>
    </div></div>
  );
}

function ExperienceRow({ i, x }: { i: string; x: Row }) {
  const actuel = !!x.poste_actuel;
  return (
    <div class="repeater-item card card-body mb-2"><div class="row g-2">
      <div class="col-md-4"><label class="form-label small">Poste</label><input class="form-control" list="dl-postes" name={`experiences[${i}][poste]`} value={x.poste ?? ''} /></div>
      <div class="col-md-4"><label class="form-label small">Établissement</label><input class="form-control" name={`experiences[${i}][etablissement]`} value={x.etablissement ?? ''} /></div>
      <div class="col-md-2"><label class="form-label small">Début</label><input type="date" class="form-control" name={`experiences[${i}][date_debut]`} value={x.date_debut ?? ''} /></div>
      <div class="col-md-2"><label class="form-label small">Fin</label><input type="date" class="form-control exp-fin" name={`experiences[${i}][date_fin]`} value={x.date_fin ?? ''} disabled={actuel} /></div>
      <div class="col-md-10"><label class="form-label small">Description</label><textarea class="form-control" rows={2} name={`experiences[${i}][description]`}>{x.description ?? ''}</textarea></div>
      <div class="col-md-2 d-flex flex-column justify-content-end gap-2">
        <div class="form-check"><input class="form-check-input exp-actuel" type="checkbox" value="1" name={`experiences[${i}][poste_actuel]`} id={`act${i}`} checked={actuel} /><label class="form-check-label small" for={`act${i}`}>Poste actuel</label></div>
        <button type="button" class="btn btn-outline-danger repeater-remove"><i class="fa-solid fa-trash me-1"></i>Supprimer</button>
      </div>
    </div></div>
  );
}

function LangueRow({ i, l }: { i: string; l: Row }) {
  return (
    <div class="repeater-item row g-2 mb-2">
      <div class="col-5"><select class="form-select" name={`langues[${i}][langue]`} aria-label="Langue"><Options items={LANGUES} selected={l.langue} placeholder="Langue" /></select></div>
      <div class="col-5"><select class="form-select" name={`langues[${i}][niveau]`} aria-label="Niveau"><Options items={NIVEAUX_LANGUE} selected={l.niveau} placeholder="Niveau" /></select></div>
      <div class="col-2"><button type="button" class="btn btn-outline-danger w-100 repeater-remove" aria-label="Supprimer"><i class="fa-solid fa-trash"></i></button></div>
    </div>
  );
}

/* ---------- Test de personnalité ---------- */
r.on(['GET', 'POST'], '/test', async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  let error: string | null = null;
  let answers: number[] = [];
  if (c.req.method === 'POST') {
    const fd = await readForm(c);
    answers = QUESTIONS.map((_, i) => Number(fd.get(`q[${i}]`)));
    if (answers.some((v) => !(v >= 1 && v <= 5))) {
      error = 'Merci de répondre à toutes les questions.';
    } else {
      const s = personalityScores(answers);
      await run(db,
        `INSERT INTO tests_personnalite (candidat_id, ouverture, conscience, extraversion, agreabilite, stabilite, adaptation_medicale, portrait, reponses, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,${NOW})
         ON CONFLICT(candidat_id) DO UPDATE SET ouverture=excluded.ouverture, conscience=excluded.conscience, extraversion=excluded.extraversion,
           agreabilite=excluded.agreabilite, stabilite=excluded.stabilite, adaptation_medicale=excluded.adaptation_medicale,
           portrait=excluded.portrait, reponses=excluded.reponses, created_at=excluded.created_at`,
        m.id, s.ouverture, s.conscience, s.extraversion, s.agreabilite, s.stabilite, s.adaptation_medicale, personalityPortrait(s, m.prenom), JSON.stringify(answers));
      flash(c, 'success', 'Votre test de personnalité a été enregistré.');
      return redirect(c, '/candidat/test');
    }
  }
  const existing = await one<Row>(db, 'SELECT * FROM tests_personnalite WHERE candidat_id = ?', m.id);
  if (existing && !q(c, 'refaire') && !error) {
    return page(c, { title: 'Test de personnalité' }, (
      <div class="container py-4"><div class="row justify-content-center"><div class="col-lg-9">
        <h1 class="h3"><i class="fa-solid fa-brain text-primary me-2"></i>Mon profil de personnalité</h1>
        <p class="text-muted">Test passé le {dateFr(existing.created_at)}. Ce profil est utilisé par l'IA de matching pour vous proposer aux recruteurs.</p>
        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4"><Jauges test={existing} /></div></div>
        <div class="card border-0 shadow-sm mb-4 portrait"><div class="card-body p-4">
          <h2 class="h5"><i class="fa-solid fa-feather-pointed text-primary me-2"></i>Votre portrait</h2>
          <p class="mb-0">{existing.portrait}</p>
        </div></div>
        <div class="d-flex gap-2">
          <a href="/candidat/offres" class="btn btn-primary"><i class="fa-solid fa-magnifying-glass me-1"></i>Voir les offres</a>
          <a href="?refaire=1" class="btn btn-outline-secondary"><i class="fa-solid fa-rotate me-1"></i>Repasser le test</a>
        </div>
      </div></div></div>
    ));
  }
  const script = `(function(){var f=document.getElementById('test-form');if(!f)return;var t=f.querySelectorAll('.question').length,b=document.getElementById('test-progress');
function u(){var n=new Set([].map.call(f.querySelectorAll('input[type=radio]:checked'),function(i){return i.name})).size;b.style.width=(n/t*100)+'%';}f.addEventListener('change',u);u();})();`;
  return page(c, { title: 'Test de personnalité', scripts: <script>{raw(script)}</script> }, (
    <div class="container py-4"><div class="row justify-content-center"><div class="col-lg-9">
      <h1 class="h3"><i class="fa-solid fa-brain text-primary me-2"></i>Test de personnalité</h1>
      <p class="text-muted">30 affirmations · environ 5 minutes. Répondez spontanément : il n'y a pas de bonne ou de mauvaise réponse.</p>
      <div class="progress mb-4 sticky-progress" style="height:8px"><div id="test-progress" class="progress-bar" style="width:0%"></div></div>
      {error && <div class="alert alert-danger">{error}</div>}
      <form method="post" id="test-form">
        <Csrf token={c.get('csrf')} />
        {QUESTIONS.map((qq, i) => (
          <fieldset class="card border-0 shadow-sm mb-3 question"><div class="card-body">
            <legend class="fs-6 fw-medium mb-2"><span class="text-primary me-1">{i + 1}.</span>{qq.t}</legend>
            <div class="likert">
              {Object.entries(ECHELLE).map(([v, label]) => (
                <>
                  <input type="radio" class="btn-check" name={`q[${i}]`} id={`q${i}_${v}`} value={v} required checked={answers[i] === Number(v)} />
                  <label class="btn btn-outline-primary btn-sm" for={`q${i}_${v}`}>{label}</label>
                </>
              ))}
            </div>
          </div></fieldset>
        ))}
        <div class="text-end"><button class="btn btn-primary btn-lg"><i class="fa-solid fa-chart-simple me-1"></i>Voir mes résultats</button></div>
      </form>
    </div></div></div>
  ));
});

/* ---------- Recherche d'offres et candidature ---------- */
r.on(['GET', 'POST'], '/offres', async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  const [cvOk, testOk] = await Promise.all([cvComplet(db, m.id), testPasse(db, m.id)]);

  if (c.req.method === 'POST') {
    const offreId = Number(await field(c, 'offre_id', 12)) || 0;
    const o = await one<Row>(db,
      `SELECT o.*, r.nom_etablissement, u.email AS rec_email FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id
       JOIN utilisateurs u ON u.id = r.utilisateur_id WHERE o.id = ? AND o.active = 1 AND (o.date_limite IS NULL OR o.date_limite >= ${TODAY})`, offreId);
    if (!o) flash(c, 'danger', "Cette offre n'est plus disponible.");
    else if (!cvOk || !testOk) flash(c, 'warning', 'Complétez votre CV et passez le test de personnalité avant de postuler.');
    else if (await val(db, 'SELECT 1 FROM candidatures WHERE offre_id = ? AND candidat_id = ?', offreId, m.id)) flash(c, 'info', 'Vous avez déjà postulé à cette offre.');
    else {
      await run(db, 'INSERT INTO candidatures (offre_id, candidat_id) VALUES (?, ?)', offreId, m.id);
      sendMail(c, c.get('user')!.email, `Confirmation de candidature – ${o.titre}`,
        `<p>Bonjour ${esc(m.prenom)},</p><p>Votre candidature au poste <strong>${esc(o.titre)}</strong> chez <strong>${esc(o.nom_etablissement)}</strong> (${esc(o.ville)}) a bien été transmise.</p><p>Vous serez notifié(e) si l'établissement vous propose un entretien.</p>`);
      sendMail(c, o.rec_email, `Nouvelle candidature – ${o.titre}`,
        `<p>Bonjour,</p><p>Une nouvelle candidature (${refCandidat(m.id)} – ${esc(m.prenom + ' ' + m.nom)}) a été reçue pour votre offre <strong>${esc(o.titre)}</strong>.</p><p><a href="${esc(origin(c))}/recruteur/candidatures?offre=${offreId}">Voir les candidatures</a></p>`);
      flash(c, 'success', `Votre candidature au poste « ${o.titre} » a bien été envoyée ! Un email de confirmation vous a été adressé.`);
    }
    const back = new URL(c.req.url).search;
    return c.redirect(`/candidat/offres${back}#offre-${offreId}`, 302);
  }

  const posteQ = c.req.query('poste');
  const f = {
    poste: posteQ === undefined ? (m.poste_recherche ?? '') : inList(POSTES, posteQ) ? posteQ : '',
    ville: inList(GOUVERNORATS, q(c, 'ville')) ? q(c, 'ville') : '',
    contrat: inList(TYPES_CONTRAT, q(c, 'contrat')) ? q(c, 'contrat') : '',
    salaire_min: intOrNull(q(c, 'salaire_min')),
    rayon: rayonValide(q(c, 'rayon')),
  };
  // Le rayon se mesure depuis la ville choisie, sinon depuis celle du candidat
  const centre = f.ville || (inList(GOUVERNORATS, m.ville) ? m.ville as string : '');
  const villes = f.rayon && centre ? gouvernoratsDansRayon(centre, f.rayon) : undefined;
  const [res, dejaRows, comps] = await Promise.all([
    searchOffres(db, { ...f, villes }, Number(q(c, 'page')) || 1),
    all<Row>(db, 'SELECT offre_id FROM candidatures WHERE candidat_id = ?', m.id),
    all<Row>(db, 'SELECT nom FROM competences WHERE candidat_id = ?', m.id),
  ]);
  const deja = new Set(dejaRows.map((d) => d.offre_id));
  const validees = new Set(comps.map((x) => String(x.nom)));
  const csrf = c.get('csrf');
  return page(c, { title: 'Rechercher des offres', active: 'offres' }, (
    <div class="container py-4">
      <h1 class="h3 mb-3">Rechercher des offres</h1>
      {(!cvOk || !testOk) && (
        <div class="alert alert-warning">
          <i class="fa-solid fa-lock me-1"></i>Le bouton « Postuler » est verrouillé tant que votre profil n'est pas prêt :
          {!cvOk && <a class="btn btn-sm btn-warning ms-2" href="/candidat/cv">Compléter mon CV</a>}
          {!testOk && <a class="btn btn-sm btn-warning ms-2" href="/candidat/test">Passer le test de personnalité</a>}
        </div>
      )}
      <form class="card border-0 shadow-sm mb-4" method="get">
        <div class="card-body row g-2 align-items-end">
          <div class="col-md-3"><label class="form-label small">Poste</label><select name="poste" class="form-select"><Options items={POSTES} selected={f.poste} placeholder="Tous les postes" /></select></div>
          <div class="col-md-2"><label class="form-label small">Ville</label><select name="ville" class="form-select"><Options items={GOUVERNORATS} selected={f.ville} placeholder="Toutes" /></select></div>
          <div class="col-md-2"><label class="form-label small">Distance max.</label><select name="rayon" class="form-select">
            <option value="">Toute distance</option>
            {RAYONS.map((x) => <option value={x} selected={f.rayon === x}>{x} km</option>)}
          </select></div>
          <div class="col-md-2"><label class="form-label small">Contrat</label><select name="contrat" class="form-select"><Options items={TYPES_CONTRAT} selected={f.contrat} placeholder="Tous" /></select></div>
          <div class="col-md-2"><label class="form-label small">Salaire min. (TND)</label><input type="number" min="0" step="50" name="salaire_min" class="form-control" value={f.salaire_min ?? ''} /></div>
          <div class="col-md-1 d-grid"><button class="btn btn-primary" title="Filtrer" aria-label="Filtrer"><i class="fa-solid fa-filter"></i></button></div>
          {f.rayon && !centre && <div class="col-12 small text-warning">Choisissez une ville ou indiquez la vôtre dans votre CV pour filtrer par distance.</div>}
          {f.rayon && centre && <div class="col-12 small text-muted">Distance à vol d'oiseau depuis {centre}{f.ville ? '' : ' (votre ville)'}.</div>}
        </div>
      </form>
      <p class="text-muted">{res.total} offre(s) trouvée(s)</p>
      {!res.rows.length && <Empty icon="fa-regular fa-folder-open">Aucune offre ne correspond à vos critères. <a href="?poste=">Voir toutes les offres</a></Empty>}
      {res.rows.map((o) => (
        <OffreCard o={o} validees={validees} info={m.ville && distanceKm(m.ville, o.ville) !== null ? <span class="ms-1 small">({distanceKm(m.ville, o.ville) === 0 ? 'dans votre gouvernorat' : `≈ ${distanceKm(m.ville, o.ville)} km de chez vous`})</span> : undefined} actions={
          deja.has(o.id) ? <span class="btn btn-success disabled"><i class="fa-solid fa-check me-1"></i>Candidature envoyée</span>
          : !cvOk || !testOk ? (
            <>
              <button class="btn btn-secondary" disabled><i class="fa-solid fa-lock me-1"></i>Postuler</button>
              <div class="mt-2">
                {!cvOk && <a class="btn btn-sm btn-outline-warning d-block mb-1" href="/candidat/cv">Compléter mon CV</a>}
                {!testOk && <a class="btn btn-sm btn-outline-warning d-block" href="/candidat/test">Passer le test de personnalité</a>}
              </div>
            </>
          ) : (
            <form method="post" onsubmit="return confirm('Confirmer votre candidature à cette offre ?')">
              <Csrf token={csrf} /><input type="hidden" name="offre_id" value={o.id} />
              <button class="btn btn-primary"><i class="fa-solid fa-paper-plane me-1"></i>Postuler</button>
            </form>
          )
        } />
      ))}
      <Pagination page={res.page} pages={res.pages} query={cleanQuery({ ...f, poste: f.poste || '' })} />
    </div>
  ));
});

/* ---------- Mes entretiens ---------- */
r.on(['GET', 'POST'], '/entretiens', async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  if (c.req.method === 'POST') {
    const id = Number(await field(c, 'entretien_id', 12)) || 0;
    const action = await field(c, 'action', 20);
    const ent = await one<Row>(db,
      `SELECT e.*, o.titre, u.email AS rec_email FROM entretiens e JOIN recruteurs r ON r.id = e.recruteur_id
       JOIN utilisateurs u ON u.id = r.utilisateur_id LEFT JOIN offres o ON o.id = e.offre_id WHERE e.id = ? AND e.candidat_id = ?`, id, m.id);
    if (ent && (action === 'confirme' || action === 'refuse')) {
      await run(db, `UPDATE entretiens SET statut = ?, updated_at = ${NOW} WHERE id = ?`, action, id);
      const verbe = action === 'confirme' ? 'a <strong style="color:#198754">confirmé</strong>' : 'a <strong style="color:#dc3545">refusé</strong>';
      sendMail(c, ent.rec_email, "Réponse à votre proposition d'entretien",
        `<p>Bonjour,</p><p>Le candidat ${esc(m.prenom + ' ' + m.nom)} (${refCandidat(m.id)}) ${verbe} l'entretien du <strong>${dateFr(ent.date_debut)} (${plageHoraire(ent.date_debut, ent.date_fin)})</strong>${ent.titre ? ` pour le poste « ${esc(ent.titre)} »` : ''}.</p>`);
      flash(c, 'success', action === 'confirme' ? 'Entretien confirmé. Le recruteur a été notifié.' : 'Entretien refusé. Le recruteur a été notifié.');
    }
    return redirect(c, '/candidat/entretiens');
  }
  const rows = await all<Row>(db,
    `SELECT e.*, o.titre, r.nom_etablissement FROM entretiens e JOIN recruteurs r ON r.id = e.recruteur_id
     LEFT JOIN offres o ON o.id = e.offre_id WHERE e.candidat_id = ? ORDER BY e.date_debut DESC`, m.id);
  const now = tunis();
  const csrf = c.get('csrf');
  return page(c, { title: 'Mes entretiens' }, (
    <div class="container py-4">
      <h1 class="h3 mb-3"><i class="fa-solid fa-calendar-check text-primary me-2"></i>Mes entretiens</h1>
      {!rows.length && <Empty icon="fa-regular fa-calendar">Aucun entretien pour le moment. Les propositions des recruteurs apparaîtront ici.</Empty>}
      <div class="row g-3">
        {rows.map((e) => {
          const passe = (parseLocal(e.date_debut) ?? now) < now;
          return (
            <div class="col-md-6">
              <div class={`card border-0 shadow-sm h-100 interview-card status-${e.statut}`}><div class="card-body">
                <div class="d-flex justify-content-between"><h2 class="h5 mb-1">{e.titre || 'Entretien'}</h2><StatutEntretien s={e.statut} /></div>
                <p class="text-muted mb-2"><i class="fa-solid fa-hospital me-1"></i>{e.nom_etablissement}</p>
                <ul class="list-unstyled small mb-3">
                  <li><i class="fa-regular fa-calendar me-2 text-primary"></i>{dateFr(e.date_debut)} · <strong>{plageHoraire(e.date_debut, e.date_fin)}</strong></li>
                  <li><i class="fa-solid fa-location-dot me-2 text-primary"></i>{e.lieu}</li>
                  <li><i class="fa-solid fa-user-tie me-2 text-primary"></i>Contact : {e.contact}</li>
                </ul>
                {!passe && e.statut !== 'refuse' ? (
                  <form method="post" class="d-flex gap-2">
                    <Csrf token={csrf} /><input type="hidden" name="entretien_id" value={e.id} />
                    {e.statut !== 'confirme' && <button name="action" value="confirme" class="btn btn-success btn-sm"><i class="fa-solid fa-check me-1"></i>Valider</button>}
                    <button name="action" value="refuse" class="btn btn-outline-danger btn-sm" onclick="return confirm('Refuser cet entretien ?')"><i class="fa-solid fa-xmark me-1"></i>Refuser</button>
                  </form>
                ) : passe ? <span class="small text-muted">Entretien passé</span> : null}
              </div></div>
            </div>
          );
        })}
      </div>
    </div>
  ));
});

export default r;
