<?php
$pageTitle = 'মিডিয়া সম্পাদনা';
require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();
requireRole(['super_admin', 'editor']);

$id = (int)($_GET['id'] ?? 0);
$media = Database::fetchOne("SELECT * FROM media WHERE id = :id", ['id' => $id]);

if (!$media) {
    setFlashMessage('মিডিয়া পাওয়া যায়নি।', 'error');
    header('Location: ' . ADMIN_URL . '/media');
    exit;
}

$errors = [];
$categories = ['সাক্ষাৎকার', 'আন্দোলন', 'সংবাদ', 'বিশ্লেষণ', 'টক_শো', 'ইভেন্ট', 'অন্যান্য'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
        $errors[] = 'অবৈধ অনুরোধ। পৃষ্ঠা রিফ্রেশ করুন।';
    } else {
        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $category = $_POST['category'] ?? 'অন্যান্য';
        $isFeatured = isset($_POST['is_featured']) ? 1 : 0;

        if (empty($title)) {
            $errors[] = 'শিরোনাম প্রয়োজন।';
        }

        $url = $media['url'];
        $youtubeId = $media['youtube_id'];

        // Handle YouTube URL update
        if ($media['media_type'] === 'youtube') {
            $youtubeUrl = trim($_POST['youtube_url'] ?? '');
            if (!empty($youtubeUrl)) {
                $newYoutubeId = extractYoutubeId($youtubeUrl);
                if (!$newYoutubeId) {
                    $errors[] = 'সঠিক ইউটিউব URL দিন।';
                } else {
                    $url = $youtubeUrl;
                    $youtubeId = $newYoutubeId;
                }
            }
        }

        // Handle photo upload
        if ($media['media_type'] === 'photo' && !empty($_FILES['photo']['name'])) {
            $uploaded = uploadFile($_FILES['photo'], 'media');
            if ($uploaded['success']) {
                // Delete old photo
                if ($media['url']) {
                    deleteFile($media['url'], 'media');
                }
                $url = $uploaded['filename'];
            } else {
                $errors[] = $uploaded['error'];
            }
        }

        if (empty($errors)) {
            try {
                Database::update('media', [
                    'title' => $title,
                    'description' => $description ?: null,
                    'url' => $url,
                    'youtube_id' => $youtubeId,
                    'category' => $category,
                    'is_featured' => $isFeatured
                ], 'id = :id', ['id' => $id]);

                setFlashMessage('মিডিয়া সফলভাবে আপডেট হয়েছে।', 'success');
                header('Location: ' . ADMIN_URL . '/media');
                exit;

            } catch (Exception $e) {
                $errors[] = 'আপডেট করতে সমস্যা হয়েছে।';
                if (DEBUG_MODE) {
                    $errors[] = $e->getMessage();
                }
            }
        }
    }
}

function extractYoutubeId($url) {
    $patterns = [
        '/youtube\.com\/watch\?v=([^&]+)/',
        '/youtube\.com\/embed\/([^?]+)/',
        '/youtu\.be\/([^?]+)/',
        '/youtube\.com\/v\/([^?]+)/',
    ];
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $url, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

require_once dirname(dirname(__DIR__)) . '/admin/includes/header.php';
?>

<div class="max-w-2xl mx-auto">
    <div class="mb-6">
        <a href="<?= ADMIN_URL ?>/media" class="text-primary-600 hover:text-primary-700 flex items-center">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            মিডিয়া তালিকায় ফিরুন
        </a>
    </div>

    <div class="bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">মিডিয়া সম্পাদনা</h2>

        <?php if (!empty($errors)): ?>
        <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <ul class="text-sm text-red-700 list-disc list-inside">
                <?php foreach ($errors as $error): ?>
                <li><?= e($error) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>

        <!-- Current Media Preview -->
        <div class="mb-6">
            <?php if ($media['media_type'] === 'youtube'): ?>
            <div class="aspect-video max-w-md bg-black rounded-lg overflow-hidden">
                <iframe src="https://www.youtube.com/embed/<?= e($media['youtube_id']) ?>" frameborder="0" allowfullscreen class="w-full h-full"></iframe>
            </div>
            <?php else: ?>
            <img src="<?= UPLOADS_URL ?>/media/<?= e($media['url']) ?>" alt="" class="max-w-md rounded-lg">
            <?php endif; ?>
        </div>

        <form method="POST" enctype="multipart/form-data" class="space-y-6">
            <?= csrfField() ?>

            <!-- Title -->
            <div>
                <label for="title" class="block text-sm font-medium text-gray-700 mb-2">শিরোনাম *</label>
                <input type="text" id="title" name="title" required
                    value="<?= e($_POST['title'] ?? $media['title']) ?>"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            </div>

            <?php if ($media['media_type'] === 'youtube'): ?>
            <!-- YouTube URL -->
            <div>
                <label for="youtube_url" class="block text-sm font-medium text-gray-700 mb-2">ইউটিউব URL</label>
                <input type="url" id="youtube_url" name="youtube_url"
                    value="<?= e($_POST['youtube_url'] ?? $media['url']) ?>"
                    placeholder="https://www.youtube.com/watch?v=..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <p class="text-xs text-gray-500 mt-1">পরিবর্তন করতে নতুন URL দিন</p>
            </div>
            <?php else: ?>
            <!-- Photo Upload -->
            <div>
                <label for="photo" class="block text-sm font-medium text-gray-700 mb-2">নতুন ছবি</label>
                <input type="file" id="photo" name="photo" accept="image/*"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <p class="text-xs text-gray-500 mt-1">নতুন ছবি আপলোড করলে আগেরটি প্রতিস্থাপিত হবে</p>
            </div>
            <?php endif; ?>

            <!-- Description -->
            <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">বিবরণ</label>
                <textarea id="description" name="description" rows="3"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"><?= e($_POST['description'] ?? $media['description']) ?></textarea>
            </div>

            <!-- Category -->
            <div>
                <label for="category" class="block text-sm font-medium text-gray-700 mb-2">বিভাগ</label>
                <select id="category" name="category"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <?php foreach ($categories as $cat): ?>
                    <option value="<?= e($cat) ?>" <?= ($_POST['category'] ?? $media['category']) === $cat ? 'selected' : '' ?>><?= e(str_replace('_', ' ', $cat)) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <!-- Featured -->
            <div>
                <label class="flex items-center">
                    <input type="checkbox" name="is_featured" value="1"
                        <?= ($_POST['is_featured'] ?? $media['is_featured']) ? 'checked' : '' ?>
                        class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500">
                    <span class="ml-2 text-sm text-gray-700">ফিচার্ড হিসেবে চিহ্নিত করুন</span>
                </label>
            </div>

            <!-- Submit -->
            <div class="flex items-center justify-end gap-4 pt-6 border-t">
                <a href="<?= ADMIN_URL ?>/media" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    বাতিল
                </a>
                <button type="submit" class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                    পরিবর্তন সংরক্ষণ করুন
                </button>
            </div>
        </form>
    </div>
</div>

<?php require_once dirname(dirname(__DIR__)) . '/admin/includes/footer.php'; ?>
