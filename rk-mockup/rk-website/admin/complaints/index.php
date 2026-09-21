<?php
$pageTitle = 'অভিযোগ ব্যবস্থাপনা';
require_once dirname(__DIR__) . '/includes/header.php';

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
    $where[] = '(ticket_number LIKE :search OR full_name LIKE :search OR phone LIKE :search OR subject LIKE :search)';
    $params['search'] = '%' . $search . '%';
}

$whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$sql = "SELECT * FROM complaints {$whereClause} ORDER BY submitted_at DESC";

$pagination = Database::paginate($sql, $params, $page, ADMIN_ITEMS_PER_PAGE);
$complaints = $pagination['items'];

$categories = ['অবকাঠামো', 'শিক্ষা', 'স্বাস্থ্য', 'কৃষি', 'কর্মসংস্থান', 'দুর্নীতি', 'বিদ্যুৎ', 'অন্যান্য'];
$statuses = ['দাখিল', 'পর্যালোচনাধীন', 'কার্যক্রম', 'সমাধান'];

// Stats
$statsQuery = "SELECT status, COUNT(*) as count FROM complaints GROUP BY status";
$statsResults = Database::fetchAll($statsQuery);
$stats = [];
foreach ($statsResults as $row) {
    $stats[$row['status']] = $row['count'];
}
?>

<!-- Stats Cards -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <?php foreach ($statuses as $s): ?>
    <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <p class="text-2xl font-bold text-gray-800"><?= toBengaliDigits($stats[$s] ?? 0) ?></p>
        <p class="text-sm text-gray-500"><?= e($s) ?></p>
    </div>
    <?php endforeach; ?>
</div>

<!-- Filters -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
    <form method="GET" class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
            <input type="text" name="search" value="<?= e($search) ?>" placeholder="টিকেট নম্বর, নাম, ফোন, বিষয় দিয়ে খুঁজুন..." class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>
        <div>
            <select name="status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value="">সব স্ট্যাটাস</option>
                <?php foreach ($statuses as $s): ?>
                <option value="<?= e($s) ?>" <?= $status === $s ? 'selected' : '' ?>><?= e($s) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div>
            <select name="category" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value="">সব ক্যাটাগরি</option>
                <?php foreach ($categories as $cat): ?>
                <option value="<?= e($cat) ?>" <?= $category === $cat ? 'selected' : '' ?>><?= e($cat) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <button type="submit" class="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition">
            ফিল্টার
        </button>
        <?php if ($search || $status || $category): ?>
        <a href="<?= ADMIN_URL ?>/complaints" class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-center">
            রিসেট
        </a>
        <?php endif; ?>
    </form>
</div>

<!-- Complaints List -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div class="overflow-x-auto">
        <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-100">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">টিকেট</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অভিযোগকারী</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">বিষয়</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ক্যাটাগরি</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">স্ট্যাটাস</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">তারিখ</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">অ্যাকশন</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                <?php if (empty($complaints)): ?>
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        কোনো অভিযোগ পাওয়া যায়নি
                    </td>
                </tr>
                <?php else: ?>
                <?php foreach ($complaints as $complaint): ?>
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-4">
                        <span class="text-sm font-mono font-medium text-primary-600"><?= e($complaint['ticket_number']) ?></span>
                    </td>
                    <td class="px-6 py-4">
                        <div>
                            <p class="text-sm font-medium text-gray-900">
                                <?= $complaint['is_anonymous'] ? 'বেনামী' : e($complaint['full_name']) ?>
                            </p>
                            <p class="text-xs text-gray-500"><?= e($complaint['phone']) ?></p>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <p class="text-sm text-gray-900"><?= e(truncate($complaint['subject'], 40)) ?></p>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-sm text-gray-600"><?= e($complaint['category']) ?></span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 text-xs rounded-full <?= getStatusBadgeClass($complaint['status']) ?>">
                            <?= e($complaint['status']) ?>
                        </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-600">
                        <?= timeAgo($complaint['submitted_at']) ?>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <a href="<?= ADMIN_URL ?>/complaints/view?id=<?= $complaint['id'] ?>" class="inline-flex items-center px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition">
                            দেখুন
                        </a>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Pagination -->
<?= paginationHtml($pagination, ADMIN_URL . '/complaints?' . http_build_query(array_filter(['status' => $status, 'category' => $category, 'search' => $search]))) ?>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
