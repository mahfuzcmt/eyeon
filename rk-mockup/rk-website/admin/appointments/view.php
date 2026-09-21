<?php
$pageTitle = 'অ্যাপয়েন্টমেন্ট বিস্তারিত';
require_once dirname(dirname(__DIR__)) . '/includes/auth.php';
requireAuth();

$id = (int)($_GET['id'] ?? 0);
$appointment = Database::fetchOne("SELECT * FROM appointments WHERE id = :id", ['id' => $id]);

if (!$appointment) {
    setFlashMessage('অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।', 'error');
    header('Location: ' . ADMIN_URL . '/appointments');
    exit;
}

$statuses = ['বুকড', 'নিশ্চিত', 'সম্পন্ন', 'বাতিল', 'অনুপস্থিত'];

// Handle status update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    if (validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
        $newStatus = $_POST['status'] ?? '';
        $adminNotes = trim($_POST['admin_notes'] ?? '');

        if (in_array($newStatus, $statuses)) {
            Database::update('appointments', [
                'status' => $newStatus,
                'admin_notes' => $adminNotes ?: null
            ], 'id = :id', ['id' => $id]);

            setFlashMessage('অ্যাপয়েন্টমেন্ট আপডেট হয়েছে।', 'success');
            header('Location: ' . ADMIN_URL . '/appointments/view?id=' . $id);
            exit;
        }
    }
}

require_once dirname(dirname(__DIR__)) . '/admin/includes/header.php';
?>

<div class="max-w-4xl mx-auto">
    <div class="mb-6">
        <a href="<?= ADMIN_URL ?>/appointments" class="text-primary-600 hover:text-primary-700 flex items-center">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            অ্যাপয়েন্টমেন্ট তালিকায় ফিরুন
        </a>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Info -->
        <div class="lg:col-span-2 space-y-6">
            <!-- Appointment Details -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <p class="text-sm text-gray-500">অ্যাপয়েন্টমেন্ট নম্বর</p>
                        <p class="text-2xl font-bold text-primary-600"><?= e($appointment['appointment_number']) ?></p>
                    </div>
                    <span class="px-4 py-2 rounded-lg text-sm font-medium <?= getAppointmentStatusClass($appointment['status']) ?>">
                        <?= e($appointment['status']) ?>
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <p class="text-sm text-gray-500 mb-1">তারিখ</p>
                        <p class="font-medium text-gray-800"><?= formatBengaliDate($appointment['scheduled_date'], 'd F, Y') ?></p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 mb-1">সময়</p>
                        <p class="font-medium text-gray-800"><?= formatTimeDisplay($appointment['scheduled_time']) ?></p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 mb-1">সাক্ষাৎকারের ধরন</p>
                        <p class="font-medium text-gray-800"><?= e($appointment['appointment_type']) ?></p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 mb-1">সময়কাল</p>
                        <p class="font-medium text-gray-800"><?= toBengaliDigits($appointment['duration_minutes']) ?> মিনিট</p>
                    </div>
                </div>

                <div class="mt-6 pt-6 border-t">
                    <p class="text-sm text-gray-500 mb-2">সাক্ষাৎকারের উদ্দেশ্য</p>
                    <p class="text-gray-700"><?= nl2br(e($appointment['purpose'])) ?></p>
                </div>

                <?php if ($appointment['admin_notes']): ?>
                <div class="mt-6 pt-6 border-t">
                    <p class="text-sm text-gray-500 mb-2">অ্যাডমিন নোট</p>
                    <p class="text-gray-700 bg-gray-50 p-3 rounded-lg"><?= nl2br(e($appointment['admin_notes'])) ?></p>
                </div>
                <?php endif; ?>
            </div>

            <!-- Visitor Info -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">দর্শনার্থীর তথ্য</h3>

                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <p class="text-sm text-gray-500 mb-1">নাম</p>
                        <p class="font-medium text-gray-800"><?= e($appointment['visitor_name']) ?></p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 mb-1">মোবাইল</p>
                        <a href="tel:<?= e($appointment['visitor_phone']) ?>" class="font-medium text-primary-600 hover:text-primary-700">
                            <?= e($appointment['visitor_phone']) ?>
                        </a>
                    </div>
                    <?php if ($appointment['visitor_email']): ?>
                    <div>
                        <p class="text-sm text-gray-500 mb-1">ইমেইল</p>
                        <a href="mailto:<?= e($appointment['visitor_email']) ?>" class="font-medium text-primary-600 hover:text-primary-700">
                            <?= e($appointment['visitor_email']) ?>
                        </a>
                    </div>
                    <?php endif; ?>
                    <?php if ($appointment['visitor_organization']): ?>
                    <div>
                        <p class="text-sm text-gray-500 mb-1">প্রতিষ্ঠান</p>
                        <p class="font-medium text-gray-800"><?= e($appointment['visitor_organization']) ?></p>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
            <!-- Quick Actions -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">দ্রুত কার্যক্রম</h3>

                <div class="space-y-3">
                    <a href="tel:<?= e($appointment['visitor_phone']) ?>" class="flex items-center w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                        </svg>
                        কল করুন
                    </a>

                    <?php if ($appointment['visitor_email']): ?>
                    <a href="mailto:<?= e($appointment['visitor_email']) ?>" class="flex items-center w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        ইমেইল করুন
                    </a>
                    <?php endif; ?>

                    <a href="https://wa.me/88<?= e($appointment['visitor_phone']) ?>" target="_blank" class="flex items-center w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                    </a>
                </div>
            </div>

            <!-- Update Status -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">অবস্থা আপডেট</h3>

                <form method="POST" class="space-y-4">
                    <?= csrfField() ?>
                    <input type="hidden" name="update_status" value="1">

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">অবস্থা</label>
                        <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                            <?php foreach ($statuses as $s): ?>
                            <option value="<?= e($s) ?>" <?= $appointment['status'] === $s ? 'selected' : '' ?>><?= e($s) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">অ্যাডমিন নোট</label>
                        <textarea name="admin_notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"><?= e($appointment['admin_notes']) ?></textarea>
                    </div>

                    <button type="submit" class="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                        আপডেট করুন
                    </button>
                </form>
            </div>

            <!-- Metadata -->
            <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-sm text-gray-500">
                    বুক করা হয়েছে: <?= formatBengaliDate($appointment['created_at'], 'd F, Y h:i A') ?>
                </p>
            </div>
        </div>
    </div>
</div>

<?php
function formatTimeDisplay($time) {
    $hour = (int)substr($time, 0, 2);
    $minute = substr($time, 3, 2);
    $displayHour = $hour > 12 ? $hour - 12 : ($hour == 0 ? 12 : $hour);
    $bengaliPeriod = $hour < 12 ? 'সকাল' : ($hour >= 17 ? 'বিকাল' : 'দুপুর');
    return toBengaliDigits($displayHour) . ':' . toBengaliDigits($minute) . ' ' . $bengaliPeriod;
}

function getAppointmentStatusClass($status) {
    switch ($status) {
        case 'বুকড': return 'bg-yellow-100 text-yellow-700';
        case 'নিশ্চিত': return 'bg-purple-100 text-purple-700';
        case 'সম্পন্ন': return 'bg-green-100 text-green-700';
        case 'বাতিল': return 'bg-red-100 text-red-700';
        case 'অনুপস্থিত': return 'bg-gray-100 text-gray-700';
        default: return 'bg-gray-100 text-gray-700';
    }
}

require_once dirname(dirname(__DIR__)) . '/admin/includes/footer.php';
?>
