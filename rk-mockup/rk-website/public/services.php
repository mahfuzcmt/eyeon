<?php
$pageTitle = 'সেবাসমূহ';
require_once dirname(__DIR__) . '/includes/header.php';
?>

<section class="py-12">
    <div class="container mx-auto px-4">
        <!-- Header -->
        <div class="text-center mb-12">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">জনসেবা</h1>
            <p class="text-gray-600 max-w-2xl mx-auto">
                আমাদের লক্ষ্য হলো এলাকাবাসীর সেবায় নিয়োজিত থাকা। নিচের সেবাগুলো গ্রহণ করতে পারবেন।
            </p>
        </div>

        <!-- Main Services -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            <!-- Complaint Service -->
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center hover:shadow-xl transition">
                <div class="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-3">অভিযোগ দাখিল</h3>
                <p class="text-gray-600 mb-6">যেকোনো সমস্যা বা অভিযোগ সরাসরি জানান। আমরা দ্রুত ব্যবস্থা নেব।</p>
                <ul class="text-left text-sm text-gray-600 space-y-2 mb-6">
                    <li class="flex items-center">
                        <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        অনলাইনে অভিযোগ দাখিল
                    </li>
                    <li class="flex items-center">
                        <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        টিকেট নম্বরে ট্র্যাকিং
                    </li>
                    <li class="flex items-center">
                        <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        বেনামে অভিযোগের সুবিধা
                    </li>
                </ul>
                <a href="<?= SITE_URL ?>/complaint" class="inline-block w-full px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition">
                    অভিযোগ দাখিল করুন
                </a>
            </div>

            <!-- Track Complaint -->
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center hover:shadow-xl transition">
                <div class="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-3">অভিযোগ ট্র্যাক</h3>
                <p class="text-gray-600 mb-6">টিকেট নম্বর দিয়ে আপনার অভিযোগের বর্তমান অবস্থা জানুন।</p>
                <ul class="text-left text-sm text-gray-600 space-y-2 mb-6">
                    <li class="flex items-center">
                        <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        রিয়েল-টাইম স্ট্যাটাস
                    </li>
                    <li class="flex items-center">
                        <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        কার্যক্রম টাইমলাইন
                    </li>
                    <li class="flex items-center">
                        <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        সমাধান নোট
                    </li>
                </ul>
                <a href="<?= SITE_URL ?>/track" class="inline-block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                    ট্র্যাক করুন
                </a>
            </div>

            <!-- Appointment -->
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center hover:shadow-xl transition">
                <div class="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-3">সাক্ষাৎকার</h3>
                <p class="text-gray-600 mb-6">সরাসরি কথা বলার জন্য আগাম সময় নির্ধারণ করুন।</p>
                <ul class="text-left text-sm text-gray-600 space-y-2 mb-6">
                    <li class="flex items-center">
                        <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        অনলাইনে সময় বুকিং
                    </li>
                    <li class="flex items-center">
                        <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        নিশ্চিতকরণ SMS
                    </li>
                    <li class="flex items-center">
                        <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        সময় সুবিধানুযায়ী
                    </li>
                </ul>
                <a href="<?= SITE_URL ?>/appointment" class="inline-block w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                    সময় নির্ধারণ করুন
                </a>
            </div>
        </div>

        <!-- Other Services -->
        <div class="max-w-5xl mx-auto">
            <h2 class="text-2xl font-bold text-center text-gray-800 mb-8">অন্যান্য সহায়তা</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gray-50 rounded-xl p-6 flex items-start gap-4">
                    <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-800 mb-2">শিক্ষা সহায়তা</h3>
                        <p class="text-sm text-gray-600">মেধাবী শিক্ষার্থীদের জন্য বৃত্তি ও শিক্ষা উপকরণ সহায়তা।</p>
                    </div>
                </div>

                <div class="bg-gray-50 rounded-xl p-6 flex items-start gap-4">
                    <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-800 mb-2">অবকাঠামো উন্নয়ন</h3>
                        <p class="text-sm text-gray-600">সড়ক, সেতু, বিদ্যুৎ ও পানি সরবরাহ সংক্রান্ত সমস্যা সমাধান।</p>
                    </div>
                </div>

                <div class="bg-gray-50 rounded-xl p-6 flex items-start gap-4">
                    <div class="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg class="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-800 mb-2">স্বাস্থ্য সেবা</h3>
                        <p class="text-sm text-gray-600">বিনামূল্যে স্বাস্থ্য ক্যাম্প ও চিকিৎসা সহায়তা কর্মসূচি।</p>
                    </div>
                </div>

                <div class="bg-gray-50 rounded-xl p-6 flex items-start gap-4">
                    <div class="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-800 mb-2">কর্মসংস্থান</h3>
                        <p class="text-sm text-gray-600">যুবকদের জন্য চাকরি ও প্রশিক্ষণের সুযোগ সৃষ্টি।</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
