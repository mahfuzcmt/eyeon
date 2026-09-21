<?php
// Include functions first for redirects before any output
require_once dirname(__DIR__, 2) . '/includes/functions.php';
require_once dirname(__DIR__, 2) . '/includes/auth.php';
requireAuth();

// Handle delete BEFORE including header
if (isset($_GET['delete']) && canEdit()) {
    $id = (int)$_GET['delete'];
    if (validateCsrfToken($_GET['token'] ?? '')) {
        // Get the news to delete image
        $news = Database::fetchOne("SELECT featured_image FROM news WHERE id = :id", ['id' => $id]);
        if ($news && $news['featured_image']) {
            deleteFile($news['featured_image']);
        }
        Database::delete('news', 'id = :id', ['id' => $id]);
        redirect(ADMIN_URL . '/news', 'success', 'সংবাদ সফলভাবে মুছে ফেলা হয়েছে।');
    }
}

// Filters
$status = $_GET['status'] ?? '';
$category = $_GET['category'] ?? '';
$search = $_GET['search'] ?? '';
$page = (int)($_GET['page'] ?? 1);

// Build query
$where = [];
$params = [];

if ($status) {
    $where[] = 'status = :status';
    $params['status'] = $status;
}

if ($category) {
    $where[] = 'category = :category';
    $params['category'] = $category;
}

if ($search) {
    $where[] = '(title LIKE :search OR summary LIKE :search)';
    $params['search'] = '%' . $search . '%';
}

$whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$sql = "SELECT n.*, u.full_name as author_name FROM news n
        LEFT JOIN admin_users u ON n.author_id = u.id
        {$whereClause}
        ORDER BY n.created_at DESC";

$pagination = Database::paginate($sql, $params, $page, ADMIN_ITEMS_PER_PAGE);
$news = $pagination['items'];

$categories = ['সরকারি_কার্যক্রম', 'উন্নয়ন', 'জনসভা', 'স্বাস্থ্য', 'শিক্ষা', 'যুব_কার্যক্রম', 'অন্যান্য'];

// Include header after all redirects
$pageTitle = 'সংবাদ ব্যবস্থাপনা';
require_once dirname(__DIR__) . '/includes/header.php';
?>

<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
    <div>
        <p class="text-gray-500">মোট <?= toBengaliDigits($pagination['total']) ?> টি সংবাদ</p>
    </div>
    <?php if (canEdit()): ?>
    <a href="<?= ADMIN_URL ?>/news/create" class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        নতুন সংবাদ
    </a>
    <?php endif; ?>
</div>

<!-- Filters -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
    <form method="GET" class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
            <input type="text" name="search" value="<?= e($search) ?>" placeholder="শিরোনাম দিয়ে খুঁজুন..." class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>
        <div>
            <select name="status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value="">সব স্ট্যাটাস</option>
                <option value="draft" <?= $status === 'draft' ? 'selected' : '' ?>>ড্রাফট</option>
                <option value="published" <?= $status === 'published' ? 'selected' : '' ?>>প্রকাশিত</option>
            </select>
        </div>
        <div>
            <select name="category" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value="">সব ক্যাটাগরি</option>
                <?php foreach ($categories as $cat): ?>
                <option value="<?= e($cat) ?>" <?= $category === $cat ? 'selected' : '' ?>><?= e(str_replace('_', ' ', $cat)) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <button type="submit" class="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition">
            ফিল্টার
        </button>
        <?php if ($search || $status || $category): ?>
        <a href="<?= ADMIN_URL ?>/news" class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-center">
            রিসেট
        </a>
        <?php endif; ?>
    </form>
</div>

<!-- News List -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div class="overflow-x-auto">
        <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-100">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">সংবাদ</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ক্যাটাগরি</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">স্ট্যাটাস</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ভিউ</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">তারিখ</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">অ্যাকশন</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                <?php if (empty($news)): ?>
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                        কোনো সংবাদ পাওয়া যায়নি
                    </td>
                </tr>
                <?php else: ?>
                <?php foreach ($news as $item): ?>
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-4">
                        <div class="flex items-center">
                            <?php if ($item['featured_image']): ?>
                            <img src="<?= UPLOADS_URL ?>/<?= e($item['featured_image']) ?>" alt="" class="w-12 h-12 rounded-lg object-cover mr-4">
                            <?php else: ?>
                            <div class="w-12 h-12 bg-gray-200 rounded-lg mr-4 flex items-center justify-center">
                                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </div>
                            <?php endif; ?>
                            <div>
                                <p class="text-sm font-medium text-gray-900"><?= e(truncate($item['title'], 50)) ?></p>
                                <p class="text-xs text-gray-500"><?= e($item['author_name'] ?? 'Unknown') ?></p>
                                <?php if ($item['is_featured']): ?>
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                                    ফিচার্ড
                                </span>
                                <?php endif; ?>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-sm text-gray-600"><?= e(str_replace('_', ' ', $item['category'])) ?></span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 text-xs rounded-full <?= getStatusBadgeClass($item['status']) ?>">
                            <?= $item['status'] === 'published' ? 'প্রকাশিত' : 'ড্রাফট' ?>
                        </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-600">
                        <?= toBengaliDigits($item['views_count']) ?>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-600">
                        <?= formatBengaliDate($item['created_at']) ?>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end space-x-2">
                            <a href="<?= SITE_URL ?>/news/<?= e($item['slug']) ?>" target="_blank" class="p-2 text-gray-400 hover:text-gray-600" title="প্রিভিউ">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                            </a>
                            <?php if (canEdit()): ?>
                            <a href="<?= ADMIN_URL ?>/news/edit?id=<?= $item['id'] ?>" class="p-2 text-blue-500 hover:text-blue-700" title="এডিট">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </a>
                            <a href="<?= ADMIN_URL ?>/news?delete=<?= $item['id'] ?>&token=<?= generateCsrfToken() ?>" onclick="return confirm('আপনি কি নিশ্চিত?')" class="p-2 text-red-500 hover:text-red-700" title="মুছুন">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </a>
                            <?php endif; ?>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Pagination -->
<?= paginationHtml($pagination, ADMIN_URL . '/news?' . http_build_query(array_filter(['status' => $status, 'category' => $category, 'search' => $search]))) ?>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
