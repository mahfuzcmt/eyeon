<?php
$pageTitle = 'ড্যাশবোর্ড';
require_once __DIR__ . '/includes/header.php';

// Get statistics
$stats = [
    'total_complaints' => Database::fetchValue("SELECT COUNT(*) FROM complaints"),
    'pending_complaints' => Database::fetchValue("SELECT COUNT(*) FROM complaints WHERE status != 'সমাধান'"),
    'today_appointments' => Database::fetchValue("SELECT COUNT(*) FROM appointments WHERE scheduled_date = CURDATE()"),
    'total_projects' => Database::fetchValue("SELECT COUNT(*) FROM projects"),
    'ongoing_projects' => Database::fetchValue("SELECT COUNT(*) FROM projects WHERE status = 'চলমান'"),
    'total_news' => Database::fetchValue("SELECT COUNT(*) FROM news WHERE status = 'published'"),
    'unread_messages' => Database::fetchValue("SELECT COUNT(*) FROM contact_messages WHERE status = 'নতুন'"),
];

// Recent complaints
$recentComplaints = Database::fetchAll(
    "SELECT * FROM complaints ORDER BY submitted_at DESC LIMIT 5"
);

// Today's appointments
$todayAppointments = Database::fetchAll(
    "SELECT * FROM appointments WHERE scheduled_date = CURDATE() ORDER BY scheduled_time ASC"
);

// Recent news
$recentNews = Database::fetchAll(
    "SELECT * FROM news ORDER BY created_at DESC LIMIT 5"
);
?>

<!-- Statistics Cards -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <!-- Complaints -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">মোট অভিযোগ</p>
                <p class="text-3xl font-bold text-gray-800 mt-1"><?= toBengaliDigits($stats['total_complaints']) ?></p>
                <p class="text-sm text-yellow-600 mt-2">
                    <?= toBengaliDigits($stats['pending_complaints']) ?> পেন্ডিং
                </p>
            </div>
            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
            </div>
        </div>
    </div>

    <!-- Appointments -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">আজকের সাক্ষাৎকার</p>
                <p class="text-3xl font-bold text-gray-800 mt-1"><?= toBengaliDigits($stats['today_appointments']) ?></p>
                <p class="text-sm text-blue-600 mt-2">নির্ধারিত</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
            </div>
        </div>
    </div>

    <!-- Projects -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">উন্নয়ন প্রকল্প</p>
                <p class="text-3xl font-bold text-gray-800 mt-1"><?= toBengaliDigits($stats['total_projects']) ?></p>
                <p class="text-sm text-green-600 mt-2">
                    <?= toBengaliDigits($stats['ongoing_projects']) ?> চলমান
                </p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
            </div>
        </div>
    </div>

    <!-- Messages -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">নতুন বার্তা</p>
                <p class="text-3xl font-bold text-gray-800 mt-1"><?= toBengaliDigits($stats['unread_messages']) ?></p>
                <p class="text-sm text-purple-600 mt-2">অপঠিত</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
            </div>
        </div>
    </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Recent Complaints -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 class="text-lg font-semibold text-gray-800">সাম্প্রতিক অভিযোগ</h2>
            <a href="<?= ADMIN_URL ?>/complaints" class="text-sm text-primary-600 hover:text-primary-700">
                সব দেখুন →
            </a>
        </div>
        <div class="divide-y divide-gray-100">
            <?php if (empty($recentComplaints)): ?>
            <div class="p-6 text-center text-gray-500">
                কোনো অভিযোগ নেই
            </div>
            <?php else: ?>
            <?php foreach ($recentComplaints as $complaint): ?>
            <div class="p-4 hover:bg-gray-50 transition">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm font-medium text-gray-500"><?= e($complaint['ticket_number']) ?></span>
                            <span class="px-2 py-0.5 text-xs rounded-full <?= getStatusBadgeClass($complaint['status']) ?>">
                                <?= e($complaint['status']) ?>
                            </span>
                        </div>
                        <p class="text-sm font-medium text-gray-800 mt-1"><?= e(truncate($complaint['subject'], 50)) ?></p>
                        <p class="text-xs text-gray-500 mt-1">
                            <?= e($complaint['full_name']) ?> • <?= timeAgo($complaint['submitted_at']) ?>
                        </p>
                    </div>
                    <a href="<?= ADMIN_URL ?>/complaints/view?id=<?= $complaint['id'] ?>" class="text-primary-600 hover:text-primary-700">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                    </a>
                </div>
            </div>
            <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

    <!-- Today's Appointments -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 class="text-lg font-semibold text-gray-800">আজকের সাক্ষাৎকার</h2>
            <a href="<?= ADMIN_URL ?>/appointments" class="text-sm text-primary-600 hover:text-primary-700">
                সব দেখুন →
            </a>
        </div>
        <div class="divide-y divide-gray-100">
            <?php if (empty($todayAppointments)): ?>
            <div class="p-6 text-center text-gray-500">
                আজ কোনো সাক্ষাৎকার নেই
            </div>
            <?php else: ?>
            <?php foreach ($todayAppointments as $appointment): ?>
            <div class="p-4 hover:bg-gray-50 transition">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm font-medium text-primary-600">
                                <?= date('h:i A', strtotime($appointment['scheduled_time'])) ?>
                            </span>
                            <span class="px-2 py-0.5 text-xs rounded-full <?= getStatusBadgeClass($appointment['status']) ?>">
                                <?= e($appointment['status']) ?>
                            </span>
                        </div>
                        <p class="text-sm font-medium text-gray-800 mt-1"><?= e($appointment['visitor_name']) ?></p>
                        <p class="text-xs text-gray-500 mt-1"><?= e(truncate($appointment['purpose'] ?? '', 50)) ?></p>
                    </div>
                    <a href="<?= ADMIN_URL ?>/appointments/view?id=<?= $appointment['id'] ?>" class="text-primary-600 hover:text-primary-700">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                    </a>
                </div>
            </div>
            <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- Quick Actions -->
<div class="mt-8">
    <h2 class="text-lg font-semibold text-gray-800 mb-4">দ্রুত কার্যক্রম</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <a href="<?= ADMIN_URL ?>/news/create" class="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-500 hover:shadow-md transition group">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
            </div>
            <p class="text-sm font-medium text-gray-800">নতুন সংবাদ</p>
        </a>

        <a href="<?= ADMIN_URL ?>/projects/create" class="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-500 hover:shadow-md transition group">
            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition">
                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
            </div>
            <p class="text-sm font-medium text-gray-800">নতুন প্রকল্প</p>
        </a>

        <a href="<?= ADMIN_URL ?>/media/upload" class="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-500 hover:shadow-md transition group">
            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200 transition">
                <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
            </div>
            <p class="text-sm font-medium text-gray-800">মিডিয়া আপলোড</p>
        </a>

        <a href="<?= ADMIN_URL ?>/appointments/calendar" class="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-500 hover:shadow-md transition group">
            <div class="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-yellow-200 transition">
                <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
            </div>
            <p class="text-sm font-medium text-gray-800">ক্যালেন্ডার</p>
        </a>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
