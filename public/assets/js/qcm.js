/* QCM chronométré : décompte affiché et envoi automatique à la fin du temps (le serveur fait foi). */
(function () {
  'use strict';
  const form = document.getElementById('qcm-form');
  if (!form) return;
  const total = Number(form.dataset.total) || 30;
  const fin = Date.now() + (Number(form.dataset.restant) || total) * 1000;
  const chrono = form.querySelector('[data-chrono]');
  const barre = form.querySelector('[data-barre]');
  let envoye = false;
  function envoyer() {
    if (envoye) return;
    envoye = true;
    form.querySelector('[data-valider]').disabled = true;
    form.submit();
  }
  form.addEventListener('submit', (e) => {
    if (envoye) { e.preventDefault(); return; }
    envoye = true;
    form.querySelector('[data-valider]').disabled = true;
  });
  const tick = () => {
    const s = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
    chrono.textContent = s;
    barre.style.width = (100 * s / total) + '%';
    form.classList.toggle('qcm-urgent', s <= 5);
    if (s <= 0) { clearInterval(timer); envoyer(); }
  };
  const timer = setInterval(tick, 250);
  tick();
  // Double-clic sur un choix : validation immédiate
  form.querySelectorAll('.qcm-choix label').forEach((l) => l.addEventListener('dblclick', () => { document.getElementById(l.htmlFor).checked = true; envoyer(); }));
})();
