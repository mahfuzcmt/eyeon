<?php
$pageTitle = 'লগইন';
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/auth.php';

// Redirect if already logged in
if (isLoggedIn()) {
    redirect(ADMIN_URL . '');
}

$error = '';

// Handle login form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $error = 'ব্যবহারকারীর নাম এবং পাসওয়ার্ড প্রয়োজন।';
    } else {
        $result = attemptLogin($username, $password);

        if ($result['success']) {
            $redirect = $_GET['redirect'] ?? ADMIN_URL . '';
            redirect($redirect);
        } else {
            $error = $result['message'];
        }
    }
}
?>
<!DOCTYPE html>
<html lang="bn" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>লগইন - অ্যাডমিন প্যানেল</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: {
                            500: '#22c55e',
                            600: '#16a34a',
                            700: '#15803d',
                        }
                    }
                }
            }
        }
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        body { font-family: 'Hind Siliguri', sans-serif; }
    </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl text-white text-2xl font-bold mb-4">
                রা
            </div>
            <h1 class="text-2xl font-bold text-white">অ্যাডমিন প্যানেল</h1>
            <p class="text-gray-400 mt-2">মো. রাশেদ খান, এমপি</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white rounded-2xl shadow-xl p-8">
            <h2 class="text-xl font-semibold text-gray-800 mb-6 text-center">লগইন করুন</h2>

            <?php if ($error): ?>
            <div class="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
                <?= e($error) ?>
            </div>
            <?php endif; ?>

            <form method="POST" class="space-y-5">
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
                        ব্যবহারকারীর নাম বা ইমেইল
                    </label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value="<?= e($_POST['username'] ?? '') ?>"
                        required
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                        placeholder="admin"
                    >
                </div>

                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                        পাসওয়ার্ড
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        required
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                        placeholder="••••••••"
                    >
                </div>

                <div class="flex items-center justify-between">
                    <label class="flex items-center">
                        <input type="checkbox" name="remember" class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500">
                        <span class="ml-2 text-sm text-gray-600">মনে রাখুন</span>
                    </label>
                </div>

                <button
                    type="submit"
                    class="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                    লগইন
                </button>
            </form>
        </div>

        <!-- Back to site link -->
        <div class="text-center mt-6">
            <a href="<?= SITE_URL ?>" class="text-gray-400 hover:text-white transition text-sm">
                ← মূল সাইটে ফিরে যান
            </a>
        </div>
    </div>
</body>
</html>
