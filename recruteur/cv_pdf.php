<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require_role('recruteur');
$r = current_recruteur();
$id = (int)($_GET['id'] ?? 0);
$c = candidat_full($id);
if (!$c) {
    http_response_code(404);
    exit('Candidat introuvable.');
}
if (!recruteur_peut_voir_cv((int)$r['id'], $id)) {
    flash('warning', 'Un abonnement actif est nécessaire pour télécharger ce CV.');
    redirect('recruteur/abonnement.php');
}
db_exec('INSERT INTO cv_consultations (recruteur_id, candidat_id) VALUES (?, ?)', [$r['id'], $id]);

// Photo intégrée en base64 pour Dompdf
$photoPath = $c['photo'] ? APP_ROOT . '/uploads/photos/' . basename($c['photo']) : APP_ROOT . '/assets/img/avatar.png';
$photoData = '';
if (is_file($photoPath)) {
    $mime = mime_content_type($photoPath) ?: 'image/png';
    $photoData = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($photoPath));
}

ob_start(); ?>
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>CV <?= e($c['prenom'] . ' ' . $c['nom']) ?></title>
<style>
    @page { margin: 28px 34px; }
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11px; color: #1f2937; }
    .head { background: #0d6efd; color: #fff; padding: 16px; border-radius: 6px; }
    .head td { color: #fff; vertical-align: middle; }
    .photo { width: 90px; height: 90px; border-radius: 45px; border: 3px solid #fff; }
    h1 { font-size: 22px; margin: 0; }
    h2 { font-size: 13px; color: #0d6efd; border-bottom: 2px solid #0d6efd; padding-bottom: 3px; margin: 18px 0 8px; text-transform: uppercase; }
    .muted { color: #6b7280; }
    .item { margin-bottom: 8px; }
    .tag { display: inline-block; background: #e7f1ff; color: #0d6efd; padding: 2px 8px; border-radius: 9px; margin: 0 4px 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    .info td { padding: 3px 0; }
    .bar { background: #e5e7eb; height: 8px; border-radius: 4px; }
    .bar div { background: #0d6efd; height: 8px; border-radius: 4px; }
    .foot { position: fixed; bottom: -10px; left: 0; right: 0; text-align: center; font-size: 9px; color: #9ca3af; }
</style></head><body>
<div class="head"><table><tr>
    <td style="width:105px"><?php if ($photoData): ?><img class="photo" src="<?= $photoData ?>"><?php endif; ?></td>
    <td><h1><?= e($c['prenom'] . ' ' . $c['nom']) ?></h1>
        <div style="font-size:14px"><?= e($c['poste_recherche']) ?></div>
        <div style="font-size:10px;margin-top:4px">Réf. <?= e(ref_candidat($id)) ?> · <?= $c['experience_annees'] ?> an(s) d'expérience</div></td>
</tr></table></div>

<h2>Informations</h2>
<table class="info">
    <?php if ($c['coordonnees_visibles']): ?>
    <tr><td style="width:30%" class="muted">Email</td><td><?= e($c['email']) ?></td></tr>
    <tr><td class="muted">Téléphone</td><td><?= e($c['telephone'] ?: '—') ?></td></tr>
    <tr><td class="muted">Adresse</td><td><?= e(trim(($c['adresse'] ?? '') . ', ' . ($c['ville'] ?? '') . ', ' . ($c['pays'] ?? ''), ', ')) ?></td></tr>
    <?php else: ?>
    <tr><td style="width:30%" class="muted">Ville</td><td><?= e($c['ville'] ?: '—') ?> (coordonnées masquées par le candidat)</td></tr>
    <?php endif; ?>
    <tr><td class="muted">Naissance</td><td><?= $c['date_naissance'] ? date_fr($c['date_naissance']) . ($c['lieu_naissance'] ? ' à ' . e($c['lieu_naissance']) : '') : '—' ?></td></tr>
    <tr><td class="muted">Salaire souhaité</td><td><?= money($c['salaire_souhaite']) ?></td></tr>
    <tr><td class="muted">Disponibilité</td><td><?= e($c['disponibilite'] ?: '—') ?></td></tr>
</table>

<h2>Diplômes</h2>
<?php foreach ($c['diplomes'] as $d): ?>
    <div class="item"><strong><?= e($d['intitule']) ?></strong><?= $d['mention'] ? ' – mention ' . e($d['mention']) : '' ?><br><span class="muted"><?= e($d['etablissement']) ?> · <?= date_fr($d['date_obtention']) ?></span></div>
<?php endforeach; if (!$c['diplomes']) echo '<p class="muted">—</p>'; ?>

<h2>Expériences professionnelles</h2>
<?php foreach ($c['experiences'] as $x): ?>
    <div class="item"><strong><?= e($x['poste']) ?></strong> – <?= e($x['etablissement']) ?><br>
        <span class="muted"><?= date_fr($x['date_debut']) ?> → <?= $x['poste_actuel'] ? 'aujourd\'hui' : date_fr($x['date_fin']) ?></span>
        <?php if ($x['description']): ?><div><?= nl2br(e($x['description'])) ?></div><?php endif; ?></div>
<?php endforeach; if (!$c['experiences']) echo '<p class="muted">—</p>'; ?>

<h2>Compétences</h2>
<div><?php foreach ($c['competences'] as $k): ?><span class="tag"><?= e($k['nom']) ?></span><?php endforeach; if (!$c['competences']) echo '<span class="muted">—</span>'; ?></div>

<h2>Langues</h2>
<div><?= $c['langues'] ? e(implode(' · ', array_map(fn($l) => $l['langue'] . ' (' . $l['niveau'] . ')', $c['langues']))) : '<span class="muted">—</span>' ?></div>

<?php if ($c['test']): require_once APP_ROOT . '/includes/personality.php'; ?>
<h2>Profil de personnalité</h2>
<table>
<?php foreach (DIMENSIONS as $k => $dim): ?>
    <tr><td style="width:38%;padding:2px 0"><?= e($dim['label']) ?></td>
        <td style="padding:2px 6px"><div class="bar"><div style="width:<?= (int)$c['test'][$k] ?>%;background:<?= $dim['color'] ?>"></div></div></td>
        <td style="width:50px;text-align:right"><?= (int)$c['test'][$k] ?>/100</td></tr>
<?php endforeach; ?>
</table>
<p style="font-style:italic;margin-top:8px"><?= e($c['test']['portrait']) ?></p>
<?php endif; ?>

<div class="foot">CV généré par Medical Staff le <?= date('d/m/Y') ?> – document confidentiel</div>
</body></html>
<?php
$html = ob_get_clean();
$filename = 'CV_' . preg_replace('/[^A-Za-z0-9_-]/', '_', $c['prenom'] . '_' . $c['nom']) . '.pdf';

if (is_file(APP_ROOT . '/vendor/autoload.php')) {
    require APP_ROOT . '/vendor/autoload.php';
}
if (class_exists(\Dompdf\Dompdf::class)) {
    $dompdf = new \Dompdf\Dompdf(['isRemoteEnabled' => false, 'defaultFont' => 'DejaVu Sans']);
    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('A4');
    $dompdf->render();
    $dompdf->stream($filename, ['Attachment' => true]);
    exit;
}
// Repli si Dompdf n'est pas installé (composer install) : version imprimable
header('Content-Type: text/html; charset=utf-8');
echo str_replace('</body>', '<script>window.onload=function(){window.print()}</script></body>', $html);
