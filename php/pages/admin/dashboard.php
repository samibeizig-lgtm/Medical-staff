<?php
defined('APP_ROOT') || exit;
require APP_ROOT . '/includes/admin.php';
require_role('admin');

$k = [
    'candidats'    => (int)db_val('SELECT COUNT(*) FROM candidats'),
    'cv_complets'  => (int)db_val("SELECT COUNT(*) FROM candidats c WHERE c.poste_recherche IS NOT NULL AND c.poste_recherche <> '' AND EXISTS (SELECT 1 FROM diplomes d WHERE d.candidat_id = c.id)"),
    'tests'        => (int)db_val('SELECT COUNT(*) FROM tests_personnalite'),
    'recruteurs'   => (int)db_val('SELECT COUNT(*) FROM recruteurs'),
    'abonnes'      => (int)db_val("SELECT COUNT(DISTINCT recruteur_id) FROM abonnements WHERE statut = 'actif' AND date_fin >= CURDATE()"),
    'offres'       => (int)db_val('SELECT COUNT(*) FROM offres WHERE active = 1 AND (date_limite IS NULL OR date_limite >= CURDATE())'),
    'candidatures' => (int)db_val('SELECT COUNT(*) FROM candidatures'),
    'entretiens'   => (int)db_val('SELECT COUNT(*) FROM entretiens'),
    'confirmes'    => (int)db_val("SELECT COUNT(*) FROM entretiens WHERE statut = 'confirme'"),
    'ca_annee'     => (float)db_val("SELECT COALESCE(SUM(montant), 0) FROM abonnements WHERE statut <> 'annule' AND YEAR(created_at) = YEAR(CURDATE())"),
    'suspendus'    => (int)db_val('SELECT COUNT(*) FROM utilisateurs WHERE actif = 0'),
    'consultations' => (int)db_val('SELECT COUNT(*) FROM cv_consultations WHERE consulte_le >= DATE_SUB(NOW(), INTERVAL 30 DAY)'),
];

// Inscriptions des 6 derniers mois (candidats et établissements)
$mois = [];
for ($i = 5; $i >= 0; $i--) {
    $m = date('Y-m', strtotime("first day of -$i month"));
    $mois[$m] = ['candidat' => 0, 'recruteur' => 0];
}
foreach (db_all("SELECT DATE_FORMAT(created_at, '%Y-%m') m, type, COUNT(*) n FROM utilisateurs
                 WHERE created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m-01') AND type <> 'admin'
                 GROUP BY m, type") as $row) {
    if (isset($mois[$row['m']])) {
        $mois[$row['m']][$row['type']] = (int)$row['n'];
    }
}
$maxCand = max(1, ...array_column($mois, 'candidat'));
$nomsMois = ['01' => 'janv.', '02' => 'févr.', '03' => 'mars', '04' => 'avr.', '05' => 'mai', '06' => 'juin', '07' => 'juil.', '08' => 'août', '09' => 'sept.', '10' => 'oct.', '11' => 'nov.', '12' => 'déc.'];

// Offre et demande par métier
$postes = db_all(
    "SELECT p.poste, COALESCE(d.n, 0) AS demandes, COALESCE(o.n, 0) AS offres FROM (
        SELECT poste_recherche AS poste FROM candidats WHERE poste_recherche IS NOT NULL AND poste_recherche <> ''
        UNION SELECT titre FROM offres WHERE active = 1
     ) p
     LEFT JOIN (SELECT poste_recherche, COUNT(*) n FROM candidats GROUP BY poste_recherche) d ON d.poste_recherche = p.poste
     LEFT JOIN (SELECT titre, COUNT(*) n FROM offres WHERE active = 1 GROUP BY titre) o ON o.titre = p.poste
     ORDER BY (COALESCE(d.n, 0) + COALESCE(o.n, 0)) DESC LIMIT 8"
);
$derniers = db_all(
    'SELECT u.id, u.email, u.type, u.created_at, c.nom, c.prenom, r.nom_etablissement FROM utilisateurs u
     LEFT JOIN candidats c ON c.utilisateur_id = u.id LEFT JOIN recruteurs r ON r.utilisateur_id = u.id
     WHERE u.type <> \'admin\' ORDER BY u.created_at DESC LIMIT 6'
);
$pageTitle = 'Administration';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <h1 class="h3 mb-3"><i class="fa-solid fa-user-shield me-2"></i>Administration</h1>
    <?= admin_nav('dashboard') ?>

    <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3"><div class="kpi"><i class="fa-solid fa-user-nurse"></i><strong><?= $k['candidats'] ?></strong><span>candidats · <?= $k['cv_complets'] ?> CV complets · <?= $k['tests'] ?> tests</span></div></div>
        <div class="col-6 col-lg-3"><div class="kpi"><i class="fa-solid fa-hospital"></i><strong><?= $k['recruteurs'] ?></strong><span>établissements · <?= $k['abonnes'] ?> abonnés</span></div></div>
        <div class="col-6 col-lg-3"><div class="kpi"><i class="fa-solid fa-briefcase"></i><strong><?= $k['offres'] ?></strong><span>offres actives · <?= $k['candidatures'] ?> candidatures</span></div></div>
        <div class="col-6 col-lg-3"><div class="kpi"><i class="fa-solid fa-coins"></i><strong><?= number_format($k['ca_annee'], 0, ',', ' ') ?> TND</strong><span>abonnements encaissés en <?= date('Y') ?></span></div></div>
        <div class="col-6 col-lg-3"><div class="kpi"><i class="fa-solid fa-calendar-check"></i><strong><?= $k['entretiens'] ?></strong><span>entretiens · <?= $k['confirmes'] ?> confirmés</span></div></div>
        <div class="col-6 col-lg-3"><div class="kpi"><i class="fa-solid fa-eye"></i><strong><?= $k['consultations'] ?></strong><span>CV consultés (30 jours)</span></div></div>
        <div class="col-6 col-lg-3"><div class="kpi"><i class="fa-solid fa-user-lock"></i><strong><?= $k['suspendus'] ?></strong><span>comptes suspendus</span></div></div>
        <div class="col-6 col-lg-3"><div class="kpi"><i class="fa-solid fa-percent"></i><strong><?= $k['candidatures'] ? round($k['entretiens'] / $k['candidatures'] * 100) : 0 ?> %</strong><span>candidatures menant à un entretien</span></div></div>
    </div>

    <div class="row g-4">
        <div class="col-lg-6">
            <div class="card border-0 shadow-sm h-100">
                <div class="card-body">
                    <h2 class="h6 mb-1">Nouveaux candidats par mois</h2>
                    <p class="small text-muted mb-3">6 derniers mois</p>
                    <div class="bar-chart" role="img" aria-label="Nouveaux candidats par mois">
                        <?php foreach ($mois as $m => $v): $label = $nomsMois[substr($m, 5)] . ' ' . substr($m, 0, 4); ?>
                        <div class="bar-col" tabindex="0">
                            <span class="bar-tip"><?= e($label) ?> : <?= $v['candidat'] ?> candidat(s), <?= $v['recruteur'] ?> établissement(s)</span>
                            <div class="bar-track"><div class="bar" style="height:<?= round($v['candidat'] / $maxCand * 100) ?>%"></div></div>
                            <span class="bar-value"><?= $v['candidat'] ?></span>
                            <span class="bar-label"><?= e($nomsMois[substr($m, 5)]) ?></span>
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <details class="mt-3 small">
                        <summary class="text-muted">Voir le tableau</summary>
                        <table class="table table-sm mt-2 mb-0">
                            <thead><tr><th>Mois</th><th class="text-end">Candidats</th><th class="text-end">Établissements</th></tr></thead>
                            <tbody><?php foreach ($mois as $m => $v): ?><tr><td><?= e($nomsMois[substr($m, 5)] . ' ' . substr($m, 0, 4)) ?></td><td class="text-end"><?= $v['candidat'] ?></td><td class="text-end"><?= $v['recruteur'] ?></td></tr><?php endforeach; ?></tbody>
                        </table>
                    </details>
                </div>
            </div>
        </div>
        <div class="col-lg-6">
            <div class="card border-0 shadow-sm h-100">
                <div class="card-body">
                    <h2 class="h6 mb-1">Offre et demande par métier</h2>
                    <p class="small text-muted mb-3">Candidats qui recherchent le poste / offres actives</p>
                    <table class="table table-sm align-middle mb-0 small">
                        <thead><tr><th>Métier</th><th class="text-end">Candidats</th><th class="text-end">Offres</th><th class="text-end">Candidats / offre</th></tr></thead>
                        <tbody>
                        <?php foreach ($postes as $p): ?>
                            <tr><td><?= e($p['poste']) ?></td><td class="text-end"><?= (int)$p['demandes'] ?></td><td class="text-end"><?= (int)$p['offres'] ?></td>
                                <td class="text-end"><?= $p['offres'] ? number_format($p['demandes'] / $p['offres'], 1, ',', ' ') : '<span class="text-muted">aucune offre</span>' ?></td></tr>
                        <?php endforeach; if (!$postes): ?><tr><td colspan="4" class="text-muted">Aucune donnée.</td></tr><?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="col-12">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white d-flex justify-content-between"><h2 class="h6 mb-0">Dernières inscriptions</h2><a class="small" href="<?= url('admin/utilisateurs') ?>">Tous les utilisateurs</a></div>
                <ul class="list-group list-group-flush small">
                    <?php foreach ($derniers as $d): ?>
                        <li class="list-group-item d-flex justify-content-between"><span><span class="badge <?= $d['type'] === 'candidat' ? 'bg-primary' : 'bg-teal' ?> me-2"><?= $d['type'] === 'candidat' ? 'Candidat' : 'Établissement' ?></span><?= e(admin_user_label($d)) ?> <span class="text-muted">· <?= e($d['email']) ?></span></span><span class="text-muted"><?= date_fr($d['created_at']) ?></span></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
