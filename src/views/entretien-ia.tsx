import type { Row } from '../types';
import { CRITERES, CRITERE_KEYS } from '../lib/entretien-ia';
import { dateFr } from '../lib/dates';

const parse = (s: unknown): any[] => { try { const v = JSON.parse(String(s ?? '[]')); return Array.isArray(v) ? v : []; } catch { return []; } };

export const couleurScore = (n: number) => (n >= 75 ? 'success' : n >= 50 ? 'warning' : 'danger');

/** Badge compact du score de communication */
export function BadgeCommunication({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return null;
  return <span class={`badge bg-${couleurScore(score)}-subtle text-${couleurScore(score)}-emphasis`} title="Score de communication (entretien IA)"><i class="fa-solid fa-comments me-1"></i>{score}/100</span>;
}

/** Résultat détaillé d'un entretien IA (candidat et recruteur) */
export function ResultatEntretienIa({ e, transcription = true, titre = 'Entretien IA – communication' }: { e: Row; transcription?: boolean; titre?: string }) {
  const questions = parse(e.questions) as string[];
  const reponses = parse(e.reponses) as { texte: string; mode: string; duree: number }[];
  const forts = parse(e.points_forts) as string[];
  const conseils = parse(e.conseils) as string[];
  const col = couleurScore(e.score_global);
  return (
    <div class="card border-0 shadow-sm mb-4 ia-result"><div class="card-body p-4">
      <div class="d-flex flex-wrap align-items-center gap-3 mb-3">
        <div class={`score-ring text-${col}`} style={`--p:${e.score_global}`}><span>{e.score_global}</span></div>
        <div class="flex-grow-1">
          <h2 class="h5 mb-1"><i class="fa-solid fa-microphone-lines text-primary me-2"></i>{titre}</h2>
          <div class="small text-muted">
            Passé le {dateFr(e.termine_le, true)} · {e.poste || 'poste non précisé'} ·{' '}
            {e.moteur === 'workers-ai' ? <span title="Transcription Whisper et évaluation Llama (Workers AI)"><i class="fa-solid fa-robot me-1"></i>évalué par IA</span>
              : e.moteur === 'demo' ? <span><i class="fa-solid fa-flask me-1"></i>exemple de démonstration</span>
              : <span><i class="fa-solid fa-calculator me-1"></i>évaluation simplifiée</span>}
          </div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-md-6">
          {CRITERE_KEYS.map((k) => (
            <div class="jauge jauge-sm" title={CRITERES[k].aide}>
              <div class="d-flex justify-content-between small mb-1"><span><i class={`fa-solid ${CRITERES[k].icon} me-1`} style={`color:${CRITERES[k].color}`}></i>{CRITERES[k].label}</span><strong>{e[k]}/100</strong></div>
              <div class="progress" role="progressbar" aria-label={CRITERES[k].label} aria-valuenow={e[k]} aria-valuemin={0} aria-valuemax={100}><div class="progress-bar" style={`width:${e[k]}%;background:${CRITERES[k].color}`}></div></div>
            </div>
          ))}
        </div>
        <div class="col-md-6 small">
          {e.synthese && <p class="mb-2">{e.synthese}</p>}
          {forts.length > 0 && <><strong class="text-success"><i class="fa-solid fa-thumbs-up me-1"></i>Points forts</strong><ul class="mb-2">{forts.map((f) => <li>{f}</li>)}</ul></>}
          {conseils.length > 0 && <><strong class="text-primary"><i class="fa-solid fa-lightbulb me-1"></i>Conseils</strong><ul class="mb-0">{conseils.map((f) => <li>{f}</li>)}</ul></>}
        </div>
      </div>
      {transcription && (
        <details class="mt-3">
          <summary class="small text-primary">Voir les questions et la transcription des réponses</summary>
          <ol class="small mt-2 mb-0">
            {questions.map((q, i) => (
              <li class="mb-2"><strong>{q}</strong><br />
                <span class="text-muted">{reponses[i]?.mode === 'ecrit' ? '✍️ Réponse écrite' : '🎙️ Réponse orale transcrite'}{reponses[i]?.duree ? ` · ${reponses[i].duree} s` : ''}</span>
                <div class="transcript">{reponses[i]?.texte || <em class="text-muted">Sans réponse (rien d'audible, ou question interrompue)</em>}</div></li>
            ))}
          </ol>
        </details>
      )}
      <p class="small text-muted fst-italic mt-3 mb-0"><i class="fa-solid fa-circle-info me-1"></i>Score indicatif, fondé uniquement sur le contenu des réponses (ni la voix, ni l'image ne sont analysées). Il ne remplace pas un entretien avec un recruteur.</p>
    </div></div>
  );
}
