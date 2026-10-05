<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require APP_ROOT . '/includes/personality.php';
require_role('candidat');
$me = current_candidat();
$cid = (int)$me['id'];
$existing = db_one('SELECT * FROM tests_personnalite WHERE candidat_id = ?', [$cid]);
$retake = isset($_GET['refaire']);
$error = null;

if (is_post()) {
    csrf_check();
    $answers = [];
    foreach (QUESTIONS as $i => $q) {
        $v = (int)($_POST['q'][$i] ?? 0);
        if ($v < 1 || $v > 5) {
            $error = 'Merci de répondre à toutes les questions.';
            break;
        }
        $answers[$i] = $v;
    }
    if (!$error) {
        $s = personality_scores($answers);
        $portrait = personality_portrait($s, $me['prenom']);
        db_exec(
            'INSERT INTO tests_personnalite (candidat_id, ouverture, conscience, extraversion, agreabilite, stabilite, adaptation_medicale, portrait, reponses, created_at)
             VALUES (?,?,?,?,?,?,?,?,?,NOW())
             ON DUPLICATE KEY UPDATE ouverture=VALUES(ouverture), conscience=VALUES(conscience), extraversion=VALUES(extraversion),
             agreabilite=VALUES(agreabilite), stabilite=VALUES(stabilite), adaptation_medicale=VALUES(adaptation_medicale),
             portrait=VALUES(portrait), reponses=VALUES(reponses), created_at=NOW()',
            [$cid, $s['ouverture'], $s['conscience'], $s['extraversion'], $s['agreabilite'], $s['stabilite'], $s['adaptation_medicale'], $portrait, json_encode($answers)]
        );
        flash('success', 'Votre test de personnalité a été enregistré.');
        redirect('candidat/test.php');
    }
}
$pageTitle = 'Test de personnalité';
require APP_ROOT . '/includes/header.php';
?>
<div class="container py-4">
<?php if ($existing && !$retake && !$error): ?>
    <div class="row justify-content-center">
        <div class="col-lg-9">
            <h1 class="h3"><i class="fa-solid fa-brain text-primary me-2"></i>Mon profil de personnalité</h1>
            <p class="text-muted">Test passé le <?= date_fr($existing['created_at']) ?>. Ce profil est utilisé par l'IA de matching pour vous proposer aux recruteurs.</p>
            <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4"><?= render_jauges($existing) ?></div></div>
            <div class="card border-0 shadow-sm mb-4 portrait"><div class="card-body p-4">
                <h2 class="h5"><i class="fa-solid fa-feather-pointed text-primary me-2"></i>Votre portrait</h2>
                <p class="mb-0"><?= e($existing['portrait']) ?></p>
            </div></div>
            <div class="d-flex gap-2">
                <a href="<?= url('candidat/offres.php') ?>" class="btn btn-primary"><i class="fa-solid fa-magnifying-glass me-1"></i>Voir les offres</a>
                <a href="?refaire=1" class="btn btn-outline-secondary"><i class="fa-solid fa-rotate me-1"></i>Repasser le test</a>
            </div>
        </div>
    </div>
<?php else: ?>
    <div class="row justify-content-center">
        <div class="col-lg-9">
            <h1 class="h3"><i class="fa-solid fa-brain text-primary me-2"></i>Test de personnalité</h1>
            <p class="text-muted">30 affirmations · environ 5 minutes. Répondez spontanément : il n'y a pas de bonne ou de mauvaise réponse.</p>
            <div class="progress mb-4 sticky-progress" style="height:8px"><div id="test-progress" class="progress-bar" style="width:0%"></div></div>
            <?php if ($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?>
            <form method="post" id="test-form">
                <?= csrf_field() ?>
                <?php foreach (QUESTIONS as $i => $q): ?>
                <div class="card border-0 shadow-sm mb-3 question">
                    <div class="card-body">
                        <p class="fw-medium mb-2"><span class="text-primary me-1"><?= $i + 1 ?>.</span><?= e($q['t']) ?></p>
                        <div class="likert">
                            <?php foreach (ECHELLE as $v => $label): $id = "q{$i}_{$v}"; ?>
                                <input type="radio" class="btn-check" name="q[<?= $i ?>]" id="<?= $id ?>" value="<?= $v ?>" required <?= ((int)($_POST['q'][$i] ?? 0) === $v) ? 'checked' : '' ?>>
                                <label class="btn btn-outline-primary btn-sm" for="<?= $id ?>"><?= e($label) ?></label>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
                <div class="text-end"><button class="btn btn-primary btn-lg"><i class="fa-solid fa-chart-simple me-1"></i>Voir mes résultats</button></div>
            </form>
        </div>
    </div>
<?php endif; ?>
</div>
<?php
$extraScripts = <<<JS
<script>
(function(){
  const form = document.getElementById('test-form'); if (!form) return;
  const total = form.querySelectorAll('.question').length, bar = document.getElementById('test-progress');
  const upd = () => { const n = new Set([...form.querySelectorAll('input[type=radio]:checked')].map(i => i.name)).size; bar.style.width = (n/total*100)+'%'; };
  form.addEventListener('change', upd); upd();
})();
</script>
JS;
require APP_ROOT . '/includes/footer.php';
