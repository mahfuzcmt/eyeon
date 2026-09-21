<?php
/**
 * Contact Form Submission API
 */

require_once dirname(__DIR__) . '/includes/functions.php';

// Start session for CSRF validation
if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Invalid request method'], 405);
}

if (!validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
    jsonResponse(['success' => false, 'message' => 'অবৈধ অনুরোধ। পৃষ্ঠা রিফ্রেশ করুন।'], 403);
}

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$message = trim($_POST['message'] ?? '');

// Validation
$errors = [];

if (empty($name)) {
    $errors[] = 'নাম প্রয়োজন।';
}

if (empty($email)) {
    $errors[] = 'ইমেইল প্রয়োজন।';
} elseif (!isValidEmail($email)) {
    $errors[] = 'সঠিক ইমেইল ঠিকানা দিন।';
}

if (empty($message)) {
    $errors[] = 'বার্তা প্রয়োজন।';
}

if (!empty($errors)) {
    jsonResponse(['success' => false, 'message' => implode(' ', $errors)], 400);
}

try {
    Database::insert('contact_messages', [
        'name' => $name,
        'email' => $email,
        'phone' => $phone ?: null,
        'subject' => $subject ?: null,
        'message' => $message,
        'status' => 'নতুন'
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'আপনার বার্তা সফলভাবে পাঠানো হয়েছে। ধন্যবাদ!'
    ]);

} catch (Exception $e) {
    if (DEBUG_MODE) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    } else {
        jsonResponse(['success' => false, 'message' => 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।'], 500);
    }
}
