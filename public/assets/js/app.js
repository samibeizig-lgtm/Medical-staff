(function () {
  'use strict';
  // Répéteurs (diplômes, expériences, langues)
  let counter = 1000;
  document.querySelectorAll('.repeater-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = document.getElementById(btn.dataset.target);
      const container = document.querySelector('.repeater[data-template="' + btn.dataset.target + '"]');
      const html = tpl.innerHTML.replaceAll('__i__', String(counter++));
      container.insertAdjacentHTML('beforeend', html);
    });
  });
  document.addEventListener('click', e => {
    const rm = e.target.closest('.repeater-remove');
    if (rm) rm.closest('.repeater-item').remove();
  });
  // Case « poste actuel » : désactive la date de fin
  document.addEventListener('change', e => {
    if (e.target.classList.contains('exp-actuel')) {
      const fin = e.target.closest('.repeater-item').querySelector('.exp-fin');
      fin.disabled = e.target.checked;
      if (e.target.checked) fin.value = '';
    }
  });
  // Photo : aperçu + redimensionnement dans le navigateur (400 px max, JPEG) avant l'envoi
  const photo = document.getElementById('photo-input');
  if (photo) {
    photo.addEventListener('change', () => {
      const f = photo.files[0];
      if (!f) return;
      if (!/^image\/(jpeg|png|gif)$/.test(f.type)) { alert('Format de photo non autorisé (JPG, PNG ou GIF).'); photo.value = ''; return; }
      const limite = Number(photo.dataset.limite) || 2;
      if (f.size > limite * 1024 * 1024) { alert('La photo ne doit pas dépasser ' + limite + ' Mo.'); photo.value = ''; return; }
      const img = new Image();
      img.onload = () => {
        const max = Number(photo.dataset.max) || 400, ratio = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (!blob) return;
          try {
            const dt = new DataTransfer();
            dt.items.add(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
            photo.files = dt.files;
          } catch (e) { /* navigateur ancien : le fichier d'origine est envoyé */ }
          document.getElementById('photo-preview').src = URL.createObjectURL(blob);
        }, 'image/jpeg', 0.85);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(f);
    });
  }
})();

// Listes qui relancent la recherche dès qu'on change la valeur (tri…)
document.querySelectorAll('select[data-autosubmit]').forEach((s) => s.addEventListener('change', () => s.form.submit()));

/* ---------- Animations ---------- */
(function () {
  'use strict';
  const reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ombre du menu au défilement
  const nav = document.querySelector('.navbar');
  if (nav) {
    const maj = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', maj, { passive: true });
    maj();
  }

  // Compteurs animés (data-count)
  function compter(el) {
    const fin = Number(el.dataset.count) || 0;
    if (reduit || fin === 0) { el.textContent = fin.toLocaleString('fr-FR'); return; }
    const t0 = performance.now(), duree = 1200;
    const pas = (t) => {
      const p = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(fin * e).toLocaleString('fr-FR');
      if (p < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }

  if (reduit || !('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-count]').forEach(compter);
    return;
  }

  // Apparition progressive des cartes, titres et articles au défilement
  const cibles = document.querySelectorAll(
    'main .section-title, main .card:not(form):not(.no-reveal), main .stat, main .kpi, main .cta-box, main .ai-header, main .empty-state'
  );
  const vus = new WeakSet();
  const obs = new IntersectionObserver((entrees) => {
    entrees.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      obs.unobserve(el);
      el.classList.add('visible');
      el.querySelectorAll('[data-count]').forEach(compter);
      // Une fois apparu, l'élément retrouve ses transitions normales (survol)
      setTimeout(() => { el.classList.remove('reveal', 'visible'); el.style.removeProperty('--d'); }, 700 + (parseInt(el.style.getPropertyValue('--d')) || 0));
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.08 });
  cibles.forEach((el) => {
    if (vus.has(el) || el.closest('.reveal') || el.closest('#qcm-form, #ia-app, .modal, .chatbot')) return;
    vus.add(el);
    // Décalage en cascade entre éléments voisins (même ligne de grille)
    const parent = el.closest('.row');
    const freres = parent ? [...parent.children] : [];
    const i = Math.max(0, freres.findIndex((f) => f.contains(el)));
    el.style.setProperty('--d', Math.min(i, 5) * 90 + 'ms');
    el.classList.add('reveal');
    obs.observe(el);
  });
  // Compteurs hors des cartes animées
  document.querySelectorAll('[data-count]').forEach((el) => { if (!el.closest('.reveal')) compter(el); });
})();
