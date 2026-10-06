import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { AppEnv } from '../types';
import { NOMS_CATALOGUE } from '../lib/qcm';
import { formatNombre, normalize } from '../lib/format';
import { chatbotRemote, FALLBACK, repondre, type ChatMsg, type Contexte, type Reponse } from '../lib/chatbot';

const r = new Hono<AppEnv>();

/* ---------- Autocomplétion des compétences ---------- */
r.get('/api/competences', async (c) => {
  const term = normalize(c.req.query('q') ?? '');
  // Uniquement le catalogue des compétences vérifiables par QCM
  const out = NOMS_CATALOGUE
    .map((v) => ({ v, n: normalize(v) }))
    .filter((x) => !term || x.n.includes(term))
    .sort((a, b) => Number(!a.n.startsWith(term)) - Number(!b.n.startsWith(term)) || a.v.localeCompare(b.v, 'fr'))
    .slice(0, 10)
    .map((x) => x.v);
  c.header('Cache-Control', 'private, max-age=60');
  return c.json(out);
});

/* ---------- Chatbot Dr. Jobs ---------- */
// Historique conservé dans un cookie (10 derniers messages, tronqués), avec le sujet des réponses pour les relances
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
  let hist = h.slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 400), ...(m.s ? { s: m.s } : {}), ...(m.e ? { e: m.e } : {}) }));
  let enc = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(hist))));
  while (enc.length > 3800 && hist.length > 2) { // limite de taille d'un cookie
    hist = hist.slice(2);
    enc = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(hist))));
  }
  setCookie(c, HIST_COOKIE, enc, { path: '/api/chatbot', httpOnly: true, sameSite: 'Lax', secure: new URL(c.req.url).protocol === 'https:' });
};

r.get('/api/chatbot', (c) => c.json({ history: readHistory(c).map((m) => ({ role: m.role, content: m.content })) }));

r.post('/api/chatbot', async (c) => {
  let body: any = {};
  try { body = await c.req.json(); } catch { /* corps invalide */ }
  const message = String(body?.message ?? '').trim().slice(0, 500);
  if (!message) return c.json({ error: 'Message vide.' }, 422);
  const history = readHistory(c);
  const x: Contexte = { db: c.env.DB, env: c.env, user: c.get('user'), prix: formatNombre(Number(c.env.ABONNEMENT_PRIX)), history };
  let rep: Reponse | null = null;
  try { rep = await repondre(x, message); } catch (e) { console.error('chatbot', e); }
  if (!rep) {
    const ia = await chatbotRemote(x, [...history, { role: 'user' as const, content: message }].slice(-8));
    rep = ia ? { reply: ia, suggestions: FALLBACK.suggestions?.slice(0, 2) } : FALLBACK;
  }
  history.push({ role: 'user', content: message });
  history.push({ role: 'assistant', content: rep.reply, s: rep.sujet, e: rep.entites ? { metier: rep.entites.metier, postes: rep.entites.postes, ville: rep.entites.ville, dispo: rep.entites.dispo } : undefined });
  writeHistory(c, history);
  return c.json({ reply: rep.reply, liens: rep.liens ?? [], suggestions: rep.suggestions ?? [] });
});

export default r;
