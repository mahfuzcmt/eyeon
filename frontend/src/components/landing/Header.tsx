"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageContext";

function LanguageToggle({ dark }: { dark: boolean }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className={`flex items-center rounded-lg border ${dark ? "border-gray-200 bg-gray-50" : "border-white/20 bg-white/10"} p-0.5`}>
      <button
        onClick={() => setLang("en")}
        className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
          lang === "en"
            ? "bg-brand-600 text-white shadow-sm"
            : dark
            ? "text-gray-600 hover:text-gray-900"
            : "text-white/70 hover:text-white"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang("bn")}
        className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
          lang === "bn"
            ? "bg-brand-600 text-white shadow-sm"
            : dark
            ? "text-gray-600 hover:text-gray-900"
            : "text-white/70 hover:text-white"
        }`}
      >
        বাং
      </button>
    </div>
  );
}

function Logo() {
  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400 }}>
      <Image
        src="/eyeon-logo.png"
        alt="EyeOn"
        width={180}
        height={45}
        className="h-11 w-auto rounded-md shadow-sm"
        priority
      />
    </motion.div>
  );
}

function Icon({ path, className = "h-6 w-6" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

const NAV_LINKS = [
  { key: "nav.home", href: "/" },
  { key: "nav.features", href: "/features" },
  { key: "nav.products", href: "/products" },
  { key: "nav.solutions", href: "/solutions" },
  { key: "nav.pricing", href: "/pricing" },
  { key: "nav.about", href: "/about" },
  { key: "nav.contact", href: "/contact" },
];

export function Header({ transparent = false }: { transparent?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const showDark = !transparent || scrolled;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed left-0 right-0 top-10 z-50 transition-all duration-300 ${showDark ? "bg-white/95 shadow-lg shadow-gray-200/50 backdrop-blur-lg" : "bg-transparent"}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20">
        {/* Logo */}
        <Link href="/" aria-label="EyeOn GPS home">
          <Logo />
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`rounded-lg px-4 py-2 text-[14px] font-medium transition-colors ${showDark ? "text-gray-700 hover:text-brand-600" : "text-white/90 hover:text-white"}`}>
              {t(l.key)}
            </Link>
          ))}
        </nav>

        {/* CTA Buttons + Language Toggle */}
        <div className="hidden items-center gap-3 lg:flex">
          <LanguageToggle dark={showDark} />
          <Link href="/login" className={`rounded-lg px-5 py-2.5 text-[14px] font-semibold transition-all ${showDark ? "text-gray-700 hover:text-brand-600" : "text-white hover:text-white/80"}`}>
            {t("nav.signIn")}
          </Link>
          <Link href="/contact" className="rounded-lg bg-brand-600 px-6 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-brand-600/30 transition-all hover:bg-brand-700 hover:shadow-xl">
            {t("nav.getDemo")}
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageToggle dark={showDark} />
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${showDark ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10"}`}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <Icon path="M18 6L6 18M6 6l12 12" />
            ) : (
              <Icon path="M3 6h18M3 12h18M3 18h18" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="border-t border-gray-100 bg-white px-4 py-4 shadow-lg lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 text-[14px] font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600">
                {t(l.key)}
              </Link>
            ))}
            <div className="mt-4 flex gap-3">
              <Link href="/login" className="flex-1 rounded-lg border border-gray-200 py-3 text-center text-[14px] font-semibold text-gray-700 hover:bg-gray-50">{t("nav.signIn")}</Link>
              <Link href="/contact" className="flex-1 rounded-lg bg-brand-600 py-3 text-center text-[14px] font-semibold text-white">{t("nav.getDemo")}</Link>
            </div>
          </div>
        </motion.nav>
      )}
    </motion.header>
  );
}
