"use client";

import { useLanguage } from "./LanguageContext";
import { CONTACT, Icon, ICONS, WhatsAppIcon, whatsappLink } from "./shared";

export function TopContactBar() {
  const { t } = useLanguage();

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] bg-brand-800 text-white">
      <div className="mx-auto flex h-11 max-w-7xl items-center justify-between gap-3 px-4 text-sm sm:px-6">
        {/* Tagline: full on desktop, short on mobile */}
        <span className="hidden font-medium text-brand-50 sm:inline">{t("topBar.tagline")}</span>
        <span className="font-medium text-brand-50 sm:hidden">{t("topBar.short")}</span>

        <div className="flex items-center gap-2">
          {/* Phone - tap to call. Full bar height (44px) so it is an easy touch target. */}
          <a
            href={`tel:${CONTACT.phoneTel}`}
            className="flex h-11 items-center gap-2 px-2 font-semibold text-sun-300 transition-colors hover:text-sun-200"
          >
            <Icon path={ICONS.phone} className="h-4 w-4" />
            <span className="hidden sm:inline">{t("topBar.callNow")}:</span>
            <span>{CONTACT.phoneDisplay}</span>
          </a>

          <a
            href={whatsappLink(t("whatsapp.message"))}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-8 items-center gap-1.5 rounded-full bg-sun-400 px-3 font-semibold text-ink-900 transition-colors hover:bg-sun-300 sm:flex"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
