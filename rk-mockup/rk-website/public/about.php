<?php
$pageTitle = 'পরিচিতি';
require_once dirname(__DIR__) . '/includes/header.php';
?>

<section class="py-12">
    <div class="container mx-auto px-4">
        <!-- Header -->
        <div class="text-center mb-12">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">পরিচিতি</h1>
        </div>

        <div class="max-w-4xl mx-auto">
            <!-- Profile Card -->
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden mb-12">
                <div class="bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-white">
                    <div class="flex flex-col md:flex-row items-center gap-6">
                        <?php if ($heroImage = getSetting('hero_image')): ?>
                        <img src="<?= UPLOADS_URL ?>/<?= e($heroImage) ?>" alt="" class="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover">
                        <?php else: ?>
                        <div class="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center text-5xl font-bold">
                            রা
                        </div>
                        <?php endif; ?>
                        <div class="text-center md:text-left">
                            <h2 class="text-3xl font-bold"><?= e(getSetting('site_title', 'মো. রাশেদ খান, এমপি')) ?></h2>
                            <p class="text-primary-100 text-xl mt-2"><?= e(getSetting('site_tagline', 'গাইবান্ধা-১ আসন')) ?></p>
                            <p class="text-primary-200 mt-2">জাতীয় সংসদ সদস্য</p>
                        </div>
                    </div>
                </div>

                <div class="p-8">
                    <div class="prose prose-lg max-w-none">
                        <p><?= nl2br(e(getSetting('about_text', ''))) ?></p>

                        <h3 class="text-xl font-semibold text-gray-800 mt-8 mb-4">রাজনৈতিক জীবন</h3>
                        <p>মো. রাশেদ খান গাইবান্ধা-১ আসন থেকে জাতীয় সংসদে নির্বাচিত হয়েছেন। তিনি এলাকার উন্নয়ন ও জনগণের কল্যাণে নিরলসভাবে কাজ করে যাচ্ছেন।</p>

                        <h3 class="text-xl font-semibold text-gray-800 mt-8 mb-4">নির্বাচনী এলাকা</h3>
                        <div class="bg-gray-50 rounded-lg p-6">
                            <ul class="space-y-2">
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                                    </svg>
                                    <span><strong>জেলা:</strong> গাইবান্ধা</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                                    </svg>
                                    <span><strong>আসন:</strong> গাইবান্ধা-১</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                                    </svg>
                                    <span><strong>উপজেলাসমূহ:</strong> গাইবান্ধা সদর, সাঘাটা, সুন্দরগঞ্জ (আংশিক)</span>
                                </li>
                            </ul>
                        </div>

                        <h3 class="text-xl font-semibold text-gray-800 mt-8 mb-4">দৃষ্টিভঙ্গি ও লক্ষ্য</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-primary-50 rounded-lg p-4">
                                <h4 class="font-semibold text-primary-700 mb-2">শিক্ষা</h4>
                                <p class="text-sm text-gray-600">মানসম্মত শিক্ষার সুযোগ নিশ্চিত করা এবং শিক্ষা প্রতিষ্ঠানের অবকাঠামো উন্নয়ন।</p>
                            </div>
                            <div class="bg-blue-50 rounded-lg p-4">
                                <h4 class="font-semibold text-blue-700 mb-2">স্বাস্থ্য</h4>
                                <p class="text-sm text-gray-600">সবার জন্য সাশ্রয়ী ও মানসম্মত স্বাস্থ্যসেবা নিশ্চিত করা।</p>
                            </div>
                            <div class="bg-green-50 rounded-lg p-4">
                                <h4 class="font-semibold text-green-700 mb-2">কর্মসংস্থান</h4>
                                <p class="text-sm text-gray-600">যুবসমাজের জন্য কর্মসংস্থানের সুযোগ সৃষ্টি ও দক্ষতা উন্নয়ন।</p>
                            </div>
                            <div class="bg-yellow-50 rounded-lg p-4">
                                <h4 class="font-semibold text-yellow-700 mb-2">অবকাঠামো</h4>
                                <p class="text-sm text-gray-600">গ্রামীণ সড়ক, সেতু ও যোগাযোগ ব্যবস্থার আধুনিকায়ন।</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contact CTA -->
            <div class="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-center text-white">
                <h3 class="text-2xl font-bold mb-4">সরাসরি যোগাযোগ করুন</h3>
                <p class="text-primary-100 mb-6">আপনার যেকোনো সমস্যা বা পরামর্শ জানাতে দ্বিধা করবেন না।</p>
                <div class="flex flex-wrap justify-center gap-4">
                    <a href="<?= SITE_URL ?>/complaint" class="px-6 py-3 bg-white text-primary-700 rounded-lg font-medium hover:bg-primary-50 transition">
                        অভিযোগ দাখিল
                    </a>
                    <a href="<?= SITE_URL ?>/appointment" class="px-6 py-3 bg-primary-800 text-white rounded-lg font-medium hover:bg-primary-900 transition">
                        সাক্ষাৎকারের সময় নিন
                    </a>
                    <a href="<?= SITE_URL ?>/contact" class="px-6 py-3 border-2 border-white text-white rounded-lg font-medium hover:bg-white hover:text-primary-700 transition">
                        যোগাযোগ
                    </a>
                </div>
            </div>
        </div>
    </div>
</section>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
