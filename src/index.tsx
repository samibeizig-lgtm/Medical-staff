import { Hono } from 'hono';
import type { AppEnv } from './types';
import { appMiddleware } from './lib/http';
import { page } from './views/layout';
import { Empty } from './views/ui';
import publicRoutes from './routes/public';
import blogRoutes from './routes/blog';
import authRoutes from './routes/auth';
import candidatRoutes from './routes/candidat';
import entretienIaRoutes from './routes/entretien-ia';
import qcmRoutes from './routes/qcm';
import recruteurRoutes from './routes/recruteur';
import adminRoutes from './routes/admin';
import apiRoutes from './routes/api';

const app = new Hono<AppEnv>();

app.use('*', appMiddleware);

app.route('/', publicRoutes);
app.route('/', blogRoutes);
app.route('/', authRoutes);
app.route('/candidat/entretien-ia', entretienIaRoutes);
app.route('/candidat/qcm', qcmRoutes);
app.route('/candidat', candidatRoutes);
app.route('/recruteur', recruteurRoutes);
app.route('/admin', adminRoutes);
app.route('/', apiRoutes);

app.notFound((c) =>
  page(
    c,
    { title: 'Page introuvable' },
    <div class="container py-5 text-center">
      <Empty icon="fa-solid fa-stethoscope">
        <span class="h4 d-block text-dark">Page introuvable</span>
        La page demandée n'existe pas ou a été déplacée.<br />
        <a href="/" class="btn btn-primary mt-3">Retour à l'accueil</a>
      </Empty>
    </div>,
    404,
  ),
);

app.onError((err, c) => {
  console.error(err);
  return page(
    c,
    { title: 'Erreur' },
    <div class="container py-5 text-center">
      <Empty icon="fa-solid fa-triangle-exclamation">
        <span class="h4 d-block text-dark">Une erreur est survenue</span>
        Merci de réessayer dans quelques instants.<br />
        <a href="/" class="btn btn-primary mt-3">Retour à l'accueil</a>
      </Empty>
    </div>,
    500,
  );
});

export default app;
