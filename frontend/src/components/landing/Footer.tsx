"use client";

import Link from "next/link";
import { EyeOnLogo } from "@/components/brand/EyeOnLogo";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageContext";

const CONTACT = {
  hotline: "+880 1999-036999",
  email: "hello@eyeongps.com",
};

function Logo() {
  return (
    <EyeOnLogo height={44} tone="dark" />
  );
}

function Icon({ path, className = "h-4 w-4" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  map: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
};

const NAV_LINKS = [
  { key: "nav.home", href: "/" },
  { key: "nav.features", href: "/features" },
  { key: "nav.products", href: "/products" },
  { key: "nav.solutions", href: "/solutions" },
  { key: "nav.pricing", href: "/pricing" },
  { key: "nav.contact", href: "/contact" },
];

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-gray-800 bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-gray-400">
              {t("footer.desc")}
            </p>
            <div className="mt-6 flex gap-3">
              {[
                { label: "Facebook", href: "https://facebook.com/eyeongps" },
                { label: "LinkedIn", href: "https://linkedin.com/company/eyeongps" },
                { label: "YouTube", href: "https://youtube.com/@eyeongps" },
              ].map((s) => (
                <motion.a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -3 }}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-sm font-semibold text-gray-400 transition-colors hover:bg-brand-600 hover:text-white"
                >
                  {s.label[0]}
                </motion.a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-400">{t("footer.quickLinks")}</h4>
            <ul className="space-y-3 text-[15px]">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 transition-colors hover:text-brand-400">
                    {t(link.key)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/login" className="text-gray-400 transition-colors hover:text-brand-400">
                  {t("nav.signIn")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-400">{t("footer.contactUs")}</h4>
            <ul className="space-y-3 text-[15px] text-gray-400">
              <li className="flex items-center gap-2">
                <Icon path={ICONS.phone} className="h-4 w-4 text-brand-400" />
                <a href={`tel:${CONTACT.hotline.replace(/[^+\d]/g, "")}`} className="hover:text-brand-400">{CONTACT.hotline}</a>
              </li>
              <li className="flex items-center gap-2">
                <Icon path={ICONS.mail} className="h-4 w-4 text-brand-400" />
                <a href={`mailto:${CONTACT.email}`} className="hover:text-brand-400">{CONTACT.email}</a>
              </li>
              <li className="flex items-start gap-2">
                <Icon path={ICONS.map} className="mt-0.5 h-4 w-4 text-brand-400" />
                <span>{t("footer.address")}</span>
              </li>
            </ul>
            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("footer.certifications")}</div>
              <div className="mt-2 flex gap-2">
                {["BTRC", "ISO 9001"].map((c) => (
                  <div key={c} className="rounded-md bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-400">{c}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("footer.payment")}</span>
              <div className="flex items-center gap-2">
                {/* bKash */}
                <div className="flex h-8 w-14 items-center justify-center rounded bg-[#E2136E] px-2">
                  <span className="text-[12px] font-bold text-white">bKash</span>
                </div>
                {/* Nagad */}
                <div className="flex h-8 w-14 items-center justify-center rounded bg-[#F6931D] px-2">
                  <span className="text-[12px] font-bold text-white">Nagad</span>
                </div>
                {/* Visa */}
                <div className="flex h-8 w-12 items-center justify-center rounded bg-white px-2">
                  <span className="text-[12px] font-bold text-[#1A1F71]">VISA</span>
                </div>
                {/* MasterCard */}
                <div className="flex h-8 w-12 items-center justify-center rounded bg-gray-800 px-1">
                  <div className="flex">
                    <div className="h-4 w-4 rounded-full bg-[#EB001B] opacity-80" />
                    <div className="-ml-1.5 h-4 w-4 rounded-full bg-[#F79E1B] opacity-80" />
                  </div>
                </div>
                {/* Cash */}
                <div className="flex h-8 w-14 items-center justify-center rounded bg-emerald-600 px-2">
                  <span className="text-[12px] font-bold text-white">Cash</span>
                </div>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 sm:text-right">
              {t("footer.securePayment")}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 sm:flex-row">
          <span className="text-sm text-gray-500">© {new Date().getFullYear()} EyeOn GPS. {t("footer.rights")}</span>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-brand-400">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-brand-400">Terms of Service</Link>
            <span>Made with ❤️ in Bangladesh</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
