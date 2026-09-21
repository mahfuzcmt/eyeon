<?php
$pageTitle = 'অ্যাপয়েন্টমেন্ট ক্যালেন্ডার';
require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();

// Get current month/year
$month = (int)($_GET['month'] ?? date('n'));
$year = (int)($_GET['year'] ?? date('Y'));

// Validate
if ($month < 1) { $month = 12; $year--; }
if ($month > 12) { $month = 1; $year++; }

$firstDay = mktime(0, 0, 0, $month, 1, $year);
$daysInMonth = date('t', $firstDay);
$startWeekday = date('w', $firstDay); // 0 = Sunday

// Get appointments for this month
$startDate = date('Y-m-d', $firstDay);
$endDate = date('Y-m-d', mktime(0, 0, 0, $month + 1, 0, $year));

$appointments = Database::fetchAll(
    "SELECT scheduled_date, COUNT(*) as count,
            SUM(CASE WHEN status = 'বুকড' THEN 1 ELSE 0 END) as booked,
            SUM(CASE WHEN status = 'নিশ্চিত' THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN status = 'সম্পন্ন' THEN 1 ELSE 0 END) as completed
     FROM appointments
     WHERE scheduled_date BETWEEN :start AND :end
     GROUP BY scheduled_date",
    ['start' => $startDate, 'end' => $endDate]
);

$appointmentsByDate = [];
foreach ($appointments as $apt) {
    $appointmentsByDate[$apt['scheduled_date']] = $apt;
}

$bengaliMonths = ['', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
$bengaliDays = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];

require_once dirname(dirname(__DIR__)) . '/admin/includes/header.php';
?>

<div class="space-y-6">
    <div class="bg-white rounded-lg shadow-sm p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
                <a href="?month=<?= $month - 1 ?>&year=<?= $year ?>" class="p-2 hover:bg-gray-100 rounded-lg transition">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                </a>
                <h2 class="text-xl font-semibold text-gray-800">
                    <?= $bengaliMonths[$month] ?> <?= toBengaliDigits($year) ?>
                </h2>
                <a href="?month=<?= $month + 1 ?>&year=<?= $year ?>" class="p-2 hover:bg-gray-100 rounded-lg transition">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </a>
            </div>
            <div class="flex items-center gap-3">
                <a href="?month=<?= date('n') ?>&year=<?= date('Y') ?>" class="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                    আজ
                </a>
                <a href="<?= ADMIN_URL ?>/appointments" class="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                    তালিকা ভিউ
                </a>
            </div>
        </div>

        <!-- Legend -->
        <div class="flex flex-wrap gap-4 mb-6 text-sm">
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span class="text-gray-600">বুকড</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span class="text-gray-600">নিশ্চিত</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                <span class="text-gray-600">সম্পন্ন</span>
            </div>
        </div>

        <!-- Calendar Grid -->
        <div class="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            <!-- Day Headers -->
            <?php foreach ($bengaliDays as $day): ?>
            <div class="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
                <?= $day ?>
            </div>
            <?php endforeach; ?>

            <!-- Empty cells before first day -->
            <?php for ($i = 0; $i < $startWeekday; $i++): ?>
            <div class="bg-gray-50 p-3 min-h-[100px]"></div>
            <?php endfor; ?>

            <!-- Days -->
            <?php
            $today = date('Y-m-d');
            for ($day = 1; $day <= $daysInMonth; $day++):
                $date = sprintf('%04d-%02d-%02d', $year, $month, $day);
                $isToday = $date === $today;
                $isFriday = date('w', strtotime($date)) == 5;
                $hasAppointments = isset($appointmentsByDate[$date]);
                $apt = $appointmentsByDate[$date] ?? null;
            ?>
            <div class="bg-white p-2 min-h-[100px] <?= $isFriday ? 'bg-red-50' : '' ?> <?= $isToday ? 'ring-2 ring-primary-500 ring-inset' : '' ?>">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium <?= $isToday ? 'text-primary-600' : ($isFriday ? 'text-red-500' : 'text-gray-700') ?>">
                        <?= toBengaliDigits($day) ?>
                    </span>
                    <?php if ($hasAppointments): ?>
                    <span class="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                        <?= toBengaliDigits($apt['count']) ?>
                    </span>
                    <?php endif; ?>
                </div>

                <?php if ($hasAppointments): ?>
                <a href="<?= ADMIN_URL ?>/appointments?date=<?= $date ?>" class="block">
                    <div class="space-y-1">
                        <?php if ($apt['booked'] > 0): ?>
                        <div class="flex items-center gap-1 text-xs text-yellow-700">
                            <div class="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <?= toBengaliDigits($apt['booked']) ?> বুকড
                        </div>
                        <?php endif; ?>
                        <?php if ($apt['confirmed'] > 0): ?>
                        <div class="flex items-center gap-1 text-xs text-purple-700">
                            <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <?= toBengaliDigits($apt['confirmed']) ?> নিশ্চিত
                        </div>
                        <?php endif; ?>
                        <?php if ($apt['completed'] > 0): ?>
                        <div class="flex items-center gap-1 text-xs text-green-700">
                            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                            <?= toBengaliDigits($apt['completed']) ?> সম্পন্ন
                        </div>
                        <?php endif; ?>
                    </div>
                </a>
                <?php elseif (!$isFriday): ?>
                <p class="text-xs text-gray-400 text-center mt-4">কোনো অ্যাপয়েন্টমেন্ট নেই</p>
                <?php else: ?>
                <p class="text-xs text-red-400 text-center mt-4">ছুটির দিন</p>
                <?php endif; ?>
            </div>
            <?php endfor; ?>

            <!-- Empty cells after last day -->
            <?php
            $lastWeekday = date('w', mktime(0, 0, 0, $month, $daysInMonth, $year));
            for ($i = $lastWeekday + 1; $i < 7; $i++):
            ?>
            <div class="bg-gray-50 p-3 min-h-[100px]"></div>
            <?php endfor; ?>
        </div>
    </div>

    <!-- Monthly Summary -->
    <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">মাসিক সারসংক্ষেপ</h3>
        <?php
        $monthlyStats = Database::fetchOne(
            "SELECT COUNT(*) as total,
                    SUM(CASE WHEN status = 'সম্পন্ন' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'বাতিল' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN status = 'অনুপস্থিত' THEN 1 ELSE 0 END) as no_show
             FROM appointments
             WHERE scheduled_date BETWEEN :start AND :end",
            ['start' => $startDate, 'end' => $endDate]
        );
        ?>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-gray-50 rounded-lg p-4 text-center">
                <p class="text-2xl font-bold text-gray-800"><?= toBengaliDigits($monthlyStats['total'] ?? 0) ?></p>
                <p class="text-sm text-gray-500">মোট অ্যাপয়েন্টমেন্ট</p>
            </div>
            <div class="bg-green-50 rounded-lg p-4 text-center">
                <p class="text-2xl font-bold text-green-600"><?= toBengaliDigits($monthlyStats['completed'] ?? 0) ?></p>
                <p class="text-sm text-gray-500">সম্পন্ন</p>
            </div>
            <div class="bg-red-50 rounded-lg p-4 text-center">
                <p class="text-2xl font-bold text-red-600"><?= toBengaliDigits($monthlyStats['cancelled'] ?? 0) ?></p>
                <p class="text-sm text-gray-500">বাতিল</p>
            </div>
            <div class="bg-gray-100 rounded-lg p-4 text-center">
                <p class="text-2xl font-bold text-gray-600"><?= toBengaliDigits($monthlyStats['no_show'] ?? 0) ?></p>
                <p class="text-sm text-gray-500">অনুপস্থিত</p>
            </div>
        </div>
    </div>
</div>

<?php require_once dirname(dirname(__DIR__)) . '/admin/includes/footer.php'; ?>
