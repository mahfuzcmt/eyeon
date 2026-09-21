"use client";

import { useLocale } from "@/lib/i18n";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  const next = locale === "en" ? "bn" : "en";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className={`btn-ghost min-w-[56px] ${className}`}
      aria-label={`Switch to ${next === "bn" ? "Bengali" : "English"}`}
    >
      {t("lang.toggle")}
    </button>
  );
}
