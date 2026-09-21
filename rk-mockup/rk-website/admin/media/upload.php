<?php
$pageTitle = 'মিডিয়া আপলোড';
require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();
requireRole(['super_admin', 'editor']);

$errors = [];
$categories = ['সাক্ষাৎকার', 'আন্দোলন', 'সংবাদ', 'বিশ্লেষণ', 'টক_শো', 'ইভেন্ট', 'অন্যান্য'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
        $errors[] = 'অবৈধ অনুরোধ। পৃষ্ঠা রিফ্রেশ করুন।';
    } else {
        $mediaType = $_POST['media_type'] ?? 'photo';
        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $category = $_POST['category'] ?? 'অন্যান্য';
        $isFeatured = isset($_POST['is_featured']) ? 1 : 0;
        $youtubeUrl = trim($_POST['youtube_url'] ?? '');

        // Validation
        if (empty($title)) {
            $errors[] = 'শিরোনাম প্রয়োজন।';
        }

        $url = null;
        $youtubeId = null;

        if ($mediaType === 'youtube') {
            if (empty($youtubeUrl)) {
                $errors[] = 'ইউটিউব URL প্রয়োজন।';
            } else {
                // Extract YouTube ID
                $youtubeId = extractYoutubeId($youtubeUrl);
                if (!$youtubeId) {
                    $errors[] = 'সঠিক ইউটিউব URL দিন।';
                } else {
                    $url = $youtubeUrl;
                }
            }
        } else {
            if (empty($_FILES['photo']['name'])) {
                $errors[] = 'ছবি নির্বাচন করুন।';
            } else {
                $uploaded = uploadFile($_FILES['photo'], 'media');
                if ($uploaded['success']) {
                    $url = $uploaded['filename'];
                } else {
                    $errors[] = $uploaded['error'];
                }
            }
        }

        if (empty($errors)) {
            try {
                Database::insert('media', [
                    'title' => $title,
                    'description' => $description ?: null,
                    'media_type' => $mediaType,
                    'url' => $url,
                    'youtube_id' => $youtubeId,
                    'category' => $category,
                    'is_featured' => $isFeatured
                ]);

                setFlashMessage('মিডিয়া সফলভাবে আপলোড হয়েছে।', 'success');
                header('Location: ' . ADMIN_URL . '/media');
                exit;

            } catch (Exception $e) {
                $errors[] = 'আপলোড করতে সমস্যা হয়েছে।';
                if (DEBUG_MODE) {
                    $errors[] = $e->getMessage();
                }
            }
        }
    }
}

/**
 * Extract YouTube video ID from URL
 */
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
        <h2 class="text-xl font-semibold text-gray-800 mb-6">নতুন মিডিয়া আপলোড</h2>

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

            <!-- Media Type -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">মিডিয়ার ধরন *</label>
                <div class="grid grid-cols-2 gap-4">
                    <label class="media-type-card cursor-pointer">
                        <input type="radio" name="media_type" value="youtube" class="sr-only" <?= ($_POST['media_type'] ?? 'youtube') === 'youtube' ? 'checked' : '' ?>>
                        <div class="border-2 border-gray-200 rounded-lg p-4 text-center transition hover:border-primary-300">
                            <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                            </div>
                            <p class="font-medium text-gray-800">ইউটিউব ভিডিও</p>
                        </div>
                    </label>
                    <label class="media-type-card cursor-pointer">
                        <input type="radio" name="media_type" value="photo" class="sr-only" <?= ($_POST['media_type'] ?? '') === 'photo' ? 'checked' : '' ?>>
                        <div class="border-2 border-gray-200 rounded-lg p-4 text-center transition hover:border-primary-300">
                            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </div>
                            <p class="font-medium text-gray-800">ছবি</p>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Title -->
            <div>
                <label for="title" class="block text-sm font-medium text-gray-700 mb-2">শিরোনাম *</label>
                <input type="text" id="title" name="title" required
                    value="<?= e($_POST['title'] ?? '') ?>"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            </div>

            <!-- YouTube URL (conditional) -->
            <div id="youtube-field">
                <label for="youtube_url" class="block text-sm font-medium text-gray-700 mb-2">ইউটিউব URL *</label>
                <input type="url" id="youtube_url" name="youtube_url"
                    value="<?= e($_POST['youtube_url'] ?? '') ?>"
                    placeholder="https://www.youtube.com/watch?v=..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <p class="text-xs text-gray-500 mt-1">যেমন: https://www.youtube.com/watch?v=ABC123</p>

                <!-- Preview -->
                <div id="youtube-preview" class="hidden mt-4">
                    <img id="youtube-thumbnail" src="" alt="" class="w-full max-w-md rounded-lg">
                </div>
            </div>

            <!-- Photo Upload (conditional) -->
            <div id="photo-field" class="hidden">
                <label for="photo" class="block text-sm font-medium text-gray-700 mb-2">ছবি নির্বাচন করুন *</label>
                <input type="file" id="photo" name="photo" accept="image/*"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <p class="text-xs text-gray-500 mt-1">JPG, PNG বা GIF (সর্বোচ্চ ২ MB)</p>

                <!-- Preview -->
                <div id="photo-preview" class="hidden mt-4">
                    <img id="photo-thumbnail" src="" alt="" class="w-full max-w-md rounded-lg">
                </div>
            </div>

            <!-- Description -->
            <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">বিবরণ</label>
                <textarea id="description" name="description" rows="3"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"><?= e($_POST['description'] ?? '') ?></textarea>
            </div>

            <!-- Category -->
            <div>
                <label for="category" class="block text-sm font-medium text-gray-700 mb-2">বিভাগ</label>
                <select id="category" name="category"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <?php foreach ($categories as $cat): ?>
                    <option value="<?= e($cat) ?>" <?= ($_POST['category'] ?? '') === $cat ? 'selected' : '' ?>><?= e(str_replace('_', ' ', $cat)) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <!-- Featured -->
            <div>
                <label class="flex items-center">
                    <input type="checkbox" name="is_featured" value="1" <?= isset($_POST['is_featured']) ? 'checked' : '' ?>
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
                    আপলোড করুন
                </button>
            </div>
        </form>
    </div>
</div>

<style>
.media-type-card input:checked + div {
    border-color: #E8900A;
    background-color: #FFF6E6;
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const radioButtons = document.querySelectorAll('input[name="media_type"]');
    const youtubeField = document.getElementById('youtube-field');
    const photoField = document.getElementById('photo-field');
    const youtubeUrl = document.getElementById('youtube_url');
    const youtubePreview = document.getElementById('youtube-preview');
    const youtubeThumbnail = document.getElementById('youtube-thumbnail');
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photo-preview');
    const photoThumbnail = document.getElementById('photo-thumbnail');

    function updateFields() {
        const selected = document.querySelector('input[name="media_type"]:checked').value;
        if (selected === 'youtube') {
            youtubeField.classList.remove('hidden');
            photoField.classList.add('hidden');
            youtubeUrl.required = true;
            photoInput.required = false;
        } else {
            youtubeField.classList.add('hidden');
            photoField.classList.remove('hidden');
            youtubeUrl.required = false;
            photoInput.required = true;
        }
    }

    radioButtons.forEach(radio => {
        radio.addEventListener('change', updateFields);
    });

    // YouTube preview
    youtubeUrl.addEventListener('input', function() {
        const url = this.value;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?]+)/);
        if (match) {
            youtubeThumbnail.src = 'https://img.youtube.com/vi/' + match[1] + '/maxresdefault.jpg';
            youtubePreview.classList.remove('hidden');
        } else {
            youtubePreview.classList.add('hidden');
        }
    });

    // Photo preview
    photoInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                photoThumbnail.src = e.target.result;
                photoPreview.classList.remove('hidden');
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    // Initialize
    updateFields();
});
</script>

<?php require_once dirname(dirname(__DIR__)) . '/admin/includes/footer.php'; ?>
