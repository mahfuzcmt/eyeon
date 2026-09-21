<?php
$pageTitle = 'অভিযোগ দাখিল';
require_once dirname(__DIR__) . '/includes/header.php';

$categories = ['অবকাঠামো', 'শিক্ষা', 'স্বাস্থ্য', 'কৃষি', 'কর্মসংস্থান', 'দুর্নীতি', 'বিদ্যুৎ', 'অন্যান্য'];
$districts = ['ঝিনাইদহ', 'কুষ্টিয়া', 'মাগুরা', 'চুয়াডাঙ্গা', 'মেহেরপুর', 'নড়াইল', 'যশোর', 'খুলনা'];
$upazilas = ['ঝিনাইদহ সদর', 'শৈলকূপা', 'হরিণাকুন্ড', 'কালীগঞ্জ', 'কোটচাঁদপুর', 'মহেশপুর'];
?>

<section class="py-12">
    <div class="container mx-auto px-4 max-w-3xl">
        <!-- Header -->
        <div class="text-center mb-10">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">অভিযোগ দাখিল করুন</h1>
            <p class="text-gray-600">
                আপনার সমস্যা বা অভিযোগ সরাসরি জানান। দ্রুত সমাধানের ব্যবস্থা নেওয়া হবে।
            </p>
        </div>

        <!-- Form -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
            <form id="complaint-form" class="space-y-6">
                <?= csrfField() ?>

                <!-- Personal Info -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">ব্যক্তিগত তথ্য</h3>

                    <div class="mb-4">
                        <label class="flex items-center">
                            <input type="checkbox" name="is_anonymous" id="is_anonymous" class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500">
                            <span class="ml-2 text-sm text-gray-700">বেনামে অভিযোগ করতে চাই</span>
                        </label>
                    </div>

                    <div id="personal-fields" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="full_name" class="block text-sm font-medium text-gray-700 mb-2">পূর্ণ নাম *</label>
                            <input type="text" id="full_name" name="full_name" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="আপনার নাম">
                        </div>
                        <div>
                            <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">মোবাইল নম্বর *</label>
                            <input type="tel" id="phone" name="phone" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="01XXXXXXXXX">
                        </div>
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">ইমেইল (ঐচ্ছিক)</label>
                            <input type="email" id="email" name="email" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="example@email.com">
                        </div>
                        <div>
                            <label for="nid_number" class="block text-sm font-medium text-gray-700 mb-2">জাতীয় পরিচয়পত্র নম্বর (ঐচ্ছিক)</label>
                            <input type="text" id="nid_number" name="nid_number" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="১০ বা ১৭ সংখ্যার NID">
                        </div>
                    </div>
                </div>

                <!-- Location -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">ঠিকানা</h3>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="district" class="block text-sm font-medium text-gray-700 mb-2">জেলা</label>
                            <select id="district" name="district" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                <option value="">জেলা নির্বাচন করুন</option>
                                <?php foreach ($districts as $d): ?>
                                <option value="<?= e($d) ?>"><?= e($d) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div>
                            <label for="upazila" class="block text-sm font-medium text-gray-700 mb-2">উপজেলা</label>
                            <select id="upazila" name="upazila" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                <option value="">উপজেলা নির্বাচন করুন</option>
                                <?php foreach ($upazilas as $u): ?>
                                <option value="<?= e($u) ?>"><?= e($u) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div>
                            <label for="union_name" class="block text-sm font-medium text-gray-700 mb-2">ইউনিয়ন/পৌরসভা</label>
                            <input type="text" id="union_name" name="union_name" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="ইউনিয়নের নাম">
                        </div>
                        <div>
                            <label for="village" class="block text-sm font-medium text-gray-700 mb-2">গ্রাম/মহল্লা</label>
                            <input type="text" id="village" name="village" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="গ্রামের নাম">
                        </div>
                    </div>
                </div>

                <!-- Complaint Details -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">অভিযোগের বিবরণ</h3>

                    <div class="space-y-4">
                        <div>
                            <label for="category" class="block text-sm font-medium text-gray-700 mb-2">অভিযোগের ধরন *</label>
                            <select id="category" name="category" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                <option value="">ধরন নির্বাচন করুন</option>
                                <?php foreach ($categories as $cat): ?>
                                <option value="<?= e($cat) ?>"><?= e($cat) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div>
                            <label for="subject" class="block text-sm font-medium text-gray-700 mb-2">বিষয় *</label>
                            <input type="text" id="subject" name="subject" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="অভিযোগের বিষয় সংক্ষেপে লিখুন">
                        </div>

                        <div>
                            <label for="description" class="block text-sm font-medium text-gray-700 mb-2">বিস্তারিত বিবরণ *</label>
                            <textarea id="description" name="description" rows="5" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="আপনার সমস্যা বা অভিযোগ বিস্তারিত লিখুন..."></textarea>
                        </div>

                        <div>
                            <label for="attachments" class="block text-sm font-medium text-gray-700 mb-2">সংযুক্তি (ঐচ্ছিক)</label>
                            <input type="file" id="attachments" name="attachments[]" multiple accept="image/*,.pdf" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                            <p class="mt-1 text-xs text-gray-500">ছবি বা PDF ফাইল। সর্বোচ্চ ৫MB প্রতিটি।</p>
                        </div>
                    </div>
                </div>

                <!-- Error Message -->
                <div id="form-error" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"></div>

                <!-- Submit Button -->
                <div class="pt-4">
                    <button type="submit" id="submit-btn" class="w-full px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center">
                        <span>অভিযোগ দাখিল করুন</span>
                        <svg class="hidden w-5 h-5 ml-2 animate-spin" id="loading-spinner" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </button>
                </div>
            </form>
        </div>

        <!-- Success Modal -->
        <div id="success-modal" class="hidden fixed inset-0 z-50 overflow-y-auto">
            <div class="flex items-center justify-center min-h-screen px-4">
                <div class="fixed inset-0 bg-black opacity-50"></div>
                <div class="relative bg-white rounded-2xl max-w-md w-full p-8 text-center">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">অভিযোগ দাখিল সফল!</h3>
                    <p class="text-gray-600 mb-4">আপনার টিকেট নম্বর:</p>
                    <p id="ticket-number" class="text-2xl font-mono font-bold text-primary-600 mb-6"></p>
                    <p class="text-sm text-gray-500 mb-6">এই নম্বরটি সংরক্ষণ করুন। এটি দিয়ে আপনার অভিযোগের অবস্থা জানতে পারবেন।</p>
                    <div class="flex gap-4">
                        <a href="<?= SITE_URL ?>/track" class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                            অভিযোগ ট্র্যাক করুন
                        </a>
                        <a href="<?= SITE_URL ?>" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                            হোম
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Track Link -->
        <div class="text-center mt-8">
            <p class="text-gray-600">
                আগে অভিযোগ করেছেন?
                <a href="<?= SITE_URL ?>/track" class="text-primary-600 hover:text-primary-700 font-medium">অভিযোগ ট্র্যাক করুন</a>
            </p>
        </div>
    </div>
</section>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('complaint-form');
    const anonymousCheckbox = document.getElementById('is_anonymous');
    const personalFields = document.getElementById('personal-fields');
    const submitBtn = document.getElementById('submit-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const formError = document.getElementById('form-error');
    const successModal = document.getElementById('success-modal');
    const ticketNumberEl = document.getElementById('ticket-number');

    // Toggle personal fields visibility
    anonymousCheckbox.addEventListener('change', function() {
        if (this.checked) {
            personalFields.querySelectorAll('input').forEach(input => {
                if (input.name !== 'phone') {
                    input.required = false;
                }
            });
        } else {
            document.getElementById('full_name').required = true;
        }
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Show loading
        submitBtn.disabled = true;
        loadingSpinner.classList.remove('hidden');
        formError.classList.add('hidden');

        try {
            const formData = new FormData(form);

            const response = await fetch('<?= API_URL ?>/complaint-submit.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                ticketNumberEl.textContent = result.ticket_number;
                successModal.classList.remove('hidden');
            } else {
                formError.textContent = result.message || 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।';
                formError.classList.remove('hidden');
            }
        } catch (error) {
            formError.textContent = 'নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।';
            formError.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            loadingSpinner.classList.add('hidden');
        }
    });
});
</script>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
