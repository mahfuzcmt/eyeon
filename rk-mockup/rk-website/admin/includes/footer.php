            </main>
        </div>
    </div>

    <!-- Admin JavaScript -->
    <script src="<?= ADMIN_URL ?>/assets/js/admin.js"></script>

    <script>
        // Sidebar toggle for mobile
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebarClose = document.getElementById('sidebar-close');

        function openSidebar() {
            sidebar?.classList.remove('-translate-x-full');
            sidebarOverlay?.classList.remove('hidden');
        }

        function closeSidebar() {
            sidebar?.classList.add('-translate-x-full');
            sidebarOverlay?.classList.add('hidden');
        }

        sidebarToggle?.addEventListener('click', openSidebar);
        sidebarClose?.addEventListener('click', closeSidebar);
        sidebarOverlay?.addEventListener('click', closeSidebar);

        // User menu toggle
        function toggleUserMenu() {
            const menu = document.getElementById('user-menu');
            menu?.classList.toggle('hidden');
        }

        // Close user menu when clicking outside
        document.addEventListener('click', function(event) {
            const userMenu = document.getElementById('user-menu');
            const userMenuButton = event.target.closest('button[onclick="toggleUserMenu()"]');

            if (!userMenuButton && userMenu && !userMenu.contains(event.target)) {
                userMenu.classList.add('hidden');
            }
        });

        // Auto-hide flash messages
        setTimeout(function() {
            const flashMessages = document.querySelectorAll('.flash-message');
            flashMessages.forEach(function(msg) {
                msg.style.opacity = '0';
                setTimeout(() => msg.remove(), 300);
            });
        }, 5000);
    </script>
</body>
</html>
