<?php
/** Recherche d'offres actives selon des filtres (poste, ville, contrat, salaire_min). */
function search_offres(array $f, int $page = 1, int $perPage = 10): array
{
    $where = ['o.active = 1', '(o.date_limite IS NULL OR o.date_limite >= CURDATE())'];
    $params = [];
    if (!empty($f['poste'])) {
        $where[] = 'o.titre = ?';
        $params[] = $f['poste'];
    }
    if (!empty($f['ville'])) {
        $where[] = 'o.ville = ?';
        $params[] = $f['ville'];
    }
    if (!empty($f['contrat'])) {
        $where[] = 'o.type_contrat = ?';
        $params[] = $f['contrat'];
    }
    if (!empty($f['salaire_min'])) {
        $where[] = 'COALESCE(o.salaire_max, o.salaire_min) >= ?';
        $params[] = (int)$f['salaire_min'];
    }
    $sqlWhere = implode(' AND ', $where);
    $total = (int)db_val("SELECT COUNT(*) FROM offres o WHERE $sqlWhere", $params);
    $page = max(1, $page);
    $offset = ($page - 1) * $perPage;
    $rows = db_all(
        "SELECT o.*, r.nom_etablissement, r.type_etablissement
         FROM offres o JOIN recruteurs r ON r.id = o.recruteur_id
         WHERE $sqlWhere ORDER BY o.created_at DESC LIMIT $perPage OFFSET $offset",
        $params
    );
    return ['rows' => $rows, 'total' => $total, 'page' => $page, 'pages' => max(1, (int)ceil($total / $perPage))];
}

function competences_list(?string $csv): array
{
    if (!$csv) {
        return [];
    }
    return array_values(array_filter(array_map('trim', explode(',', $csv)), fn($s) => $s !== ''));
}

function pagination(array $res): string
{
    if ($res['pages'] <= 1) {
        return '';
    }
    $q = $_GET;
    $html = '<nav><ul class="pagination justify-content-center">';
    for ($i = 1; $i <= $res['pages']; $i++) {
        $q['page'] = $i;
        $html .= '<li class="page-item' . ($i === $res['page'] ? ' active' : '') . '"><a class="page-link" href="?' . e(http_build_query($q)) . '">' . $i . '</a></li>';
    }
    return $html . '</ul></nav>';
}

/** Rendu d'une carte d'offre. $actionHtml = zone de boutons à droite. */
function render_offre_card(array $o, string $actionHtml): string
{
    ob_start(); ?>
    <div class="card border-0 shadow-sm mb-3 offer-card" id="offre-<?= (int)$o['id'] ?>">
        <div class="card-body p-4">
            <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
                <div class="flex-grow-1">
                    <div class="d-flex flex-wrap gap-2 mb-2">
                        <span class="badge bg-primary-subtle text-primary"><?= e($o['type_contrat']) ?></span>
                        <?php if ($o['date_limite']): ?><span class="badge bg-light text-muted"><i class="fa-regular fa-clock me-1"></i>Jusqu'au <?= date_fr($o['date_limite']) ?></span><?php endif; ?>
                    </div>
                    <h4 class="h5 mb-1"><?= e($o['titre']) ?></h4>
                    <p class="text-muted mb-2"><i class="fa-solid fa-hospital me-1"></i><?= e($o['nom_etablissement']) ?> <span class="mx-1">·</span> <i class="fa-solid fa-location-dot me-1"></i><?= e($o['ville']) ?></p>
                    <div class="row small g-2 mb-2">
                        <div class="col-sm-4"><i class="fa-solid fa-money-bill-wave text-success me-1"></i><?= e(salaire_range($o['salaire_min'], $o['salaire_max'])) ?></div>
                        <div class="col-sm-4"><i class="fa-solid fa-graduation-cap text-primary me-1"></i><?= e($o['diplome_requis'] ?: 'Diplôme non précisé') ?></div>
                        <div class="col-sm-4"><i class="fa-solid fa-briefcase text-warning me-1"></i><?= (int)$o['experience_min'] ? (int)$o['experience_min'] . ' an(s) d\'expérience min.' : 'Débutant accepté' ?></div>
                    </div>
                    <p class="mb-2 text-body-secondary offer-desc"><?= nl2br(e($o['description'])) ?></p>
                    <?php $comps = competences_list($o['competences_requises'] ?? ''); if ($comps): ?>
                    <div class="d-flex flex-wrap gap-1">
                        <?php foreach ($comps as $c): ?><span class="badge rounded-pill text-bg-light border"><?= e($c) ?></span><?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                </div>
                <div class="offer-actions text-md-end"><?= $actionHtml ?></div>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
