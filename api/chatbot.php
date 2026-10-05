<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require APP_ROOT . '/includes/chatbot.php';

if (!is_post()) {
    json_response(['history' => $_SESSION['chat_history'] ?? []]);
}
csrf_check();
$body = json_decode(file_get_contents('php://input') ?: '', true) ?: $_POST;
$message = trim((string)($body['message'] ?? ''));
if ($message === '') {
    json_response(['error' => 'Message vide.'], 422);
}
if (!empty($body['reset'])) {
    $_SESSION['chat_history'] = [];
}
$message = mb_substr($message, 0, 500);
json_response(['reply' => chatbot_reply($message)]);
