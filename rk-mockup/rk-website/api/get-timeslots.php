<?php
/**
 * Get Available Time Slots API
 */

require_once dirname(__DIR__) . '/includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

$date = $_GET['date'] ?? '';

if (empty($date)) {
    jsonResponse(['success' => false, 'message' => 'তারিখ প্রয়োজন'], 400);
}

// Validate date format
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    jsonResponse(['success' => false, 'message' => 'অবৈধ তারিখ ফরম্যাট'], 400);
}

$dateTimestamp = strtotime($date);

// Check if date is valid
if ($dateTimestamp === false) {
    jsonResponse(['success' => false, 'message' => 'অবৈধ তারিখ'], 400);
}

// Check if Friday (no appointments on Fridays)
if (date('w', $dateTimestamp) == 5) {
    jsonResponse([
        'success' => true,
        'slots' => [],
        'available_count' => 0,
        'message' => 'শুক্রবার সাক্ষাৎকার হয় না'
    ]);
}

// Define time slots (10:00 AM to 5:00 PM, 30-minute intervals)
$startHour = 10;
$endHour = 17;
$intervalMinutes = 30;

$slots = [];

for ($hour = $startHour; $hour < $endHour; $hour++) {
    for ($minute = 0; $minute < 60; $minute += $intervalMinutes) {
        // Skip lunch break (1:00 PM - 2:00 PM)
        if ($hour == 13) {
            continue;
        }

        $timeString = sprintf('%02d:%02d:00', $hour, $minute);
        $displayTime = formatTimeSlot($hour, $minute);

        $slots[] = [
            'time' => $timeString,
            'display' => $displayTime,
            'available' => true
        ];
    }
}

// Get booked slots for this date
$bookedSlots = Database::fetchAll(
    "SELECT scheduled_time FROM appointments WHERE scheduled_date = :date AND status NOT IN ('বাতিল')",
    ['date' => $date]
);

$bookedTimes = array_column($bookedSlots, 'scheduled_time');

// Mark booked slots
$availableCount = 0;
foreach ($slots as &$slot) {
    if (in_array($slot['time'], $bookedTimes)) {
        $slot['available'] = false;
    } else {
        $availableCount++;
    }
}

jsonResponse([
    'success' => true,
    'date' => $date,
    'slots' => $slots,
    'available_count' => $availableCount
]);

/**
 * Format time slot for display
 */
function formatTimeSlot($hour, $minute) {
    $period = $hour >= 12 ? 'PM' : 'AM';
    $displayHour = $hour > 12 ? $hour - 12 : ($hour == 0 ? 12 : $hour);

    // Bengali period names
    if ($hour < 12) {
        $bengaliPeriod = 'সকাল';
    } elseif ($hour < 17) {
        $bengaliPeriod = 'দুপুর';
    } else {
        $bengaliPeriod = 'বিকাল';
    }

    $minuteStr = $minute == 0 ? '০০' : toBengaliDigits($minute);

    return toBengaliDigits($displayHour) . ':' . $minuteStr . ' ' . $bengaliPeriod;
}
