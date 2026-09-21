<?php
$pageTitle = 'মিডিয়া ব্যবস্থাপনা';
require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();

$type = $_GET['type'] ?? '';
$category = $_GET['category'] ?? '';
$search = $_GET['q'] ?? '';
$page = (int)($_GET['page'] ?? 1);

// Build query
$where = "1=1";
$params = [];

if ($type) {
    $where .= " AND media_type = :type";
    $params['type'] = $type;
}

if ($category) {
    $where .= " AND category = :category";
    $params['category'] = $category;
}

if ($search) {
    $where .= " AND (title LIKE :search OR description LIKE :search)";
    $params['search'] = "%{$search}%";
}

// Get media with pagination
$sql = "SELECT * FROM media WHERE {$where} ORDER BY is_featured DESC, created_at DESC";
$pagination = Database::paginate($sql, $params, $page, 20);
$mediaItems = $pagination['items'];

// Get stats
$stats = [
    'total' => Database::fetchValue("SELECT COUNT(*) FROM media"),
    'youtube' => Database::fetchValue("SELECT COUNT(*) FROM media WHERE media_type = 'youtube'"),
    'photo' => Database::fetchValue("SELECT COUNT(*) FROM media WHERE media_type = 'photo'"),
    'featured' => Database::fetchValue("SELECT COUNT(*) FROM media WHERE is_featured = 1")
];

$categories = ['সাক্ষাৎকার', 'আন্দোলন', 'সংবাদ', 'বিশ্লেষণ', 'টক_শো', 'ইভেন্ট', 'অন্যান্য'];

// Handle delete
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete'])) {
    if (validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
        $deleteId = (int)$_POST['delete'];
        $media = Database::fetchOne("SELECT * FROM media WHERE id = :id", ['id' => $deleteId]);

        if ($media) {
            if ($media['media_type'] === 'photo' && $media['url']) {
                deleteFile($media['url'], 'media');
            }
            Database::delete('media', 'id = :id', ['id' => $deleteId]);
            setFlashMessage('মিডিয়া মুছে ফেলা হয়েছে।', 'success');
        }
        header('Location: ' . ADMIN_URL . '/media');
        exit;
    }
}

require_once dirname(dirname(__DIR__)) . '/admin/includes/header.php';
?>

<div class="space-y-6">
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-gray-400">
            <p class="text-sm text-gray-500">মোট মিডিয়া</p>
            <p class="text-2xl font-bold text-gray-800"><?= toBengaliDigits($stats['total']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <p class="text-sm text-gray-500">ইউটিউব ভিডিও</p>
            <p class="text-2xl font-bold text-red-600"><?= toBengaliDigits($stats['youtube']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <p class="text-sm text-gray-500">ছবি</p>
            <p class="text-2xl font-bold text-blue-600"><?= toBengaliDigits($stats['photo']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <p class="text-sm text-gray-500">ফিচার্ড</p>
            <p class="text-2xl font-bold text-yellow-600"><?= toBengaliDigits($stats['featured']) ?></p>
        </div>
    </div>

    <!-- Header & Filters -->
    <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 class="text-xl font-semibold text-gray-800">মিডিয়া তালিকা</h2>
            <a href="upload" class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                নতুন আপলোড
            </a>
        </div>

        <!-- Filters -->
        <form method="GET" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <select name="type" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                <option value="">সব ধরন</option>
                <option value="youtube" <?= $type === 'youtube' ? 'selected' : '' ?>>ইউটিউব ভিডিও</option>
                <option value="photo" <?= $type === 'photo' ? 'selected' : '' ?>>ছবি</option>
            </select>
            <select name="category" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                <option value="">সব বিভাগ</option>
                <?php foreach ($categories as $c): ?>
                <option value="<?= e($c) ?>" <?= $category === $c ? 'selected' : '' ?>><?= e(str_replace('_', ' ', $c)) ?></option>
                <?php endforeach; ?>
            </select>
            <input type="text" name="q" value="<?= e($search) ?>" placeholder="অনুসন্ধান..."
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
            <button type="submit" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                ফিল্টার
            </button>
        </form>

        <!-- Media Grid -->
        <?php if (empty($mediaItems)): ?>
        <div class="text-center py-12">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p class="text-gray-500">কোনো মিডিয়া পাওয়া যায়নি।</p>
        </div>
        <?php else: ?>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <?php foreach ($mediaItems as $item): ?>
            <div class="bg-gray-50 rounded-lg overflow-hidden group relative">
                <?php if ($item['media_type'] === 'youtube'): ?>
                <div class="aspect-video bg-black relative">
                    <img src="https://img.youtube.com/vi/<?= e($item['youtube_id']) ?>/mqdefault.jpg" alt="" class="w-full h-full object-cover">
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                    </div>
                </div>
                <?php else: ?>
                <div class="aspect-video bg-gray-200">
                    <img src="<?= UPLOADS_URL ?>/media/<?= e($item['url']) ?>" alt="" class="w-full h-full object-cover">
                </div>
                <?php endif; ?>

                <div class="p-3">
                    <p class="text-sm font-medium text-gray-800 line-clamp-1"><?= e($item['title']) ?></p>
                    <div class="flex items-center justify-between mt-2">
                        <span class="text-xs text-gray-500"><?= e(str_replace('_', ' ', $item['category'])) ?></span>
                        <?php if ($item['is_featured']): ?>
                        <span class="text-xs text-yellow-600">★ ফিচার্ড</span>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Overlay Actions -->
                <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <a href="edit?id=<?= $item['id'] ?>" class="p-2 bg-white rounded-lg text-blue-600 hover:bg-blue-50">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </a>
                    <form method="POST" class="inline" onsubmit="return confirm('মুছে ফেলতে চান?')">
                        <?= csrfField() ?>
                        <button type="submit" name="delete" value="<?= $item['id'] ?>" class="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- Pagination -->
        <div class="mt-6">
            <?= paginationHtml($pagination, '' . ($type ? '?type=' . urlencode($type) : '') . ($category ? ($type ? '&' : '?') . 'category=' . urlencode($category) : '') . ($search ? (($type || $category) ? '&' : '?') . 'q=' . urlencode($search) : '')) ?>
        </div>
        <?php endif; ?>
    </div>
</div>

<?php require_once dirname(dirname(__DIR__)) . '/admin/includes/footer.php'; ?>
