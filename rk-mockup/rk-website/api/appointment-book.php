<?php
/**
 * Appointment Booking API
 */

require_once dirname(__DIR__) . '/includes/functions.php';

// Start session for CSRF validation
if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Invalid request method'], 405);
}

if (!validateCsrfToken($_POST[CSRF_TOKEN_NAME] ?? '')) {
    jsonResponse(['success' => false, 'message' => 'অবৈধ অনুরোধ। পৃষ্ঠা রিফ্রেশ করুন।'], 403);
}

// Collect form data
$visitorName = trim($_POST['visitor_name'] ?? '');
$visitorPhone = trim($_POST['visitor_phone'] ?? '');
$visitorEmail = trim($_POST['visitor_email'] ?? '');
$visitorOrganization = trim($_POST['visitor_organization'] ?? '');
$appointmentType = trim($_POST['appointment_type'] ?? 'সাধারণ');
$scheduledDate = trim($_POST['scheduled_date'] ?? '');
$scheduledTime = trim($_POST['scheduled_time'] ?? '');
$purpose = trim($_POST['purpose'] ?? '');

// Validation
$errors = [];

if (empty($visitorName)) {
    $errors[] = 'নাম প্রয়োজন।';
}

if (empty($visitorPhone)) {
    $errors[] = 'মোবাইল নম্বর প্রয়োজন।';
} elseif (!preg_match('/^01[3-9]\d{8}$/', $visitorPhone)) {
    $errors[] = 'সঠিক মোবাইল নম্বর দিন।';
}

if (!empty($visitorEmail) && !isValidEmail($visitorEmail)) {
    $errors[] = 'সঠিক ইমেইল ঠিকানা দিন।';
}

if (empty($scheduledDate)) {
    $errors[] = 'তারিখ নির্বাচন করুন।';
} else {
    // Validate date is within allowed range
    $minDate = strtotime('+1 day');
    $maxDate = strtotime('+30 days');
    $selectedDate = strtotime($scheduledDate);

    if ($selectedDate < $minDate || $selectedDate > $maxDate) {
        $errors[] = 'আগামী ৩০ দিনের মধ্যে তারিখ নির্বাচন করুন।';
    }

    // Check if Friday
    if (date('w', $selectedDate) == 5) {
        $errors[] = 'শুক্রবার সাক্ষাৎকার হয় না।';
    }
}

if (empty($scheduledTime)) {
    $errors[] = 'সময় নির্বাচন করুন।';
}

if (empty($purpose)) {
    $errors[] = 'সাক্ষাৎকারের উদ্দেশ্য লিখুন।';
}

if (!empty($errors)) {
    jsonResponse(['success' => false, 'message' => implode(' ', $errors)], 400);
}

// Check if time slot is still available
$existingAppointment = Database::fetchOne(
    "SELECT id FROM appointments WHERE scheduled_date = :date AND scheduled_time = :time AND status NOT IN ('বাতিল')",
    ['date' => $scheduledDate, 'time' => $scheduledTime]
);

if ($existingAppointment) {
    jsonResponse(['success' => false, 'message' => 'এই সময় ইতিমধ্যে বুক করা হয়েছে। অন্য সময় নির্বাচন করুন।'], 400);
}

// Determine duration based on appointment type
$durationMinutes = 15;
if ($appointmentType === 'এলাকাবাসী') {
    $durationMinutes = 30;
} elseif ($appointmentType === 'মিডিয়া') {
    $durationMinutes = 20;
}

try {
    // Generate appointment number
    $appointmentNumber = generateAppointmentNumber();

    // Create appointment
    Database::insert('appointments', [
        'appointment_number' => $appointmentNumber,
        'visitor_name' => $visitorName,
        'visitor_phone' => $visitorPhone,
        'visitor_email' => $visitorEmail ?: null,
        'visitor_organization' => $visitorOrganization ?: null,
        'appointment_type' => $appointmentType,
        'scheduled_date' => $scheduledDate,
        'scheduled_time' => $scheduledTime,
        'duration_minutes' => $durationMinutes,
        'purpose' => $purpose,
        'status' => 'বুকড'
    ]);

    // Format date and time for display
    $dateDisplay = formatBengaliDate($scheduledDate, 'd F, Y');
    $timeDisplay = formatTime($scheduledTime);

    jsonResponse([
        'success' => true,
        'message' => 'আপনার সাক্ষাৎকার সফলভাবে বুক হয়েছে।',
        'appointment_number' => $appointmentNumber,
        'date_display' => $dateDisplay,
        'time_display' => $timeDisplay
    ]);

} catch (Exception $e) {
    if (DEBUG_MODE) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    } else {
        jsonResponse(['success' => false, 'message' => 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।'], 500);
    }
}

/**
 * Format time for display
 */
function formatTime($time) {
    $hour = (int)substr($time, 0, 2);
    $minute = substr($time, 3, 2);

    $period = $hour >= 12 ? 'PM' : 'AM';
    $displayHour = $hour > 12 ? $hour - 12 : ($hour == 0 ? 12 : $hour);

    // Convert to Bengali
    $bengaliPeriod = $period === 'AM' ? 'সকাল' : ($hour >= 17 ? 'বিকাল' : 'দুপুর');

    return toBengaliDigits($displayHour) . ':' . toBengaliDigits($minute) . ' ' . $bengaliPeriod;
}
