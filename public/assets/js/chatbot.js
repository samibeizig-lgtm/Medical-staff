/* Chatbot Dr. Jobs */
(function () {
  'use strict';
  const base = document.body.dataset.base || '/';
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  const box = document.getElementById('chatbot');
  const toggle = document.getElementById('chatbot-toggle');
  const win = document.getElementById('chatbot-window');
  const msgs = document.getElementById('chatbot-messages');
  const form = document.getElementById('chatbot-form');
  const input = document.getElementById('chatbot-input');
  let loaded = false;

  function add(text, who) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function typing() {
    const d = document.createElement('div');
    d.className = 'msg bot typing';
    d.setAttribute('aria-label', 'Dr. Jobs écrit');
    d.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  // Liens vers les pages du site (chemins internes uniquement)
  function liens(list) {
    list = (list || []).filter((l) => l && typeof l.url === 'string' && l.url.startsWith('/') && !l.url.startsWith('//'));
    if (!list.length) return;
    const d = document.createElement('div');
    d.className = 'chatbot-liens';
    list.forEach((l) => {
      const a = document.createElement('a');
      a.className = 'btn btn-sm btn-primary';
      a.href = l.url;
      a.textContent = l.label + ' →';
      d.appendChild(a);
    });
    msgs.appendChild(d);
  }
  function suggestions(list) {
    if (!list || !list.length) return;
    const q = document.createElement('div');
    q.className = 'chatbot-quick';
    list.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-sm btn-outline-primary';
      b.textContent = t;
      b.onclick = () => { q.remove(); send(t); };
      q.appendChild(b);
    });
    msgs.appendChild(q);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function welcome() {
    add('Bonjour 👋 Je suis Dr. Jobs. Posez-moi une question précise : « offres de sage-femme à Sousse », « salaire infirmier », « mon profil est-il complet ? »…', 'bot');
    suggestions(['Offres près de chez moi', 'Salaire infirmier', 'Comment postuler ?', 'Mon profil est-il complet ?']);
  }
  function open() {
    win.hidden = !win.hidden;
    box.classList.toggle('ouvert', !win.hidden);
    if (!win.hidden) {
      input.focus();
      if (!loaded) {
        loaded = true;
        fetch(base + 'api/chatbot', { credentials: 'same-origin' }).then((r) => r.json()).then((d) => {
          if (d.history && d.history.length) d.history.forEach((m) => add(m.content, m.role === 'user' ? 'user' : 'bot'));
          else welcome();
        }).catch(welcome);
      }
    }
  }
  function send(text) {
    text = text.trim();
    if (!text) return;
    msgs.querySelectorAll('.chatbot-quick').forEach((q) => q.remove());
    add(text, 'user');
    input.value = '';
    const t = typing();
    fetch(base + 'api/chatbot', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ message: text })
    }).then((r) => r.json()).then((d) => {
      t.remove();
      add(d.reply || d.error || 'Désolé, une erreur est survenue.', 'bot');
      liens(d.liens);
      suggestions(d.suggestions);
      msgs.scrollTop = msgs.scrollHeight;
    }).catch(() => { t.remove(); add('Désolé, je suis momentanément indisponible.', 'bot'); });
  }
  toggle.addEventListener('click', open);
  document.getElementById('chatbot-close').addEventListener('click', () => { win.hidden = true; box.classList.remove('ouvert'); });
  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
})();
