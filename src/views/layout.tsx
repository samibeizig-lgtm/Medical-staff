import type { Child } from 'hono/jsx';
import { raw } from 'hono/html';
import type { Ctx } from '../lib/http';

type PageOpts = { title: string; active?: string; head?: Child; scripts?: Child };

function Nav({ c, active }: { c: Ctx; active?: string }) {
  const u = c.get('user');
  const cls = (k: string) => 'nav-link' + (k === active ? ' active' : '');
  return (
    <nav class="navbar navbar-expand-xl navbar-light bg-white shadow-sm sticky-top">
      <div class="container">
        <a class="navbar-brand fw-bold text-primary" href="/">
          <img src="/assets/img/logo.svg" alt="" width="34" height="34" class="me-1" /> Medical <span class="text-teal">Staff</span>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-label="Menu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav me-auto">
            <li class="nav-item"><a class={cls('home')} href="/">Accueil</a></li>
            <li class="nav-item"><a class={cls('mission')} href="/mission">Notre mission</a></li>
            <li class="nav-item"><a class={cls('offres')} href={u?.type === 'candidat' ? '/candidat/offres' : '/offres'}>Offres d'emploi</a></li>
            <li class="nav-item"><a class={cls('demandes')} href="/demandes">Demandes d'emploi</a></li>
          </ul>
          <ul class="navbar-nav">
            {!u && (
              <>
                <li class="nav-item dropdown">
                  <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown"><i class="fa-solid fa-user-nurse me-1"></i>Espace candidat</a>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/candidat/login">Connexion</a></li>
                    <li><a class="dropdown-item" href="/candidat/register">Créer un compte</a></li>
                  </ul>
                </li>
                <li class="nav-item dropdown">
                  <a class="btn btn-primary ms-xl-2 dropdown-toggle" href="#" data-bs-toggle="dropdown"><i class="fa-solid fa-hospital me-1"></i>Établissement</a>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/recruteur/login">Connexion</a></li>
                    <li><a class="dropdown-item" href="/recruteur/register">Inscrire mon établissement</a></li>
                  </ul>
                </li>
              </>
            )}
            {u?.type === 'candidat' && (
              <UserMenu csrf={c.get('csrf')} icon="fa-circle-user" label="Mon espace" items={[
                ['/candidat/dashboard', 'fa-gauge', 'Tableau de bord'],
                ['/candidat/cv', 'fa-file-pen', 'Mon CV'],
                ['/candidat/test', 'fa-brain', 'Test de personnalité'],
                ['/candidat/entretien-ia', 'fa-microphone-lines', 'Entretien IA'],
                ['/candidat/offres', 'fa-magnifying-glass', 'Rechercher des offres'],
                ['/candidat/entretiens', 'fa-calendar-check', 'Mes entretiens'],
              ]} />
            )}
            {u?.type === 'recruteur' && (
              <UserMenu csrf={c.get('csrf')} icon="fa-hospital" label="Mon établissement" items={[
                ['/recruteur/dashboard', 'fa-gauge', 'Tableau de bord'],
                ['/recruteur/offres', 'fa-briefcase', 'Mes offres'],
                ['/recruteur/offre', 'fa-plus', 'Nouvelle offre'],
                ['/recruteur/cvtheque', 'fa-address-book', 'CVthèque'],
                ['/recruteur/entretiens', 'fa-calendar-days', 'Mes entretiens'],
                ['/recruteur/abonnement', 'fa-credit-card', 'Abonnement'],
              ]} />
            )}
            {u?.type === 'admin' && (
              <UserMenu csrf={c.get('csrf')} icon="fa-user-shield" label="Administration" items={[
                ['/admin/dashboard', 'fa-gauge', 'Tableau de bord'],
                ['/admin/utilisateurs', 'fa-users', 'Utilisateurs'],
                ['/admin/offres', 'fa-briefcase', 'Offres'],
                ['/admin/abonnements', 'fa-credit-card', 'Abonnements'],
                ['/admin/emails', 'fa-envelope', 'Emails envoyés'],
              ]} />
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

function UserMenu({ icon, label, items, csrf }: { icon: string; label: string; items: [string, string, string][]; csrf: string }) {
  return (
    <li class="nav-item dropdown">
      <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown"><i class={`fa-solid ${icon} me-1`}></i>{label}</a>
      <ul class="dropdown-menu dropdown-menu-end">
        {items.map(([href, ic, txt]) => (
          <li><a class="dropdown-item" href={href}><i class={`fa-solid ${ic} me-2`}></i>{txt}</a></li>
        ))}
        <li><hr class="dropdown-divider" /></li>
        <li>
          <form method="post" action="/logout" class="m-0">
            <input type="hidden" name="_csrf" value={csrf} />
            <button class="dropdown-item text-danger"><i class="fa-solid fa-right-from-bracket me-2"></i>Déconnexion</button>
          </form>
        </li>
      </ul>
    </li>
  );
}

export function Layout({ c, title, active, head, scripts, children }: PageOpts & { c: Ctx; children?: Child }) {
  const flashes = c.get('flashes');
  return (
    <>
      {raw('<!doctype html>')}
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="csrf-token" content={c.get('csrf')} />
          <meta name="description" content="Medical Staff : la plateforme tunisienne de recrutement médical et paramédical." />
          <title>{`${title} | Medical Staff`}</title>
          <link rel="icon" href="/assets/img/logo.svg" type="image/svg+xml" />
          <link href="/assets/vendor/bootstrap/bootstrap.min.css" rel="stylesheet" />
          <link href="/assets/vendor/fontawesome/css/all.min.css" rel="stylesheet" />
          <link href="/assets/vendor/poppins/poppins.css" rel="stylesheet" />
          <link href="/assets/css/style.css" rel="stylesheet" />
          {head}
        </head>
        <body data-base="/">
          <Nav c={c} active={active} />
          <main>
            {flashes.length > 0 && (
              <div class="container mt-3">
                {flashes.map((f) => (
                  <div class={`alert alert-${['success', 'danger', 'warning', 'info'].includes(f.type) ? f.type : 'info'} alert-dismissible fade show`} role="alert">
                    {f.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
                  </div>
                ))}
              </div>
            )}
            {children}
          </main>
          <Footer />
          <script src="/assets/vendor/bootstrap/bootstrap.bundle.min.js"></script>
          <script src="/assets/js/app.js"></script>
          <script src="/assets/js/chatbot.js"></script>
          {scripts}
        </body>
      </html>
    </>
  );
}

function Footer() {
  return (
    <>
      <footer class="site-footer mt-5">
        <div class="container py-5">
          <div class="row g-4">
            <div class="col-md-4">
              <h5 class="text-white fw-bold"><img src="/assets/img/logo.svg" alt="" width="28" class="me-1" /> Medical Staff</h5>
              <p class="small">La plateforme tunisienne de recrutement dédiée aux professionnels de santé médicaux et paramédicaux.</p>
            </div>
            <div class="col-6 col-md-2">
              <h6 class="text-white">Plateforme</h6>
              <ul class="list-unstyled small">
                <li><a href="/mission">Notre mission</a></li>
                <li><a href="/offres">Offres d'emploi</a></li>
                <li><a href="/demandes">Demandes d'emploi</a></li>
              </ul>
            </div>
            <div class="col-6 col-md-3">
              <h6 class="text-white">Espaces</h6>
              <ul class="list-unstyled small">
                <li><a href="/candidat/register">Je suis candidat</a></li>
                <li><a href="/recruteur/register">Je suis un établissement</a></li>
              </ul>
            </div>
            <div class="col-md-3">
              <h6 class="text-white">Contact</h6>
              <p class="small mb-1"><i class="fa-solid fa-location-dot me-2"></i>Tunis, Tunisie</p>
              <p class="small mb-1"><i class="fa-solid fa-envelope me-2"></i>contact@medicalstaff.tn</p>
            </div>
          </div>
          <hr class="border-secondary" />
          <p class="small text-center mb-0">© {new Date().getFullYear()} Medical Staff – Tous droits réservés · <a href="/admin/login">Administration</a></p>
        </div>
      </footer>
      <div id="chatbot" class="chatbot">
        <button id="chatbot-toggle" class="chatbot-toggle" aria-label="Ouvrir le chatbot Dr. Jobs" title="Dr. Jobs – votre assistant">
          <i class="fa-solid fa-user-doctor"></i>
        </button>
        <div id="chatbot-window" class="chatbot-window" hidden>
          <div class="chatbot-header">
            <div><i class="fa-solid fa-user-doctor me-2"></i><strong>Dr. Jobs</strong><br /><small>Assistant recrutement médical</small></div>
            <button id="chatbot-close" class="btn btn-sm text-white" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div id="chatbot-messages" class="chatbot-messages" aria-live="polite"></div>
          <form id="chatbot-form" class="chatbot-form">
            <input id="chatbot-input" type="text" class="form-control" placeholder="Posez votre question…" autocomplete="off" maxlength={500} required />
            <button class="btn btn-primary" type="submit" aria-label="Envoyer"><i class="fa-solid fa-paper-plane"></i></button>
          </form>
        </div>
      </div>
    </>
  );
}

/** Rend une page complète */
export function page(c: Ctx, opts: PageOpts, body: Child, status = 200) {
  return c.html(<Layout c={c} {...opts}>{body}</Layout>, status as any);
}
