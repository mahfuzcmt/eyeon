"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "en" | "bn";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<string, { en: string; bn: string }> = {
  /*
   * EyeOn marketing copy - child-safety tracker for families and schools.
   *
   * Honesty rules for anyone editing this file: EyeOn is a new product. Do not add
   * customer counts, named clients, certifications, prices, battery-hour figures,
   * accuracy figures or "best / top" claims unless the business owner has supplied
   * the real fact. The only verified contact detail is the pre-order phone number
   * (see shared.tsx).
   */

  // Navigation
  "nav.home": { en: "Home", bn: "হোম" },
  "nav.features": { en: "Features", bn: "ফিচার" },
  "nav.products": { en: "The tracker", bn: "ট্র্যাকার" },
  "nav.solutions": { en: "Who it's for", bn: "কাদের জন্য" },
  "nav.pricing": { en: "Price & pre-order", bn: "দাম ও প্রি-অর্ডার" },
  "nav.about": { en: "About", bn: "আমাদের কথা" },
  "nav.contact": { en: "Contact", bn: "যোগাযোগ" },
  "nav.signIn": { en: "Sign in", bn: "লগ ইন" },
  "nav.preorder": { en: "Pre-order", bn: "প্রি-অর্ডার করুন" },
  "nav.openMenu": { en: "Open menu", bn: "মেনু খুলুন" },
  "nav.closeMenu": { en: "Close menu", bn: "মেনু বন্ধ করুন" },

  // Top contact bar
  "topBar.tagline": { en: "Child-safety tracker · Pre-orders open", bn: "শিশু নিরাপত্তা ট্র্যাকার · প্রি-অর্ডার চলছে" },
  "topBar.short": { en: "Pre-orders open", bn: "প্রি-অর্ডার চলছে" },
  "topBar.callNow": { en: "Call", bn: "কল করুন" },

  // WhatsApp floating button
  "whatsapp.tooltip": { en: "Questions? Message us on WhatsApp.", bn: "কোনো প্রশ্ন? WhatsApp-এ লিখুন।" },
  "whatsapp.message": { en: "Hello! I would like to know about the EyeOn tracker.", bn: "হ্যালো! EyeOn ট্র্যাকার সম্পর্কে জানতে চাই।" },
  "whatsapp.aria": { en: "Chat with us on WhatsApp", bn: "WhatsApp-এ আমাদের সঙ্গে কথা বলুন" },
  "whatsapp.dismiss": { en: "Dismiss", bn: "বন্ধ করুন" },

  // Hero
  "hero.badge": { en: "Child-safety tracker · Pre-orders open", bn: "শিশু নিরাপত্তা ট্র্যাকার · প্রি-অর্ডার চলছে" },
  "hero.title1": { en: "Keep an eye on them,", bn: "চোখে চোখে রাখুন," },
  "hero.title2": { en: "wherever they are.", bn: "ও যেখানেই থাকুক।" },
  "hero.desc": {
    en: "A small tracker in the school bag, around the neck or on the wrist - and everything else on your phone. See where your child is, and get told the moment they reach school and the moment they leave.",
    bn: "স্কুলব্যাগে, গলায় বা হাতে ছোট্ট একটি ট্র্যাকার - আর বাকি সব আপনার ফোনে। সন্তান কোথায় আছে দেখুন, স্কুলে পৌঁছানো আর বের হওয়ার খবর পান সঙ্গে সঙ্গে।",
  },
  "hero.howItWorks": { en: "See how it works", bn: "কীভাবে কাজ করে দেখুন" },

  // Hero phone illustration (clearly labelled as an example)
  "mock.caption": { en: "Example of the alerts you get", bn: "যেমন অ্যালার্ট আপনি পাবেন - উদাহরণ" },
  "mock.live": { en: "Live", bn: "লাইভ" },
  "mock.safeZone": { en: "Safe zone: School", bn: "সেফ জোন: স্কুল" },
  "mock.now": { en: "now", bn: "এইমাত্র" },
  "mock.n1": { en: "📍 Rafi is at School · 8:02 AM", bn: "📍 রাফি এখন স্কুল-এ · সকাল ৮:০২" },
  "mock.n2": { en: "🚶 Rafi left School · 1:10 PM", bn: "🚶 রাফি স্কুল থেকে বের হয়েছে · দুপুর ১:১০" },
  "mock.n3": { en: "🏠 Rafi reached Home · 1:45 PM", bn: "🏠 রাফি বাসায় পৌঁছেছে · দুপুর ১:৪৫" },

  // Product facts band (facts only - no numbers we do not have)
  "facts.1": { en: "Bengali + English app", bn: "বাংলা + ইংরেজি অ্যাপ" },
  "facts.2": { en: "Phone app + web dashboard", bn: "মোবাইল অ্যাপ + ওয়েব ড্যাশবোর্ড" },
  "facts.3": { en: "SOS with location", bn: "লোকেশনসহ SOS" },
  "facts.4": { en: "Arrive / leave alerts", bn: "পৌঁছানো ও বের হওয়ার অ্যালার্ট" },

  // Features section (home) - the eight features from the product poster
  "features.badge": { en: "What it does", bn: "যা যা পাবেন" },
  "features.title": { en: "One small tracker, eight useful things", bn: "ছোট্ট একটি ট্র্যাকার, কাজের আটটি ফিচার" },
  "features.desc": { en: "Everything is in the app, in plain Bengali.", bn: "সবকিছু অ্যাপেই, সহজ বাংলায়।" },
  "features.viewAll": { en: "See the features in detail", bn: "ফিচারগুলো বিস্তারিত দেখুন" },

  "feature.live.title": { en: "Live location", bn: "লাইভ লোকেশন" },
  "feature.live.desc": { en: "See where they are right now, on the map.", bn: "ম্যাপে দেখুন এখন কোথায় আছে।" },
  "feature.live.detail": {
    en: "Open the app and the map shows the tracker's current position. While they are on the move, the position keeps updating on its own.",
    bn: "অ্যাপ খুললেই ম্যাপে ট্র্যাকারের বর্তমান অবস্থান দেখা যায়। চলার পথে অবস্থান নিজে থেকেই আপডেট হতে থাকে।",
  },
  "feature.safezone.title": { en: "Safe zone alerts", bn: "সেফ জোন অ্যালার্ট" },
  "feature.safezone.desc": { en: "A notification the moment they arrive at school, and the moment they leave.", bn: "স্কুলে পৌঁছানো মাত্র আর বের হওয়া মাত্র নোটিফিকেশন।" },
  "feature.safezone.detail": {
    en: "Save Home, School and other trusted places once. After that you are told about every arrival and every departure - no need to keep checking the map.",
    bn: "বাসা, স্কুল বা অন্য বিশ্বস্ত জায়গা একবার সেভ করে রাখুন। এরপর প্রতিবার পৌঁছানো আর বের হওয়ার খবর নিজে থেকেই চলে আসবে - বারবার ম্যাপ দেখতে হবে না।",
  },
  "feature.geofence.title": { en: "Geofence", bn: "জিওফেন্স" },
  "feature.geofence.desc": { en: "Draw your own boundary; get an alert if they go outside it.", bn: "নিজের মতো সীমানা আঁকুন, বাইরে গেলেই অ্যালার্ট।" },
  "feature.geofence.detail": {
    en: "Draw a boundary on the map around the neighbourhood, the playground or the way to school. If the tracker crosses it, you get an alert.",
    bn: "ম্যাপে পাড়া, খেলার মাঠ বা স্কুলের পথ ঘিরে সীমানা এঁকে দিন। ট্র্যাকার সেই সীমানার বাইরে গেলেই অ্যালার্ট পাবেন।",
  },
  "feature.sos.title": { en: "SOS button", bn: "SOS বাটন" },
  "feature.sos.desc": { en: "One press sends an urgent alert with the location.", bn: "এক চাপেই লোকেশনসহ জরুরি অ্যালার্ট।" },
  "feature.sos.detail": {
    en: "The tracker has an SOS button. One press sends an urgent alert to your phone, together with the location at that moment. Teach your child when to press it.",
    bn: "ট্র্যাকারে একটি SOS বাটন আছে। একবার চাপলেই সেই মুহূর্তের লোকেশনসহ জরুরি অ্যালার্ট আপনার ফোনে চলে আসে। কখন বাটনটি চাপতে হবে, সন্তানকে শিখিয়ে দিন।",
  },
  "feature.history.title": { en: "Route history", bn: "যাত্রাপথ হিস্ট্রি" },
  "feature.history.desc": { en: "Where they were through the day, at a glance.", bn: "সারাদিন কোথায় কোথায় ছিল, এক নজরে।" },
  "feature.history.detail": {
    en: "Look back over the day: which way they went, where they stopped, when they got home.",
    bn: "দিন শেষে ফিরে দেখুন - কোন পথে যাওয়া হয়েছে, কোথায় থামা হয়েছে, কখন বাসায় ফেরা হয়েছে।",
  },
  "feature.battery.title": { en: "Long battery", bn: "লম্বা ব্যাটারি" },
  "feature.battery.desc": { en: "A day on one charge.", bn: "এক চার্জে সারাদিন।" },
  "feature.battery.detail": {
    en: "With normal use the tracker lasts about a day. Charge it at night, like a phone.",
    bn: "স্বাভাবিক ব্যবহারে এক চার্জে প্রায় সারাদিন চলে। ফোনের মতো রাতে চার্জে দিয়ে রাখলেই হবে।",
  },
  "feature.small.title": { en: "Small and light", bn: "ছোট ও হালকা" },
  "feature.small.desc": { en: "They hardly notice it.", bn: "ও টেরই পাবে না।" },
  "feature.small.detail": {
    en: "Small enough for a lanyard, a bag pocket or the wrist. Light enough that a child forgets it is there.",
    bn: "গলার ফিতায়, ব্যাগের পকেটে বা হাতে - যেভাবে সুবিধা। এত হালকা যে সঙ্গে আছে বলে মনেই থাকে না।",
  },
  "feature.bangla.title": { en: "Fully Bengali app", bn: "সম্পূর্ণ বাংলা অ্যাপ" },
  "feature.bangla.desc": { en: "Simple and clear - anyone can use it.", bn: "সহজ, পরিষ্কার - যে কেউ ব্যবহার করতে পারবেন।" },
  "feature.bangla.detail": {
    en: "Every screen and every alert is in Bengali, with English one tap away. Made so that grandparents can use it as easily as parents.",
    bn: "প্রতিটি স্ক্রিন, প্রতিটি অ্যালার্ট বাংলায়; চাইলে এক ট্যাপে ইংরেজি। মা-বাবার মতো দাদা-দাদি, নানা-নানিও সহজে ব্যবহার করতে পারবেন।",
  },

  // How it works
  "how.badge": { en: "How it works", bn: "কীভাবে কাজ করে" },
  "how.title": { en: "Three steps, and you are set", bn: "তিন ধাপেই শুরু" },
  "how.step1.title": { en: "Give them the tracker", bn: "ট্র্যাকারটি সঙ্গে দিন" },
  "how.step1.desc": { en: "Put it in the school bag, on a lanyard or on the wrist.", bn: "স্কুলব্যাগে রাখুন, গলায় ঝুলিয়ে দিন বা হাতে পরিয়ে দিন।" },
  "how.step2.title": { en: "Add Home and School", bn: "বাসা ও স্কুল যোগ করুন" },
  "how.step2.desc": { en: "Save them in the app as trusted places.", bn: "অ্যাপে বিশ্বস্ত জায়গা হিসেবে সেভ করে রাখুন।" },
  "how.step3.title": { en: "Get notified", bn: "খবর পান নিজে থেকেই" },
  "how.step3.desc": { en: "Arrivals, departures and SOS come straight to your phone.", bn: "পৌঁছানো, বের হওয়া আর SOS - সব খবর সরাসরি আপনার ফোনে।" },

  // Built for schools and families
  "audience.badge": { en: "Who it's for", bn: "কাদের জন্য" },
  "audience.title": { en: "Built for schools and families", bn: "স্কুল আর পরিবারের জন্য তৈরি" },
  "audience.desc": {
    en: "EyeOn is new, so you will not find a wall of logos here. Instead, here is who we built it for.",
    bn: "EyeOn একদম নতুন, তাই এখানে লোগোর সারি নেই। বরং বলি, কাদের কথা ভেবে এটি বানানো।",
  },
  "audience.parents.title": { en: "Parents", bn: "মা-বাবা" },
  "audience.parents.desc": { en: "Know your child reached school and came home, without phoning anyone.", bn: "কাউকে ফোন না করেই জানুন সন্তান স্কুলে পৌঁছেছে, বাসায় ফিরেছে।" },
  "audience.schools.title": { en: "Schools", bn: "স্কুল" },
  "audience.schools.desc": {
    en: "Give trackers to students. The school sees everyone on one dashboard; each parent follows only their own child.",
    bn: "শিক্ষার্থীদের ট্র্যাকার দিন। স্কুল সবাইকে দেখবে এক ড্যাশবোর্ডে; প্রত্যেক অভিভাবক দেখবেন শুধু নিজের সন্তানকে।",
  },
  "audience.coaching.title": { en: "Coaching centres", bn: "কোচিং সেন্টার" },
  "audience.coaching.desc": {
    en: "Evening batches finish late. Parents are told when their child arrives and when they leave.",
    bn: "সন্ধ্যার ব্যাচ শেষ হতে দেরি হয়। সন্তান কখন পৌঁছাল, কখন বের হলো - অভিভাবক জানতে পারবেন।",
  },
  "audience.madrasa.title": { en: "Madrasas", bn: "মাদ্রাসা" },
  "audience.madrasa.desc": {
    en: "Arrival, departure and SOS alerts for guardians, for day and residential students alike.",
    bn: "আবাসিক হোক বা অনাবাসিক - পৌঁছানো, বের হওয়া আর SOS-এর খবর যাবে অভিভাবকের কাছে।",
  },
  "audience.daycare.title": { en: "Day-care centres", bn: "ডে-কেয়ার সেন্টার" },
  "audience.daycare.desc": { en: "Working parents can see that their little one is where they should be.", bn: "কর্মজীবী মা-বাবা দেখে নিতে পারেন - ছোট্ট সোনামণি ঠিক জায়গাতেই আছে।" },
  "audience.elderly.title": { en: "Elderly parents", bn: "বয়স্ক মা-বাবা" },
  "audience.elderly.desc": {
    en: "For a parent who goes out alone: live location, and an SOS button within reach.",
    bn: "যাঁরা একা বাইরে যান, তাঁদের জন্য লাইভ লোকেশন আর হাতের কাছে SOS বাটন।",
  },

  // Rendered only when PARTNER_SCHOOLS (HomePage.tsx) is non-empty
  "partners.title": { en: "Schools using EyeOn", bn: "যেসব স্কুল EyeOn ব্যবহার করছে" },

  // Schools block
  "school.badge": { en: "For schools", bn: "স্কুলের জন্য" },
  "school.title": { en: "What a school gets", bn: "একটি স্কুল যা যা পায়" },
  "school.desc": {
    en: "Give trackers to your students. The school sees everyone; each parent sees only their own child.",
    bn: "শিক্ষার্থীদের হাতে ট্র্যাকার দিন। স্কুল দেখবে সবাইকে, আর প্রত্যেক অভিভাবক দেখবেন শুধু নিজের সন্তানকে।",
  },
  "school.s1.title": { en: "One dashboard for all students", bn: "সব শিক্ষার্থী এক ড্যাশবোর্ডে" },
  "school.s1.desc": { en: "The principal or administrator sees every tracker on one web dashboard.", bn: "প্রধান শিক্ষক বা প্রশাসক একটি ওয়েব ড্যাশবোর্ডেই সব ট্র্যাকার দেখতে পান।" },
  "school.s2.title": { en: "Each parent sees only their child", bn: "অভিভাবক দেখেন শুধু নিজের সন্তানকে" },
  "school.s2.desc": { en: "A parent's login shows their own child and nobody else's.", bn: "অভিভাবকের লগ ইনে শুধু নিজের সন্তানকেই দেখা যায়, অন্য কাউকে নয়।" },
  "school.s3.title": { en: "Arrive / leave alerts", bn: "পৌঁছানো ও বের হওয়ার অ্যালার্ট" },
  "school.s3.desc": {
    en: "Set the school as a safe zone once; parents are told when their child arrives and leaves.",
    bn: "স্কুলকে একবার সেফ জোন করে দিন; সন্তান পৌঁছালে ও বের হলে অভিভাবক খবর পাবেন।",
  },
  "school.s4.title": { en: "SOS with location", bn: "লোকেশনসহ SOS" },
  "school.s4.desc": { en: "When a student presses SOS, an urgent alert goes out with the location.", bn: "কোনো শিক্ষার্থী SOS চাপলে লোকেশনসহ জরুরি অ্যালার্ট চলে যায়।" },
  "school.cta": { en: "Talk to us about your school", bn: "আপনার স্কুলের জন্য কথা বলুন" },
  "school.mock.title": { en: "School dashboard", bn: "স্কুল ড্যাশবোর্ড" },
  "school.mock.caption": { en: "Illustration, not real data", bn: "প্রতীকী ছবি, আসল তথ্য নয়" },
  "school.mock.inSchool": { en: "At school", bn: "স্কুলে আছে" },
  "school.mock.onTheWay": { en: "On the way", bn: "পথে আছে" },
  "school.mock.student": { en: "Student", bn: "শিক্ষার্থী" },

  // Why EyeOn
  "why.badge": { en: "Why EyeOn", bn: "কেন EyeOn" },
  "why.title": { en: "Made for parents here", bn: "এ দেশের মা-বাবার জন্যই বানানো" },
  "why.desc": { en: "Four things we cared about while building it.", bn: "বানানোর সময় চারটি বিষয়ে আমরা জোর দিয়েছি।" },
  "why.bangla.title": { en: "Bengali first", bn: "আগে বাংলা" },
  "why.bangla.desc": { en: "The app opens in Bengali. English is there if you prefer it.", bn: "অ্যাপ খুললেই বাংলা। চাইলে ইংরেজিও আছে।" },
  "why.simple.title": { en: "Simple by design", bn: "সহজ করে বানানো" },
  "why.simple.desc": { en: "Big buttons, clear words, no maze of settings.", bn: "বড় বাটন, পরিষ্কার লেখা, জটিল সেটিংস নেই।" },
  "why.private.title": { en: "Only you can see", bn: "দেখবেন শুধু আপনিই" },
  "why.private.desc": {
    en: "Location is shown only to the people you add to your account.",
    bn: "লোকেশন দেখতে পান শুধু তাঁরাই, যাঁদের আপনি নিজের অ্যাকাউন্টে যুক্ত করেছেন।",
  },
  "why.support.title": { en: "Support in Bengali", bn: "বাংলায় সাপোর্ট" },
  "why.support.desc": { en: "Call or message us and talk to someone in Bengali.", bn: "কল বা মেসেজ করুন - কথা হবে বাংলায়।" },

  // Testimonials - headings only. The quotes live in TestimonialsSection.tsx and
  // the section renders nothing while that list is empty.
  "testimonials.badge": { en: "In their words", bn: "তাঁদের কথায়" },
  "testimonials.title": { en: "What parents and schools say", bn: "অভিভাবক ও স্কুল যা বলছেন" },

  // FAQ
  "faq.badge": { en: "Questions", bn: "প্রশ্নোত্তর" },
  "faq.title": { en: "What parents and schools ask", bn: "মা-বাবা আর স্কুল যা জানতে চান" },
  "faq.desc": { en: "Straight answers. If your question is not here, call us.", bn: "সোজাসাপ্টা উত্তর। আপনার প্রশ্ন এখানে না থাকলে কল করুন।" },
  "faq.moreQuestions": { en: "Have another question?", bn: "আরও প্রশ্ন আছে?" },
  "faq.callUs": { en: "Call", bn: "কল করুন" },
  "faq.q1": { en: "Does the tracker need a SIM?", bn: "ট্র্যাকারে কি সিম লাগে?" },
  "faq.a1": {
    en: "Yes. The tracker sends its location over the mobile network, so it needs a SIM with a data pack. When you pre-order we will tell you which SIM works and help you set it up.",
    bn: "হ্যাঁ। ট্র্যাকার মোবাইল নেটওয়ার্ক দিয়ে লোকেশন পাঠায়, তাই এতে ডেটা প্যাকসহ একটি সিম লাগে। প্রি-অর্ডারের সময় আমরা জানিয়ে দেব কোন সিম চলবে, আর সেটআপেও সাহায্য করব।",
  },
  "faq.q2": { en: "How long does the battery last?", bn: "ব্যাটারি কতক্ষণ চলে?" },
  "faq.a2": {
    en: "About a day of normal use. Charge it at night, like a phone.",
    bn: "স্বাভাবিক ব্যবহারে প্রায় এক দিন। ফোনের মতো রাতে চার্জে দিয়ে রাখুন।",
  },
  "faq.q3": { en: "Is my child's location private?", bn: "আমার সন্তানের লোকেশন কি গোপন থাকে?" },
  "faq.a3": {
    en: "Only people signed in to your account can see the location. If the tracker comes through a school, the school's administrator sees its own students, and each parent sees only their own child.",
    bn: "লোকেশন দেখতে পান শুধু তাঁরাই, যাঁরা আপনার অ্যাকাউন্টে লগ ইন করা। ট্র্যাকার স্কুলের মাধ্যমে নিলে স্কুলের প্রশাসক শুধু নিজের শিক্ষার্থীদের দেখেন, আর প্রত্যেক অভিভাবক দেখেন শুধু নিজের সন্তানকে।",
  },
  "faq.q4": { en: "Can both parents see the location?", bn: "মা-বাবা দুজনই কি দেখতে পারবেন?" },
  "faq.a4": {
    en: "Yes. More than one family member can be added, so mother and father can each see it on their own phone.",
    bn: "হ্যাঁ। পরিবারের একাধিক সদস্যকে যুক্ত করা যায়, তাই মা-বাবা দুজনই নিজের নিজের ফোনে দেখতে পারবেন।",
  },
  "faq.q5": { en: "Does it work indoors?", bn: "ঘরের ভেতরে কি কাজ করে?" },
  "faq.a5": {
    en: "GPS needs a view of the sky, so it is weaker inside buildings. Indoors the app shows an approximate place rather than an exact spot. Outdoors the position is more precise.",
    bn: "জিপিএস-এর জন্য খোলা আকাশ দরকার, তাই ভবনের ভেতরে সিগন্যাল দুর্বল থাকে। ভেতরে থাকলে অ্যাপ একদম নির্দিষ্ট জায়গা নয়, আনুমানিক অবস্থান দেখায়। বাইরে থাকলে অবস্থান আরও নির্ভুল হয়।",
  },
  "faq.q6": { en: "What happens when the SOS button is pressed?", bn: "SOS বাটন চাপলে কী হয়?" },
  "faq.a6": {
    en: "An urgent alert comes to your phone straight away, with the location at that moment, so you can call or go there. It is worth practising once with your child.",
    bn: "সঙ্গে সঙ্গে আপনার ফোনে জরুরি অ্যালার্ট আসে, সেই মুহূর্তের লোকেশনসহ - যাতে আপনি কল করতে বা সেখানে যেতে পারেন। সন্তানের সঙ্গে একবার অনুশীলন করে নেওয়া ভালো।",
  },
  "faq.q7": { en: "How much does it cost, and how do I order?", bn: "দাম কত, আর অর্ডার করব কীভাবে?" },
  "faq.a7": {
    en: "We are taking pre-orders now. Call or WhatsApp 01629-563645 and we will tell you the price and delivery details.",
    bn: "এখন প্রি-অর্ডার নেওয়া হচ্ছে। 01629-563645 নম্বরে কল বা WhatsApp করুন - দাম আর ডেলিভারির বিষয়ে জানিয়ে দেব।",
  },
  "faq.q8": { en: "We are a school. How do we start?", bn: "আমরা একটি স্কুল। শুরু করব কীভাবে?" },
  "faq.a8": {
    en: "Call us or use the contact form. We will show you the school dashboard and talk through how many trackers you need and how parents get their logins.",
    bn: "কল করুন বা যোগাযোগ ফর্মে লিখুন। আমরা স্কুল ড্যাশবোর্ড দেখাব, আর কতগুলো ট্র্যাকার লাগবে ও অভিভাবকেরা কীভাবে লগ ইন পাবেন - তা নিয়ে কথা বলব।",
  },

  // Closing call-to-action
  "cta.title": { en: "Want one for your child?", bn: "আপনার সন্তানের জন্য নিতে চান?" },
  "cta.desc": { en: "Pre-orders are open. Call or message us - we will answer in Bengali.", bn: "প্রি-অর্ডার চলছে। কল বা মেসেজ করুন - কথা হবে বাংলায়।" },
  "cta.call": { en: "Call", bn: "কল করুন" },
  "cta.whatsapp": { en: "Message on WhatsApp", bn: "WhatsApp-এ লিখুন" },
  "cta.contact": { en: "Or send an enquiry", bn: "অথবা ফর্মে লিখুন" },

  // Features page
  "featuresPage.badge": { en: "Features", bn: "ফিচার" },
  "featuresPage.title": { en: "Eight features, explained simply", bn: "আটটি ফিচার, সহজ করে বলা" },
  "featuresPage.desc": {
    en: "What the EyeOn tracker and app do for you, one by one.",
    bn: "EyeOn ট্র্যাকার আর অ্যাপ আপনার জন্য কী কী করে - একটি একটি করে।",
  },
  "featuresPage.whereTitle": { en: "Where you see it all", bn: "সবকিছু দেখবেন কোথায়" },
  "featuresPage.app.title": { en: "On your phone", bn: "আপনার ফোনে" },
  "featuresPage.app.desc": {
    en: "The EyeOn app, in Bengali and English. The map, alerts and history for your own family.",
    bn: "EyeOn অ্যাপ - বাংলা ও ইংরেজিতে। নিজের পরিবারের ম্যাপ, অ্যালার্ট আর হিস্ট্রি।",
  },
  "featuresPage.web.title": { en: "On the web dashboard", bn: "ওয়েব ড্যাশবোর্ডে" },
  "featuresPage.web.desc": {
    en: "The same information on a computer. Schools use it to see all their students in one place.",
    bn: "একই তথ্য কম্পিউটারে। স্কুল এখানে সব শিক্ষার্থীকে এক জায়গায় দেখতে পায়।",
  },
  "featuresPage.viewTracker": { en: "See the tracker", bn: "ট্র্যাকারটি দেখুন" },

  // Solutions page
  "solutions.badge": { en: "Who it's for", bn: "কাদের জন্য" },
  "solutions.title": { en: "For families, and for institutions", bn: "পরিবারের জন্য, প্রতিষ্ঠানের জন্য" },
  "solutions.desc": {
    en: "The same small tracker, set up for the way you will use it.",
    bn: "একই ছোট্ট ট্র্যাকার - আপনি যেভাবে ব্যবহার করবেন, সেভাবেই সাজানো।",
  },
  "solutions.talk": { en: "Talk to us", bn: "কথা বলুন" },
  "solutions.cta.title": { en: "Not sure which one fits you?", bn: "কোনটা আপনার জন্য, বুঝতে পারছেন না?" },
  "solutions.cta.desc": { en: "Call us and tell us your situation.", bn: "কল করে আপনার প্রয়োজনটা বলুন।" },

  "solutions.family.title": { en: "Families", bn: "পরিবার" },
  "solutions.family.subtitle": { en: "For mothers and fathers", bn: "মা-বাবার জন্য" },
  "solutions.family.desc": {
    en: "School, coaching, the playground - know where your child is without phoning around.",
    bn: "স্কুল, কোচিং, খেলার মাঠ - এদিক-ওদিক ফোন না করেই জানুন সন্তান কোথায় আছে।",
  },
  "solutions.family.f1": { en: "Live location on the map", bn: "ম্যাপে লাইভ লোকেশন" },
  "solutions.family.f2": { en: "Arrive / leave alerts for Home and School", bn: "বাসা ও স্কুলে পৌঁছানো-বের হওয়ার অ্যালার্ট" },
  "solutions.family.f3": { en: "SOS button with location", bn: "লোকেশনসহ SOS বাটন" },
  "solutions.family.f4": { en: "Both parents can see", bn: "মা-বাবা দুজনই দেখতে পারেন" },

  "solutions.school.title": { en: "Schools", bn: "স্কুল" },
  "solutions.school.subtitle": { en: "For principals and school administrators", bn: "প্রধান শিক্ষক ও স্কুল প্রশাসকদের জন্য" },
  "solutions.school.desc": {
    en: "Give trackers to your students. You see the whole school on one dashboard, and every parent follows only their own child on their phone.",
    bn: "শিক্ষার্থীদের ট্র্যাকার দিন। আপনি এক ড্যাশবোর্ডে পুরো স্কুল দেখবেন, আর প্রত্যেক অভিভাবক নিজের ফোনে দেখবেন শুধু নিজের সন্তানকে।",
  },
  "solutions.school.f1": { en: "One dashboard for all students", bn: "সব শিক্ষার্থী এক ড্যাশবোর্ডে" },
  "solutions.school.f2": { en: "Each parent sees only their own child", bn: "প্রত্যেক অভিভাবক দেখেন শুধু নিজের সন্তানকে" },
  "solutions.school.f3": { en: "Arrive / leave alerts for parents", bn: "অভিভাবকের কাছে পৌঁছানো-বের হওয়ার অ্যালার্ট" },
  "solutions.school.f4": { en: "SOS alerts with location", bn: "লোকেশনসহ SOS অ্যালার্ট" },

  "solutions.coaching.title": { en: "Coaching centres, madrasas and day-care", bn: "কোচিং সেন্টার, মাদ্রাসা ও ডে-কেয়ার" },
  "solutions.coaching.subtitle": { en: "Wherever guardians leave their children", bn: "যেখানেই অভিভাবক সন্তানকে রেখে যান" },
  "solutions.coaching.desc": {
    en: "The same dashboard a school gets. Guardians are told when their child arrives and when they leave - evening batches included.",
    bn: "স্কুল যে ড্যাশবোর্ড পায়, সেটিই। সন্তান কখন পৌঁছাল আর কখন বের হলো, অভিভাবক জানতে পারেন - সন্ধ্যার ব্যাচেও।",
  },
  "solutions.coaching.f1": { en: "A dashboard for the institution", bn: "প্রতিষ্ঠানের জন্য ড্যাশবোর্ড" },
  "solutions.coaching.f2": { en: "Guardians see only their own child", bn: "অভিভাবক দেখেন শুধু নিজের সন্তানকে" },
  "solutions.coaching.f3": { en: "Arrive / leave alerts", bn: "পৌঁছানো-বের হওয়ার অ্যালার্ট" },
  "solutions.coaching.f4": { en: "SOS alerts with location", bn: "লোকেশনসহ SOS অ্যালার্ট" },

  "solutions.elderly.title": { en: "Elderly parents", bn: "বয়স্ক মা-বাবা" },
  "solutions.elderly.subtitle": { en: "For sons and daughters", bn: "ছেলে-মেয়েদের জন্য" },
  "solutions.elderly.desc": {
    en: "For a mother or father who still goes out alone - to the mosque, the market, a morning walk. You can see they got there, and they have a button to press if they need help.",
    bn: "যে মা-বাবা এখনো একা বাইরে যান - মসজিদে, বাজারে, সকালে হাঁটতে। তাঁরা পৌঁছেছেন কি না আপনি দেখতে পাবেন, আর দরকারে তাঁদের হাতের কাছেই থাকবে SOS বাটন।",
  },
  "solutions.elderly.f1": { en: "Live location on the map", bn: "ম্যাপে লাইভ লোকেশন" },
  "solutions.elderly.f2": { en: "Home as a trusted place", bn: "বাসা বিশ্বস্ত জায়গা হিসেবে" },
  "solutions.elderly.f3": { en: "SOS button within reach", bn: "হাতের কাছে SOS বাটন" },
  "solutions.elderly.f4": { en: "Simple Bengali app for the family", bn: "পরিবারের জন্য সহজ বাংলা অ্যাপ" },

  // Products page - one product
  "productsPage.badge": { en: "The tracker", bn: "ট্র্যাকার" },
  "productsPage.title": { en: "One small tracker", bn: "ছোট্ট একটি ট্র্যাকার" },
  "productsPage.desc": {
    en: "EyeOn is a single device: small, light, with an SOS button. It works with the EyeOn app.",
    bn: "EyeOn একটিই ডিভাইস - ছোট, হালকা, সঙ্গে SOS বাটন। চলে EyeOn অ্যাপের সঙ্গে।",
  },
  "productsPage.name": { en: "EyeOn tracker", bn: "EyeOn ট্র্যাকার" },
  "productsPage.tagline": { en: "Keep an eye on them, wherever they are.", bn: "চোখে চোখে রাখুন, ও যেখানেই থাকুক।" },
  "productsPage.illustration": { en: "Illustration - product photos will follow", bn: "প্রতীকী ছবি - আসল ছবি পরে যোগ হবে" },
  "productsPage.p1": { en: "Small and light - they hardly notice it", bn: "ছোট ও হালকা - ও টেরই পাবে না" },
  "productsPage.p2": { en: "SOS button: one press, urgent alert with location", bn: "SOS বাটন: এক চাপেই লোকেশনসহ জরুরি অ্যালার্ট" },
  "productsPage.p3": { en: "About a day on one charge; charge it at night", bn: "এক চার্জে প্রায় সারাদিন; রাতে চার্জে দিন" },
  "productsPage.p4": { en: "Works with the EyeOn app, in Bengali and English", bn: "EyeOn অ্যাপের সঙ্গে চলে - বাংলা ও ইংরেজিতে" },
  "productsPage.wear.title": { en: "Three ways to carry it", bn: "তিনভাবে সঙ্গে রাখা যায়" },
  "productsPage.wear.neck.title": { en: "Around the neck", bn: "গলায়" },
  "productsPage.wear.neck.desc": { en: "On a lanyard, like an ID card.", bn: "ফিতায় ঝুলিয়ে, আইডি কার্ডের মতো।" },
  "productsPage.wear.bag.title": { en: "In the bag", bn: "ব্যাগে" },
  "productsPage.wear.bag.desc": { en: "In a pocket of the school bag.", bn: "স্কুলব্যাগের একটি পকেটে।" },
  "productsPage.wear.wrist.title": { en: "On the wrist", bn: "হাতে" },
  "productsPage.wear.wrist.desc": { en: "For children who would rather wear it.", bn: "যে শিশুরা পরে থাকতেই পছন্দ করে।" },
  "productsPage.app.title": { en: "The app is part of the product", bn: "অ্যাপটিও পণ্যেরই অংশ" },
  "productsPage.app.desc": {
    en: "The tracker does its work quietly. You see everything in the EyeOn app: the map, safe zone alerts, SOS and the day's route.",
    bn: "ট্র্যাকার নীরবে নিজের কাজ করে। আপনি সব দেখবেন EyeOn অ্যাপে - ম্যাপ, সেফ জোন অ্যালার্ট, SOS আর সারাদিনের যাত্রাপথ।",
  },
  "productsPage.specs.title": { en: "Detailed specifications", bn: "বিস্তারিত স্পেসিফিকেশন" },
  "productsPage.specs.desc": {
    en: "We will publish the full specifications here once they are final. Until then, call us and ask anything.",
    bn: "চূড়ান্ত হলে পূর্ণ স্পেসিফিকেশন এখানে প্রকাশ করা হবে। তার আগে যেকোনো প্রশ্নে কল করুন।",
  },

  // Product detail route (/products/[id], a file outside components/landing).
  // data/products.ts exports an empty list, so that route shows this message only.
  "productDetail.notFound": { en: "Page not found", bn: "পেজটি পাওয়া যায়নি" },
  "productDetail.notFoundDesc": { en: "EyeOn has one tracker. You can read about it on the tracker page.", bn: "EyeOn-এর ট্র্যাকার একটিই। ট্র্যাকার পেজে সব তথ্য পাবেন।" },
  "productDetail.backToProducts": { en: "Go to the tracker page", bn: "ট্র্যাকার পেজে যান" },

  // Pricing page - pre-order only, no amounts
  "pricing.badge": { en: "Price & pre-order", bn: "দাম ও প্রি-অর্ডার" },
  "pricing.title": { en: "Pre-orders are open", bn: "প্রি-অর্ডার চলছে" },
  "pricing.desc": {
    en: "Prices are not published on the website yet. Call 01629-563645 and we will tell you the price and when to expect delivery.",
    bn: "দাম এখনো ওয়েবসাইটে দেওয়া হয়নি। 01629-563645 নম্বরে কল করলেই দাম আর ডেলিভারির সময় জানিয়ে দেব।",
  },
  "pricing.get.title": { en: "What you get", bn: "যা যা পাবেন" },
  "pricing.get1.title": { en: "The EyeOn tracker", bn: "EyeOn ট্র্যাকার" },
  "pricing.get1.desc": { en: "Small, light, with an SOS button.", bn: "ছোট, হালকা, সঙ্গে SOS বাটন।" },
  "pricing.get2.title": { en: "The EyeOn app", bn: "EyeOn অ্যাপ" },
  "pricing.get2.desc": { en: "In Bengali and English, on your phone.", bn: "বাংলা ও ইংরেজিতে, আপনার ফোনে।" },
  "pricing.get3.title": { en: "Web dashboard", bn: "ওয়েব ড্যাশবোর্ড" },
  "pricing.get3.desc": { en: "The same view on a computer.", bn: "একই তথ্য কম্পিউটারেও।" },
  "pricing.get4.title": { en: "Support in Bengali", bn: "বাংলায় সাপোর্ট" },
  "pricing.get4.desc": { en: "Help with setup by phone or WhatsApp.", bn: "সেটআপে সাহায্য - ফোনে বা WhatsApp-এ।" },
  "pricing.family.title": { en: "For a family", bn: "পরিবারের জন্য" },
  "pricing.family.tagline": { en: "One tracker or several, for your children or your parents", bn: "একটি বা একাধিক ট্র্যাকার - সন্তান বা মা-বাবার জন্য" },
  "pricing.family.f1": { en: "Live location and route history", bn: "লাইভ লোকেশন ও যাত্রাপথ হিস্ট্রি" },
  "pricing.family.f2": { en: "Home and School as trusted places", bn: "বাসা ও স্কুল বিশ্বস্ত জায়গা হিসেবে" },
  "pricing.family.f3": { en: "SOS alerts on your phone", bn: "আপনার ফোনে SOS অ্যালার্ট" },
  "pricing.family.f4": { en: "More than one family member can see", bn: "পরিবারের একাধিক সদস্য দেখতে পারেন" },
  "pricing.family.cta": { en: "Call to pre-order", bn: "প্রি-অর্ডার করতে কল করুন" },
  "pricing.school.title": { en: "For a school or institution", bn: "স্কুল বা প্রতিষ্ঠানের জন্য" },
  "pricing.school.tagline": { en: "Schools, coaching centres, madrasas, day-care", bn: "স্কুল, কোচিং সেন্টার, মাদ্রাসা, ডে-কেয়ার" },
  "pricing.school.f1": { en: "One dashboard for all your students", bn: "সব শিক্ষার্থী এক ড্যাশবোর্ডে" },
  "pricing.school.f2": { en: "Each parent sees only their own child", bn: "প্রত্যেক অভিভাবক দেখেন শুধু নিজের সন্তানকে" },
  "pricing.school.f3": { en: "Arrive / leave alerts for parents", bn: "অভিভাবকের কাছে পৌঁছানো-বের হওয়ার অ্যালার্ট" },
  "pricing.school.f4": { en: "SOS alerts with location", bn: "লোকেশনসহ SOS অ্যালার্ট" },
  "pricing.school.note": {
    en: "Schools get a dashboard for all their students, and each parent sees only their own child. Tell us how many students you have in mind and we will talk it through.",
    bn: "স্কুল পায় সব শিক্ষার্থীর জন্য একটি ড্যাশবোর্ড, আর প্রত্যেক অভিভাবক দেখেন শুধু নিজের সন্তানকে। কতজন শিক্ষার্থীর কথা ভাবছেন জানান - বিস্তারিত কথা বলব।",
  },
  "pricing.school.cta": { en: "Talk to us about your school", bn: "আপনার স্কুলের জন্য কথা বলুন" },

  // About page
  "about.badge": { en: "About us", bn: "আমাদের কথা" },
  "about.title": { en: "A Bangladeshi team, building a child-safety tracker", bn: "বাংলাদেশের একটি টিম, বানাচ্ছি শিশু নিরাপত্তা ট্র্যাকার" },
  "about.subtitle": { en: "EyeOn is new. Here is what we are doing, and why.", bn: "EyeOn নতুন। আমরা কী করছি আর কেন - সেটাই বলছি।" },
  "about.story.badge": { en: "Why we are building this", bn: "কেন বানাচ্ছি" },
  "about.story.title": { en: "A simple answer to \"where are they now?\"", bn: "\"ও এখন কোথায়?\" - এই প্রশ্নের সহজ উত্তর" },
  "about.story.p1": {
    en: "Every parent knows the feeling: school finished a while ago and the child is not home yet. We wanted a simple answer to that worry - one that works here, in Bengali, on an ordinary phone.",
    bn: "সব মা-বাবাই অনুভূতিটা চেনেন: স্কুল ছুটি হয়েছে বেশ আগে, অথচ সন্তান এখনো বাসায় ফেরেনি। এই দুশ্চিন্তার একটা সহজ উত্তর আমরা চেয়েছি - যা এ দেশে চলবে, বাংলায়, সাধারণ একটি ফোনেই।",
  },
  "about.story.p2": {
    en: "So EyeOn is a small tracker and a simple app. It shows where your child is, tells you when they arrive and when they leave, and gives them an SOS button. Schools can offer the same to all their students.",
    bn: "তাই EyeOn হলো ছোট্ট একটি ট্র্যাকার আর সহজ একটি অ্যাপ। সন্তান কোথায় আছে দেখায়, পৌঁছানো আর বের হওয়ার খবর দেয়, আর সন্তানের হাতে দেয় একটি SOS বাটন। স্কুলও তার সব শিক্ষার্থীর জন্য একই সুবিধা দিতে পারে।",
  },
  "about.today.title": { en: "Where we are today", bn: "আমরা এখন কোথায়" },
  "about.today.desc": {
    en: "EyeOn is a new product and we are taking pre-orders. We will not show you customer numbers or logos we have not earned. If there is anything you want to know, call us and ask.",
    bn: "EyeOn নতুন একটি পণ্য, এখন প্রি-অর্ডার নেওয়া হচ্ছে। যে গ্রাহকসংখ্যা বা লোগো আমাদের অর্জন নয়, তা আমরা দেখাব না। কিছু জানার থাকলে কল করে জিজ্ঞেস করুন।",
  },
  "about.values.title": { en: "What we hold ourselves to", bn: "যা আমরা মেনে চলি" },
  "about.values.simple.title": { en: "Simple", bn: "সহজ" },
  "about.values.simple.desc": { en: "If a grandparent cannot use it, it is not finished.", bn: "দাদা-দাদি, নানা-নানি ব্যবহার করতে না পারলে কাজটা শেষ হয়নি।" },
  "about.values.private.title": { en: "Private", bn: "গোপনীয়" },
  "about.values.private.desc": { en: "A child's location is for their family, and nobody else.", bn: "সন্তানের লোকেশন শুধু তার পরিবারের জন্য, আর কারও জন্য নয়।" },
  "about.values.bangla.title": { en: "In Bengali", bn: "বাংলায়" },
  "about.values.bangla.desc": { en: "The app, the alerts and the support.", bn: "অ্যাপ, অ্যালার্ট আর সাপোর্ট - সবই।" },
  "about.values.honest.title": { en: "Honest", bn: "সৎ" },
  "about.values.honest.desc": { en: "We say what the tracker does, and what it does not.", bn: "ট্র্যাকার কী পারে আর কী পারে না - দুটোই বলি।" },
  "about.cta.title": { en: "Talk to the people building it", bn: "যাঁরা বানাচ্ছেন, তাঁদের সঙ্গেই কথা বলুন" },
  "about.cta.desc": { en: "Call or message us with any question.", bn: "যেকোনো প্রশ্নে কল বা মেসেজ করুন।" },

  // Contact page
  "contact.badge": { en: "Contact", bn: "যোগাযোগ" },
  "contact.title": { en: "Talk to us", bn: "কথা বলুন আমাদের সঙ্গে" },
  "contact.desc": {
    en: "Pre-order for your family, or ask about trackers for your school.",
    bn: "পরিবারের জন্য প্রি-অর্ডার করুন, অথবা স্কুলের জন্য ট্র্যাকারের বিষয়ে জানুন।",
  },
  "contact.letsTalk": { en: "Call or message", bn: "কল বা মেসেজ করুন" },
  "contact.letsTalkDesc": { en: "The phone is the quickest way. We answer in Bengali.", bn: "সবচেয়ে দ্রুত উপায় ফোন। কথা হবে বাংলায়।" },
  "contact.phoneLabel": { en: "Pre-order & enquiries", bn: "প্রি-অর্ডার ও জিজ্ঞাসা" },
  "contact.phoneNote": { en: "Tap to call", bn: "কল করতে ট্যাপ করুন" },
  "contact.whatsappLabel": { en: "WhatsApp", bn: "WhatsApp" },
  "contact.whatsappNote": { en: "Send a message; we reply as soon as we can.", bn: "মেসেজ পাঠান; যত দ্রুত সম্ভব উত্তর দেব।" },
  "contact.supportLabel": { en: "Support in Bengali", bn: "বাংলায় সাপোর্ট" },
  "contact.supportNote": { en: "Setup help and questions, in Bengali or English.", bn: "সেটআপে সাহায্য আর যেকোনো প্রশ্ন - বাংলা বা ইংরেজিতে।" },
  "contact.form.title": { en: "Send an enquiry", bn: "জিজ্ঞাসা পাঠান" },
  "contact.form.name": { en: "Your name", bn: "আপনার নাম" },
  "contact.form.phone": { en: "Phone number", bn: "ফোন নম্বর" },
  "contact.form.iAm": { en: "I am a", bn: "আমি একজন" },
  "contact.form.role.parent": { en: "Parent", bn: "অভিভাবক" },
  "contact.form.role.school": { en: "School", bn: "স্কুল" },
  "contact.form.role.coaching": { en: "Coaching centre", bn: "কোচিং সেন্টার" },
  "contact.form.role.other": { en: "Other", bn: "অন্যান্য" },
  "contact.form.institution": { en: "Name of the school / institution", bn: "স্কুল / প্রতিষ্ঠানের নাম" },
  "contact.form.howMany": { en: "How many children / students", bn: "কতজন সন্তান / শিক্ষার্থী" },
  "contact.form.message": { en: "Message", bn: "বার্তা" },
  "contact.form.messagePlaceholder": { en: "Tell us what you would like to know...", bn: "কী জানতে চান, লিখুন..." },
  "contact.form.submit": { en: "Send on WhatsApp", bn: "WhatsApp-এ পাঠান" },
  "contact.form.note": {
    en: "This opens WhatsApp with your message ready to send to 01629-563645. Nothing is sent until you press send there.",
    bn: "বাটনে চাপলে WhatsApp খুলবে, আর আপনার বার্তাটি 01629-563645 নম্বরে পাঠানোর জন্য তৈরি থাকবে। সেখানে সেন্ড না চাপা পর্যন্ত কিছুই যাবে না।",
  },
  "contact.form.intro": { en: "EyeOn enquiry", bn: "EyeOn জিজ্ঞাসা" },

  // Footer
  "footer.desc": {
    en: "A small child-safety tracker and a simple Bengali app. Keep an eye on them, wherever they are.",
    bn: "ছোট্ট একটি শিশু নিরাপত্তা ট্র্যাকার আর সহজ বাংলা অ্যাপ। চোখে চোখে রাখুন, ও যেখানেই থাকুক।",
  },
  "footer.quickLinks": { en: "Pages", bn: "পেজ" },
  "footer.contactUs": { en: "Pre-order & enquiries", bn: "প্রি-অর্ডার ও জিজ্ঞাসা" },
  "footer.support": { en: "Support in Bengali", bn: "বাংলায় সাপোর্ট" },
  "footer.rights": { en: "All rights reserved.", bn: "সর্বস্বত্ব সংরক্ষিত।" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Bengali first: the audience is parents in Bangladesh. A saved choice overrides this.
  const [lang, setLang] = useState<Lang>("bn");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("eyeon-lang") as Lang | null;
      if (saved && (saved === "en" || saved === "bn")) {
        setLang(saved);
      }
    } catch {
      // localStorage access may fail in some browser contexts
    }
  }, []);

  const handleSetLang = (newLang: Lang) => {
    setLang(newLang);
    try {
      localStorage.setItem("eyeon-lang", newLang);
    } catch {
      // localStorage access may fail in some browser contexts
    }
  };

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.en || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
