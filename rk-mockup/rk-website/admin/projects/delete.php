<?php
/**
 * Delete Project Handler
 */

require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();
requireRole(['super_admin', 'editor']);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Invalid request method'], 405);
}

if (!validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
    jsonResponse(['success' => false, 'message' => 'অবৈধ অনুরোধ।'], 403);
}

$id = (int)($_POST['id'] ?? 0);

if (!$id) {
    jsonResponse(['success' => false, 'message' => 'অবৈধ প্রকল্প।'], 400);
}

// Get project to delete images
$project = Database::fetchOne("SELECT before_image, after_image FROM projects WHERE id = :id", ['id' => $id]);

if (!$project) {
    jsonResponse(['success' => false, 'message' => 'প্রকল্প পাওয়া যায়নি।'], 404);
}

try {
    // Delete images
    if ($project['before_image']) {
        deleteFile($project['before_image'], 'projects');
    }
    if ($project['after_image']) {
        deleteFile($project['after_image'], 'projects');
    }

    // Delete project
    Database::delete('projects', 'id = :id', ['id' => $id]);

    jsonResponse(['success' => true, 'message' => 'প্রকল্প সফলভাবে মুছে ফেলা হয়েছে।']);

} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'মুছতে সমস্যা হয়েছে।'], 500);
}
