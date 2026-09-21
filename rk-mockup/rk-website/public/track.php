<?php
$pageTitle = 'অভিযোগ ট্র্যাক';
require_once dirname(__DIR__) . '/includes/header.php';

$complaint = null;
$logs = [];
$searchPerformed = false;

if (!empty($_GET['ticket']) || !empty($_POST['ticket'])) {
    $searchPerformed = true;
    $ticket = trim($_GET['ticket'] ?? $_POST['ticket'] ?? '');

    if (!empty($ticket)) {
        $complaint = Database::fetchOne(
            "SELECT * FROM complaints WHERE ticket_number = :ticket",
            ['ticket' => $ticket]
        );

        if ($complaint) {
            $logs = Database::fetchAll(
                "SELECT * FROM complaint_logs WHERE complaint_id = :id ORDER BY created_at ASC",
                ['id' => $complaint['id']]
            );
        }
    }
}
?>

<section class="py-12">
    <div class="container mx-auto px-4 max-w-2xl">
        <!-- Header -->
        <div class="text-center mb-10">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">অভিযোগ ট্র্যাক করুন</h1>
            <p class="text-gray-600">
                আপনার টিকেট নম্বর দিয়ে অভিযোগের বর্তমান অবস্থা জানুন।
            </p>
        </div>

        <!-- Search Form -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <form method="GET" class="flex flex-col md:flex-row gap-4">
                <div class="flex-1">
                    <input type="text" name="ticket" value="<?= e($_GET['ticket'] ?? '') ?>" placeholder="টিকেট নম্বর (যেমন: RK-2026-00001)" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-mono" required>
                </div>
                <button type="submit" class="px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition">
                    খুঁজুন
                </button>
            </form>
        </div>

        <!-- Results -->
        <?php if ($searchPerformed): ?>
            <?php if ($complaint): ?>
            <!-- Complaint Details -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <!-- Status Header -->
                <div class="p-6 border-b <?= $complaint['status'] === 'সমাধান' ? 'bg-green-50' : 'bg-primary-50' ?>">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <p class="text-sm text-gray-600">টিকেট নম্বর</p>
                            <p class="text-2xl font-mono font-bold text-gray-800"><?= e($complaint['ticket_number']) ?></p>
                        </div>
                        <span class="px-4 py-2 text-lg rounded-full <?= getStatusBadgeClass($complaint['status']) ?>">
                            <?= e($complaint['status']) ?>
                        </span>
                    </div>
                </div>

                <!-- Details -->
                <div class="p-6 space-y-4">
                    <div>
                        <p class="text-sm text-gray-500">বিষয়</p>
                        <p class="text-lg text-gray-900"><?= e($complaint['subject']) ?></p>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-500">ক্যাটাগরি</p>
                            <p class="text-gray-900"><?= e($complaint['category']) ?></p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">দাখিলের তারিখ</p>
                            <p class="text-gray-900"><?= formatBengaliDate($complaint['submitted_at']) ?></p>
                        </div>
                    </div>

                    <?php if ($complaint['assigned_department']): ?>
                    <div>
                        <p class="text-sm text-gray-500">দায়িত্বপ্রাপ্ত বিভাগ</p>
                        <p class="text-gray-900"><?= e($complaint['assigned_department']) ?></p>
                    </div>
                    <?php endif; ?>

                    <?php if ($complaint['resolution_notes']): ?>
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p class="text-sm text-green-700 font-medium mb-1">সমাধান নোট</p>
                        <p class="text-green-800"><?= e($complaint['resolution_notes']) ?></p>
                        <?php if ($complaint['resolved_at']): ?>
                        <p class="text-sm text-green-600 mt-2">সমাধান: <?= formatBengaliDate($complaint['resolved_at']) ?></p>
                        <?php endif; ?>
                    </div>
                    <?php endif; ?>
                </div>

                <!-- Timeline -->
                <?php if ($logs): ?>
                <div class="px-6 pb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pt-4 border-t">কার্যক্রম টাইমলাইন</h3>

                    <div class="space-y-4">
                        <?php foreach ($logs as $index => $log): ?>
                        <div class="flex items-start">
                            <div class="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <div class="w-3 h-3 bg-primary-600 rounded-full"></div>
                            </div>
                            <div class="ml-4 flex-1">
                                <p class="font-medium text-gray-900"><?= e($log['action']) ?></p>
                                <?php if ($log['description']): ?>
                                <p class="text-sm text-gray-600 mt-1"><?= nl2br(e($log['description'])) ?></p>
                                <?php endif; ?>
                                <p class="text-xs text-gray-400 mt-1"><?= formatBengaliDate($log['created_at'], true) ?></p>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endif; ?>
            </div>
            <?php else: ?>
            <!-- Not Found -->
            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
                <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-yellow-800 mb-2">অভিযোগ পাওয়া যায়নি</h3>
                <p class="text-yellow-700">এই টিকেট নম্বরে কোনো অভিযোগ নেই। সঠিক টিকেট নম্বর দিন।</p>
            </div>
            <?php endif; ?>
        <?php endif; ?>

        <!-- Help Text -->
        <div class="mt-8 text-center">
            <p class="text-gray-600">
                নতুন অভিযোগ করতে চান?
                <a href="<?= SITE_URL ?>/complaint" class="text-primary-600 hover:text-primary-700 font-medium">অভিযোগ দাখিল করুন</a>
            </p>
        </div>
    </div>
</section>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
