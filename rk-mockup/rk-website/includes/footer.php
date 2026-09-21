    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-300 mt-16">
        <div class="container mx-auto px-4 py-12">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <!-- About -->
                <div class="col-span-1 md:col-span-2">
                    <div class="flex items-center space-x-3 mb-4">
                        <?php if ($logo = getSetting('logo_image')): ?>
                        <img src="<?= UPLOADS_URL ?>/<?= e($logo) ?>" alt="Logo" class="h-12 w-auto">
                        <?php else: ?>
                        <div class="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                            রা
                        </div>
                        <?php endif; ?>
                        <div>
                            <h3 class="text-xl font-bold text-white"><?= e(getSetting('site_title', SITE_NAME)) ?></h3>
                            <p class="text-sm text-gray-400"><?= e(getSetting('site_tagline', SITE_TAGLINE)) ?></p>
                        </div>
                    </div>
                    <p class="text-gray-400 mb-4">
                        <?= e(truncate(getSetting('about_text', ''), 200)) ?>
                    </p>
                    <div class="flex space-x-4">
                        <?php if ($fb = getSetting('facebook_url')): ?>
                        <a href="<?= e($fb) ?>" target="_blank" class="text-gray-400 hover:text-white transition">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </a>
                        <?php endif; ?>
                        <?php if ($yt = getSetting('youtube_url')): ?>
                        <a href="<?= e($yt) ?>" target="_blank" class="text-gray-400 hover:text-white transition">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                        </a>
                        <?php endif; ?>
                        <?php if ($tw = getSetting('twitter_url')): ?>
                        <a href="<?= e($tw) ?>" target="_blank" class="text-gray-400 hover:text-white transition">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </a>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Quick Links -->
                <div>
                    <h4 class="text-lg font-semibold text-white mb-4">দ্রুত লিংক</h4>
                    <ul class="space-y-2">
                        <li><a href="<?= SITE_URL ?>/about" class="hover:text-white transition">পরিচিতি</a></li>
                        <li><a href="<?= SITE_URL ?>/news" class="hover:text-white transition">সংবাদ</a></li>
                        <li><a href="<?= SITE_URL ?>/projects" class="hover:text-white transition">উন্নয়ন প্রকল্প</a></li>
                        <li><a href="<?= SITE_URL ?>/services" class="hover:text-white transition">সেবাসমূহ</a></li>
                        <li><a href="<?= SITE_URL ?>/media" class="hover:text-white transition">মিডিয়া</a></li>
                    </ul>
                </div>

                <!-- Contact -->
                <div>
                    <h4 class="text-lg font-semibold text-white mb-4">যোগাযোগ</h4>
                    <ul class="space-y-3">
                        <li class="flex items-start">
                            <svg class="w-5 h-5 mr-2 mt-1 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                            </svg>
                            <span class="text-sm"><?= nl2br(e(getSetting('office_address', ''))) ?></span>
                        </li>
                        <li class="flex items-center">
                            <svg class="w-5 h-5 mr-2 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                            </svg>
                            <a href="tel:<?= e(getSetting('contact_phone', '')) ?>" class="hover:text-white transition">
                                <?= e(getSetting('contact_phone', '')) ?>
                            </a>
                        </li>
                        <li class="flex items-center">
                            <svg class="w-5 h-5 mr-2 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                            </svg>
                            <a href="mailto:<?= e(getSetting('contact_email', '')) ?>" class="hover:text-white transition">
                                <?= e(getSetting('contact_email', '')) ?>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Bottom Bar -->
            <div class="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                <p class="text-sm text-gray-500">
                    &copy; <?= toBengaliDigits(date('Y')) ?> <?= e(getSetting('site_title', SITE_NAME)) ?>। সর্বস্বত্ব সংরক্ষিত।
                </p>
                <div class="flex space-x-4 mt-4 md:mt-0">
                    <a href="<?= SITE_URL ?>/complaint" class="text-sm text-gray-400 hover:text-white transition">অভিযোগ দাখিল</a>
                    <a href="<?= SITE_URL ?>/track" class="text-sm text-gray-400 hover:text-white transition">অভিযোগ ট্র্যাক</a>
                    <a href="<?= SITE_URL ?>/appointment" class="text-sm text-gray-400 hover:text-white transition">সাক্ষাৎকার</a>
                </div>
            </div>
        </div>
    </footer>

    <!-- Custom JavaScript -->
    <script src="<?= SITE_URL ?>/assets/js/app.js"></script>

    <script>
        // Mobile menu toggle
        document.getElementById('mobile-menu-btn')?.addEventListener('click', function() {
            document.getElementById('mobile-menu')?.classList.toggle('hidden');
        });
    </script>
</body>
</html>
