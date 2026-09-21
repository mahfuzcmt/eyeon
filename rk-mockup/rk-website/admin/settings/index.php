<?php
$pageTitle = 'সাইট সেটিংস';
require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();
requireRole(['super_admin']);

$errors = [];
$success = false;

// Setting keys and their types
$settingFields = [
    'site_title' => ['label' => 'সাইটের শিরোনাম', 'type' => 'text'],
    'site_tagline' => ['label' => 'ট্যাগলাইন', 'type' => 'text'],
    'about_text' => ['label' => 'সংক্ষিপ্ত পরিচিতি', 'type' => 'textarea'],
    'office_address' => ['label' => 'অফিসের ঠিকানা', 'type' => 'textarea'],
    'contact_phone' => ['label' => 'যোগাযোগ ফোন', 'type' => 'text'],
    'contact_email' => ['label' => 'যোগাযোগ ইমেইল', 'type' => 'email'],
    'facebook_url' => ['label' => 'ফেসবুক URL', 'type' => 'url'],
    'youtube_url' => ['label' => 'ইউটিউব চ্যানেল URL', 'type' => 'url'],
    'featured_video_id' => ['label' => 'ফিচার্ড ভিডিও ID (YouTube)', 'type' => 'text'],
    'hero_image' => ['label' => 'হিরো ইমেজ', 'type' => 'image']
];

// Get current values
$settings = [];
foreach ($settingFields as $key => $field) {
    $settings[$key] = getSetting($key, '');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
        $errors[] = 'অবৈধ অনুরোধ। পৃষ্ঠা রিফ্রেশ করুন।';
    } else {
        try {
            foreach ($settingFields as $key => $field) {
                if ($field['type'] === 'image') {
                    // Handle image upload
                    if (!empty($_FILES[$key]['name'])) {
                        $uploaded = uploadFile($_FILES[$key], 'settings');
                        if ($uploaded['success']) {
                            // Delete old image
                            $oldImage = getSetting($key);
                            if ($oldImage) {
                                deleteFile($oldImage, 'settings');
                            }
                            updateSetting($key, $uploaded['filename']);
                        } else {
                            $errors[] = $field['label'] . ': ' . $uploaded['error'];
                        }
                    }

                    // Handle image delete
                    if (isset($_POST['delete_' . $key])) {
                        $oldImage = getSetting($key);
                        if ($oldImage) {
                            deleteFile($oldImage, 'settings');
                            updateSetting($key, '');
                        }
                    }
                } else {
                    $value = trim($_POST[$key] ?? '');
                    updateSetting($key, $value);
                }
            }

            if (empty($errors)) {
                setFlashMessage('সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে।', 'success');
                header('Location: ' . ADMIN_URL . '/settings');
                exit;
            }
        } catch (Exception $e) {
            $errors[] = 'সংরক্ষণ করতে সমস্যা হয়েছে।';
            if (DEBUG_MODE) {
                $errors[] = $e->getMessage();
            }
        }
    }
}

// Refresh settings after potential update
foreach ($settingFields as $key => $field) {
    $settings[$key] = getSetting($key, '');
}

require_once dirname(dirname(__DIR__)) . '/admin/includes/header.php';
?>

<div class="max-w-4xl mx-auto">
    <div class="bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">সাইট সেটিংস</h2>

        <?php if (!empty($errors)): ?>
        <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <ul class="text-sm text-red-700 list-disc list-inside">
                <?php foreach ($errors as $error): ?>
                <li><?= e($error) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>

        <form method="POST" enctype="multipart/form-data" class="space-y-6">
            <?= csrfField() ?>

            <!-- Basic Info -->
            <div class="border-b pb-6">
                <h3 class="text-lg font-medium text-gray-800 mb-4">প্রাথমিক তথ্য</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="site_title" class="block text-sm font-medium text-gray-700 mb-2">
                            <?= $settingFields['site_title']['label'] ?>
                        </label>
                        <input type="text" id="site_title" name="site_title"
                            value="<?= e($settings['site_title']) ?>"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                    <div>
                        <label for="site_tagline" class="block text-sm font-medium text-gray-700 mb-2">
                            <?= $settingFields['site_tagline']['label'] ?>
                        </label>
                        <input type="text" id="site_tagline" name="site_tagline"
                            value="<?= e($settings['site_tagline']) ?>"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                    <div class="md:col-span-2">
                        <label for="about_text" class="block text-sm font-medium text-gray-700 mb-2">
                            <?= $settingFields['about_text']['label'] ?>
                        </label>
                        <textarea id="about_text" name="about_text" rows="4"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"><?= e($settings['about_text']) ?></textarea>
                    </div>
                </div>
            </div>

            <!-- Contact Info -->
            <div class="border-b pb-6">
                <h3 class="text-lg font-medium text-gray-800 mb-4">যোগাযোগ তথ্য</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="md:col-span-2">
                        <label for="office_address" class="block text-sm font-medium text-gray-700 mb-2">
                            <?= $settingFields['office_address']['label'] ?>
                        </label>
                        <textarea id="office_address" name="office_address" rows="3"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"><?= e($settings['office_address']) ?></textarea>
                    </div>
                    <div>
                        <label for="contact_phone" class="block text-sm font-medium text-gray-700 mb-2">
                            <?= $settingFields['contact_phone']['label'] ?>
                        </label>
                        <input type="text" id="contact_phone" name="contact_phone"
                            value="<?= e($settings['contact_phone']) ?>"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                    <div>
                        <label for="contact_email" class="block text-sm font-medium text-gray-700 mb-2">
                            <?= $settingFields['contact_email']['label'] ?>
                        </label>
                        <input type="email" id="contact_email" name="contact_email"
                            value="<?= e($settings['contact_email']) ?>"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                </div>
            </div>

            <!-- Social Media -->
            <div class="border-b pb-6">
                <h3 class="text-lg font-medium text-gray-800 mb-4">সামাজিক মাধ্যম</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="facebook_url" class="block text-sm font-medium text-gray-700 mb-2">
                            <?= $settingFields['facebook_url']['label'] ?>
                        </label>
                        <input type="url" id="facebook_url" name="facebook_url"
                            value="<?= e($settings['facebook_url']) ?>"
                            placeholder="https://www.facebook.com/..."
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                    <div>
                        <label for="youtube_url" class="block text-sm font-medium text-gray-700 mb-2">
                            <?= $settingFields['youtube_url']['label'] ?>
                        </label>
                        <input type="url" id="youtube_url" name="youtube_url"
                            value="<?= e($settings['youtube_url']) ?>"
                            placeholder="https://www.youtube.com/..."
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                    <div>
                        <label for="featured_video_id" class="block text-sm font-medium text-gray-700 mb-2">
                            <?= $settingFields['featured_video_id']['label'] ?>
                        </label>
                        <input type="text" id="featured_video_id" name="featured_video_id"
                            value="<?= e($settings['featured_video_id']) ?>"
                            placeholder="dQw4w9WgXcQ"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        <p class="text-xs text-gray-500 mt-1">ইউটিউব URL থেকে ভিডিও ID দিন (যেমন: dQw4w9WgXcQ)</p>
                    </div>
                </div>
            </div>

            <!-- Media -->
            <div>
                <h3 class="text-lg font-medium text-gray-800 mb-4">মিডিয়া</h3>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <?= $settingFields['hero_image']['label'] ?>
                    </label>
                    <?php if ($settings['hero_image']): ?>
                    <div class="mb-3 relative inline-block">
                        <img src="<?= UPLOADS_URL ?>/settings/<?= e($settings['hero_image']) ?>" alt="" class="h-32 rounded-lg">
                        <label class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 cursor-pointer hover:bg-red-600">
                            <input type="checkbox" name="delete_hero_image" value="1" class="sr-only"
                                onchange="this.parentElement.parentElement.style.opacity = this.checked ? '0.5' : '1'">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </label>
                    </div>
                    <?php endif; ?>
                    <input type="file" name="hero_image" accept="image/*"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <p class="text-xs text-gray-500 mt-1">প্রোফাইল/হিরো ছবি (JPG, PNG - সর্বোচ্চ ২ MB)</p>
                </div>
            </div>

            <!-- Submit -->
            <div class="flex items-center justify-end gap-4 pt-6 border-t">
                <button type="submit" class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                    সেটিংস সংরক্ষণ করুন
                </button>
            </div>
        </form>
    </div>
</div>

<?php require_once dirname(dirname(__DIR__)) . '/admin/includes/footer.php'; ?>
