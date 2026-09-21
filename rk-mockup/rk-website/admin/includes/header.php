<?php
require_once dirname(__DIR__, 2) . '/includes/functions.php';
require_once dirname(__DIR__, 2) . '/includes/auth.php';

// Require authentication for all admin pages except login
$currentFile = basename($_SERVER['PHP_SELF']);
if ($currentFile !== 'login.php') {
    requireAuth();
}

$currentPage = basename(dirname($_SERVER['PHP_SELF']));
if ($currentPage === 'admin') {
    $currentPage = basename($_SERVER['PHP_SELF'], '.php');
}
?>
<!DOCTYPE html>
<html lang="bn" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= isset($pageTitle) ? e($pageTitle) . ' - ' : '' ?>অ্যাডমিন প্যানেল</title>

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: {
                            50: '#f0fdf4',
                            100: '#dcfce7',
                            200: '#bbf7d0',
                            300: '#86efac',
                            400: '#4ade80',
                            500: '#22c55e',
                            600: '#16a34a',
                            700: '#15803d',
                            800: '#166534',
                            900: '#14532d',
                        }
                    },
                    fontFamily: {
                        'bengali': ['Hind Siliguri', 'sans-serif'],
                    }
                }
            }
        }
    </script>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Admin CSS -->
    <link rel="stylesheet" href="<?= ADMIN_URL ?>/assets/css/admin.css">

    <style>
        body { font-family: 'Hind Siliguri', sans-serif; }
    </style>
</head>
<body class="bg-gray-100">
    <div class="flex min-h-screen">
        <!-- Include Sidebar -->
        <?php include __DIR__ . '/sidebar.php'; ?>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col">
            <!-- Top Bar -->
            <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
                <div class="flex items-center justify-between px-6 py-4">
                    <!-- Mobile Menu Toggle -->
                    <button id="sidebar-toggle" class="lg:hidden p-2 rounded-lg hover:bg-gray-100">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>

                    <!-- Page Title -->
                    <h1 class="text-xl font-semibold text-gray-800">
                        <?= isset($pageTitle) ? e($pageTitle) : 'ড্যাশবোর্ড' ?>
                    </h1>

                    <!-- User Menu -->
                    <div class="relative">
                        <button onclick="toggleUserMenu()" class="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2">
                            <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                <?= mb_substr($_SESSION['full_name'] ?? $_SESSION['username'] ?? 'A', 0, 1) ?>
                            </div>
                            <span class="hidden md:block text-sm font-medium text-gray-700">
                                <?= e($_SESSION['full_name'] ?? $_SESSION['username'] ?? 'Admin') ?>
                            </span>
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>

                        <div id="user-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                            <a href="<?= ADMIN_URL ?>/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                সেটিংস
                            </a>
                            <a href="<?= SITE_URL ?>" target="_blank" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                সাইট দেখুন
                            </a>
                            <hr class="my-1">
                            <a href="<?= ADMIN_URL ?>/logout" class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                লগআউট
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Page Content -->
            <main class="flex-1 p-6">
                <?php
                // Flash Messages
                $flash = getFlash();
                if ($flash):
                ?>
                <div class="mb-6 p-4 rounded-lg <?= $flash['type'] === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200' ?>">
                    <?= e($flash['message']) ?>
                </div>
                <?php endif; ?>
