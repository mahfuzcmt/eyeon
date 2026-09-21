<?php
require_once dirname(__DIR__) . '/includes/header.php';

// Get featured news
$featuredNews = Database::fetchAll(
    "SELECT * FROM news WHERE status = 'published' AND is_featured = 1 ORDER BY published_at DESC LIMIT 3"
);

// Get recent news
$recentNews = Database::fetchAll(
    "SELECT * FROM news WHERE status = 'published' ORDER BY published_at DESC LIMIT 6"
);

// Get ongoing projects
$projects = Database::fetchAll(
    "SELECT * FROM projects WHERE status IN ('চলমান', 'সম্পন্ন') ORDER BY FIELD(status, 'চলমান', 'সম্পন্ন'), updated_at DESC LIMIT 4"
);

// Get featured video
$featuredVideo = Database::fetchOne(
    "SELECT * FROM media WHERE media_type = 'youtube' AND is_featured = 1 ORDER BY created_at DESC LIMIT 1"
);

// Stats
$stats = [
    'complaints_resolved' => Database::fetchValue("SELECT COUNT(*) FROM complaints WHERE status = 'সমাধান'"),
    'projects_completed' => Database::fetchValue("SELECT COUNT(*) FROM projects WHERE status = 'সম্পন্ন'"),
    'total_appointments' => Database::fetchValue("SELECT COUNT(*) FROM appointments WHERE status = 'সম্পন্ন'")
];
?>

<!-- Hero Section -->
<section class="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
    <div class="absolute inset-0 bg-black opacity-20"></div>
    <div class="container mx-auto px-4 py-20 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
                <h1 class="text-4xl md:text-5xl font-bold mb-4">
                    <?= e(getSetting('site_title', 'মো. রাশেদ খান, এমপি')) ?>
                </h1>
                <p class="text-xl text-primary-100 mb-6">
                    <?= e(getSetting('site_tagline', 'গাইবান্ধা-১ আসন')) ?>
                </p>
                <p class="text-lg text-primary-100 mb-8">
                    <?= e(truncate(getSetting('about_text', ''), 200)) ?>
                </p>
                <div class="flex flex-wrap gap-4">
                    <a href="<?= SITE_URL ?>/complaint" class="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        অভিযোগ দাখিল করুন
                    </a>
                    <a href="<?= SITE_URL ?>/appointment" class="inline-flex items-center px-6 py-3 bg-white text-primary-700 rounded-lg hover:bg-primary-50 transition font-medium">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        সাক্ষাৎকারের সময় নিন
                    </a>
                </div>
            </div>
            <div class="hidden lg:block">
                <?php if ($heroImage = getSetting('hero_image')): ?>
                <img src="<?= UPLOADS_URL ?>/<?= e($heroImage) ?>" alt="<?= e(getSetting('site_title')) ?>" class="rounded-2xl shadow-2xl">
                <?php else: ?>
                <div class="bg-white/10 rounded-2xl p-8 backdrop-blur">
                    <div class="text-center">
                        <div class="w-32 h-32 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span class="text-5xl font-bold">রা</span>
                        </div>
                        <p class="text-lg">জনগণের সেবায় নিবেদিত</p>
                    </div>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</section>

<!-- Stats Section -->
<section class="bg-white py-12 border-b">
    <div class="container mx-auto px-4">
        <div class="grid grid-cols-3 gap-8 text-center">
            <div>
                <p class="text-4xl font-bold text-primary-600"><?= toBengaliDigits($stats['complaints_resolved']) ?>+</p>
                <p class="text-gray-600 mt-2">সমাধানকৃত অভিযোগ</p>
            </div>
            <div>
                <p class="text-4xl font-bold text-primary-600"><?= toBengaliDigits($stats['projects_completed']) ?>+</p>
                <p class="text-gray-600 mt-2">সম্পন্ন প্রকল্প</p>
            </div>
            <div>
                <p class="text-4xl font-bold text-primary-600"><?= toBengaliDigits($stats['total_appointments']) ?>+</p>
                <p class="text-gray-600 mt-2">জনসাক্ষাৎ</p>
            </div>
        </div>
    </div>
</section>

<!-- Quick Services -->
<section class="py-16 bg-gray-50">
    <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center text-gray-800 mb-12">জনসেবা</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Complaint -->
            <a href="<?= SITE_URL ?>/complaint" class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-500 transition group">
                <div class="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-200 transition">
                    <svg class="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-800 mb-2">অভিযোগ দাখিল</h3>
                <p class="text-gray-600">যেকোনো সমস্যা বা অভিযোগ সরাসরি জানান। দ্রুত সমাধানের ব্যবস্থা নেওয়া হবে।</p>
            </a>

            <!-- Track Complaint -->
            <a href="<?= SITE_URL ?>/track" class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-500 transition group">
                <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition">
                    <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-800 mb-2">অভিযোগ ট্র্যাক</h3>
                <p class="text-gray-600">টিকেট নম্বর দিয়ে আপনার অভিযোগের বর্তমান অবস্থা জানুন।</p>
            </a>

            <!-- Appointment -->
            <a href="<?= SITE_URL ?>/appointment" class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-500 transition group">
                <div class="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition">
                    <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-800 mb-2">সাক্ষাৎকার</h3>
                <p class="text-gray-600">সরাসরি কথা বলার জন্য সময় নির্ধারণ করুন।</p>
            </a>
        </div>
    </div>
</section>

<!-- Recent News -->
<?php if ($recentNews): ?>
<section class="py-16">
    <div class="container mx-auto px-4">
        <div class="flex justify-between items-center mb-12">
            <h2 class="text-3xl font-bold text-gray-800">সাম্প্রতিক সংবাদ</h2>
            <a href="<?= SITE_URL ?>/news" class="text-primary-600 hover:text-primary-700 font-medium">
                সব সংবাদ দেখুন →
            </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <?php foreach (array_slice($recentNews, 0, 6) as $news): ?>
            <a href="<?= SITE_URL ?>/news/<?= e($news['slug']) ?>" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition group">
                <?php if ($news['featured_image']): ?>
                <img src="<?= UPLOADS_URL ?>/<?= e($news['featured_image']) ?>" alt="" class="w-full h-48 object-cover">
                <?php else: ?>
                <div class="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                    </svg>
                </div>
                <?php endif; ?>
                <div class="p-5">
                    <p class="text-sm text-primary-600 mb-2"><?= e(str_replace('_', ' ', $news['category'])) ?></p>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2 group-hover:text-primary-600 transition line-clamp-2">
                        <?= e($news['title']) ?>
                    </h3>
                    <p class="text-gray-600 text-sm line-clamp-2"><?= e($news['summary'] ?? truncate(strip_tags($news['content']), 100)) ?></p>
                    <p class="text-xs text-gray-400 mt-3"><?= formatBengaliDate($news['published_at'] ?? $news['created_at']) ?></p>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Projects Section -->
<?php if ($projects): ?>
<section class="py-16 bg-gray-50">
    <div class="container mx-auto px-4">
        <div class="flex justify-between items-center mb-12">
            <h2 class="text-3xl font-bold text-gray-800">উন্নয়ন প্রকল্প</h2>
            <a href="<?= SITE_URL ?>/projects" class="text-primary-600 hover:text-primary-700 font-medium">
                সব প্রকল্প দেখুন →
            </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <?php foreach ($projects as $project): ?>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="px-2 py-1 text-xs rounded-full <?= getStatusBadgeClass($project['status']) ?>">
                            <?= e($project['status']) ?>
                        </span>
                        <h3 class="text-lg font-semibold text-gray-800 mt-2"><?= e($project['name']) ?></h3>
                    </div>
                    <?php if ($project['progress_percent'] > 0): ?>
                    <span class="text-2xl font-bold text-primary-600"><?= toBengaliDigits($project['progress_percent']) ?>%</span>
                    <?php endif; ?>
                </div>

                <p class="text-gray-600 text-sm mb-4"><?= e(truncate($project['description'] ?? '', 120)) ?></p>

                <?php if ($project['progress_percent'] > 0): ?>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-primary-600 h-2 rounded-full" style="width: <?= $project['progress_percent'] ?>%"></div>
                </div>
                <?php endif; ?>

                <div class="flex justify-between items-center mt-4 text-sm text-gray-500">
                    <span><?= e($project['category']) ?></span>
                    <span><?= e($project['location_upazila'] ?? '') ?>, <?= e($project['location_district'] ?? '') ?></span>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Featured Video -->
<?php if ($featuredVideo): ?>
<section class="py-16">
    <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center text-gray-800 mb-12">ভিডিও</h2>

        <div class="max-w-4xl mx-auto">
            <div class="relative pb-[56.25%] rounded-xl overflow-hidden shadow-lg">
                <iframe
                    class="absolute top-0 left-0 w-full h-full"
                    src="https://www.youtube.com/embed/<?= e($featuredVideo['youtube_id']) ?>"
                    title="<?= e($featuredVideo['title']) ?>"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                ></iframe>
            </div>
            <h3 class="text-xl font-semibold text-gray-800 mt-4 text-center"><?= e($featuredVideo['title']) ?></h3>
        </div>

        <div class="text-center mt-8">
            <a href="<?= SITE_URL ?>/media" class="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                সব ভিডিও দেখুন
            </a>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- CTA Section -->
<section class="py-16 bg-primary-700 text-white">
    <div class="container mx-auto px-4 text-center">
        <h2 class="text-3xl font-bold mb-4">আপনার সমস্যা জানান</h2>
        <p class="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            আপনার যেকোনো সমস্যা বা অভিযোগ সরাসরি জানান। আমরা দ্রুত সমাধানের ব্যবস্থা নেব।
        </p>
        <a href="<?= SITE_URL ?>/complaint" class="inline-flex items-center px-8 py-4 bg-white text-primary-700 rounded-lg hover:bg-primary-50 transition font-semibold text-lg">
            অভিযোগ দাখিল করুন
        </a>
    </div>
</section>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
