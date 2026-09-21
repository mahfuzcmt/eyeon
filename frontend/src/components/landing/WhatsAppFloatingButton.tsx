"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext";
import { WhatsAppIcon, whatsappLink } from "./shared";

export function WhatsAppFloatingButton() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Show the button after scrolling down a bit
  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Show the tooltip once, briefly
  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const showTimer = setTimeout(() => {
      setShowTooltip(true);
      hideTimer = setTimeout(() => setShowTooltip(false), 5000);
    }, 3000);
    return () => {
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {showTooltip && (
        <div className="relative rounded-xl bg-white py-1 pl-4 pr-1 text-sm font-medium text-ink-900 shadow-lg">
          <div className="flex items-center gap-1">
            <span>{t("whatsapp.tooltip")}</span>
            <button
              type="button"
              onClick={() => setShowTooltip(false)}
              aria-label={t("whatsapp.dismiss")}
              className="flex h-11 w-11 items-center justify-center text-ink-500 hover:text-ink-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div aria-hidden="true" className="absolute -bottom-2 right-6 h-0 w-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white" />
        </div>
      )}

      <a
        href={whatsappLink(t("whatsapp.message"))}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#0B8A4B] text-white shadow-lg shadow-black/20 transition-transform duration-300 hover:scale-110"
        aria-label={t("whatsapp.aria")}
      >
        <WhatsAppIcon className="h-7 w-7" />
      </a>
    </div>
  );
}
