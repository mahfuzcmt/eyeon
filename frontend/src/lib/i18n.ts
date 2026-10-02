"use client";

import { createContext, createElement, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "bn";

const STRINGS = {
  // ── Auth ──────────────────────────────────────────────────────────
  "auth.signIn": { en: "Sign in", bn: "সাইন ইন" },
  "auth.tagline": { en: "Keep an eye on them, wherever they are.", bn: "চোখে চোখে রাখুন, ও যেখানেই থাকুক।" },
  "auth.subtitle": { en: "Live location, safe-zone alerts and SOS for your family", bn: "লাইভ লোকেশন, সেফ জোন অ্যালার্ট ও SOS — আপনার পরিবারের জন্য" },
  "auth.email": { en: "Email", bn: "ইমেইল" },
  "auth.password": { en: "Password", bn: "পাসওয়ার্ড" },
  "auth.rememberMe": { en: "Remember me", bn: "আমাকে মনে রাখুন" },
  "auth.forgotPassword": { en: "Forgot password?", bn: "পাসওয়ার্ড ভুলে গেছেন?" },
  "auth.signOut": { en: "Sign out", bn: "সাইন আউট" },
  "auth.loginFailed": { en: "Invalid email or password", bn: "ভুল ইমেইল বা পাসওয়ার্ড" },
  "auth.reset.title": { en: "Reset password", bn: "পাসওয়ার্ড রিসেট" },
  "auth.reset.introEmail": { en: "Enter your account email. We will text a 6-digit code to the phone number on your account.", bn: "আপনার অ্যাকাউন্টের ইমেইল দিন। অ্যাকাউন্টে থাকা ফোন নম্বরে ৬ সংখ্যার কোড পাঠানো হবে।" },
  "auth.reset.introCode": { en: "Enter the code from the SMS and choose a new password.", bn: "এসএমএস থেকে পাওয়া কোড দিন এবং নতুন পাসওয়ার্ড বেছে নিন।" },
  "auth.reset.sentNotice": { en: "If this email is registered and has a phone number, a code has been sent by SMS. It expires in 15 minutes. No phone on file? Ask your school or family admin to reset your password.", bn: "এই ইমেইল নিবন্ধিত থাকলে এবং ফোন নম্বর থাকলে এসএমএসে একটি কোড পাঠানো হয়েছে। এটি ১৫ মিনিটে মেয়াদোত্তীর্ণ হবে। ফোন নম্বর না থাকলে আপনার স্কুল বা পরিবারের অ্যাডমিনকে পাসওয়ার্ড রিসেট করতে বলুন।" },
  "auth.reset.sendCode": { en: "Send code", bn: "কোড পাঠান" },
  "auth.reset.code": { en: "6-digit code", bn: "৬ সংখ্যার কোড" },
  "auth.reset.newPassword": { en: "New password", bn: "নতুন পাসওয়ার্ড" },
  "auth.reset.confirmPassword": { en: "Confirm new password", bn: "নতুন পাসওয়ার্ড নিশ্চিত করুন" },
  "auth.reset.submit": { en: "Set new password", bn: "নতুন পাসওয়ার্ড সেট করুন" },
  "auth.reset.resend": { en: "Didn't get a code? Start over", bn: "কোড পাননি? আবার শুরু করুন" },
  "auth.reset.mismatch": { en: "The two passwords do not match", bn: "দুটি পাসওয়ার্ড মিলছে না" },
  "auth.reset.failed": { en: "Something went wrong. Please try again.", bn: "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।" },
  "auth.reset.done": { en: "Password updated. Taking you to sign in…", bn: "পাসওয়ার্ড আপডেট হয়েছে। সাইন ইন পেজে নিয়ে যাওয়া হচ্ছে…" },
  "auth.reset.backToLogin": { en: "Back to sign in", bn: "সাইন ইনে ফিরে যান" },
  "account.role": { en: "Role", bn: "ভূমিকা" },
  "account.changePassword": { en: "Change password", bn: "পাসওয়ার্ড পরিবর্তন" },
  "account.changePasswordHelp": { en: "At least 8 characters. Other devices signed in to your account will be signed out.", bn: "কমপক্ষে ৮ অক্ষর। আপনার অ্যাকাউন্টে সাইন ইন করা অন্য ডিভাইসগুলো সাইন আউট হয়ে যাবে।" },
  "account.currentPassword": { en: "Current password", bn: "বর্তমান পাসওয়ার্ড" },
  "account.updatePassword": { en: "Update password", bn: "পাসওয়ার্ড আপডেট করুন" },
  "account.passwordUpdated": { en: "Password updated", bn: "পাসওয়ার্ড আপডেট হয়েছে" },
  "settings.tab.account": { en: "Account", bn: "অ্যাকাউন্ট" },

  // ── Nav ───────────────────────────────────────────────────────────
  "nav.dashboard": { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  "nav.home": { en: "Home", bn: "হোম" },
  "nav.map": { en: "Map", bn: "মানচিত্র" },
  "nav.monitor": { en: "Monitor", bn: "মনিটর" },
  "nav.statistics": { en: "Statistics", bn: "পরিসংখ্যান" },
  "nav.manage": { en: "Manage", bn: "ম্যানেজ" },
  "nav.customer": { en: "Schools & families", bn: "স্কুল / পরিবার" },
  "nav.devices": { en: "Devices", bn: "ডিভাইস" },
  "nav.vehicles": { en: "People", bn: "সদস্য" },
  "nav.drivers": { en: "Drivers", bn: "ড্রাইভার" },
  "nav.geofences": { en: "Places & geofences", bn: "জায়গা ও জিও-ফেন্স" },
  "nav.trips": { en: "Trips", bn: "ট্রিপ" },
  "nav.alarms": { en: "Alarms", bn: "অ্যালার্ম" },
  "nav.reports": { en: "Reports", bn: "রিপোর্ট" },
  "nav.stays": { en: "Stays", bn: "কোথায় কতক্ষণ" },
  "nav.settings": { en: "Settings", bn: "সেটিংস" },
  "nav.auditLog": { en: "Audit log", bn: "অডিট লগ" },
  "nav.scheduled": { en: "Scheduled", bn: "নির্ধারিত" },
  "nav.rules": { en: "Rules", bn: "নিয়ম" },
  "nav.admin": { en: "Admin", bn: "অ্যাডমিন" },

  // ── Map / fleet ───────────────────────────────────────────────────
  "fleet.title": { en: "Live map", bn: "লাইভ ম্যাপ" },
  "fleet.online": { en: "Online", bn: "অনলাইন" },
  "fleet.offline": { en: "Offline", bn: "অফলাইন" },
  "fleet.neverConnected": { en: "Never connected", bn: "কখনও সংযুক্ত হয়নি" },
  "fleet.search": { en: "Search by name…", bn: "নাম দিয়ে খুঁজুন…" },
  "fleet.lastSeen": { en: "Last seen", bn: "সর্বশেষ দেখা" },
  "fleet.speed": { en: "Speed", bn: "গতি" },
  "fleet.course": { en: "Course", bn: "দিক" },
  "fleet.voltage": { en: "Voltage", bn: "ভোল্টেজ" },
  "fleet.acc": { en: "Ignition", bn: "ইগনিশন" },
  "fleet.accOn": { en: "On", bn: "চালু" },
  "fleet.accOff": { en: "Off", bn: "বন্ধ" },
  "fleet.noDevices": { en: "No one added yet", bn: "এখনও কাউকে যোগ করা হয়নি" },
  "fleet.kmh": { en: "km/h", bn: "কিমি/ঘ" },
  "fleet.viewHistory": { en: "View Route History", bn: "রুট ইতিহাস দেখুন" },
  "fleet.routeHistory": { en: "Route History", bn: "রুট ইতিহাস" },
  "fleet.period": { en: "Period", bn: "সময়কাল" },
  "fleet.pointDetails": { en: "Point Details", bn: "পয়েন্ট বিস্তারিত" },
  "fleet.gsm": { en: "GSM", bn: "জিএসএম" },
  "fleet.engineHours": { en: "Engine hours", bn: "ইঞ্জিন ঘণ্টা" },
  "fleet.sim": { en: "SIM", bn: "সিম" },
  "fleet.cellFallback": { en: "Cell-tower fix", bn: "সেল-টাওয়ার ফিক্স" },
  "fleet.noFix": { en: "No GPS fix", bn: "জিপিএস নেই" },

  // ── Map bottom panel ──────────────────────────────────────────────
  "panel.data": { en: "Data", bn: "ডেটা" },
  "panel.graph": { en: "Graph", bn: "গ্রাফ" },
  "panel.objectControl": { en: "Object control", bn: "অবজেক্ট নিয়ন্ত্রণ" },
  "panel.template": { en: "Template", bn: "টেমপ্লেট" },
  "panel.command": { en: "Command", bn: "কমান্ড" },
  "panel.custom": { en: "Custom", bn: "কাস্টম" },
  "panel.cutEngine": { en: "Cut engine", bn: "ইঞ্জিন বন্ধ করুন" },
  "panel.restoreEngine": { en: "Restore engine", bn: "ইঞ্জিন চালু করুন" },
  "panel.queryAddress": { en: "Query address", bn: "ঠিকানা জিজ্ঞাসা" },
  "panel.rebootDevice": { en: "Restart device", bn: "ডিভাইস রিস্টার্ট" },
  "panel.confirmCut": { en: "Cut the engine now?", bn: "এখনই ইঞ্জিন বন্ধ করবেন?" },
  "panel.confirmReboot": { en: "Restart the device now?", bn: "এখনই ডিভাইস রিস্টার্ট করবেন?" },
  "panel.commandSent": { en: "Command sent", bn: "কমান্ড পাঠানো হয়েছে" },
  "panel.commandFailed": { en: "Command failed", bn: "কমান্ড ব্যর্থ হয়েছে" },
  "panel.dailyStats": { en: "Daily statistics", bn: "দৈনিক পরিসংখ্যান" },
  "panel.liveTracking": { en: "Live Tracking", bn: "লাইভ ট্র্যাকিং" },
  "panel.todaySummary": { en: "Today's Summary", bn: "আজকের সারাংশ" },
  "panel.totalHours": { en: "Total Hours", bn: "মোট সময়" },
  "panel.totalKm": { en: "Total Distance", bn: "মোট দূরত্ব" },
  "panel.overspeedKm": { en: "Moving fast", bn: "দ্রুত চলছে" },
  "panel.maxSpeedToday": { en: "Max Speed", bn: "সর্বোচ্চ গতি" },
  "panel.liveSpeed": { en: "Live Speed", bn: "লাইভ গতি" },
  "graph.noData": { en: "No data for today yet", bn: "আজকের জন্য এখনও ডেটা নেই" },

  // ── Vehicle detail tabs (AutoNemo-aligned) ────────────────────────
  "det.track": { en: "Track", bn: "ট্র্যাক" },
  "det.calendar": { en: "Calendar", bn: "ক্যালেন্ডার" },
  "det.history": { en: "History", bn: "ইতিহাস" },
  "det.stats": { en: "Statistics", bn: "পরিসংখ্যান" },

  // ── Home summary (AutoNemo-aligned) ───────────────────────────────
  "home.fleetStatus": { en: "Everyone's status", bn: "সবার অবস্থা" },
  "home.vehicleStats": { en: "Stats for one person", bn: "একজনের পরিসংখ্যান" },
  "home.today": { en: "Today · Asia/Dhaka", bn: "আজ · এশিয়া/ঢাকা" },
  "home.selectVehicle": { en: "Choose a person", bn: "একজনকে বেছে নিন" },
  "home.routeLength": { en: "Route length", bn: "রুট দৈর্ঘ্য" },
  "home.moveDuration": { en: "Time moving", bn: "চলার সময়" },
  "home.idleDuration": { en: "Time still", bn: "স্থির থাকার সময়" },
  "home.stopDuration": { en: "Time in one place", bn: "এক জায়গায় থাকার সময়" },
  "home.topSpeed": { en: "Top speed", bn: "সর্বোচ্চ গতি" },
  "home.trips": { en: "Trips", bn: "ট্রিপ" },
  "home.total": { en: "Total", bn: "মোট" },
  "home.noVehicles": { en: "No one added yet.", bn: "এখনও কাউকে যোগ করা হয়নি।" },
  "home.fuelNote": { en: "Fuel cost needs per-vehicle fuel settings (not configured).", bn: "জ্বালানি খরচের জন্য প্রতি-যানবাহন সেটিংস প্রয়োজন (কনফিগার করা নেই)।" },

  // ── Vehicles screen (AutoNemo-aligned) ────────────────────────────
  "veh.title": { en: "People", bn: "সদস্য" },
  "veh.all": { en: "All", bn: "সব" },
  "veh.moving": { en: "Moving", bn: "চলছে" },
  "veh.idle": { en: "Still", bn: "এক জায়গায়" },
  "veh.stopped": { en: "Staying in one place", bn: "এক জায়গায় আছে" },
  "veh.expired": { en: "Expired", bn: "মেয়াদোত্তীর্ণ" },
  "veh.offline": { en: "Offline", bn: "অফলাইন" },
  "veh.resting": { en: "Resting until", bn: "বিশ্রামে, জাগবে" },
  "veh.nodata": { en: "No Data", bn: "ডেটা নেই" },
  "veh.noGps": { en: "Waiting for GPS", bn: "জিপিএসের অপেক্ষায়" },
  "veh.noGpsHint": {
    en: "The tracker is connected but has not found its position yet. Take it outdoors for a few minutes.",
    bn: "ট্র্যাকার সংযুক্ত আছে, কিন্তু এখনো অবস্থান পায়নি। কয়েক মিনিটের জন্য খোলা জায়গায় নিন।",
  },
  "veh.since": { en: "since", bn: "থেকে" },
  "veh.expiresOn": { en: "Expires", bn: "মেয়াদ" },
  "veh.updated": { en: "Updated", bn: "আপডেট" },
  "veh.locked": { en: "Engine locked", bn: "ইঞ্জিন লক" },
  "veh.count": { en: "people", bn: "জন সদস্য" },
  "veh.none": { en: "No one matches your filter.", bn: "কাউকে পাওয়া যায়নি।" },

  // ── Live list (dashboard vehicle panel) ───────────────────────────
  "list.all": { en: "All", bn: "সব" },
  "list.online": { en: "Online", bn: "অনলাইন" },
  "list.offline": { en: "Offline", bn: "অফলাইন" },
  "list.inactive": { en: "Inactive", bn: "নিষ্ক্রিয়" },
  "list.moving": { en: "Moving", bn: "চলছে" },
  "list.expired": { en: "Expired", bn: "মেয়াদোত্তীর্ণ" },
  "list.searchPlaceholder": { en: "Name / class / IMEI / SIM", bn: "নাম / শ্রেণি / আইএমইআই / সিম" },
  "list.sortSpeed": { en: "Speed", bn: "গতি" },
  "list.sortName": { en: "Name", bn: "নাম" },
  "list.sortUpdated": { en: "Last update", bn: "সর্বশেষ আপডেট" },
  "list.sortStatus": { en: "Status", bn: "অবস্থা" },
  "list.showAll": { en: "Show all on map", bn: "সব মানচিত্রে দেখান" },
  "list.ungrouped": { en: "Ungrouped", bn: "গ্রুপবিহীন" },
  "veh.group": { en: "Group", bn: "গ্রুপ" },
  "group.new": { en: "New group", bn: "নতুন গ্রুপ" },
  "group.edit": { en: "Edit group", bn: "গ্রুপ সম্পাদনা" },
  "group.delete": { en: "Delete group", bn: "গ্রুপ মুছুন" },
  "group.deleteConfirm": { en: "Delete group \"{name}\"? Its people will move to Ungrouped.", bn: "\"{name}\" গ্রুপটি মুছবেন? এর সদস্যরা গ্রুপবিহীন-এ চলে যাবে।" },
  "group.create": { en: "Create", bn: "তৈরি করুন" },
  "group.moveTo": { en: "Move to group", bn: "গ্রুপে সরান" },
  "group.moveFailed": { en: "Could not move this person", bn: "সদস্যকে সরানো যায়নি" },
  "group.name": { en: "Group name", bn: "গ্রুপের নাম" },
  "group.namePlaceholder": { en: "e.g. Class 5, Section A", bn: "যেমন: পঞ্চম শ্রেণি, ক শাখা" },
  "group.nameRequired": { en: "Group name is required", bn: "গ্রুপের নাম আবশ্যক" },
  "group.description": { en: "Description", bn: "বিবরণ" },
  "group.color": { en: "Colour", bn: "রং" },
  "group.icon": { en: "Icon", bn: "আইকন" },
  "list.showOnMap": { en: "Show on map", bn: "মানচিত্রে দেখান" },
  "list.collapse": { en: "Hide people list", bn: "সদস্য তালিকা লুকান" },
  "list.expand": { en: "Show people list", bn: "সদস্য তালিকা দেখান" },

  // ── Vehicle actions (popup card + row menu) ───────────────────────
  "act.playback": { en: "Playback", bn: "প্লেব্যাক" },
  "act.live": { en: "Live", bn: "লাইভ" },
  "act.navigate": { en: "Directions", bn: "পথ দেখুন" },
  "act.geofence": { en: "Geofence", bn: "জিও-ফেন্স" },
  "act.streetView": { en: "Street view", bn: "স্ট্রিট ভিউ" },
  "act.command": { en: "Command", bn: "কমান্ড" },
  "act.settings": { en: "Tracker settings", bn: "ট্র্যাকার সেটিংস" },
  "act.share": { en: "Share", bn: "শেয়ার" },
  "act.details": { en: "Details", bn: "বিস্তারিত" },
  "act.edit": { en: "Edit", bn: "সম্পাদনা" },

  // ── Popup card ────────────────────────────────────────────────────
  "popup.driver": { en: "Driver", bn: "ড্রাইভার" },
  "popup.acc": { en: "Ignition", bn: "ইগনিশন" },
  "popup.gpsTime": { en: "GPS time", bn: "জিপিএস সময়" },
  "popup.hereFor": { en: "Here for", bn: "এখানে আছে" },
  "popup.hereForMore": { en: "Here for more than", bn: "এখানে আছে, অন্তত" },
  "popup.since": { en: "since", bn: "শুরু" },
  "popup.fix": { en: "Positioning", bn: "অবস্থান নির্ণয়" },
  "popup.power": { en: "Power", bn: "পাওয়ার" },
  "popup.battery": { en: "Battery", bn: "ব্যাটারি" },
  "popup.mileage": { en: "Distance", bn: "দূরত্ব" },
  "popup.satellites": { en: "Satellites", bn: "স্যাটেলাইট" },
  "popup.lastSeen": { en: "Last seen", bn: "সর্বশেষ দেখা" },
  "popup.coords": { en: "Coordinates", bn: "স্থানাঙ্ক" },
  "popup.loadingAddress": { en: "Looking up address…", bn: "ঠিকানা খোঁজা হচ্ছে…" },
  "popup.overspeed": { en: "Moving fast", bn: "দ্রুত চলছে" },

  // ── Command sheet ─────────────────────────────────────────────────
  "cmd.title": { en: "Send command", bn: "কমান্ড পাঠান" },
  "cmd.quick": { en: "Quick actions", bn: "দ্রুত কাজ" },
  "cmd.customHint": { en: "Tracker command, e.g. STATUS#", bn: "ট্র্যাকার কমান্ড, যেমন STATUS#" },
  "cmd.send": { en: "Send", bn: "পাঠান" },
  "cmd.reply": { en: "Device reply", bn: "ডিভাইসের উত্তর" },
  "cmd.sending": { en: "Sending…", bn: "পাঠানো হচ্ছে…" },
  "cmd.locate": { en: "Locate now", bn: "এখনই অবস্থান জানুন" },
  "cmd.live": { en: "Follow live for 5 minutes", bn: "৫ মিনিট লাইভ দেখুন" },
  "cmd.find": { en: "Ring the tracker", bn: "ট্র্যাকারে রিং দিন" },
  "cmd.confirmFind": {
    en: "The tracker will ring loudly and flash for 20 seconds. Continue?",
    bn: "ট্র্যাকারটি ২০ সেকেন্ড জোরে বাজবে ও আলো জ্বলবে। চালিয়ে যাবেন?",
  },
  "cmd.locateStarted": {
    en: "Asked the tracker for its position. A fresh location should appear within about 30 seconds.",
    bn: "ট্র্যাকারের কাছে অবস্থান চাওয়া হয়েছে। প্রায় ৩০ সেকেন্ডের মধ্যে নতুন অবস্থান দেখা যাবে।",
  },
  "cmd.liveStarted": {
    en: "Live tracking is on: updates every 10 seconds for 5 minutes, then it returns to battery saving.",
    bn: "লাইভ ট্র্যাকিং চালু: ৫ মিনিট ধরে প্রতি ১০ সেকেন্ডে আপডেট, তারপর আবার ব্যাটারি সাশ্রয় মোড।",
  },
  "cmd.findStarted": { en: "The tracker is ringing now.", bn: "ট্র্যাকারটি এখন বাজছে।" },
  "photo.title": { en: "Photo", bn: "ছবি" },
  "photo.upload": { en: "Upload photo", bn: "ছবি আপলোড করুন" },
  "photo.change": { en: "Change photo", bn: "ছবি বদলান" },
  "photo.remove": { en: "Remove", bn: "মুছুন" },
  "photo.hint": {
    en: "Shown on the map instead of the drawn face. Only people who can see this person can see it.",
    bn: "ম্যাপে আঁকা মুখের বদলে এই ছবি দেখাবে। যারা এই সদস্যকে দেখতে পারেন শুধু তারাই ছবিটি দেখবেন।",
  },
  "photo.failed": { en: "Could not use that picture. Try a JPEG or PNG photo.", bn: "ছবিটি ব্যবহার করা যায়নি। JPEG বা PNG ছবি দিয়ে চেষ্টা করুন।" },

  "veh.edit": { en: "Edit person", bn: "সদস্যের তথ্য সম্পাদনা" },
  "veh.name": { en: "Name", bn: "নাম" },
  "veh.plate": { en: "Class / ID (optional)", bn: "শ্রেণি / আইডি (ঐচ্ছিক)" },
  "veh.icon": { en: "Map icon", bn: "মানচিত্র আইকন" },
  "veh.iconColor": { en: "Icon color", bn: "আইকনের রং" },
  "veh.type.CAR": { en: "Car", bn: "গাড়ি" },
  "veh.type.MOTORBIKE": { en: "Motorbike", bn: "মোটরবাইক" },
  "veh.type.TRUCK": { en: "Truck", bn: "ট্রাক" },
  "veh.type.BUS": { en: "Bus", bn: "বাস" },
  "veh.type.CNG": { en: "CNG", bn: "সিএনজি" },

  // ── Dashboard KPI strip ───────────────────────────────────────────
  "kpi.online": { en: "Online", bn: "অনলাইন" },
  "kpi.offline": { en: "Offline", bn: "অফলাইন" },
  "kpi.alertsToday": { en: "Alerts today", bn: "আজকের অ্যালার্ট" },
  "kpi.critical": { en: "critical", bn: "জরুরি" },
  "kpi.tripsActive": { en: "Active trips", bn: "চলমান ট্রিপ" },
  "kpi.done": { en: "done today", bn: "আজ শেষ" },
  "kpi.distanceToday": { en: "Distance today", bn: "আজকের দূরত্ব" },
  "kpi.km": { en: "km", bn: "কিমি" },
  "kpi.unacknowledged": { en: "Not yet seen", bn: "এখনও দেখা হয়নি" },

  // ── Common ────────────────────────────────────────────────────────
  "common.loading": { en: "Loading…", bn: "লোড হচ্ছে…" },
  "common.searchPlaceholder": { en: "Name / class / IMEI / SIM", bn: "নাম / শ্রেণি / আইএমইআই / সিম" },
  "common.close": { en: "Close", bn: "বন্ধ করুন" },
  "common.retry": { en: "Retry", bn: "আবার চেষ্টা" },
  "common.save": { en: "Save", bn: "সংরক্ষণ" },
  "common.reload": { en: "Reload", bn: "রিলোড" },
  "common.cancel": { en: "Cancel", bn: "বাতিল" },
  "common.delete": { en: "Delete", bn: "মুছুন" },
  "common.edit": { en: "Edit", bn: "সম্পাদনা" },
  "common.create": { en: "Create", bn: "তৈরি করুন" },
  "common.empty": { en: "Nothing here yet", bn: "এখনো কিছু নেই" },
  "common.from": { en: "From", bn: "থেকে" },
  "common.to": { en: "To", bn: "পর্যন্ত" },
  "common.download": { en: "Download CSV", bn: "CSV ডাউনলোড" },
  "common.acknowledge": { en: "Acknowledge", bn: "নিশ্চিত করুন" },
  "common.acknowledged": { en: "Acknowledged", bn: "নিশ্চিত করা হয়েছে" },
  "common.ack": { en: "Ack", bn: "নিশ্চিত" },
  "common.share": { en: "Share", bn: "শেয়ার করুন" },

  // ── Alarms ────────────────────────────────────────────────────────
  "alarms.title": { en: "Alarms", bn: "অ্যালার্ম" },
  "alarms.unackedOnly": { en: "Only unacknowledged", bn: "শুধু নিশ্চিত-না-করা" },
  "alarms.banner": { en: "New alarm", bn: "নতুন অ্যালার্ম" },
  "alarms.severity": { en: "Severity", bn: "গুরুত্ব" },
  "alarms.type": { en: "Type", bn: "ধরন" },
  "alarms.notifications": { en: "Notifications", bn: "বিজ্ঞপ্তি" },
  "alarms.ackAll": { en: "Acknowledge all", bn: "সব নিশ্চিত করুন" },
  "alarms.noAlarms": { en: "No new notifications", bn: "কোনো নতুন বিজ্ঞপ্তি নেই" },
  "alarms.viewAll": { en: "View all alarms", bn: "সব অ্যালার্ম দেখুন" },
  "alarms.popupTitle": { en: "New alarm", bn: "নতুন অ্যালার্ম" },
  "alarms.viewOnMap": { en: "View on map", bn: "মানচিত্রে দেখুন" },
  "alarms.showMap": { en: "Map", bn: "মানচিত্র" },
  "alarms.vehicle": { en: "Person", bn: "সদস্য" },
  "alarms.time": { en: "Time", bn: "সময়" },
  "alarms.location": { en: "Location", bn: "অবস্থান" },
  "alarms.allTypes": { en: "All types", bn: "সব ধরন" },
  "alarms.allSeverities": { en: "All severities", bn: "সব গুরুত্ব" },
  "alarms.allVehicles": { en: "Everyone", bn: "সবাই" },
  "alarms.exportExcel": { en: "Export Excel", bn: "এক্সেল এক্সপোর্ট" },
  "alarms.shown": { en: "shown", bn: "দেখানো হয়েছে" },
  "alarms.unacked": { en: "unacknowledged", bn: "নিশ্চিত-না-করা" },
  "severity.CRITICAL": { en: "Critical", bn: "জরুরি" },
  "severity.WARNING": { en: "Warning", bn: "সতর্কতা" },
  "severity.INFO": { en: "Info", bn: "তথ্য" },
  "alarmType.SOS": { en: "SOS", bn: "এসওএস" },
  "alarmType.POWER_CUT": { en: "Power cut", bn: "পাওয়ার কাট" },
  "alarmType.SHOCK": { en: "Shock / vibration", bn: "ঝাঁকুনি / কম্পন" },
  "alarmType.OVERSPEED": { en: "Moving fast (possibly in a vehicle)", bn: "দ্রুত চলছে (সম্ভবত গাড়িতে)" },
  "alarmType.GEOFENCE_ENTER": { en: "Back inside safe area", bn: "আবার নিরাপদ এলাকায়" },
  "alarmType.GEOFENCE_EXIT": { en: "Left safe area", bn: "নিরাপদ এলাকার বাইরে" },
  "alarmType.PLACE_ARRIVED": { en: "Arrived at a trusted place", bn: "বিশ্বস্ত জায়গায় পৌঁছানো" },
  "alarmType.PLACE_LEFT": { en: "Left a trusted place", bn: "বিশ্বস্ত জায়গা থেকে বের হওয়া" },
  "alarmType.NOT_ARRIVED": { en: "Not at a place by the expected time", bn: "নির্ধারিত সময়ে জায়গায় পৌঁছায়নি" },
  "alarmType.NOT_LEFT": { en: "Still at a place after the expected time", bn: "নির্ধারিত সময়ের পরেও জায়গায় আছে" },
  "alarmType.CHARGE_REMINDER": { en: "Charge reminder", bn: "চার্জ দেওয়ার রিমাইন্ডার" },
  "alarmType.COLLISION": { en: "Collision", bn: "সংঘর্ষ" },
  "alarmType.ACC_ON": { en: "Ignition on", bn: "ইগনিশন চালু" },
  "alarmType.ACC_OFF": { en: "Ignition off", bn: "ইগনিশন বন্ধ" },
  "alarmType.LOW_BATTERY": { en: "Tracker battery low", bn: "ট্র্যাকারের চার্জ কম" },
  "alarmType.EXTERNAL_LOW_VOLTAGE": { en: "Low external voltage", bn: "বাহ্যিক ভোল্টেজ কম" },
  "alarmType.REMOVE": { en: "Tracker taken off", bn: "ট্র্যাকার খুলে ফেলা হয়েছে" },
  "alarmType.DOOR": { en: "Door", bn: "দরজা" },
  "alarmType.URGENT_ACCELERATION": { en: "Harsh acceleration", bn: "হঠাৎ ত্বরণ" },
  "alarmType.URGENT_DECELERATION": { en: "Harsh braking", bn: "হঠাৎ ব্রেক" },
  "alarmType.CURFEW_VIOLATION": { en: "Curfew violation", bn: "কারফিউ লঙ্ঘন" },
  "alarmType.PARKING_TIMEOUT": { en: "Stayed in one place too long", bn: "অনেকক্ষণ এক জায়গায়" },
  "alarmType.OFFLINE_TIMEOUT": { en: "Tracker offline too long", bn: "ট্র্যাকার অনেকক্ষণ অফলাইন" },
  "alarmType.ENGINE_IDLE": { en: "Engine idle", bn: "ইঞ্জিন নিষ্ক্রিয় চালু" },
  "alarmResult.HANDLED": { en: "Handled", bn: "সমাধান হয়েছে" },
  "alarmResult.FALSE_ALARM": { en: "False alarm", bn: "ভুল অ্যালার্ম" },
  "alarmResult.NO_ACTION": { en: "No action needed", bn: "কোনো পদক্ষেপ লাগেনি" },
  "alarms.tabOverview": { en: "Alarm overview", bn: "অ্যালার্ম সারসংক্ষেপ" },
  "alarms.tabDetails": { en: "Alarm details", bn: "অ্যালার্ম বিবরণ" },
  "alarms.total": { en: "Total", bn: "মোট" },
  "alarms.overviewTotal": { en: "alarms in period", bn: "অ্যালার্ম এই সময়ে" },
  "alarms.overviewVehicles": { en: "people with alarms", bn: "জন সদস্যের অ্যালার্ম" },
  "alarms.process": { en: "Process", bn: "প্রক্রিয়া" },
  "alarms.processResult": { en: "Result", bn: "ফলাফল" },
  "alarms.processNotes": { en: "Notes", bn: "নোট" },
  "alarms.processNotesPlaceholder": { en: "What was done? (optional)", bn: "কী করা হয়েছে? (ঐচ্ছিক)" },
  "notif.title": { en: "Alarm notifications", bn: "অ্যালার্ম বিজ্ঞপ্তি" },
  "notif.intro": { en: "Choose which alarms pop up on this dashboard, which of them play a sound, and which are pushed to your phone. These settings are yours only; other users have their own.", bn: "কোন অ্যালার্ম এই ড্যাশবোর্ডে পপআপ হবে, কোনগুলো শব্দ করবে এবং কোনগুলো আপনার ফোনে পুশ হবে তা বেছে নিন। এই সেটিংস শুধু আপনার; অন্য ব্যবহারকারীদের নিজস্ব সেটিংস আছে।" },
  "notif.defaultsNote": { en: "You are on the default settings. Save to keep your own.", bn: "আপনি ডিফল্ট সেটিংসে আছেন। নিজের সেটিংস রাখতে সংরক্ষণ করুন।" },
  "notif.popup": { en: "Popup", bn: "পপআপ" },
  "notif.sound": { en: "Sound", bn: "শব্দ" },
  "notif.push": { en: "Phone push", bn: "ফোন পুশ" },
  "notif.popupHelp": { en: "shows a card at the top of the dashboard the moment the alarm arrives.", bn: "অ্যালার্ম আসার সাথে সাথে ড্যাশবোর্ডের উপরে একটি কার্ড দেখায়।" },
  "notif.soundHelp": { en: "also plays a tone (critical alarms repeat until acknowledged). Needs popup.", bn: "একটি শব্দও বাজায় (জরুরি অ্যালার্ম নিশ্চিত না করা পর্যন্ত পুনরাবৃত্তি হয়)। পপআপ প্রয়োজন।" },
  "notif.pushHelp": { en: "sends a push notification to the EyeOn mobile app on your phone.", bn: "আপনার ফোনের EyeOn অ্যাপে পুশ নোটিফিকেশন পাঠায়।" },
  "notif.all": { en: "all", bn: "সব" },
  "notif.testSound": { en: "Test sound", bn: "শব্দ পরীক্ষা" },
  "notif.previewPopup": { en: "Preview popup", bn: "পপআপ প্রিভিউ" },
  "notif.unreadPrefix": { en: "You have", bn: "আপনার" },
  "notif.unreadSuffix": { en: "unread messages,", bn: "টি অপঠিত বার্তা আছে," },
  "notif.clickDetails": { en: "Click to view details.", bn: "বিস্তারিত দেখতে ক্লিক করুন।" },
  "notif.soundBlocked": { en: "Your browser blocked the sound. Click anywhere on the page, then try again.", bn: "আপনার ব্রাউজার শব্দ ব্লক করেছে। পেজে যেকোনো জায়গায় ক্লিক করে আবার চেষ্টা করুন।" },
  "settings.tab.notifications": { en: "Notifications", bn: "বিজ্ঞপ্তি" },

  // ── Geofences ─────────────────────────────────────────────────────
  "geo.title": { en: "Geofences", bn: "জিও-ফেন্স" },
  "geo.new": { en: "New geofence", bn: "নতুন জিও-ফেন্স" },
  "geo.name": { en: "Name", bn: "নাম" },
  "geo.shape": { en: "Shape", bn: "আকৃতি" },
  "geo.circle": { en: "Circle", bn: "বৃত্ত" },
  "geo.polygon": { en: "Polygon", bn: "বহুভুজ" },
  "geo.radius": { en: "Radius (m)", bn: "ব্যাসার্ধ (মি)" },
  "geo.notifyOn": { en: "Notify on", bn: "বিজ্ঞপ্তি" },
  "geo.notifyEnter": { en: "Enter", bn: "প্রবেশ" },
  "geo.notifyExit": { en: "Exit", bn: "প্রস্থান" },
  "geo.notifyBoth": { en: "Both", bn: "উভয়" },
  "geo.assignedDevices": { en: "Assigned people", bn: "নির্ধারিত সদস্য" },
  "geo.clickToSetCenter": { en: "Click on the map to set the center", bn: "কেন্দ্র সেট করতে মানচিত্রে ক্লিক করুন" },
  "geo.clickToAddVertex": { en: "Click to add a vertex (≥3 to save)", bn: "ভার্টেক্স যোগ করতে ক্লিক করুন (সংরক্ষণে ≥৩)" },
  "geo.vehicles": { en: "People", bn: "সদস্য" },
  "geo.assignVehicles": { en: "Choose people", bn: "সদস্য বেছে নিন" },
  "geo.selected": { en: "selected", bn: "নির্বাচিত" },
  "geo.notifyNone": { en: "Off", bn: "বন্ধ" },
  "geo.edit": { en: "Edit geofence", bn: "জিও-ফেন্স সম্পাদনা" },
  "geo.tabBoundaries": { en: "Boundaries", bn: "সীমানা" },
  "geo.boundariesHint": {
    en: "An area they should not leave. You get a warning the moment they are outside it.",
    bn: "যে এলাকার বাইরে যাওয়া উচিত নয়। বাইরে গেলেই সতর্কবার্তা পাবেন।",
  },
  "geo.people": { en: "People", bn: "সদস্য" },
  "geo.assignPeople": { en: "Who is this for?", bn: "কার জন্য?" },
  "geo.created": { en: "Created", bn: "তৈরি" },

  // ── Trusted places ─────────────────────────────────────────────────
  "place.tab": { en: "Trusted places", bn: "বিশ্বস্ত জায়গা" },
  "place.hint": {
    en: "Home, school, coaching - places they are supposed to be. You are told when they arrive and when they leave.",
    bn: "বাসা, স্কুল, কোচিং — যেখানে ওর থাকার কথা। পৌঁছালে ও বের হলে আপনাকে জানানো হবে।",
  },
  "place.add": { en: "Add a place", bn: "নতুন জায়গা যোগ করুন" },
  "place.edit": { en: "Edit place", bn: "জায়গা সম্পাদনা" },
  "place.none": { en: "No trusted places yet. Add Home or School to start.", bn: "এখনও কোনো বিশ্বস্ত জায়গা নেই। বাসা বা স্কুল যোগ করে শুরু করুন।" },
  "place.kind": { en: "What kind of place?", bn: "এটা কোন ধরনের জায়গা?" },
  "place.type": { en: "Type", bn: "ধরন" },
  "place.type.HOME": { en: "Home", bn: "বাসা" },
  "place.type.SCHOOL": { en: "School", bn: "স্কুল" },
  "place.type.COACHING": { en: "Coaching", bn: "কোচিং" },
  "place.type.MOSQUE": { en: "Mosque", bn: "মসজিদ" },
  "place.type.HOSPITAL": { en: "Hospital", bn: "হাসপাতাল" },
  "place.type.RELATIVE": { en: "Relative's home", bn: "আত্মীয়ের বাসা" },
  "place.type.OTHER": { en: "Other", bn: "অন্যান্য" },
  "place.times": { en: "Expected times", bn: "নির্ধারিত সময়" },
  "place.timesHint": {
    en: "You get an alert when they are not here by a time, or have not left by a time. The tracker is asked for a fresh position first, so allow about 4 minutes.",
    bn: "নির্ধারিত সময়ে এখানে না পৌঁছালে, বা সময়ের পরেও বের না হলে আপনাকে সতর্ক করা হবে। আগে ট্র্যাকার থেকে নতুন অবস্থান নেওয়া হয়, তাই প্রায় ৪ মিনিট সময় লাগে।",
  },
  "place.timesNone": { en: "No expected times yet.", bn: "এখনও কোনো সময় নির্ধারণ করা হয়নি।" },
  "place.times.ARRIVE_BY": { en: "Should be here by", bn: "এই সময়ের মধ্যে পৌঁছাবে" },
  "place.times.LEAVE_BY": { en: "Should have left by", bn: "এই সময়ের মধ্যে বের হবে" },
  "place.timesAdd": { en: "Add time", bn: "সময় যোগ করুন" },
  "place.timesDays": { en: "On these days", bn: "যে দিনগুলোতে" },
  "day.1": { en: "Mon", bn: "সোম" },
  "day.2": { en: "Tue", bn: "মঙ্গল" },
  "day.3": { en: "Wed", bn: "বুধ" },
  "day.4": { en: "Thu", bn: "বৃহঃ" },
  "day.5": { en: "Fri", bn: "শুক্র" },
  "day.6": { en: "Sat", bn: "শনি" },
  "day.7": { en: "Sun", bn: "রবি" },

  // ── Stays report ───────────────────────────────────────────────────
  "stays.title": { en: "Stays", bn: "কোথায় কতক্ষণ" },
  "stays.hint": {
    en: "Where each person stayed for 5 minutes or more, and for how long.",
    bn: "কে কোথায় ৫ মিনিট বা তার বেশি সময় ছিল, এবং কতক্ষণ।",
  },
  "stays.allPeople": { en: "All people", bn: "সবাই" },
  "stays.today": { en: "Today", bn: "আজ" },
  "stays.yesterday": { en: "Yesterday", bn: "গতকাল" },
  "stays.last7": { en: "Last 7 days", bn: "গত ৭ দিন" },
  "stays.pickDay": { en: "Pick a day", bn: "দিন বেছে নিন" },
  "stays.viewTimeline": { en: "By time", bn: "সময় অনুযায়ী" },
  "stays.viewPlaces": { en: "By place", bn: "জায়গা অনুযায়ী" },
  "stays.none": { en: "No stays in this period.", bn: "এই সময়ে কোথাও থাকার তথ্য নেই।" },
  "stays.now": { en: "now", bn: "এখন" },
  "stays.stillHere": { en: "Still here", bn: "এখনও এখানে" },
  "stays.before": { en: "before", bn: "আগে থেকে" },
  "stays.visits": { en: "visits", bn: "বার" },
  "stays.visit": { en: "visit", bn: "বার" },
  "stays.places": { en: "places", bn: "টি জায়গা" },
  "stays.place": { en: "place", bn: "টি জায়গা" },
  "stays.total": { en: "in total", bn: "মোট" },
  "stays.lookingUp": { en: "Finding the place name…", bn: "জায়গার নাম খোঁজা হচ্ছে…" },
  "stays.map": { en: "Map", bn: "ম্যাপ" },
  "stays.unit.min": { en: "min", bn: "মিনিট" },
  "stays.unit.h": { en: "h", bn: "ঘণ্টা" },
  "stays.unit.d": { en: "d", bn: "দিন" },

  // ── Tracker settings panel ─────────────────────────────────────────
  "ts.title": { en: "Tracker settings", bn: "ট্র্যাকার সেটিংস" },
  "ts.online": { en: "Connected - changes are sent right away", bn: "সংযুক্ত — পরিবর্তন সাথে সাথে পাঠানো হবে" },
  "ts.offline": { en: "Not connected - changes are sent when the tracker next connects", bn: "সংযুক্ত নয় — ট্র্যাকার আবার সংযুক্ত হলে পরিবর্তন পাঠানো হবে" },
  "ts.read": { en: "Read from tracker", bn: "ট্র্যাকার থেকে পড়ুন" },
  "ts.reading": { en: "Reading…", bn: "পড়া হচ্ছে…" },
  "ts.save": { en: "Save", bn: "সংরক্ষণ" },
  "ts.saving": { en: "Sending…", bn: "পাঠানো হচ্ছে…" },
  "ts.status.UNKNOWN": { en: "Not read yet", bn: "এখনও পড়া হয়নি" },
  "ts.status.SYNCED": { en: "On the tracker", bn: "ট্র্যাকারে আছে" },
  "ts.status.PENDING": { en: "Waiting for the tracker", bn: "ট্র্যাকারের অপেক্ষায়" },
  "ts.status.FAILED": { en: "Tracker did not accept", bn: "ট্র্যাকার গ্রহণ করেনি" },
  "ts.status.UNSUPPORTED": { en: "Not supported", bn: "এই ট্র্যাকারে নেই" },
  "ts.on": { en: "On", bn: "চালু" },
  "ts.from": { en: "From", bn: "শুরু" },
  "ts.to": { en: "To", bn: "শেষ" },
  "ts.method": { en: "The tracker then", bn: "তখন ট্র্যাকার" },
  "ts.method.0": { en: "tells the app only", bn: "শুধু অ্যাপে জানায়" },
  "ts.method.1": { en: "tells the app and texts the SOS numbers", bn: "অ্যাপে জানায় ও SOS নম্বরে SMS পাঠায়" },
  "ts.method.2": { en: "tells the app, texts and calls the SOS numbers", bn: "অ্যাপে জানায়, SOS নম্বরে SMS ও কল করে" },
  "ts.method.3": { en: "tells the app and calls the SOS numbers", bn: "অ্যাপে জানায় ও SOS নম্বরে কল করে" },
  "ts.methodNeedsNumbers": { en: "Texts and calls need at least one SOS number and balance on the tracker's SIM.", bn: "SMS ও কলের জন্য অন্তত একটি SOS নম্বর এবং ট্র্যাকারের সিমে ব্যালেন্স লাগবে।" },

  "ts.sec.emergency": { en: "Emergency (SOS)", bn: "জরুরি (SOS)" },
  "ts.sec.calls": { en: "Phone calls", bn: "ফোন কল" },
  "ts.sec.location": { en: "Location updates", bn: "লোকেশন আপডেট" },
  "ts.sec.rest": { en: "Rest and quiet hours", bn: "বিশ্রাম ও নীরব সময়" },
  "ts.sec.alarms": { en: "Alarms from the tracker", bn: "ট্র্যাকারের অ্যালার্ম" },
  "ts.sec.power": { en: "Power", bn: "পাওয়ার" },

  "ts.SOS_NUMBERS": { en: "SOS phone numbers", bn: "SOS ফোন নম্বর" },
  "ts.SOS_NUMBERS.hint": { en: "Up to 4 numbers the tracker texts or calls when the SOS button is pressed.", bn: "SOS বোতাম চাপলে ট্র্যাকার যে নম্বরগুলোতে SMS বা কল করবে (সর্বোচ্চ ৪টি)।" },
  "ts.SOS_NUMBERS.placeholder": { en: "Phone number", bn: "ফোন নম্বর" },
  "ts.SOS_ALARM": { en: "When the SOS button is pressed", bn: "SOS বোতাম চাপলে" },
  "ts.SOS_ALARM.hint": { en: "Hold the button for 3 seconds to send SOS.", bn: "SOS পাঠাতে বোতামটি ৩ সেকেন্ড চেপে ধরতে হয়।" },
  "ts.CALL_PERMISSION": { en: "Who can call the tracker", bn: "কে ট্র্যাকারে কল করতে পারবে" },
  "ts.who.0": { en: "Nobody", bn: "কেউ না" },
  "ts.who.2": { en: "Only the SOS numbers", bn: "শুধু SOS নম্বরগুলো" },
  "ts.who.3": { en: "Anyone", bn: "যে কেউ" },
  "ts.ANSWER_MODE": { en: "Answer calls automatically", bn: "কল নিজে থেকে রিসিভ হবে" },
  "ts.ANSWER_MODE.hint": { en: "Off: the wearer presses the button to answer.", bn: "বন্ধ থাকলে কল ধরতে বোতাম চাপতে হবে।" },
  "ts.CALL_VOLUME": { en: "Call volume", bn: "কলের ভলিউম" },
  "ts.RING_VOLUME": { en: "Ring volume", bn: "রিংয়ের ভলিউম" },

  "ts.REPORTING": { en: "How often the position is sent", bn: "কত ঘন ঘন অবস্থান পাঠাবে" },
  "ts.REPORTING.hint": { en: "More frequent updates use more battery.", bn: "যত ঘন ঘন আপডেট, ব্যাটারি তত দ্রুত শেষ হয়।" },
  "ts.mode.2": { en: "By movement (recommended)", bn: "চলাফেরা অনুযায়ী (প্রস্তাবিত)" },
  "ts.mode.4": { en: "By steps (longest battery)", bn: "পদক্ষেপ অনুযায়ী (ব্যাটারি সবচেয়ে বেশি চলে)" },
  "ts.mode.1": { en: "Fixed interval", bn: "নির্দিষ্ট সময় পর পর" },
  "ts.moving": { en: "While moving, every", bn: "চলার সময়, প্রতি" },
  "ts.still": { en: "While still, every", bn: "স্থির থাকলে, প্রতি" },
  "ts.stillNever": { en: "No updates while still", bn: "স্থির থাকলে আপডেট নয়" },
  "ts.steps": { en: "While walking, every", bn: "হাঁটার সময়, প্রতি" },
  "ts.stepsUnit": { en: "steps", bn: "পদক্ষেপে" },
  "ts.riding": { en: "In a vehicle, every", bn: "গাড়িতে থাকলে, প্রতি" },
  "ts.interval": { en: "Every", bn: "প্রতি" },
  "ts.unit.s": { en: "s", bn: "সে." },
  "ts.unit.min": { en: "min", bn: "মিনিট" },
  "ts.unit.h": { en: "h", bn: "ঘণ্টা" },
  "ts.HEARTBEAT": { en: "\"Still connected\" signal every", bn: "\"সংযুক্ত আছি\" সংকেত, প্রতি" },
  "ts.HEARTBEAT.hint": { en: "Also carries the battery level. The app shows a tracker as offline after 10 silent minutes.", bn: "এর সাথে ব্যাটারির মাত্রাও আসে। ১০ মিনিট কোনো সাড়া না পেলে অ্যাপ ট্র্যাকারকে অফলাইন দেখায়।" },

  "ts.NIGHT_REST": { en: "Night rest", bn: "রাতের বিশ্রাম" },
  "ts.NIGHT_REST.hint": { en: "The tracker switches itself off for these hours every day to save battery.", bn: "ব্যাটারি বাঁচাতে প্রতিদিন এই সময়ে ট্র্যাকার নিজে থেকে বন্ধ থাকে।" },
  "ts.NIGHT_REST.warning": { en: "While resting there is no location and the SOS button does not work.", bn: "বিশ্রামের সময় লোকেশন পাওয়া যায় না এবং SOS বোতাম কাজ করে না।" },
  "ts.QUIET_HOURS": { en: "Quiet hours", bn: "নীরব সময়" },
  "ts.QUIET_HOURS.hint": { en: "The tracker makes no sound during these hours, for example at school. It keeps reporting.", bn: "এই সময়ে ট্র্যাকার কোনো শব্দ করে না (যেমন স্কুলে)। লোকেশন পাঠানো চলতে থাকে।" },

  "ts.LOW_BATTERY_ALARM": { en: "Low battery alarm", bn: "ব্যাটারি কম থাকার অ্যালার্ম" },
  "ts.FALL_ALARM": { en: "Fall alarm", bn: "পড়ে যাওয়ার অ্যালার্ম" },
  "ts.FALL_ALARM.hint": { en: "A fall followed by no movement. The tracker beeps for 30 seconds first; a short press of SOS cancels it.", bn: "পড়ে যাওয়ার পর নড়াচড়া না থাকলে। ট্র্যাকার আগে ৩০ সেকেন্ড শব্দ করে; SOS বোতাম একবার চাপলে বাতিল হয়।" },
  "ts.immobile": { en: "No movement for", bn: "নড়াচড়া নেই" },
  "ts.POWER_OFF_LOCK": { en: "Cannot be switched off with the SOS button", bn: "SOS বোতাম দিয়ে বন্ধ করা যাবে না" },
  "ts.POWER_OFF_LOCK.hint": { en: "Off: five short presses switch the tracker off.", bn: "বন্ধ থাকলে পাঁচবার ছোট চাপে ট্র্যাকার বন্ধ হয়ে যায়।" },
  "ts.AUTO_POWER_ON": { en: "Switch on when put on the charger", bn: "চার্জে দিলে নিজে থেকে চালু হবে" },
  "place.size": { en: "Size of the area (m)", bn: "এলাকার আকার (মি)" },
  "place.sizeHint": {
    en: "Cover the whole building and its gate. Minimum 80 m - smaller areas cause false alerts indoors.",
    bn: "পুরো ভবন ও গেট যেন ভেতরে থাকে। সর্বনিম্ন ৮০ মি — এর চেয়ে ছোট হলে ঘরের ভেতরে ভুল অ্যালার্ট আসে।",
  },
  "place.tellMe": { en: "Tell me when they", bn: "কখন জানাব?" },
  "place.arrive": { en: "Arrive", bn: "পৌঁছালে" },
  "place.leave": { en: "Leave", bn: "বের হলে" },
  "place.clickMap": { en: "Click the map to drop the pin", bn: "পিন বসাতে ম্যাপে ক্লিক করুন" },
  "place.alerts.BOTH": { en: "Arrive and leave", bn: "পৌঁছালে ও বের হলে" },
  "place.alerts.ENTER": { en: "Arrive only", bn: "শুধু পৌঁছালে" },
  "place.alerts.EXIT": { en: "Leave only", bn: "শুধু বের হলে" },
  "place.alerts.NONE": { en: "Off", bn: "বন্ধ" },

  "list.sort": { en: "Sort people", bn: "সদস্য সাজান" },

  // ── Person types (stored in devices.vehicle_type) ─────────────────
  "person.type.BOY": { en: "Boy", bn: "ছেলে" },
  "person.type.GIRL": { en: "Girl", bn: "মেয়ে" },
  "person.type.OLD_MAN": { en: "Old man", bn: "বয়স্ক পুরুষ" },
  "person.type.PERSON": { en: "Person", bn: "সদস্য" },

  // ── Person detail: statistics + data rows ─────────────────────────
  "stats.now": { en: "Right now", bn: "এই মুহূর্তে" },
  "stats.tracker": { en: "Tracker", bn: "ট্র্যাকার" },
  "stats.battery": { en: "Battery", bn: "ব্যাটারি" },
  "stats.satellites": { en: "GPS satellites", bn: "জিপিএস স্যাটেলাইট" },
  "stats.subscription": { en: "Subscription", bn: "সাবস্ক্রিপশন" },
  "stats.status": { en: "Status", bn: "অবস্থা" },
  "data.sim": { en: "SIM number", bn: "সিম নম্বর" },
  "data.status": { en: "Status", bn: "অবস্থা" },
  "data.altitude": { en: "Altitude", bn: "উচ্চতা" },
  "data.heading": { en: "Heading", bn: "দিক" },
  "data.position": { en: "Position", bn: "অবস্থান" },
  "data.stillFor": { en: "In one place for", bn: "এক জায়গায় আছে" },
  "data.timePosition": { en: "Time (position)", bn: "সময় (অবস্থান)" },
  "data.timeServer": { en: "Time (received)", bn: "সময় (প্রাপ্ত)" },

  // ── Day history (route playback + timeline; EyeOn has no trips) ───
  "hist.moving": { en: "moving", bn: "চলাফেরা" },
  "hist.play": { en: "Play", bn: "চালান" },
  "hist.pause": { en: "Pause", bn: "থামান" },
  "hist.restart": { en: "Back to start", bn: "শুরুতে ফিরুন" },
  "hist.noData": { en: "No location recorded in this period.", bn: "এই সময়ে কোনো লোকেশন পাওয়া যায়নি।" },
  "hist.noEvents": {
    en: "No arrivals or departures in this period. Add trusted places to see them here.",
    bn: "এই সময়ে কোথাও পৌঁছানো বা বের হওয়ার তথ্য নেই। বিশ্বস্ত জায়গা যোগ করলে এখানে দেখা যাবে।",
  },
  "hist.event.PLACE_ARRIVED": { en: "Arrived", bn: "পৌঁছানো" },
  "hist.event.PLACE_LEFT": { en: "Left", bn: "বের হওয়া" },
  "hist.event.GEOFENCE_EXIT": { en: "Left the safe area", bn: "নিরাপদ এলাকার বাইরে" },
  "hist.event.GEOFENCE_ENTER": { en: "Back in the safe area", bn: "আবার নিরাপদ এলাকায়" },
  "hist.event.SOS": { en: "SOS pressed", bn: "SOS চাপা হয়েছে" },

  // ── Trips ─────────────────────────────────────────────────────────
  "trips.title": { en: "Trips", bn: "ট্রিপ" },
  "trips.startedAt": { en: "Started", bn: "শুরু" },
  "trips.endedAt": { en: "Ended", bn: "শেষ" },
  "trips.distance": { en: "Distance", bn: "দূরত্ব" },
  "trips.duration": { en: "Duration", bn: "সময়কাল" },
  "trips.maxSpeed": { en: "Max speed", bn: "সর্বোচ্চ গতি" },
  "trips.avgSpeed": { en: "Avg speed", bn: "গড় গতি" },
  "trips.replay": { en: "Replay", bn: "রিপ্লে" },
  "trips.inProgress": { en: "In progress", bn: "চলমান" },

  // ── Reports ───────────────────────────────────────────────────────
  "reports.title": { en: "Reports", bn: "রিপোর্ট" },
  "reports.tripsReport": { en: "Trips report", bn: "ট্রিপ রিপোর্ট" },
  "reports.alarmsReport": { en: "Alarms report", bn: "অ্যালার্ম রিপোর্ট" },
  "reports.monthly": { en: "Monthly moving & still time", bn: "মাসিক চলাফেরা ও এক জায়গায় থাকার রিপোর্ট" },
  "reports.month": { en: "Month", bn: "মাস" },
  "reports.vehicle": { en: "Person", bn: "সদস্য" },
  "reports.view": { en: "View", bn: "দেখুন" },
  "reports.date": { en: "Date", bn: "তারিখ" },
  "reports.driving": { en: "Moving", bn: "চলছে" },
  "reports.idle": { en: "Still", bn: "এক জায়গায়" },
  "reports.stopped": { en: "Staying in one place", bn: "এক জায়গায় আছে" },
  "reports.none": { en: "No data for this month", bn: "এই মাসের জন্য কোনো ডেটা নেই" },
  "reports.excelExport": { en: "Excel Export", bn: "এক্সেল এক্সপোর্ট" },
  "reports.excelExportDesc": { en: "Export data to Excel with professional formatting", bn: "পেশাদার ফরম্যাটে এক্সেলে ডেটা এক্সপোর্ট করুন" },
  "reports.exportExcel": { en: "Export to Excel", bn: "এক্সেলে এক্সপোর্ট" },

  "lang.toggle": { en: "বাংলা", bn: "English" },

  // ── Settings ──────────────────────────────────────────────────────
  "settings.title": { en: "Settings", bn: "সেটিংস" },
  "settings.tab.org": { en: "School / family", bn: "স্কুল / পরিবার" },
  "settings.tab.users": { en: "Users", bn: "ব্যবহারকারী" },
  "settings.tab.billing": { en: "Billing", bn: "বিলিং" },
  "settings.org.name": { en: "School / family name", bn: "স্কুল / পরিবারের নাম" },
  "settings.org.contactEmail": { en: "Contact email", bn: "যোগাযোগ ইমেইল" },
  "settings.org.contactPhone": { en: "Contact phone", bn: "যোগাযোগ ফোন" },
  "settings.org.address": { en: "Address", bn: "ঠিকানা" },
  "settings.org.locale": { en: "Default language", bn: "ডিফল্ট ভাষা" },
  "settings.org.timezone": { en: "Timezone", bn: "টাইমজোন" },
  "settings.org.plan": { en: "Plan", bn: "প্ল্যান" },
  "settings.org.saved": { en: "Saved", bn: "সংরক্ষিত" },
  "settings.map.title": { en: "Map", bn: "মানচিত্র" },
  "settings.map.googleKey": { en: "Google Maps API key", bn: "গুগল ম্যাপস API কী" },
  "settings.map.googleKeyHelp": {
    en: "Use your own Google Cloud browser key so map usage is billed to your account. Leave empty to use the EyeOn default key. Restrict the key to this site's address in Google Cloud Console.",
    bn: "নিজের Google Cloud ব্রাউজার কী ব্যবহার করুন যাতে ম্যাপ ব্যবহারের বিল আপনার অ্যাকাউন্টে যায়। খালি রাখলে EyeOn-এর ডিফল্ট কী ব্যবহৃত হবে। Google Cloud Console-এ কী-টি এই সাইটের ঠিকানায় সীমাবদ্ধ করুন।",
  },
  "settings.map.usingOwn": { en: "Using your own key", bn: "আপনার নিজের কী ব্যবহৃত হচ্ছে" },
  "settings.map.usingDefault": { en: "Using the EyeOn default key", bn: "EyeOn-এর ডিফল্ট কী ব্যবহৃত হচ্ছে" },
  "settings.map.show": { en: "Show", bn: "দেখান" },
  "settings.map.hide": { en: "Hide", bn: "লুকান" },
  "settings.map.reloadHint": { en: "Saved. Reload the page to switch the map to the new key.", bn: "সংরক্ষিত। নতুন কী-তে ম্যাপ পরিবর্তন করতে পেজ রিলোড করুন।" },

  // ── Billing ────────────────────────────────────────────────────────
  "billing.title": { en: "Subscriptions", bn: "সাবস্ক্রিপশন" },
  "billing.noSubscriptions": { en: "No subscriptions found", bn: "কোনো সাবস্ক্রিপশন পাওয়া যায়নি" },
  "billing.device": { en: "Device", bn: "ডিভাইস" },
  "billing.plan": { en: "Plan", bn: "প্ল্যান" },
  "billing.status": { en: "Status", bn: "অবস্থা" },
  "billing.expiresOn": { en: "Expires", bn: "মেয়াদ" },
  "billing.startedOn": { en: "Started", bn: "শুরু" },
  "billing.daysLeft": { en: "days left", bn: "দিন বাকি" },
  "billing.expired": { en: "Expired", bn: "মেয়াদোত্তীর্ণ" },
  "billing.expiringSoon": { en: "Expiring soon", bn: "শীঘ্রই মেয়াদ শেষ" },
  "billing.status.ACTIVE": { en: "Active", bn: "সক্রিয়" },
  "billing.status.GRACE": { en: "Grace period", bn: "গ্রেস পিরিয়ড" },
  "billing.status.SUSPENDED": { en: "Suspended", bn: "স্থগিত" },
  "billing.status.CANCELLED": { en: "Cancelled", bn: "বাতিল" },
  "billing.autoRenew": { en: "Auto-renew", bn: "অটো-রিনিউ" },
  "billing.contactAdmin": { en: "Contact admin to renew", bn: "রিনিউ করতে অ্যাডমিনের সাথে যোগাযোগ করুন" },
  "billing.trialPlan": { en: "Trial", bn: "ট্রায়াল" },

  // ── Admin Billing ──────────────────────────────────────────────────
  "admin.billing.title": { en: "Subscriptions", bn: "সাবস্ক্রিপশন" },
  "admin.billing.stats": { en: "Billing Stats", bn: "বিলিং পরিসংখ্যান" },
  "admin.billing.total": { en: "Total", bn: "মোট" },
  "admin.billing.active": { en: "Active", bn: "সক্রিয়" },
  "admin.billing.grace": { en: "Grace", bn: "গ্রেস" },
  "admin.billing.suspended": { en: "Suspended", bn: "স্থগিত" },
  "admin.billing.expiring7d": { en: "Expiring in 7 days", bn: "৭ দিনে মেয়াদ শেষ" },
  "admin.billing.expiredUnpaid": { en: "Expired unpaid", bn: "মেয়াদোত্তীর্ণ অপরিশোধিত" },
  "admin.billing.search": { en: "Search by IMEI", bn: "IMEI দিয়ে খুঁজুন" },
  "admin.billing.filterOrg": { en: "Filter by school / family", bn: "স্কুল / পরিবার দিয়ে ফিল্টার" },
  "admin.billing.filterStatus": { en: "Filter by status", bn: "অবস্থা দিয়ে ফিল্টার" },
  "admin.billing.showExpired": { en: "Show expired only", bn: "শুধু মেয়াদোত্তীর্ণ দেখুন" },
  "admin.billing.showDueSoon": { en: "Due soon", bn: "শীঘ্রই মেয়াদ" },
  "admin.billing.extend": { en: "Extend", bn: "বাড়ান" },
  "admin.billing.extendTitle": { en: "Extend Subscription", bn: "সাবস্ক্রিপশন বাড়ান" },
  "admin.billing.addDays": { en: "Add days", bn: "দিন যোগ করুন" },
  "admin.billing.setDate": { en: "Set new expiry date", bn: "নতুন মেয়াদ তারিখ সেট করুন" },
  "admin.billing.extended": { en: "Subscription extended", bn: "সাবস্ক্রিপশন বাড়ানো হয়েছে" },
  "admin.billing.org": { en: "School / family", bn: "স্কুল / পরিবার" },

  "users.title": { en: "Users", bn: "ব্যবহারকারী" },
  "users.add": { en: "Add user", bn: "ব্যবহারকারী যোগ করুন" },
  "users.edit": { en: "Edit", bn: "সম্পাদনা" },
  "users.disable": { en: "Disable", bn: "নিষ্ক্রিয়" },
  "users.enable": { en: "Enable", bn: "সক্রিয়" },
  "users.email": { en: "Email", bn: "ইমেইল" },
  "users.phone": { en: "Phone", bn: "ফোন" },
  "users.fullName": { en: "Full name", bn: "পুরো নাম" },
  "users.role": { en: "Role", bn: "ভূমিকা" },
  "users.password": { en: "Password", bn: "পাসওয়ার্ড" },
  "users.passwordHint": { en: "Leave blank to keep current", bn: "একই রাখতে খালি রাখুন" },
  "users.lastLogin": { en: "Last login", bn: "সর্বশেষ লগইন" },
  "users.status": { en: "Status", bn: "অবস্থা" },
  "users.active": { en: "Active", bn: "সক্রিয়" },
  "users.inactive": { en: "Inactive", bn: "নিষ্ক্রিয়" },
  "users.role.SUPER_ADMIN": { en: "Super admin", bn: "সুপার অ্যাডমিন" },
  "users.role.ORG_ADMIN": { en: "Admin", bn: "অ্যাডমিন" },
  "users.role.ORG_USER": { en: "User", bn: "ব্যবহারকারী" },
  "users.devices": { en: "People", bn: "সদস্য" },
  "users.manageDevices": { en: "Manage people", bn: "সদস্য পরিচালনা" },
  "users.assignDevices": { en: "Assign people", bn: "সদস্য বরাদ্দ করুন" },
  "users.assignedDevices": { en: "Assigned people", bn: "বরাদ্দকৃত সদস্য" },
  "users.seeAllDevices": { en: "See everyone", bn: "সবাইকে দেখুন" },
  "users.seeAllDevicesHint": { en: "When enabled, this user can see everyone in the school / family, not only the people assigned to them", bn: "সক্রিয় থাকলে এই ব্যবহারকারীর কাছে শুধু বরাদ্দকৃত সদস্য নয়, স্কুল / পরিবারের সবাইকে দেখা যাবে" },
  "users.noDevicesAssigned": { en: "No one assigned", bn: "কাউকে বরাদ্দ করা হয়নি" },
  "users.selectDevices": { en: "Choose people to assign", bn: "বরাদ্দ করতে সদস্য বেছে নিন" },
  "users.deviceCount": { en: "people", bn: "জন সদস্য" },

  // ── Scheduled commands ────────────────────────────────────────────
  "sched.title": { en: "Scheduled commands", bn: "নির্ধারিত কমান্ড" },
  "sched.new": { en: "Schedule new", bn: "নতুন নির্ধারণ" },
  "sched.device": { en: "Device", bn: "ডিভাইস" },
  "sched.command": { en: "Command", bn: "কমান্ড" },
  "sched.when": { en: "When", bn: "কখন" },
  "sched.nextRun": { en: "Next run", bn: "পরবর্তী রান" },
  "sched.status": { en: "Status", bn: "অবস্থা" },
  "sched.lastAttempt": { en: "Last attempt", bn: "সর্বশেষ চেষ্টা" },
  "sched.cancel": { en: "Cancel", bn: "বাতিল" },
  "sched.kind.ONE_TIME": { en: "One-time", bn: "এককালীন" },
  "sched.kind.DAILY": { en: "Daily", bn: "প্রতিদিন" },
  "sched.type.CUT_FUEL": { en: "Cut fuel", bn: "জ্বালানি বন্ধ" },
  "sched.type.RESTORE_FUEL": { en: "Restore fuel", bn: "জ্বালানি চালু" },
  "sched.type.QUERY_ADDRESS": { en: "Query address", bn: "অবস্থান জিজ্ঞাসা" },
  "sched.type.RAW": { en: "Raw command", bn: "র কমান্ড" },
  "sched.rawCommand": { en: "Raw GT06 command", bn: "র GT06 কমান্ড" },
  "sched.devicePassword": { en: "Device password", bn: "ডিভাইস পাসওয়ার্ড" },
  "sched.runAt": { en: "Run at", bn: "চালানোর সময়" },
  "sched.timeOfDay": { en: "Time of day", bn: "দিনের সময়" },
  "sched.daysOfWeek": { en: "Days of week", bn: "সপ্তাহের দিন" },
  "sched.everyDay": { en: "Every day", bn: "প্রতিদিন" },
  "sched.empty": { en: "No scheduled commands yet", bn: "এখনো কোনো নির্ধারিত কমান্ড নেই" },
  "sched.day.0": { en: "Sun", bn: "রবি" },
  "sched.day.1": { en: "Mon", bn: "সোম" },
  "sched.day.2": { en: "Tue", bn: "মঙ্গল" },
  "sched.day.3": { en: "Wed", bn: "বুধ" },
  "sched.day.4": { en: "Thu", bn: "বৃহঃ" },
  "sched.day.5": { en: "Fri", bn: "শুক্র" },
  "sched.day.6": { en: "Sat", bn: "শনি" },

  // ── Alarm rules ───────────────────────────────────────────────────
  "rules.title": { en: "Alarm rules", bn: "অ্যালার্ম নিয়ম" },
  "rules.new": { en: "New rule", bn: "নতুন নিয়ম" },
  "rules.name": { en: "Name", bn: "নাম" },
  "rules.type": { en: "Type", bn: "ধরন" },
  "rules.threshold": { en: "Threshold", bn: "সীমা" },
  "rules.window": { en: "Window", bn: "সময়সীমা" },
  "rules.cooldown": { en: "Cooldown", bn: "কুলডাউন" },
  "rules.severity": { en: "Severity", bn: "গুরুত্ব" },
  "rules.active": { en: "Active", bn: "সক্রিয়" },
  "rules.appliesTo": { en: "Applies to", bn: "প্রযোজ্য" },
  "rules.allDevices": { en: "Everyone", bn: "সবাই" },
  "rules.specificDevices": { en: "Specific people", bn: "নির্দিষ্ট সদস্য" },
  "rules.empty": { en: "No alarm rules yet", bn: "কোনো অ্যালার্ম নিয়ম নেই" },
  "rules.type.SPEED_OVER": { en: "Moving too fast", bn: "খুব দ্রুত চলছে" },
  "rules.type.VOLTAGE_UNDER": { en: "Voltage under", bn: "কম ভোল্টেজ" },
  "rules.type.ACC_ON_DURING_WINDOW": { en: "Engine on during window", bn: "নির্দিষ্ট সময়ে ইঞ্জিন চালু" },
  "rules.type.PARKING_TIMEOUT": { en: "In one place too long", bn: "অনেকক্ষণ এক জায়গায়" },
  "rules.type.OFFLINE_TIMEOUT": { en: "Tracker offline too long", bn: "ট্র্যাকার অনেকক্ষণ অফলাইন" },
  "rules.type.IDLE_TIMEOUT": { en: "Engine idling too long", bn: "অতিরিক্ত সময় ইঞ্জিন নিষ্ক্রিয় চালু" },
  "rules.unit.minutes": { en: "minutes", bn: "মিনিট" },
  "rules.unit.kph": { en: "km/h", bn: "কিমি/ঘ" },
  "rules.unit.mv": { en: "mV", bn: "মিভো" },
  "rules.unit.seconds": { en: "seconds", bn: "সেকেন্ড" },

  // ── Audit log ─────────────────────────────────────────────────────
  "audit.title": { en: "Audit log", bn: "অডিট লগ" },
  "audit.action": { en: "Action", bn: "কর্ম" },
  "audit.actor": { en: "Actor", bn: "অভিনেতা" },
  "audit.resource": { en: "Resource", bn: "রিসোর্স" },
  "audit.ip": { en: "IP", bn: "আইপি" },
  "audit.when": { en: "When", bn: "কখন" },
  "audit.metadata": { en: "Details", bn: "বিস্তারিত" },
  "audit.allActions": { en: "All actions", bn: "সব কর্ম" },

  // ══════════════════════════════════════════════════════════════════
  // MARKETING WEBSITE (mkt.*)
  // ══════════════════════════════════════════════════════════════════

  // ── Navigation ───────────────────────────────────────────────────

  // ── Hero Section ─────────────────────────────────────────────────

  // ── Stats Section ────────────────────────────────────────────────

  // ── Features - Overview ──────────────────────────────────────────

  // ── Features - GPS Tracking ──────────────────────────────────────







  // ── Features - Dashboard ─────────────────────────────────────────





  // ── Industries ───────────────────────────────────────────────────







  // ── Pricing ──────────────────────────────────────────────────────





  // ── Hardware ─────────────────────────────────────────────────────

  // ── Payment Methods ──────────────────────────────────────────────

  // ── About ────────────────────────────────────────────────────────

  // ── Contact ──────────────────────────────────────────────────────

  // ── FAQ ──────────────────────────────────────────────────────────

  // ── CTA Sections ─────────────────────────────────────────────────

  // ── Footer ───────────────────────────────────────────────────────

  // ── Testimonials ─────────────────────────────────────────────────

  // ── Common marketing ─────────────────────────────────────────────
} as const;

export type StringKey = keyof typeof STRINGS;

interface LocaleCtx {
  locale: Locale;
  t: (key: StringKey) => string;
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      document.documentElement.lang = l;
      document.cookie = `pp_locale=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } catch {
      // Cookie access may fail in some browser contexts (privacy mode, extensions)
    }
    // The Google Maps JS API fixes its label language at load time, so a page that
    // already shows a Google map must reload to get Bengali/English place names.
    try {
      if ((window as Window & { google?: { maps?: unknown } }).google?.maps) window.location.reload();
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<LocaleCtx>(
    () => ({
      locale,
      setLocale,
      // Defensive: return the key itself if translation is missing (prevents crashes from dynamic keys)
      t: (key: StringKey) => STRINGS[key]?.[locale] ?? key,
    }),
    [locale, setLocale],
  );

  return createElement(Ctx.Provider, { value }, children);
}

export function useLocale(): LocaleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
