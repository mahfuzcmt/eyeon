<?php
require_once dirname(__DIR__) . '/includes/functions.php';

$slug = $_GET['slug'] ?? '';
if (empty($slug)) {
    redirect(SITE_URL . '/news');
}

$news = Database::fetchOne(
    "SELECT n.*, u.full_name as author_name FROM news n
     LEFT JOIN admin_users u ON n.author_id = u.id
     WHERE n.slug = :slug AND n.status = 'published'",
    ['slug' => $slug]
);

if (!$news) {
    redirect(SITE_URL . '/news');
}

// Increment view count
Database::execute("UPDATE news SET views_count = views_count + 1 WHERE id = :id", ['id' => $news['id']]);

// Get related news
$relatedNews = Database::fetchAll(
    "SELECT * FROM news WHERE status = 'published' AND id != :id AND category = :category ORDER BY published_at DESC LIMIT 3",
    ['id' => $news['id'], 'category' => $news['category']]
);

$pageTitle = $news['title'];
require_once dirname(__DIR__) . '/includes/header.php';
?>

<article class="py-12">
    <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
            <!-- Breadcrumb -->
            <nav class="mb-6">
                <ol class="flex items-center space-x-2 text-sm">
                    <li><a href="<?= SITE_URL ?>" class="text-gray-500 hover:text-primary-600">হোম</a></li>
                    <li><span class="text-gray-400">/</span></li>
                    <li><a href="<?= SITE_URL ?>/news" class="text-gray-500 hover:text-primary-600">সংবাদ</a></li>
                    <li><span class="text-gray-400">/</span></li>
                    <li class="text-gray-700"><?= e(truncate($news['title'], 30)) ?></li>
                </ol>
            </nav>

            <!-- Header -->
            <header class="mb-8">
                <div class="flex items-center gap-3 mb-4">
                    <a href="<?= SITE_URL ?>/news?category=<?= urlencode($news['category']) ?>" class="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full hover:bg-primary-200 transition">
                        <?= e(str_replace('_', ' ', $news['category'])) ?>
                    </a>
                    <?php if ($news['is_featured']): ?>
                    <span class="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">ফিচার্ড</span>
                    <?php endif; ?>
                </div>

                <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4 leading-tight">
                    <?= e($news['title']) ?>
                </h1>

                <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <?= formatBengaliDate($news['published_at'] ?? $news['created_at']) ?>
                    </span>
                    <?php if ($news['author_name']): ?>
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        <?= e($news['author_name']) ?>
                    </span>
                    <?php endif; ?>
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        <?= toBengaliDigits($news['views_count'] + 1) ?> বার দেখা হয়েছে
                    </span>
                </div>
            </header>

            <!-- Featured Image -->
            <?php if ($news['featured_image']): ?>
            <figure class="mb-8">
                <img src="<?= UPLOADS_URL ?>/<?= e($news['featured_image']) ?>" alt="<?= e($news['title']) ?>" class="w-full rounded-xl shadow-md">
            </figure>
            <?php endif; ?>

            <!-- Summary -->
            <?php if ($news['summary']): ?>
            <div class="bg-gray-50 border-l-4 border-primary-600 p-4 mb-8 rounded-r-lg">
                <p class="text-lg text-gray-700 italic"><?= e($news['summary']) ?></p>
            </div>
            <?php endif; ?>

            <!-- Content -->
            <div class="prose prose-lg max-w-none">
                <?= $news['content'] ?>
            </div>

            <!-- Share -->
            <div class="mt-10 pt-6 border-t">
                <p class="text-sm text-gray-500 mb-3">শেয়ার করুন:</p>
                <div class="flex gap-3">
                    <a href="https://www.facebook.com/sharer/sharer.php?u=<?= urlencode(currentUrl()) ?>" target="_blank" class="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                    </a>
                    <a href="https://twitter.com/intent/tweet?url=<?= urlencode(currentUrl()) ?>&text=<?= urlencode($news['title']) ?>" target="_blank" class="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </a>
                    <a href="https://wa.me/?text=<?= urlencode($news['title'] . ' ' . currentUrl()) ?>" target="_blank" class="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                    </a>
                </div>
            </div>
        </div>

        <!-- Related News -->
        <?php if ($relatedNews): ?>
        <div class="max-w-6xl mx-auto mt-16">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">সম্পর্কিত সংবাদ</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <?php foreach ($relatedNews as $related): ?>
                <a href="<?= SITE_URL ?>/news/<?= e($related['slug']) ?>" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition group">
                    <?php if ($related['featured_image']): ?>
                    <img src="<?= UPLOADS_URL ?>/<?= e($related['featured_image']) ?>" alt="" class="w-full h-40 object-cover">
                    <?php else: ?>
                    <div class="w-full h-40 bg-gray-100 flex items-center justify-center">
                        <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                        </svg>
                    </div>
                    <?php endif; ?>
                    <div class="p-4">
                        <h3 class="font-semibold text-gray-800 group-hover:text-primary-600 transition line-clamp-2">
                            <?= e($related['title']) ?>
                        </h3>
                        <p class="text-xs text-gray-400 mt-2"><?= formatBengaliDate($related['published_at'] ?? $related['created_at']) ?></p>
                    </div>
                </a>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>
    </div>
</article>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
