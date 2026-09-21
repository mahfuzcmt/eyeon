<?php
/**
 * Complaint Submission API
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

// Validate CSRF token
if (!validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
    jsonResponse(['success' => false, 'message' => 'অবৈধ অনুরোধ। পৃষ্ঠা রিফ্রেশ করুন।'], 403);
}

// Get form data
$isAnonymous = isset($_POST['is_anonymous']);
$fullName = trim($_POST['full_name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$email = trim($_POST['email'] ?? '');
$nidNumber = trim($_POST['nid_number'] ?? '');
$district = trim($_POST['district'] ?? '');
$upazila = trim($_POST['upazila'] ?? '');
$unionName = trim($_POST['union_name'] ?? '');
$village = trim($_POST['village'] ?? '');
$category = trim($_POST['category'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$description = trim($_POST['description'] ?? '');

// Validation
$errors = [];

if (!$isAnonymous && empty($fullName)) {
    $errors[] = 'নাম প্রয়োজন।';
}

if (empty($phone)) {
    $errors[] = 'মোবাইল নম্বর প্রয়োজন।';
} elseif (!isValidBDPhone($phone)) {
    $errors[] = 'সঠিক মোবাইল নম্বর দিন।';
}

if (!empty($email) && !isValidEmail($email)) {
    $errors[] = 'সঠিক ইমেইল ঠিকানা দিন।';
}

if (empty($category)) {
    $errors[] = 'অভিযোগের ধরন নির্বাচন করুন।';
}

if (empty($subject)) {
    $errors[] = 'বিষয় প্রয়োজন।';
}

if (empty($description)) {
    $errors[] = 'বিস্তারিত বিবরণ প্রয়োজন।';
}

if (!empty($errors)) {
    jsonResponse(['success' => false, 'message' => implode(' ', $errors)], 400);
}

// Handle file uploads
$attachments = [];
if (!empty($_FILES['attachments']['name'][0])) {
    foreach ($_FILES['attachments']['tmp_name'] as $key => $tmpName) {
        if ($_FILES['attachments']['error'][$key] === UPLOAD_ERR_OK) {
            $file = [
                'name' => $_FILES['attachments']['name'][$key],
                'type' => $_FILES['attachments']['type'][$key],
                'tmp_name' => $tmpName,
                'error' => $_FILES['attachments']['error'][$key],
                'size' => $_FILES['attachments']['size'][$key]
            ];

            $uploaded = uploadFile($file, 'complaints', ALLOWED_DOC_TYPES);
            if ($uploaded) {
                $attachments[] = $uploaded;
            }
        }
    }
}

try {
    // Generate ticket number
    $ticketNumber = generateTicketNumber();

    // Insert complaint
    $id = Database::insert('complaints', [
        'ticket_number' => $ticketNumber,
        'full_name' => $isAnonymous ? 'বেনামী' : $fullName,
        'phone' => formatPhone($phone),
        'email' => $email ?: null,
        'nid_number' => $nidNumber ?: null,
        'is_anonymous' => $isAnonymous ? 1 : 0,
        'district' => $district ?: null,
        'upazila' => $upazila ?: null,
        'union_name' => $unionName ?: null,
        'village' => $village ?: null,
        'category' => $category,
        'subject' => $subject,
        'description' => $description,
        'attachments' => !empty($attachments) ? json_encode($attachments) : null,
        'status' => 'দাখিল'
    ]);

    // Log the submission
    Database::insert('complaint_logs', [
        'complaint_id' => $id,
        'action' => 'অভিযোগ দাখিল',
        'description' => 'নতুন অভিযোগ দাখিল করা হয়েছে।'
    ]);

    // Update statistics
    incrementStatistic('total_complaints');

    jsonResponse([
        'success' => true,
        'ticket_number' => $ticketNumber,
        'message' => 'অভিযোগ সফলভাবে দাখিল হয়েছে।'
    ]);

} catch (Exception $e) {
    if (DEBUG_MODE) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    } else {
        jsonResponse(['success' => false, 'message' => 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।'], 500);
    }
}
