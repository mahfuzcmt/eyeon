<?php
/**
 * Helper Functions
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

/**
 * Sanitize output for HTML
 */
function e(string $string): string
{
    return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
}

/**
 * Generate URL-friendly slug from Bengali or English text
 */
function slugify(string $text, string $divider = '-'): string
{
    // Transliterate Bengali to English if needed
    $text = transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $text);

    // Replace non-alphanumeric with divider
    $text = preg_replace('/[^a-z0-9]+/i', $divider, $text);

    // Remove duplicate dividers
    $text = preg_replace('/' . preg_quote($divider) . '+/', $divider, $text);

    // Trim dividers from ends
    return trim($text, $divider);
}

/**
 * Generate unique slug for a table
 */
function uniqueSlug(string $table, string $text, ?int $excludeId = null): string
{
    $slug = slugify($text);
    $originalSlug = $slug;
    $counter = 1;

    while (true) {
        $sql = "SELECT id FROM {$table} WHERE slug = :slug";
        $params = ['slug' => $slug];

        if ($excludeId) {
            $sql .= " AND id != :exclude_id";
            $params['exclude_id'] = $excludeId;
        }

        $exists = Database::fetchOne($sql, $params);

        if (!$exists) {
            break;
        }

        $slug = $originalSlug . '-' . $counter++;
    }

    return $slug;
}

/**
 * Convert English digits to Bengali
 */
function toBengaliDigits($number): string
{
    $englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return str_replace($englishDigits, BENGALI_DIGITS, (string)$number);
}

/**
 * Format date in Bengali
 */
function formatBengaliDate(string $date, bool $showTime = false): string
{
    $timestamp = strtotime($date);

    $day = toBengaliDigits(date('d', $timestamp));
    $month = BENGALI_MONTHS[(int)date('n', $timestamp)];
    $year = toBengaliDigits(date('Y', $timestamp));

    $formatted = "{$day} {$month}, {$year}";

    if ($showTime) {
        $hour = (int)date('g', $timestamp);
        $minute = date('i', $timestamp);
        $period = date('a', $timestamp) === 'am' ? 'সকাল' : (date('G', $timestamp) < 18 ? 'বিকাল' : 'রাত');
        $formatted .= ' ' . toBengaliDigits($hour) . ':' . toBengaliDigits($minute) . ' ' . $period;
    }

    return $formatted;
}

/**
 * Format relative time in Bengali
 */
function timeAgo(string $datetime): string
{
    $timestamp = strtotime($datetime);
    $diff = time() - $timestamp;

    if ($diff < 60) {
        return 'এইমাত্র';
    } elseif ($diff < 3600) {
        $minutes = floor($diff / 60);
        return toBengaliDigits($minutes) . ' মিনিট আগে';
    } elseif ($diff < 86400) {
        $hours = floor($diff / 3600);
        return toBengaliDigits($hours) . ' ঘন্টা আগে';
    } elseif ($diff < 2592000) {
        $days = floor($diff / 86400);
        return toBengaliDigits($days) . ' দিন আগে';
    } elseif ($diff < 31536000) {
        $months = floor($diff / 2592000);
        return toBengaliDigits($months) . ' মাস আগে';
    } else {
        return formatBengaliDate($datetime);
    }
}

/**
 * Generate CSRF token
 */
function generateCsrfToken(): string
{
    if (empty($_SESSION[CSRF_TOKEN_NAME])) {
        $_SESSION[CSRF_TOKEN_NAME] = bin2hex(random_bytes(32));
    }
    return $_SESSION[CSRF_TOKEN_NAME];
}

/**
 * Validate CSRF token
 */
function validateCsrfToken(string $token): bool
{
    return isset($_SESSION[CSRF_TOKEN_NAME]) && hash_equals($_SESSION[CSRF_TOKEN_NAME], $token);
}

/**
 * CSRF token input field
 */
function csrfField(): string
{
    return '<input type="hidden" name="' . CSRF_TOKEN_NAME . '" value="' . generateCsrfToken() . '">';
}

/**
 * Generate ticket number for complaints
 */
function generateTicketNumber(): string
{
    $year = date('Y');
    $prefix = 'RK';

    // Get last ticket number for this year
    $lastTicket = Database::fetchValue(
        "SELECT ticket_number FROM complaints WHERE ticket_number LIKE :pattern ORDER BY id DESC LIMIT 1",
        ['pattern' => "{$prefix}-{$year}-%"]
    );

    if ($lastTicket) {
        $lastNumber = (int)substr($lastTicket, -5);
        $newNumber = $lastNumber + 1;
    } else {
        $newNumber = 1;
    }

    return sprintf('%s-%s-%05d', $prefix, $year, $newNumber);
}

/**
 * Generate appointment number
 */
function generateAppointmentNumber(): string
{
    $year = date('Y');
    $month = date('m');
    $prefix = 'APT';

    $lastNumber = Database::fetchValue(
        "SELECT appointment_number FROM appointments WHERE appointment_number LIKE :pattern ORDER BY id DESC LIMIT 1",
        ['pattern' => "{$prefix}-{$year}{$month}-%"]
    );

    if ($lastNumber) {
        $num = (int)substr($lastNumber, -4);
        $newNum = $num + 1;
    } else {
        $newNum = 1;
    }

    return sprintf('%s-%s%s-%04d', $prefix, $year, $month, $newNum);
}

/**
 * Upload file
 */
function uploadFile(array $file, string $directory, array $allowedTypes = []): ?string
{
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    if ($file['size'] > MAX_UPLOAD_SIZE) {
        return null;
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    if (!empty($allowedTypes) && !in_array($mimeType, $allowedTypes)) {
        return null;
    }

    // Create directory if not exists
    $uploadDir = UPLOADS_PATH . '/' . $directory;
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '_' . time() . '.' . strtolower($extension);
    $filepath = $uploadDir . '/' . $filename;

    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        return $directory . '/' . $filename;
    }

    return null;
}

/**
 * Delete uploaded file
 */
function deleteFile(string $path): bool
{
    $fullPath = UPLOADS_PATH . '/' . $path;
    if (file_exists($fullPath)) {
        return unlink($fullPath);
    }
    return false;
}

/**
 * Get setting value
 */
function getSetting(string $key, $default = null)
{
    static $settings = null;

    if ($settings === null) {
        $results = Database::fetchAll("SELECT setting_key, setting_value FROM settings");
        $settings = [];
        foreach ($results as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
    }

    return $settings[$key] ?? $default;
}

/**
 * Update setting value
 */
function updateSetting(string $key, $value): bool
{
    $exists = Database::fetchOne("SELECT id FROM settings WHERE setting_key = :key", ['key' => $key]);

    if ($exists) {
        Database::update('settings', ['setting_value' => $value], 'setting_key = :key', ['key' => $key]);
    } else {
        Database::insert('settings', ['setting_key' => $key, 'setting_value' => $value]);
    }

    return true;
}

/**
 * Get statistic value
 */
function getStatistic(string $key): int
{
    return (int)Database::fetchValue(
        "SELECT stat_value FROM statistics WHERE stat_key = :key",
        ['key' => $key]
    );
}

/**
 * Update statistic value
 */
function updateStatistic(string $key, int $value): void
{
    Database::execute(
        "INSERT INTO statistics (stat_key, stat_value) VALUES (:key, :value) ON DUPLICATE KEY UPDATE stat_value = :value",
        ['key' => $key, 'value' => $value]
    );
}

/**
 * Increment statistic value
 */
function incrementStatistic(string $key, int $amount = 1): void
{
    Database::execute(
        "INSERT INTO statistics (stat_key, stat_value) VALUES (:key, :amount) ON DUPLICATE KEY UPDATE stat_value = stat_value + :increment",
        ['key' => $key, 'amount' => $amount, 'increment' => $amount]
    );
}

/**
 * Truncate text to specified length
 */
function truncate(string $text, int $length = 100, string $suffix = '...'): string
{
    $text = strip_tags($text);
    if (mb_strlen($text) <= $length) {
        return $text;
    }
    return mb_substr($text, 0, $length) . $suffix;
}

/**
 * Extract YouTube video ID from URL
 */
function extractYoutubeId(string $url): ?string
{
    $patterns = [
        '/youtube\.com\/watch\?v=([^&]+)/',
        '/youtube\.com\/embed\/([^?]+)/',
        '/youtu\.be\/([^?]+)/',
        '/youtube\.com\/v\/([^?]+)/'
    ];

    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $url, $matches)) {
            return $matches[1];
        }
    }

    return null;
}

/**
 * Flash message functions
 */
function setFlash(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function getFlash(): ?array
{
    if (isset($_SESSION['flash'])) {
        $flash = $_SESSION['flash'];
        unset($_SESSION['flash']);
        return $flash;
    }
    return null;
}

function hasFlash(): bool
{
    return isset($_SESSION['flash']);
}

/**
 * Redirect with optional flash message
 */
function redirect(string $url, ?string $flashType = null, ?string $flashMessage = null): void
{
    if ($flashType && $flashMessage) {
        setFlash($flashType, $flashMessage);
    }
    header('Location: ' . $url);
    exit;
}

/**
 * JSON response helper
 */
function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Check if request is AJAX
 */
function isAjax(): bool
{
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) &&
        strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

/**
 * Get current URL
 */
function currentUrl(): string
{
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    return $protocol . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
}

/**
 * Validate email
 */
function isValidEmail(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate Bangladesh phone number
 */
function isValidBDPhone(string $phone): bool
{
    // Remove spaces and dashes
    $phone = preg_replace('/[\s\-]/', '', $phone);

    // Check for valid BD mobile number patterns
    return preg_match('/^(?:\+?880|0)?1[3-9]\d{8}$/', $phone);
}

/**
 * Format phone number
 */
function formatPhone(string $phone): string
{
    $phone = preg_replace('/[\s\-]/', '', $phone);

    // Add +880 if not present
    if (preg_match('/^01[3-9]\d{8}$/', $phone)) {
        return '+880' . substr($phone, 1);
    }

    if (preg_match('/^1[3-9]\d{8}$/', $phone)) {
        return '+880' . $phone;
    }

    return $phone;
}

/**
 * Get complaint status badge class
 */
function getStatusBadgeClass(string $status): string
{
    $classes = [
        'দাখিল' => 'bg-yellow-100 text-yellow-800',
        'পর্যালোচনাধীন' => 'bg-blue-100 text-blue-800',
        'কার্যক্রম' => 'bg-purple-100 text-purple-800',
        'সমাধান' => 'bg-green-100 text-green-800',
        'বুকড' => 'bg-yellow-100 text-yellow-800',
        'নিশ্চিত' => 'bg-blue-100 text-blue-800',
        'সম্পন্ন' => 'bg-green-100 text-green-800',
        'বাতিল' => 'bg-red-100 text-red-800',
        'অনুপস্থিত' => 'bg-gray-100 text-gray-800',
        'draft' => 'bg-gray-100 text-gray-800',
        'published' => 'bg-green-100 text-green-800',
        'চলমান' => 'bg-blue-100 text-blue-800',
        'পরিকল্পিত' => 'bg-yellow-100 text-yellow-800',
        'বিলম্বিত' => 'bg-red-100 text-red-800'
    ];

    return $classes[$status] ?? 'bg-gray-100 text-gray-800';
}

/**
 * Pagination HTML
 */
function paginationHtml(array $pagination, string $baseUrl): string
{
    if ($pagination['total_pages'] <= 1) {
        return '';
    }

    $html = '<nav class="flex justify-center mt-8"><ul class="flex items-center space-x-2">';

    // Previous button
    if ($pagination['has_prev']) {
        $prevUrl = $baseUrl . (strpos($baseUrl, '?') !== false ? '&' : '?') . 'page=' . ($pagination['page'] - 1);
        $html .= '<li><a href="' . $prevUrl . '" class="px-3 py-2 bg-white border rounded hover:bg-gray-50">পূর্ববর্তী</a></li>';
    }

    // Page numbers
    $start = max(1, $pagination['page'] - 2);
    $end = min($pagination['total_pages'], $pagination['page'] + 2);

    if ($start > 1) {
        $html .= '<li><a href="' . $baseUrl . (strpos($baseUrl, '?') !== false ? '&' : '?') . 'page=1" class="px-3 py-2 bg-white border rounded hover:bg-gray-50">১</a></li>';
        if ($start > 2) {
            $html .= '<li><span class="px-2">...</span></li>';
        }
    }

    for ($i = $start; $i <= $end; $i++) {
        $active = $i === $pagination['page'] ? 'bg-green-600 text-white' : 'bg-white hover:bg-gray-50';
        $pageUrl = $baseUrl . (strpos($baseUrl, '?') !== false ? '&' : '?') . 'page=' . $i;
        $html .= '<li><a href="' . $pageUrl . '" class="px-3 py-2 border rounded ' . $active . '">' . toBengaliDigits($i) . '</a></li>';
    }

    if ($end < $pagination['total_pages']) {
        if ($end < $pagination['total_pages'] - 1) {
            $html .= '<li><span class="px-2">...</span></li>';
        }
        $lastUrl = $baseUrl . (strpos($baseUrl, '?') !== false ? '&' : '?') . 'page=' . $pagination['total_pages'];
        $html .= '<li><a href="' . $lastUrl . '" class="px-3 py-2 bg-white border rounded hover:bg-gray-50">' . toBengaliDigits($pagination['total_pages']) . '</a></li>';
    }

    // Next button
    if ($pagination['has_next']) {
        $nextUrl = $baseUrl . (strpos($baseUrl, '?') !== false ? '&' : '?') . 'page=' . ($pagination['page'] + 1);
        $html .= '<li><a href="' . $nextUrl . '" class="px-3 py-2 bg-white border rounded hover:bg-gray-50">পরবর্তী</a></li>';
    }

    $html .= '</ul></nav>';

    return $html;
}
