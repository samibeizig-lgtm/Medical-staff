import type { Child } from 'hono/jsx';
import type { Row } from '../types';
import { DIMENSIONS, DIM_KEYS } from '../lib/personality';
import { competencesList, salaireRange } from '../lib/format';
import { dateFr } from '../lib/dates';

/** Options d'une liste déroulante (tableau de libellés ou dictionnaire valeur → libellé) */
export function Options({ items, selected, placeholder }: { items: readonly string[] | Record<string, string>; selected?: unknown; placeholder?: string }) {
  const entries: [string, string][] = Array.isArray(items) ? items.map((v) => [v, v]) : Object.entries(items);
  const sel = selected === null || selected === undefined ? '' : String(selected);
  return (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {entries.map(([v, l]) => (
        <option value={v} selected={sel === v}>{l}</option>
      ))}
    </>
  );
}

export const Csrf = ({ token }: { token: string }) => <input type="hidden" name="_csrf" value={token} />;

export const photoUrl = (cle: unknown) => (typeof cle === 'string' && /^[a-f0-9]{24}$/.test(cle) ? `/photo/${cle}` : '/assets/img/avatar.svg');

export function Pagination({ page, pages, query }: { page: number; pages: number; query: Record<string, string> }) {
  if (pages <= 1) return null;
  const href = (p: number) => '?' + new URLSearchParams({ ...query, page: String(p) }).toString();
  return (
    <nav>
      <ul class="pagination justify-content-center">
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <li class={'page-item' + (p === page ? ' active' : '')}><a class="page-link" href={href(p)}>{p}</a></li>
        ))}
      </ul>
    </nav>
  );
}

export function Empty({ icon, children }: { icon: string; children?: Child }) {
  return (
    <div class="empty-state">
      <i class={icon}></i>
      <p>{children}</p>
    </div>
  );
}

export function StatutEntretien({ s }: { s: string }) {
  if (s === 'confirme') return <span class="badge bg-success">Confirmé</span>;
  if (s === 'refuse') return <span class="badge bg-danger">Refusé</span>;
  return <span class="badge bg-warning text-dark">En attente</span>;
}

export function Jauges({ test, compact = false }: { test: Row; compact?: boolean }) {
  return (
    <>
      {DIM_KEYS.map((k) => {
        const d = DIMENSIONS[k];
        const v = Number(test[k]);
        return (
          <div class={'jauge' + (compact ? ' jauge-sm' : '')}>
            <div class="d-flex justify-content-between small mb-1">
              <span><i class={`fa-solid ${d.icon} me-1`} style={`color:${d.color}`}></i>{d.label}</span>
              <strong>{v}/100</strong>
            </div>
            <div class="progress" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
              <div class="progress-bar" style={`width:${v}%;background:${d.color}`}></div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** validees : compétences validées par le candidat connecté (mise en évidence) ; info : ligne ajoutée sous le lieu */
export function OffreCard({ o, actions, validees, info }: { o: Row; actions?: Child; validees?: Set<string>; info?: Child }) {
  const comps = competencesList(o.competences_requises);
  return (
    <div class="card border-0 shadow-sm mb-3 offer-card" id={`offre-${o.id}`}>
      <div class="card-body p-4">
        <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
          <div class="flex-grow-1">
            <div class="d-flex flex-wrap gap-2 mb-2">
              <span class="badge bg-primary-subtle text-primary">{o.type_contrat}</span>
              {o.date_limite && <span class="badge bg-light text-muted"><i class="fa-regular fa-clock me-1"></i>Jusqu'au {dateFr(o.date_limite)}</span>}
            </div>
            <h4 class="h5 mb-1">{o.titre}</h4>
            <p class="text-muted mb-2">
              <i class="fa-solid fa-hospital me-1"></i>{o.nom_etablissement} <span class="mx-1">·</span> <i class="fa-solid fa-location-dot me-1"></i>{o.ville}{info}
            </p>
            <div class="row small g-2 mb-2">
              <div class="col-sm-4"><i class="fa-solid fa-money-bill-wave text-success me-1"></i>{salaireRange(o.salaire_min, o.salaire_max)}</div>
              <div class="col-sm-4"><i class="fa-solid fa-graduation-cap text-primary me-1"></i>{o.diplome_requis || 'Diplôme non précisé'}</div>
              <div class="col-sm-4"><i class="fa-solid fa-briefcase text-warning me-1"></i>{Number(o.experience_min) ? `${o.experience_min} an(s) d'expérience min.` : 'Débutant accepté'}</div>
            </div>
            <p class="mb-2 text-body-secondary offer-desc" style="white-space:pre-line">{o.description}</p>
            {comps.length > 0 && (
              <div class="d-flex flex-wrap gap-1">
                {comps.map((c) => validees?.has(c)
                  ? <span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle" title="Vous avez validé cette compétence"><i class="fa-solid fa-circle-check me-1"></i>{c}</span>
                  : <span class="badge rounded-pill text-bg-light border">{c}</span>)}
              </div>
            )}
          </div>
          <div class="offer-actions text-md-end">{actions}</div>
        </div>
      </div>
    </div>
  );
}

/** Ligne de diplôme / expérience pour l'affichage d'un CV */
export function CvSections({ c }: { c: Row & { diplomes: Row[]; experiences: Row[]; competences: Row[] } }) {
  return (
    <>
      <div class="card border-0 shadow-sm mb-4"><div class="card-body">
        <h3 class="h5"><i class="fa-solid fa-graduation-cap text-primary me-2"></i>Diplômes</h3>
        {c.diplomes.map((d) => (
          <div class="timeline-item"><strong>{d.intitule}</strong>{d.mention && <> <span class="badge text-bg-light border">{d.mention}</span></>}<br />
            <small class="text-muted">{d.etablissement} · {dateFr(d.date_obtention)}</small></div>
        ))}
        {!c.diplomes.length && <p class="text-muted small mb-0">Aucun diplôme renseigné.</p>}
      </div></div>
      <div class="card border-0 shadow-sm mb-4"><div class="card-body">
        <h3 class="h5"><i class="fa-solid fa-briefcase text-primary me-2"></i>Expériences <small class="text-muted fs-6">({c.experience_annees} an(s))</small></h3>
        {c.experiences.map((x) => (
          <div class="timeline-item"><strong>{x.poste}</strong> – {x.etablissement}<br />
            <small class="text-muted">{dateFr(x.date_debut)} → {x.poste_actuel ? "aujourd'hui" : dateFr(x.date_fin)}</small>
            {x.description && <p class="small mb-0" style="white-space:pre-line">{x.description}</p>}</div>
        ))}
        {!c.experiences.length && <p class="text-muted small mb-0">Aucune expérience renseignée.</p>}
      </div></div>
      <div class="card border-0 shadow-sm mb-4"><div class="card-body">
        <h3 class="h5"><i class="fa-solid fa-star text-primary me-2"></i>Compétences <small class="text-muted fs-6 fw-normal">validées par QCM chronométré</small></h3>
        {c.competences.map((k) => (
          <span class="badge rounded-pill bg-success-subtle text-success me-1 mb-1" title={`QCM : ${k.bonnes ?? '?'}/${k.total ?? '?'} · validée le ${dateFr(k.valide_le)}`}>
            <i class="fa-solid fa-circle-check me-1"></i>{k.nom}
          </span>
        ))}
        {!c.competences.length && <p class="text-muted small mb-0">Aucune compétence validée par QCM pour l'instant.</p>}
      </div></div>
    </>
  );
}

export function Langues({ langues }: { langues: Row[] }) {
  return (
    <>
      {langues.map((l) => (
        <div class="d-flex justify-content-between small border-bottom py-1"><span>{l.langue}</span><span class="text-muted">{l.niveau}</span></div>
      ))}
      {!langues.length && <p class="text-muted small mb-0">Aucune langue.</p>}
    </>
  );
}

export function Kpi({ icon, value, label }: { icon: string; value: Child; label: Child }) {
  return (
    <div class="kpi"><i class={`fa-solid ${icon}`}></i><strong>{value}</strong><span>{label}</span></div>
  );
}

export function AuthCard({ icon, iconClass = '', title, subtitle, children, width = 'col-md-6 col-lg-4' }: { icon: string; iconClass?: string; title: string; subtitle?: Child; children?: Child; width?: string }) {
  return (
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class={width}>
          <div class="card border-0 shadow auth-card">
            <div class="card-body p-4 p-md-5">
              <div class="text-center mb-4">
                <div class={`icon-circle ${iconClass} mx-auto mb-2`}><i class={`fa-solid ${icon}`}></i></div>
                <h1 class="h3">{title}</h1>
                {subtitle && <p class="text-muted small">{subtitle}</p>}
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Errors = ({ errors }: { errors: string[] }) => <>{errors.map((e) => <div class="alert alert-danger py-2">{e}</div>)}</>;
