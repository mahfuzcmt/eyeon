<?php
/**
 * Update Appointment Status Handler
 */

require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Invalid request method'], 405);
}

if (!validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
    jsonResponse(['success' => false, 'message' => 'অবৈধ অনুরোধ।'], 403);
}

$id = (int)($_POST['id'] ?? 0);
$status = $_POST['status'] ?? '';

$validStatuses = ['বুকড', 'নিশ্চিত', 'সম্পন্ন', 'বাতিল', 'অনুপস্থিত'];

if (!$id || !in_array($status, $validStatuses)) {
    jsonResponse(['success' => false, 'message' => 'অবৈধ ডাটা।'], 400);
}

// Check if appointment exists
$appointment = Database::fetchOne("SELECT id FROM appointments WHERE id = :id", ['id' => $id]);

if (!$appointment) {
    jsonResponse(['success' => false, 'message' => 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।'], 404);
}

try {
    Database::update('appointments', [
        'status' => $status
    ], 'id = :id', ['id' => $id]);

    jsonResponse(['success' => true, 'message' => 'অবস্থা আপডেট হয়েছে।']);

} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'আপডেট করতে সমস্যা হয়েছে।'], 500);
}
