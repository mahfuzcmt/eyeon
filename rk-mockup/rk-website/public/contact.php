<?php
$pageTitle = 'যোগাযোগ';
require_once dirname(__DIR__) . '/includes/header.php';
?>

<section class="py-12">
    <div class="container mx-auto px-4">
        <!-- Header -->
        <div class="text-center mb-12">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">যোগাযোগ করুন</h1>
            <p class="text-gray-600 max-w-2xl mx-auto">
                যেকোনো প্রশ্ন, পরামর্শ বা সহযোগিতার জন্য আমাদের সাথে যোগাযোগ করুন।
            </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <!-- Contact Info -->
            <div class="lg:col-span-1 space-y-6">
                <!-- Office Address -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                        <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">অফিসের ঠিকানা</h3>
                    <p class="text-gray-600"><?= nl2br(e(getSetting('office_address', ''))) ?></p>
                </div>

                <!-- Phone -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">ফোন</h3>
                    <a href="tel:<?= e(getSetting('contact_phone', '')) ?>" class="text-blue-600 hover:text-blue-700 text-lg">
                        <?= e(getSetting('contact_phone', '')) ?>
                    </a>
                </div>

                <!-- Email -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">ইমেইল</h3>
                    <a href="mailto:<?= e(getSetting('contact_email', '')) ?>" class="text-green-600 hover:text-green-700">
                        <?= e(getSetting('contact_email', '')) ?>
                    </a>
                </div>

                <!-- Social Media -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">সোশ্যাল মিডিয়া</h3>
                    <div class="flex space-x-4">
                        <?php if ($fb = getSetting('facebook_url')): ?>
                        <a href="<?= e($fb) ?>" target="_blank" class="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </a>
                        <?php endif; ?>
                        <?php if ($yt = getSetting('youtube_url')): ?>
                        <a href="<?= e($yt) ?>" target="_blank" class="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                        </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- Contact Form -->
            <div class="lg:col-span-2">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <h2 class="text-xl font-semibold text-gray-800 mb-6">বার্তা পাঠান</h2>

                    <form id="contact-form" class="space-y-5">
                        <?= csrfField() ?>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label for="name" class="block text-sm font-medium text-gray-700 mb-2">নাম *</label>
                                <input type="text" id="name" name="name" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="আপনার নাম">
                            </div>
                            <div>
                                <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">মোবাইল</label>
                                <input type="tel" id="phone" name="phone" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="01XXXXXXXXX">
                            </div>
                        </div>

                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">ইমেইল *</label>
                            <input type="email" id="email" name="email" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="example@email.com">
                        </div>

                        <div>
                            <label for="subject" class="block text-sm font-medium text-gray-700 mb-2">বিষয়</label>
                            <input type="text" id="subject" name="subject" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="বার্তার বিষয়">
                        </div>

                        <div>
                            <label for="message" class="block text-sm font-medium text-gray-700 mb-2">বার্তা *</label>
                            <textarea id="message" name="message" rows="5" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="আপনার বার্তা লিখুন..."></textarea>
                        </div>

                        <div id="form-message" class="hidden"></div>

                        <button type="submit" id="submit-btn" class="w-full md:w-auto px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition flex items-center justify-center">
                            <span>বার্তা পাঠান</span>
                            <svg class="hidden w-5 h-5 ml-2 animate-spin" id="loading-spinner" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</section>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const formMessage = document.getElementById('form-message');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        submitBtn.disabled = true;
        loadingSpinner.classList.remove('hidden');
        formMessage.classList.add('hidden');

        try {
            const formData = new FormData(form);

            const response = await fetch('<?= API_URL ?>/contact-submit.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            formMessage.classList.remove('hidden', 'bg-green-50', 'bg-red-50', 'text-green-700', 'text-red-700');

            if (result.success) {
                formMessage.classList.add('bg-green-50', 'text-green-700', 'p-4', 'rounded-lg');
                formMessage.textContent = result.message;
                form.reset();
            } else {
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
});
</script>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
