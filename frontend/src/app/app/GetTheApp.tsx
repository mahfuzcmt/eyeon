"use client";

import { useEffect, useState } from "react";
import { EyeOnMark } from "@/components/brand/EyeOnLogo";

type Lang = "bn" | "en";
type Platform = "android" | "ios" | "other";

const T = {
  title: { bn: "EyeOn অ্যাপ নিন", en: "Get the EyeOn app" },
  lead: {
    bn: "এই ঘড়িটি EyeOn-এর সাথে কাজ করে। অ্যাপে আপনি দেখবেন আপনার প্রিয়জন এখন কোথায়, পৌঁছালে বা বের হলে জানবেন।",
    en: "This watch works with EyeOn. The app shows where your loved one is right now and tells you when they arrive or leave.",
  },
  playStore: { bn: "Google Play থেকে নিন", en: "Get it on Google Play" },
  appStore: { bn: "App Store থেকে নিন", en: "Download on the App Store" },
  apk: { bn: "Android অ্যাপ ডাউনলোড করুন", en: "Download the Android app" },
  soon: { bn: "শীঘ্রই আসছে", en: "Coming soon" },
  web: { bn: "ব্রাউজারে EyeOn খুলুন", en: "Open EyeOn in the browser" },
  webHint: {
    bn: "অ্যাপ ছাড়াই ফোন বা কম্পিউটার থেকে লগ ইন করতে পারবেন।",
    en: "You can also sign in from any phone or computer without the app.",
  },
  opening: { bn: "স্টোর খোলা হচ্ছে…", en: "Opening the store…" },
  stay: { bn: "এই পাতায় থাকুন", en: "Stay on this page" },
  help: { bn: "সাহায্য দরকার?", en: "Need help?" },
  contact: { bn: "যোগাযোগ করুন", en: "Contact us" },
} as const;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "other";
}

function readLang(): Lang {
  try {
    const saved = window.localStorage.getItem("eyeon-lang");
    if (saved === "en" || saved === "bn") return saved;
  } catch {
    // Private mode or blocked storage: fall back to the browser language.
  }
  return typeof navigator !== "undefined" && /^en/i.test(navigator.language) ? "en" : "bn";
}

/** How long the page shows before it opens the store by itself (a scan should land in the store). */
const AUTO_OPEN_MS = 1500;

export function GetTheApp({
  playStoreUrl,
  appStoreUrl,
  androidApkUrl,
}: {
  playStoreUrl: string | null;
  appStoreUrl: string | null;
  androidApkUrl: string | null;
}) {
  const [lang, setLang] = useState<Lang>("bn");
  const [platform, setPlatform] = useState<Platform>("other");
  const [autoOpen, setAutoOpen] = useState<string | null>(null);

  useEffect(() => {
    setLang(readLang());
    const p = detectPlatform();
    setPlatform(p);
    const target = p === "android" ? playStoreUrl : p === "ios" ? appStoreUrl : null;
    const stay = new URLSearchParams(window.location.search).has("stay");
    if (target && !stay) setAutoOpen(target);
  }, [playStoreUrl, appStoreUrl]);

  useEffect(() => {
    if (!autoOpen) return;
    const id = window.setTimeout(() => window.location.assign(autoOpen), AUTO_OPEN_MS);
    return () => window.clearTimeout(id);
  }, [autoOpen]);

  const t = (k: keyof typeof T) => T[k][lang];
  const switchLang = (next: Lang) => {
    setLang(next);
    try {
      window.localStorage.setItem("eyeon-lang", next);
    } catch {
      // Not remembered; the page still switches.
    }
  };

  // The visitor's own platform first.
  const android = playStoreUrl ? (
    <StoreBadge key="android" store="play" href={playStoreUrl} />
  ) : androidApkUrl ? (
    <ApkButton key="android" href={androidApkUrl} label={t("apk")} />
  ) : (
    <StoreBadge key="android" store="play" href={null} soonText={t("soon")} />
  );
  const ios = <StoreBadge key="ios" store="apple" href={appStoreUrl} soonText={t("soon")} />;
  const stores = platform === "ios" ? [ios, android] : [android, ios];

  return (
    <main lang={lang} className="min-h-screen bg-surface-100 px-4 py-8 text-ink-900">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOnMark size={40} color="#0F6B5C" />
            <span className="font-display text-2xl font-bold text-brand-500">EyeOn</span>
          </div>
          <div className="flex rounded-full border border-surface-300 bg-white p-1 text-sm" role="group" aria-label="Language">
            {(["bn", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => switchLang(l)}
                aria-pressed={lang === l}
                className={`min-h-[36px] rounded-full px-3 font-semibold ${lang === l ? "bg-brand-500 text-white" : "text-ink-700"}`}
              >
                {l === "bn" ? "বাংলা" : "English"}
              </button>
            ))}
          </div>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="font-display text-3xl font-bold leading-tight">{t("title")}</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-700">{t("lead")}</p>

          {autoOpen ? (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-3" role="status">
              <span className="font-semibold text-brand-600">{t("opening")}</span>
              <button type="button" onClick={() => setAutoOpen(null)} className="min-h-[40px] text-sm font-semibold text-ink-700 underline">
                {t("stay")}
              </button>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:justify-center">{stores}</div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <a
            href="/dashboard"
            className="flex min-h-[52px] items-center justify-center rounded-xl border-2 border-brand-500 px-4 text-lg font-bold text-brand-500 hover:bg-brand-50 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500"
          >
            {t("web")}
          </a>
          <p className="mt-3 text-center text-base text-ink-500">{t("webHint")}</p>
        </section>

        <p className="text-center text-base text-ink-500">
          {t("help")}{" "}
          <a href="/contact" className="font-semibold text-brand-500 underline">
            {t("contact")}
          </a>
        </p>
      </div>
    </main>
  );
}

/**
 * The stores' own badges, drawn the way their guidelines show them: black, a thin grey edge,
 * the store's mark, and the wording in English (both Google and Apple keep the badge text in a
 * fixed form). Without a link the badge is shown dimmed with "Coming soon" under it.
 */
function StoreBadge({ store, href, soonText }: { store: "play" | "apple"; href: string | null; soonText?: string }) {
  const play = store === "play";
  const badge = (
    <span
      className={`inline-flex h-[60px] w-[200px] items-center gap-3 rounded-[10px] border border-[#A6A6A6] bg-black px-4 text-white ${
        href ? "" : "opacity-45"
      }`}
    >
      {play ? <GooglePlayMark /> : <AppleMark />}
      <span className="flex flex-col items-start leading-none">
        <span className={play ? "text-[11px] font-medium uppercase tracking-wide" : "text-[12px] font-medium"}>
          {play ? "Get it on" : "Download on the"}
        </span>
        <span className="mt-1 text-[22px] font-semibold tracking-tight" style={{ fontFamily: play ? "'Product Sans', Roboto, Arial, sans-serif" : "-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" }}>
          {play ? "Google Play" : "App Store"}
        </span>
      </span>
    </span>
  );
  if (!href) {
    return (
      <div className="flex flex-col items-center gap-1.5" aria-disabled="true">
        {badge}
        <span className="rounded-full bg-sun-100 px-3 py-0.5 text-[13px] font-semibold text-ink-900">{soonText}</span>
      </div>
    );
  }
  return (
    <a
      href={href}
      rel="noopener"
      aria-label={play ? "Get it on Google Play" : "Download on the App Store"}
      className="rounded-[10px] transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500"
    >
      {badge}
    </a>
  );
}

/** A direct download of the Android app, offered only while there is no Google Play link. */
function ApkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-[60px] w-[200px] items-center justify-center gap-2 rounded-[10px] bg-brand-500 px-4 text-center text-[16px] font-bold text-white hover:bg-brand-600 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500"
    >
      <GooglePlayMark />
      {label}
    </a>
  );
}

/** The four-colour Google Play triangle. */
function GooglePlayMark() {
  return (
    <svg width="30" height="33" viewBox="0 0 30 33" aria-hidden="true" className="shrink-0">
      <path d="M1.3 1.1C.9 1.5.7 2.2.7 3v27c0 .8.2 1.5.6 1.9l.1.1L16.5 16.9v-.4L1.4 1l-.1.1Z" fill="#4285F4" />
      <path d="m21.5 22-5-5v-.4l5-5 .1.1 6 3.4c1.7 1 1.7 2.6 0 3.6l-6 3.4-.1-.1Z" fill="#FBBC04" />
      <path d="m21.6 21.9-5.1-5.2L1.3 31.9c.6.6 1.5.7 2.6.1l17.7-10.1" fill="#EA4335" />
      <path d="M21.6 11.5 3.9 1.4C2.8.8 1.9.9 1.3 1.5l15.2 15.2 5.1-5.2Z" fill="#34A853" />
    </svg>
  );
}

/** The Apple logo. */
function AppleMark() {
  return (
    <svg width="28" height="33" viewBox="0 0 384 470" aria-hidden="true" className="shrink-0" fill="#fff">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9Zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3Z" />
    </svg>
  );
}
