/* Entretien IA : enregistrement de la réponse orale, envoi et affichage de la transcription */
(function () {
  'use strict';
  const app = document.getElementById('ia-app');
  if (!app) return;
  const index = app.dataset.index;
  const total = Number(app.dataset.total);
  const ai = app.dataset.ai === '1';
  const max = Number(app.dataset.max) || 120;
  const csrf = app.dataset.csrf;
  const $ = (s) => app.querySelector(s);
  const steps = ['oral', 'ecrit', 'envoi', 'resultat'];
  const show = (name) => steps.forEach((s) => { $('[data-step="' + s + '"]').hidden = s !== name; });
  const erreur = (msg) => { const e = $('[data-erreur]'); e.textContent = msg || ''; e.hidden = !msg; };

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micOk = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  // Sans IA côté serveur, la transcription repose sur la reconnaissance vocale du navigateur
  if (!micOk || (!ai && !SR)) {
    show('ecrit');
    erreur(!micOk
      ? "Votre navigateur ne permet pas l'enregistrement audio : répondez par écrit."
      : "La transcription vocale n'est pas disponible sur ce navigateur (essayez Chrome ou Edge) : répondez par écrit.");
  }

  let rec = null, chunks = [], stream = null, recog = null, transcriptNav = '', t0 = 0, timer = null;

  function stopTimer() { clearInterval(timer); timer = null; }

  async function start() {
    erreur('');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch (e) {
      show('ecrit');
      erreur("Accès au micro refusé : autorisez le micro dans votre navigateur, ou répondez par écrit.");
      return;
    }
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    const mimeType = types.find((t) => window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    chunks = [];
    rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined);
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = envoyerAudio;
    rec.start(1000);
    if (!ai && SR) {
      transcriptNav = '';
      recog = new SR();
      recog.lang = 'fr-FR';
      recog.continuous = true;
      recog.interimResults = false;
      recog.onresult = (ev) => { for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) transcriptNav += ev.results[i][0].transcript + ' '; };
      recog.onerror = () => {};
      try { recog.start(); } catch (e) { /* déjà démarrée */ }
    }
    t0 = Date.now();
    $('[data-action="start"]').hidden = true;
    $('[data-action="stop"]').hidden = false;
    $('[data-action="ecrit"]').hidden = true;
    $('[data-timer]').hidden = false;
    timer = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      $('[data-time]').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      if (s >= max) stop();
    }, 250);
  }

  function stop() {
    stopTimer();
    if (recog) { try { recog.stop(); } catch (e) { /* */ } }
    if (rec && rec.state !== 'inactive') rec.stop();
    if (stream) stream.getTracks().forEach((t) => t.stop());
  }

  function resetOral() {
    show('oral');
    $('[data-action="start"]').hidden = false;
    $('[data-action="stop"]').hidden = true;
    $('[data-action="ecrit"]').hidden = false;
    $('[data-timer]').hidden = true;
    $('[data-time]').textContent = '0:00';
  }

  async function poster(fd) {
    show('envoi');
    erreur('');
    try {
      const r = await fetch('/candidat/entretien-ia/reponse', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        if (d.reload) { location.reload(); return; }
        throw new Error(d.error || 'Erreur lors de l\'envoi de la réponse.');
      }
      $('[data-transcript]').textContent = d.transcription;
      show('resultat');
    } catch (e) {
      erreur(e.message);
      return false;
    }
    return true;
  }

  async function envoyerAudio() {
    const duree = Math.round((Date.now() - t0) / 1000);
    if (duree < 3) { resetOral(); erreur('Réponse trop courte : réessayez.'); return; }
    // Laisse le temps à la reconnaissance vocale du navigateur de rendre son dernier résultat
    if (recog) await new Promise((res) => setTimeout(res, 800));
    const blob = new Blob(chunks, { type: (rec && rec.mimeType) || 'audio/webm' });
    const fd = new FormData();
    fd.append('index', index);
    fd.append('mode', 'oral');
    fd.append('duree', String(duree));
    fd.append('transcript_navigateur', transcriptNav.trim());
    if (ai) fd.append('audio', blob, 'reponse.' + ((rec && rec.mimeType || '').includes('mp4') ? 'mp4' : 'webm'));
    if (!(await poster(fd))) resetOral();
  }

  async function envoyerEcrit() {
    const texte = $('#ia-texte').value.trim();
    if (texte.split(/\s+/).length < 5) { erreur('Développez un peu plus votre réponse (quelques phrases).'); return; }
    const fd = new FormData();
    fd.append('index', index);
    fd.append('mode', 'ecrit');
    fd.append('texte', texte);
    if (!(await poster(fd))) show('ecrit');
  }

  app.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action;
    if (act === 'start') start();
    else if (act === 'stop') stop();
    else if (act === 'ecrit') { show('ecrit'); erreur(''); $('#ia-texte').focus(); }
    else if (act === 'envoyer-ecrit') envoyerEcrit();
    else if (act === 'suivant') location.reload();
  });
  window.addEventListener('beforeunload', (e) => { if (rec && rec.state === 'recording') { e.preventDefault(); e.returnValue = ''; } });
})();
