"use client";

import Link from "next/link";
import { EyeOnLogo } from "@/components/brand/EyeOnLogo";
import { useLanguage } from "./LanguageContext";
import { CONTACT, Icon, ICONS, WhatsAppIcon, whatsappLink } from "./shared";

const NAV_LINKS = [
  { key: "nav.home", href: "/" },
  { key: "nav.features", href: "/features" },
  { key: "nav.products", href: "/products" },
  { key: "nav.solutions", href: "/solutions" },
  { key: "nav.pricing", href: "/pricing" },
  { key: "nav.about", href: "/about" },
  { key: "nav.contact", href: "/contact" },
];

/*
 * Deliberately absent until the business owner supplies real ones: office address,
 * email, social media links, payment-method badges, certifications, and links to
 * privacy / terms pages (those routes do not exist yet).
 */
export function Footer() {
  const { t } = useLanguage();
  const linkClass = "inline-flex min-h-[44px] items-center text-brand-100 transition-colors hover:text-sun-300 sm:min-h-0";

  return (
    <footer className="bg-brand-900 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <EyeOnLogo height={44} tone="dark" />
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-brand-100">{t("footer.desc")}</p>
          </div>

          <div>
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-sun-300">{t("footer.quickLinks")}</h4>
            <ul className="space-y-0 text-[15px] sm:space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {t(link.key)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/login" className={linkClass}>
                  {t("nav.signIn")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-sun-300">{t("footer.contactUs")}</h4>
            <ul className="space-y-0 text-[15px] sm:space-y-3">
              <li>
                <a href={`tel:${CONTACT.phoneTel}`} className={`${linkClass} gap-2 font-semibold`}>
                  <Icon path={ICONS.phone} className="h-4 w-4 text-sun-300" />
                  {CONTACT.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={whatsappLink(t("whatsapp.message"))} target="_blank" rel="noopener noreferrer" className={`${linkClass} gap-2`}>
                  <WhatsAppIcon className="h-4 w-4 text-sun-300" />
                  WhatsApp
                </a>
              </li>
              <li className="flex min-h-[44px] items-center gap-2 text-brand-100 sm:min-h-0">
                <Icon path={ICONS.message} className="h-4 w-4 text-sun-300" />
                {t("footer.support")}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-brand-100 sm:text-left">
          © {new Date().getFullYear()} EyeOn. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
