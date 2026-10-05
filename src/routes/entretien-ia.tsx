import { Hono } from 'hono';
import type { AppEnv, Row } from '../types';
import { NOW, one, run, val } from '../lib/db';
import { field, flash, readForm, redirect, requireRole, type Ctx } from '../lib/http';
import { currentCandidat } from '../lib/models';
import { parseLocal, tunis } from '../lib/dates';
import {
  AUDIO_MAX_OCTETS, DECOMPTE_SECONDES, DELAI_ENVOI_SECONDES, DUREE_MAX_SECONDES, NB_QUESTIONS,
  choisirQuestions, evaluer, iaDisponible, transcrire, type Reponse,
} from '../lib/entretien-ia';
import { page } from '../views/layout';
import { Csrf } from '../views/ui';
import { ResultatEntretienIa } from '../views/entretien-ia';

/**
 * Déroulé « comme en vrai » : la question n'est envoyée au navigateur qu'au moment où
 * l'enregistrement démarre (aucun temps de préparation), réponse uniquement orale.
 * Le serveur horodate l'affichage de chaque question : une réponse hors délai est refusée
 * et un rechargement de page pendant une question la compte « sans réponse ».
 */
const r = new Hono<AppEnv>();
r.use('*', requireRole('candidat'));

const MAX_PAR_JOUR = 2; // limite le quota gratuit de Workers AI
const SANS_REPONSE: Reponse = { texte: '', mode: 'oral', duree: 0, source: 'aucune' };

async function me(c: Ctx): Promise<Row> {
  const m = await currentCandidat(c.env.DB, c.get('user')!.id);
  if (!m) throw new Error('Profil candidat introuvable');
  return m;
}
const enCours = (c: Ctx, cid: number) => one<Row>(c.env.DB, "SELECT * FROM entretiens_ia WHERE candidat_id = ? AND statut = 'en_cours' ORDER BY id DESC LIMIT 1", cid);
const parse = <T,>(s: unknown, d: T): T => { try { return JSON.parse(String(s)) as T; } catch { return d; } };
const secondesDepuis = (debut: string | null) => {
  const d = parseLocal(debut);
  return d ? (tunis().getTime() - d.getTime()) / 1000 : Infinity;
};

/** Enregistre une réponse et clôt la question en cours (requête conditionnelle : pas de double écriture) */
async function enregistrer(c: Ctx, e: Row, reponses: Reponse[], rep: Reponse): Promise<boolean> {
  const avant = String(e.reponses ?? '[]');
  const { changes } = await run(c.env.DB,
    "UPDATE entretiens_ia SET reponses = ?, question_debut = NULL WHERE id = ? AND statut = 'en_cours' AND reponses = ?",
    JSON.stringify([...reponses, rep]), e.id, avant);
  return changes > 0;
}

/* ---------- Page principale ---------- */
r.get('/', async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  let courant = await enCours(c, m.id);
  const csrf = c.get('csrf');
  let interrompue = false;

  // Question affichée puis page rechargée ou quittée : comptée sans réponse
  if (courant?.question_debut) {
    const reponses = parse<Reponse[]>(courant.reponses, []);
    await enregistrer(c, courant, reponses, SANS_REPONSE);
    interrompue = true;
    courant = await enCours(c, m.id);
  }

  if (courant) {
    const questions = parse<string[]>(courant.questions, []);
    const reponses = parse<Reponse[]>(courant.reponses, []);
    const i = reponses.length;
    if (i >= questions.length) {
      return page(c, { title: 'Entretien IA' }, (
        <div class="container py-5"><div class="row justify-content-center"><div class="col-lg-7 text-center">
          {interrompue && <div class="alert alert-warning text-start small">La dernière question a été interrompue (page rechargée ou quittée) : elle est comptée sans réponse.</div>}
          <h1 class="h3">Toutes les questions sont terminées ✅</h1>
          <p class="text-muted">Lancez l'analyse pour obtenir votre évaluation.</p>
          <form method="post" action="/candidat/entretien-ia/terminer" class="ia-finish"><Csrf token={csrf} />
            <button class="btn btn-primary btn-lg"><i class="fa-solid fa-wand-magic-sparkles me-1"></i>Obtenir mon évaluation</button></form>
        </div></div></div>
      ));
    }
    return page(c, { title: `Entretien IA – question ${i + 1}`, scripts: <script src="/assets/js/entretien-ia.js"></script> }, (
      <div class="container py-4"><div class="row justify-content-center"><div class="col-lg-8">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h1 class="h4 mb-0"><i class="fa-solid fa-microphone-lines text-primary me-2"></i>Entretien IA</h1>
          <span class="badge text-bg-light border fs-6">Question {i + 1} / {questions.length}</span>
        </div>
        <div class="progress mb-4" style="height:6px"><div class="progress-bar" style={`width:${(i / questions.length) * 100}%`}></div></div>
        {interrompue && <div class="alert alert-warning small"><i class="fa-solid fa-triangle-exclamation me-1"></i>La question précédente a été interrompue (page rechargée ou quittée) : elle est comptée sans réponse.</div>}
        <div id="ia-app" class="card border-0 shadow-sm" data-index={i} data-total={questions.length} data-ai={iaDisponible(c.env) ? '1' : '0'}
          data-max={DUREE_MAX_SECONDES} data-decompte={DECOMPTE_SECONDES} data-csrf={csrf}>
          <div class="card-body p-4">
            <div data-step="pret">
              <p class="mb-2">Quand vous cliquerez sur <strong>« Afficher la question »</strong>, un décompte de {DECOMPTE_SECONDES} secondes démarre, puis <strong>la question s'affiche et l'enregistrement commence aussitôt</strong> : comme lors d'un vrai entretien, il n'y a pas de temps de préparation.</p>
              <ul class="small text-muted mb-3">
                <li>Répondez à voix haute, naturellement ({DUREE_MAX_SECONDES / 60} minutes maximum).</li>
                <li>Cliquez sur « Terminer ma réponse » quand vous avez fini.</li>
                <li><strong>Ne rechargez pas et ne quittez pas la page</strong> pendant une question : elle serait comptée sans réponse.</li>
              </ul>
              <button type="button" class="btn btn-primary btn-lg" data-action="pret"><i class="fa-solid fa-play me-2"></i>Afficher la question {i + 1}</button>
            </div>

            <div data-step="decompte" hidden class="text-center py-4">
              <p class="text-muted mb-1">La question s'affiche dans</p>
              <div class="ia-countdown" data-decompte-val aria-live="assertive">{DECOMPTE_SECONDES}</div>
            </div>

            <div data-step="enregistrement" hidden>
              <p class="text-uppercase small text-muted mb-1">Question {i + 1}</p>
              <p class="fs-5 fw-medium ia-question" data-question></p>
              <div class="d-flex flex-wrap align-items-center gap-3">
                <span class="ia-timer"><span class="ia-dot"></span>Enregistrement <span data-time>0:00</span> / {Math.floor(DUREE_MAX_SECONDES / 60)}:{String(DUREE_MAX_SECONDES % 60).padStart(2, '0')}</span>
                <button type="button" class="btn btn-dark" data-action="stop"><i class="fa-solid fa-stop me-2"></i>Terminer ma réponse</button>
              </div>
            </div>

            <div data-step="envoi" hidden class="text-center py-3">
              <div class="spinner-border text-primary mb-2" role="status"></div>
              <p class="mb-0">Envoi et transcription de votre réponse…</p>
            </div>

            <div data-step="resultat" hidden>
              <p class="small text-muted mb-1"><i class="fa-solid fa-check text-success me-1"></i>Réponse enregistrée. Transcription :</p>
              <div class="transcript mb-3" data-transcript></div>
              <button type="button" class="btn btn-primary" data-action="suivant">{i + 1 < questions.length ? 'Question suivante' : 'Terminer'} <i class="fa-solid fa-arrow-right ms-1"></i></button>
            </div>

            <div class="alert alert-danger mt-3 mb-0" data-erreur hidden></div>
            <button type="button" class="btn btn-outline-primary mt-2" data-action="renvoyer" hidden><i class="fa-solid fa-rotate-right me-1"></i>Réessayer l'envoi</button>
          </div>
        </div>
        <form method="post" action="/candidat/entretien-ia/abandonner" class="text-end mt-3" onsubmit="return confirm('Abandonner cet entretien ? Il sera compté dans la limite quotidienne.')">
          <Csrf token={csrf} /><button class="btn btn-link btn-sm text-muted">Abandonner l'entretien</button>
        </form>
      </div></div></div>
    ));
  }

  const dernier = await one<Row>(db, "SELECT * FROM entretiens_ia WHERE candidat_id = ? AND statut = 'termine' ORDER BY termine_le DESC, id DESC LIMIT 1", m.id);
  const nbJour = (await val<number>(db, `SELECT COUNT(*) FROM entretiens_ia WHERE candidat_id = ? AND created_at > datetime('now', '+1 hour', '-1 day')`, m.id)) ?? 0;
  const peutPasser = nbJour < MAX_PAR_JOUR;
  return page(c, { title: 'Entretien IA', scripts: <script src="/assets/js/entretien-ia.js"></script> }, (
    <div class="container py-4"><div class="row justify-content-center"><div class="col-lg-9">
      <h1 class="h3"><i class="fa-solid fa-microphone-lines text-primary me-2"></i>Entretien IA – communication</h1>
      {dernier && <ResultatEntretienIa e={dernier} titre="Mon dernier entretien IA" />}
      <div class="card border-0 shadow-sm"><div class="card-body p-4">
        <h2 class="h5">{dernier ? "Repasser l'entretien" : 'Comment ça marche ?'}</h2>
        <ul class="small">
          <li><strong>{NB_QUESTIONS} questions</strong> de mise en situation, adaptées à votre métier ({m.poste_recherche || 'poste non renseigné'}).</li>
          <li><strong>Comme lors d'un vrai entretien, il n'y a pas de temps de préparation</strong> : chaque question s'affiche au moment où l'enregistrement démarre, et vous ne la découvrez qu'à ce moment-là.</li>
          <li>Vous répondez <strong>uniquement à l'oral</strong>, au micro ({DUREE_MAX_SECONDES / 60} minutes maximum par question). Votre réponse est transcrite automatiquement.</li>
          <li>L'IA évalue votre <strong>communication</strong> : clarté, structure, empathie, vocabulaire professionnel et adaptation à l'interlocuteur.</li>
          <li>Prévoyez environ 15 minutes au calme, avec un micro (celui du téléphone ou de l'ordinateur suffit).</li>
        </ul>
        <div class="alert alert-light border small">
          <i class="fa-solid fa-shield-halved me-1 text-primary"></i><strong>Vos données :</strong> seul le <strong>texte</strong> de vos réponses est analysé et conservé ; l'enregistrement audio n'est pas stocké, et ni votre voix ni votre image ne sont évaluées. Le score est indicatif et ne bloque jamais une candidature. Vous pouvez repasser l'entretien ({MAX_PAR_JOUR} fois par 24 h maximum) : seul le dernier résultat est montré aux recruteurs.
        </div>
        {!iaDisponible(c.env) && <div class="alert alert-warning small"><i class="fa-solid fa-triangle-exclamation me-1"></i>L'IA n'est pas activée sur ce serveur : la transcription utilisera la reconnaissance vocale de votre navigateur (<strong>Chrome ou Edge obligatoires</strong>) et l'évaluation sera simplifiée.</div>}
        {peutPasser ? (
          <form method="post" action="/candidat/entretien-ia/demarrer" id="ia-start-form" data-ai={iaDisponible(c.env) ? '1' : '0'}>
            <Csrf token={c.get('csrf')} />
            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" id="consent" name="consentement" value="1" required />
              <label class="form-check-label small" for="consent">J'accepte que mes réponses orales soient transcrites et analysées automatiquement, et que le résultat soit visible par les recruteurs.</label>
            </div>
            <div class="alert alert-danger small" data-micro-erreur hidden></div>
            <button class="btn btn-primary btn-lg"><i class="fa-solid fa-microphone me-1"></i>Vérifier mon micro et commencer</button>
          </form>
        ) : <div class="alert alert-info small mb-0">Vous avez déjà passé {MAX_PAR_JOUR} entretiens ces dernières 24 heures. Réessayez demain.</div>}
      </div></div>
    </div></div></div>
  ));
});

/* ---------- Démarrer ---------- */
r.post('/demarrer', async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  if (!(await field(c, 'consentement', 2))) {
    flash(c, 'warning', "Merci d'accepter les conditions pour commencer l'entretien.");
    return redirect(c, '/candidat/entretien-ia');
  }
  if (await enCours(c, m.id)) return redirect(c, '/candidat/entretien-ia');
  const nbJour = (await val<number>(db, `SELECT COUNT(*) FROM entretiens_ia WHERE candidat_id = ? AND created_at > datetime('now', '+1 hour', '-1 day')`, m.id)) ?? 0;
  if (nbJour >= MAX_PAR_JOUR) {
    flash(c, 'info', `Vous avez déjà passé ${MAX_PAR_JOUR} entretiens ces dernières 24 heures. Réessayez demain.`);
    return redirect(c, '/candidat/entretien-ia');
  }
  await run(db, 'INSERT INTO entretiens_ia (candidat_id, poste, questions) VALUES (?, ?, ?)', m.id, m.poste_recherche ?? null, JSON.stringify(choisirQuestions(m.poste_recherche)));
  return redirect(c, '/candidat/entretien-ia');
});

/* ---------- Révéler la question (au démarrage de l'enregistrement) ---------- */
r.post('/question', async (c) => {
  const m = await me(c);
  const courant = await enCours(c, m.id);
  if (!courant) return c.json({ error: 'Aucun entretien en cours.', reload: true }, 409);
  const questions = parse<string[]>(courant.questions, []);
  const reponses = parse<Reponse[]>(courant.reponses, []);
  const index = Number((await readForm(c)).get('index'));
  if (index !== reponses.length || index >= questions.length) return c.json({ error: 'Question déjà traitée.', reload: true }, 409);
  // Une seule révélation par question : une deuxième demande (autre onglet, rechargement) ne la renvoie pas
  const { changes } = await run(c.env.DB,
    `UPDATE entretiens_ia SET question_debut = ${NOW} WHERE id = ? AND statut = 'en_cours' AND question_debut IS NULL AND reponses = ?`,
    courant.id, String(courant.reponses ?? '[]'));
  if (!changes) return c.json({ error: 'Cette question a déjà été affichée.', reload: true }, 409);
  return c.json({ question: questions[index] });
});

/* ---------- Enregistrer la réponse orale (appel AJAX) ---------- */
r.post('/reponse', async (c) => {
  const m = await me(c);
  const courant = await enCours(c, m.id);
  if (!courant) return c.json({ error: 'Aucun entretien en cours.', reload: true }, 409);
  const questions = parse<string[]>(courant.questions, []);
  const reponses = parse<Reponse[]>(courant.reponses, []);
  const fd = await readForm(c);
  const index = Number(fd.get('index'));
  if (index !== reponses.length || index >= questions.length || !courant.question_debut) {
    return c.json({ error: 'Cette question a déjà reçu une réponse ou n\'a pas été affichée. Rechargez la page.', reload: true }, 409);
  }
  const ecoule = secondesDepuis(courant.question_debut);
  if (ecoule > DUREE_MAX_SECONDES + DELAI_ENVOI_SECONDES) {
    await enregistrer(c, courant, reponses, SANS_REPONSE);
    return c.json({ error: 'Le temps de réponse est dépassé : cette question est comptée sans réponse.', reload: true }, 409);
  }
  // Durée déclarée bornée par le temps réellement écoulé depuis l'affichage de la question
  const duree = Math.max(0, Math.min(DUREE_MAX_SECONDES, Math.round(Number(fd.get('duree')) || 0), Math.ceil(ecoule)));
  let texte = '';
  let source = 'aucune';
  const audio = fd.get('audio');
  if (audio && typeof audio !== 'string' && audio.size > 0) {
    if (audio.size > AUDIO_MAX_OCTETS) return c.json({ error: 'Enregistrement trop volumineux.', retry: true }, 413);
    const t = await transcrire(c.env, await audio.arrayBuffer());
    if (t) { texte = t.slice(0, 4000); source = 'whisper'; }
  }
  if (!texte) {
    const nav = String(fd.get('transcript_navigateur') ?? '').trim().slice(0, 4000);
    if (nav) { texte = nav; source = 'navigateur'; }
  }
  // Rien d'audible : la question est comptée sans réponse (pas de seconde chance = pas de temps de préparation)
  const rep: Reponse = { texte, mode: 'oral', duree, source };
  if (!(await enregistrer(c, courant, reponses, rep))) return c.json({ error: 'Réponse déjà enregistrée. Rechargez la page.', reload: true }, 409);
  return c.json({ ok: true, transcription: texte, vide: !texte, derniere: reponses.length + 1 >= questions.length });
});

/* ---------- Terminer : évaluation ---------- */
r.post('/terminer', async (c) => {
  const m = await me(c);
  const courant = await enCours(c, m.id);
  if (!courant) return redirect(c, '/candidat/entretien-ia');
  const questions = parse<string[]>(courant.questions, []);
  const reponses = parse<Reponse[]>(courant.reponses, []);
  if (reponses.length < questions.length || courant.question_debut) return redirect(c, '/candidat/entretien-ia');
  const e = await evaluer(c.env, courant.poste ?? m.poste_recherche ?? '', questions, reponses);
  await run(c.env.DB,
    `UPDATE entretiens_ia SET statut = 'termine', clarte = ?, structure = ?, empathie = ?, vocabulaire = ?, adaptation = ?, score_global = ?,
       synthese = ?, points_forts = ?, conseils = ?, moteur = ?, termine_le = ${NOW} WHERE id = ?`,
    e.clarte, e.structure, e.empathie, e.vocabulaire, e.adaptation, e.score_global, e.synthese,
    JSON.stringify(e.points_forts), JSON.stringify(e.conseils), e.moteur, courant.id);
  flash(c, 'success', `Entretien terminé : votre score de communication est de ${e.score_global}/100.`);
  return redirect(c, '/candidat/entretien-ia');
});

r.post('/abandonner', async (c) => {
  const m = await me(c);
  // L'entretien reste compté dans la limite quotidienne ; les réponses sont effacées
  await run(c.env.DB, "UPDATE entretiens_ia SET statut = 'abandonne', reponses = '[]', question_debut = NULL WHERE candidat_id = ? AND statut = 'en_cours'", m.id);
  flash(c, 'info', 'Entretien abandonné.');
  return redirect(c, '/candidat/entretien-ia');
});

export default r;
