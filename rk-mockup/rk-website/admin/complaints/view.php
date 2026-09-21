<?php
// Include functions first for database and redirect
require_once dirname(__DIR__, 2) . '/includes/functions.php';
require_once dirname(__DIR__, 2) . '/includes/auth.php';
requireAuth();

// Validate complaint ID BEFORE including header (which outputs HTML)
$id = (int)($_GET['id'] ?? 0);
if (!$id) {
    redirect(ADMIN_URL . '/complaints', 'error', 'অভিযোগ পাওয়া যায়নি।');
}

$complaint = Database::fetchOne("SELECT * FROM complaints WHERE id = :id", ['id' => $id]);
if (!$complaint) {
    redirect(ADMIN_URL . '/complaints', 'error', 'অভিযোগ পাওয়া যায়নি।');
}

// Handle status update (before any output)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && canEdit()) {
    if (validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
        $newStatus = $_POST['status'] ?? '';
        $notes = trim($_POST['notes'] ?? '');
        $department = trim($_POST['assigned_department'] ?? '');

        $validStatuses = ['দাখিল', 'পর্যালোচনাধীন', 'কার্যক্রম', 'সমাধান'];
        if (in_array($newStatus, $validStatuses)) {
            $updateData = [
                'status' => $newStatus,
                'assigned_department' => $department
            ];

            if ($notes) {
                $updateData['resolution_notes'] = $notes;
            }

            if ($newStatus === 'সমাধান') {
                $updateData['resolved_at'] = date('Y-m-d H:i:s');
            }

            Database::update('complaints', $updateData, 'id = :id', ['id' => $id]);

            // Log the action
            Database::insert('complaint_logs', [
                'complaint_id' => $id,
                'action' => 'স্ট্যাটাস পরিবর্তন',
                'description' => "স্ট্যাটাস পরিবর্তন করা হয়েছে: {$newStatus}" . ($notes ? "\nনোট: {$notes}" : ''),
                'updated_by' => currentUserId()
            ]);

            redirect(ADMIN_URL . '/complaints/view?id=' . $id, 'success', 'অভিযোগের স্ট্যাটাস আপডেট করা হয়েছে।');
        }
    }
}

// Get activity log
$logs = Database::fetchAll(
    "SELECT cl.*, u.full_name FROM complaint_logs cl
     LEFT JOIN admin_users u ON cl.updated_by = u.id
     WHERE cl.complaint_id = :id
     ORDER BY cl.created_at DESC",
    ['id' => $id]
);

$statuses = ['দাখিল', 'পর্যালোচনাধীন', 'কার্যক্রম', 'সমাধান'];

// Now include header (after all validation and redirects)
$pageTitle = 'অভিযোগ বিস্তারিত';
require_once dirname(__DIR__) . '/includes/header.php';
?>

<div class="mb-6">
    <a href="<?= ADMIN_URL ?>/complaints" class="text-gray-500 hover:text-gray-700 text-sm">
        ← অভিযোগ তালিকায় ফিরে যান
    </a>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Main Content -->
    <div class="lg:col-span-2 space-y-6">
        <!-- Complaint Details -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-gray-800">অভিযোগের বিবরণ</h2>
                <span class="px-3 py-1 text-sm rounded-full <?= getStatusBadgeClass($complaint['status']) ?>">
                    <?= e($complaint['status']) ?>
                </span>
            </div>

            <div class="space-y-4">
                <div>
                    <p class="text-sm text-gray-500">টিকেট নম্বর</p>
                    <p class="text-lg font-mono font-bold text-primary-600"><?= e($complaint['ticket_number']) ?></p>
                </div>

                <div>
                    <p class="text-sm text-gray-500">বিষয়</p>
                    <p class="text-gray-900 font-medium"><?= e($complaint['subject']) ?></p>
                </div>

                <div>
                    <p class="text-sm text-gray-500">বিস্তারিত বিবরণ</p>
                    <p class="text-gray-700 whitespace-pre-wrap"><?= e($complaint['description']) ?></p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-500">ক্যাটাগরি</p>
                        <p class="text-gray-900"><?= e($complaint['category']) ?></p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">দাখিলের তারিখ</p>
                        <p class="text-gray-900"><?= formatBengaliDate($complaint['submitted_at'], true) ?></p>
                    </div>
                </div>

                <?php if ($complaint['attachments']): ?>
                <div>
                    <p class="text-sm text-gray-500 mb-2">সংযুক্তি</p>
                    <?php
                    $attachments = json_decode($complaint['attachments'], true);
                    if ($attachments):
                    ?>
                    <div class="flex flex-wrap gap-2">
                        <?php foreach ($attachments as $attachment): ?>
                        <a href="<?= UPLOADS_URL ?>/<?= e($attachment) ?>" target="_blank" class="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                            </svg>
                            ফাইল দেখুন
                        </a>
                        <?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                </div>
                <?php endif; ?>

                <?php if ($complaint['resolution_notes']): ?>
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p class="text-sm text-green-700 font-medium mb-1">সমাধান নোট</p>
                    <p class="text-green-800"><?= e($complaint['resolution_notes']) ?></p>
                </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Activity Log -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">কার্যক্রম লগ</h2>

            <?php if (empty($logs)): ?>
            <p class="text-gray-500 text-sm">কোনো কার্যক্রম নেই</p>
            <?php else: ?>
            <div class="space-y-4">
                <?php foreach ($logs as $log): ?>
                <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-sm font-medium flex-shrink-0">
                        <?= mb_substr($log['full_name'] ?? 'S', 0, 1) ?>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-gray-900">
                            <span class="font-medium"><?= e($log['full_name'] ?? 'System') ?></span>
                            - <?= e($log['action']) ?>
                        </p>
                        <?php if ($log['description']): ?>
                        <p class="text-sm text-gray-600 mt-1"><?= nl2br(e($log['description'])) ?></p>
                        <?php endif; ?>
                        <p class="text-xs text-gray-400 mt-1"><?= timeAgo($log['created_at']) ?></p>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Sidebar -->
    <div class="space-y-6">
        <!-- Complainant Info -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">অভিযোগকারী</h3>

            <div class="space-y-3">
                <div>
                    <p class="text-sm text-gray-500">নাম</p>
                    <p class="text-gray-900">
                        <?= $complaint['is_anonymous'] ? 'বেনামী' : e($complaint['full_name']) ?>
                    </p>
                </div>

                <?php if (!$complaint['is_anonymous']): ?>
                <div>
                    <p class="text-sm text-gray-500">ফোন</p>
                    <a href="tel:<?= e($complaint['phone']) ?>" class="text-primary-600 hover:text-primary-700">
                        <?= e($complaint['phone']) ?>
                    </a>
                </div>

                <?php if ($complaint['email']): ?>
                <div>
                    <p class="text-sm text-gray-500">ইমেইল</p>
                    <a href="mailto:<?= e($complaint['email']) ?>" class="text-primary-600 hover:text-primary-700">
                        <?= e($complaint['email']) ?>
                    </a>
                </div>
                <?php endif; ?>

                <?php if ($complaint['nid_number']): ?>
                <div>
                    <p class="text-sm text-gray-500">NID</p>
                    <p class="text-gray-900"><?= e($complaint['nid_number']) ?></p>
                </div>
                <?php endif; ?>
                <?php endif; ?>

                <hr>

                <div>
                    <p class="text-sm text-gray-500">এলাকা</p>
                    <p class="text-gray-900">
                        <?= e($complaint['village'] ?? '') ?>
                        <?= $complaint['union_name'] ? ', ' . e($complaint['union_name']) : '' ?>
                        <?= $complaint['upazila'] ? ', ' . e($complaint['upazila']) : '' ?>
                        <?= $complaint['district'] ? ', ' . e($complaint['district']) : '' ?>
                    </p>
                </div>
            </div>
        </div>

        <!-- Update Status -->
        <?php if (canEdit()): ?>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">স্ট্যাটাস আপডেট</h3>

            <form method="POST" class="space-y-4">
                <?= csrfField() ?>

                <div>
                    <label for="status" class="block text-sm font-medium text-gray-700 mb-2">স্ট্যাটাস</label>
                    <select id="status" name="status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        <?php foreach ($statuses as $s): ?>
                        <option value="<?= e($s) ?>" <?= $complaint['status'] === $s ? 'selected' : '' ?>><?= e($s) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label for="assigned_department" class="block text-sm font-medium text-gray-700 mb-2">দায়িত্বপ্রাপ্ত বিভাগ</label>
                    <input type="text" id="assigned_department" name="assigned_department" value="<?= e($complaint['assigned_department'] ?? '') ?>" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="যেমন: সড়ক বিভাগ">
                </div>

                <div>
                    <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">নোট</label>
                    <textarea id="notes" name="notes" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="স্ট্যাটাস পরিবর্তনের কারণ বা নোট"></textarea>
                </div>

                <button type="submit" class="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                    আপডেট করুন
                </button>
            </form>
        </div>
        <?php endif; ?>

        <!-- Quick Actions -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">দ্রুত কার্যক্রম</h3>

            <div class="space-y-2">
                <a href="tel:<?= e($complaint['phone']) ?>" class="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                    কল করুন
                </a>
                <?php if ($complaint['email']): ?>
                <a href="mailto:<?= e($complaint['email']) ?>" class="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    ইমেইল করুন
                </a>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
