<?php
$pageTitle = 'প্রকল্প ব্যবস্থাপনা';
require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();

$status = $_GET['status'] ?? '';
$category = $_GET['category'] ?? '';
$search = $_GET['q'] ?? '';
$page = (int)($_GET['page'] ?? 1);

// Build query
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

if ($search) {
    $where .= " AND (name LIKE :search OR description LIKE :search OR location_district LIKE :search)";
    $params['search'] = "%{$search}%";
}

// Get projects with pagination
$sql = "SELECT * FROM projects WHERE {$where} ORDER BY created_at DESC";
$pagination = Database::paginate($sql, $params, $page, 15);
$projects = $pagination['items'];

// Get stats
$stats = [
    'total' => Database::fetchValue("SELECT COUNT(*) FROM projects"),
    'planned' => Database::fetchValue("SELECT COUNT(*) FROM projects WHERE status = 'পরিকল্পিত'"),
    'ongoing' => Database::fetchValue("SELECT COUNT(*) FROM projects WHERE status = 'চলমান'"),
    'completed' => Database::fetchValue("SELECT COUNT(*) FROM projects WHERE status = 'সম্পন্ন'")
];

$categories = ['অবকাঠামো', 'শিক্ষা', 'স্বাস্থ্য', 'কৃষি', 'কর্মসংস্থান', 'বিদ্যুৎ', 'অন্যান্য'];
$statuses = ['পরিকল্পিত', 'চলমান', 'সম্পন্ন', 'বিলম্বিত'];

require_once dirname(dirname(__DIR__)) . '/admin/includes/header.php';
?>

<div class="space-y-6">
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-gray-400">
            <p class="text-sm text-gray-500">মোট প্রকল্প</p>
            <p class="text-2xl font-bold text-gray-800"><?= toBengaliDigits($stats['total']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <p class="text-sm text-gray-500">পরিকল্পিত</p>
            <p class="text-2xl font-bold text-blue-600"><?= toBengaliDigits($stats['planned']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <p class="text-sm text-gray-500">চলমান</p>
            <p class="text-2xl font-bold text-yellow-600"><?= toBengaliDigits($stats['ongoing']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <p class="text-sm text-gray-500">সম্পন্ন</p>
            <p class="text-2xl font-bold text-green-600"><?= toBengaliDigits($stats['completed']) ?></p>
        </div>
    </div>

    <!-- Header & Filters -->
    <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 class="text-xl font-semibold text-gray-800">প্রকল্প তালিকা</h2>
            <a href="create" class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                নতুন প্রকল্প
            </a>
        </div>

        <!-- Filters -->
        <form method="GET" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <select name="status" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                <option value="">সব অবস্থা</option>
                <?php foreach ($statuses as $s): ?>
                <option value="<?= e($s) ?>" <?= $status === $s ? 'selected' : '' ?>><?= e($s) ?></option>
                <?php endforeach; ?>
            </select>
            <select name="category" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                <option value="">সব বিভাগ</option>
                <?php foreach ($categories as $c): ?>
                <option value="<?= e($c) ?>" <?= $category === $c ? 'selected' : '' ?>><?= e($c) ?></option>
                <?php endforeach; ?>
            </select>
            <input type="text" name="q" value="<?= e($search) ?>" placeholder="অনুসন্ধান..."
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
            <button type="submit" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                ফিল্টার
            </button>
        </form>

        <!-- Projects Table -->
        <?php if (empty($projects)): ?>
        <div class="text-center py-12">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <p class="text-gray-500">কোনো প্রকল্প পাওয়া যায়নি।</p>
        </div>
        <?php else: ?>
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">প্রকল্প</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">বিভাগ</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">অবস্থা</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">অগ্রগতি</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">বাজেট</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">অবস্থান</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">কার্যক্রম</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <?php foreach ($projects as $project): ?>
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-4">
                            <p class="font-medium text-gray-800 line-clamp-1"><?= e($project['name']) ?></p>
                            <?php if ($project['start_date']): ?>
                            <p class="text-xs text-gray-500 mt-1">
                                শুরু: <?= formatBengaliDate($project['start_date']) ?>
                            </p>
                            <?php endif; ?>
                        </td>
                        <td class="px-4 py-4">
                            <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                <?= e($project['category']) ?>
                            </span>
                        </td>
                        <td class="px-4 py-4">
                            <span class="px-2 py-1 text-xs rounded <?= getStatusBadgeClass($project['status']) ?>">
                                <?= e($project['status']) ?>
                            </span>
                        </td>
                        <td class="px-4 py-4">
                            <div class="w-24">
                                <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
                                    <span><?= toBengaliDigits($project['progress_percent']) ?>%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-primary-500 h-2 rounded-full" style="width: <?= $project['progress_percent'] ?>%"></div>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-4 text-sm text-gray-600">
                            <?php if ($project['budget_crore']): ?>
                            ৳ <?= toBengaliDigits(number_format($project['budget_crore'], 2)) ?> কোটি
                            <?php else: ?>
                            <span class="text-gray-400">—</span>
                            <?php endif; ?>
                        </td>
                        <td class="px-4 py-4 text-sm text-gray-600">
                            <?= e($project['location_district'] ?? '') ?>
                            <?php if ($project['location_upazila']): ?>
                            <br><span class="text-xs text-gray-400"><?= e($project['location_upazila']) ?></span>
                            <?php endif; ?>
                        </td>
                        <td class="px-4 py-4 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <a href="edit?id=<?= $project['id'] ?>" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="সম্পাদনা">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                </a>
                                <button onclick="deleteProject(<?= $project['id'] ?>)" class="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="মুছুন">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <?= paginationHtml($pagination, '' . ($status ? '?status=' . urlencode($status) : '') . ($category ? ($status ? '&' : '?') . 'category=' . urlencode($category) : '') . ($search ? (($status || $category) ? '&' : '?') . 'q=' . urlencode($search) : '')) ?>
        <?php endif; ?>
    </div>
</div>

<script>
function deleteProject(id) {
    if (confirm('এই প্রকল্প মুছে ফেলতে চান?')) {
        fetch('delete.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'id=' + id + '&<?= CSRF_TOKEN_NAME ?>=<?= e($_SESSION[CSRF_TOKEN_NAME]) ?>'
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert(data.message || 'মুছতে সমস্যা হয়েছে');
            }
        });
    }
}
</script>

<?php require_once dirname(dirname(__DIR__)) . '/admin/includes/footer.php'; ?>
