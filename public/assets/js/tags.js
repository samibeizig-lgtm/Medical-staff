/* Saisie de compétences sous forme de tags avec autocomplétion */
(function () {
  'use strict';
  document.querySelectorAll('.tag-input').forEach(box => {
    const hidden = box.querySelector('input[type=hidden]');
    const source = box.dataset.source;
    let tags = hidden.value.split(',').map(s => s.trim()).filter(Boolean);
    const field = document.createElement('input');
    field.type = 'text';
    field.className = 'tag-field';
    field.placeholder = 'Ajouter une compétence…';
    field.setAttribute('autocomplete', 'off');
    const suggest = document.createElement('div');
    suggest.className = 'tag-suggest';
    suggest.hidden = true;
    box.appendChild(field);
    box.appendChild(suggest);
    let items = [], active = -1, timer;

    function render() {
      box.querySelectorAll('.tag').forEach(t => t.remove());
      tags.forEach((t, i) => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = t;
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = '&times;';
        b.setAttribute('aria-label', 'Retirer ' + t);
        b.onclick = () => { tags.splice(i, 1); render(); };
        span.appendChild(b);
        box.insertBefore(span, field);
      });
      hidden.value = tags.join(', ');
    }
    function add(v) {
      v = v.replace(/,/g, ' ').trim();
      if (v && !tags.some(t => t.toLowerCase() === v.toLowerCase())) tags.push(v);
      field.value = '';
      hide();
      render();
    }
    function hide() { suggest.hidden = true; active = -1; }
    function show(list) {
      items = list.filter(s => !tags.includes(s));
      suggest.innerHTML = '';
      items.forEach((s, i) => {
        const d = document.createElement('div');
        d.textContent = s;
        d.onmousedown = ev => { ev.preventDefault(); add(s); };
        suggest.appendChild(d);
      });
      suggest.hidden = items.length === 0;
      active = -1;
    }
    field.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetch(source + '?q=' + encodeURIComponent(field.value)).then(r => r.json()).then(show).catch(() => {});
      }, 150);
    });
    field.addEventListener('focus', () => field.dispatchEvent(new Event('input')));
    field.addEventListener('blur', () => setTimeout(hide, 150));
    field.addEventListener('keydown', e => {
      const divs = suggest.querySelectorAll('div');
      if (e.key === 'ArrowDown' && divs.length) { e.preventDefault(); active = (active + 1) % divs.length; }
      else if (e.key === 'ArrowUp' && divs.length) { e.preventDefault(); active = (active - 1 + divs.length) % divs.length; }
      else if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (active >= 0 && items[active]) add(items[active]); else add(field.value);
        return;
      } else if (e.key === 'Backspace' && !field.value && tags.length) { tags.pop(); render(); return; }
      else if (e.key === 'Escape') { hide(); return; }
      divs.forEach((d, i) => d.classList.toggle('active', i === active));
    });
    box.closest('form').addEventListener('submit', () => { if (field.value.trim()) add(field.value); });
    box.addEventListener('click', e => { if (e.target === box) field.focus(); });
    render();
  });
})();
