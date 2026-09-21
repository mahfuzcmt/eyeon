<?php
/**
 * Database and Site Configuration
 *
 * Update these values for your hosting environment
 */

// Database Configuration
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'rashedkhan_db');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Site Configuration
define('SITE_URL', 'http://localhost:8888/public');
define('ADMIN_URL', 'http://localhost:8888/admin');
define('API_URL', 'http://localhost:8888/api');
define('SITE_NAME', 'মো. রাশেদ খান');
define('SITE_TAGLINE', 'মাননীয় প্রধানমন্ত্রীর রাজনৈতিক উপদেষ্টা (সচিব পদমর্যাদা)');

// Paths
define('ROOT_PATH', dirname(__DIR__));
define('PUBLIC_PATH', ROOT_PATH . '/public');
define('ADMIN_PATH', ROOT_PATH . '/admin');
define('INCLUDES_PATH', ROOT_PATH . '/includes');
define('UPLOADS_PATH', PUBLIC_PATH . '/assets/uploads');
define('UPLOADS_URL', SITE_URL . '/assets/uploads');

// Session Configuration
define('SESSION_NAME', 'rk_session');
define('SESSION_LIFETIME', 86400); // 24 hours

// Security
define('CSRF_TOKEN_NAME', 'csrf_token');
define('PASSWORD_MIN_LENGTH', 8);

// Upload Limits
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
define('ALLOWED_DOC_TYPES', ['application/pdf', 'image/jpeg', 'image/png']);

// Pagination
define('ITEMS_PER_PAGE', 10);
define('ADMIN_ITEMS_PER_PAGE', 20);

// Date/Time
define('TIMEZONE', 'Asia/Dhaka');
date_default_timezone_set(TIMEZONE);

// Debug Mode (set to false in production)
define('DEBUG_MODE', true);

if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Bengali month names
define('BENGALI_MONTHS', [
    1 => 'জানুয়ারি', 2 => 'ফেব্রুয়ারি', 3 => 'মার্চ', 4 => 'এপ্রিল',
    5 => 'মে', 6 => 'জুন', 7 => 'জুলাই', 8 => 'আগস্ট',
    9 => 'সেপ্টেম্বর', 10 => 'অক্টোবর', 11 => 'নভেম্বর', 12 => 'ডিসেম্বর'
]);

// Bengali digits
define('BENGALI_DIGITS', ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']);
