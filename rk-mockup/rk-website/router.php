<?php
/**
 * Router for PHP Built-in Server
 * Run with: php -S localhost:8888 router.php
 *
 * This handles clean URLs without .php extension
 */

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Remove trailing slash (except for root)
if ($path !== '/' && substr($path, -1) === '/') {
    $path = rtrim($path, '/');
}

// Static files - serve directly
$staticExtensions = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'pdf'];
$extension = pathinfo($path, PATHINFO_EXTENSION);
if (in_array(strtolower($extension), $staticExtensions)) {
    return false; // Let PHP serve the file
}

// API endpoints - serve directly
if (strpos($path, '/api/') === 0) {
    $apiFile = __DIR__ . $path;
    if (file_exists($apiFile)) {
        require $apiFile;
        return true;
    }
}

// Admin routes
if (strpos($path, '/admin') === 0) {
    $adminPath = substr($path, 6); // Remove /admin

    // Direct .php file access
    if (substr($path, -4) === '.php') {
        return false;
    }

    // Map clean URL to PHP file
    $mappings = [
        '' => '/admin/index.php',
        '/' => '/admin/index.php',
        '/login' => '/admin/login.php',
        '/logout' => '/admin/logout.php',
        '/news' => '/admin/news/index.php',
        '/news/create' => '/admin/news/create.php',
        '/projects' => '/admin/projects/index.php',
        '/projects/create' => '/admin/projects/create.php',
        '/complaints' => '/admin/complaints/index.php',
        '/appointments' => '/admin/appointments/index.php',
        '/appointments/calendar' => '/admin/appointments/calendar.php',
        '/media' => '/admin/media/index.php',
        '/media/upload' => '/admin/media/upload.php',
        '/messages' => '/admin/messages/index.php',
        '/settings' => '/admin/settings/index.php',
        '/settings/users' => '/admin/settings/users.php',
        '/messages' => '/admin/messages/index.php',
    ];

    if (isset($mappings[$adminPath])) {
        require __DIR__ . $mappings[$adminPath];
        return true;
    }

    // Handle dynamic routes like /admin/news/edit?id=1
    if (preg_match('#^/news/edit$#', $adminPath)) {
        require __DIR__ . '/admin/news/edit.php';
        return true;
    }
    if (preg_match('#^/projects/edit$#', $adminPath)) {
        require __DIR__ . '/admin/projects/edit.php';
        return true;
    }
    if (preg_match('#^/complaints/view$#', $adminPath)) {
        require __DIR__ . '/admin/complaints/view.php';
        return true;
    }
    if (preg_match('#^/appointments/view$#', $adminPath)) {
        require __DIR__ . '/admin/appointments/view.php';
        return true;
    }

    // Fallback: try adding .php
    $phpFile = __DIR__ . '/admin' . $adminPath . '.php';
    if (file_exists($phpFile)) {
        require $phpFile;
        return true;
    }

    // Try index.php in directory
    $indexFile = __DIR__ . '/admin' . $adminPath . '/index.php';
    if (file_exists($indexFile)) {
        require $indexFile;
        return true;
    }

    return false;
}

// Public routes
if (strpos($path, '/public') === 0) {
    $publicPath = substr($path, 7); // Remove /public

    // Direct .php file access
    if (substr($path, -4) === '.php') {
        return false;
    }

    // Root of public
    if ($publicPath === '' || $publicPath === '/') {
        require __DIR__ . '/public/index.php';
        return true;
    }

    // Map clean URLs to PHP files
    $mappings = [
        '/about' => '/public/about.php',
        '/services' => '/public/services.php',
        '/news' => '/public/news.php',
        '/projects' => '/public/projects.php',
        '/complaint' => '/public/complaint.php',
        '/track' => '/public/track.php',
        '/appointment' => '/public/appointment.php',
        '/media' => '/public/media.php',
        '/contact' => '/public/contact.php',
    ];

    if (isset($mappings[$publicPath])) {
        require __DIR__ . $mappings[$publicPath];
        return true;
    }

    // Handle news detail: /public/news/slug
    if (preg_match('#^/news/([a-z0-9\-]+)$#', $publicPath, $matches)) {
        $_GET['slug'] = $matches[1];
        require __DIR__ . '/public/news-detail.php';
        return true;
    }

    // Fallback: try adding .php
    $phpFile = __DIR__ . '/public' . $publicPath . '.php';
    if (file_exists($phpFile)) {
        require $phpFile;
        return true;
    }

    return false;
}

// Root level - redirect to public
if ($path === '' || $path === '/') {
    header('Location: /public/');
    return true;
}

// Default: let PHP handle it (404 for non-existent files)
return false;
