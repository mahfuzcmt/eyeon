<?php
// Determine current section for active state
$currentPath = $_SERVER['PHP_SELF'];
$isActive = function($path) use ($currentPath) {
    return strpos($currentPath, $path) !== false;
};
?>
<!-- Sidebar -->
<aside id="sidebar" class="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform -translate-x-full lg:translate-x-0 transition-transform duration-200">
    <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="flex items-center justify-between px-6 py-5 border-b border-gray-800">
            <a href="<?= ADMIN_URL ?>" class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                    রা
                </div>
                <div>
                    <span class="text-lg font-bold">অ্যাডমিন</span>
                    <span class="block text-xs text-gray-400">প্যানেল</span>
                </div>
            </a>
            <button id="sidebar-close" class="lg:hidden p-1 hover:bg-gray-800 rounded">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            <!-- Dashboard -->
            <a href="<?= ADMIN_URL ?>" class="flex items-center px-4 py-3 rounded-lg transition <?= $isActive('/admin/index') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800' ?>">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                ড্যাশবোর্ড
            </a>

            <!-- Content Section -->
            <div class="pt-4">
                <p class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">কন্টেন্ট</p>
            </div>

            <!-- News -->
            <a href="<?= ADMIN_URL ?>/news" class="flex items-center px-4 py-3 rounded-lg transition <?= $isActive('/news/') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800' ?>">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                </svg>
                সংবাদ
            </a>

            <!-- Projects -->
            <a href="<?= ADMIN_URL ?>/projects" class="flex items-center px-4 py-3 rounded-lg transition <?= $isActive('/projects/') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800' ?>">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                উন্নয়ন প্রকল্প
            </a>

            <!-- Media -->
            <a href="<?= ADMIN_URL ?>/media" class="flex items-center px-4 py-3 rounded-lg transition <?= $isActive('/media/') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800' ?>">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                মিডিয়া
            </a>

            <!-- Services Section -->
            <div class="pt-4">
                <p class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">সেবা</p>
            </div>

            <!-- Complaints -->
            <a href="<?= ADMIN_URL ?>/complaints" class="flex items-center px-4 py-3 rounded-lg transition <?= $isActive('/complaints/') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800' ?>">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                অভিযোগসমূহ
                <?php
                $pendingComplaints = Database::fetchValue("SELECT COUNT(*) FROM complaints WHERE status != 'সমাধান'");
                if ($pendingComplaints > 0):
                ?>
                <span class="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full"><?= toBengaliDigits($pendingComplaints) ?></span>
                <?php endif; ?>
            </a>

            <!-- Appointments -->
            <a href="<?= ADMIN_URL ?>/appointments" class="flex items-center px-4 py-3 rounded-lg transition <?= $isActive('/appointments/') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800' ?>">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                সাক্ষাৎকার
                <?php
                $todayAppointments = Database::fetchValue(
                    "SELECT COUNT(*) FROM appointments WHERE scheduled_date = CURDATE() AND status NOT IN ('সম্পন্ন', 'বাতিল')"
                );
                if ($todayAppointments > 0):
                ?>
                <span class="ml-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full"><?= toBengaliDigits($todayAppointments) ?></span>
                <?php endif; ?>
            </a>

            <!-- Messages -->
            <a href="<?= ADMIN_URL ?>/messages" class="flex items-center px-4 py-3 rounded-lg transition <?= $isActive('/messages/') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800' ?>">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                বার্তা
                <?php
                $unreadMessages = Database::fetchValue("SELECT COUNT(*) FROM contact_messages WHERE status = 'নতুন'");
                if ($unreadMessages > 0):
                ?>
                <span class="ml-auto bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full"><?= toBengaliDigits($unreadMessages) ?></span>
                <?php endif; ?>
            </a>

            <!-- Settings Section -->
            <div class="pt-4">
                <p class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">সেটিংস</p>
            </div>

            <!-- Site Settings -->
            <a href="<?= ADMIN_URL ?>/settings" class="flex items-center px-4 py-3 rounded-lg transition <?= $isActive('/settings/index') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800' ?>">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                সাইট সেটিংস
            </a>

            <?php if (isSuperAdmin()): ?>
            <!-- Users (Super Admin Only) -->
            <a href="<?= ADMIN_URL ?>/settings/users" class="flex items-center px-4 py-3 rounded-lg transition <?= $isActive('/settings/users') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800' ?>">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
                ব্যবহারকারী
            </a>
            <?php endif; ?>
        </nav>

        <!-- User Info -->
        <div class="px-4 py-4 border-t border-gray-800">
            <div class="flex items-center">
                <div class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    <?= mb_substr($_SESSION['full_name'] ?? $_SESSION['username'], 0, 1) ?>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium"><?= e($_SESSION['full_name'] ?? $_SESSION['username']) ?></p>
                    <p class="text-xs text-gray-400"><?= e($_SESSION['role'] === 'super_admin' ? 'সুপার অ্যাডমিন' : ($_SESSION['role'] === 'editor' ? 'এডিটর' : 'ভিউয়ার')) ?></p>
                </div>
            </div>
        </div>
    </div>
</aside>

<!-- Sidebar Overlay for Mobile -->
<div id="sidebar-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden hidden"></div>
