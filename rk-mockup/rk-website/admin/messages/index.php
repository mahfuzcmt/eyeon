<?php
$pageTitle = 'যোগাযোগ বার্তা';
require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();

$status = $_GET['status'] ?? '';
$search = $_GET['q'] ?? '';
$page = (int)($_GET['page'] ?? 1);

// Build query
$where = "1=1";
$params = [];

if ($status) {
    $where .= " AND status = :status";
    $params['status'] = $status;
}

if ($search) {
    $where .= " AND (name LIKE :search OR email LIKE :search OR subject LIKE :search OR message LIKE :search)";
    $params['search'] = "%{$search}%";
}

// Get messages with pagination
$sql = "SELECT * FROM contact_messages WHERE {$where} ORDER BY created_at DESC";
$pagination = Database::paginate($sql, $params, $page, 20);
$messages = $pagination['items'];

// Get stats
$stats = [
    'total' => Database::fetchValue("SELECT COUNT(*) FROM contact_messages"),
    'new' => Database::fetchValue("SELECT COUNT(*) FROM contact_messages WHERE status = 'নতুন'"),
    'read' => Database::fetchValue("SELECT COUNT(*) FROM contact_messages WHERE status = 'পড়া'"),
    'replied' => Database::fetchValue("SELECT COUNT(*) FROM contact_messages WHERE status = 'উত্তর_দেওয়া'")
];

$statuses = ['নতুন', 'পড়া', 'উত্তর_দেওয়া'];

// Handle status update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['mark_read'])) {
    if (validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
        $msgId = (int)$_POST['mark_read'];
        Database::update('contact_messages', ['status' => 'পড়া'], 'id = :id AND status = :old', ['id' => $msgId, 'old' => 'নতুন']);
        header('Location: ' . ADMIN_URL . '/messages' . ($status ? '?status=' . urlencode($status) : ''));
        exit;
    }
}

// Handle delete
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete'])) {
    if (validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
        $msgId = (int)$_POST['delete'];
        Database::delete('contact_messages', 'id = :id', ['id' => $msgId]);
        setFlashMessage('বার্তা মুছে ফেলা হয়েছে।', 'success');
        header('Location: ' . ADMIN_URL . '/messages');
        exit;
    }
}

require_once dirname(dirname(__DIR__)) . '/admin/includes/header.php';
?>

<div class="space-y-6">
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-gray-400">
            <p class="text-sm text-gray-500">মোট বার্তা</p>
            <p class="text-2xl font-bold text-gray-800"><?= toBengaliDigits($stats['total']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <p class="text-sm text-gray-500">নতুন</p>
            <p class="text-2xl font-bold text-blue-600"><?= toBengaliDigits($stats['new']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <p class="text-sm text-gray-500">পড়া হয়েছে</p>
            <p class="text-2xl font-bold text-yellow-600"><?= toBengaliDigits($stats['read']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <p class="text-sm text-gray-500">উত্তর দেওয়া</p>
            <p class="text-2xl font-bold text-green-600"><?= toBengaliDigits($stats['replied']) ?></p>
        </div>
    </div>

    <!-- Messages List -->
    <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 class="text-xl font-semibold text-gray-800">যোগাযোগ বার্তা</h2>
        </div>

        <!-- Filters -->
        <form method="GET" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <select name="status" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                <option value="">সব অবস্থা</option>
                <?php foreach ($statuses as $s): ?>
                <option value="<?= e($s) ?>" <?= $status === $s ? 'selected' : '' ?>><?= e(str_replace('_', ' ', $s)) ?></option>
                <?php endforeach; ?>
            </select>
            <input type="text" name="q" value="<?= e($search) ?>" placeholder="অনুসন্ধান..."
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
            <button type="submit" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                ফিল্টার
            </button>
        </form>

        <!-- Messages -->
        <?php if (empty($messages)): ?>
        <div class="text-center py-12">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <p class="text-gray-500">কোনো বার্তা পাওয়া যায়নি।</p>
        </div>
        <?php else: ?>
        <div class="space-y-4">
            <?php foreach ($messages as $msg): ?>
            <div class="border rounded-lg p-4 <?= $msg['status'] === 'নতুন' ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50' ?>">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <h3 class="font-medium text-gray-800"><?= e($msg['name']) ?></h3>
                            <?php if ($msg['status'] === 'নতুন'): ?>
                            <span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">নতুন</span>
                            <?php elseif ($msg['status'] === 'উত্তর_দেওয়া'): ?>
                            <span class="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">উত্তর দেওয়া</span>
                            <?php endif; ?>
                        </div>
                        <p class="text-sm text-gray-500 mb-2">
                            <a href="mailto:<?= e($msg['email']) ?>" class="text-primary-600 hover:text-primary-700"><?= e($msg['email']) ?></a>
                            <?php if ($msg['phone']): ?>
                            • <a href="tel:<?= e($msg['phone']) ?>" class="text-primary-600 hover:text-primary-700"><?= e($msg['phone']) ?></a>
                            <?php endif; ?>
                        </p>
                        <?php if ($msg['subject']): ?>
                        <p class="text-sm font-medium text-gray-700 mb-1"><?= e($msg['subject']) ?></p>
                        <?php endif; ?>
                        <p class="text-sm text-gray-600 line-clamp-2"><?= e($msg['message']) ?></p>
                        <p class="text-xs text-gray-400 mt-2"><?= timeAgo($msg['created_at']) ?></p>
                    </div>
                    <div class="flex items-center gap-2 ml-4">
                        <button onclick="viewMessage(<?= $msg['id'] ?>)" class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="বিস্তারিত">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                        </button>
                        <a href="mailto:<?= e($msg['email']) ?>?subject=Re: <?= e($msg['subject'] ?? 'আপনার বার্তা') ?>" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="উত্তর দিন">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                            </svg>
                        </a>
                        <?php if ($msg['status'] === 'নতুন'): ?>
                        <form method="POST" class="inline">
                            <?= csrfField() ?>
                            <button type="submit" name="mark_read" value="<?= $msg['id'] ?>" class="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="পড়া হিসেবে চিহ্নিত করুন">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                            </button>
                        </form>
                        <?php endif; ?>
                        <form method="POST" class="inline" onsubmit="return confirm('মুছে ফেলতে চান?')">
                            <?= csrfField() ?>
                            <button type="submit" name="delete" value="<?= $msg['id'] ?>" class="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="মুছুন">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- Pagination -->
        <div class="mt-6">
            <?= paginationHtml($pagination, '' . ($status ? '?status=' . urlencode($status) : '') . ($search ? ($status ? '&' : '?') . 'q=' . urlencode($search) : '')) ?>
        </div>
        <?php endif; ?>
    </div>
</div>

<!-- Message Detail Modal -->
<div id="message-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-800">বার্তার বিস্তারিত</h3>
            <button onclick="closeModal()" class="p-2 hover:bg-gray-100 rounded-lg">
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
        <div id="modal-content"></div>
    </div>
</div>

<script>
const messagesData = <?= json_encode(array_map(function($m) {
    return [
        'id' => $m['id'],
        'name' => $m['name'],
        'email' => $m['email'],
        'phone' => $m['phone'],
        'subject' => $m['subject'],
        'message' => $m['message'],
        'status' => $m['status'],
        'created_at' => formatBengaliDate($m['created_at'], 'd F, Y h:i A')
    ];
}, $messages)) ?>;

function viewMessage(id) {
    const msg = messagesData.find(m => m.id === id);
    if (!msg) return;

    const modal = document.getElementById('message-modal');
    const content = document.getElementById('modal-content');

    content.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-500">প্রেরক</p>
                    <p class="font-medium text-gray-800">${msg.name}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">তারিখ</p>
                    <p class="font-medium text-gray-800">${msg.created_at}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">ইমেইল</p>
                    <a href="mailto:${msg.email}" class="font-medium text-primary-600 hover:text-primary-700">${msg.email}</a>
                </div>
                ${msg.phone ? `
                <div>
                    <p class="text-sm text-gray-500">ফোন</p>
                    <a href="tel:${msg.phone}" class="font-medium text-primary-600 hover:text-primary-700">${msg.phone}</a>
                </div>
                ` : ''}
            </div>
            ${msg.subject ? `
            <div>
                <p class="text-sm text-gray-500">বিষয়</p>
                <p class="font-medium text-gray-800">${msg.subject}</p>
            </div>
            ` : ''}
            <div>
                <p class="text-sm text-gray-500 mb-2">বার্তা</p>
                <div class="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap">${msg.message}</div>
            </div>
            <div class="flex gap-3 pt-4 border-t">
                <a href="mailto:${msg.email}?subject=Re: ${msg.subject || 'আপনার বার্তা'}" class="flex-1 px-4 py-2 bg-primary-600 text-white text-center rounded-lg hover:bg-primary-700 transition">
                    উত্তর দিন
                </a>
                ${msg.phone ? `
                <a href="tel:${msg.phone}" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                    কল করুন
                </a>
                ` : ''}
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Mark as read via AJAX
    if (msg.status === 'নতুন') {
        fetch('', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'mark_read=' + id + '&<?= CSRF_TOKEN_NAME ?>=<?= e($_SESSION[CSRF_TOKEN_NAME]) ?>'
        });
    }
}

function closeModal() {
    const modal = document.getElementById('message-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

document.getElementById('message-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});
</script>

<?php require_once dirname(dirname(__DIR__)) . '/admin/includes/footer.php'; ?>
