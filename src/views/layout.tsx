import type { Child } from 'hono/jsx';
import { raw } from 'hono/html';
import type { Ctx } from '../lib/http';

type PageOpts = { title: string; active?: string; head?: Child; scripts?: Child };

function Nav({ c, active }: { c: Ctx; active?: string }) {
  const u = c.get('user');
  const cls = (k: string) => 'nav-link' + (k === active ? ' active' : '');
  return (
    <nav class="navbar navbar-expand-xl navbar-light sticky-top flex-column p-0 site-nav" aria-label="Navigation principale">
      <div class="brand-band w-100" aria-hidden="true"></div>
      <div class="container py-2">
        <a class="navbar-brand py-0" href="/" aria-label="medicalstaff.tn – accueil">
          <img src="/assets/img/logo-entete.svg" alt="medicalstaff.tn" width="190" height="42" />
        </a>
        <button class="navbar-toggler collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Ouvrir le menu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav me-auto">
            <li class="nav-item"><a class={cls('home')} href="/">Accueil</a></li>
            <li class="nav-item"><a class={cls('mission')} href="/mission">Notre mission</a></li>
            <li class="nav-item"><a class={cls('offres')} href={u?.type === 'candidat' ? '/candidat/offres' : '/offres'}>Offres d'emploi</a></li>
            <li class="nav-item"><a class={cls('demandes')} href="/demandes">Demandes d'emploi</a></li>
            <li class="nav-item"><a class={cls('blog')} href="/blog">Blog</a></li>
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
                ['/candidat/qcm', 'fa-list-check', 'QCM compétences'],
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
          <meta name="description" content="medicalstaff.tn : la plateforme tunisienne de recrutement médical et paramédical." />
          <title>{`${title} | medicalstaff.tn`}</title>
          <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml" />
          <meta name="theme-color" content="#1F5FAD" />
          <link href="/assets/vendor/bootstrap/bootstrap.min.css" rel="stylesheet" />
          <link href="/assets/vendor/fontawesome/css/all.min.css" rel="stylesheet" />
          <link href="/assets/vendor/poppins/poppins.css" rel="stylesheet" />
          <link href="/assets/vendor/inter/inter.css" rel="stylesheet" />
          <link rel="preload" href="/assets/vendor/inter/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin="" />
          <link href="/assets/css/style.css" rel="stylesheet" />
          {head}
        </head>
        <body data-base="/">
          <a class="lien-evitement" href="#contenu">Aller au contenu</a>
          <Nav c={c} active={active} />
          <main id="contenu" tabindex={-1}>
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
          <Footer connecte={!!c.get('user')} />
          <script src="/assets/vendor/bootstrap/bootstrap.bundle.min.js"></script>
          <script src="/assets/js/app.js"></script>
          <script src="/assets/js/chatbot.js"></script>
          {scripts}
        </body>
      </html>
    </>
  );
}

function Footer({ connecte }: { connecte: boolean }) {
  return (
    <>
      <footer class="site-footer">
        <div class="brand-band" aria-hidden="true"></div>
        <div class="container pt-5 pb-4">
          <div class="row g-4 g-lg-5">
            <div class="col-lg-4">
              <img src="/assets/img/logo-fond-sombre.svg" alt="medicalstaff.tn – Recrutement paramédical · Tunisie" class="footer-logo mb-3" width="200" height="44" />
              <p class="small mb-3">La plateforme tunisienne de recrutement dédiée aux professionnels de santé médicaux et paramédicaux.</p>
              {!connecte && <a href="/candidat/register" class="btn btn-primary btn-sm">Créer mon compte gratuit</a>}
            </div>
            <div class="col-6 col-md-4 col-lg-2">
              <h2 class="footer-titre">Plateforme</h2>
              <ul class="list-unstyled small footer-liens">
                <li><a href="/mission">Notre mission</a></li>
                <li><a href="/offres">Offres d'emploi</a></li>
                <li><a href="/demandes">Demandes d'emploi</a></li>
                <li><a href="/blog">Blog</a></li>
              </ul>
            </div>
            <div class="col-6 col-md-4 col-lg-3">
              <h2 class="footer-titre">Espaces</h2>
              <ul class="list-unstyled small footer-liens">
                <li><a href="/candidat/register">Je suis candidat</a></li>
                <li><a href="/candidat/login">Connexion candidat</a></li>
                <li><a href="/recruteur/register">Je suis un établissement</a></li>
                <li><a href="/recruteur/login">Connexion établissement</a></li>
              </ul>
            </div>
            <div class="col-md-4 col-lg-3">
              <h2 class="footer-titre">Contact</h2>
              <p class="small mb-2"><i class="fa-solid fa-location-dot me-2" aria-hidden="true"></i>Tunis, Tunisie</p>
              <p class="small mb-0"><i class="fa-solid fa-envelope me-2" aria-hidden="true"></i><a href="mailto:contact@medicalstaff.tn">contact@medicalstaff.tn</a></p>
            </div>
          </div>
          <div class="footer-bas">
            <p class="small mb-0">© {new Date().getFullYear()} medicalstaff.tn – Tous droits réservés</p>
            <a class="small" href="/admin/login">Administration</a>
          </div>
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
