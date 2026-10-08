/**
 * Exporte en HTML imprimable (puis PDF) toutes les questions de l'entretien IA et des QCM de compétences,
 * classées par poste, pour validation par des spécialistes.
 * Usage : npx esbuild scripts/export-questions.ts --bundle --platform=node --format=esm --outfile=/tmp/export.mjs
 *         node /tmp/export.mjs docs/questions.html   (puis impression PDF, voir scripts/export-questions-pdf.mjs)
 */
import { writeFileSync } from 'node:fs';
import { POSTES } from '../src/lib/data';
import { GENERALES, PAR_FAMILLE, familleDuPoste, NB_QUESTIONS, DUREE_MAX_SECONDES } from '../src/lib/entretien-ia';
import { familleQcm, SECONDES_PAR_QUESTION, QUESTIONS_PAR_COMPETENCE, SEUIL_VALIDATION, COMPETENCES_PAR_SESSION } from '../src/lib/qcm';
import { FAMILLES_QCM, TRONC_COMMUN, type CompetenceQcm } from '../src/lib/qcm-banque';

const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const LABELS_IA: Record<string, string> = {
  infirmier: 'Soins infirmiers', sagefemme: 'Sage-femme', anesthesie: 'Anesthésie-réanimation', technique: 'Métiers techniques (imagerie, laboratoire, stérilisation, pharmacie…)',
  reeducation: 'Rééducation et nutrition', aide: 'Aide-soignant(e) et auxiliaire', accueil: 'Accueil, secrétariat, assistance dentaire, transport sanitaire', encadrement: 'Encadrement (surveillant·e·s)',
};

let nQ = 0, nComp = 0;
const vues = new Map<string, string>(); // compétence → section où elle est détaillée
/** Ordre des choix dans le document : mélangé, mais identique à chaque génération (calculé à partir de l'énoncé) */
function ordre(enonce: string): number[] {
  let h = 2166136261;
  for (const ch of enonce) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const a = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  positions[a.indexOf(0)]++;
  return a;
}
const positions = [0, 0, 0, 0];
const ancre = (nom: string) => 'c-' + nom.normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase();

function competence(c: CompetenceQcm, section: string) {
  vues.set(c.nom, section);
  nComp++;
  return `<div class="comp" id="${ancre(c.nom)}"><h4>${e(c.nom)} <span class="nb">${c.questions.length} questions</span></h4>
  ${c.questions.map((q, i) => {
    nQ++;
    return `<table class="q"><tr><td class="num">${i + 1}</td><td class="enonce" colspan="2">${e(q[0])}</td></tr>
      <tr><td></td><td class="choix"><ol type="A">${ordre(q[0]).map((k) => `<li class="${k === 0 ? 'bon' : ''}">${e(q[1 + k])}${k === 0 ? ' <b>✔ bonne réponse</b>' : ''}</li>`).join('')}</ol></td>
      <td class="avis">☐ Validée<br>☐ À corriger<br><span class="ligne">Remarque :</span></td></tr></table>`;
  }).join('')}</div>`;
}

const postesQcm = (cle: string) => POSTES.filter((p) => familleQcm(p).cle === cle);
const postesIa = (cle: string) => POSTES.filter((p) => familleDuPoste(p) === cle);

let qcm = `<h2 id="qcm">Partie 2 – QCM de compétences</h2>
<p class="intro">Chaque QCM tire au hasard ${COMPETENCES_PAR_SESSION} compétences (celles du métier et du tronc commun) et ${QUESTIONS_PAR_COMPETENCE} questions par compétence, soit ${COMPETENCES_PAR_SESSION * QUESTIONS_PAR_COMPETENCE} questions de ${SECONDES_PAR_QUESTION} secondes. Une compétence est validée avec ${SEUIL_VALIDATION} bonnes réponses sur ${QUESTIONS_PAR_COMPETENCE}. Sur le site, l'ordre des 4 choix est tiré au hasard à chaque QCM : la bonne réponse n'est jamais à une place fixe. Dans ce document, les choix sont également mélangés et la <b>bonne réponse</b> est indiquée en vert ✔.</p>
<h3 class="famille">Tronc commun <span>tous les postes</span></h3>
${TRONC_COMMUN.competences.map((c) => competence(c, 'Tronc commun')).join('')}`;
for (const f of FAMILLES_QCM) {
  const postes = postesQcm(f.cle);
  qcm += `<h3 class="famille">${e(f.label)}</h3><p class="postes"><b>Postes concernés :</b> ${postes.length ? postes.map(e).join(' · ') : '<i>aucun poste actuellement</i>'}</p>`;
  const deja = f.competences.filter((c) => vues.has(c.nom));
  if (deja.length) qcm += `<p class="renvoi">Compétences également évaluées pour ce métier, détaillées plus haut : ${deja.map((c) => `<a href="#${ancre(c.nom)}">${e(c.nom)}</a> (${e(vues.get(c.nom)!)})`).join(', ')}.</p>`;
  qcm += f.competences.filter((c) => !deja.includes(c)).map((c) => competence(c, f.label)).join('');
}

let ia = `<h2 id="ia">Partie 1 – Entretien IA (communication)</h2>
<p class="intro">Chaque entretien comporte ${NB_QUESTIONS} questions orales : 3 questions générales tirées au hasard et 2 questions propres au métier. La question est lue par une voix féminine puis le candidat répond à l'oral (${DUREE_MAX_SECONDES / 60} minutes maximum), sans temps de préparation. L'IA évalue la clarté, la structure, l'empathie, le vocabulaire professionnel et l'adaptation à l'interlocuteur.</p>
<h3 class="famille">Questions générales <span>tous les postes</span></h3>
<table class="ia">${GENERALES.map((q, i) => `<tr><td class="num">${i + 1}</td><td>${e(q)}</td><td class="avis">☐ Validée ☐ À corriger<br><span class="ligne">Remarque :</span></td></tr>`).join('')}</table>`;
for (const [cle, qs] of Object.entries(PAR_FAMILLE)) {
  ia += `<h3 class="famille">${e(LABELS_IA[cle] ?? cle)}</h3><p class="postes"><b>Postes concernés :</b> ${postesIa(cle).map(e).join(' · ') || '<i>aucun</i>'}</p>
  <table class="ia">${qs.map((q, i) => `<tr><td class="num">${i + 1}</td><td>${e(q)}</td><td class="avis">☐ Validée ☐ À corriger<br><span class="ligne">Remarque :</span></td></tr>`).join('')}</table>`;
}
const nIa = GENERALES.length + Object.values(PAR_FAMILLE).flat().length;

const annexe = `<h2 id="annexe">Annexe – Correspondance poste → questions</h2>
<table class="annexe"><thead><tr><th>Poste</th><th>Entretien IA (questions métier)</th><th>QCM de compétences</th></tr></thead><tbody>
${POSTES.map((p) => { const f = familleQcm(p); return `<tr><td>${e(p)}</td><td>${e(LABELS_IA[familleDuPoste(p)] ?? familleDuPoste(p))}</td><td><b>${e(f.label)}</b> : ${f.competences.map((c) => e(c.nom)).join(', ')} + tronc commun</td></tr>`; }).join('')}
</tbody></table>`;

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Questions à valider – medicalstaff.tn</title>
<link rel="stylesheet" href="../public/assets/vendor/poppins/poppins.css">
<style>
@page { size: A4; margin: 16mm 14mm 18mm; }
body { font-family: Poppins, sans-serif; font-size: 9.5pt; color: #14212B; line-height: 1.45; }
.bande { height: 6px; background: linear-gradient(90deg, #2BA84A 0 28%, #1F5FAD 28% 72%, #14B8B0 72%); margin-bottom: 18px; }
.couv { page-break-after: always; padding-top: 30mm; }
.couv img { width: 230px; } .couv h1 { font-size: 26pt; color: #0E2236; margin: 28px 0 6px; line-height: 1.15; }
.couv .sous { font-size: 12pt; color: #5B6770; }
.encadre { border: 1px solid #cfd8e3; border-left: 5px solid #1F5FAD; border-radius: 6px; padding: 12px 16px; margin: 22px 0; background: #F4F7FB; }
.chiffres { display: flex; gap: 12px; margin: 20px 0; } .chiffres div { flex: 1; border-radius: 8px; background: #E6EEF8; padding: 10px; text-align: center; }
.chiffres b { display: block; font-size: 18pt; color: #1F5FAD; }
.signature td { border: 1px solid #cfd8e3; padding: 10px; height: 34px; vertical-align: top; width: 33%; font-size: 8.5pt; color: #5B6770; }
h2 { font-size: 16pt; color: #1F5FAD; border-bottom: 2px solid #1F5FAD; padding-bottom: 4px; page-break-before: always; margin-top: 0; }
h3.famille { font-size: 12.5pt; color: #fff; background: #0E2236; padding: 6px 10px; border-radius: 5px; margin: 18px 0 6px; page-break-after: avoid; }
h3.famille span { font-weight: 400; font-size: 9pt; opacity: .8; margin-left: 6px; }
h4 { font-size: 10.5pt; color: #0E9F9A; margin: 14px 0 4px; page-break-after: avoid; border-bottom: 1px solid #d5e9e8; }
h4 .nb { font-weight: 400; color: #5B6770; font-size: 8.5pt; }
.postes, .renvoi { font-size: 8.8pt; margin: 2px 0 6px; } .renvoi { color: #5B6770; font-style: italic; } .renvoi a { color: #1F5FAD; }
.intro { color: #333; }
table { border-collapse: collapse; width: 100%; }
table.q { page-break-inside: avoid; margin: 5px 0 7px; border: 1px solid #e3e8ef; border-radius: 4px; }
table.q td { padding: 3px 6px; vertical-align: top; }
.num { width: 18px; font-weight: 600; color: #1F5FAD; }
.enonce { font-weight: 600; }
.choix ol { margin: 0; padding-left: 18px; } .choix li { margin: 1px 0; }
.choix li.bon { color: #23913F; } .choix li.bon b { font-size: 7.5pt; margin-left: 4px; }
.avis { width: 105px; font-size: 7.8pt; color: #5B6770; border-left: 1px dashed #cfd8e3; }
.ligne { display: inline-block; margin-top: 3px; }
table.ia td { border-bottom: 1px solid #e3e8ef; padding: 6px; vertical-align: top; } table.ia tr { page-break-inside: avoid; }
table.ia .avis { width: 150px; }
table.annexe th { background: #0E2236; color: #fff; text-align: left; padding: 5px; font-size: 8.5pt; }
table.annexe td { border-bottom: 1px solid #e3e8ef; padding: 4px 5px; font-size: 8pt; vertical-align: top; } table.annexe tr { page-break-inside: avoid; }
.sommaire li { margin: 4px 0; }
</style></head><body>
<section class="couv">
  <div class="bande"></div>
  <img src="../public/assets/img/logo-medicalstaff.svg" alt="medicalstaff.tn">
  <h1>Questions de l'entretien IA<br>et des QCM de compétences</h1>
  <p class="sous">Document de validation par des spécialistes – classé par poste · ${date}</p>
  <div class="chiffres"><div><b>${nIa}</b>questions d'entretien IA</div><div><b>${nComp}</b>compétences</div><div><b>${nQ}</b>questions de QCM</div><div><b>${POSTES.length}</b>postes</div></div>
  <div class="encadre"><b>Consignes aux relecteurs</b><br>
  Pour chaque question, cochez <b>« Validée »</b> ou <b>« À corriger »</b> et indiquez votre remarque (formulation, exactitude médicale, bonne réponse, distracteurs trop faciles ou ambigus, adaptation au contexte tunisien). Dans les QCM, la bonne réponse est signalée en <span style="color:#23913F"><b>vert ✔</b></span> ; les trois autres choix sont des distracteurs qui doivent être clairement faux. Une compétence partagée entre plusieurs métiers n'est détaillée qu'une seule fois (un renvoi est indiqué).<br><b>Point de vigilance :</b> la position et la longueur de la bonne réponse ont été équilibrées (elle n'est ni toujours en A ni toujours la plus longue). Lors de vos corrections, veillez à conserver cet équilibre : une bonne réponse nettement plus détaillée que les autres aide le candidat à deviner.</div>
  <ol class="sommaire"><li>Partie 1 – Entretien IA (communication), par famille de postes</li><li>Partie 2 – QCM de compétences : tronc commun puis familles de métiers</li><li>Annexe – Correspondance poste → questions</li></ol>
  <table class="signature" style="margin-top:28px"><tr><td>Nom du relecteur</td><td>Spécialité / fonction</td><td>Date et signature</td></tr></table>
</section>
${ia}
${qcm}
${annexe}
</body></html>`;

writeFileSync(process.argv[2] ?? 'questions.html', html);
console.log(`Bonne réponse en A/B/C/D : ${positions.join(' / ')}`);
console.log(`${nIa} questions d'entretien, ${nComp} compétences, ${nQ} questions de QCM`);
