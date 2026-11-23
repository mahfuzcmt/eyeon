"use client";

import { useLanguage } from "../LanguageContext";
import { CONTACT, PageHero, whatsappLink } from "../shared";

/*
 * Privacy policy and account deletion (2026-11-23), written for the Google Play listing, which
 * requires both as public web pages. They describe what the code really does - keep them in step
 * with it: if the app starts sending something new to a server or another company, say so here.
 */

type Block = { h: string; p?: string[]; list?: string[] };

const UPDATED = { en: "23 November 2026", bn: "২৩ নভেম্বর ২০২৬" };

const PRIVACY: Record<"en" | "bn", Block[]> = {
  en: [
    {
      h: "Who we are",
      p: [
        "EyeOn (the EyeOn app, the EyeOn AI Watch and eyeoniot.com) is run by Web Innovation, Dhaka, Bangladesh. This policy explains what information EyeOn handles, why, and what you can do about it.",
        `Questions or requests: call ${CONTACT.phoneDisplay} or message us on WhatsApp.`,
      ],
    },
    {
      h: "Who uses the app",
      p: [
        "The EyeOn app is for parents, carers and schools - the adults who look after a child or an elderly relative. The person who wears the watch or tracker does not use the app. Accounts are set up for families and schools by EyeOn or by the school; the app has no public sign-up.",
      ],
    },
    {
      h: "What we collect",
      list: [
        "Your account: your name, email address, phone number and password (stored only as a one-way hash). The phone number is used to send you a password reset code and emergency (SOS) text messages.",
        "The person you look after: the name you give them, and optionally a class or ID and a photo you choose. Photos are re-encoded on our server, which removes their hidden data such as the place they were taken.",
        "From the watch or tracker: its location (GPS, or a position estimated from nearby Wi-Fi networks and mobile cell towers), battery level, alarms such as SOS and low battery, and the time of each report.",
        "What you set up: places (home, school), areas, usual routes, expected arrival and leaving times, and the alerts produced from them.",
        "Your phone: a notification token so we can send alerts, and the language the app is set to. When you tap \"Locate me\", the app uses your phone's location only to centre the map; it is not sent to us.",
      ],
    },
    {
      h: "What we do with it",
      list: [
        "Show you where the person is, their route and where they stayed during the day.",
        "Tell you when they arrive at or leave a place, go outside an area or off a route, press SOS, or when the battery is low.",
        "Keep the service working and secure, and answer your questions.",
      ],
      p: ["We do not sell personal information and do not use it for advertising. The app shows sponsor banners chosen by EyeOn; they do not use your data or track you."],
    },
    {
      h: "Who can see it",
      p: [
        "Only the people signed in to your account who have been given access to that person. In a school, the school's administrators see their own students, and each parent sees only their own child. Places you create are visible only to you.",
        "If you create a share link, anyone with that link can see the live location until the link expires or you stop it.",
      ],
    },
    {
      h: "Services we use",
      list: [
        "Google: map display (Google Maps), and turning Wi-Fi / cell tower scans into a position (Google Geolocation API).",
        "Expo and Google Firebase Cloud Messaging / Apple Push Notification service: delivering notifications to your phone.",
        "OpenStreetMap services (Nominatim, OSRM): street names for a location and drawing routes on the road. Only coordinates are sent.",
        "SSL Wireless (Bangladesh): sending SMS messages (password reset codes and SOS alerts) to your phone number.",
      ],
      p: ["Our servers are run by us on a hosted server; information is sent over encrypted connections (HTTPS)."],
    },
    {
      h: "How long we keep it",
      p: [
        "Account details, settings and location history are kept while the account is active, so you can look back at earlier days. When an account or a person is deleted, their information is removed from our database. Backups are overwritten in the normal course.",
      ],
    },
    {
      h: "Your choices",
      list: [
        "See and change your details and the person's details in the app.",
        "Turn notifications off in the app's settings or your phone's settings.",
        "Ask us for a copy of your information, to correct it, or to delete your account - see \"Delete your account\" (eyeoniot.com/delete-account).",
      ],
    },
    {
      h: "Children",
      p: [
        "EyeOn is used to look after children, but the app is used by their parents, carers and schools, not by the children. A child's information is added by and under the control of their parent or school.",
      ],
    },
    {
      h: "Changes",
      p: ["If this policy changes, the new version is published on this page with its date."],
    },
  ],
  bn: [
    {
      h: "আমরা কারা",
      p: [
        "EyeOn (EyeOn অ্যাপ, EyeOn AI ঘড়ি আর eyeoniot.com) পরিচালনা করে Web Innovation, ঢাকা, বাংলাদেশ। EyeOn কী তথ্য ব্যবহার করে, কেন করে, আর এ বিষয়ে আপনি কী করতে পারেন - এই নীতিতে তা বলা আছে।",
        `প্রশ্ন বা অনুরোধ: কল করুন ${CONTACT.phoneDisplay} অথবা WhatsApp-এ লিখুন।`,
      ],
    },
    {
      h: "অ্যাপটি কারা ব্যবহার করেন",
      p: [
        "EyeOn অ্যাপ অভিভাবক, দেখাশোনাকারী আর স্কুলের জন্য - যাঁরা কোনো শিশু বা বয়স্ক আত্মীয়ের দেখাশোনা করেন। যিনি ঘড়ি বা ট্র্যাকার পরেন, তিনি অ্যাপ ব্যবহার করেন না। পরিবার ও স্কুলের অ্যাকাউন্ট EyeOn বা স্কুল খুলে দেয়; অ্যাপে নিজে নিজে অ্যাকাউন্ট খোলার ব্যবস্থা নেই।",
      ],
    },
    {
      h: "আমরা কী তথ্য রাখি",
      list: [
        "আপনার অ্যাকাউন্ট: নাম, ইমেইল, ফোন নম্বর আর পাসওয়ার্ড (শুধু একমুখী হ্যাশ হিসেবে)। ফোন নম্বরে পাসওয়ার্ড রিসেট কোড আর জরুরি (SOS) মেসেজ পাঠানো হয়।",
        "যাঁর দেখাশোনা করছেন: আপনার দেওয়া নাম, ইচ্ছা করলে ক্লাস/আইডি আর একটি ছবি। ছবি আমাদের সার্ভারে নতুন করে তৈরি হয়, ফলে ছবির ভেতরের লুকানো তথ্য (যেমন কোথায় তোলা) মুছে যায়।",
        "ঘড়ি বা ট্র্যাকার থেকে: লোকেশন (GPS, অথবা আশপাশের Wi-Fi ও মোবাইল টাওয়ার থেকে আনুমানিক অবস্থান), ব্যাটারি, SOS ও লো ব্যাটারির মতো অ্যালার্ট, আর প্রতিটি তথ্যের সময়।",
        "আপনি যা ঠিক করে দেন: জায়গা (বাসা, স্কুল), এলাকা, যাওয়ার পথ, পৌঁছানো ও বের হওয়ার সময়, আর সেগুলো থেকে তৈরি অ্যালার্ট।",
        "আপনার ফোন: অ্যালার্ট পাঠানোর জন্য একটি নোটিফিকেশন টোকেন, আর অ্যাপের ভাষা। \"Locate me\" চাপলে আপনার ফোনের লোকেশন শুধু ম্যাপ সাজাতে ব্যবহার হয়; আমাদের কাছে পাঠানো হয় না।",
      ],
    },
    {
      h: "তথ্য দিয়ে আমরা কী করি",
      list: [
        "সে কোথায় আছে, কোন পথে গেছে, সারাদিন কোথায় কতক্ষণ ছিল - তা দেখাই।",
        "কোনো জায়গায় পৌঁছালে বা বের হলে, এলাকা বা পথের বাইরে গেলে, SOS চাপলে বা ব্যাটারি কমে গেলে জানাই।",
        "সেবা চালু ও নিরাপদ রাখি, আর আপনার প্রশ্নের উত্তর দিই।",
      ],
      p: ["আমরা ব্যক্তিগত তথ্য বিক্রি করি না, বিজ্ঞাপনের কাজেও ব্যবহার করি না। অ্যাপে EyeOn-এর বেছে নেওয়া স্পনসর ব্যানার দেখা যায়; সেগুলো আপনার তথ্য ব্যবহার করে না, আপনাকে ট্র্যাকও করে না।"],
    },
    {
      h: "কারা দেখতে পান",
      p: [
        "শুধু আপনার অ্যাকাউন্টে লগ ইন করা সেই মানুষেরা, যাঁদের ওই ব্যক্তিকে দেখার অনুমতি দেওয়া আছে। স্কুলে প্রশাসক শুধু নিজের শিক্ষার্থীদের দেখেন, আর প্রত্যেক অভিভাবক শুধু নিজের সন্তানকে। আপনার তৈরি জায়গাগুলো শুধু আপনিই দেখেন।",
        "শেয়ার লিংক তৈরি করলে, লিংকটির মেয়াদ শেষ হওয়া বা আপনি বন্ধ করা পর্যন্ত লিংক পাওয়া যে কেউ লাইভ লোকেশন দেখতে পারবেন।",
      ],
    },
    {
      h: "যেসব সেবা ব্যবহার করি",
      list: [
        "Google: ম্যাপ দেখানো (Google Maps), আর Wi-Fi / মোবাইল টাওয়ারের তথ্য থেকে অবস্থান বের করা (Google Geolocation API)।",
        "Expo ও Google Firebase Cloud Messaging / Apple Push Notification service: আপনার ফোনে নোটিফিকেশন পৌঁছানো।",
        "OpenStreetMap-এর সেবা (Nominatim, OSRM): কোনো অবস্থানের রাস্তার নাম, আর রাস্তা ধরে পথ আঁকা। শুধু স্থানাঙ্ক পাঠানো হয়।",
        "SSL Wireless (বাংলাদেশ): আপনার ফোন নম্বরে SMS (পাসওয়ার্ড রিসেট কোড ও SOS অ্যালার্ট) পাঠানো।",
      ],
      p: ["আমাদের সার্ভার আমরাই একটি ভাড়া করা সার্ভারে চালাই; তথ্য এনক্রিপ্ট করা সংযোগে (HTTPS) আদান-প্রদান হয়।"],
    },
    {
      h: "কতদিন রাখি",
      p: [
        "অ্যাকাউন্ট চালু থাকা পর্যন্ত অ্যাকাউন্টের তথ্য, সেটিংস আর লোকেশনের ইতিহাস রাখা হয়, যাতে আগের দিনগুলো দেখতে পারেন। কোনো অ্যাকাউন্ট বা ব্যক্তিকে মুছে দিলে তার তথ্য আমাদের ডেটাবেস থেকে মুছে যায়। ব্যাকআপ স্বাভাবিক নিয়মে নতুন ব্যাকআপ দিয়ে মুছে যায়।",
      ],
    },
    {
      h: "আপনি যা করতে পারেন",
      list: [
        "অ্যাপে নিজের ও দেখাশোনা করা ব্যক্তির তথ্য দেখা ও বদলানো।",
        "অ্যাপের সেটিংস বা ফোনের সেটিংস থেকে নোটিফিকেশন বন্ধ করা।",
        "নিজের তথ্যের কপি চাওয়া, ভুল ঠিক করা, বা অ্যাকাউন্ট মুছে ফেলার অনুরোধ - দেখুন \"অ্যাকাউন্ট মুছুন\" (eyeoniot.com/delete-account)।",
      ],
    },
    {
      h: "শিশু",
      p: [
        "EyeOn শিশুদের দেখাশোনায় ব্যবহার হয়, কিন্তু অ্যাপটি ব্যবহার করেন অভিভাবক, দেখাশোনাকারী আর স্কুল - শিশুরা নয়। শিশুর তথ্য তার অভিভাবক বা স্কুল যোগ করেন এবং তাঁদের নিয়ন্ত্রণেই থাকে।",
      ],
    },
    {
      h: "পরিবর্তন",
      p: ["এই নীতি বদলালে নতুন সংস্করণ তারিখসহ এই পেজে প্রকাশ করা হবে।"],
    },
  ],
};

const DELETION: Record<"en" | "bn", Block[]> = {
  en: [
    {
      h: "How to ask",
      list: [
        `Call ${CONTACT.phoneDisplay}, or send a WhatsApp message to the same number.`,
        "Tell us the email address or phone number of your EyeOn account, and say whether you want the whole account deleted or only one person (one watch) removed.",
        "We confirm that the request comes from the account holder (for example with a code sent to the account's phone number), then delete within 7 days and tell you when it is done.",
      ],
    },
    {
      h: "What is deleted",
      list: [
        "Your account: name, email, phone number, password, notification tokens and settings.",
        "For each person on the account that nobody else looks after: their name, photo, location history, alerts, places, routes and expected times.",
        "Share links you created stop working.",
      ],
    },
    {
      h: "What may be kept",
      list: [
        "Payment records, where the law requires us to keep them.",
        "A school account's own records of its students stay with the school; a parent leaving does not delete the school's data, only the parent's own account and places.",
        "Backups are overwritten in the normal course, within 30 days.",
      ],
    },
  ],
  bn: [
    {
      h: "কীভাবে অনুরোধ করবেন",
      list: [
        `কল করুন ${CONTACT.phoneDisplay}, অথবা একই নম্বরে WhatsApp-এ লিখুন।`,
        "আপনার EyeOn অ্যাকাউন্টের ইমেইল বা ফোন নম্বর জানান, আর বলুন পুরো অ্যাকাউন্ট মুছবেন, নাকি শুধু একজন ব্যক্তি (একটি ঘড়ি) বাদ দেবেন।",
        "অনুরোধটি অ্যাকাউন্টধারীর কাছ থেকে এসেছে কি না আমরা যাচাই করি (যেমন অ্যাকাউন্টের ফোন নম্বরে কোড পাঠিয়ে), তারপর ৭ দিনের মধ্যে মুছে ফেলি এবং জানিয়ে দিই।",
      ],
    },
    {
      h: "যা মুছে যায়",
      list: [
        "আপনার অ্যাকাউন্ট: নাম, ইমেইল, ফোন নম্বর, পাসওয়ার্ড, নোটিফিকেশন টোকেন আর সেটিংস।",
        "অ্যাকাউন্টের যে ব্যক্তিকে আর কেউ দেখাশোনা করেন না: তার নাম, ছবি, লোকেশনের ইতিহাস, অ্যালার্ট, জায়গা, পথ আর নির্ধারিত সময়।",
        "আপনার তৈরি শেয়ার লিংকগুলো আর কাজ করবে না।",
      ],
    },
    {
      h: "যা রাখা হতে পারে",
      list: [
        "আইন অনুযায়ী যেসব পেমেন্টের রেকর্ড রাখতে হয়।",
        "স্কুল অ্যাকাউন্টে শিক্ষার্থীদের রেকর্ড স্কুলের কাছেই থাকে; একজন অভিভাবক চলে গেলে শুধু তাঁর নিজের অ্যাকাউন্ট আর জায়গাগুলো মুছে যায়।",
        "ব্যাকআপ স্বাভাবিক নিয়মে ৩০ দিনের মধ্যে নতুন ব্যাকআপ দিয়ে মুছে যায়।",
      ],
    },
  ],
};

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-10">
      {blocks.map((b) => (
        <section key={b.h}>
          <h2 className="font-display text-2xl font-bold text-ink-900">{b.h}</h2>
          {b.p?.map((t) => (
            <p key={t} className="mt-3 text-[16px] leading-relaxed text-ink-700">
              {t}
            </p>
          ))}
          {b.list ? (
            <ul className="mt-3 list-disc space-y-2 pl-6 text-[16px] leading-relaxed text-ink-700">
              {b.list.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function Updated() {
  const { lang } = useLanguage();
  return <p className="mb-10 text-sm text-ink-500">{lang === "bn" ? `সর্বশেষ হালনাগাদ: ${UPDATED.bn}` : `Last updated: ${UPDATED.en}`}</p>;
}

export function PrivacyPage() {
  const { lang } = useLanguage();
  return (
    <>
      <PageHero badgeKey="legal.badge" titleKey="legal.privacy.title" descKey="legal.privacy.desc" />
      <div className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Updated />
          <Blocks blocks={PRIVACY[lang === "bn" ? "bn" : "en"]} />
        </div>
      </div>
    </>
  );
}

export function DeleteAccountPage() {
  const { lang, t } = useLanguage();
  return (
    <>
      <PageHero badgeKey="legal.badge" titleKey="legal.delete.title" descKey="legal.delete.desc" />
      <div className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Updated />
          <div className="mb-10 flex flex-col gap-3 sm:flex-row">
            <a
              href={`tel:${CONTACT.phoneTel}`}
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-brand-500 px-6 font-bold text-white hover:bg-brand-600"
            >
              {t("cta.call")} {CONTACT.phoneDisplay}
            </a>
            <a
              href={whatsappLink(t("legal.delete.whatsapp"))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-brand-500 px-6 font-semibold text-brand-600 hover:bg-brand-50"
            >
              {t("cta.whatsapp")}
            </a>
          </div>
          <Blocks blocks={DELETION[lang === "bn" ? "bn" : "en"]} />
        </div>
      </div>
    </>
  );
}
