import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

/**
 * Bengali/English UI strings — the mobile counterpart of
 * frontend/src/lib/i18n.ts (Bengali-first is EyeOn's differentiator,
 * CLAUDE.md §12.3). Locale persists across launches via SecureStore.
 */
export type Locale = "en" | "bn";

const STORE_KEY = "eyeon.locale";

const STRINGS = {
  // ── Common ────────────────────────────────────────────────────────
  "common.loading": { en: "Loading…", bn: "লোড হচ্ছে…" },
  "common.cancel": { en: "Cancel", bn: "বাতিল" },
  "common.apply": { en: "Apply", bn: "প্রয়োগ করুন" },
  "common.delete": { en: "Delete", bn: "মুছুন" },
  "common.retry": { en: "Retry", bn: "আবার চেষ্টা করুন" },
  "common.all": { en: "All", bn: "সব" },
  "common.today": { en: "Today", bn: "আজ" },
  "common.noData": { en: "No data", bn: "কোনো ডেটা নেই" },
  "common.error": { en: "Error", bn: "ত্রুটি" },
  "common.on": { en: "ON", bn: "চালু" },
  "common.off": { en: "OFF", bn: "বন্ধ" },
  "common.live": { en: "live", bn: "লাইভ" },

  // ── Tabs ──────────────────────────────────────────────────────────
  "tab.home": { en: "Home", bn: "হোম" },
  "tab.map": { en: "Map", bn: "মানচিত্র" },
  "tab.vehicles": { en: "People", bn: "সদস্য" },
  "tab.alerts": { en: "Alerts", bn: "সতর্কতা" },
  "tab.more": { en: "More", bn: "আরও" },
  "more.language": { en: "Language", bn: "ভাষা" },

  // ── Login ─────────────────────────────────────────────────────────
  "auth.signIn": { en: "Sign in", bn: "সাইন ইন" },
  "auth.email": { en: "Email", bn: "ইমেইল" },
  "auth.password": { en: "Password", bn: "পাসওয়ার্ড" },
  "auth.loginFailed": { en: "Invalid email or password", bn: "ভুল ইমেইল বা পাসওয়ার্ড" },
  "auth.signOut": { en: "Sign out", bn: "সাইন আউট" },
  "auth.tagline": { en: "Family safety tracking", bn: "পরিবারের নিরাপত্তায়" },

  // ── Home ──────────────────────────────────────────────────────────
  "home.fleetStatus": { en: "Overview", bn: "সারসংক্ষেপ" },
  "home.alarmsToday": { en: "Alarms today", bn: "আজকের অ্যালার্ম" },
  "home.unacked": { en: "Unacknowledged", bn: "অস্বীকৃত" },
  "home.tripsToday": { en: "Trips today", bn: "আজকের ট্রিপ" },
  "home.fleetDistance": { en: "Distance today", bn: "আজকের দূরত্ব" },
  "home.geofences": { en: "Geofences", bn: "জিও-ফেন্স" },
  "home.vehicleStats": { en: "One person's day", bn: "একজনের আজকের তথ্য" },
  "home.selectVehicle": { en: "Choose a person", bn: "একজনকে বেছে নিন" },
  "home.routeLength": { en: "Distance covered", bn: "মোট পথ" },
  "home.moveDuration": { en: "Move duration", bn: "চলার সময়" },
  "home.idleDuration": { en: "Paused time", bn: "থেমে থাকার সময়" },
  "home.stopDuration": { en: "Time in one place", bn: "এক জায়গায় থাকার সময়" },
  "home.topSpeed": { en: "Top speed", bn: "সর্বোচ্চ গতি" },
  "home.trips": { en: "Trips", bn: "ট্রিপ" },
  "home.loading": { en: "Loading dashboard…", bn: "ড্যাশবোর্ড লোড হচ্ছে…" },
  "home.fleet": { en: "Everyone", bn: "সবাই" },
  "home.geofenceSub": {
    en: "Alerts when someone enters or leaves a zone",
    bn: "কেউ জোনে ঢুকলে বা বের হলে সতর্কতা",
  },
  "home.noVehicles": { en: "No one added yet.", bn: "এখনও কাউকে যোগ করা হয়নি।" },
  "home.loadingToday": { en: "Loading today…", bn: "আজকের তথ্য লোড হচ্ছে…" },
  "home.openVehicle": { en: "See details →", bn: "বিস্তারিত দেখুন →" },

  // ── Motion states ─────────────────────────────────────────────────
  "state.moving": { en: "Moving", bn: "চলছে" },
  "state.idle": { en: "Paused", bn: "থেমে আছে" },
  "state.stopped": { en: "Still", bn: "এক জায়গায়" },
  "state.offline": { en: "Offline", bn: "অফলাইন" },
  "state.overspeed": { en: "Overspeed", bn: "অতিরিক্ত গতি" },

  // ── Vehicles ──────────────────────────────────────────────────────
  "veh.search": { en: "Search by name", bn: "নাম দিয়ে খুঁজুন" },
  "veh.noneMatch": { en: "No one matches.", bn: "কাউকে পাওয়া যায়নি।" },
  "veh.loading": { en: "Loading people…", bn: "সদস্য লোড হচ্ছে…" },
  "veh.ignitionOn": { en: "Ignition ON", bn: "ইগনিশন চালু" },
  "veh.ignitionOff": { en: "Ignition OFF", bn: "ইগনিশন বন্ধ" },
  "veh.lastSeen": { en: "Last seen", bn: "সর্বশেষ দেখা" },
  "veh.parkedFor": { en: "In one place for", bn: "এক জায়গায় আছে" },
  "veh.kmh": { en: "km/h", bn: "কিমি/ঘ" },
  "veh.battery": { en: "Battery", bn: "ব্যাটারি" },
  "veh.noneInAccount": { en: "No one added yet.", bn: "এখনও কাউকে যোগ করা হয়নি।" },

  // ── Subscription ──────────────────────────────────────────────────
  "sub.title": { en: "Subscription", bn: "সাবস্ক্রিপশন" },
  "sub.status": { en: "Status", bn: "অবস্থা" },
  "sub.expiresOn": { en: "Expires on", bn: "মেয়াদ শেষ" },
  "sub.expired": { en: "Subscription expired", bn: "সাবস্ক্রিপশন মেয়াদোত্তীর্ণ" },
  "sub.expiringSoon": { en: "Subscription expires soon", bn: "সাবস্ক্রিপশন শীঘ্রই শেষ হবে" },
  "sub.renewNote": {
    en: "Contact EyeOn to renew and keep tracking.",
    bn: "ট্র্যাকিং চালু রাখতে নবায়নের জন্য EyeOn-এর সাথে যোগাযোগ করুন।",
  },

  // ── Device detail tabs ────────────────────────────────────────────
  "det.track": { en: "Track", bn: "ট্র্যাক" },
  "det.controls": { en: "Controls", bn: "নিয়ন্ত্রণ" },
  "det.calendar": { en: "Calendar", bn: "ক্যালেন্ডার" },
  "det.history": { en: "History", bn: "ইতিহাস" },
  "det.graph": { en: "Graph", bn: "গ্রাফ" },
  "det.stats": { en: "Statistics", bn: "পরিসংখ্যান" },
  "det.noDevice": { en: "No device selected.", bn: "কোনো ডিভাইস নির্বাচিত নয়।" },

  // ── Controls tab ────────────────────────────────────────────────────
  "ctrl.connectionStatus": { en: "Connection Status", bn: "সংযোগ অবস্থা" },
  "ctrl.connected": { en: "Connected", bn: "সংযুক্ত" },
  "ctrl.disconnected": { en: "Disconnected", bn: "সংযোগ বিচ্ছিন্ন" },
  "ctrl.neverConnected": { en: "Never Connected", bn: "কখনো সংযুক্ত হয়নি" },
  "ctrl.motion": { en: "Motion", bn: "গতি" },
  "ctrl.deviceInfo": { en: "Device Information", bn: "ডিভাইস তথ্য" },
  "ctrl.model": { en: "Model", bn: "মডেল" },
  "ctrl.protocol": { en: "Protocol", bn: "প্রোটোকল" },
  "ctrl.sim": { en: "SIM Number", bn: "সিম নম্বর" },
  "ctrl.plate": { en: "Class / ID", bn: "শ্রেণি / আইডি" },
  "ctrl.type": { en: "Type", bn: "ধরন" },
  "ctrl.engineControl": { en: "Engine Control", bn: "ইঞ্জিন নিয়ন্ত্রণ" },
  "ctrl.engineState": { en: "Engine State", bn: "ইঞ্জিন অবস্থা" },
  "ctrl.cutEngine": { en: "Cut Engine", bn: "ইঞ্জিন বন্ধ" },
  "ctrl.restoreEngine": { en: "Restore Engine", bn: "ইঞ্জিন চালু" },
  "ctrl.confirmCutTitle": { en: "Cut Engine?", bn: "ইঞ্জিন বন্ধ করবেন?" },
  "ctrl.confirmCutMsg": { en: "This will immobilize the vehicle immediately. Use only in emergencies.", bn: "এটি সাথে সাথে যানবাহনটি অচল করে দেবে। শুধুমাত্র জরুরি অবস্থায় ব্যবহার করুন।" },
  "ctrl.confirmRebootTitle": { en: "Reboot Device?", bn: "ডিভাইস রিবুট করবেন?" },
  "ctrl.confirmRebootMsg": { en: "The device will restart and reconnect. Tracking will pause briefly.", bn: "ডিভাইসটি পুনরায় চালু হবে এবং পুনরায় সংযুক্ত হবে। ট্র্যাকিং সংক্ষিপ্তভাবে বিরতি নেবে।" },
  "ctrl.commands": { en: "Device Commands", bn: "ডিভাইস কমান্ড" },
  "ctrl.queryLocation": { en: "Query Location", bn: "অবস্থান জানুন" },
  "ctrl.rebootDevice": { en: "Reboot Device", bn: "ডিভাইস রিবুট" },
  "ctrl.reboot": { en: "Reboot", bn: "রিবুট" },
  "ctrl.cmdSent": { en: "Command sent successfully", bn: "কমান্ড সফলভাবে পাঠানো হয়েছে" },
  "ctrl.cmdFailed": { en: "Command failed", bn: "কমান্ড ব্যর্থ হয়েছে" },
  "ctrl.deviceReply": { en: "Device Reply", bn: "ডিভাইস উত্তর" },
  "ctrl.loadingDevice": { en: "Loading device…", bn: "ডিভাইস লোড হচ্ছে…" },
  "ctrl.telemetry": { en: "Technical Details", bn: "প্রযুক্তিগত বিবরণ" },
  "ctrl.engineNote": { en: "Sends GT06 DYD/HFYD command. Requires the vehicle to be stationary.", bn: "GT06 DYD/HFYD কমান্ড পাঠায়। যানবাহন স্থির থাকা প্রয়োজন।" },
  "ctrl.disclaimer": { en: "Commands require active cellular connection. Response may take up to 30 seconds.", bn: "কমান্ডের জন্য সক্রিয় সেলুলার সংযোগ প্রয়োজন। উত্তর আসতে ৩০ সেকেন্ড পর্যন্ত লাগতে পারে।" },

  // ── Track tab ─────────────────────────────────────────────────────
  "track.engine": { en: "Engine", bn: "ইঞ্জিন" },
  "track.locked": { en: "Locked", bn: "লক করা" },
  "track.unlocked": { en: "Unlocked", bn: "আনলক" },
  "track.cutEngine": { en: "Cut engine", bn: "ইঞ্জিন বন্ধ করুন" },
  "track.restore": { en: "Restore", bn: "চালু করুন" },
  "track.confirmCutTitle": { en: "Cut the engine?", bn: "ইঞ্জিন বন্ধ করবেন?" },
  "track.confirmRestoreTitle": { en: "Restore the engine?", bn: "ইঞ্জিন চালু করবেন?" },
  "track.ignition": { en: "Ignition", bn: "ইগনিশন" },
  "track.voltage": { en: "Voltage", bn: "ভোল্টেজ" },
  "track.course": { en: "Course", bn: "দিক" },
  "track.loadingDevice": { en: "Loading device…", bn: "ডিভাইস লোড হচ্ছে…" },
  "track.telemetry": { en: "Telemetry", bn: "টেলিমেট্রি" },
  "track.gpsSats": { en: "GPS sats", bn: "GPS স্যাটেলাইট" },
  "track.fix": { en: "Fix", bn: "GPS ফিক্স" },
  "track.fixValid": { en: "Valid", bn: "বৈধ" },
  "track.fixInvalid": { en: "Invalid", bn: "অবৈধ" },
  "track.engineControl": { en: "Engine control", bn: "ইঞ্জিন নিয়ন্ত্রণ" },
  "track.currentState": { en: "Current state", bn: "বর্তমান অবস্থা" },
  "track.restoreEngine": { en: "Restore engine", bn: "ইঞ্জিন চালু করুন" },
  "track.confirmCutMsg": {
    en: "This immobilises the vehicle immediately.",
    bn: "এটি সাথে সাথে যানবাহনটি অচল করে দেবে।",
  },
  "track.confirmRestoreMsg": { en: "This re-enables the engine.", bn: "এটি ইঞ্জিন পুনরায় সচল করবে।" },
  "track.cmdSent": { en: "Command sent", bn: "কমান্ড পাঠানো হয়েছে" },
  "track.cmdFailed": { en: "Command failed", bn: "কমান্ড ব্যর্থ হয়েছে" },
  "track.gt06Note": {
    en: "Sends GT06 DYD / HFYD to the device (default password). Reply is shown when the device answers.",
    bn: "ডিভাইসে GT06 DYD / HFYD কমান্ড পাঠানো হয় (ডিফল্ট পাসওয়ার্ড)। ডিভাইস উত্তর দিলে জবাব দেখানো হয়।",
  },

  // ── History tab ───────────────────────────────────────────────────
  "hist.noTrips": { en: "No trips in this range.", bn: "এই সময়ে কোনো ট্রিপ নেই।" },
  "hist.selectRange": { en: "Select date range", bn: "তারিখ নির্বাচন করুন" },
  "hist.distance": { en: "Distance", bn: "দূরত্ব" },
  "hist.duration": { en: "Duration", bn: "সময়কাল" },
  "hist.maxSpeed": { en: "Max speed", bn: "সর্বোচ্চ গতি" },
  "hist.avgSpeed": { en: "Avg speed", bn: "গড় গতি" },
  "hist.change": { en: "Change", bn: "পরিবর্তন" },
  "hist.selectTrip": {
    en: "Select a trip below to replay it on the map.",
    bn: "মানচিত্রে রিপ্লে দেখতে নিচের একটি ট্রিপ নির্বাচন করুন।",
  },
  "hist.loadingTrips": { en: "Loading trips…", bn: "ট্রিপ লোড হচ্ছে…" },
  "hist.loadingRoute": { en: "Loading route…", bn: "রুট লোড হচ্ছে…" },
  "hist.max": { en: "Max", bn: "সর্বোচ্চ" },
  "hist.avg": { en: "Avg", bn: "গড়" },
  "hist.start": { en: "Start", bn: "শুরু" },
  "hist.end": { en: "End", bn: "শেষ" },

  // ── Calendar tab (daily mileage) ──────────────────────────────────
  "cal.dailyMileage": { en: "Daily distance", bn: "প্রতিদিনের দূরত্ব" },
  "cal.tapDay": { en: "Tap a day to see its summary.", bn: "সারাংশ দেখতে একটি দিনে চাপুন।" },
  "cal.monthTotal": { en: "Month total", bn: "মাসের মোট" },
  "cal.startTime": { en: "Start time", bn: "শুরুর সময়" },
  "cal.endTime": { en: "End time", bn: "শেষের সময়" },
  "cal.tapRange": {
    en: "Tap a day, then a second day for a range.",
    bn: "একটি দিনে চাপুন, রেঞ্জের জন্য দ্বিতীয় আরেকটি দিনে চাপুন।",
  },

  // ── Graph tab ─────────────────────────────────────────────────────
  "graph.speed": { en: "Speed", bn: "গতি" },
  "graph.voltage": { en: "Voltage", bn: "ভোল্টেজ" },
  "graph.noData": { en: "No data for this day yet", bn: "এই দিনের জন্য এখনও ডেটা নেই" },

  // ── Alerts ────────────────────────────────────────────────────────
  "alerts.acknowledge": { en: "Acknowledge", bn: "স্বীকার করুন" },
  "alerts.none": { en: "No alarms.", bn: "কোনো অ্যালার্ম নেই।" },
  "alerts.unackedOnly": { en: "Unacknowledged only", bn: "শুধু অস্বীকৃত" },
  "alerts.loading": { en: "Loading alerts…", bn: "সতর্কতা লোড হচ্ছে…" },
  "alerts.acked": { en: "Acknowledged", bn: "স্বীকৃত" },
  "alerts.disclaimer": {
    en: "Some alerts may be delayed due to GPS coverage, network, or battery conditions.",
    bn: "GPS কভারেজ, নেটওয়ার্ক বা ব্যাটারির কারণে কিছু সতর্কতা দেরিতে পৌঁছাতে পারে।",
  },

  // ── Geofences ─────────────────────────────────────────────────────
  "geo.title": { en: "Geofences", bn: "জিও-ফেন্স" },
  "geo.new": { en: "New geofence", bn: "নতুন জিও-ফেন্স" },
  "geo.none": { en: "No geofences yet.", bn: "এখনও কোনো জিও-ফেন্স নেই।" },
  "geo.createHint": {
    en: "Create one to get zone entry/exit alerts.",
    bn: "জোনে প্রবেশ/প্রস্থান সতর্কতা পেতে একটি তৈরি করুন।",
  },
  "geo.onEnter": { en: "on enter", bn: "প্রবেশে" },
  "geo.onExit": { en: "on exit", bn: "প্রস্থানে" },
  "geo.enterExit": { en: "Enter + exit", bn: "প্রবেশ + প্রস্থান" },
  "geo.enterOnly": { en: "Enter only", bn: "শুধু প্রবেশ" },
  "geo.exitOnly": { en: "Exit only", bn: "শুধু প্রস্থান" },
  "geo.circle": { en: "Circle", bn: "বৃত্ত" },
  "geo.polygon": { en: "Polygon", bn: "বহুভুজ" },
  "geo.radius": { en: "Radius", bn: "ব্যাসার্ধ" },
  "geo.points": { en: "points", bn: "বিন্দু" },
  "geo.active": { en: "Active", bn: "সক্রিয়" },
  "geo.off": { en: "Off", bn: "বন্ধ" },
  "geo.deleteTitle": { en: "Delete geofence?", bn: "জিও-ফেন্স মুছবেন?" },
  "geo.deleteMsg": { en: "will stop firing alerts.", bn: "আর সতর্কতা পাঠাবে না।" },
  "geo.name": { en: "Name", bn: "নাম" },
  "geo.namePlaceholder": { en: "e.g. Playground", bn: "যেমন: খেলার মাঠ" },
  "geo.notify": { en: "Notify", bn: "বিজ্ঞপ্তি" },
  "geo.watchVehicles": { en: "Who is this for?", bn: "কার জন্য?" },
  "geo.create": { en: "Create geofence", bn: "জিও-ফেন্স তৈরি করুন" },
  "geo.tapCenter": {
    en: "Tap the map to place the zone center",
    bn: "জোনের কেন্দ্র বসাতে মানচিত্রে চাপুন",
  },
  "geo.centerSet": { en: "Center set", bn: "কেন্দ্র নির্ধারিত" },
  "geo.errName": { en: "Give the geofence a name.", bn: "জিও-ফেন্সের একটি নাম দিন।" },
  "geo.errVehicles": {
    en: "Choose at least one person.",
    bn: "অন্তত একজনকে বেছে নিন।",
  },

  "geo.noAlerts": { en: "alerts off", bn: "অ্যালার্ট বন্ধ" },

  // ── Day history (route playback + timeline; EyeOn has no trips) ───
  "hist.timeline": { en: "Timeline", bn: "সারাদিনের তথ্য" },
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

  // ── Trusted places ────────────────────────────────────────────────
  "home.places": { en: "Trusted places", bn: "বিশ্বস্ত জায়গা" },
  "place.add": { en: "Add a place", bn: "নতুন জায়গা যোগ করুন" },
  "place.edit": { en: "Edit place", bn: "জায়গা সম্পাদনা" },
  "place.none": { en: "No trusted places yet.", bn: "এখনও কোনো বিশ্বস্ত জায়গা নেই।" },
  "place.noneHint": {
    en: "Add Home or School and we will tell you when they arrive and when they leave.",
    bn: "বাসা বা স্কুল যোগ করুন — পৌঁছালে ও বের হলে আমরা জানিয়ে দেব।",
  },
  "place.whatKind": { en: "What kind of place?", bn: "এটা কোন ধরনের জায়গা?" },
  "place.type.HOME": { en: "Home", bn: "বাসা" },
  "place.type.SCHOOL": { en: "School", bn: "স্কুল" },
  "place.type.COACHING": { en: "Coaching", bn: "কোচিং" },
  "place.type.MOSQUE": { en: "Mosque", bn: "মসজিদ" },
  "place.type.HOSPITAL": { en: "Hospital", bn: "হাসপাতাল" },
  "place.type.RELATIVE": { en: "Relative's home", bn: "আত্মীয়ের বাসা" },
  "place.type.OTHER": { en: "Other", bn: "অন্যান্য" },
  "place.name": { en: "Name of the place", bn: "জায়গার নাম" },
  "place.tapMap": { en: "Tap the map to drop the pin", bn: "পিন বসাতে ম্যাপে ট্যাপ করুন" },
  "place.pinSet": { en: "Pin placed", bn: "পিন বসানো হয়েছে" },
  "place.useCurrent": { en: "Or use where they are right now:", bn: "অথবা এখন যেখানে আছে সেটাই ব্যবহার করুন:" },
  "place.size": { en: "How big is the area?", bn: "এলাকাটা কত বড়?" },
  "place.sizeHint": {
    en: "Cover the whole building and its gate. Very small areas cause false alerts indoors.",
    bn: "পুরো ভবন ও গেট যেন ভেতরে থাকে। খুব ছোট এলাকায় ঘরের ভেতরে ভুল অ্যালার্ট আসতে পারে।",
  },
  "place.tellMe": { en: "Tell me when they", bn: "কখন জানাব?" },
  "place.arrive": { en: "Arrive", bn: "পৌঁছালে" },
  "place.leave": { en: "Leave", bn: "বের হলে" },
  "place.who": { en: "Who is this for?", bn: "কার জন্য?" },
  "place.save": { en: "Save place", bn: "জায়গা সেভ করুন" },
  "place.saveChanges": { en: "Save changes", bn: "পরিবর্তন সেভ করুন" },
  "place.errPin": { en: "Drop a pin on the map first.", bn: "আগে ম্যাপে পিন বসান।" },
  "place.errWho": { en: "Choose at least one person.", bn: "অন্তত একজনকে বেছে নিন।" },
  "place.deleteTitle": { en: "Remove this place?", bn: "জায়গাটি মুছবেন?" },
  "place.deleteMsg": { en: "You will stop getting alerts for it.", bn: "এর জন্য আর অ্যালার্ট আসবে না।" },
  "place.alerts.BOTH": { en: "Alerts: arrive and leave", bn: "অ্যালার্ট: পৌঁছালে ও বের হলে" },
  "place.alerts.ENTER": { en: "Alerts: arrive only", bn: "অ্যালার্ট: শুধু পৌঁছালে" },
  "place.alerts.EXIT": { en: "Alerts: leave only", bn: "অ্যালার্ট: শুধু বের হলে" },
  "place.alerts.NONE": { en: "Alerts off", bn: "অ্যালার্ট বন্ধ" },

  // ── Alert labels for zone events ──────────────────────────────────
  "alarm.PLACE_ARRIVED": { en: "Arrived", bn: "পৌঁছানো" },
  "alarm.PLACE_LEFT": { en: "Left", bn: "বের হওয়া" },
  "alarm.GEOFENCE_EXIT": { en: "Outside safe area", bn: "নিরাপদ এলাকার বাইরে" },
  "alarm.GEOFENCE_ENTER": { en: "Back in safe area", bn: "আবার নিরাপদ এলাকায়" },

  // ── Map ───────────────────────────────────────────────────────────
  "map.traffic": { en: "Traffic", bn: "ট্রাফিক" },
  "map.refresh": { en: "Refresh", bn: "রিফ্রেশ" },
  "map.fitAll": { en: "Fit All", bn: "সব দেখুন" },
  "map.locateMe": { en: "Locate Me", bn: "আমার অবস্থান" },
  "map.view": { en: "Map View", bn: "মানচিত্র ভিউ" },
  "map.normal": { en: "Normal", bn: "সাধারণ" },
  "map.satellite": { en: "Satellite", bn: "স্যাটেলাইট" },

  // ── Statistics tab ────────────────────────────────────────────────
  "stats.loading": { en: "Loading statistics…", bn: "পরিসংখ্যান লোড হচ্ছে…" },
  "stats.today": { en: "Today (Asia/Dhaka)", bn: "আজ (ঢাকা সময়)" },
  "stats.current": { en: "Current", bn: "বর্তমান" },
  "stats.odometer": { en: "Total distance", bn: "মোট দূরত্ব" },
  "stats.engineHours": { en: "Engine hrs", bn: "ইঞ্জিন ঘণ্টা" },
  "stats.location": { en: "Location", bn: "অবস্থান" },
  "stats.deviceHealth": { en: "Device health", bn: "ডিভাইসের স্বাস্থ্য" },
  "stats.serverTime": { en: "Server time", bn: "সার্ভার সময়" },
  "stats.expired": { en: "expired", bn: "মেয়াদোত্তীর্ণ" },
  "stats.days": { en: "days", bn: "দিন" },

  // ── Date-range presets ────────────────────────────────────────────
  "preset.today": { en: "Today", bn: "আজ" },
  "preset.yesterday": { en: "Yesterday", bn: "গতকাল" },
  "preset.thisWeek": { en: "This Week", bn: "এই সপ্তাহ" },
  "preset.lastWeek": { en: "Last Week", bn: "গত সপ্তাহ" },
  "preset.last7": { en: "Last 7 Days", bn: "শেষ ৭ দিন" },
  "preset.last30": { en: "Last 30 Days", bn: "শেষ ৩০ দিন" },
} as const;

export type StringKey = keyof typeof STRINGS;

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (k: StringKey) => string;
}

const LocaleContext = createContext<LocaleCtx>({
  locale: "en",
  setLocale: () => {},
  t: (k) => STRINGS[k].en,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Bengali first: the product promise is a fully Bengali app. A saved choice still wins.
  const [locale, setLocaleState] = useState<Locale>("bn");

  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY)
      .then((v) => {
        if (v === "bn" || v === "en") setLocaleState(v);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<LocaleCtx>(
    () => ({
      locale,
      setLocale: (l: Locale) => {
        setLocaleState(l);
        SecureStore.setItemAsync(STORE_KEY, l).catch(() => {});
      },
      t: (k: StringKey) => STRINGS[k][locale],
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleCtx {
  return useContext(LocaleContext);
}
