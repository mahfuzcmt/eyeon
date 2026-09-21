"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import { useLanguage } from "./LanguageContext";

/* ── Contact ────────────────────────────────────────────────────
 * The only verified contact detail is the pre-order number printed on the
 * product poster. Do not add an email, office address or opening hours here
 * until the business owner supplies real ones.
 */
export const CONTACT = {
  phoneDisplay: "01629-563645",
  phoneTel: "+8801629563645",
  whatsappNumber: "8801629563645",
};

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${CONTACT.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/* ── Animation ─────────────────────────────────────────────────── */
export const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

export function AnimatedSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? "visible" : "hidden"} variants={staggerContainer} className={className}>
      {children}
    </motion.div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────── */
export function Icon({ path, className = "h-6 w-6" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={path} />
    </svg>
  );
}

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export const ICONS = {
  arrow: "M5 12h14M12 5l7 7-7 7",
  check: "M20 6L9 17l-5-5",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  pin: "M12 22s7-7.75 7-13a7 7 0 10-14 0c0 5.25 7 13 7 13zM12 12a3 3 0 100-6 3 3 0 000 6z",
  school: "M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3",
  boundary: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM12 13a1 1 0 100-2 1 1 0 000 2z",
  sos: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01",
  history: "M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2",
  battery: "M17 6H3a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2zM23 13v-2M5 10v4M9 10v4",
  feather: "M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5zM16 8L2 22M17.5 15H9",
  app: "M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zM12 18h.01",
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  book: "M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z",
  smile: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01",
  monitor: "M20 3H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2zM8 21h8M12 17v4",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
  message: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  watch: "M12 19a7 7 0 100-14 7 7 0 000 14zM12 9v3l1.5 1.5M16.51 17.35l-.35 3.83a2 2 0 01-2 1.82H9.83a2 2 0 01-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 019.83 1h4.35a2 2 0 012 1.82l.35 3.83",
  bag: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0",
  lanyard: "M6 2l6 11 6-11M12 13v2M9 15h6a1 1 0 011 1v5a1 1 0 01-1 1H9a1 1 0 01-1-1v-5a1 1 0 011-1z",
};

/* ── The eight product features (from the product poster) ─────────
 * Shared by the home page grid and the features page.
 */
export const FEATURES: { id: string; icon: string }[] = [
  { id: "live", icon: ICONS.pin },
  { id: "safezone", icon: ICONS.school },
  { id: "geofence", icon: ICONS.boundary },
  { id: "sos", icon: ICONS.sos },
  { id: "history", icon: ICONS.history },
  { id: "battery", icon: ICONS.battery },
  { id: "small", icon: ICONS.feather },
  { id: "bangla", icon: ICONS.app },
];

/* ── Reusable blocks ───────────────────────────────────────────── */
export function SectionBadge({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <div
      className={`mb-4 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest ${
        onDark ? "bg-white/10 text-sun-300" : "bg-brand-50 text-brand-600"
      }`}
    >
      {children}
    </div>
  );
}

/** Teal poster-style hero used at the top of every inner page. */
export function PageHero({ badgeKey, titleKey, descKey }: { badgeKey: string; titleKey: string; descKey: string }) {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 pb-20 pt-36 lg:pt-44">
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sun-400/10" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-400/10" />
      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.div variants={fadeInUp}>
            <SectionBadge onDark>{t(badgeKey)}</SectionBadge>
          </motion.div>
          <motion.h1 variants={fadeInUp} className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            {t(titleKey)}
          </motion.h1>
          <motion.p variants={fadeInUp} className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-brand-50">
            {t(descKey)}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

/** Call / WhatsApp buttons. `onDark` = placed on a teal background. */
export function ContactButtons({ onDark = false, className = "" }: { onDark?: boolean; className?: string }) {
  const { t } = useLanguage();
  return (
    <div className={`flex flex-col items-stretch gap-4 sm:flex-row sm:items-center ${className}`}>
      <a
        href={`tel:${CONTACT.phoneTel}`}
        className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-sun-400 px-8 text-[16px] font-bold text-ink-900 shadow-lg shadow-black/10 transition-all hover:bg-sun-300"
      >
        <Icon path={ICONS.phone} className="h-5 w-5" />
        <span>
          {t("cta.call")} {CONTACT.phoneDisplay}
        </span>
      </a>
      <a
        href={whatsappLink(t("whatsapp.message"))}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 px-8 text-[16px] font-semibold transition-all ${
          onDark
            ? "border-white/30 bg-white/5 text-white hover:border-white/60 hover:bg-white/10"
            : "border-brand-500 bg-white text-brand-600 hover:bg-brand-50"
        }`}
      >
        <WhatsAppIcon />
        {t("cta.whatsapp")}
      </a>
    </div>
  );
}

/** Closing call-to-action band with the pre-order number. */
export function CallToAction({ titleKey = "cta.title", descKey = "cta.desc" }: { titleKey?: string; descKey?: string }) {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 py-20">
      <div aria-hidden="true" className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sun-400/10" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <AnimatedSection>
          <motion.h2 variants={fadeInUp} className="font-display text-3xl font-bold text-white sm:text-4xl">
            {t(titleKey)}
          </motion.h2>
          <motion.p variants={fadeInUp} className="mx-auto mt-4 max-w-2xl text-lg text-brand-50">
            {t(descKey)}
          </motion.p>
          <motion.div variants={fadeInUp} className="mt-10 flex justify-center">
            <ContactButtons onDark />
          </motion.div>
          <motion.div variants={fadeInUp} className="mt-6">
            <Link href="/contact" className="inline-flex min-h-[44px] items-center gap-2 text-[15px] font-semibold text-sun-300 underline-offset-4 hover:underline">
              {t("cta.contact")}
              <Icon path={ICONS.arrow} className="h-4 w-4" />
            </Link>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/** Bullet with a teal tick, used in lists across pages. */
export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] leading-relaxed text-ink-700">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <Icon path={ICONS.check} className="h-3 w-3" />
      </span>
      <span>{children}</span>
    </li>
  );
}
