"use client";

import { useEffect, useState } from "react";
import { EyeOnMark } from "@/components/brand/EyeOnLogo";
import { GooglePlayMark, StoreBadgeArt } from "@/components/brand/StoreBadges";

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
  const badge = <StoreBadgeArt store={store} dim={!href} />;
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
