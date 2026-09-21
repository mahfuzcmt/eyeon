<?php
$pageTitle = 'অ্যাপয়েন্টমেন্ট ব্যবস্থাপনা';
require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();

$status = $_GET['status'] ?? '';
$date = $_GET['date'] ?? '';
$search = $_GET['q'] ?? '';
$page = (int)($_GET['page'] ?? 1);

// Build query
$where = "1=1";
$params = [];

if ($status) {
    $where .= " AND status = :status";
    $params['status'] = $status;
}

if ($date) {
    $where .= " AND scheduled_date = :date";
    $params['date'] = $date;
}

if ($search) {
    $where .= " AND (visitor_name LIKE :search OR visitor_phone LIKE :search OR appointment_number LIKE :search)";
    $params['search'] = "%{$search}%";
}

// Get appointments with pagination
$sql = "SELECT * FROM appointments WHERE {$where} ORDER BY scheduled_date DESC, scheduled_time ASC";
$pagination = Database::paginate($sql, $params, $page, 20);
$appointments = $pagination['items'];

// Get stats
$today = date('Y-m-d');
$stats = [
    'today' => Database::fetchValue("SELECT COUNT(*) FROM appointments WHERE scheduled_date = :today", ['today' => $today]),
    'booked' => Database::fetchValue("SELECT COUNT(*) FROM appointments WHERE status = 'বুকড'"),
    'confirmed' => Database::fetchValue("SELECT COUNT(*) FROM appointments WHERE status = 'নিশ্চিত'"),
    'completed' => Database::fetchValue("SELECT COUNT(*) FROM appointments WHERE status = 'সম্পন্ন'")
];

$statuses = ['বুকড', 'নিশ্চিত', 'সম্পন্ন', 'বাতিল', 'অনুপস্থিত'];

require_once dirname(dirname(__DIR__)) . '/admin/includes/header.php';
?>

<div class="space-y-6">
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <p class="text-sm text-gray-500">আজকের অ্যাপয়েন্টমেন্ট</p>
            <p class="text-2xl font-bold text-blue-600"><?= toBengaliDigits($stats['today']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <p class="text-sm text-gray-500">বুকড</p>
            <p class="text-2xl font-bold text-yellow-600"><?= toBengaliDigits($stats['booked']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
            <p class="text-sm text-gray-500">নিশ্চিত</p>
            <p class="text-2xl font-bold text-purple-600"><?= toBengaliDigits($stats['confirmed']) ?></p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <p class="text-sm text-gray-500">সম্পন্ন</p>
            <p class="text-2xl font-bold text-green-600"><?= toBengaliDigits($stats['completed']) ?></p>
        </div>
    </div>

    <!-- Header & Filters -->
    <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 class="text-xl font-semibold text-gray-800">অ্যাপয়েন্টমেন্ট তালিকা</h2>
            <a href="calendar" class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                ক্যালেন্ডার ভিউ
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
            <input type="date" name="date" value="<?= e($date) ?>"
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
            <input type="text" name="q" value="<?= e($search) ?>" placeholder="নাম, ফোন বা নম্বর..."
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
            <button type="submit" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                ফিল্টার
            </button>
        </form>

        <!-- Quick Filters -->
        <div class="flex flex-wrap gap-2 mb-6">
            <a href="?date=<?= $today ?>" class="px-3 py-1 text-sm rounded-full <?= $date === $today ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' ?>">
                আজ
            </a>
            <a href="?date=<?= date('Y-m-d', strtotime('+1 day')) ?>" class="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                আগামীকাল
            </a>
            <a href="?status=বুকড" class="px-3 py-1 text-sm rounded-full <?= $status === 'বুকড' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' ?>">
                পেন্ডিং
            </a>
        </div>

        <!-- Appointments Table -->
        <?php if (empty($appointments)): ?>
        <div class="text-center py-12">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p class="text-gray-500">কোনো অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।</p>
        </div>
        <?php else: ?>
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">নম্বর</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">দর্শনার্থী</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ধরন</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">তারিখ ও সময়</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">উদ্দেশ্য</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">অবস্থা</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">কার্যক্রম</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <?php foreach ($appointments as $apt): ?>
                    <tr class="hover:bg-gray-50 <?= $apt['scheduled_date'] === $today ? 'bg-blue-50' : '' ?>">
                        <td class="px-4 py-4">
                            <span class="font-mono text-sm text-primary-600"><?= e($apt['appointment_number']) ?></span>
                        </td>
                        <td class="px-4 py-4">
                            <p class="font-medium text-gray-800"><?= e($apt['visitor_name']) ?></p>
                            <p class="text-sm text-gray-500"><?= e($apt['visitor_phone']) ?></p>
                            <?php if ($apt['visitor_organization']): ?>
                            <p class="text-xs text-gray-400"><?= e($apt['visitor_organization']) ?></p>
                            <?php endif; ?>
                        </td>
                        <td class="px-4 py-4">
                            <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                <?= e($apt['appointment_type']) ?>
                            </span>
                        </td>
                        <td class="px-4 py-4">
                            <p class="font-medium text-gray-800"><?= formatBengaliDate($apt['scheduled_date']) ?></p>
                            <p class="text-sm text-gray-500"><?= formatTimeDisplay($apt['scheduled_time']) ?></p>
                        </td>
                        <td class="px-4 py-4">
                            <p class="text-sm text-gray-600 line-clamp-2 max-w-xs"><?= e($apt['purpose']) ?></p>
                        </td>
                        <td class="px-4 py-4">
                            <span class="px-2 py-1 text-xs rounded <?= getAppointmentStatusClass($apt['status']) ?>">
                                <?= e($apt['status']) ?>
                            </span>
                        </td>
                        <td class="px-4 py-4 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <a href="view?id=<?= $apt['id'] ?>" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="বিস্তারিত">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                </a>
                                <?php if ($apt['status'] === 'বুকড'): ?>
                                <button onclick="updateStatus(<?= $apt['id'] ?>, 'নিশ্চিত')" class="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="নিশ্চিত করুন">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                </button>
                                <?php endif; ?>
                                <a href="tel:<?= e($apt['visitor_phone']) ?>" class="p-2 text-gray-600 hover:bg-gray-50 rounded-lg" title="কল করুন">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                    </svg>
                                </a>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <?= paginationHtml($pagination, '' . ($status ? '?status=' . urlencode($status) : '') . ($date ? ($status ? '&' : '?') . 'date=' . urlencode($date) : '') . ($search ? (($status || $date) ? '&' : '?') . 'q=' . urlencode($search) : '')) ?>
        <?php endif; ?>
    </div>
</div>

<script>
function updateStatus(id, status) {
    if (confirm('অবস্থা "' + status + '" এ পরিবর্তন করতে চান?')) {
        fetch('update-status.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'id=' + id + '&status=' + encodeURIComponent(status) + '&<?= CSRF_TOKEN_NAME ?>=<?= e($_SESSION[CSRF_TOKEN_NAME]) ?>'
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert(data.message || 'আপডেট করতে সমস্যা হয়েছে');
            }
        });
    }
}
</script>

<?php
function formatTimeDisplay($time) {
    $hour = (int)substr($time, 0, 2);
    $minute = substr($time, 3, 2);
    $period = $hour >= 12 ? 'PM' : 'AM';
    $displayHour = $hour > 12 ? $hour - 12 : ($hour == 0 ? 12 : $hour);
    $bengaliPeriod = $period === 'AM' ? 'সকাল' : ($hour >= 17 ? 'বিকাল' : 'দুপুর');
    return toBengaliDigits($displayHour) . ':' . toBengaliDigits($minute) . ' ' . $bengaliPeriod;
}

function getAppointmentStatusClass($status) {
    switch ($status) {
        case 'বুকড': return 'bg-yellow-100 text-yellow-700';
        case 'নিশ্চিত': return 'bg-purple-100 text-purple-700';
        case 'সম্পন্ন': return 'bg-green-100 text-green-700';
        case 'বাতিল': return 'bg-red-100 text-red-700';
        case 'অনুপস্থিত': return 'bg-gray-100 text-gray-700';
        default: return 'bg-gray-100 text-gray-700';
    }
}

require_once dirname(dirname(__DIR__)) . '/admin/includes/footer.php';
?>
