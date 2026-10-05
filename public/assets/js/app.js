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
  // Aperçu de la photo
  const photo = document.getElementById('photo-input');
  if (photo) {
    photo.addEventListener('change', () => {
      const f = photo.files[0];
      if (!f) return;
      if (f.size > 2 * 1024 * 1024) { alert('La photo ne doit pas dépasser 2 Mo.'); photo.value = ''; return; }
      document.getElementById('photo-preview').src = URL.createObjectURL(f);
    });
  }
})();
