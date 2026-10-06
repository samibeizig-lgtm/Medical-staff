/*
 * Entretien IA – réponses orales uniquement, sans temps de préparation :
 * la question n'est demandée au serveur qu'à la fin du décompte, au moment où l'enregistrement démarre.
 */
(function () {
  'use strict';
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micDispo = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const AUDIO = { echoCancellation: true, noiseSuppression: true, channelCount: 1 };

  /* ---------- Page d'accueil : vérification du micro avant de commencer ---------- */
  const startForm = document.getElementById('ia-start-form');
  if (startForm) {
    const err = startForm.querySelector('[data-micro-erreur]');
    let verifie = false;
    startForm.addEventListener('submit', async (e) => {
      if (verifie) return;
      e.preventDefault();
      const msg = (t) => { err.textContent = t; err.hidden = false; };
      if (!micDispo) return msg("Votre navigateur ne permet pas d'enregistrer le micro. Utilisez Chrome, Edge, Firefox ou Safari récent.");
      if (startForm.dataset.ai !== '1' && !SR) return msg('La transcription vocale nécessite Chrome ou Edge sur ce serveur. Ouvrez la page avec l\'un de ces navigateurs.');
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: AUDIO });
        s.getTracks().forEach((t) => t.stop());
      } catch (ex) {
        return msg('Accès au micro refusé ou aucun micro détecté. Autorisez le micro dans votre navigateur puis réessayez.');
      }
      verifie = true;
      startForm.submit();
    });
  }

  /* ---------- Page de question ---------- */
  const app = document.getElementById('ia-app');
  if (!app) return;
  const index = app.dataset.index;
  const ai = app.dataset.ai === '1';
  const max = Number(app.dataset.max) || 120;
  const decompte = Number(app.dataset.decompte) || 3;
  const csrf = app.dataset.csrf;
  const $ = (s) => app.querySelector(s);
  const steps = ['pret', 'decompte', 'lecture', 'enregistrement', 'envoi', 'resultat'];
  const show = (name) => steps.forEach((s) => { $('[data-step="' + s + '"]').hidden = s !== name; });
  const erreur = (msg) => { const e = $('[data-erreur]'); e.textContent = msg || ''; e.hidden = !msg; };

  let rec = null, chunks = [], stream = null, recog = null, transcriptNav = '', t0 = 0, timer = null, envoiFd = null, enCours = false;

  /* ---------- Lecture de la question à voix haute (voix féminine du navigateur) ---------- */
  const tts = window.speechSynthesis;
  const caseVoix = $('[data-voix]');
  try { if (localStorage.getItem('ms_ia_voix') === '0') caseVoix.checked = false; } catch (e) { /* stockage indisponible */ }
  if (!tts) { caseVoix.checked = false; caseVoix.disabled = true; caseVoix.closest('.form-check').title = 'Lecture vocale non disponible sur ce navigateur'; }
  caseVoix.addEventListener('change', () => { try { localStorage.setItem('ms_ia_voix', caseVoix.checked ? '1' : '0'); } catch (e) { /* */ } });

  const FEMININES = /denise|julie|hortense|eloise|vivienne|brigitte|coralie|jacqueline|yvette|am[eé]lie|audrey|aur[eé]lie|marie|virginie|c[eé]line|l[eé]a\b|chantal|sylvie|charlotte|female|femme|google fran[cç]ais/i;
  const MASCULINES = /thomas|paul|henri|claude|jean|nicolas|daniel|r[eé]my|antoine|j[eé]r[oô]me|mathieu|fabrice|guillaume|alain|gerard|male\b|homme/i;
  function voixFeminine() {
    const fr = (tts ? tts.getVoices() : []).filter((v) => /^fr/i.test(v.lang));
    const note = (v) => (FEMININES.test(v.name) ? 10 : 0) - (MASCULINES.test(v.name) ? 20 : 0)
      + (/natural|online|neural|premium|enhanced/i.test(v.name) ? 3 : 0) + (/fr[-_]FR/i.test(v.lang) ? 1 : 0);
    return fr.sort((a, b) => note(b) - note(a))[0] || null;
  }
  if (tts) { tts.getVoices(); tts.addEventListener && tts.addEventListener('voiceschanged', () => tts.getVoices()); }

  /** Lit le texte ; la promesse se résout à la fin de la lecture (ou au clic sur « Répondre maintenant ») */
  let finLecture = null;
  function lire(texte) {
    return new Promise((resolve) => {
      let fini = false;
      const terminer = () => { if (fini) return; fini = true; clearTimeout(garde); try { tts.cancel(); } catch (e) { /* */ } finLecture = null; resolve(); };
      finLecture = terminer;
      // Sécurité : certains navigateurs n'émettent jamais la fin de lecture
      const garde = setTimeout(terminer, Math.min(30000, 2500 + texte.length * 90));
      try {
        const u = new SpeechSynthesisUtterance(texte);
        const v = voixFeminine();
        if (v) { try { u.voice = v; } catch (e) { /* voix inutilisable : voix par défaut */ } }
        u.lang = (v && v.lang) || 'fr-FR';
        u.rate = 0.95;
        // Voix féminine introuvable : on adoucit la voix française par défaut
        u.pitch = v && FEMININES.test(v.name) ? 1 : 1.15;
        u.onend = () => setTimeout(terminer, 300);
        u.onerror = terminer;
        tts.cancel();
        tts.speak(u);
      } catch (e) { terminer(); }
    });
  }

  function bloquerSortie(e) { if (enCours) { e.preventDefault(); e.returnValue = ''; } }
  window.addEventListener('beforeunload', bloquerSortie);

  async function post(url, fd) {
    const r = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf } });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, d };
  }

  async function pret() {
    erreur('');
    if (!micDispo || (!ai && !SR)) return erreur('Micro ou transcription indisponible sur ce navigateur : utilisez Chrome ou Edge.');
    // Le micro est ouvert AVANT d'afficher la question : aucun délai entre lecture et enregistrement
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO });
    } catch (e) {
      return erreur('Accès au micro refusé. Autorisez le micro dans votre navigateur puis cliquez à nouveau.');
    }
    // Débloque la synthèse vocale pendant le clic (exigence de certains navigateurs)
    const avecVoix = !!(tts && caseVoix.checked);
    if (avecVoix) { try { tts.cancel(); tts.speak(new SpeechSynthesisUtterance('')); } catch (e) { /* */ } }
    show('decompte');
    for (let n = decompte; n > 0; n--) {
      $('[data-decompte-val]').textContent = n;
      await new Promise((res) => setTimeout(res, 1000));
    }
    const fd = new FormData();
    fd.append('index', index);
    const { ok, d } = await post('/candidat/entretien-ia/question', fd);
    if (!ok || !d.question) {
      stream.getTracks().forEach((t) => t.stop());
      if (d.reload) { location.reload(); return; }
      show('pret');
      return erreur(d.error || 'Impossible d\'afficher la question. Réessayez.');
    }
    $('[data-question]').textContent = d.question;
    if (avecVoix) {
      // La question est lue AVANT l'enregistrement : la voix de synthèse n'est pas captée par le micro
      $('[data-question-lecture]').textContent = d.question;
      show('lecture');
      await lire(d.question);
    }
    demarrerEnregistrement();
    show('enregistrement');
  }

  function demarrerEnregistrement() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    chunks = [];
    rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined);
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = preparerEnvoi;
    rec.start(1000);
    if (!ai && SR) {
      transcriptNav = '';
      recog = new SR();
      recog.lang = 'fr-FR';
      recog.continuous = true;
      recog.interimResults = false;
      recog.onresult = (ev) => { for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) transcriptNav += ev.results[i][0].transcript + ' '; };
      // La reconnaissance du navigateur s'arrête parfois après un silence : on la relance
      recog.onend = () => { if (rec && rec.state === 'recording') { try { recog.start(); } catch (e) { /* */ } } };
      try { recog.start(); } catch (e) { /* déjà démarrée */ }
    }
    enCours = true;
    t0 = Date.now();
    timer = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      $('[data-time]').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      if (s >= max) stop();
    }, 250);
  }

  function stop() {
    clearInterval(timer);
    if (recog) { const r = recog; recog = null; try { r.onend = null; r.stop(); } catch (e) { /* */ } }
    if (rec && rec.state !== 'inactive') rec.stop();
    if (stream) stream.getTracks().forEach((t) => t.stop());
  }

  async function preparerEnvoi() {
    const duree = Math.min(max, Math.round((Date.now() - t0) / 1000));
    // Laisse à la reconnaissance vocale du navigateur le temps de rendre son dernier résultat
    if (!ai) await new Promise((res) => setTimeout(res, 900));
    const blob = new Blob(chunks, { type: (rec && rec.mimeType) || 'audio/webm' });
    envoiFd = new FormData();
    envoiFd.append('index', index);
    envoiFd.append('duree', String(duree));
    envoiFd.append('transcript_navigateur', transcriptNav.trim());
    if (ai) envoiFd.append('audio', blob, 'reponse.' + ((rec && rec.mimeType || '').includes('mp4') ? 'mp4' : 'webm'));
    envoyer();
  }

  async function envoyer() {
    show('envoi');
    erreur('');
    $('[data-action="renvoyer"]').hidden = true;
    let res;
    try {
      res = await post('/candidat/entretien-ia/reponse', envoiFd);
    } catch (e) {
      // Coupure réseau : la réponse est conservée dans la page, on peut renvoyer (dans le délai autorisé)
      show('envoi');
      $('[data-step="envoi"]').hidden = true;
      erreur('Connexion interrompue pendant l\'envoi. Vérifiez votre connexion puis réessayez (ne rechargez pas la page).');
      $('[data-action="renvoyer"]').hidden = false;
      return;
    }
    const { ok, d } = res;
    if (!ok || !d.ok) {
      if (d.retry) {
        $('[data-step="envoi"]').hidden = true;
        erreur(d.error || 'Erreur lors de l\'envoi.');
        $('[data-action="renvoyer"]').hidden = false;
        return;
      }
      enCours = false;
      if (d.reload) { alert(d.error || 'Rechargement nécessaire.'); location.reload(); return; }
      $('[data-step="envoi"]').hidden = true;
      return erreur(d.error || 'Erreur lors de l\'envoi.');
    }
    enCours = false;
    $('[data-transcript]').textContent = d.vide ? '(Aucune réponse audible n\'a été détectée : cette question est comptée sans réponse.)' : d.transcription;
    show('resultat');
  }

  app.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action;
    if (act === 'pret') { a.disabled = true; pret().finally(() => { a.disabled = false; }); }
    else if (act === 'stop') stop();
    else if (act === 'repondre') { if (finLecture) finLecture(); }
    else if (act === 'renvoyer') envoyer();
    else if (act === 'suivant') location.reload();
  });
})();
