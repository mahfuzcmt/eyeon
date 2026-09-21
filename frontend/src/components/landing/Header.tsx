"use client";

import Link from "next/link";
import { EyeOnLogo } from "@/components/brand/EyeOnLogo";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageContext";
import { Icon } from "./shared";

function LanguageToggle({ dark }: { dark: boolean }) {
  const { lang, setLang } = useLanguage();
  const base = "h-11 rounded-md px-3 text-xs font-semibold transition-all lg:h-9";
  const active = "bg-brand-500 text-white shadow-sm";
  const idle = dark ? "text-ink-700 hover:text-ink-900" : "text-white/80 hover:text-white";
  return (
    <div className={`flex items-center rounded-lg border p-0.5 ${dark ? "border-surface-300 bg-surface-50" : "border-white/20 bg-white/10"}`}>
      <button type="button" onClick={() => setLang("bn")} aria-pressed={lang === "bn"} className={`${base} ${lang === "bn" ? active : idle}`}>
        বাং
      </button>
      <button type="button" onClick={() => setLang("en")} aria-pressed={lang === "en"} className={`${base} ${lang === "en" ? active : idle}`}>
        EN
      </button>
    </div>
  );
}

function Logo({ tone }: { tone: "light" | "dark" }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400 }}>
      <EyeOnLogo height={44} tone={tone} />
    </motion.div>
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
      className={`fixed left-0 right-0 top-11 z-50 transition-all duration-300 ${showDark ? "bg-white/95 shadow-lg shadow-ink-900/5 backdrop-blur-lg" : "bg-transparent"}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20">
        <Link href="/" aria-label="EyeOn">
          <Logo tone={showDark ? "light" : "dark"} />
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center lg:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`rounded-lg px-3 py-2 text-[15px] font-medium transition-colors ${showDark ? "text-ink-700 hover:text-brand-500" : "text-white/90 hover:text-white"}`}>
              {t(l.key)}
            </Link>
          ))}
        </nav>

        {/* Actions + language toggle */}
        <div className="hidden items-center gap-3 lg:flex">
          <LanguageToggle dark={showDark} />
          <Link href="/login" className={`rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-all ${showDark ? "text-ink-700 hover:text-brand-500" : "text-white hover:text-white/80"}`}>
            {t("nav.signIn")}
          </Link>
          <Link href="/contact" className="rounded-xl bg-sun-400 px-5 py-2.5 text-[15px] font-bold text-ink-900 shadow-sm transition-all hover:bg-sun-300">
            {t("nav.preorder")}
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageToggle dark={showDark} />
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${showDark ? "text-ink-700 hover:bg-surface-100" : "text-white hover:bg-white/10"}`}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <Icon path="M18 6L6 18M6 6l12 12" /> : <Icon path="M3 6h18M3 12h18M3 18h18" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="border-t border-surface-200 bg-white px-4 py-4 shadow-lg lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-[44px] items-center rounded-lg px-4 text-[15px] font-medium text-ink-700 hover:bg-surface-50 hover:text-brand-500">
                {t(l.key)}
              </Link>
            ))}
            <div className="mt-4 flex gap-3">
              <Link href="/login" onClick={() => setOpen(false)} className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-surface-300 text-[15px] font-semibold text-ink-700 hover:bg-surface-50">
                {t("nav.signIn")}
              </Link>
              <Link href="/contact" onClick={() => setOpen(false)} className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-sun-400 text-[15px] font-bold text-ink-900">
                {t("nav.preorder")}
              </Link>
            </div>
          </div>
        </motion.nav>
      )}
    </motion.header>
  );
}
