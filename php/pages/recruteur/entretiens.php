<?php
defined('APP_ROOT') || exit;
require_role('recruteur');
$r = current_recruteur();
$rid = (int)$r['id'];
$offreId = (int)($_GET['offre'] ?? 0);
$statut = in_array($_GET['statut'] ?? '', ['en_attente', 'confirme', 'refuse'], true) ? $_GET['statut'] : '';

$where = ['e.recruteur_id = ?'];
$params = [$rid];
if ($offreId) { $where[] = 'e.offre_id = ?'; $params[] = $offreId; }
if ($statut) { $where[] = 'e.statut = ?'; $params[] = $statut; }
$rows = db_all(
    'SELECT e.*, c.nom, c.prenom, c.photo, c.poste_recherche, o.titre FROM entretiens e
     JOIN candidats c ON c.id = e.candidat_id LEFT JOIN offres o ON o.id = e.offre_id
     WHERE ' . implode(' AND ', $where) . ' ORDER BY e.date_debut >= NOW() DESC, ABS(TIMESTAMPDIFF(MINUTE, NOW(), e.date_debut))',
    $params
);
$offres = db_all('SELECT id, titre, ville FROM offres WHERE recruteur_id = ? ORDER BY created_at DESC', [$rid]);
$pageTitle = 'Mes entretiens';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <h1 class="h3 mb-3"><i class="fa-solid fa-calendar-days text-primary me-2"></i>Mes entretiens</h1>
    <form class="card border-0 shadow-sm mb-4" method="get">
        <div class="card-body row g-2 align-items-end">
            <div class="col-md-6"><label class="form-label small">Offre</label>
                <select name="offre" class="form-select"><option value="">Toutes les offres</option>
                <?php foreach ($offres as $o): ?><option value="<?= (int)$o['id'] ?>" <?= $o['id'] == $offreId ? 'selected' : '' ?>><?= e($o['titre'] . ' – ' . $o['ville']) ?></option><?php endforeach; ?>
                </select></div>
            <div class="col-md-4"><label class="form-label small">Statut</label><select name="statut" class="form-select"><?= options(['en_attente' => 'En attente', 'confirme' => 'Confirmé', 'refuse' => 'Refusé'], $statut, 'Tous') ?></select></div>
            <div class="col-md-2 d-grid"><button class="btn btn-primary"><i class="fa-solid fa-filter me-1"></i>Filtrer</button></div>
        </div>
    </form>
    <div class="card border-0 shadow-sm table-responsive">
        <table class="table align-middle mb-0">
            <thead class="table-light"><tr><th>Candidat</th><th>Offre</th><th>Date</th><th>Lieu / contact</th><th>Statut</th><th class="text-end">Actions</th></tr></thead>
            <tbody>
            <?php foreach ($rows as $e): $passe = strtotime($e['date_fin']) < time(); ?>
                <tr class="<?= $passe ? 'text-muted' : '' ?>">
                    <td><div class="d-flex align-items-center gap-2"><img src="<?= e(photo_url($e['photo'])) ?>" class="avatar-xs" alt=""><div><strong><?= e($e['prenom'] . ' ' . $e['nom']) ?></strong><br><small class="text-muted"><?= e($e['poste_recherche']) ?></small></div></div></td>
                    <td><?= e($e['titre'] ?: '—') ?></td>
                    <td class="text-nowrap"><?= date_fr($e['date_debut']) ?><br><strong><?= e(plage_horaire($e['date_debut'], $e['date_fin'])) ?></strong></td>
                    <td class="small"><?= e($e['lieu']) ?><br><span class="text-muted"><?= e($e['contact']) ?></span></td>
                    <td><?= statut_entretien_badge($e['statut']) ?><?= $passe ? '<br><small>passé</small>' : '' ?></td>
                    <td class="text-end text-nowrap">
                        <a class="btn btn-sm btn-outline-primary" title="CV" href="<?= url('recruteur/cv?id=' . (int)$e['candidat_id']) ?>"><i class="fa-solid fa-eye"></i></a>
                        <a class="btn btn-sm btn-outline-secondary" title="PDF" href="<?= url('recruteur/cv_pdf?id=' . (int)$e['candidat_id']) ?>"><i class="fa-solid fa-file-pdf"></i></a>
                        <?php if (!$passe): ?><a class="btn btn-sm btn-outline-warning" title="Modifier" href="<?= url('recruteur/entretien?id=' . (int)$e['id']) ?>"><i class="fa-solid fa-pen"></i></a><?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; if (!$rows): ?>
                <tr><td colspan="6" class="text-center text-muted py-5">Aucun entretien.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
