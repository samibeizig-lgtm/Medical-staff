</main>
<footer class="site-footer mt-5">
    <div class="container py-5">
        <div class="row g-4">
            <div class="col-md-4">
                <h5 class="text-white fw-bold"><img src="<?= url('assets/img/logo.svg') ?>" alt="" width="28" class="me-1"> Medical Staff</h5>
                <p class="small">La plateforme tunisienne de recrutement dédiée aux professionnels de santé médicaux et paramédicaux.</p>
            </div>
            <div class="col-6 col-md-2">
                <h6 class="text-white">Plateforme</h6>
                <ul class="list-unstyled small">
                    <li><a href="<?= url('mission') ?>">Notre mission</a></li>
                    <li><a href="<?= url('offres') ?>">Offres d'emploi</a></li>
                    <li><a href="<?= url('demandes') ?>">Demandes d'emploi</a></li>
                </ul>
            </div>
            <div class="col-6 col-md-3">
                <h6 class="text-white">Espaces</h6>
                <ul class="list-unstyled small">
                    <li><a href="<?= url('candidat/register') ?>">Je suis candidat</a></li>
                    <li><a href="<?= url('recruteur/register') ?>">Je suis un établissement</a></li>
                </ul>
            </div>
            <div class="col-md-3">
                <h6 class="text-white">Contact</h6>
                <p class="small mb-1"><i class="fa-solid fa-location-dot me-2"></i>Tunis, Tunisie</p>
                <p class="small mb-1"><i class="fa-solid fa-envelope me-2"></i>contact@medicalstaff.tn</p>
            </div>
        </div>
        <hr class="border-secondary">
        <p class="small text-center mb-0">&copy; <?= date('Y') ?> Medical Staff – Tous droits réservés · <a href="<?= url('admin/login') ?>">Administration</a></p>
    </div>
</footer>

<!-- Chatbot Dr. Jobs -->
<div id="chatbot" class="chatbot">
    <button id="chatbot-toggle" class="chatbot-toggle" aria-label="Ouvrir le chatbot Dr. Jobs" title="Dr. Jobs – votre assistant">
        <i class="fa-solid fa-user-doctor"></i>
    </button>
    <div id="chatbot-window" class="chatbot-window" hidden>
        <div class="chatbot-header">
            <div><i class="fa-solid fa-user-doctor me-2"></i><strong>Dr. Jobs</strong><br><small>Assistant recrutement médical</small></div>
            <button id="chatbot-close" class="btn btn-sm text-white" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div id="chatbot-messages" class="chatbot-messages" aria-live="polite"></div>
        <form id="chatbot-form" class="chatbot-form">
            <input id="chatbot-input" type="text" class="form-control" placeholder="Posez votre question…" autocomplete="off" maxlength="500" required>
            <button class="btn btn-primary" type="submit" aria-label="Envoyer"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
    </div>
</div>

<script src="<?= url('assets/vendor/bootstrap/bootstrap.bundle.min.js') ?>"></script>
<script src="<?= url('assets/js/app.js') ?>"></script>
<script src="<?= url('assets/js/chatbot.js') ?>"></script>
<?= $extraScripts ?? '' ?>
</body>
</html>
