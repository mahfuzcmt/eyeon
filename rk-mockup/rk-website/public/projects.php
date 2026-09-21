<?php
$pageTitle = 'উন্নয়ন প্রকল্প';
require_once dirname(__DIR__) . '/includes/header.php';

$status = $_GET['status'] ?? '';
$category = $_GET['category'] ?? '';
$page = (int)($_GET['page'] ?? 1);

$where = "1=1";
$params = [];

if ($status) {
    $where .= " AND status = :status";
    $params['status'] = $status;
}

if ($category) {
    $where .= " AND category = :category";
    $params['category'] = $category;
}

$sql = "SELECT * FROM projects WHERE {$where} ORDER BY FIELD(status, 'চলমান', 'পরিকল্পিত', 'সম্পন্ন', 'বিলম্বিত'), updated_at DESC";
$pagination = Database::paginate($sql, $params, $page, 12);
$projects = $pagination['items'];

$categories = ['অবকাঠামো', 'শিক্ষা', 'স্বাস্থ্য', 'কৃষি', 'কর্মসংস্থান', 'বিদ্যুৎ', 'অন্যান্য'];
$statuses = ['পরিকল্পিত', 'চলমান', 'সম্পন্ন', 'বিলম্বিত'];

// Stats
$stats = [
    'total' => Database::fetchValue("SELECT COUNT(*) FROM projects"),
    'ongoing' => Database::fetchValue("SELECT COUNT(*) FROM projects WHERE status = 'চলমান'"),
    'completed' => Database::fetchValue("SELECT COUNT(*) FROM projects WHERE status = 'সম্পন্ন'"),
    'budget' => Database::fetchValue("SELECT SUM(budget_crore) FROM projects")
];
?>

<section class="py-12">
    <div class="container mx-auto px-4">
        <!-- Header -->
        <div class="text-center mb-10">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">উন্নয়ন প্রকল্প</h1>
            <p class="text-gray-600">
                গাইবান্ধা-১ আসনে চলমান ও সম্পন্ন উন্নয়ন প্রকল্প সমূহ
            </p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <p class="text-3xl font-bold text-gray-800"><?= toBengaliDigits($stats['total']) ?></p>
                <p class="text-sm text-gray-500 mt-1">মোট প্রকল্প</p>
            </div>
            <div class="bg-blue-50 rounded-xl border border-blue-100 p-6 text-center">
                <p class="text-3xl font-bold text-blue-600"><?= toBengaliDigits($stats['ongoing']) ?></p>
                <p class="text-sm text-blue-600 mt-1">চলমান</p>
            </div>
            <div class="bg-green-50 rounded-xl border border-green-100 p-6 text-center">
                <p class="text-3xl font-bold text-green-600"><?= toBengaliDigits($stats['completed']) ?></p>
                <p class="text-sm text-green-600 mt-1">সম্পন্ন</p>
            </div>
            <div class="bg-primary-50 rounded-xl border border-primary-100 p-6 text-center">
                <p class="text-3xl font-bold text-primary-600"><?= toBengaliDigits(number_format($stats['budget'] ?? 0, 2)) ?></p>
                <p class="text-sm text-primary-600 mt-1">কোটি টাকা বাজেট</p>
            </div>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-2 justify-center mb-10">
            <a href="<?= SITE_URL ?>/projects" class="px-4 py-2 rounded-full text-sm font-medium transition <?= !$status && !$category ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' ?>">
                সব
            </a>
            <?php foreach ($statuses as $s): ?>
            <a href="<?= SITE_URL ?>/projects?status=<?= urlencode($s) ?>" class="px-4 py-2 rounded-full text-sm font-medium transition <?= $status === $s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' ?>">
                <?= e($s) ?>
            </a>
            <?php endforeach; ?>
        </div>

        <!-- Projects Grid -->
        <?php if (empty($projects)): ?>
        <div class="text-center py-12">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
            </div>
            <p class="text-gray-500">কোনো প্রকল্প পাওয়া যায়নি।</p>
        </div>
        <?php else: ?>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <?php foreach ($projects as $project): ?>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition">
                <!-- Images -->
                <?php if ($project['before_image'] || $project['after_image']): ?>
                <div class="relative h-48">
                    <?php if ($project['before_image']): ?>
                    <img src="<?= UPLOADS_URL ?>/<?= e($project['before_image']) ?>" alt="Before" class="w-full h-full object-cover">
                    <?php else: ?>
                    <img src="<?= UPLOADS_URL ?>/<?= e($project['after_image']) ?>" alt="After" class="w-full h-full object-cover">
                    <?php endif; ?>
                    <span class="absolute top-3 right-3 px-3 py-1 text-xs rounded-full <?= getStatusBadgeClass($project['status']) ?>">
                        <?= e($project['status']) ?>
                    </span>
                </div>
                <?php else: ?>
                <div class="h-32 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                    <span class="px-4 py-1 text-sm rounded-full <?= getStatusBadgeClass($project['status']) ?>">
                        <?= e($project['status']) ?>
                    </span>
                </div>
                <?php endif; ?>

                <div class="p-5">
                    <span class="text-xs text-primary-600 font-medium"><?= e($project['category']) ?></span>
                    <h3 class="text-lg font-semibold text-gray-800 mt-1 mb-2"><?= e($project['name']) ?></h3>

                    <?php if ($project['description']): ?>
                    <p class="text-gray-600 text-sm mb-4 line-clamp-2"><?= e($project['description']) ?></p>
                    <?php endif; ?>

                    <!-- Progress -->
                    <?php if ($project['progress_percent'] > 0): ?>
                    <div class="mb-4">
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-gray-500">অগ্রগতি</span>
                            <span class="font-medium text-primary-600"><?= toBengaliDigits($project['progress_percent']) ?>%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="h-2 rounded-full transition-all duration-500 <?= $project['progress_percent'] >= 100 ? 'bg-green-500' : 'bg-primary-600' ?>" style="width: <?= $project['progress_percent'] ?>%"></div>
                        </div>
                    </div>
                    <?php endif; ?>

                    <!-- Meta -->
                    <div class="flex flex-wrap gap-2 text-xs text-gray-500">
                        <?php if ($project['location_upazila']): ?>
                        <span class="flex items-center">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            </svg>
                            <?= e($project['location_upazila']) ?>
                        </span>
                        <?php endif; ?>
                        <?php if ($project['budget_crore']): ?>
                        <span class="flex items-center">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <?= toBengaliDigits($project['budget_crore']) ?> কোটি
                        </span>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- Pagination -->
        <?= paginationHtml($pagination, SITE_URL . '/projects' . ($status ? '?status=' . urlencode($status) : '') . ($category ? ($status ? '&' : '?') . 'category=' . urlencode($category) : '')) ?>
        <?php endif; ?>
    </div>
</section>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
