<?php
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/auth.php';

$currentPage = basename($_SERVER['PHP_SELF'], '.php');
?>
<!DOCTYPE html>
<html lang="bn" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= isset($pageTitle) ? e($pageTitle) . ' - ' : '' ?><?= e(getSetting('site_title', SITE_NAME)) ?></title>
    <meta name="description" content="<?= e(getSetting('about_text', '')) ?>">

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="<?= SITE_URL ?>/assets/images/favicon.png">

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
                        },
                        accent: {
                            500: '#dc2626',
                            600: '#b91c1c',
                        }
                    },
                    fontFamily: {
                        'bengali': ['Hind Siliguri', 'sans-serif'],
                    }
                }
            }
        }
    </script>

    <!-- Google Fonts - Hind Siliguri for Bengali -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Custom CSS -->
    <link rel="stylesheet" href="<?= SITE_URL ?>/assets/css/custom.css">

    <style>
        body {
            font-family: 'Hind Siliguri', sans-serif;
        }
    </style>
</head>
<body class="bg-gray-50 text-gray-900">
    <!-- Top Bar -->
    <div class="bg-primary-700 text-white text-sm py-2">
        <div class="container mx-auto px-4 flex justify-between items-center">
            <div class="flex items-center space-x-4">
                <a href="tel:<?= e(getSetting('contact_phone', '')) ?>" class="flex items-center hover:text-primary-200">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                    <?= e(getSetting('contact_phone', '+880 1700-000000')) ?>
                </a>
                <a href="mailto:<?= e(getSetting('contact_email', '')) ?>" class="hidden md:flex items-center hover:text-primary-200">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                    </svg>
                    <?= e(getSetting('contact_email', 'info@rashedkhan.com.bd')) ?>
                </a>
            </div>
            <div class="flex items-center space-x-3">
                <?php if ($fb = getSetting('facebook_url')): ?>
                <a href="<?= e($fb) ?>" target="_blank" class="hover:text-primary-200">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                </a>
                <?php endif; ?>
                <?php if ($yt = getSetting('youtube_url')): ?>
                <a href="<?= e($yt) ?>" target="_blank" class="hover:text-primary-200">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                </a>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Main Header -->
    <header class="bg-white shadow-md sticky top-0 z-50">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center py-4">
                <!-- Logo -->
                <a href="<?= SITE_URL ?>" class="flex items-center space-x-3">
                    <?php if ($logo = getSetting('logo_image')): ?>
                    <img src="<?= UPLOADS_URL ?>/<?= e($logo) ?>" alt="Logo" class="h-12 w-auto">
                    <?php else: ?>
                    <div class="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        রা
                    </div>
                    <?php endif; ?>
                    <div>
                        <h1 class="text-xl font-bold text-primary-700"><?= e(getSetting('site_title', SITE_NAME)) ?></h1>
                        <p class="text-sm text-gray-600"><?= e(getSetting('site_tagline', SITE_TAGLINE)) ?></p>
                    </div>
                </a>

                <!-- Mobile Menu Button -->
                <button id="mobile-menu-btn" class="md:hidden p-2 rounded-lg hover:bg-gray-100">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>

                <!-- Desktop Navigation -->
                <nav class="hidden md:flex items-center space-x-1">
                    <a href="<?= SITE_URL ?>" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'index' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        হোম
                    </a>
                    <a href="<?= SITE_URL ?>/about" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'about' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        পরিচিতি
                    </a>
                    <a href="<?= SITE_URL ?>/news" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'news' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        সংবাদ
                    </a>
                    <a href="<?= SITE_URL ?>/projects" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'projects' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        উন্নয়ন প্রকল্প
                    </a>
                    <a href="<?= SITE_URL ?>/services" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'services' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        সেবাসমূহ
                    </a>
                    <a href="<?= SITE_URL ?>/media" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'media' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        মিডিয়া
                    </a>
                    <a href="<?= SITE_URL ?>/contact" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'contact' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        যোগাযোগ
                    </a>
                    <a href="<?= SITE_URL ?>/complaint" class="ml-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition">
                        অভিযোগ দাখিল
                    </a>
                </nav>
            </div>

            <!-- Mobile Navigation -->
            <nav id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col space-y-2">
                    <a href="<?= SITE_URL ?>" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'index' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        হোম
                    </a>
                    <a href="<?= SITE_URL ?>/about" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'about' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        পরিচিতি
                    </a>
                    <a href="<?= SITE_URL ?>/news" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'news' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        সংবাদ
                    </a>
                    <a href="<?= SITE_URL ?>/projects" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'projects' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        উন্নয়ন প্রকল্প
                    </a>
                    <a href="<?= SITE_URL ?>/services" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'services' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        সেবাসমূহ
                    </a>
                    <a href="<?= SITE_URL ?>/media" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'media' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        মিডিয়া
                    </a>
                    <a href="<?= SITE_URL ?>/contact" class="px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 <?= $currentPage === 'contact' ? 'bg-primary-50 text-primary-700 font-medium' : '' ?>">
                        যোগাযোগ
                    </a>
                    <a href="<?= SITE_URL ?>/complaint" class="px-4 py-2 bg-accent-500 text-white text-center rounded-lg hover:bg-accent-600 transition">
                        অভিযোগ দাখিল
                    </a>
                </div>
            </nav>
        </div>
    </header>

    <!-- Flash Messages -->
    <?php if ($flash = getFlash()): ?>
    <div class="container mx-auto px-4 mt-4">
        <div class="p-4 rounded-lg <?= $flash['type'] === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' ?>">
            <?= e($flash['message']) ?>
        </div>
    </div>
    <?php endif; ?>

    <main>
