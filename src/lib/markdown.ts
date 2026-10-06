/**
 * Markdown simplifié et sûr pour les articles du blog.
 * Pris en charge : ## et ### titres, paragraphes, listes à puces (-) et numérotées (1.),
 * citations (>), **gras**, *italique*, [liens](https://… ou /chemin).
 * Le texte est échappé AVANT la mise en forme : aucun HTML saisi n'est interprété.
 */
import { esc } from './format';

function enLigne(t: string): string {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]*)\)/g, (_m, txt, url) => {
      const externe = url.startsWith('http');
      return `<a href="${url}"${externe ? ' target="_blank" rel="noopener noreferrer"' : ''}>${txt}</a>`;
    });
}

export function markdown(src: string): string {
  const lignes = src.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let liste: 'ul' | 'ol' | null = null;
  let para: string[] = [];
  const fermerPara = () => { if (para.length) { out.push(`<p>${enLigne(para.join(' '))}</p>`); para = []; } };
  const fermerListe = () => { if (liste) { out.push(`</${liste}>`); liste = null; } };
  for (const brut of lignes) {
    const l = brut.trim();
    let m: RegExpMatchArray | null;
    if (!l) { fermerPara(); fermerListe(); continue; }
    if ((m = l.match(/^(#{2,3})\s+(.+)$/))) {
      fermerPara(); fermerListe();
      const n = m[1].length;
      out.push(`<h${n}>${enLigne(m[2])}</h${n}>`);
    } else if ((m = l.match(/^>\s?(.*)$/))) {
      fermerPara(); fermerListe();
      out.push(`<blockquote>${enLigne(m[1])}</blockquote>`);
    } else if ((m = l.match(/^[-*]\s+(.+)$/)) || (m = l.match(/^\d+[.)]\s+(.+)$/))) {
      fermerPara();
      const type = /^\d/.test(l) ? 'ol' : 'ul';
      if (liste !== type) { fermerListe(); out.push(`<${type}>`); liste = type; }
      out.push(`<li>${enLigne(m[1])}</li>`);
    } else {
      fermerListe();
      para.push(l);
    }
  }
  fermerPara(); fermerListe();
  return out.join('\n');
}

/** Texte brut (extraits, temps de lecture) */
export const texteBrut = (src: string) => src.replace(/[#>*_[\]()-]/g, ' ').replace(/\s+/g, ' ').trim();
export const tempsLecture = (src: string) => Math.max(1, Math.round(texteBrut(src).split(' ').length / 200));
