"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import Image from "next/image";

export function MarketingFooter() {
  const { t } = useLocale();

  const productLinks = [
    { href: "/features", label: t("mkt.nav.features") },
    { href: "/pricing", label: t("mkt.nav.pricing") },
    { href: "/industries", label: t("mkt.nav.industries") },
  ];

  const companyLinks = [
    { href: "/about", label: t("mkt.nav.about") },
    { href: "/contact", label: t("mkt.nav.contact") },
  ];

  const legalLinks = [
    { href: "/privacy", label: t("mkt.footer.privacy") },
    { href: "/terms", label: t("mkt.footer.terms") },
    { href: "/refund", label: t("mkt.footer.refund") },
  ];

  return (
    <footer className="relative overflow-hidden bg-[#0A1928]">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 left-1/4 h-80 w-80 rounded-full bg-brand-500/5 blur-[100px]" />
        <div className="absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-accent-teal/5 blur-[100px]" />
      </div>

      <div className="mkt-container relative py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand section */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/eyeon-logo.png"
                alt="EyeOn"
                width={160}
                height={40}
                className="h-10 w-auto rounded-md"
              />
            </Link>
            <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-slate-400">
              {t("mkt.footer.tagline")}
            </p>

            {/* Contact info */}
            <div className="mt-8 space-y-3">
              <a
                href="tel:+8801999036999"
                className="group flex items-center gap-3 text-[15px] text-slate-400 transition-colors hover:text-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-all group-hover:bg-brand-500/20 group-hover:text-brand-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </span>
                +880 1999-036999
              </a>
              <a
                href="mailto:hello@motolink.com.bd"
                className="group flex items-center gap-3 text-[15px] text-slate-400 transition-colors hover:text-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-all group-hover:bg-brand-500/20 group-hover:text-brand-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </span>
                hello@motolink.com.bd
              </a>
            </div>

            {/* Social links */}
            <div className="mt-8 flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-all hover:bg-[#1877F2]/20 hover:text-[#1877F2]"
                aria-label="Facebook"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-all hover:bg-[#FF0000]/20 hover:text-[#FF0000]"
                aria-label="YouTube"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://wa.me/8801999036999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-all hover:bg-[#25D366]/20 hover:text-[#25D366]"
                aria-label="WhatsApp"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h3 className="mkt-footer-heading">{t("mkt.footer.product")}</h3>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="mkt-footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h3 className="mkt-footer-heading">{t("mkt.footer.company")}</h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="mkt-footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="mkt-footer-heading">{t("mkt.footer.legal")}</h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="mkt-footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-sm text-slate-500">
            {t("mkt.footer.copyright")}
          </p>
          <p className="text-sm text-slate-500">
            {t("mkt.footer.madeIn")}
          </p>
        </div>
      </div>
    </footer>
  );
}
