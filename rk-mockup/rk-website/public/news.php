<?php
$pageTitle = 'সংবাদ';
require_once dirname(__DIR__) . '/includes/header.php';

$category = $_GET['category'] ?? '';
$page = (int)($_GET['page'] ?? 1);

$where = "status = 'published'";
$params = [];

if ($category) {
    $where .= " AND category = :category";
    $params['category'] = $category;
}

$sql = "SELECT * FROM news WHERE {$where} ORDER BY published_at DESC";
$pagination = Database::paginate($sql, $params, $page, 9);
$news = $pagination['items'];

$categories = ['সরকারি_কার্যক্রম', 'উন্নয়ন', 'জনসভা', 'স্বাস্থ্য', 'শিক্ষা', 'যুব_কার্যক্রম', 'অন্যান্য'];
?>

<section class="py-12">
    <div class="container mx-auto px-4">
        <!-- Header -->
        <div class="text-center mb-10">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">সংবাদ ও কার্যক্রম</h1>
            <p class="text-gray-600">
                সাম্প্রতিক কার্যক্রম ও সংবাদ সমূহ
            </p>
        </div>

        <!-- Category Filter -->
        <div class="flex flex-wrap justify-center gap-2 mb-10">
            <a href="<?= SITE_URL ?>/news" class="px-4 py-2 rounded-full text-sm font-medium transition <?= !$category ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' ?>">
                সব
            </a>
            <?php foreach ($categories as $cat): ?>
            <a href="<?= SITE_URL ?>/news?category=<?= urlencode($cat) ?>" class="px-4 py-2 rounded-full text-sm font-medium transition <?= $category === $cat ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' ?>">
                <?= e(str_replace('_', ' ', $cat)) ?>
            </a>
            <?php endforeach; ?>
        </div>

        <!-- News Grid -->
        <?php if (empty($news)): ?>
        <div class="text-center py-12">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                </svg>
            </div>
            <p class="text-gray-500">কোনো সংবাদ পাওয়া যায়নি।</p>
        </div>
        <?php else: ?>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <?php foreach ($news as $item): ?>
            <a href="<?= SITE_URL ?>/news/<?= e($item['slug']) ?>" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition group">
                <?php if ($item['featured_image']): ?>
                <img src="<?= UPLOADS_URL ?>/<?= e($item['featured_image']) ?>" alt="" class="w-full h-48 object-cover group-hover:scale-105 transition duration-300">
                <?php else: ?>
                <div class="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                    </svg>
                </div>
                <?php endif; ?>
                <div class="p-5">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-xs text-primary-600 font-medium"><?= e(str_replace('_', ' ', $item['category'])) ?></span>
                        <?php if ($item['is_featured']): ?>
                        <span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">ফিচার্ড</span>
                        <?php endif; ?>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2 group-hover:text-primary-600 transition line-clamp-2">
                        <?= e($item['title']) ?>
                    </h3>
                    <p class="text-gray-600 text-sm line-clamp-2 mb-3">
                        <?= e($item['summary'] ?? truncate(strip_tags($item['content']), 100)) ?>
                    </p>
                    <p class="text-xs text-gray-400"><?= formatBengaliDate($item['published_at'] ?? $item['created_at']) ?></p>
                </div>
            </a>
            <?php endforeach; ?>
        </div>

        <!-- Pagination -->
        <?= paginationHtml($pagination, SITE_URL . '/news' . ($category ? '?category=' . urlencode($category) : '')) ?>
        <?php endif; ?>
    </div>
</section>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
