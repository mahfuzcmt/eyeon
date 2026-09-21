<?php
/**
 * Authentication Functions
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/functions.php';

/**
 * Start session if not started
 */
function initSession(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_name(SESSION_NAME);
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path' => '/',
            'secure' => isset($_SERVER['HTTPS']),
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        session_start();
    }
}

// Initialize session
initSession();

/**
 * Attempt to login
 */
function attemptLogin(string $username, string $password): array
{
    $user = Database::fetchOne(
        "SELECT * FROM admin_users WHERE (username = :username OR email = :email) AND is_active = 1",
        ['username' => $username, 'email' => $username]
    );

    if (!$user) {
        return ['success' => false, 'message' => 'ব্যবহারকারীর নাম বা পাসওয়ার্ড ভুল।'];
    }

    if (!password_verify($password, $user['password_hash'])) {
        return ['success' => false, 'message' => 'ব্যবহারকারীর নাম বা পাসওয়ার্ড ভুল।'];
    }

    // Regenerate session ID on login
    session_regenerate_id(true);

    // Store user data in session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['logged_in_at'] = time();

    // Update last login
    Database::update(
        'admin_users',
        ['last_login' => date('Y-m-d H:i:s')],
        'id = :id',
        ['id' => $user['id']]
    );

    return ['success' => true, 'user' => $user];
}

/**
 * Check if user is logged in
 */
function isLoggedIn(): bool
{
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Get current logged in user
 */
function currentUser(): ?array
{
    if (!isLoggedIn()) {
        return null;
    }

    return Database::fetchOne(
        "SELECT * FROM admin_users WHERE id = :id AND is_active = 1",
        ['id' => $_SESSION['user_id']]
    );
}

/**
 * Get current user ID
 */
function currentUserId(): ?int
{
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current user role
 */
function currentUserRole(): ?string
{
    return $_SESSION['role'] ?? null;
}

/**
 * Check if current user has role
 */
function hasRole(string $role): bool
{
    $userRole = currentUserRole();

    if (!$userRole) {
        return false;
    }

    $roleHierarchy = [
        'super_admin' => ['super_admin', 'editor', 'viewer'],
        'editor' => ['editor', 'viewer'],
        'viewer' => ['viewer']
    ];

    return in_array($role, $roleHierarchy[$userRole] ?? []);
}

/**
 * Check if user is super admin
 */
function isSuperAdmin(): bool
{
    return currentUserRole() === 'super_admin';
}

/**
 * Check if user can edit
 */
function canEdit(): bool
{
    return hasRole('editor');
}

/**
 * Require authentication - redirect to login if not logged in
 */
function requireAuth(): void
{
    if (!isLoggedIn()) {
        $redirectUrl = $_SERVER['REQUEST_URI'];
        redirect(ADMIN_URL . '/login?redirect=' . urlencode($redirectUrl));
    }
}

/**
 * Require specific role(s)
 * @param string|array $roles Single role or array of allowed roles
 */
function requireRole(string|array $roles): void
{
    requireAuth();

    $allowedRoles = is_array($roles) ? $roles : [$roles];
    $userRole = $_SESSION['role'] ?? '';

    if (!in_array($userRole, $allowedRoles)) {
        setFlash('error', 'আপনার এই কাজ করার অনুমতি নেই।');
        redirect(ADMIN_URL);
    }
}

/**
 * Logout user
 */
function logout(): void
{
    // Clear session data
    $_SESSION = [];

    // Delete session cookie
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }

    // Destroy session
    session_destroy();
}

/**
 * Change password
 */
function changePassword(int $userId, string $currentPassword, string $newPassword): array
{
    $user = Database::fetchOne("SELECT password_hash FROM admin_users WHERE id = :id", ['id' => $userId]);

    if (!$user) {
        return ['success' => false, 'message' => 'ব্যবহারকারী পাওয়া যায়নি।'];
    }

    if (!password_verify($currentPassword, $user['password_hash'])) {
        return ['success' => false, 'message' => 'বর্তমান পাসওয়ার্ড ভুল।'];
    }

    if (strlen($newPassword) < PASSWORD_MIN_LENGTH) {
        return ['success' => false, 'message' => 'পাসওয়ার্ড কমপক্ষে ' . PASSWORD_MIN_LENGTH . ' অক্ষর হতে হবে।'];
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    Database::update('admin_users', ['password_hash' => $hash], 'id = :id', ['id' => $userId]);

    return ['success' => true, 'message' => 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।'];
}

/**
 * Create admin user
 */
function createAdminUser(string $username, string $email, string $password, string $fullName, string $role = 'editor'): array
{
    // Check if username exists
    $exists = Database::fetchOne("SELECT id FROM admin_users WHERE username = :username", ['username' => $username]);
    if ($exists) {
        return ['success' => false, 'message' => 'এই ব্যবহারকারীর নাম ইতিমধ্যে ব্যবহৃত হয়েছে।'];
    }

    // Check if email exists
    $exists = Database::fetchOne("SELECT id FROM admin_users WHERE email = :email", ['email' => $email]);
    if ($exists) {
        return ['success' => false, 'message' => 'এই ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে।'];
    }

    if (strlen($password) < PASSWORD_MIN_LENGTH) {
        return ['success' => false, 'message' => 'পাসওয়ার্ড কমপক্ষে ' . PASSWORD_MIN_LENGTH . ' অক্ষর হতে হবে।'];
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $id = Database::insert('admin_users', [
        'username' => $username,
        'email' => $email,
        'password_hash' => $hash,
        'full_name' => $fullName,
        'role' => $role
    ]);

    return ['success' => true, 'id' => $id];
}
