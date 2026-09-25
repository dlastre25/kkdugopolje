<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

const MAIL_CONFIG_PATH = '/home/webionar/kkdugopolje-mail-config.php';

function respond_json(bool $ok, string $message, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');

    echo json_encode(
        ['ok' => $ok, 'message' => $message],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

function post_value(string $key): string
{
    return trim((string)($_POST[$key] ?? ''));
}

function clean_text(string $value): string
{
    $value = str_replace(["\r\n", "\r"], "\n", trim($value));
    return preg_replace('/[ \t]+/', ' ', $value) ?? $value;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_json(false, 'Neispravan zahtjev.', 405);
}

if (post_value('website') !== '') {
    respond_json(true, 'Poruka je poslana. Hvala!');
}

$name = clean_text(post_value('name'));
$email = post_value('email');
$message = clean_text(post_value('message'));
$privacyAccepted = isset($_POST['privacy']);

if ($name === '' || strlen($name) < 2) {
    respond_json(false, 'Unesite ime i prezime.', 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond_json(false, 'Unesite ispravnu email adresu.', 422);
}

if ($message === '' || strlen($message) < 10) {
    respond_json(false, 'Unesite poruku od najmanje 10 znakova.', 422);
}

if (!$privacyAccepted) {
    respond_json(false, 'Privola je obavezna za slanje poruke.', 422);
}

$autoloadPath = __DIR__ . '/vendor/autoload.php';

if (!file_exists($autoloadPath)) {
    error_log('KK Dugopolje contact error: PHPMailer autoload not found.');
    respond_json(false, 'Poruka se trenutno ne može poslati. Pokušajte ponovno kasnije.', 500);
}

require $autoloadPath;

if (!file_exists(MAIL_CONFIG_PATH)) {
    error_log('KK Dugopolje contact error: mail config not found.');
    respond_json(false, 'Poruka se trenutno ne može poslati. Pokušajte ponovno kasnije.', 500);
}

$config = require MAIL_CONFIG_PATH;

if (!is_array($config) || empty($config['password'])) {
    error_log('KK Dugopolje contact error: mail config is invalid.');
    respond_json(false, 'Poruka se trenutno ne može poslati. Pokušajte ponovno kasnije.', 500);
}

$host = (string)($config['host'] ?? 'mail.kkdugopolje.hr');
$port = (int)($config['port'] ?? 465);
$username = (string)($config['username'] ?? 'info@kkdugopolje.hr');
$fromEmail = (string)($config['from_email'] ?? 'info@kkdugopolje.hr');
$fromName = (string)($config['from_name'] ?? 'KK Dugopolje');
$recipient = (string)($config['recipient'] ?? 'kkdugopolje2011@gmail.com');

$bodyLines = [
    'Nova kontakt poruka sa stranice KK Dugopolje',
    '',
    'Ime i prezime: ' . $name,
    'Email: ' . $email,
    '',
    'Poruka:',
    $message,
    '',
    '---',
    'Poslano sa stranice https://www.kkdugopolje.hr',
];

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = $host;
    $mail->SMTPAuth = true;
    $mail->Username = $username;
    $mail->Password = (string)$config['password'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = $port;
    $mail->CharSet = 'UTF-8';

    $mail->setFrom($fromEmail, $fromName);
    $mail->addAddress($recipient);
    $mail->addReplyTo($email, $name);

    $mail->Subject = 'Nova kontakt poruka - KK Dugopolje';
    $mail->Body = implode("\n", $bodyLines);
    $mail->AltBody = $mail->Body;

    $mail->send();
} catch (Exception $e) {
    error_log('KK Dugopolje contact mail error: ' . $mail->ErrorInfo);
    respond_json(false, 'Poruka se trenutno ne može poslati. Pokušajte ponovno kasnije.', 500);
}

respond_json(true, 'Poruka je poslana. Hvala!');
