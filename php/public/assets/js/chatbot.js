/* Chatbot Dr. Jobs */
(function () {
  'use strict';
  const base = document.body.dataset.base || '/';
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
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
  function welcome() {
    add('Bonjour 👋 Je suis Dr. Jobs, votre assistant recrutement médical. Posez-moi vos questions sur les CV, les salaires, les diplômes ou les entretiens !', 'bot');
    const q = document.createElement('div');
    q.className = 'chatbot-quick';
    ['Comment postuler ?', 'Salaire infirmier ?', 'Conseils entretien', 'Abonnement établissement'].forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-sm btn-outline-primary';
      b.textContent = t;
      b.onclick = () => send(t);
      q.appendChild(b);
    });
    msgs.appendChild(q);
  }
  function open() {
    win.hidden = !win.hidden;
    if (!win.hidden) {
      input.focus();
      if (!loaded) {
        loaded = true;
        fetch(base + 'api/chatbot', { credentials: 'same-origin' }).then(r => r.json()).then(d => {
          if (d.history && d.history.length) d.history.forEach(m => add(m.content, m.role === 'user' ? 'user' : 'bot'));
          else welcome();
        }).catch(welcome);
      }
    }
  }
  function send(text) {
    text = text.trim();
    if (!text) return;
    add(text, 'user');
    input.value = '';
    const typing = add('Dr. Jobs écrit…', 'bot typing');
    fetch(base + 'api/chatbot', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ message: text })
    }).then(r => r.json()).then(d => {
      typing.remove();
      add(d.reply || d.error || 'Désolé, une erreur est survenue.', 'bot');
    }).catch(() => { typing.remove(); add('Désolé, je suis momentanément indisponible.', 'bot'); });
  }
  toggle.addEventListener('click', open);
  document.getElementById('chatbot-close').addEventListener('click', () => { win.hidden = true; });
  form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
})();
