/**
 * Crée (ou met à jour le mot de passe d') un compte administrateur.
 * Usage : npm run admin:local -- admin@exemple.tn "MotDePasseSolide"
 *         npm run admin:remote -- admin@exemple.tn "MotDePasseSolide"
 * Les variables d'environnement ADMIN_EMAIL / ADMIN_PASSWORD peuvent remplacer les arguments.
 */
import { execFileSync } from 'node:child_process';
import { hashPassword } from '../src/lib/crypto.ts';

const args = process.argv.slice(2);
const where = args.includes('--remote') ? '--remote' : '--local';
const [email = process.env.ADMIN_EMAIL ?? '', password = process.env.ADMIN_PASSWORD ?? ''] = args.filter((a) => !a.startsWith('--'));

if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || password.length < 10) {
  console.error('Usage : npm run admin:remote -- email "mot de passe (10 caractères minimum)"');
  process.exit(1);
}
const s = (v: string) => `'${v.replace(/'/g, "''")}'`;
const hash = await hashPassword(password);
const sql = `INSERT INTO utilisateurs (email, mot_de_passe, type) VALUES (${s(email.toLowerCase())}, ${s(hash)}, 'admin')
ON CONFLICT(email) DO UPDATE SET mot_de_passe = excluded.mot_de_passe, actif = 1 WHERE utilisateurs.type = 'admin';`;
execFileSync('npx', ['wrangler', 'd1', 'execute', 'medical-staff', where, '--command', sql], { stdio: 'inherit', shell: process.platform === 'win32' });
console.log(`Compte administrateur prêt : ${email} (${where === '--remote' ? 'base en ligne' : 'base locale'})`);
