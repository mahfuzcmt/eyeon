<?php
require_once dirname(__DIR__) . '/includes/auth.php';

logout();
redirect(ADMIN_URL . '/login', 'success', 'সফলভাবে লগআউট হয়েছে।');
