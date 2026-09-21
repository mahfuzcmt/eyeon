<?php
$pageTitle = 'সাক্ষাৎকারের সময় নিন';
require_once dirname(__DIR__) . '/includes/header.php';

$minDate = date('Y-m-d', strtotime('+1 day'));
$maxDate = date('Y-m-d', strtotime('+30 days'));
?>

<section class="py-12">
    <div class="container mx-auto px-4">
        <!-- Header -->
        <div class="text-center mb-10">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">সাক্ষাৎকারের সময় নিন</h1>
            <p class="text-gray-600 max-w-2xl mx-auto">
                মাননীয় সংসদ সদস্যের সাথে সাক্ষাৎকারের জন্য আগাম সময় নির্ধারণ করুন।
            </p>
        </div>

        <div class="max-w-3xl mx-auto">
            <!-- Info Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div class="bg-blue-50 rounded-lg p-4 text-center">
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <p class="text-sm font-medium text-blue-800">সাক্ষাৎকারের সময়</p>
                    <p class="text-xs text-blue-600 mt-1">সকাল ১০টা - বিকাল ৫টা</p>
                </div>
                <div class="bg-green-50 rounded-lg p-4 text-center">
                    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <p class="text-sm font-medium text-green-800">সাক্ষাৎকারের দিন</p>
                    <p class="text-xs text-green-600 mt-1">শনিবার - বৃহস্পতিবার</p>
                </div>
                <div class="bg-purple-50 rounded-lg p-4 text-center">
                    <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                    </div>
                    <p class="text-sm font-medium text-purple-800">স্থান</p>
                    <p class="text-xs text-purple-600 mt-1">সংসদ সদস্যের অফিস</p>
                </div>
            </div>

            <!-- Appointment Form -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                <form id="appointment-form" class="space-y-6">
                    <?= csrfField() ?>

                    <!-- Personal Information -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span class="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">১</span>
                            ব্যক্তিগত তথ্য
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="visitor_name" class="block text-sm font-medium text-gray-700 mb-2">নাম *</label>
                                <input type="text" id="visitor_name" name="visitor_name" required
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="আপনার পূর্ণ নাম">
                            </div>
                            <div>
                                <label for="visitor_phone" class="block text-sm font-medium text-gray-700 mb-2">মোবাইল নম্বর *</label>
                                <input type="tel" id="visitor_phone" name="visitor_phone" required
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="01XXXXXXXXX">
                            </div>
                            <div>
                                <label for="visitor_email" class="block text-sm font-medium text-gray-700 mb-2">ইমেইল</label>
                                <input type="email" id="visitor_email" name="visitor_email"
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="example@email.com">
                            </div>
                            <div>
                                <label for="visitor_organization" class="block text-sm font-medium text-gray-700 mb-2">প্রতিষ্ঠান</label>
                                <input type="text" id="visitor_organization" name="visitor_organization"
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="প্রতিষ্ঠানের নাম (যদি থাকে)">
                            </div>
                        </div>
                    </div>

                    <!-- Appointment Type -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span class="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">২</span>
                            সাক্ষাৎকারের ধরন
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label class="appointment-type-card cursor-pointer">
                                <input type="radio" name="appointment_type" value="সাধারণ" class="sr-only" checked>
                                <div class="border-2 border-gray-200 rounded-lg p-4 text-center transition hover:border-primary-300 peer-checked:border-primary-500 peer-checked:bg-primary-50">
                                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                        </svg>
                                    </div>
                                    <p class="font-medium text-gray-800">সাধারণ</p>
                                    <p class="text-xs text-gray-500 mt-1">ব্যক্তিগত সাক্ষাৎ</p>
                                </div>
                            </label>
                            <label class="appointment-type-card cursor-pointer">
                                <input type="radio" name="appointment_type" value="এলাকাবাসী" class="sr-only">
                                <div class="border-2 border-gray-200 rounded-lg p-4 text-center transition hover:border-primary-300">
                                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                        </svg>
                                    </div>
                                    <p class="font-medium text-gray-800">এলাকাবাসী</p>
                                    <p class="text-xs text-gray-500 mt-1">দলগত সাক্ষাৎ</p>
                                </div>
                            </label>
                            <label class="appointment-type-card cursor-pointer">
                                <input type="radio" name="appointment_type" value="মিডিয়া" class="sr-only">
                                <div class="border-2 border-gray-200 rounded-lg p-4 text-center transition hover:border-primary-300">
                                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                        </svg>
                                    </div>
                                    <p class="font-medium text-gray-800">মিডিয়া</p>
                                    <p class="text-xs text-gray-500 mt-1">সাংবাদিক/মিডিয়া</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Date & Time -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span class="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">৩</span>
                            তারিখ ও সময়
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="scheduled_date" class="block text-sm font-medium text-gray-700 mb-2">তারিখ *</label>
                                <input type="date" id="scheduled_date" name="scheduled_date" required
                                    min="<?= $minDate ?>" max="<?= $maxDate ?>"
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                <p class="text-xs text-gray-500 mt-1">আগামী ৩০ দিনের মধ্যে তারিখ নির্বাচন করুন</p>
                            </div>
                            <div>
                                <label for="scheduled_time" class="block text-sm font-medium text-gray-700 mb-2">সময় *</label>
                                <select id="scheduled_time" name="scheduled_time" required
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                    <option value="">-- প্রথমে তারিখ নির্বাচন করুন --</option>
                                </select>
                                <p class="text-xs text-gray-500 mt-1" id="time-status"></p>
                            </div>
                        </div>
                    </div>

                    <!-- Purpose -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span class="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">৪</span>
                            সাক্ষাৎকারের উদ্দেশ্য
                        </h3>
                        <div>
                            <label for="purpose" class="block text-sm font-medium text-gray-700 mb-2">উদ্দেশ্য *</label>
                            <textarea id="purpose" name="purpose" rows="4" required
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="সাক্ষাৎকারের বিষয় ও উদ্দেশ্য সংক্ষেপে লিখুন..."></textarea>
                        </div>
                    </div>

                    <!-- Submit -->
                    <div id="form-message" class="hidden"></div>

                    <div class="flex items-center justify-between pt-4 border-t">
                        <p class="text-sm text-gray-500">
                            <span class="text-red-500">*</span> চিহ্নিত ক্ষেত্রগুলো অবশ্যই পূরণ করতে হবে
                        </p>
                        <button type="submit" id="submit-btn"
                            class="px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition flex items-center">
                            <span>সময় নির্ধারণ করুন</span>
                            <svg class="hidden w-5 h-5 ml-2 animate-spin" id="loading-spinner" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </button>
                    </div>
                </form>
            </div>

            <!-- Note -->
            <div class="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div class="flex">
                    <svg class="w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    <div>
                        <h4 class="text-sm font-medium text-yellow-800">গুরুত্বপূর্ণ তথ্য</h4>
                        <ul class="text-sm text-yellow-700 mt-1 list-disc list-inside space-y-1">
                            <li>সাক্ষাৎকারের সময় নির্ধারণের পর নিশ্চিতকরণ এসএমএস পাঠানো হবে</li>
                            <li>নির্ধারিত সময়ের কমপক্ষে ১৫ মিনিট আগে উপস্থিত থাকুন</li>
                            <li>জরুরি প্রয়োজনে সাক্ষাৎকার বাতিল বা পুনঃনির্ধারিত হতে পারে</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Success Modal -->
<div id="success-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
        </div>
        <h3 class="text-2xl font-bold text-gray-800 mb-2">সাক্ষাৎকার বুক হয়েছে!</h3>
        <p class="text-gray-600 mb-4">আপনার সাক্ষাৎকার সফলভাবে নির্ধারিত হয়েছে।</p>

        <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <p class="text-sm text-gray-500 mb-1">অ্যাপয়েন্টমেন্ট নম্বর</p>
            <p class="text-2xl font-bold text-primary-600" id="appointment-number"></p>
        </div>

        <div class="text-sm text-gray-600 mb-6" id="appointment-details"></div>

        <div class="flex gap-3">
            <a href="<?= SITE_URL ?>" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                হোমপেজে যান
            </a>
            <button onclick="location.reload()" class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                নতুন বুকিং
            </button>
        </div>
    </div>
</div>

<style>
.appointment-type-card input:checked + div {
    border-color: #E8900A;
    background-color: #FFF6E6;
}
.appointment-type-card input:checked + div .w-12 {
    background-color: #E8900A;
}
.appointment-type-card input:checked + div .w-12 svg {
    color: white;
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('appointment-form');
    const dateInput = document.getElementById('scheduled_date');
    const timeSelect = document.getElementById('scheduled_time');
    const timeStatus = document.getElementById('time-status');
    const submitBtn = document.getElementById('submit-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const formMessage = document.getElementById('form-message');
    const successModal = document.getElementById('success-modal');

    // Load time slots when date changes
    dateInput.addEventListener('change', async function() {
        const date = this.value;
        if (!date) {
            timeSelect.innerHTML = '<option value="">-- প্রথমে তারিখ নির্বাচন করুন --</option>';
            return;
        }

        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">লোড হচ্ছে...</option>';
        timeStatus.textContent = '';

        try {
            const response = await fetch(`<?= API_URL ?>/get-timeslots.php?date=${date}`);
            const result = await response.json();

            if (result.success && result.slots.length > 0) {
                timeSelect.innerHTML = '<option value="">-- সময় নির্বাচন করুন --</option>';
                result.slots.forEach(slot => {
                    const option = document.createElement('option');
                    option.value = slot.time;
                    option.textContent = slot.display;
                    if (!slot.available) {
                        option.disabled = true;
                        option.textContent += ' (বুকড)';
                    }
                    timeSelect.appendChild(option);
                });
                timeStatus.textContent = `${result.available_count} টি সময় পাওয়া যাচ্ছে`;
                timeStatus.className = 'text-xs text-green-600 mt-1';
            } else {
                timeSelect.innerHTML = '<option value="">কোনো সময় পাওয়া যাচ্ছে না</option>';
                timeStatus.textContent = 'এই তারিখে কোনো সময় পাওয়া যাচ্ছে না';
                timeStatus.className = 'text-xs text-red-600 mt-1';
            }
        } catch (error) {
            timeSelect.innerHTML = '<option value="">ত্রুটি হয়েছে</option>';
            timeStatus.textContent = 'সময় লোড করতে সমস্যা হয়েছে';
            timeStatus.className = 'text-xs text-red-600 mt-1';
        }

        timeSelect.disabled = false;
    });

    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        submitBtn.disabled = true;
        loadingSpinner.classList.remove('hidden');
        formMessage.classList.add('hidden');

        try {
            const formData = new FormData(form);

            const response = await fetch('<?= API_URL ?>/appointment-book.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Show success modal
                document.getElementById('appointment-number').textContent = result.appointment_number;
                document.getElementById('appointment-details').innerHTML = `
                    <p><strong>তারিখ:</strong> ${result.date_display}</p>
                    <p><strong>সময়:</strong> ${result.time_display}</p>
                `;
                successModal.classList.remove('hidden');
                successModal.classList.add('flex');
            } else {
                formMessage.classList.remove('hidden', 'bg-green-50', 'text-green-700');
                formMessage.classList.add('bg-red-50', 'text-red-700', 'p-4', 'rounded-lg');
                formMessage.textContent = result.message;
            }
        } catch (error) {
            formMessage.classList.remove('hidden');
            formMessage.classList.add('bg-red-50', 'text-red-700', 'p-4', 'rounded-lg');
            formMessage.textContent = 'নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।';
        } finally {
            submitBtn.disabled = false;
            loadingSpinner.classList.add('hidden');
        }
    });

    // Close modal on outside click
    successModal.addEventListener('click', function(e) {
        if (e.target === successModal) {
            // Don't close - user must choose an action
        }
    });
});
</script>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
