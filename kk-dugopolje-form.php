<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

$autoloadPath = __DIR__ . '/vendor/autoload.php';

$configCandidates = [
    dirname(dirname(__DIR__)) . '/kkdugopolje-mail-config.php',
    dirname(__DIR__) . '/kkdugopolje-mail-config.php',
];
$configPath = null;


function wants_json(): bool
{
    return isset($_SERVER['HTTP_ACCEPT'])
        && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;
}

function respond(bool $ok, string $message, int $status = 200): void
{
    http_response_code($status);

    if (wants_json()) {
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(
            ['ok' => $ok, 'message' => $message],
            JSON_UNESCAPED_UNICODE
        );
        exit;
    }

    header('Content-Type: text/html; charset=UTF-8');
    echo '<!doctype html>
    <html lang="hr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>KK Dugopolje</title>
    </head>
    <body>';

    echo '<p>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p>';
    echo '<p><a href="javascript:history.back()">Povratak na stranicu</a></p>';
    echo '</body></html>';
    exit;
}

function post_value(string $key): string
{
    return trim((string)($_POST[$key] ?? ''));
}

function clean_body(string $value): string
{
    $value = trim($value);
    return preg_replace('/[ \t]+/', ' ', $value) ?? $value;
}

if (!file_exists($autoloadPath)) {
    respond(false, 'Mail servis nije instaliran na serveru.', 500);
}

require $autoloadPath;

foreach ($configCandidates as $candidate) {
    if (file_exists($candidate)) {
        $configPath = $candidate;
        break;
    }
}

if ($configPath === null) {
    respond(false, 'Mail konfiguracija nije pronadena na serveru.', 500);
}

$config = require $configPath;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Neispravan zahtjev.', 405);
}

/*
 * Honeypot protiv botova
 */
if (post_value('website') !== '') {
    respond(true, 'Poruka je poslana. Hvala!');
}

$formType = post_value('formType');
$email = post_value('email');
$privacy = isset($_POST['privacy']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !$privacy) {
    respond(false, 'Provjerite obavezna polja i pokušajte ponovno.', 422);
}

$lines = [];

if ($formType === 'registration') {

    $parentName = clean_body(post_value('parentName'));
    $childName = clean_body(post_value('childName'));
    $birthYear = clean_body(post_value('birthYear'));
    $phone = clean_body(post_value('phone'));
    $message = clean_body(post_value('message'));

    if (
        $parentName === '' ||
        $childName === '' ||
        $birthYear === '' ||
        $phone === '' ||
        $message === ''
    ) {
        respond(false, 'Provjerite obavezna polja i pokušajte ponovno.', 422);
    }

    $subject = 'Nova prijava za upis - KK Dugopolje';

    $lines[] = 'Nova prijava za upis';
    $lines[] = '';
    $lines[] = 'Ime i prezime roditelja: ' . $parentName;
    $lines[] = 'Ime i prezime djeteta: ' . $childName;
    $lines[] = 'Godina rođenja djeteta: ' . $birthYear;
    $lines[] = 'Telefon: ' . $phone;
    $lines[] = 'Email: ' . $email;
    $lines[] = '';
    $lines[] = 'Poruka:';
    $lines[] = $message;

} elseif ($formType === 'contact') {

    $name = clean_body(post_value('name'));
    $message = clean_body(post_value('message'));

    if ($name === '' || $message === '') {
        respond(false, 'Provjerite obavezna polja i pokušajte ponovno.', 422);
    }

    $subject = 'Nova poruka sa stranice - KK Dugopolje';

    $lines[] = 'Nova kontakt poruka';
    $lines[] = '';
    $lines[] = 'Ime i prezime: ' . $name;
    $lines[] = 'Email: ' . $email;
    $lines[] = '';
    $lines[] = 'Poruka:';
    $lines[] = $message;

} else {
    respond(false, 'Neispravna forma.', 422);
}

$body = implode("\n", $lines)
    . "\n\n---\nPoslano sa stranice KK Dugopolje\n";

$mail = new PHPMailer(true);

try {

    $mail->isSMTP();

    $mail->Host = $config['host'];
    $mail->SMTPAuth = true;

    $mail->Username = $config['username'];
    $mail->Password = $config['password'];

    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = (int)$config['port'];

    $mail->CharSet = 'UTF-8';

    $mail->setFrom(
        $config['from_email'],
        $config['from_name']
    );

    $mail->addAddress(
        $config['recipient']
    );

    /*
     * Kad KK Dugopolje klikne Reply,
     * odgovor ide direktno osobi koja je ispunila formu.
     */
    $mail->addReplyTo($email);

    $mail->Subject = $subject;
    $mail->Body = $body;

    $mail->send();

} catch (Exception $e) {

    error_log(
        'KK Dugopolje mail error: ' . $mail->ErrorInfo
    );

    respond(
        false,
        'Poruka se trenutno ne može poslati. Pokušajte ponovno kasnije.',
        500
    );
}

respond(true, 'Poruka je poslana. Hvala!');
