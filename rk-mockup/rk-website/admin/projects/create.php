<?php
$pageTitle = 'নতুন প্রকল্প';
require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();
requireRole(['super_admin', 'editor']);

$errors = [];
$success = false;

$categories = ['অবকাঠামো', 'শিক্ষা', 'স্বাস্থ্য', 'কৃষি', 'কর্মসংস্থান', 'বিদ্যুৎ', 'অন্যান্য'];
$statuses = ['পরিকল্পিত', 'চলমান', 'সম্পন্ন', 'বিলম্বিত'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
        $errors[] = 'অবৈধ অনুরোধ। পৃষ্ঠা রিফ্রেশ করুন।';
    } else {
        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $category = $_POST['category'] ?? 'অন্যান্য';
        $status = $_POST['status'] ?? 'পরিকল্পিত';
        $progressPercent = (int)($_POST['progress_percent'] ?? 0);
        $budgetCrore = !empty($_POST['budget_crore']) ? (float)$_POST['budget_crore'] : null;
        $locationDistrict = trim($_POST['location_district'] ?? '');
        $locationUpazila = trim($_POST['location_upazila'] ?? '');
        $locationUnion = trim($_POST['location_union'] ?? '');
        $responsibleDept = trim($_POST['responsible_dept'] ?? '');
        $startDate = !empty($_POST['start_date']) ? $_POST['start_date'] : null;
        $endDate = !empty($_POST['end_date']) ? $_POST['end_date'] : null;

        // Validation
        if (empty($name)) {
            $errors[] = 'প্রকল্পের নাম প্রয়োজন।';
        }

        if ($progressPercent < 0 || $progressPercent > 100) {
            $errors[] = 'অগ্রগতি ০ থেকে ১০০ এর মধ্যে হতে হবে।';
        }

        // Handle images
        $beforeImage = null;
        $afterImage = null;

        if (!empty($_FILES['before_image']['name'])) {
            $uploaded = uploadFile($_FILES['before_image'], 'projects');
            if ($uploaded['success']) {
                $beforeImage = $uploaded['filename'];
            } else {
                $errors[] = 'পূর্বের ছবি: ' . $uploaded['error'];
            }
        }

        if (!empty($_FILES['after_image']['name'])) {
            $uploaded = uploadFile($_FILES['after_image'], 'projects');
            if ($uploaded['success']) {
                $afterImage = $uploaded['filename'];
            } else {
                $errors[] = 'পরবর্তী ছবি: ' . $uploaded['error'];
            }
        }

        if (empty($errors)) {
            try {
                $slug = uniqueSlug($name, 'projects');

                Database::insert('projects', [
                    'name' => $name,
                    'slug' => $slug,
                    'description' => $description ?: null,
                    'category' => $category,
                    'status' => $status,
                    'progress_percent' => $progressPercent,
                    'budget_crore' => $budgetCrore,
                    'location_district' => $locationDistrict ?: null,
                    'location_upazila' => $locationUpazila ?: null,
                    'location_union' => $locationUnion ?: null,
                    'responsible_dept' => $responsibleDept ?: null,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'before_image' => $beforeImage,
                    'after_image' => $afterImage
                ]);

                setFlashMessage('প্রকল্প সফলভাবে তৈরি হয়েছে।', 'success');
                header('Location: ' . ADMIN_URL . '/projects');
                exit;

            } catch (Exception $e) {
                $errors[] = 'প্রকল্প তৈরি করতে সমস্যা হয়েছে।';
                if (DEBUG_MODE) {
                    $errors[] = $e->getMessage();
                }
            }
        }
    }
}

require_once dirname(dirname(__DIR__)) . '/admin/includes/header.php';
?>

<div class="max-w-4xl mx-auto">
    <div class="mb-6">
        <a href="<?= ADMIN_URL ?>/projects" class="text-primary-600 hover:text-primary-700 flex items-center">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            প্রকল্প তালিকায় ফিরুন
        </a>
    </div>

    <div class="bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">নতুন প্রকল্প তৈরি করুন</h2>

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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                    <label for="name" class="block text-sm font-medium text-gray-700 mb-2">প্রকল্পের নাম *</label>
                    <input type="text" id="name" name="name" required
                        value="<?= e($_POST['name'] ?? '') ?>"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>

                <div>
                    <label for="category" class="block text-sm font-medium text-gray-700 mb-2">বিভাগ</label>
                    <select id="category" name="category"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        <?php foreach ($categories as $cat): ?>
                        <option value="<?= e($cat) ?>" <?= ($_POST['category'] ?? '') === $cat ? 'selected' : '' ?>><?= e($cat) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label for="status" class="block text-sm font-medium text-gray-700 mb-2">অবস্থা</label>
                    <select id="status" name="status"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        <?php foreach ($statuses as $s): ?>
                        <option value="<?= e($s) ?>" <?= ($_POST['status'] ?? '') === $s ? 'selected' : '' ?>><?= e($s) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="md:col-span-2">
                    <label for="description" class="block text-sm font-medium text-gray-700 mb-2">বিবরণ</label>
                    <textarea id="description" name="description" rows="4"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"><?= e($_POST['description'] ?? '') ?></textarea>
                </div>
            </div>

            <!-- Progress & Budget -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="progress_percent" class="block text-sm font-medium text-gray-700 mb-2">অগ্রগতি (%)</label>
                    <input type="number" id="progress_percent" name="progress_percent" min="0" max="100"
                        value="<?= e($_POST['progress_percent'] ?? '0') ?>"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>

                <div>
                    <label for="budget_crore" class="block text-sm font-medium text-gray-700 mb-2">বাজেট (কোটি টাকা)</label>
                    <input type="number" id="budget_crore" name="budget_crore" step="0.01" min="0"
                        value="<?= e($_POST['budget_crore'] ?? '') ?>"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>
            </div>

            <!-- Location -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label for="location_district" class="block text-sm font-medium text-gray-700 mb-2">জেলা</label>
                    <input type="text" id="location_district" name="location_district"
                        value="<?= e($_POST['location_district'] ?? 'গাইবান্ধা') ?>"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>

                <div>
                    <label for="location_upazila" class="block text-sm font-medium text-gray-700 mb-2">উপজেলা</label>
                    <input type="text" id="location_upazila" name="location_upazila"
                        value="<?= e($_POST['location_upazila'] ?? '') ?>"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>

                <div>
                    <label for="location_union" class="block text-sm font-medium text-gray-700 mb-2">ইউনিয়ন</label>
                    <input type="text" id="location_union" name="location_union"
                        value="<?= e($_POST['location_union'] ?? '') ?>"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>
            </div>

            <!-- Department & Dates -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label for="responsible_dept" class="block text-sm font-medium text-gray-700 mb-2">দায়িত্বপ্রাপ্ত বিভাগ</label>
                    <input type="text" id="responsible_dept" name="responsible_dept"
                        value="<?= e($_POST['responsible_dept'] ?? '') ?>"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>

                <div>
                    <label for="start_date" class="block text-sm font-medium text-gray-700 mb-2">শুরুর তারিখ</label>
                    <input type="date" id="start_date" name="start_date"
                        value="<?= e($_POST['start_date'] ?? '') ?>"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>

                <div>
                    <label for="end_date" class="block text-sm font-medium text-gray-700 mb-2">শেষের তারিখ</label>
                    <input type="date" id="end_date" name="end_date"
                        value="<?= e($_POST['end_date'] ?? '') ?>"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>
            </div>

            <!-- Images -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="before_image" class="block text-sm font-medium text-gray-700 mb-2">পূর্বের ছবি</label>
                    <input type="file" id="before_image" name="before_image" accept="image/*"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <p class="text-xs text-gray-500 mt-1">JPG, PNG বা GIF (সর্বোচ্চ ২ MB)</p>
                </div>

                <div>
                    <label for="after_image" class="block text-sm font-medium text-gray-700 mb-2">পরবর্তী ছবি</label>
                    <input type="file" id="after_image" name="after_image" accept="image/*"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <p class="text-xs text-gray-500 mt-1">JPG, PNG বা GIF (সর্বোচ্চ ২ MB)</p>
                </div>
            </div>

            <!-- Submit -->
            <div class="flex items-center justify-end gap-4 pt-6 border-t">
                <a href="<?= ADMIN_URL ?>/projects" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    বাতিল
                </a>
                <button type="submit" class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                    প্রকল্প তৈরি করুন
                </button>
            </div>
        </form>
    </div>
</div>

<?php require_once dirname(dirname(__DIR__)) . '/admin/includes/footer.php'; ?>
