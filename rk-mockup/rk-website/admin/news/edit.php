<?php
// Include functions first for validation before any output
require_once dirname(__DIR__, 2) . '/includes/functions.php';
require_once dirname(__DIR__, 2) . '/includes/auth.php';
requireRole('editor');

// Validate before including header
$id = (int)($_GET['id'] ?? 0);
if (!$id) {
    redirect(ADMIN_URL . '/news', 'error', 'সংবাদ পাওয়া যায়নি।');
}

$news = Database::fetchOne("SELECT * FROM news WHERE id = :id", ['id' => $id]);
if (!$news) {
    redirect(ADMIN_URL . '/news', 'error', 'সংবাদ পাওয়া যায়নি।');
}

$errors = [];
$data = [
    'title' => $news['title'],
    'summary' => $news['summary'],
    'content' => $news['content'],
    'category' => $news['category'],
    'status' => $news['status'],
    'is_featured' => $news['is_featured']
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
        $errors[] = 'অবৈধ অনুরোধ।';
    } else {
        $data['title'] = trim($_POST['title'] ?? '');
        $data['summary'] = trim($_POST['summary'] ?? '');
        $data['content'] = $_POST['content'] ?? '';
        $data['category'] = $_POST['category'] ?? 'অন্যান্য';
        $data['status'] = $_POST['status'] ?? 'draft';
        $data['is_featured'] = isset($_POST['is_featured']) ? 1 : 0;

        if (empty($data['title'])) {
            $errors[] = 'শিরোনাম প্রয়োজন।';
        }

        if (empty($errors)) {
            // Handle image upload
            $imagePath = $news['featured_image'];
            if (!empty($_FILES['featured_image']['name'])) {
                $newImage = uploadFile($_FILES['featured_image'], 'news', ALLOWED_IMAGE_TYPES);
                if ($newImage) {
                    // Delete old image
                    if ($imagePath) {
                        deleteFile($imagePath);
                    }
                    $imagePath = $newImage;
                } else {
                    $errors[] = 'ছবি আপলোড ব্যর্থ। সর্বোচ্চ ৫MB এবং JPG/PNG ফরম্যাট অনুমোদিত।';
                }
            }

            // Handle image removal
            if (isset($_POST['remove_image']) && $imagePath) {
                deleteFile($imagePath);
                $imagePath = null;
            }

            if (empty($errors)) {
                $slug = $news['slug'];
                if ($data['title'] !== $news['title']) {
                    $slug = uniqueSlug('news', $data['title'], $id);
                }

                $updateData = [
                    'title' => $data['title'],
                    'slug' => $slug,
                    'summary' => $data['summary'],
                    'content' => $data['content'],
                    'category' => $data['category'],
                    'status' => $data['status'],
                    'is_featured' => $data['is_featured'],
                    'featured_image' => $imagePath
                ];

                // Set published_at if publishing for the first time
                if ($data['status'] === 'published' && $news['status'] !== 'published') {
                    $updateData['published_at'] = date('Y-m-d H:i:s');
                }

                Database::update('news', $updateData, 'id = :id', ['id' => $id]);
                redirect(ADMIN_URL . '/news', 'success', 'সংবাদ সফলভাবে আপডেট হয়েছে।');
            }
        }
    }
}

$categories = ['সরকারি_কার্যক্রম', 'উন্নয়ন', 'জনসভা', 'স্বাস্থ্য', 'শিক্ষা', 'যুব_কার্যক্রম', 'অন্যান্য'];

// Include header after all validation and redirects
$pageTitle = 'সংবাদ সম্পাদনা';
require_once dirname(__DIR__) . '/includes/header.php';
?>

<div class="max-w-4xl">
    <div class="mb-6">
        <a href="<?= ADMIN_URL ?>/news" class="text-gray-500 hover:text-gray-700 text-sm">
            ← সংবাদ তালিকায় ফিরে যান
        </a>
    </div>

    <?php if ($errors): ?>
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
        <ul class="list-disc list-inside">
            <?php foreach ($errors as $error): ?>
            <li><?= e($error) ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>

    <form method="POST" enctype="multipart/form-data" class="space-y-6">
        <?= csrfField() ?>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">সংবাদের তথ্য</h2>

            <!-- Title -->
            <div class="mb-4">
                <label for="title" class="block text-sm font-medium text-gray-700 mb-2">শিরোনাম *</label>
                <input type="text" id="title" name="title" value="<?= e($data['title']) ?>" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            </div>

            <!-- Summary -->
            <div class="mb-4">
                <label for="summary" class="block text-sm font-medium text-gray-700 mb-2">সারসংক্ষেপ</label>
                <textarea id="summary" name="summary" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"><?= e($data['summary']) ?></textarea>
            </div>

            <!-- Content -->
            <div class="mb-4">
                <label for="content" class="block text-sm font-medium text-gray-700 mb-2">বিস্তারিত</label>
                <textarea id="content" name="content" rows="12" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"><?= e($data['content']) ?></textarea>
                <p class="mt-1 text-xs text-gray-500">HTML ট্যাগ ব্যবহার করতে পারবেন</p>
            </div>

            <!-- Category -->
            <div class="mb-4">
                <label for="category" class="block text-sm font-medium text-gray-700 mb-2">ক্যাটাগরি</label>
                <select id="category" name="category" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <?php foreach ($categories as $cat): ?>
                    <option value="<?= e($cat) ?>" <?= $data['category'] === $cat ? 'selected' : '' ?>><?= e(str_replace('_', ' ', $cat)) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <!-- Current Image -->
            <?php if ($news['featured_image']): ?>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">বর্তমান ছবি</label>
                <div class="flex items-center space-x-4">
                    <img src="<?= UPLOADS_URL ?>/<?= e($news['featured_image']) ?>" alt="" class="w-32 h-20 object-cover rounded-lg">
                    <label class="flex items-center text-red-600 cursor-pointer">
                        <input type="checkbox" name="remove_image" value="1" class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mr-2">
                        ছবি সরান
                    </label>
                </div>
            </div>
            <?php endif; ?>

            <!-- Featured Image -->
            <div class="mb-4">
                <label for="featured_image" class="block text-sm font-medium text-gray-700 mb-2"><?= $news['featured_image'] ? 'নতুন ছবি (ঐচ্ছিক)' : 'ফিচার্ড ছবি' ?></label>
                <input type="file" id="featured_image" name="featured_image" accept="image/*" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <p class="mt-1 text-xs text-gray-500">JPG, PNG ফরম্যাট। সর্বোচ্চ ৫MB।</p>
            </div>

            <!-- Status & Featured -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="status" class="block text-sm font-medium text-gray-700 mb-2">স্ট্যাটাস</label>
                    <select id="status" name="status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        <option value="draft" <?= $data['status'] === 'draft' ? 'selected' : '' ?>>ড্রাফট</option>
                        <option value="published" <?= $data['status'] === 'published' ? 'selected' : '' ?>>প্রকাশিত</option>
                    </select>
                </div>
                <div class="flex items-center pt-8">
                    <label class="flex items-center">
                        <input type="checkbox" name="is_featured" value="1" <?= $data['is_featured'] ? 'checked' : '' ?> class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500">
                        <span class="ml-2 text-sm text-gray-700">ফিচার্ড হিসেবে দেখান</span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Meta Info -->
        <div class="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p>তৈরি: <?= formatBengaliDate($news['created_at'], true) ?></p>
            <?php if ($news['published_at']): ?>
            <p>প্রকাশ: <?= formatBengaliDate($news['published_at'], true) ?></p>
            <?php endif; ?>
            <p>ভিউ: <?= toBengaliDigits($news['views_count']) ?></p>
        </div>

        <!-- Submit Buttons -->
        <div class="flex items-center justify-end space-x-4">
            <a href="<?= ADMIN_URL ?>/news" class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                বাতিল
            </a>
            <button type="submit" class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                আপডেট করুন
            </button>
        </div>
    </form>
</div>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
