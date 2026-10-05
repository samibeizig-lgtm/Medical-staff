<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require_role('recruteur');
$r = current_recruteur();
$rid = (int)$r['id'];
$prix = (int)cfg('abonnement_prix');

if (is_post()) {
    csrf_check();
    // Paiement simulé : validation basique des champs carte (aucune donnée bancaire n'est stockée)
    $num = preg_replace('/\D/', '', (string)($_POST['carte'] ?? ''));
    if (strlen($num) < 12 || !preg_match('/^\d{2}\/\d{2}$/', (string)($_POST['expiration'] ?? '')) || !preg_match('/^\d{3,4}$/', (string)($_POST['cvv'] ?? ''))) {
        flash('danger', 'Informations de paiement invalides (simulation).');
        redirect('recruteur/abonnement.php');
    }
    $current = abonnement_actif($rid);
    $debut = $current ? date('Y-m-d', strtotime($current['date_fin'] . ' +1 day')) : date('Y-m-d');
    $fin = date('Y-m-d', strtotime($debut . ' +1 year -1 day'));
    $ref = 'MS-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
    db_exec('INSERT INTO abonnements (recruteur_id, montant, date_debut, date_fin, statut, reference_paiement) VALUES (?,?,?,?,?,?)',
        [$rid, $prix, $debut, $fin, 'actif', $ref]);
    send_mail(current_user()['email'], 'Confirmation de votre abonnement Medical Staff',
        '<p>Bonjour,</p><p>Votre abonnement annuel (' . $prix . ' TND) est actif du ' . date_fr($debut) . ' au ' . date_fr($fin) . '.</p><p>Référence de paiement : <strong>' . e($ref) . '</strong></p>');
    flash('success', 'Paiement accepté ! Votre abonnement est actif jusqu\'au ' . date_fr($fin) . '.');
    redirect('recruteur/dashboard.php');
}

$abo = abonnement_actif($rid);
$historique = db_all('SELECT * FROM abonnements WHERE recruteur_id = ? ORDER BY created_at DESC', [$rid]);
$pageTitle = 'Abonnement';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
    <h1 class="h3 mb-4"><i class="fa-solid fa-credit-card text-primary me-2"></i>Abonnement</h1>
    <div class="row g-4">
        <div class="col-lg-5">
            <div class="card border-0 shadow pricing-card">
                <div class="card-body p-4 text-center">
                    <span class="badge bg-warning text-dark mb-2">Annuel</span>
                    <h2 class="display-5 fw-bold"><?= number_format($prix, 0, ',', ' ') ?> <small class="fs-5">TND / an</small></h2>
                    <ul class="list-unstyled text-start my-4 check-list">
                        <li><i class="fa-solid fa-circle-check"></i>Publication illimitée d'offres d'emploi</li>
                        <li><i class="fa-solid fa-circle-check"></i>Accès complet à la CVthèque</li>
                        <li><i class="fa-solid fa-circle-check"></i>Suggestions de profils par IA 🧠</li>
                        <li><i class="fa-solid fa-circle-check"></i>Calendrier d'entretiens et notifications</li>
                        <li><i class="fa-solid fa-circle-check"></i>Téléchargement des CV en PDF</li>
                    </ul>
                    <?php if ($abo): ?>
                        <div class="alert alert-success mb-0"><i class="fa-solid fa-crown me-1"></i>Actif jusqu'au <strong><?= date_fr($abo['date_fin']) ?></strong>. Vous pouvez renouveler par anticipation ci-contre.</div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <div class="col-lg-7">
            <div class="card border-0 shadow-sm">
                <div class="card-body p-4">
                    <h2 class="h5"><?= $abo ? 'Renouveler mon abonnement' : 'Souscrire' ?></h2>
                    <div class="alert alert-info small"><i class="fa-solid fa-flask me-1"></i>Mode démonstration : le paiement est <strong>simulé</strong>. Utilisez par exemple la carte 4242 4242 4242 4242, 12/30, CVV 123. Aucune donnée bancaire n'est enregistrée.</div>
                    <form method="post" autocomplete="off">
                        <?= csrf_field() ?>
                        <div class="mb-3"><label class="form-label">Titulaire de la carte</label><input class="form-control" name="titulaire" value="<?= e($r['contact_prenom'] . ' ' . $r['contact_nom']) ?>" required></div>
                        <div class="mb-3"><label class="form-label">Numéro de carte</label><input class="form-control" name="carte" inputmode="numeric" placeholder="4242 4242 4242 4242" required></div>
                        <div class="row g-3 mb-4">
                            <div class="col-6"><label class="form-label">Expiration (MM/AA)</label><input class="form-control" name="expiration" placeholder="12/30" required></div>
                            <div class="col-6"><label class="form-label">CVV</label><input class="form-control" name="cvv" inputmode="numeric" placeholder="123" required></div>
                        </div>
                        <button class="btn btn-success btn-lg w-100"><i class="fa-solid fa-lock me-1"></i>Payer <?= number_format($prix, 0, ',', ' ') ?> TND</button>
                    </form>
                </div>
            </div>
            <?php if ($historique): ?>
            <div class="card border-0 shadow-sm mt-4">
                <div class="card-body">
                    <h2 class="h6">Historique</h2>
                    <table class="table table-sm small mb-0">
                        <thead><tr><th>Référence</th><th>Période</th><th>Montant</th><th>Statut</th></tr></thead>
                        <tbody>
                        <?php foreach ($historique as $h): ?>
                            <tr><td><?= e($h['reference_paiement']) ?></td><td><?= date_fr($h['date_debut']) ?> → <?= date_fr($h['date_fin']) ?></td><td><?= money($h['montant']) ?></td>
                                <td><?= $h['statut'] === 'actif' && $h['date_fin'] >= date('Y-m-d') ? '<span class="badge bg-success">Actif</span>' : '<span class="badge bg-secondary">Expiré</span>' ?></td></tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
            <?php endif; ?>
        </div>
    </div>
</div>
<?php require APP_ROOT . '/includes/footer.php';
