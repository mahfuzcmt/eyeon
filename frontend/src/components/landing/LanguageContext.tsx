"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "en" | "bn";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<string, { en: string; bn: string }> = {
  // Navigation
  "nav.home": { en: "Home", bn: "হোম" },
  "nav.features": { en: "Features", bn: "ফিচার" },
  "nav.products": { en: "Products", bn: "পণ্য" },
  "nav.solutions": { en: "Solutions", bn: "সমাধান" },
  "nav.pricing": { en: "Pricing", bn: "মূল্য" },
  "nav.about": { en: "About", bn: "আমাদের সম্পর্কে" },
  "nav.contact": { en: "Contact", bn: "যোগাযোগ" },
  "nav.signIn": { en: "Sign In", bn: "সাইন ইন" },
  "nav.getDemo": { en: "Get Free Demo", bn: "ফ্রি ডেমো নিন" },

  // Hero
  "hero.badge": { en: "Country's Best GPS Tracking Service", bn: "দেশের সেরা জিপিএস ট্র্যাকিং সেবা" },
  "hero.title1": { en: "Top GPS Tracking &", bn: "শীর্ষস্থানীয় জিপিএস ট্র্যাকিং এবং" },
  "hero.title2": { en: "Fleet Management Service", bn: "ফ্লিট ম্যানেজমেন্ট সেবা" },
  "hero.desc": { en: "Professional GPS tracking platform with real-time monitoring, fuel tracking, route replay, geofencing, and remote engine control. Save up to 30% on fuel costs with intelligent fleet management.", bn: "রিয়েল-টাইম মনিটরিং, ফুয়েল ট্র্যাকিং, রুট রিপ্লে, জিওফেন্সিং এবং রিমোট ইঞ্জিন কন্ট্রোল সহ পেশাদার জিপিএস ট্র্যাকিং প্ল্যাটফর্ম। বুদ্ধিমান ফ্লিট ম্যানেজমেন্টের মাধ্যমে জ্বালানি খরচে ৩০% পর্যন্ত সাশ্রয় করুন।" },
  "hero.contactSales": { en: "Contact Sales", bn: "সেলস-এ যোগাযোগ" },
  "hero.btrcCertified": { en: "BTRC Certified", bn: "বিটিআরসি সার্টিফাইড" },
  "hero.companies": { en: "150+ Companies", bn: "১৫০+ কোম্পানি" },
  "hero.support": { en: "24/7 Support", bn: "২৪/৭ সাপোর্ট" },

  // Trust Badges
  "trust.best": { en: "Country's Best GPS Tracking", bn: "দেশের সেরা জিপিএস ট্র্যাকিং" },
  "trust.support": { en: "24/7 Full Online Support", bn: "২৪/৭ সম্পূর্ণ অনলাইন সাপোর্ট" },
  "trust.team": { en: "Dedicated After-Sales Team", bn: "নিবেদিত আফটার-সেলস টিম" },
  "trust.vts": { en: "Intelligent VTS Platform", bn: "বুদ্ধিমান ভিটিএস প্ল্যাটফর্ম" },

  // Trusted Clients
  "clients.title": { en: "Trusted by Leading Companies in Bangladesh", bn: "বাংলাদেশের শীর্ষস্থানীয় কোম্পানিগুলোর বিশ্বস্ত" },

  // Features Section
  "features.badge": { en: "Platform Features", bn: "প্ল্যাটফর্ম ফিচার" },
  "features.title": { en: "Comprehensive Fleet Management Features", bn: "সম্পূর্ণ ফ্লিট ম্যানেজমেন্ট ফিচার" },
  "features.desc": { en: "Everything you need to monitor, manage, and optimize your fleet operations.", bn: "আপনার ফ্লিট অপারেশন মনিটর, ম্যানেজ এবং অপ্টিমাইজ করতে যা যা দরকার।" },
  "features.viewAll": { en: "View All Features", bn: "সব ফিচার দেখুন" },

  // Feature Items
  "feature.fuel.title": { en: "Real-Time Fuel Monitoring", bn: "রিয়েল-টাইম ফুয়েল মনিটরিং" },
  "feature.fuel.desc": { en: "Track fuel levels in real-time and save up to 30% on fuel costs with mileage predictions.", bn: "রিয়েল-টাইমে জ্বালানি স্তর ট্র্যাক করুন এবং মাইলেজ প্রেডিকশনের মাধ্যমে জ্বালানি খরচে ৩০% পর্যন্ত সাশ্রয় করুন।" },
  "feature.replay.title": { en: "Route Replay", bn: "রুট রিপ্লে" },
  "feature.replay.desc": { en: "View complete historical routes and replay any trip with timeline controls.", bn: "সম্পূর্ণ ঐতিহাসিক রুট দেখুন এবং টাইমলাইন কন্ট্রোল সহ যেকোনো ট্রিপ রিপ্লে করুন।" },
  "feature.mileage.title": { en: "Daily Mileage Tracking", bn: "দৈনিক মাইলেজ ট্র্যাকিং" },
  "feature.mileage.desc": { en: "Monitor daily mileage with detailed fuel usage analytics and reports.", bn: "বিস্তারিত জ্বালানি ব্যবহার বিশ্লেষণ এবং রিপোর্ট সহ দৈনিক মাইলেজ মনিটর করুন।" },
  "feature.parking.title": { en: "Parking Monitoring", bn: "পার্কিং মনিটরিং" },
  "feature.parking.desc": { en: "Track exact parking locations and duration for complete fleet visibility.", bn: "সম্পূর্ণ ফ্লিট ভিজিবিলিটির জন্য সঠিক পার্কিং লোকেশন এবং সময়কাল ট্র্যাক করুন।" },
  "feature.alerts.title": { en: "Automated Alerts", bn: "স্বয়ংক্রিয় অ্যালার্ট" },
  "feature.alerts.desc": { en: "Configure custom alerts for road incidents, overspeed, and vehicle events.", bn: "রোড ইনসিডেন্ট, ওভারস্পিড এবং ভেহিকল ইভেন্টের জন্য কাস্টম অ্যালার্ট কনফিগার করুন।" },
  "feature.geofence.title": { en: "Geofence Notifications", bn: "জিওফেন্স নোটিফিকেশন" },
  "feature.geofence.desc": { en: "Set virtual boundaries and get instant SMS, email, or push notifications.", bn: "ভার্চুয়াল বাউন্ডারি সেট করুন এবং তাৎক্ষণিক এসএমএস, ইমেইল বা পুশ নোটিফিকেশন পান।" },
  "feature.video.title": { en: "Video Camera Solutions", bn: "ভিডিও ক্যামেরা সলিউশন" },
  "feature.video.desc": { en: "Dashboard camera integration with live streaming and incident recording.", bn: "লাইভ স্ট্রিমিং এবং ইনসিডেন্ট রেকর্ডিং সহ ড্যাশবোর্ড ক্যামেরা ইন্টিগ্রেশন।" },
  "feature.iot.title": { en: "IoT Data Collection", bn: "আইওটি ডেটা কালেকশন" },
  "feature.iot.desc": { en: "Collect and analyze IoT data from vehicles for smart fleet insights.", bn: "স্মার্ট ফ্লিট ইনসাইটের জন্য যানবাহন থেকে আইওটি ডেটা সংগ্রহ এবং বিশ্লেষণ করুন।" },
  "feature.temp.title": { en: "Temperature Monitoring", bn: "তাপমাত্রা মনিটরিং" },
  "feature.temp.desc": { en: "Monitor temperature for cold chain logistics and sensitive cargo.", bn: "কোল্ড চেইন লজিস্টিক্স এবং সংবেদনশীল কার্গোর জন্য তাপমাত্রা মনিটর করুন।" },

  // Products Section
  "products.badge": { en: "Our Products", bn: "আমাদের পণ্য" },
  "products.title": { en: "GPS Tracking Devices", bn: "জিপিএস ট্র্যাকিং ডিভাইস" },
  "products.desc": { en: "Wide range of professional GPS tracking devices for every need.", bn: "প্রতিটি প্রয়োজনের জন্য বিস্তৃত পেশাদার জিপিএস ট্র্যাকিং ডিভাইস।" },
  "products.explore": { en: "Explore", bn: "দেখুন" },
  "products.callForPrice": { en: "Call for Price", bn: "দাম জানতে কল করুন" },
  "products.onwards": { en: "onwards", bn: "থেকে" },

  // Product Items
  "product.btrc.title": { en: "BTRC Certified Tracker", bn: "বিটিআরসি সার্টিফাইড ট্র্যাকার" },
  "product.btrc.desc": { en: "Government approved GPS tracking devices", bn: "সরকার অনুমোদিত জিপিএস ট্র্যাকিং ডিভাইস" },
  "product.btrc.badge": { en: "BTRC Certified", bn: "বিটিআরসি সার্টিফাইড" },
  "product.wired.title": { en: "Wired GPS Tracker", bn: "ওয়্যার্ড জিপিএস ট্র্যাকার" },
  "product.wired.desc": { en: "Professional hardwired tracking solutions", bn: "পেশাদার হার্ডওয়্যার্ড ট্র্যাকিং সমাধান" },
  "product.obd.title": { en: "OBD Plug & Play", bn: "ওবিডি প্লাগ অ্যান্ড প্লে" },
  "product.obd.desc": { en: "Easy installation OBD port trackers", bn: "সহজ ইনস্টলেশন ওবিডি পোর্ট ট্র্যাকার" },
  "product.dashcam.title": { en: "Dashcam Solutions", bn: "ড্যাশক্যাম সমাধান" },
  "product.dashcam.desc": { en: "Video telematics with live streaming", bn: "লাইভ স্ট্রিমিং সহ ভিডিও টেলিম্যাটিক্স" },
  "product.fuelSensor.title": { en: "Fuel Monitoring", bn: "ফুয়েল মনিটরিং" },
  "product.fuelSensor.desc": { en: "Real-time fuel level sensors", bn: "রিয়েল-টাইম ফুয়েল লেভেল সেন্সর" },
  "product.portable.title": { en: "Wireless Portable", bn: "ওয়্যারলেস পোর্টেবল" },
  "product.portable.desc": { en: "Battery-powered asset trackers", bn: "ব্যাটারি চালিত অ্যাসেট ট্র্যাকার" },

  // Industries Section
  "industries.badge": { en: "Industries We Serve", bn: "আমরা যে শিল্পগুলোতে সেবা দিই" },
  "industries.title": { en: "GPS Solutions for Every Industry", bn: "প্রতিটি শিল্পের জন্য জিপিএস সমাধান" },
  "industries.desc": { en: "Tailored tracking solutions for diverse business sectors.", bn: "বৈচিত্র্যপূর্ণ ব্যবসায়িক খাতের জন্য কাস্টমাইজড ট্র্যাকিং সমাধান।" },
  "industries.viewAll": { en: "View All Solutions", bn: "সব সমাধান দেখুন" },

  // Industry Names
  "industry.healthcare": { en: "Healthcare", bn: "স্বাস্থ্যসেবা" },
  "industry.construction": { en: "Construction", bn: "নির্মাণ" },
  "industry.transport": { en: "Transport & Logistics", bn: "পরিবহন ও লজিস্টিক্স" },
  "industry.fmcg": { en: "FMCG", bn: "এফএমসিজি" },
  "industry.agriculture": { en: "Agriculture", bn: "কৃষি" },
  "industry.security": { en: "Security Services", bn: "নিরাপত্তা সেবা" },
  "industry.publicTransport": { en: "Public Transport", bn: "গণপরিবহন" },
  "industry.courier": { en: "Courier & Parcel", bn: "কুরিয়ার ও পার্সেল" },

  // Stats
  "stats.clients": { en: "Corporate Clients", bn: "কর্পোরেট ক্লায়েন্ট" },
  "stats.vehicles": { en: "Vehicles Tracked", bn: "ট্র্যাককৃত যানবাহন" },
  "stats.downloads": { en: "App Downloads", bn: "অ্যাপ ডাউনলোড" },
  "stats.years": { en: "Years Experience", bn: "বছরের অভিজ্ঞতা" },

  // Certifications
  "certs.title": { en: "Regulatory Approvals & Certifications", bn: "নিয়ন্ত্রক অনুমোদন এবং সার্টিফিকেশন" },

  // Partners
  "partners.telecom": { en: "Telecom Partners", bn: "টেলিকম পার্টনার" },
  "partners.device": { en: "Device Manufacturers", bn: "ডিভাইস প্রস্তুতকারক" },

  // CTA
  "cta.title": { en: "Ready to Transform Your Fleet Operations?", bn: "আপনার ফ্লিট অপারেশন পরিবর্তন করতে প্রস্তুত?" },
  "cta.desc": { en: "Get a free demo and see how EyeOn can help you track, monitor, and optimize your fleet. Save up to 30% on fuel costs.", bn: "একটি ফ্রি ডেমো নিন এবং দেখুন কিভাবে EyeOn আপনার ফ্লিট ট্র্যাক, মনিটর এবং অপ্টিমাইজ করতে সাহায্য করতে পারে। জ্বালানি খরচে ৩০% পর্যন্ত সাশ্রয় করুন।" },
  "cta.viewPricing": { en: "View Pricing", bn: "মূল্য দেখুন" },

  // Pricing Page
  "pricing.badge": { en: "Pricing", bn: "মূল্য" },
  "pricing.title": { en: "Simple, Transparent Pricing", bn: "সহজ, স্বচ্ছ মূল্য" },
  "pricing.desc": { en: "No hidden fees. All plans include free installation, SIM card, and 24/7 support.", bn: "কোনো গোপন ফি নেই। সব প্ল্যানে বিনামূল্যে ইনস্টলেশন, সিম কার্ড এবং ২৪/৭ সাপোর্ট অন্তর্ভুক্ত।" },
  "pricing.basic": { en: "Basic", bn: "বেসিক" },
  "pricing.pro": { en: "Pro", bn: "প্রো" },
  "pricing.enterprise": { en: "Enterprise", bn: "এন্টারপ্রাইজ" },
  "pricing.popular": { en: "Popular", bn: "জনপ্রিয়" },
  "pricing.perMonth": { en: "/month/vehicle", bn: "/মাস/যানবাহন" },
  "pricing.getStarted": { en: "Get Started", bn: "শুরু করুন" },
  "pricing.includes": { en: "All plans include:", bn: "সব প্ল্যানে অন্তর্ভুক্ত:" },
  "pricing.freeInstall": { en: "Free installation", bn: "বিনামূল্যে ইনস্টলেশন" },
  "pricing.freeSim": { en: "Free SIM card", bn: "বিনামূল্যে সিম কার্ড" },
  "pricing.warranty": { en: "1-year device warranty", bn: "১ বছরের ডিভাইস ওয়ারেন্টি" },
  "pricing.supportIncluded": { en: "24/7 support", bn: "২৪/৭ সাপোর্ট" },

  // Pricing Plans
  "plan.basic.tagline": { en: "For individual vehicle owners", bn: "ব্যক্তিগত যানবাহন মালিকদের জন্য" },
  "plan.pro.tagline": { en: "For small fleets (5-20 vehicles)", bn: "ছোট ফ্লিটের জন্য (৫-২০ যানবাহন)" },
  "plan.enterprise.tagline": { en: "For large corporate fleets", bn: "বড় কর্পোরেট ফ্লিটের জন্য" },

  // Features in Plans
  "plan.feature.realtime": { en: "Real-time GPS tracking", bn: "রিয়েল-টাইম জিপিএস ট্র্যাকিং" },
  "plan.feature.history": { en: "90-day trip history", bn: "৯০ দিনের ট্রিপ হিস্টোরি" },
  "plan.feature.mobileApp": { en: "Mobile app access", bn: "মোবাইল অ্যাপ অ্যাক্সেস" },
  "plan.feature.smsAlerts": { en: "Basic SMS alerts", bn: "বেসিক এসএমএস অ্যালার্ট" },
  "plan.feature.overspeed": { en: "Overspeed notifications", bn: "ওভারস্পিড নোটিফিকেশন" },
  "plan.feature.emailSupport": { en: "Email support", bn: "ইমেইল সাপোর্ট" },
  "plan.feature.everything": { en: "Everything in Basic", bn: "বেসিক-এর সবকিছু" },
  "plan.feature.geofences": { en: "Unlimited geofences", bn: "আনলিমিটেড জিওফেন্স" },
  "plan.feature.engineLock": { en: "Remote engine lock", bn: "রিমোট ইঞ্জিন লক" },
  "plan.feature.fuelMonitor": { en: "Fuel monitoring", bn: "ফুয়েল মনিটরিং" },
  "plan.feature.driverReports": { en: "Driver behavior reports", bn: "ড্রাইভার বিহেভিয়র রিপোর্ট" },
  "plan.feature.phoneSupport": { en: "Priority phone support", bn: "প্রায়োরিটি ফোন সাপোর্ট" },
  "plan.feature.multiUser": { en: "Multi-user access (3 users)", bn: "মাল্টি-ইউজার অ্যাক্সেস (৩ জন)" },
  "plan.feature.everythingPro": { en: "Everything in Pro", bn: "প্রো-এর সবকিছু" },
  "plan.feature.unlimitedUsers": { en: "Unlimited users", bn: "আনলিমিটেড ইউজার" },
  "plan.feature.api": { en: "API integration", bn: "এপিআই ইন্টিগ্রেশন" },
  "plan.feature.customReports": { en: "Custom reports", bn: "কাস্টম রিপোর্ট" },
  "plan.feature.whiteLabel": { en: "White-label option", bn: "হোয়াইট-লেবেল অপশন" },
  "plan.feature.accountManager": { en: "Dedicated account manager", bn: "ডেডিকেটেড অ্যাকাউন্ট ম্যানেজার" },
  "plan.feature.sla": { en: "SLA guarantee", bn: "এসএলএ গ্যারান্টি" },
  "plan.feature.training": { en: "On-site training", bn: "অন-সাইট ট্রেনিং" },

  // Device Pricing
  "device.title": { en: "GPS Device Pricing", bn: "জিপিএস ডিভাইস মূল্য" },
  "device.desc": { en: "One-time purchase. Professional installation included.", bn: "এককালীন ক্রয়। পেশাদার ইনস্টলেশন অন্তর্ভুক্ত।" },
  "device.startFrom": { en: "GPS tracker prices start from", bn: "জিপিএস ট্র্যাকার মূল্য শুরু" },
  "device.depending": { en: "depending on the model and features.", bn: "মডেল এবং ফিচারের উপর নির্ভর করে।" },
  "device.visitProducts": { en: "Visit our Products page to see all available GPS devices.", bn: "সব জিপিএস ডিভাইস দেখতে আমাদের পণ্য পেজ ভিজিট করুন।" },

  // FAQ
  "faq.title": { en: "Frequently Asked Questions", bn: "সচরাচর জিজ্ঞাসা" },
  "faq.q1": { en: "What's included in the monthly subscription?", bn: "মাসিক সাবস্ক্রিপশনে কি কি অন্তর্ভুক্ত?" },
  "faq.a1": { en: "All subscription plans include platform access, mobile app, SIM card with data, GPS tracking, and basic support. Higher plans include additional features like geofencing, engine lock, and API access.", bn: "সব সাবস্ক্রিপশন প্ল্যানে প্ল্যাটফর্ম অ্যাক্সেস, মোবাইল অ্যাপ, ডেটা সহ সিম কার্ড, জিপিএস ট্র্যাকিং এবং বেসিক সাপোর্ট অন্তর্ভুক্ত। উচ্চতর প্ল্যানে জিওফেন্সিং, ইঞ্জিন লক এবং এপিআই অ্যাক্সেসের মতো অতিরিক্ত ফিচার রয়েছে।" },
  "faq.q2": { en: "Is there an installation fee?", bn: "ইনস্টলেশন ফি আছে কি?" },
  "faq.a2": { en: "No, installation is FREE for all devices. Our certified technicians will install the GPS tracker at your location within 24-48 hours of purchase.", bn: "না, সব ডিভাইসের জন্য ইনস্টলেশন বিনামূল্যে। আমাদের সার্টিফাইড টেকনিশিয়ানরা ক্রয়ের ২৪-৪৮ ঘণ্টার মধ্যে আপনার লোকেশনে জিপিএস ট্র্যাকার ইনস্টল করবেন।" },
  "faq.q3": { en: "What payment methods do you accept?", bn: "আপনারা কোন পেমেন্ট পদ্ধতি গ্রহণ করেন?" },
  "faq.a3": { en: "We accept bKash, Nagad, bank transfer, and cash on delivery. For corporate clients, we offer monthly invoicing with credit terms.", bn: "আমরা বিকাশ, নগদ, ব্যাংক ট্রান্সফার এবং ক্যাশ অন ডেলিভারি গ্রহণ করি। কর্পোরেট ক্লায়েন্টদের জন্য আমরা ক্রেডিট টার্মস সহ মাসিক ইনভয়েসিং অফার করি।" },
  "faq.q4": { en: "Can I upgrade or downgrade my plan?", bn: "আমি কি প্ল্যান আপগ্রেড বা ডাউনগ্রেড করতে পারি?" },
  "faq.a4": { en: "Yes, you can change your plan at any time. Upgrades are effective immediately, and downgrades take effect from the next billing cycle.", bn: "হ্যাঁ, আপনি যেকোনো সময় আপনার প্ল্যান পরিবর্তন করতে পারেন। আপগ্রেড তাৎক্ষণিকভাবে কার্যকর হয় এবং ডাউনগ্রেড পরবর্তী বিলিং সাইকেল থেকে কার্যকর হয়।" },
  "faq.q5": { en: "What happens if my device is lost or damaged?", bn: "আমার ডিভাইস হারিয়ে গেলে বা ক্ষতিগ্রস্ত হলে কি হবে?" },
  "faq.a5": { en: "All devices come with a 1-year warranty covering manufacturing defects. For lost or damaged devices, replacement units are available at a discounted price.", bn: "সব ডিভাইসে ম্যানুফ্যাকচারিং ত্রুটি কভার করে ১ বছরের ওয়ারেন্টি আছে। হারিয়ে যাওয়া বা ক্ষতিগ্রস্ত ডিভাইসের জন্য ডিসকাউন্ট মূল্যে রিপ্লেসমেন্ট ইউনিট পাওয়া যায়।" },
  "faq.q6": { en: "Do you offer bulk discounts?", bn: "আপনারা কি বাল্ক ডিসকাউন্ট অফার করেন?" },
  "faq.a6": { en: "Yes! We offer volume discounts for fleets with 10+ vehicles. Contact our sales team for a custom quote.", bn: "হ্যাঁ! ১০+ যানবাহনের ফ্লিটের জন্য আমরা ভলিউম ডিসকাউন্ট অফার করি। কাস্টম কোটের জন্য আমাদের সেলস টিমের সাথে যোগাযোগ করুন।" },

  // Custom Quote CTA
  "quote.title": { en: "Need a Custom Quote?", bn: "কাস্টম কোট দরকার?" },
  "quote.desc": { en: "For fleets with 10+ vehicles, contact us for volume discounts and custom pricing.", bn: "১০+ যানবাহনের ফ্লিটের জন্য, ভলিউম ডিসকাউন্ট এবং কাস্টম মূল্যের জন্য আমাদের সাথে যোগাযোগ করুন।" },
  "quote.contactSales": { en: "Contact Sales", bn: "সেলস-এ যোগাযোগ" },

  // Contact Page
  "contact.badge": { en: "Contact Us", bn: "যোগাযোগ করুন" },
  "contact.title": { en: "Get in Touch", bn: "যোগাযোগ করুন" },
  "contact.desc": { en: "Ready to start tracking your fleet? Contact us for a free consultation and demo.", bn: "আপনার ফ্লিট ট্র্যাকিং শুরু করতে প্রস্তুত? বিনামূল্যে পরামর্শ এবং ডেমোর জন্য আমাদের সাথে যোগাযোগ করুন।" },
  "contact.letsTalk": { en: "Let's Talk", bn: "আসুন কথা বলি" },
  "contact.letsTalkDesc": { en: "Our team is ready to help you choose the right GPS tracking solution for your business.", bn: "আমাদের টিম আপনার ব্যবসার জন্য সঠিক জিপিএস ট্র্যাকিং সমাধান বেছে নিতে সাহায্য করতে প্রস্তুত।" },
  "contact.salesSupport": { en: "Sales & Support", bn: "সেলস এবং সাপোর্ট" },
  "contact.available": { en: "Available 24/7 for emergencies", bn: "জরুরি অবস্থায় ২৪/৭ উপলব্ধ" },
  "contact.email": { en: "Email", bn: "ইমেইল" },
  "contact.emailResponse": { en: "We respond within 24 hours", bn: "আমরা ২৪ ঘণ্টার মধ্যে উত্তর দিই" },
  "contact.office": { en: "Office", bn: "অফিস" },
  "contact.visitDemo": { en: "Visit us for device demonstration", bn: "ডিভাইস ডেমোনস্ট্রেশনের জন্য আমাদের ভিজিট করুন" },
  "contact.businessHours": { en: "Business Hours", bn: "ব্যবসায়িক সময়" },
  "contact.hours": { en: "Sat - Thu: 9:00 AM - 6:00 PM", bn: "শনি - বৃহস্পতি: সকাল ৯:০০ - সন্ধ্যা ৬:০০" },
  "contact.fridayClosed": { en: "Friday closed • 24/7 support available", bn: "শুক্রবার বন্ধ • ২৪/৭ সাপোর্ট উপলব্ধ" },
  "contact.requestDemo": { en: "Request a Free Demo", bn: "ফ্রি ডেমোর জন্য অনুরোধ করুন" },
  "contact.fullName": { en: "Full Name", bn: "পুরো নাম" },
  "contact.phoneNumber": { en: "Phone Number", bn: "ফোন নম্বর" },
  "contact.emailAddress": { en: "Email Address", bn: "ইমেইল ঠিকানা" },
  "contact.companyName": { en: "Company Name", bn: "কোম্পানির নাম" },
  "contact.fleetSize": { en: "Fleet Size", bn: "ফ্লিটের আকার" },
  "contact.selectFleet": { en: "Select fleet size", bn: "ফ্লিটের আকার নির্বাচন করুন" },
  "contact.vehicles": { en: "vehicles", bn: "যানবাহন" },
  "contact.message": { en: "Message", bn: "বার্তা" },
  "contact.messagePlaceholder": { en: "Tell us about your tracking requirements...", bn: "আপনার ট্র্যাকিং প্রয়োজনীয়তা সম্পর্কে বলুন..." },
  "contact.submit": { en: "Submit Request", bn: "অনুরোধ জমা দিন" },

  // Solutions Page
  "solutions.badge": { en: "Industry Solutions", bn: "শিল্প সমাধান" },
  "solutions.title": { en: "GPS Tracking for Every Industry", bn: "প্রতিটি শিল্পের জন্য জিপিএস ট্র্যাকিং" },
  "solutions.desc": { en: "Tailored GPS tracking solutions designed for your specific business needs. From logistics to cold chain, we have you covered.", bn: "আপনার নির্দিষ্ট ব্যবসায়িক প্রয়োজনের জন্য ডিজাইন করা কাস্টমাইজড জিপিএস ট্র্যাকিং সমাধান। লজিস্টিক্স থেকে কোল্ড চেইন পর্যন্ত, আমরা আপনাকে কভার করি।" },
  "solutions.learnMore": { en: "Learn More", bn: "আরো জানুন" },
  "solutions.needCustom": { en: "Need a Custom Solution?", bn: "কাস্টম সমাধান দরকার?" },
  "solutions.customDesc": { en: "Our team can design a GPS tracking solution tailored to your unique business requirements.", bn: "আমাদের টিম আপনার অনন্য ব্যবসায়িক প্রয়োজনীয়তা অনুযায়ী একটি জিপিএস ট্র্যাকিং সমাধান ডিজাইন করতে পারে।" },
  "solutions.contactExperts": { en: "Contact Our Experts", bn: "আমাদের বিশেষজ্ঞদের সাথে যোগাযোগ করুন" },

  // Features Page
  "featuresPage.badge": { en: "Platform Features", bn: "প্ল্যাটফর্ম ফিচার" },
  "featuresPage.title": { en: "Everything You Need for Fleet Management", bn: "ফ্লিট ম্যানেজমেন্টের জন্য যা কিছু দরকার" },
  "featuresPage.desc": { en: "Comprehensive GPS tracking features designed for modern fleet operations. Real-time monitoring, intelligent alerts, and powerful analytics.", bn: "আধুনিক ফ্লিট অপারেশনের জন্য ডিজাইন করা সম্পূর্ণ জিপিএস ট্র্যাকিং ফিচার। রিয়েল-টাইম মনিটরিং, বুদ্ধিমান অ্যালার্ট এবং শক্তিশালী বিশ্লেষণ।" },
  "featuresPage.gpsTracking": { en: "GPS Tracking", bn: "জিপিএস ট্র্যাকিং" },
  "featuresPage.gpsFeatures": { en: "Real-Time GPS Features", bn: "রিয়েল-টাইম জিপিএস ফিচার" },
  "featuresPage.dashboard": { en: "Fleet Dashboard", bn: "ফ্লিট ড্যাশবোর্ড" },
  "featuresPage.dashboardFeatures": { en: "Powerful Management Tools", bn: "শক্তিশালী ম্যানেজমেন্ট টুল" },
  "featuresPage.ready": { en: "Ready to Get Started?", bn: "শুরু করতে প্রস্তুত?" },
  "featuresPage.readyDesc": { en: "Contact us for a free demo and see all features in action.", bn: "একটি ফ্রি ডেমোর জন্য আমাদের সাথে যোগাযোগ করুন এবং সব ফিচার কার্যকরভাবে দেখুন।" },
  "featuresPage.viewDevices": { en: "View Devices", bn: "ডিভাইস দেখুন" },

  // Features Page - GPS Features
  "featuresPage.gps.realtime.title": { en: "Real-Time Tracking", bn: "রিয়েল-টাইম ট্র্যাকিং" },
  "featuresPage.gps.realtime.desc": { en: "Track your vehicles in real-time with 10-second location updates. See speed, direction, and status at a glance.", bn: "১০ সেকেন্ডের লোকেশন আপডেট সহ রিয়েল-টাইমে আপনার যানবাহন ট্র্যাক করুন। এক নজরে গতি, দিক এবং স্ট্যাটাস দেখুন।" },
  "featuresPage.gps.fuel.title": { en: "Fuel Monitoring", bn: "ফুয়েল মনিটরিং" },
  "featuresPage.gps.fuel.desc": { en: "Monitor fuel levels in real-time, detect fuel theft, and track consumption patterns to save up to 30% on fuel costs.", bn: "রিয়েল-টাইমে জ্বালানি স্তর মনিটর করুন, জ্বালানি চুরি শনাক্ত করুন এবং জ্বালানি খরচে ৩০% পর্যন্ত সাশ্রয় করতে ব্যবহারের প্যাটার্ন ট্র্যাক করুন।" },
  "featuresPage.gps.replay.title": { en: "Route Replay", bn: "রুট রিপ্লে" },
  "featuresPage.gps.replay.desc": { en: "View complete historical routes and replay any trip with timeline controls. Export trip data for analysis.", bn: "সম্পূর্ণ ঐতিহাসিক রুট দেখুন এবং টাইমলাইন কন্ট্রোল সহ যেকোনো ট্রিপ রিপ্লে করুন। বিশ্লেষণের জন্য ট্রিপ ডেটা এক্সপোর্ট করুন।" },
  "featuresPage.gps.geofence.title": { en: "Geofencing", bn: "জিওফেন্সিং" },
  "featuresPage.gps.geofence.desc": { en: "Create virtual boundaries and get instant alerts when vehicles enter or exit designated areas.", bn: "ভার্চুয়াল বাউন্ডারি তৈরি করুন এবং যানবাহন নির্ধারিত এলাকায় প্রবেশ বা বের হলে তাৎক্ষণিক অ্যালার্ট পান।" },
  "featuresPage.gps.alerts.title": { en: "Smart Alerts", bn: "স্মার্ট অ্যালার্ট" },
  "featuresPage.gps.alerts.desc": { en: "Configure custom alerts for overspeed, sudden stops, unauthorized movement, and more via SMS, email, or push.", bn: "ওভারস্পিড, আকস্মিক স্টপ, অননুমোদিত মুভমেন্ট এবং আরও অনেক কিছুর জন্য এসএমএস, ইমেইল বা পুশের মাধ্যমে কাস্টম অ্যালার্ট কনফিগার করুন।" },
  "featuresPage.gps.lock.title": { en: "Remote Engine Lock", bn: "রিমোট ইঞ্জিন লক" },
  "featuresPage.gps.lock.desc": { en: "Remotely lock or unlock the vehicle engine from anywhere using the app or web dashboard.", bn: "অ্যাপ বা ওয়েব ড্যাশবোর্ড ব্যবহার করে যেকোনো জায়গা থেকে দূরবর্তীভাবে যানবাহনের ইঞ্জিন লক বা আনলক করুন।" },
  "featuresPage.gps.dashcam.title": { en: "Dashcam Integration", bn: "ড্যাশক্যাম ইন্টিগ্রেশন" },
  "featuresPage.gps.dashcam.desc": { en: "Integrate dashboard cameras with live streaming, incident recording, and cloud video storage.", bn: "লাইভ স্ট্রিমিং, ইনসিডেন্ট রেকর্ডিং এবং ক্লাউড ভিডিও স্টোরেজ সহ ড্যাশবোর্ড ক্যামেরা ইন্টিগ্রেট করুন।" },
  "featuresPage.gps.analytics.title": { en: "Reports & Analytics", bn: "রিপোর্ট এবং বিশ্লেষণ" },
  "featuresPage.gps.analytics.desc": { en: "Generate detailed reports on trips, fuel, driver behavior, and fleet performance with exportable data.", bn: "এক্সপোর্টযোগ্য ডেটা সহ ট্রিপ, জ্বালানি, ড্রাইভার আচরণ এবং ফ্লিট পারফরম্যান্সের বিস্তারিত রিপোর্ট তৈরি করুন।" },

  // Features Page - Dashboard Features
  "featuresPage.dash.live.title": { en: "Live Dashboard", bn: "লাইভ ড্যাশবোর্ড" },
  "featuresPage.dash.live.desc": { en: "View all vehicles on an interactive map with real-time status updates and quick actions.", bn: "রিয়েল-টাইম স্ট্যাটাস আপডেট এবং দ্রুত অ্যাকশন সহ একটি ইন্টারেক্টিভ মানচিত্রে সব যানবাহন দেখুন।" },
  "featuresPage.dash.reports.title": { en: "Custom Reports", bn: "কাস্টম রিপোর্ট" },
  "featuresPage.dash.reports.desc": { en: "Create custom reports with filters, scheduling, and automatic email delivery.", bn: "ফিল্টার, শিডিউলিং এবং স্বয়ংক্রিয় ইমেইল ডেলিভারি সহ কাস্টম রিপোর্ট তৈরি করুন।" },
  "featuresPage.dash.mobile.title": { en: "Mobile App", bn: "মোবাইল অ্যাপ" },
  "featuresPage.dash.mobile.desc": { en: "Track your fleet on the go with our iOS and Android apps. All features available on mobile.", bn: "আমাদের iOS এবং Android অ্যাপ দিয়ে চলতে চলতে আপনার ফ্লিট ট্র্যাক করুন। মোবাইলে সব ফিচার উপলব্ধ।" },
  "featuresPage.dash.multiuser.title": { en: "Multi-User Access", bn: "মাল্টি-ইউজার অ্যাক্সেস" },
  "featuresPage.dash.multiuser.desc": { en: "Add team members with role-based permissions. Control who can see and do what.", bn: "রোল-বেসড পারমিশন সহ টিম মেম্বার যোগ করুন। কে কী দেখতে এবং করতে পারবে তা নিয়ন্ত্রণ করুন।" },
  "featuresPage.dash.api.title": { en: "API Integration", bn: "এপিআই ইন্টিগ্রেশন" },
  "featuresPage.dash.api.desc": { en: "Connect with your existing systems using our REST API. ERP, CRM, and custom integrations supported.", bn: "আমাদের REST API ব্যবহার করে আপনার বিদ্যমান সিস্টেমের সাথে সংযোগ করুন। ERP, CRM এবং কাস্টম ইন্টিগ্রেশন সমর্থিত।" },
  "featuresPage.dash.sensors.title": { en: "Sensor Support", bn: "সেন্সর সাপোর্ট" },
  "featuresPage.dash.sensors.desc": { en: "Connect temperature, door, fuel, and other sensors for complete vehicle monitoring.", bn: "সম্পূর্ণ যানবাহন মনিটরিংয়ের জন্য তাপমাত্রা, দরজা, জ্বালানি এবং অন্যান্য সেন্সর সংযুক্ত করুন।" },

  // Solutions Page - Logistics
  "solutions.logistics.title": { en: "Logistics & Delivery", bn: "লজিস্টিক্স এবং ডেলিভারি" },
  "solutions.logistics.subtitle": { en: "For delivery fleets and logistics companies", bn: "ডেলিভারি ফ্লিট এবং লজিস্টিক্স কোম্পানির জন্য" },
  "solutions.logistics.desc": { en: "Optimize delivery routes, track shipments in real-time, and improve customer satisfaction with accurate ETAs.", bn: "ডেলিভারি রুট অপ্টিমাইজ করুন, রিয়েল-টাইমে শিপমেন্ট ট্র্যাক করুন এবং সঠিক ETA দিয়ে গ্রাহক সন্তুষ্টি উন্নত করুন।" },
  "solutions.logistics.f1": { en: "Route optimization", bn: "রুট অপ্টিমাইজেশন" },
  "solutions.logistics.f2": { en: "Proof of delivery", bn: "ডেলিভারি প্রমাণ" },
  "solutions.logistics.f3": { en: "ETA notifications", bn: "ETA নোটিফিকেশন" },
  "solutions.logistics.f4": { en: "Fuel monitoring", bn: "ফুয়েল মনিটরিং" },
  "solutions.logistics.f5": { en: "Driver behavior", bn: "ড্রাইভার আচরণ" },
  "solutions.logistics.f6": { en: "Custom reports", bn: "কাস্টম রিপোর্ট" },

  // Solutions Page - School Bus
  "solutions.school.title": { en: "School Bus Tracking", bn: "স্কুল বাস ট্র্যাকিং" },
  "solutions.school.subtitle": { en: "For schools and transport operators", bn: "স্কুল এবং ট্রান্সপোর্ট অপারেটরদের জন্য" },
  "solutions.school.desc": { en: "Keep parents informed with real-time bus location and arrival notifications. Ensure student safety.", bn: "রিয়েল-টাইম বাসের অবস্থান এবং আগমন নোটিফিকেশন দিয়ে অভিভাবকদের অবগত রাখুন। শিক্ষার্থীদের নিরাপত্তা নিশ্চিত করুন।" },
  "solutions.school.f1": { en: "Parent app", bn: "অভিভাবক অ্যাপ" },
  "solutions.school.f2": { en: "Arrival alerts", bn: "আগমন অ্যালার্ট" },
  "solutions.school.f3": { en: "Route history", bn: "রুট হিস্টোরি" },
  "solutions.school.f4": { en: "Speed monitoring", bn: "গতি মনিটরিং" },
  "solutions.school.f5": { en: "Geofence alerts", bn: "জিওফেন্স অ্যালার্ট" },
  "solutions.school.f6": { en: "Driver tracking", bn: "ড্রাইভার ট্র্যাকিং" },

  // Solutions Page - Rent-a-Car
  "solutions.rentacar.title": { en: "Rent-a-Car", bn: "রেন্ট-এ-কার" },
  "solutions.rentacar.subtitle": { en: "For car rental companies", bn: "গাড়ি ভাড়া কোম্পানির জন্য" },
  "solutions.rentacar.desc": { en: "Monitor rental vehicles, prevent theft, and manage your fleet efficiently with remote engine control.", bn: "ভাড়া যানবাহন মনিটর করুন, চুরি প্রতিরোধ করুন এবং রিমোট ইঞ্জিন কন্ট্রোল দিয়ে আপনার ফ্লিট দক্ষতার সাথে পরিচালনা করুন।" },
  "solutions.rentacar.f1": { en: "Remote engine lock", bn: "রিমোট ইঞ্জিন লক" },
  "solutions.rentacar.f2": { en: "Theft prevention", bn: "চুরি প্রতিরোধ" },
  "solutions.rentacar.f3": { en: "Mileage tracking", bn: "মাইলেজ ট্র্যাকিং" },
  "solutions.rentacar.f4": { en: "Geofencing", bn: "জিওফেন্সিং" },
  "solutions.rentacar.f5": { en: "Usage reports", bn: "ব্যবহার রিপোর্ট" },
  "solutions.rentacar.f6": { en: "24/7 monitoring", bn: "২৪/৭ মনিটরিং" },

  // Solutions Page - Motorcycle
  "solutions.motorcycle.title": { en: "Motorcycle Tracking", bn: "মোটরসাইকেল ট্র্যাকিং" },
  "solutions.motorcycle.subtitle": { en: "For bike owners and ride-sharing", bn: "বাইক মালিক এবং রাইড-শেয়ারিংয়ের জন্য" },
  "solutions.motorcycle.desc": { en: "Compact GPS trackers designed for motorcycles with anti-theft features and instant SOS alerts.", bn: "অ্যান্টি-থেফট ফিচার এবং তাৎক্ষণিক SOS অ্যালার্ট সহ মোটরসাইকেলের জন্য ডিজাইন করা কমপ্যাক্ট জিপিএস ট্র্যাকার।" },
  "solutions.motorcycle.f1": { en: "Compact device", bn: "কমপ্যাক্ট ডিভাইস" },
  "solutions.motorcycle.f2": { en: "Anti-theft alerts", bn: "অ্যান্টি-থেফট অ্যালার্ট" },
  "solutions.motorcycle.f3": { en: "SOS button", bn: "SOS বাটন" },
  "solutions.motorcycle.f4": { en: "Engine lock", bn: "ইঞ্জিন লক" },
  "solutions.motorcycle.f5": { en: "Mobile app", bn: "মোবাইল অ্যাপ" },
  "solutions.motorcycle.f6": { en: "Low battery alert", bn: "লো ব্যাটারি অ্যালার্ট" },

  // Solutions Page - Corporate Fleet
  "solutions.corporate.title": { en: "Corporate Fleet", bn: "কর্পোরেট ফ্লিট" },
  "solutions.corporate.subtitle": { en: "For enterprise fleet management", bn: "এন্টারপ্রাইজ ফ্লিট ম্যানেজমেন্টের জন্য" },
  "solutions.corporate.desc": { en: "Complete fleet management solution for corporate vehicles with driver behavior monitoring and cost analytics.", bn: "ড্রাইভার আচরণ মনিটরিং এবং খরচ বিশ্লেষণ সহ কর্পোরেট যানবাহনের জন্য সম্পূর্ণ ফ্লিট ম্যানেজমেন্ট সমাধান।" },
  "solutions.corporate.f1": { en: "Multi-user access", bn: "মাল্টি-ইউজার অ্যাক্সেস" },
  "solutions.corporate.f2": { en: "Cost analytics", bn: "খরচ বিশ্লেষণ" },
  "solutions.corporate.f3": { en: "Driver scoring", bn: "ড্রাইভার স্কোরিং" },
  "solutions.corporate.f4": { en: "Maintenance alerts", bn: "রক্ষণাবেক্ষণ অ্যালার্ট" },
  "solutions.corporate.f5": { en: "API integration", bn: "এপিআই ইন্টিগ্রেশন" },
  "solutions.corporate.f6": { en: "Custom reports", bn: "কাস্টম রিপোর্ট" },

  // Solutions Page - Cold Chain
  "solutions.coldchain.title": { en: "Cold Chain Logistics", bn: "কোল্ড চেইন লজিস্টিক্স" },
  "solutions.coldchain.subtitle": { en: "For temperature-sensitive cargo", bn: "তাপমাত্রা-সংবেদনশীল কার্গোর জন্য" },
  "solutions.coldchain.desc": { en: "Monitor temperature in real-time for pharma, food, and sensitive goods transportation with instant alerts.", bn: "তাৎক্ষণিক অ্যালার্ট সহ ফার্মা, খাদ্য এবং সংবেদনশীল পণ্য পরিবহনের জন্য রিয়েল-টাইমে তাপমাত্রা মনিটর করুন।" },
  "solutions.coldchain.f1": { en: "Temperature sensors", bn: "তাপমাত্রা সেন্সর" },
  "solutions.coldchain.f2": { en: "Threshold alerts", bn: "থ্রেশহোল্ড অ্যালার্ট" },
  "solutions.coldchain.f3": { en: "Data logging", bn: "ডেটা লগিং" },
  "solutions.coldchain.f4": { en: "Compliance reports", bn: "কমপ্লায়েন্স রিপোর্ট" },
  "solutions.coldchain.f5": { en: "Door sensors", bn: "দরজা সেন্সর" },
  "solutions.coldchain.f6": { en: "Route monitoring", bn: "রুট মনিটরিং" },

  // Products Page
  "productsPage.badge": { en: "GPS Devices", bn: "জিপিএস ডিভাইস" },
  "productsPage.title": { en: "Professional GPS Tracking Devices", bn: "পেশাদার জিপিএস ট্র্যাকিং ডিভাইস" },
  "productsPage.desc": { en: "Wide range of GPS tracking devices for cars, motorcycles, trucks, and assets. All devices include free installation and 1-year warranty.", bn: "গাড়ি, মোটরসাইকেল, ট্রাক এবং অ্যাসেটের জন্য বিস্তৃত জিপিএস ট্র্যাকিং ডিভাইস। সব ডিভাইসে বিনামূল্যে ইনস্টলেশন এবং ১ বছরের ওয়ারেন্টি অন্তর্ভুক্ত।" },

  // Products Page - GT06N
  "productsPage.gt06n.title": { en: "GT06N GPS Tracker", bn: "GT06N জিপিএস ট্র্যাকার" },
  "productsPage.gt06n.subtitle": { en: "Wired Vehicle Tracker", bn: "ওয়্যার্ড ভেহিকল ট্র্যাকার" },
  "productsPage.gt06n.desc": { en: "Professional hardwired GPS tracker with remote engine cut-off, real-time tracking, and SOS button support.", bn: "রিমোট ইঞ্জিন কাট-অফ, রিয়েল-টাইম ট্র্যাকিং এবং SOS বাটন সাপোর্ট সহ পেশাদার হার্ডওয়্যার্ড জিপিএস ট্র্যাকার।" },
  "productsPage.gt06n.f1": { en: "Real-time tracking", bn: "রিয়েল-টাইম ট্র্যাকিং" },
  "productsPage.gt06n.f2": { en: "Remote engine lock", bn: "রিমোট ইঞ্জিন লক" },
  "productsPage.gt06n.f3": { en: "SOS button", bn: "SOS বাটন" },
  "productsPage.gt06n.f4": { en: "Geofencing", bn: "জিওফেন্সিং" },
  "productsPage.gt06n.f5": { en: "Speed alerts", bn: "স্পিড অ্যালার্ট" },
  "productsPage.gt06n.f6": { en: "Route replay", bn: "রুট রিপ্লে" },
  "productsPage.gt06n.f7": { en: "Backup battery", bn: "ব্যাকআপ ব্যাটারি" },
  "productsPage.gt06n.f8": { en: "Tamper alert", bn: "ট্যাম্পার অ্যালার্ট" },

  // Products Page - WeTrack2
  "productsPage.wetrack2.title": { en: "WeTrack2 4G Tracker", bn: "WeTrack2 4G ট্র্যাকার" },
  "productsPage.wetrack2.subtitle": { en: "4G LTE GPS Tracker", bn: "4G LTE জিপিএস ট্র্যাকার" },
  "productsPage.wetrack2.desc": { en: "Advanced 4G LTE tracker with faster connectivity, precise positioning, and extended coverage areas.", bn: "দ্রুত কানেক্টিভিটি, সুনির্দিষ্ট পজিশনিং এবং বর্ধিত কভারেজ এলাকা সহ উন্নত 4G LTE ট্র্যাকার।" },
  "productsPage.wetrack2.f1": { en: "4G LTE network", bn: "4G LTE নেটওয়ার্ক" },
  "productsPage.wetrack2.f2": { en: "Faster updates", bn: "দ্রুত আপডেট" },
  "productsPage.wetrack2.f3": { en: "Better coverage", bn: "ভালো কভারেজ" },
  "productsPage.wetrack2.f4": { en: "Engine cut-off", bn: "ইঞ্জিন কাট-অফ" },
  "productsPage.wetrack2.f5": { en: "Voice monitoring", bn: "ভয়েস মনিটরিং" },
  "productsPage.wetrack2.f6": { en: "Multi-tracking", bn: "মাল্টি-ট্র্যাকিং" },
  "productsPage.wetrack2.f7": { en: "Low power mode", bn: "লো পাওয়ার মোড" },
  "productsPage.wetrack2.f8": { en: "Wide voltage", bn: "ওয়াইড ভোল্টেজ" },

  // Products Page - OBD
  "productsPage.obd.title": { en: "OBD GPS Tracker", bn: "OBD জিপিএস ট্র্যাকার" },
  "productsPage.obd.subtitle": { en: "Plug & Play Tracker", bn: "প্লাগ এন্ড প্লে ট্র্যাকার" },
  "productsPage.obd.desc": { en: "Simply plug into your car's OBD port for instant tracking. No installation required, perfect for personal vehicles.", bn: "তাৎক্ষণিক ট্র্যাকিংয়ের জন্য আপনার গাড়ির OBD পোর্টে সহজভাবে প্লাগ করুন। কোনো ইনস্টলেশন প্রয়োজন নেই, ব্যক্তিগত যানবাহনের জন্য উপযুক্ত।" },
  "productsPage.obd.f1": { en: "No installation", bn: "কোনো ইনস্টলেশন নেই" },
  "productsPage.obd.f2": { en: "Vehicle diagnostics", bn: "ভেহিকল ডায়াগনস্টিকস" },
  "productsPage.obd.f3": { en: "Engine data", bn: "ইঞ্জিন ডেটা" },
  "productsPage.obd.f4": { en: "Fuel consumption", bn: "জ্বালানি খরচ" },
  "productsPage.obd.f5": { en: "Driver behavior", bn: "ড্রাইভার আচরণ" },
  "productsPage.obd.f6": { en: "Trip history", bn: "ট্রিপ হিস্টোরি" },
  "productsPage.obd.f7": { en: "Error codes", bn: "এরর কোড" },
  "productsPage.obd.f8": { en: "Easy transfer", bn: "সহজ ট্রান্সফার" },

  // Products Page - Portable
  "productsPage.portable.title": { en: "Portable GPS Tracker", bn: "পোর্টেবল জিপিএস ট্র্যাকার" },
  "productsPage.portable.subtitle": { en: "Wireless Asset Tracker", bn: "ওয়্যারলেস অ্যাসেট ট্র্যাকার" },
  "productsPage.portable.desc": { en: "Battery-powered GPS tracker for assets, containers, and personal tracking. Up to 90 days standby battery.", bn: "অ্যাসেট, কন্টেইনার এবং ব্যক্তিগত ট্র্যাকিংয়ের জন্য ব্যাটারি-চালিত জিপিএস ট্র্যাকার। ৯০ দিন পর্যন্ত স্ট্যান্ডবাই ব্যাটারি।" },
  "productsPage.portable.f1": { en: "No wiring needed", bn: "কোনো ওয়্যারিং নেই" },
  "productsPage.portable.f2": { en: "90 days battery", bn: "৯০ দিন ব্যাটারি" },
  "productsPage.portable.f3": { en: "Magnetic mount", bn: "ম্যাগনেটিক মাউন্ট" },
  "productsPage.portable.f4": { en: "Waterproof", bn: "ওয়াটারপ্রুফ" },
  "productsPage.portable.f5": { en: "Asset tracking", bn: "অ্যাসেট ট্র্যাকিং" },
  "productsPage.portable.f6": { en: "Motion sensor", bn: "মোশন সেন্সর" },
  "productsPage.portable.f7": { en: "Compact size", bn: "কমপ্যাক্ট সাইজ" },
  "productsPage.portable.f8": { en: "Global tracking", bn: "গ্লোবাল ট্র্যাকিং" },

  // Products Page - Motorcycle
  "productsPage.motorcycle.title": { en: "Motorcycle Tracker", bn: "মোটরসাইকেল ট্র্যাকার" },
  "productsPage.motorcycle.subtitle": { en: "Compact Bike Tracker", bn: "কমপ্যাক্ট বাইক ট্র্যাকার" },
  "productsPage.motorcycle.desc": { en: "Compact GPS tracker designed specifically for motorcycles with anti-theft features and engine immobilizer.", bn: "অ্যান্টি-থেফট ফিচার এবং ইঞ্জিন ইমোবিলাইজার সহ বিশেষভাবে মোটরসাইকেলের জন্য ডিজাইন করা কমপ্যাক্ট জিপিএস ট্র্যাকার।" },
  "productsPage.motorcycle.f1": { en: "Compact design", bn: "কমপ্যাক্ট ডিজাইন" },
  "productsPage.motorcycle.f2": { en: "Anti-theft", bn: "অ্যান্টি-থেফট" },
  "productsPage.motorcycle.f3": { en: "Engine lock", bn: "ইঞ্জিন লক" },
  "productsPage.motorcycle.f4": { en: "Vibration alert", bn: "ভাইব্রেশন অ্যালার্ট" },
  "productsPage.motorcycle.f5": { en: "Hidden install", bn: "হিডেন ইনস্টল" },
  "productsPage.motorcycle.f6": { en: "Waterproof", bn: "ওয়াটারপ্রুফ" },
  "productsPage.motorcycle.f7": { en: "ACC detection", bn: "ACC ডিটেকশন" },
  "productsPage.motorcycle.f8": { en: "Low battery alert", bn: "লো ব্যাটারি অ্যালার্ট" },

  // Products Page - Dashcam
  "productsPage.dashcam.title": { en: "GPS + Dashcam", bn: "জিপিএস + ড্যাশক্যাম" },
  "productsPage.dashcam.subtitle": { en: "Video Telematics", bn: "ভিডিও টেলিম্যাটিক্স" },
  "productsPage.dashcam.desc": { en: "Combined GPS tracking with dual dashcam for complete fleet visibility. Live streaming and cloud recording.", bn: "সম্পূর্ণ ফ্লিট ভিজিবিলিটির জন্য ডুয়াল ড্যাশক্যাম সহ সম্মিলিত জিপিএস ট্র্যাকিং। লাইভ স্ট্রিমিং এবং ক্লাউড রেকর্ডিং।" },
  "productsPage.dashcam.f1": { en: "Dual camera", bn: "ডুয়াল ক্যামেরা" },
  "productsPage.dashcam.f2": { en: "Live streaming", bn: "লাইভ স্ট্রিমিং" },
  "productsPage.dashcam.f3": { en: "Cloud storage", bn: "ক্লাউড স্টোরেজ" },
  "productsPage.dashcam.f4": { en: "Event recording", bn: "ইভেন্ট রেকর্ডিং" },
  "productsPage.dashcam.f5": { en: "Night vision", bn: "নাইট ভিশন" },
  "productsPage.dashcam.f6": { en: "AI driver alerts", bn: "AI ড্রাইভার অ্যালার্ট" },
  "productsPage.dashcam.f7": { en: "1080p quality", bn: "1080p কোয়ালিটি" },
  "productsPage.dashcam.f8": { en: "GPS integrated", bn: "জিপিএস ইন্টিগ্রেটেড" },

  // Products Page - Why Choose Us
  "productsPage.whyChoose": { en: "Why Choose EyeOn?", bn: "কেন EyeOn বেছে নেবেন?" },
  "productsPage.whyChooseDesc": { en: "We provide complete GPS tracking solutions with professional support and service.", bn: "আমরা পেশাদার সাপোর্ট এবং সার্ভিস সহ সম্পূর্ণ জিপিএস ট্র্যাকিং সমাধান প্রদান করি।" },
  "productsPage.genuine.title": { en: "Genuine Devices", bn: "জেনুইন ডিভাইস" },
  "productsPage.genuine.desc": { en: "100% original devices from certified manufacturers with full warranty.", bn: "সম্পূর্ণ ওয়ারেন্টি সহ সার্টিফাইড প্রস্তুতকারকদের ১০০% অরিজিনাল ডিভাইস।" },
  "productsPage.freeInstall.title": { en: "Free Installation", bn: "বিনামূল্যে ইনস্টলেশন" },
  "productsPage.freeInstall.desc": { en: "Professional installation included with every device purchase.", bn: "প্রতিটি ডিভাইস ক্রয়ের সাথে পেশাদার ইনস্টলেশন অন্তর্ভুক্ত।" },
  "productsPage.warranty.title": { en: "1-Year Warranty", bn: "১ বছরের ওয়ারেন্টি" },
  "productsPage.warranty.desc": { en: "Full 1-year warranty with free repair and replacement.", bn: "বিনামূল্যে মেরামত এবং প্রতিস্থাপন সহ সম্পূর্ণ ১ বছরের ওয়ারেন্টি।" },
  "productsPage.support247.title": { en: "24/7 Support", bn: "২৪/৭ সাপোর্ট" },
  "productsPage.support247.desc": { en: "Round-the-clock technical support and customer service.", bn: "চব্বিশ ঘণ্টা প্রযুক্তিগত সাপোর্ট এবং গ্রাহক সেবা।" },
  "productsPage.needHelp": { en: "Need Help Choosing?", bn: "বেছে নিতে সাহায্য দরকার?" },
  "productsPage.needHelpDesc": { en: "Our experts will help you find the perfect GPS tracker for your needs. Call us for a free consultation.", bn: "আমাদের বিশেষজ্ঞরা আপনার প্রয়োজনের জন্য উপযুক্ত জিপিএস ট্র্যাকার খুঁজে পেতে সাহায্য করবেন। বিনামূল্যে পরামর্শের জন্য আমাদের কল করুন।" },
  "productsPage.callNow": { en: "Call Now", bn: "এখনই কল করুন" },
  "productsPage.requestDemo": { en: "Request Demo", bn: "ডেমো অনুরোধ করুন" },

  // Products Page - Badges
  "productsPage.badge.wired": { en: "Wired", bn: "ওয়্যার্ড" },
  "productsPage.badge.4g": { en: "4G LTE", bn: "4G LTE" },
  "productsPage.badge.obd": { en: "OBD", bn: "OBD" },
  "productsPage.badge.wireless": { en: "Wireless", bn: "ওয়্যারলেস" },
  "productsPage.badge.dashcam": { en: "Dashcam", bn: "ড্যাশক্যাম" },
  "productsPage.badge.sale": { en: "Sale", bn: "সেল" },

  // Products Page - Filters
  "productsPage.filter.all": { en: "All Devices", bn: "সব ডিভাইস" },
  "productsPage.filter.wired": { en: "Wired GPS", bn: "ওয়্যার্ড জিপিএস" },
  "productsPage.filter.4g": { en: "4G Trackers", bn: "4G ট্র্যাকার" },
  "productsPage.filter.obd": { en: "OBD Plug & Play", bn: "OBD প্লাগ এন্ড প্লে" },
  "productsPage.filter.wireless": { en: "Wireless/Portable", bn: "ওয়্যারলেস/পোর্টেবল" },
  "productsPage.filter.dashcam": { en: "Dashcam + GPS", bn: "ড্যাশক্যাম + জিপিএস" },

  // Products Page - Pricing & Warranty
  "productsPage.contactForPrice": { en: "Contact for Price", bn: "দামের জন্য যোগাযোগ করুন" },
  "productsPage.monthWarranty": { en: "Month Warranty", bn: "মাস ওয়ারেন্টি" },
  "productsPage.freeInstall": { en: "Free Installation", bn: "ফ্রি ইনস্টলেশন" },
  "productsPage.viewDetails": { en: "View Details", bn: "বিস্তারিত দেখুন" },
  "productsPage.getQuote": { en: "Get Quote", bn: "কোট নিন" },
  "productsPage.noProducts": { en: "No products found in this category.", bn: "এই ক্যাটাগরিতে কোনো পণ্য পাওয়া যায়নি।" },

  // Products Page - Hero Stats
  "productsPage.startingFrom": { en: "Starting From", bn: "শুরু থেকে" },
  "productsPage.monthsWarranty": { en: "Months Warranty", bn: "মাস ওয়ারেন্টি" },
  "productsPage.supportAvailable": { en: "Support Available", bn: "সাপোর্ট উপলব্ধ" },

  // Product Detail Page
  "productDetail.notFound": { en: "Product Not Found", bn: "পণ্য পাওয়া যায়নি" },
  "productDetail.notFoundDesc": { en: "The product you are looking for does not exist.", bn: "আপনি যে পণ্য খুঁজছেন তা বিদ্যমান নেই।" },
  "productDetail.backToProducts": { en: "Back to Products", bn: "পণ্যে ফিরে যান" },
  "productDetail.features": { en: "Key Features", bn: "মূল বৈশিষ্ট্য" },
  "productDetail.orderNow": { en: "Order Now", bn: "এখনই অর্ডার করুন" },
  "productDetail.getQuote": { en: "Get a Quote", bn: "কোটেশন নিন" },
  "productDetail.callUs": { en: "Call us", bn: "কল করুন" },
  "productDetail.whyChoose": { en: "Why Choose This Product?", bn: "কেন এই পণ্যটি বেছে নেবেন?" },
  "productDetail.benefit1Title": { en: "Premium Quality", bn: "প্রিমিয়াম কোয়ালিটি" },
  "productDetail.benefit1Desc": { en: "High-quality GPS chips with accurate tracking and reliable performance in all conditions.", bn: "সমস্ত পরিস্থিতিতে সঠিক ট্র্যাকিং এবং নির্ভরযোগ্য পারফরম্যান্স সহ উচ্চ-মানের জিপিএস চিপ।" },
  "productDetail.benefit2Title": { en: "Warranty & Support", bn: "ওয়ারেন্টি এবং সাপোর্ট" },
  "productDetail.benefit2Desc": { en: "Full manufacturer warranty with dedicated 24/7 technical support team.", bn: "নিবেদিত ২৪/৭ টেকনিক্যাল সাপোর্ট টিম সহ সম্পূর্ণ প্রস্তুতকারকের ওয়ারেন্টি।" },
  "productDetail.benefit3Title": { en: "Trusted Brand", bn: "বিশ্বস্ত ব্র্যান্ড" },
  "productDetail.benefit3Desc": { en: "Trusted by 150+ companies across Bangladesh with proven track record.", bn: "প্রমাণিত ট্র্যাক রেকর্ড সহ বাংলাদেশ জুড়ে ১৫০+ কোম্পানির বিশ্বস্ত।" },
  "productDetail.relatedProducts": { en: "Related Products", bn: "সম্পর্কিত পণ্য" },

  // About Page
  "about.badge": { en: "About Us", bn: "আমাদের সম্পর্কে" },
  "about.title": { en: "Trusted GPS Tracking Since 2016", bn: "২০১৬ থেকে বিশ্বস্ত জিপিএস ট্র্যাকিং" },
  "about.subtitle": { en: "EyeOn GPS Tracking Service is a trusted and affordable vehicle tracking and fleet management solution in Bangladesh.", bn: "EyeOn জিপিএস ট্র্যাকিং সার্ভিস বাংলাদেশে একটি বিশ্বস্ত এবং সাশ্রয়ী মূল্যের যানবাহন ট্র্যাকিং এবং ফ্লিট ম্যানেজমেন্ট সমাধান।" },
  "about.stats.since": { en: "Since 2016", bn: "২০১৬ থেকে" },
  "about.stats.clients": { en: "150+ Corporate Clients", bn: "১৫০+ কর্পোরেট ক্লায়েন্ট" },
  "about.stats.vehicles": { en: "10,000+ Vehicles Tracked", bn: "১০,০০০+ ট্র্যাককৃত যানবাহন" },
  "about.stats.support": { en: "24/7 Support", bn: "২৪/৭ সাপোর্ট" },
  "about.story.badge": { en: "Our Story", bn: "আমাদের গল্প" },
  "about.story.title": { en: "Building Bangladesh's Most Trusted GPS Platform", bn: "বাংলাদেশের সবচেয়ে বিশ্বস্ত জিপিএস প্ল্যাটফর্ম তৈরি করা" },
  "about.story.p1": { en: "Since starting our journey in 2016, we have been committed to providing reliable, smart, and advanced GPS tracking solutions for individuals, businesses, logistics companies, transport operators, and corporate fleets.", bn: "২০১৬ সালে আমাদের যাত্রা শুরু করার পর থেকে, আমরা ব্যক্তি, ব্যবসা, লজিস্টিক্স কোম্পানি, পরিবহন অপারেটর এবং কর্পোরেট ফ্লিটের জন্য নির্ভরযোগ্য, স্মার্ট এবং উন্নত জিপিএস ট্র্যাকিং সমাধান প্রদান করতে প্রতিশ্রুতিবদ্ধ।" },
  "about.story.p2": { en: "Our GPS tracking system helps you track vehicles in real time, monitor routes, improve fuel efficiency, control expenses, and enhance vehicle safety.", bn: "আমাদের জিপিএস ট্র্যাকিং সিস্টেম আপনাকে রিয়েল টাইমে যানবাহন ট্র্যাক করতে, রুট মনিটর করতে, জ্বালানি দক্ষতা উন্নত করতে, খরচ নিয়ন্ত্রণ করতে এবং যানবাহন সুরক্ষা বাড়াতে সাহায্য করে।" },
  "about.story.p3": { en: "With accurate location information, smart fleet management features, and dedicated customer support, EyeOn makes managing vehicles easier, safer, and more efficient.", bn: "সঠিক অবস্থান তথ্য, স্মার্ট ফ্লিট ম্যানেজমেন্ট ফিচার এবং নিবেদিত গ্রাহক সাপোর্টের মাধ্যমে, EyeOn যানবাহন পরিচালনাকে সহজ, নিরাপদ এবং আরও দক্ষ করে তোলে।" },
  "about.mission.badge": { en: "Our Mission", bn: "আমাদের মিশন" },
  "about.mission.title": { en: "Smart Fleet Management for Modern Bangladesh", bn: "আধুনিক বাংলাদেশের জন্য স্মার্ট ফ্লিট ম্যানেজমেন্ট" },
  "about.mission.desc": { en: "Whether you need GPS tracking for a personal car, business vehicle, transport fleet, or large-scale enterprise, EyeOn provides practical and cost-effective solutions designed for modern vehicle management in Bangladesh.", bn: "আপনার ব্যক্তিগত গাড়ি, ব্যবসায়িক যানবাহন, পরিবহন ফ্লিট বা বড় আকারের এন্টারপ্রাইজের জন্য জিপিএস ট্র্যাকিং প্রয়োজন হোক না কেন, EyeOn বাংলাদেশে আধুনিক যানবাহন ব্যবস্থাপনার জন্য ডিজাইন করা ব্যবহারিক এবং সাশ্রয়ী সমাধান প্রদান করে।" },
  "about.why.title": { en: "Why Choose EyeOn?", bn: "কেন EyeOn বেছে নেবেন?" },
  "about.why.local": { en: "Local Expertise", bn: "স্থানীয় দক্ষতা" },
  "about.why.local.desc": { en: "Built specifically for Bangladesh roads and conditions with Bengali language support.", bn: "বাংলা ভাষা সাপোর্ট সহ বিশেষভাবে বাংলাদেশের রাস্তা এবং পরিস্থিতির জন্য তৈরি।" },
  "about.why.owned": { en: "Owned Technology", bn: "নিজস্ব প্রযুক্তি" },
  "about.why.owned.desc": { en: "We own our full technology stack - not a reseller of foreign platforms.", bn: "আমরা আমাদের সম্পূর্ণ প্রযুক্তি স্ট্যাকের মালিক - বিদেশী প্ল্যাটফর্মের রিসেলার নই।" },
  "about.why.support": { en: "Dedicated Support", bn: "নিবেদিত সাপোর্ট" },
  "about.why.support.desc": { en: "24/7 technical support in Bengali and English with local service centers.", bn: "স্থানীয় সার্ভিস সেন্টার সহ বাংলা এবং ইংরেজিতে ২৪/৭ টেকনিক্যাল সাপোর্ট।" },
  "about.why.affordable": { en: "Affordable Plans", bn: "সাশ্রয়ী প্ল্যান" },
  "about.why.affordable.desc": { en: "Competitive pricing with bKash and Nagad payment options.", bn: "বিকাশ এবং নগদ পেমেন্ট অপশন সহ প্রতিযোগিতামূলক মূল্য।" },
  "about.team.badge": { en: "Our Team", bn: "আমাদের টিম" },
  "about.team.title": { en: "Expert Team Behind Your Fleet Safety", bn: "আপনার ফ্লিট সুরক্ষার পিছনে বিশেষজ্ঞ টিম" },
  "about.team.desc": { en: "Our dedicated team of engineers, support specialists, and field technicians ensures your vehicles are always protected and monitored.", bn: "আমাদের নিবেদিত ইঞ্জিনিয়ার, সাপোর্ট স্পেশালিস্ট এবং ফিল্ড টেকনিশিয়ানদের টিম নিশ্চিত করে যে আপনার যানবাহন সবসময় সুরক্ষিত এবং মনিটর করা হচ্ছে।" },
  "about.cta.title": { en: "Ready to Get Started?", bn: "শুরু করতে প্রস্তুত?" },
  "about.cta.desc": { en: "Join 150+ companies who trust EyeOn for their fleet management needs.", bn: "১৫০+ কোম্পানির সাথে যোগ দিন যারা তাদের ফ্লিট ম্যানেজমেন্ট প্রয়োজনে EyeOn-এ বিশ্বাস করে।" },
  "about.cta.call": { en: "Call Us Now", bn: "এখনই কল করুন" },
  "about.cta.contact": { en: "Contact Sales", bn: "সেলস-এ যোগাযোগ" },

  // Footer
  "footer.desc": { en: "Bangladesh's leading GPS tracking and fleet management platform. Real-time monitoring, fuel tracking, and intelligent alerts for your entire fleet.", bn: "বাংলাদেশের শীর্ষস্থানীয় জিপিএস ট্র্যাকিং এবং ফ্লিট ম্যানেজমেন্ট প্ল্যাটফর্ম। আপনার সম্পূর্ণ ফ্লিটের জন্য রিয়েল-টাইম মনিটরিং, ফুয়েল ট্র্যাকিং এবং বুদ্ধিমান অ্যালার্ট।" },
  "footer.quickLinks": { en: "Quick Links", bn: "দ্রুত লিংক" },
  "footer.contactUs": { en: "Contact Us", bn: "যোগাযোগ করুন" },
  "footer.address": { en: "House 12, Road 5, Dhanmondi, Dhaka 1205", bn: "বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা ১২০৫" },
  "footer.certifications": { en: "Certifications", bn: "সার্টিফিকেশন" },
  "footer.rights": { en: "All rights reserved.", bn: "সর্বস্বত্ব সংরক্ষিত।" },
  "footer.payment": { en: "We Accept", bn: "আমরা গ্রহণ করি" },
  "footer.securePayment": { en: "Secure & Trusted Payment Methods", bn: "নিরাপদ ও বিশ্বস্ত পেমেন্ট পদ্ধতি" },

  // Top Contact Bar
  "topBar.tagline": { en: "Bangladesh's #1 GPS Tracking Service", bn: "বাংলাদেশের #১ জিপিএস ট্র্যাকিং সেবা" },
  "topBar.btrc": { en: "BTRC Certified", bn: "বিটিআরসি সার্টিফাইড" },
  "topBar.callNow": { en: "Call Now", bn: "এখনই কল করুন" },

  // WhatsApp Floating Button
  "whatsapp.tooltip": { en: "Need help? Chat with us!", bn: "সাহায্য দরকার? আমাদের সাথে চ্যাট করুন!" },
  "whatsapp.message": { en: "Hi! I'm interested in EyeOn GPS tracking. Can you help?", bn: "হাই! আমি EyeOn জিপিএস ট্র্যাকিংয়ে আগ্রহী। আপনি কি সাহায্য করতে পারবেন?" },

  // Why Choose Section
  "why.badge": { en: "Why EyeOn?", bn: "কেন EyeOn?" },
  "why.title": { en: "Why Choose EyeOn?", bn: "কেন EyeOn বেছে নেবেন?" },
  "why.desc": { en: "We're not just another GPS service. Here's what makes us different.", bn: "আমরা শুধু আরেকটি জিপিএস সেবা নই। এখানে আমাদের পার্থক্য।" },
  "why.btrc.title": { en: "BTRC Certified", bn: "বিটিআরসি সার্টিফাইড" },
  "why.btrc.desc": { en: "Government approved and certified tracking devices", bn: "সরকার অনুমোদিত এবং সার্টিফাইড ট্র্যাকিং ডিভাইস" },
  "why.price.title": { en: "Best Price Deal", bn: "সেরা মূল্য" },
  "why.price.desc": { en: "Competitive pricing starting from ৳200/month", bn: "৳২০০/মাস থেকে শুরু প্রতিযোগিতামূলক মূল্য" },
  "why.owned.title": { en: "Own Technology", bn: "নিজস্ব প্রযুক্তি" },
  "why.owned.desc": { en: "We built our platform - not a reseller", bn: "আমরা প্ল্যাটফর্ম তৈরি করেছি - রিসেলার নই" },
  "why.support.title": { en: "24/7 Support", bn: "২৪/৭ সাপোর্ট" },
  "why.support.desc": { en: "Expert support team available round the clock", bn: "বিশেষজ্ঞ সাপোর্ট টিম সারাক্ষণ উপলব্ধ" },
  "why.local.title": { en: "Made in Bangladesh", bn: "বাংলাদেশে তৈরি" },
  "why.local.desc": { en: "Local team, Bengali support, bKash/Nagad payment", bn: "স্থানীয় টিম, বাংলা সাপোর্ট, বিকাশ/নগদ পেমেন্ট" },

  // Testimonials Section
  "testimonials.badge": { en: "Customer Reviews", bn: "গ্রাহক রিভিউ" },
  "testimonials.title": { en: "What Our Customers Say", bn: "আমাদের গ্রাহকরা কী বলেন" },
  "testimonials.desc": { en: "Join 150+ satisfied customers across Bangladesh", bn: "বাংলাদেশ জুড়ে ১৫০+ সন্তুষ্ট গ্রাহকের সাথে যোগ দিন" },
  "testimonial.1.quote": { en: "EyeOn helped us reduce fuel theft by 40%. The Bengali interface made it easy for our drivers to adopt.", bn: "EyeOn আমাদের জ্বালানি চুরি ৪০% কমাতে সাহায্য করেছে। বাংলা ইন্টারফেস আমাদের ড্রাইভারদের জন্য সহজ করেছে।" },
  "testimonial.1.name": { en: "Kamal Hossain", bn: "কামাল হোসেন" },
  "testimonial.1.role": { en: "Fleet Manager, ABC Logistics", bn: "ফ্লিট ম্যানেজার, ABC লজিস্টিক" },
  "testimonial.2.quote": { en: "After my bike was stolen, I got EyeOn installed. Now I have peace of mind knowing I can track it anytime.", bn: "আমার বাইক চুরি হওয়ার পর, আমি EyeOn ইনস্টল করিয়েছি। এখন আমি জানি যেকোনো সময় ট্র্যাক করতে পারি।" },
  "testimonial.2.name": { en: "Rafiq Ahmed", bn: "রফিক আহমেদ" },
  "testimonial.2.role": { en: "Bike Owner, Mirpur", bn: "বাইক মালিক, মিরপুর" },
  "testimonial.3.quote": { en: "The school bus tracking feature gives parents real-time updates. It's been a game-changer for our school.", bn: "স্কুল বাস ট্র্যাকিং ফিচার অভিভাবকদের রিয়েল-টাইম আপডেট দেয়। এটি আমাদের স্কুলের জন্য গেম-চেঞ্জার।" },
  "testimonial.3.name": { en: "Fatima Begum", bn: "ফাতিমা বেগম" },
  "testimonial.3.role": { en: "Principal, Green Valley School", bn: "অধ্যক্ষ, গ্রিন ভ্যালি স্কুল" },

  // FAQ Section (additional)
  "faq.badge": { en: "FAQ", bn: "জিজ্ঞাসা" },
  "faq.desc": { en: "Find answers to common questions about our GPS tracking service.", bn: "আমাদের জিপিএস ট্র্যাকিং সেবা সম্পর্কে সাধারণ প্রশ্নের উত্তর পান।" },
  "faq.moreQuestions": { en: "Have more questions? We're here to help.", bn: "আরও প্রশ্ন আছে? আমরা সাহায্য করতে এখানে আছি।" },
  "faq.callUs": { en: "Call Us: +880 1999-036999", bn: "কল করুন: +৮৮০ ১৯৯৯-০৩৬৯৯৯" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("motolink-lang") as Lang | null;
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
      localStorage.setItem("motolink-lang", newLang);
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
