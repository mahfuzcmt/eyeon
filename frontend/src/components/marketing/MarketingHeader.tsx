"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useLocale } from "@/lib/i18n";
import { LanguageToggle } from "@/components/shell/LanguageToggle";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/features", key: "mkt.nav.features" },
  { href: "/industries", key: "mkt.nav.industries" },
  { href: "/pricing", key: "mkt.nav.pricing" },
  { href: "/about", key: "mkt.nav.about" },
  { href: "/contact", key: "mkt.nav.contact" },
] as const;

export function MarketingHeader({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { t } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Add scroll listener for glass effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isDark = variant === "dark";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? isDark
            ? "bg-[#0A1928]/90 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/5"
            : "bg-white/90 backdrop-blur-xl border-b border-surface-200 shadow-lg shadow-black/5"
          : isDark
            ? "bg-transparent"
            : "bg-white/50 backdrop-blur-sm"
      }`}
    >
      <div className="mkt-container flex h-[72px] items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/eyeon-logo.png"
            alt="EyeOn"
            width={160}
            height={40}
            className="h-10 w-auto rounded-md shadow-sm"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
                isDark
                  ? "text-slate-300 hover:text-white hover:bg-white/5"
                  : "text-ink-600 hover:text-ink-900 hover:bg-surface-100"
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <LanguageToggle
            className={isDark
              ? "!text-slate-400 hover:!text-white hover:!bg-white/10"
              : "!text-ink-500 hover:!text-ink-900"
            }
          />

          <Link href="/login" className="hidden md:block">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isDark
                  ? "text-slate-300 hover:text-white hover:bg-white/10"
                  : "text-ink-600 hover:text-ink-900 hover:bg-surface-100"
              }`}
            >
              {t("mkt.nav.login")}
            </button>
          </Link>

          <Link href="/contact" className="hidden md:block">
            <button className="relative inline-flex items-center justify-center gap-2 rounded-mkt bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/25">
              {t("mkt.nav.getStarted")}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg md:hidden transition-colors ${
              isDark
                ? "text-white hover:bg-white/10"
                : "text-ink-700 hover:bg-surface-100"
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className={`border-t md:hidden animate-slide-down ${
            isDark
              ? "border-white/10 bg-[#0A1928]/95 backdrop-blur-xl"
              : "border-surface-200 bg-white/95 backdrop-blur-xl"
          }`}
        >
          <nav className="mkt-container flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                  isDark
                    ? "text-slate-300 hover:bg-white/10 hover:text-white"
                    : "text-ink-700 hover:bg-surface-100 hover:text-ink-900"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t(link.key)}
              </Link>
            ))}
            <hr className={`my-3 ${isDark ? "border-white/10" : "border-surface-200"}`} />
            <Link
              href="/login"
              className={`rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                isDark
                  ? "text-slate-300 hover:bg-white/10 hover:text-white"
                  : "text-ink-700 hover:bg-surface-100 hover:text-ink-900"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("mkt.nav.login")}
            </Link>
            <Link href="/contact" className="mt-2" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full rounded-mkt bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-3 text-base font-semibold text-white shadow-md transition-all hover:shadow-lg">
                {t("mkt.nav.getStarted")}
              </button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
