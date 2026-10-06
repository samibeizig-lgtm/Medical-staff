import { Hono } from 'hono';
import type { AppEnv, Row } from '../types';
import { all, NOW, one, run, stmt, val } from '../lib/db';
import { field, flash, readForm, redirect, requireRole, type Ctx } from '../lib/http';
import { currentCandidat } from '../lib/models';
import { dateFr, parseLocal, tunis } from '../lib/dates';
import {
  COMPETENCES_PAR_SESSION, MARGE_SECONDES, MAX_SESSIONS_SEMAINE, QUESTIONS_PAR_COMPETENCE, SECONDES_PAR_QUESTION, SEUIL_VALIDATION,
  familleQcm, questionAffichee, resultats, tirerQuestions, type QuestionTiree, type ReponseQcm, type ResultatCompetence,
} from '../lib/qcm';
import { page } from '../views/layout';
import { Csrf } from '../views/ui';

/**
 * QCM de compétences chronométré.
 * Le serveur horodate l'affichage de chaque question : une réponse arrivée après
 * 30 s (+ marge réseau) est comptée fausse, les questions s'enchaînent sans retour en arrière
 * et la bonne réponse n'est jamais envoyée au navigateur.
 */
const r = new Hono<AppEnv>();
r.use('*', requireRole('candidat'));

const BASE = '/candidat/qcm';
const SEMAINE = `datetime('now', '+1 hour', '-7 days')`;

async function me(c: Ctx): Promise<Row> {
  const m = await currentCandidat(c.env.DB, c.get('user')!.id);
  if (!m) throw new Error('Profil candidat introuvable');
  return m;
}
const enCours = (c: Ctx, cid: number) => one<Row>(c.env.DB, "SELECT * FROM qcm_sessions WHERE candidat_id = ? AND statut = 'en_cours' ORDER BY id DESC LIMIT 1", cid);
const parse = <T,>(s: unknown, d: T): T => { try { return JSON.parse(String(s)) as T; } catch { return d; } };
const secondesDepuis = (debut: string | null) => {
  const d = parseLocal(debut);
  return d ? (tunis().getTime() - d.getTime()) / 1000 : Infinity;
};
const nbSemaine = async (c: Ctx, cid: number) => (await val<number>(c.env.DB, `SELECT COUNT(*) FROM qcm_sessions WHERE candidat_id = ? AND created_at > ${SEMAINE}`, cid)) ?? 0;

/**
 * Enregistre la réponse à la question en cours (requête conditionnelle : une seule écriture par question)
 * et démarre aussitôt le chrono de la suivante si `enchainer` est vrai.
 */
async function enregistrer(c: Ctx, s: Row, reponses: ReponseQcm[], rep: ReponseQcm, enchainer: boolean): Promise<boolean> {
  const n = parse<QuestionTiree[]>(s.questions, []).length;
  const suivante = enchainer && reponses.length + 1 < n;
  const { changes } = await run(c.env.DB,
    `UPDATE qcm_sessions SET reponses = ?, question_debut = ${suivante ? NOW : 'NULL'} WHERE id = ? AND statut = 'en_cours' AND reponses = ?`,
    JSON.stringify([...reponses, rep]), s.id, String(s.reponses ?? '[]'));
  return changes > 0;
}

/** Clôture : score, résultats par compétence et compétences validées (une validation acquise reste acquise) */
async function finaliser(c: Ctx, s: Row): Promise<ResultatCompetence[]> {
  const questions = parse<QuestionTiree[]>(s.questions, []);
  const reponses = parse<ReponseQcm[]>(s.reponses, []);
  const res = resultats(questions, reponses);
  const score = Math.round((100 * reponses.filter((x) => x.ok).length) / Math.max(1, questions.length));
  const db = c.env.DB;
  const ops = [stmt(db, `UPDATE qcm_sessions SET statut = 'termine', score = ?, resultats = ?, question_debut = NULL, termine_le = ${NOW} WHERE id = ? AND statut = 'en_cours'`,
    score, JSON.stringify(res), s.id)];
  for (const x of res.filter((x) => x.validee)) {
    ops.push(stmt(db,
      `INSERT INTO competences (candidat_id, nom, bonnes, total, valide_le, qcm_id) VALUES (?, ?, ?, ?, ${NOW}, ?)
       ON CONFLICT (candidat_id, nom) DO UPDATE SET bonnes = excluded.bonnes, total = excluded.total, valide_le = excluded.valide_le, qcm_id = excluded.qcm_id`,
      s.candidat_id, x.nom, x.bonnes, x.total, s.id));
  }
  await db.batch(ops);
  return res;
}

function ResultatsQcm({ s }: { s: Row }) {
  const res = parse<ResultatCompetence[]>(s.resultats, []);
  const ok = res.filter((x) => x.validee).length;
  return (
    <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 class="h5 mb-0">Dernier QCM <small class="text-muted fw-normal">– {dateFr(s.termine_le)}</small></h2>
        <span class="badge text-bg-light border fs-6">{s.score} % de bonnes réponses</span>
      </div>
      <p class="small text-muted">{ok} compétence(s) validée(s) sur {res.length}. Une compétence est validée avec au moins {SEUIL_VALIDATION} bonnes réponses sur {QUESTIONS_PAR_COMPETENCE}.</p>
      <ul class="list-group list-group-flush">
        {res.map((x) => (
          <li class="list-group-item d-flex justify-content-between align-items-center px-0">
            <span>{x.validee ? <i class="fa-solid fa-circle-check text-success me-2"></i> : <i class="fa-solid fa-circle-xmark text-danger me-2"></i>}{x.nom}</span>
            <span class={`small fw-semibold ${x.validee ? 'text-success' : 'text-danger'}`}>{x.bonnes}/{x.total}</span>
          </li>
        ))}
      </ul>
    </div></div>
  );
}

/* ---------- Page principale ---------- */
r.get('/', async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  const csrf = c.get('csrf');
  let s = await enCours(c, m.id);

  if (s) {
    const questions = parse<QuestionTiree[]>(s.questions, []);
    let reponses = parse<ReponseQcm[]>(s.reponses, []);
    let horsDelai = false;
    // Question affichée mais restée sans réponse dans le temps imparti (page quittée) : comptée fausse
    if (s.question_debut && secondesDepuis(s.question_debut) > SECONDES_PAR_QUESTION + MARGE_SECONDES) {
      await enregistrer(c, s, reponses, { choix: null, ok: false, duree: SECONDES_PAR_QUESTION }, false);
      horsDelai = true;
      s = (await enCours(c, m.id))!;
      reponses = parse<ReponseQcm[]>(s.reponses, []);
    }
    const i = reponses.length;
    if (i >= questions.length) {
      await finaliser(c, s);
      return redirect(c, BASE);
    }
    const entete = (
      <>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h1 class="h4 mb-0"><i class="fa-solid fa-list-check text-primary me-2"></i>QCM de compétences</h1>
          <span class="badge text-bg-light border fs-6">Question {i + 1} / {questions.length}</span>
        </div>
        <div class="progress mb-4" style="height:6px"><div class="progress-bar" style={`width:${(i / questions.length) * 100}%`}></div></div>
      </>
    );
    if (!s.question_debut) {
      // Pause : la question précédente a expiré pendant une absence
      return page(c, { title: 'QCM de compétences' }, (
        <div class="container py-4"><div class="row justify-content-center"><div class="col-lg-8">
          {entete}
          <div class="card border-0 shadow-sm"><div class="card-body p-4 text-center">
            {horsDelai && <div class="alert alert-warning small text-start"><i class="fa-solid fa-hourglass-end me-1"></i>Le temps de la question précédente est écoulé : elle est comptée fausse.</div>}
            <p>La question {i + 1} s'affichera avec un chrono de <strong>{SECONDES_PAR_QUESTION} secondes</strong>.</p>
            <form method="post" action={`${BASE}/afficher`}><Csrf token={csrf} /><input type="hidden" name="index" value={i} />
              <button class="btn btn-primary btn-lg"><i class="fa-solid fa-play me-2"></i>Afficher la question {i + 1}</button></form>
          </div></div>
          <form method="post" action={`${BASE}/abandonner`} class="text-end mt-3" onsubmit="return confirm('Abandonner ce QCM ? Il sera compté dans la limite hebdomadaire.')">
            <Csrf token={csrf} /><button class="btn btn-link btn-sm text-muted">Abandonner le QCM</button>
          </form>
        </div></div></div>
      ));
    }
    const t = questions[i];
    const q = questionAffichee(t);
    const restant = Math.max(1, Math.ceil(SECONDES_PAR_QUESTION - secondesDepuis(s.question_debut)));
    return page(c, { title: `QCM – question ${i + 1}`, scripts: <script src="/assets/js/qcm.js"></script> }, (
      <div class="container py-4"><div class="row justify-content-center"><div class="col-lg-8">
        {entete}
        <form method="post" action={`${BASE}/repondre`} id="qcm-form" class="card border-0 shadow-sm" data-restant={restant} data-total={SECONDES_PAR_QUESTION}>
          <div class="card-body p-4">
            <Csrf token={csrf} /><input type="hidden" name="index" value={i} />
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="small text-muted text-uppercase">{t.c}</span>
              <span class="qcm-chrono" aria-live="polite"><i class="fa-regular fa-clock me-1"></i><span data-chrono>{restant}</span> s</span>
            </div>
            <div class="progress qcm-barre mb-3" role="progressbar" aria-label="Temps restant"><div class="progress-bar" data-barre style={`width:${(restant / SECONDES_PAR_QUESTION) * 100}%`}></div></div>
            <fieldset>
              <legend class="fs-5 fw-medium mb-3">{q?.enonce ?? 'Question indisponible'}</legend>
              {(q?.choix ?? []).map((ch, k) => (
                <div class="qcm-choix">
                  <input class="btn-check" type="radio" name="choix" id={`ch${k}`} value={k} autocomplete="off" />
                  <label class="btn btn-outline-primary w-100 text-start" for={`ch${k}`}><span class="qcm-lettre">{'ABCD'[k]}</span>{ch}</label>
                </div>
              ))}
            </fieldset>
            <div class="d-flex justify-content-between align-items-center mt-3">
              <small class="text-muted">Sans réponse à la fin du chrono, la question est comptée fausse.</small>
              <button class="btn btn-primary" data-valider>Valider <i class="fa-solid fa-arrow-right ms-1"></i></button>
            </div>
          </div>
        </form>
      </div></div></div>
    ));
  }

  /* Accueil du QCM */
  const famille = familleQcm(m.poste_recherche);
  const [validees, dernier, nb] = await Promise.all([
    all<Row>(db, 'SELECT nom, bonnes, total, valide_le FROM competences WHERE candidat_id = ? ORDER BY valide_le DESC, nom', m.id),
    one<Row>(db, "SELECT * FROM qcm_sessions WHERE candidat_id = ? AND statut = 'termine' ORDER BY id DESC LIMIT 1", m.id),
    nbSemaine(c, m.id),
  ]);
  const prochain = nb >= MAX_SESSIONS_SEMAINE
    ? await val<string>(db, `SELECT MIN(datetime(created_at, '+7 days')) FROM qcm_sessions WHERE candidat_id = ? AND created_at > ${SEMAINE}`, m.id)
    : null;
  return page(c, { title: 'QCM de compétences' }, (
    <div class="container py-4"><div class="row justify-content-center"><div class="col-lg-9">
      <h1 class="h3"><i class="fa-solid fa-list-check text-primary me-2"></i>QCM de compétences</h1>
      <p class="text-muted">Sur medicalstaff.tn, vos compétences ne sont pas déclarées : elles sont <strong>vérifiées par QCM</strong>. Seules les compétences validées apparaissent sur votre CV et comptent dans le matching (45 % du score).</p>
      {dernier && <ResultatsQcm s={dernier} />}
      <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
        <h2 class="h5">Mes compétences validées <span class="badge text-bg-success ms-1">{validees.length}</span></h2>
        {validees.length ? (
          <div>{validees.map((k) => <span class="badge rounded-pill bg-success-subtle text-success me-1 mb-1" title={`Validée le ${dateFr(k.valide_le)} (${k.bonnes}/${k.total})`}><i class="fa-solid fa-circle-check me-1"></i>{k.nom}</span>)}</div>
        ) : <p class="text-muted small mb-0">Aucune compétence validée pour l'instant.</p>}
      </div></div>
      <div class="card border-0 shadow-sm"><div class="card-body p-4">
        <h2 class="h5">{dernier ? 'Passer un nouveau QCM' : 'Comment ça marche ?'}</h2>
        <ul class="small">
          <li><strong>{COMPETENCES_PAR_SESSION * QUESTIONS_PAR_COMPETENCE} questions tirées au hasard</strong> : {QUESTIONS_PAR_COMPETENCE} questions sur chacune de {COMPETENCES_PAR_SESSION} compétences, dont celles de votre métier (<strong>{famille.label}</strong>, d'après le poste recherché) et du tronc commun (hygiène, urgences, sécurité du patient, secret professionnel).</li>
          <li><strong>{SECONDES_PAR_QUESTION} secondes par question</strong>, les questions s'enchaînent automatiquement, sans retour en arrière. Ne quittez pas la page : une question sans réponse est comptée fausse.</li>
          <li>Une compétence est <strong>validée</strong> avec au moins {SEUIL_VALIDATION} bonnes réponses sur {QUESTIONS_PAR_COMPETENCE}. Une compétence validée le reste ; les QCM suivants portent en priorité sur les compétences que vous n'avez pas encore validées.</li>
          <li>{MAX_SESSIONS_SEMAINE} QCM par semaine au maximum. Les bonnes réponses ne sont pas communiquées.</li>
        </ul>
        {!m.poste_recherche ? (
          <div class="alert alert-info small mb-0">Indiquez d'abord le <strong>poste recherché</strong> dans <a href="/candidat/cv">votre CV</a> : les questions dépendent de votre métier.</div>
        ) : prochain ? (
          <div class="alert alert-info small mb-0">Vous avez déjà passé {MAX_SESSIONS_SEMAINE} QCM ces 7 derniers jours. Prochain QCM possible le {dateFr(prochain, true)}.</div>
        ) : (
          <form method="post" action={`${BASE}/demarrer`}>
            <Csrf token={csrf} />
            <p class="small text-muted">Métier : <strong>{m.poste_recherche}</strong>. Prévoyez environ 8 minutes sans interruption.</p>
            <button class="btn btn-primary btn-lg"><i class="fa-solid fa-stopwatch me-1"></i>Commencer le QCM</button>
          </form>
        )}
      </div></div>
    </div></div></div>
  ));
});

/* ---------- Démarrer : la première question s'affiche immédiatement ---------- */
r.post('/demarrer', async (c) => {
  const m = await me(c);
  if (await enCours(c, m.id)) return redirect(c, BASE);
  if (!m.poste_recherche) {
    flash(c, 'warning', 'Indiquez le poste recherché dans votre CV avant de passer le QCM.');
    return redirect(c, '/candidat/cv');
  }
  if ((await nbSemaine(c, m.id)) >= MAX_SESSIONS_SEMAINE) {
    flash(c, 'info', `Vous avez déjà passé ${MAX_SESSIONS_SEMAINE} QCM ces 7 derniers jours.`);
    return redirect(c, BASE);
  }
  const deja = new Set((await all<Row>(c.env.DB, 'SELECT nom FROM competences WHERE candidat_id = ?', m.id)).map((x) => String(x.nom)));
  await run(c.env.DB, `INSERT INTO qcm_sessions (candidat_id, famille, questions, question_debut) VALUES (?, ?, ?, ${NOW})`,
    m.id, familleQcm(m.poste_recherche).cle, JSON.stringify(tirerQuestions(m.poste_recherche, deja)));
  return redirect(c, BASE);
});

/* ---------- Reprendre après une pause ---------- */
r.post('/afficher', async (c) => {
  const m = await me(c);
  const s = await enCours(c, m.id);
  if (s && !s.question_debut && Number(await field(c, 'index', 5)) === parse<ReponseQcm[]>(s.reponses, []).length) {
    await run(c.env.DB, `UPDATE qcm_sessions SET question_debut = ${NOW} WHERE id = ? AND question_debut IS NULL AND reponses = ?`, s.id, String(s.reponses));
  }
  return redirect(c, BASE);
});

/* ---------- Répondre ---------- */
r.post('/repondre', async (c) => {
  const m = await me(c);
  const s = await enCours(c, m.id);
  if (!s) return redirect(c, BASE);
  const questions = parse<QuestionTiree[]>(s.questions, []);
  const reponses = parse<ReponseQcm[]>(s.reponses, []);
  const fd = await readForm(c);
  const index = Number(fd.get('index'));
  if (index !== reponses.length || index >= questions.length || !s.question_debut) {
    flash(c, 'warning', 'Cette question a déjà été traitée : impossible de revenir en arrière.');
    return redirect(c, BASE);
  }
  const ecoule = secondesDepuis(s.question_debut);
  const pos = String(fd.get('choix') ?? '');
  const t = questions[index];
  let rep: ReponseQcm;
  if (ecoule > SECONDES_PAR_QUESTION + MARGE_SECONDES) {
    rep = { choix: null, ok: false, duree: SECONDES_PAR_QUESTION };
    flash(c, 'warning', 'Temps écoulé : la réponse est arrivée trop tard et la question est comptée fausse.');
  } else {
    const origine = /^[0-3]$/.test(pos) ? t.ordre[Number(pos)] : null;
    rep = { choix: origine ?? null, ok: origine === 0, duree: Math.min(SECONDES_PAR_QUESTION, Math.round(ecoule)) };
  }
  if (!(await enregistrer(c, s, reponses, rep, true))) return redirect(c, BASE);
  if (index + 1 >= questions.length) {
    const res = await finaliser(c, (await one<Row>(c.env.DB, 'SELECT * FROM qcm_sessions WHERE id = ?', s.id))!);
    const ok = res.filter((x) => x.validee).length;
    flash(c, ok ? 'success' : 'info', ok ? `QCM terminé : ${ok} compétence(s) validée(s) sur ${res.length}.` : 'QCM terminé : aucune compétence validée cette fois-ci. Vous pourrez réessayer.');
  }
  return redirect(c, BASE);
});

r.post('/abandonner', async (c) => {
  const m = await me(c);
  // Le QCM abandonné reste compté dans la limite hebdomadaire
  await run(c.env.DB, "UPDATE qcm_sessions SET statut = 'abandonne', question_debut = NULL WHERE candidat_id = ? AND statut = 'en_cours'", m.id);
  flash(c, 'info', 'QCM abandonné.');
  return redirect(c, BASE);
});

export default r;
