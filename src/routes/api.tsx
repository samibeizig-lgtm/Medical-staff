import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { AppEnv, Row } from '../types';
import { all } from '../lib/db';
import { COMPETENCES_PARAMEDICALES } from '../lib/data';
import { normalize } from '../lib/format';
import { chatbotLocal, chatbotRemote, FALLBACK, type ChatMsg } from '../lib/chatbot';

const r = new Hono<AppEnv>();

/* ---------- Autocomplétion des compétences ---------- */
r.get('/api/competences', async (c) => {
  const term = normalize(c.req.query('q') ?? '');
  const extra = await all<Row>(c.env.DB, 'SELECT nom, COUNT(*) AS n FROM competences GROUP BY nom ORDER BY n DESC LIMIT 200');
  const pool = [...new Set([...COMPETENCES_PARAMEDICALES, ...extra.map((e) => String(e.nom))])];
  const out = pool
    .map((v) => ({ v, n: normalize(v) }))
    .filter((x) => !term || x.n.includes(term))
    .sort((a, b) => Number(!a.n.startsWith(term)) - Number(!b.n.startsWith(term)) || a.v.localeCompare(b.v, 'fr'))
    .slice(0, 10)
    .map((x) => x.v);
  c.header('Cache-Control', 'private, max-age=60');
  return c.json(out);
});

/* ---------- Chatbot Dr. Jobs ---------- */
// Historique conservé dans un cookie (10 derniers messages, tronqués)
const HIST_COOKIE = 'ms_chat';
const readHistory = (c: any): ChatMsg[] => {
  try {
    const raw = getCookie(c, HIST_COOKIE);
    if (!raw) return [];
    const h = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw), (ch) => ch.charCodeAt(0))));
    return Array.isArray(h) ? h.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-10) : [];
  } catch { return []; }
};
const writeHistory = (c: any, h: ChatMsg[]) => {
  let hist = h.slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 400) }));
  let enc = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(hist))));
  while (enc.length > 3800 && hist.length > 2) { // limite de taille d'un cookie
    hist = hist.slice(2);
    enc = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(hist))));
  }
  setCookie(c, HIST_COOKIE, enc, { path: '/api/chatbot', httpOnly: true, sameSite: 'Lax', secure: new URL(c.req.url).protocol === 'https:' });
};

r.get('/api/chatbot', (c) => c.json({ history: readHistory(c) }));

r.post('/api/chatbot', async (c) => {
  let body: any = {};
  try { body = await c.req.json(); } catch { /* corps invalide */ }
  const message = String(body?.message ?? '').trim().slice(0, 500);
  if (!message) return c.json({ error: 'Message vide.' }, 422);
  const prix = c.env.ABONNEMENT_PRIX;
  const history = readHistory(c);
  history.push({ role: 'user', content: message });
  const complex = message.length > 90 || (message.match(/\?/g) ?? []).length > 1;
  let reply = complex ? null : chatbotLocal(message, prix);
  if (!reply) reply = await chatbotRemote(c.env, history.slice(-10));
  if (!reply) reply = chatbotLocal(message, prix) ?? FALLBACK;
  history.push({ role: 'assistant', content: reply });
  writeHistory(c, history);
  return c.json({ reply });
});

export default r;
