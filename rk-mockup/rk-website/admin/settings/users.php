<?php
$pageTitle = 'ব্যবহারকারী ব্যবস্থাপনা';
require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();
requireRole(['super_admin']);

$search = $_GET['q'] ?? '';
$page = (int)($_GET['page'] ?? 1);

// Build query
$where = "1=1";
$params = [];

if ($search) {
    $where .= " AND (username LIKE :search OR email LIKE :search OR full_name LIKE :search)";
    $params['search'] = "%{$search}%";
}

// Get users with pagination
$sql = "SELECT * FROM admin_users WHERE {$where} ORDER BY created_at DESC";
$pagination = Database::paginate($sql, $params, $page, 20);
$users = $pagination['items'];

$roles = ['super_admin' => 'সুপার অ্যাডমিন', 'editor' => 'সম্পাদক', 'viewer' => 'দর্শক'];

// Handle user actions
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
        $errors[] = 'অবৈধ অনুরোধ।';
    } else {
        $action = $_POST['action'] ?? '';

        if ($action === 'create') {
            $username = trim($_POST['username'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $fullName = trim($_POST['full_name'] ?? '');
            $password = $_POST['password'] ?? '';
            $role = $_POST['role'] ?? 'editor';

            if (empty($username) || empty($email) || empty($password)) {
                $errors[] = 'সব ক্ষেত্র পূরণ করুন।';
            } elseif (strlen($password) < 6) {
                $errors[] = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
            } else {
                // Check if username/email exists
                $existing = Database::fetchOne(
                    "SELECT id FROM admin_users WHERE username = :username OR email = :email",
                    ['username' => $username, 'email' => $email]
                );

                if ($existing) {
                    $errors[] = 'এই ইউজারনেম বা ইমেইল আগে থেকে আছে।';
                } else {
                    try {
                        createAdminUser($username, $email, $password, $role, $fullName);
                        setFlashMessage('ব্যবহারকারী সফলভাবে তৈরি হয়েছে।', 'success');
                        header('Location: ' . ADMIN_URL . '/settings/users');
                        exit;
                    } catch (Exception $e) {
                        $errors[] = 'তৈরি করতে সমস্যা হয়েছে।';
                    }
                }
            }
        }

        if ($action === 'toggle_active') {
            $userId = (int)$_POST['user_id'];
            if ($userId !== currentUserId()) {
                $user = Database::fetchOne("SELECT is_active FROM admin_users WHERE id = :id", ['id' => $userId]);
                if ($user) {
                    Database::update('admin_users', ['is_active' => $user['is_active'] ? 0 : 1], 'id = :id', ['id' => $userId]);
                    setFlashMessage('ব্যবহারকারীর অবস্থা পরিবর্তন হয়েছে।', 'success');
                }
            }
            header('Location: ' . ADMIN_URL . '/settings/users');
            exit;
        }

        if ($action === 'delete') {
            $userId = (int)$_POST['user_id'];
            if ($userId !== currentUserId()) {
                Database::delete('admin_users', 'id = :id', ['id' => $userId]);
                setFlashMessage('ব্যবহারকারী মুছে ফেলা হয়েছে।', 'success');
            }
            header('Location: ' . ADMIN_URL . '/settings/users');
            exit;
        }

        if ($action === 'reset_password') {
            $userId = (int)$_POST['user_id'];
            $newPassword = $_POST['new_password'] ?? '';

            if (strlen($newPassword) < 6) {
                $errors[] = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
            } else {
                Database::update('admin_users', [
                    'password_hash' => password_hash($newPassword, PASSWORD_DEFAULT)
                ], 'id = :id', ['id' => $userId]);
                setFlashMessage('পাসওয়ার্ড পরিবর্তন হয়েছে।', 'success');
                header('Location: ' . ADMIN_URL . '/settings/users');
                exit;
            }
        }

        if ($action === 'update_role') {
            $userId = (int)$_POST['user_id'];
            $newRole = $_POST['new_role'] ?? 'editor';

            if ($userId !== currentUserId() && array_key_exists($newRole, $roles)) {
                Database::update('admin_users', ['role' => $newRole], 'id = :id', ['id' => $userId]);
                setFlashMessage('ভূমিকা পরিবর্তন হয়েছে।', 'success');
            }
            header('Location: ' . ADMIN_URL . '/settings/users');
            exit;
        }
    }
}

require_once dirname(dirname(__DIR__)) . '/admin/includes/header.php';
?>

<div class="space-y-6">
    <!-- Add User Card -->
    <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">নতুন ব্যবহারকারী যোগ করুন</h3>

        <?php if (!empty($errors)): ?>
        <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <ul class="text-sm text-red-700 list-disc list-inside">
                <?php foreach ($errors as $error): ?>
                <li><?= e($error) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>

        <form method="POST" class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <?= csrfField() ?>
            <input type="hidden" name="action" value="create">

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">ইউজারনেম *</label>
                <input type="text" name="username" required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">ইমেইল *</label>
                <input type="email" name="email" required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">পূর্ণ নাম</label>
                <input type="text" name="full_name"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">পাসওয়ার্ড *</label>
                <input type="password" name="password" required minlength="6"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            </div>
            <div class="flex items-end gap-2">
                <div class="flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-1">ভূমিকা</label>
                    <select name="role" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        <?php foreach ($roles as $key => $label): ?>
                        <option value="<?= e($key) ?>" <?= $key === 'editor' ? 'selected' : '' ?>><?= e($label) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <button type="submit" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition whitespace-nowrap">
                    যোগ করুন
                </button>
            </div>
        </form>
    </div>

    <!-- Users List -->
    <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 class="text-xl font-semibold text-gray-800">ব্যবহারকারী তালিকা</h2>

            <form method="GET" class="flex gap-2">
                <input type="text" name="q" value="<?= e($search) ?>" placeholder="অনুসন্ধান..."
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 w-64">
                <button type="submit" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                    খুঁজুন
                </button>
            </form>
        </div>

        <?php if (empty($users)): ?>
        <div class="text-center py-12">
            <p class="text-gray-500">কোনো ব্যবহারকারী পাওয়া যায়নি।</p>
        </div>
        <?php else: ?>
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ব্যবহারকারী</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ইমেইল</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ভূমিকা</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">অবস্থা</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">সর্বশেষ লগইন</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">কার্যক্রম</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <?php foreach ($users as $user): ?>
                    <tr class="hover:bg-gray-50 <?= $user['id'] === currentUserId() ? 'bg-primary-50' : '' ?>">
                        <td class="px-4 py-4">
                            <div class="flex items-center">
                                <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
                                    <?= mb_strtoupper(mb_substr($user['username'], 0, 1)) ?>
                                </div>
                                <div class="ml-3">
                                    <p class="font-medium text-gray-800"><?= e($user['username']) ?></p>
                                    <?php if ($user['full_name']): ?>
                                    <p class="text-sm text-gray-500"><?= e($user['full_name']) ?></p>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-4 text-sm text-gray-600"><?= e($user['email']) ?></td>
                        <td class="px-4 py-4">
                            <span class="px-2 py-1 text-xs rounded <?= $user['role'] === 'super_admin' ? 'bg-red-100 text-red-700' : ($user['role'] === 'editor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700') ?>">
                                <?= e($roles[$user['role']] ?? $user['role']) ?>
                            </span>
                        </td>
                        <td class="px-4 py-4">
                            <?php if ($user['is_active']): ?>
                            <span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">সক্রিয়</span>
                            <?php else: ?>
                            <span class="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">নিষ্ক্রিয়</span>
                            <?php endif; ?>
                        </td>
                        <td class="px-4 py-4 text-sm text-gray-600">
                            <?= $user['last_login_at'] ? timeAgo($user['last_login_at']) : 'কখনো না' ?>
                        </td>
                        <td class="px-4 py-4 text-right">
                            <?php if ($user['id'] !== currentUserId()): ?>
                            <div class="flex items-center justify-end gap-1">
                                <!-- Change Role -->
                                <button onclick="changeRole(<?= $user['id'] ?>, '<?= e($user['role']) ?>')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="ভূমিকা পরিবর্তন">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                    </svg>
                                </button>

                                <!-- Reset Password -->
                                <button onclick="resetPassword(<?= $user['id'] ?>)" class="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg" title="পাসওয়ার্ড রিসেট">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                                    </svg>
                                </button>

                                <!-- Toggle Active -->
                                <form method="POST" class="inline">
                                    <?= csrfField() ?>
                                    <input type="hidden" name="action" value="toggle_active">
                                    <input type="hidden" name="user_id" value="<?= $user['id'] ?>">
                                    <button type="submit" class="p-2 <?= $user['is_active'] ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50' ?> rounded-lg" title="<?= $user['is_active'] ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন' ?>">
                                        <?php if ($user['is_active']): ?>
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                                        </svg>
                                        <?php else: ?>
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        <?php endif; ?>
                                    </button>
                                </form>

                                <!-- Delete -->
                                <form method="POST" class="inline" onsubmit="return confirm('এই ব্যবহারকারী মুছে ফেলতে চান?')">
                                    <?= csrfField() ?>
                                    <input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="user_id" value="<?= $user['id'] ?>">
                                    <button type="submit" class="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="মুছুন">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </form>
                            </div>
                            <?php else: ?>
                            <span class="text-xs text-gray-400">আপনি</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="mt-6">
            <?= paginationHtml($pagination, '' . ($search ? '?q=' . urlencode($search) : '')) ?>
        </div>
        <?php endif; ?>
    </div>
</div>

<!-- Change Role Modal -->
<div id="role-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">ভূমিকা পরিবর্তন</h3>
        <form method="POST">
            <?= csrfField() ?>
            <input type="hidden" name="action" value="update_role">
            <input type="hidden" name="user_id" id="role-user-id">
            <select name="new_role" id="role-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4">
                <?php foreach ($roles as $key => $label): ?>
                <option value="<?= e($key) ?>"><?= e($label) ?></option>
                <?php endforeach; ?>
            </select>
            <div class="flex gap-3">
                <button type="button" onclick="closeRoleModal()" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">বাতিল</button>
                <button type="submit" class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">সংরক্ষণ</button>
            </div>
        </form>
    </div>
</div>

<!-- Reset Password Modal -->
<div id="password-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">পাসওয়ার্ড রিসেট</h3>
        <form method="POST">
            <?= csrfField() ?>
            <input type="hidden" name="action" value="reset_password">
            <input type="hidden" name="user_id" id="password-user-id">
            <input type="password" name="new_password" required minlength="6" placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4">
            <div class="flex gap-3">
                <button type="button" onclick="closePasswordModal()" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">বাতিল</button>
                <button type="submit" class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">রিসেট</button>
            </div>
        </form>
    </div>
</div>

<script>
function changeRole(userId, currentRole) {
    document.getElementById('role-user-id').value = userId;
    document.getElementById('role-select').value = currentRole;
    document.getElementById('role-modal').classList.remove('hidden');
    document.getElementById('role-modal').classList.add('flex');
}

function closeRoleModal() {
    document.getElementById('role-modal').classList.add('hidden');
    document.getElementById('role-modal').classList.remove('flex');
}

function resetPassword(userId) {
    document.getElementById('password-user-id').value = userId;
    document.getElementById('password-modal').classList.remove('hidden');
    document.getElementById('password-modal').classList.add('flex');
}

function closePasswordModal() {
    document.getElementById('password-modal').classList.add('hidden');
    document.getElementById('password-modal').classList.remove('flex');
}
</script>

<?php require_once dirname(dirname(__DIR__)) . '/admin/includes/footer.php'; ?>
