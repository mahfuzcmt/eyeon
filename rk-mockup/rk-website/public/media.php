<?php
$pageTitle = 'মিডিয়া গ্যালারি';
require_once dirname(__DIR__) . '/includes/header.php';

$type = $_GET['type'] ?? '';
$category = $_GET['category'] ?? '';
$page = (int)($_GET['page'] ?? 1);

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

$sql = "SELECT * FROM media WHERE {$where} ORDER BY is_featured DESC, created_at DESC";
$pagination = Database::paginate($sql, $params, $page, 12);
$media = $pagination['items'];

$categories = ['সাক্ষাৎকার', 'আন্দোলন', 'সংবাদ', 'বিশ্লেষণ', 'টক_শো', 'ইভেন্ট', 'অন্যান্য'];
?>

<section class="py-12">
    <div class="container mx-auto px-4">
        <!-- Header -->
        <div class="text-center mb-10">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">মিডিয়া গ্যালারি</h1>
            <p class="text-gray-600">
                ভিডিও ও ছবি সংকলন
            </p>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap justify-center gap-2 mb-10">
            <a href="<?= SITE_URL ?>/media" class="px-4 py-2 rounded-full text-sm font-medium transition <?= !$type && !$category ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' ?>">
                সব
            </a>
            <a href="<?= SITE_URL ?>/media?type=youtube" class="px-4 py-2 rounded-full text-sm font-medium transition <?= $type === 'youtube' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' ?>">
                ভিডিও
            </a>
            <a href="<?= SITE_URL ?>/media?type=photo" class="px-4 py-2 rounded-full text-sm font-medium transition <?= $type === 'photo' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' ?>">
                ছবি
            </a>
        </div>

        <!-- Category Filter -->
        <div class="flex flex-wrap justify-center gap-2 mb-10">
            <?php foreach ($categories as $cat): ?>
            <a href="<?= SITE_URL ?>/media?category=<?= urlencode($cat) ?>" class="px-3 py-1 rounded-full text-xs font-medium transition <?= $category === $cat ? 'bg-primary-100 text-primary-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100' ?>">
                <?= e(str_replace('_', ' ', $cat)) ?>
            </a>
            <?php endforeach; ?>
        </div>

        <!-- Media Grid -->
        <?php if (empty($media)): ?>
        <div class="text-center py-12">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
            </div>
            <p class="text-gray-500">কোনো মিডিয়া পাওয়া যায়নি।</p>
        </div>
        <?php else: ?>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <?php foreach ($media as $item): ?>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition group">
                <?php if ($item['media_type'] === 'youtube'): ?>
                <!-- YouTube Video -->
                <div class="relative pb-[56.25%] bg-black">
                    <img src="https://img.youtube.com/vi/<?= e($item['youtube_id']) ?>/maxresdefault.jpg" alt="" class="absolute inset-0 w-full h-full object-cover">
                    <a href="https://www.youtube.com/watch?v=<?= e($item['youtube_id']) ?>" target="_blank" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-50 transition">
                        <div class="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                            <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                    </a>
                    <?php if ($item['is_featured']): ?>
                    <span class="absolute top-3 right-3 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs rounded font-medium">ফিচার্ড</span>
                    <?php endif; ?>
                </div>
                <?php else: ?>
                <!-- Photo -->
                <a href="<?= UPLOADS_URL ?>/<?= e($item['url']) ?>" target="_blank" class="block">
                    <img src="<?= UPLOADS_URL ?>/<?= e($item['url']) ?>" alt="" class="w-full h-48 object-cover group-hover:scale-105 transition duration-300">
                </a>
                <?php endif; ?>

                <div class="p-4">
                    <span class="text-xs text-primary-600 font-medium"><?= e(str_replace('_', ' ', $item['category'])) ?></span>
                    <h3 class="font-semibold text-gray-800 mt-1 line-clamp-2"><?= e($item['title']) ?></h3>
                    <?php if ($item['description']): ?>
                    <p class="text-sm text-gray-600 mt-1 line-clamp-2"><?= e($item['description']) ?></p>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- Pagination -->
        <?= paginationHtml($pagination, SITE_URL . '/media' . ($type ? '?type=' . urlencode($type) : '') . ($category ? ($type ? '&' : '?') . 'category=' . urlencode($category) : '')) ?>
        <?php endif; ?>
    </div>
</section>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
