"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLanguage } from "../LanguageContext";
import { WhyChooseSection } from "../WhyChooseSection";
import { TestimonialsSection } from "../TestimonialsSection";
import { FAQSection } from "../FAQSection";

/* ── Animation Variants ─────────────────────────────────────────── */
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? "visible" : "hidden"} variants={staggerContainer} className={className}>
      {children}
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

const ICONS = {
  arrow: "M5 12h14M12 5l7 7-7 7",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  clock: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  map: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  fuel: "M3 22V5a2 2 0 012-2h7a2 2 0 012 2v17M14 8h4a2 2 0 012 2v4a2 2 0 01-2 2h-4M10 6v4M6 6v4",
  replay: "M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2",
  fence: "M12 22s7-7.75 7-13a7 7 0 10-14 0c0 5.25 7 13 7 13zM12 12a3 3 0 100-6 3 3 0 000 6z",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  check: "M20 6L9 17l-5-5",
  video: "M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z",
  temp: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
  car: "M16 3H8l-4 6v8a1 1 0 001 1h1a1 1 0 001-1v-1h10v1a1 1 0 001 1h1a1 1 0 001-1V9l-4-6zM5.5 14a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 14a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM6 9l2.5-4h7L18 9H6z",
  bike: "M5 16a3 3 0 100-6 3 3 0 000 6zM19 16a3 3 0 100-6 3 3 0 000 6zM10 13h4M7 13l3-5h4l1 2M14 10l3 3",
  bus: "M4 6v10c0 1 1 2 2 2h1v1a1 1 0 001 1h1a1 1 0 001-1v-1h4v1a1 1 0 001 1h1a1 1 0 001-1v-1h1c1 0 2-1 2-2V6c0-2-1.5-3-5-3H9C5.5 3 4 4 4 6zM7 15a1 1 0 100-2 1 1 0 000 2zM17 15a1 1 0 100-2 1 1 0 000 2zM4 10h16",
  package: "M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  building: "M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  parking: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9 17V7h4a3 3 0 010 6H9",
  gauge: "M12 15l3.5-5.5M8 21h8M3 15a9 9 0 1118 0",
  wifi: "M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01",
};

const CONTACT = {
  hotline: "+880 1999-036999",
  sales: "+880 1999-036999",
};

/* ── Client Logos ─────────────────────────────────────────────── */
const CLIENT_LOGOS = [
  { name: "Client 1", image: "/images/clients/client-1.png" },
  { name: "Client 2", image: "/images/clients/client-2.png" },
  { name: "Client 3", image: "/images/clients/client-3.png" },
  { name: "Client 4", image: "/images/clients/client-4.png" },
  { name: "Client 5", image: "/images/clients/client-5.png" },
  { name: "Client 6", image: "/images/clients/client-6.png" },
  { name: "Client 7", image: "/images/clients/client-7.png" },
  { name: "Client 8", image: "/images/clients/client-8.png" },
  { name: "Client 9", image: "/images/clients/client-9.png" },
  { name: "Client 10", image: "/images/clients/client-10.png" },
];

/* ── Hero Section ──────────────────────────────────────────────── */
function Hero() {
  const { t } = useLanguage();
  return (
    <section className="relative min-h-[750px] overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-36 sm:px-6 lg:pb-32 lg:pt-44">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-4 py-2 text-[13px] font-semibold text-brand-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
              </span>
              {t("hero.badge")}
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t("hero.title1")}
              <span className="mt-2 block text-brand-400">{t("hero.title2")}</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="mt-6 max-w-xl text-lg leading-relaxed text-gray-300">
              {t("hero.desc")}
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-10 flex flex-wrap items-center gap-4">
              <a href={`tel:${CONTACT.sales.replace(/[^+\d]/g, "")}`} className="group inline-flex h-14 items-center gap-2 rounded-xl bg-brand-500 px-8 text-[15px] font-bold text-white shadow-xl shadow-brand-500/30 transition-all hover:bg-brand-600 hover:shadow-2xl">
                <Icon path={ICONS.phone} className="h-5 w-5" />
                {t("hero.contactSales")}
              </a>
              <Link href="/contact" className="inline-flex h-14 items-center gap-2 rounded-xl border-2 border-white/20 bg-white/5 px-8 text-[15px] font-semibold text-white backdrop-blur transition-all hover:border-white/40 hover:bg-white/10">
                {t("nav.getDemo")}
                <Icon path={ICONS.arrow} className="h-5 w-5" />
              </Link>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-12 flex flex-wrap items-center gap-8">
              {[
                { icon: ICONS.shield, labelKey: "hero.btrcCertified" },
                { icon: ICONS.users, labelKey: "hero.companies" },
                { icon: ICONS.clock, labelKey: "hero.support" },
              ].map((item) => (
                <div key={item.labelKey} className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-brand-400">
                    <Icon path={item.icon} className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">{t(item.labelKey)}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="relative hidden lg:block">
            <div className="relative rounded-2xl bg-white/5 p-2 shadow-2xl backdrop-blur-sm">
              <div className="overflow-hidden rounded-xl bg-gray-900">
                <div className="flex items-center gap-2 border-b border-white/10 bg-gray-800 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 text-center text-sm text-gray-400">EyeOn Dashboard</div>
                </div>
                <div className="relative h-[340px] bg-gradient-to-br from-gray-800 to-gray-900 p-4">
                  <div className="absolute inset-4 rounded-lg bg-[#1a2332]">
                    {[
                      { top: "20%", left: "25%", status: "moving", label: "BA-1234" },
                      { top: "45%", left: "55%", status: "parked", label: "DH-5678" },
                      { top: "65%", left: "30%", status: "moving", label: "RA-9012" },
                      { top: "35%", left: "70%", status: "idle", label: "CH-3456" },
                    ].map((v, i) => (
                      <motion.div key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1 + i * 0.15 }} className="absolute" style={{ top: v.top, left: v.left }}>
                        <motion.div animate={v.status === "moving" ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 2, repeat: Infinity }} className="relative">
                          <div className={`h-4 w-4 rounded-full shadow-lg ${v.status === "moving" ? "bg-brand-500 shadow-brand-500/50" : v.status === "parked" ? "bg-emerald-500 shadow-emerald-500/50" : "bg-brand-500 shadow-brand-500/50"}`} />
                          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white">{v.label}</div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="absolute bottom-5 left-5 right-5 flex gap-2">
                    {[
                      { label: "Active", value: "24", color: "amber" },
                      { label: "Parked", value: "12", color: "emerald" },
                      { label: "Alerts", value: "3", color: "red" },
                    ].map((stat) => (
                      <div key={stat.label} className="flex-1 rounded-lg bg-gray-800/80 p-2.5 backdrop-blur">
                        <div className={`text-lg font-bold ${stat.color === "amber" ? "text-brand-400" : stat.color === "emerald" ? "text-emerald-400" : "text-red-400"}`}>{stat.value}</div>
                        <div className="text-[10px] text-gray-500">{stat.label}</div>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Trust Badges ──────────────────────────────────────────────── */
function TrustBadges() {
  const { t } = useLanguage();
  const badges = [
    { labelKey: "trust.best", icon: ICONS.shield },
    { labelKey: "trust.support", icon: ICONS.clock },
    { labelKey: "trust.team", icon: ICONS.users },
    { labelKey: "trust.vts", icon: ICONS.map },
  ];

  return (
    <section className="border-b border-gray-800 bg-gray-900 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {badges.map((badge) => (
            <div key={badge.labelKey} className="flex items-center justify-center gap-3 text-white">
              <Icon path={badge.icon} className="h-6 w-6 text-brand-400" />
              <span className="text-sm font-medium">{t(badge.labelKey)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Trusted Clients Section ──────────────────────────────────── */
function TrustedClientsSection() {
  const { t } = useLanguage();
  return (
    <section className="border-b border-gray-100 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.p variants={fadeIn} className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
            {t("clients.title")}
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-4 lg:gap-6">
            {CLIENT_LOGOS.map(({ name, image }) => (
              <motion.div key={name} whileHover={{ scale: 1.05, y: -2 }} className="flex h-14 w-32 items-center justify-center rounded-lg bg-gray-50 p-2 transition-shadow hover:shadow-md">
                <Image
                  src={image}
                  alt={name}
                  width={120}
                  height={50}
                  className="h-auto max-h-10 w-auto object-contain"
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Features Section ─────────────────────────────────────────── */
function FeaturesSection() {
  const { t } = useLanguage();
  const features = [
    { icon: ICONS.fuel, titleKey: "feature.fuel.title", descKey: "feature.fuel.desc" },
    { icon: ICONS.replay, titleKey: "feature.replay.title", descKey: "feature.replay.desc" },
    { icon: ICONS.gauge, titleKey: "feature.mileage.title", descKey: "feature.mileage.desc" },
    { icon: ICONS.parking, titleKey: "feature.parking.title", descKey: "feature.parking.desc" },
    { icon: ICONS.bell, titleKey: "feature.alerts.title", descKey: "feature.alerts.desc" },
    { icon: ICONS.fence, titleKey: "feature.geofence.title", descKey: "feature.geofence.desc" },
    { icon: ICONS.video, titleKey: "feature.video.title", descKey: "feature.video.desc" },
    { icon: ICONS.wifi, titleKey: "feature.iot.title", descKey: "feature.iot.desc" },
    { icon: ICONS.temp, titleKey: "feature.temp.title", descKey: "feature.temp.desc" },
  ];

  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mx-auto mb-14 max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-700">
              {t("features.badge")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{t("features.title")}</h2>
            <p className="mt-4 text-lg text-gray-600">{t("features.desc")}</p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <motion.div key={f.titleKey} variants={fadeInUp} whileHover={{ y: -6 }} className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-brand-100 hover:shadow-lg">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                  <Icon path={f.icon} className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t(f.titleKey)}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{t(f.descKey)}</p>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="mt-12 text-center">
            <Link href="/features" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-4 text-[15px] font-semibold text-white shadow-lg shadow-brand-600/30 transition-all hover:bg-brand-700 hover:shadow-xl">
              {t("features.viewAll")}
              <Icon path={ICONS.arrow} className="h-5 w-5" />
            </Link>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Product Categories ───────────────────────────────────────── */
function ProductsSection() {
  const { t, lang } = useLanguage();

  // Products with pricing info
  const products = [
    { titleKey: "product.btrc.title", descKey: "product.btrc.desc", badgeKey: "product.btrc.badge", icon: ICONS.shield, price: 4500, categoryColor: "bg-red-500" },
    { titleKey: "product.wired.title", descKey: "product.wired.desc", icon: ICONS.map, price: 4500, categoryColor: "bg-emerald-500" },
    { titleKey: "product.obd.title", descKey: "product.obd.desc", icon: ICONS.car, price: 5500, categoryColor: "bg-violet-500" },
    { titleKey: "product.dashcam.title", descKey: "product.dashcam.desc", icon: ICONS.video, price: 12500, categoryColor: "bg-brand-500" },
    { titleKey: "product.fuelSensor.title", descKey: "product.fuelSensor.desc", icon: ICONS.fuel, price: 8500, categoryColor: "bg-brand-500" },
    { titleKey: "product.portable.title", descKey: "product.portable.desc", icon: ICONS.package, price: 7500, categoryColor: "bg-purple-500" },
  ];

  const formatPrice = (price: number): string => {
    if (lang === "bn") {
      const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
      return price.toLocaleString("en-IN").replace(/\d/g, (d) => bnDigits[parseInt(d)]);
    }
    return price.toLocaleString("en-IN");
  };

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mx-auto mb-14 max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-700">
              {t("products.badge")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{t("products.title")}</h2>
            <p className="mt-4 text-lg text-gray-600">{t("products.desc")}</p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <motion.div key={p.titleKey} variants={fadeInUp} whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all">
                {p.badgeKey && (
                  <div className={`absolute right-4 top-4 rounded-full ${p.categoryColor} px-3 py-1 text-xs font-bold text-white`}>
                    {t(p.badgeKey)}
                  </div>
                )}
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-brand-600 transition-all group-hover:bg-brand-50 group-hover:scale-110">
                  <Icon path={p.icon} className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{t(p.titleKey)}</h3>

                {/* Price - Prominent display */}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">৳{formatPrice(p.price)}</span>
                  <span className="text-sm text-gray-500">{t("products.onwards")}</span>
                </div>

                <p className="mt-2 text-[14px] text-gray-600">{t(p.descKey)}</p>
                <Link href="/products" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700">
                  {t("products.explore")} <Icon path={ICONS.arrow} className="h-4 w-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Industry Coverage ────────────────────────────────────────── */
function IndustrySection() {
  const { t } = useLanguage();
  const industries = [
    { nameKey: "industry.healthcare", icon: ICONS.heart },
    { nameKey: "industry.construction", icon: ICONS.building },
    { nameKey: "industry.transport", icon: ICONS.truck },
    { nameKey: "industry.fmcg", icon: ICONS.package },
    { nameKey: "industry.agriculture", icon: ICONS.map },
    { nameKey: "industry.security", icon: ICONS.shield },
    { nameKey: "industry.publicTransport", icon: ICONS.bus },
    { nameKey: "industry.courier", icon: ICONS.package },
  ];

  return (
    <section className="bg-gray-900 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mx-auto mb-14 max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-brand-500/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-400">
              {t("industries.badge")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t("industries.title")}</h2>
            <p className="mt-4 text-lg text-gray-400">{t("industries.desc")}</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
            {industries.map((ind) => (
              <motion.div key={ind.nameKey} variants={fadeInUp} whileHover={{ scale: 1.05 }} className="group flex flex-col items-center rounded-xl bg-white/5 p-6 text-center backdrop-blur transition-all hover:bg-white/10">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400 transition-all group-hover:bg-brand-500 group-hover:text-white">
                  <Icon path={ind.icon} className="h-7 w-7" />
                </div>
                <span className="text-sm font-medium text-white">{t(ind.nameKey)}</span>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="mt-12 text-center">
            <Link href="/solutions" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-400 hover:text-brand-300">
              {t("industries.viewAll")} <Icon path={ICONS.arrow} className="h-4 w-4" />
            </Link>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Stats Section ─────────────────────────────────────────────── */
function StatsSection() {
  const { t } = useLanguage();
  const stats = [
    { value: "150+", labelKey: "stats.clients", icon: ICONS.users },
    { value: "5,000+", labelKey: "stats.vehicles", icon: ICONS.truck },
    { value: "10K+", labelKey: "stats.downloads", icon: ICONS.phone },
    { value: "5+", labelKey: "stats.years", icon: ICONS.clock },
  ];

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <motion.div key={stat.labelKey} variants={fadeInUp} whileHover={{ y: -4 }} className="rounded-2xl bg-gray-50 p-6 text-center shadow-sm transition-shadow hover:shadow-lg">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <Icon path={stat.icon} className="h-7 w-7" />
                </div>
                <div className="text-4xl font-bold text-gray-900">{stat.value}</div>
                <div className="mt-1 text-sm text-gray-500">{t(stat.labelKey)}</div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Certifications ───────────────────────────────────────────── */
function CertificationsSection() {
  const { t } = useLanguage();
  const certifications = [
    { name: "BTRC", image: "/images/certifications/btrc.png" },
    { name: "VTS", image: "/images/certifications/vts.svg" },
    { name: "BASSIS", image: "/images/certifications/bassis.svg" },
    { name: "ECAB", image: "/images/certifications/ecab.svg" },
    { name: "BRTA", image: "/images/certifications/brta.png" },
  ];

  return (
    <section className="border-y border-gray-100 bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.p variants={fadeIn} className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
            {t("certs.title")}
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-8">
            {certifications.map((cert) => (
              <motion.div
                key={cert.name}
                whileHover={{ scale: 1.05 }}
                className="flex h-20 w-32 items-center justify-center rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <Image
                  src={cert.image}
                  alt={cert.name}
                  width={100}
                  height={60}
                  className="h-auto max-h-14 w-auto object-contain"
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Partners Section ─────────────────────────────────────────── */
function PartnersSection() {
  const { t } = useLanguage();
  const telecomPartners = [
    { name: "Grameenphone", image: "/images/partners/telecom/grameenphone.webp" },
    { name: "Banglalink", image: "/images/partners/telecom/banglalink.webp" },
    { name: "Robi", image: "/images/partners/telecom/robi.jpg" },
  ];
  const devicePartners = [
    { name: "Concox", image: "/images/partners/devices/concox.png" },
    { name: "Teltonika", image: "/images/partners/devices/teltonika.png" },
    { name: "Queclink", image: "/images/partners/devices/queclink.png" },
    { name: "Meitrack", image: "/images/partners/devices/meitrack.png" },
    { name: "Ruptela", image: "/images/partners/devices/ruptela.png" },
    { name: "Fifotrack", image: "/images/partners/devices/fifotrack.png" },
    { name: "JimiIOT", image: "/images/partners/devices/jimiiot.png" },
    { name: "Seeworld", image: "/images/partners/devices/seeworld.png" },
  ];

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mb-12">
            <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
              {t("partners.telecom")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {telecomPartners.map((partner) => (
                <motion.div
                  key={partner.name}
                  whileHover={{ scale: 1.05 }}
                  className="flex h-16 w-40 items-center justify-center rounded-lg bg-gray-50 p-3 transition-shadow hover:shadow-md"
                >
                  <Image
                    src={partner.image}
                    alt={partner.name}
                    width={120}
                    height={48}
                    className="h-auto max-h-10 w-auto object-contain"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
              {t("partners.device")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {devicePartners.map((partner) => (
                <motion.div
                  key={partner.name}
                  whileHover={{ scale: 1.05 }}
                  className="flex h-14 w-28 items-center justify-center rounded-lg bg-gray-50 p-2 transition-shadow hover:shadow-md"
                >
                  <Image
                    src={partner.image}
                    alt={partner.name}
                    width={100}
                    height={40}
                    className="h-auto max-h-9 w-auto object-contain"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── CTA Section ───────────────────────────────────────────────── */
function CTASection() {
  const { t } = useLanguage();
  return (
    <section className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <AnimatedSection>
          <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {t("cta.title")}
          </motion.h2>
          <motion.p variants={fadeInUp} className="mx-auto mt-4 max-w-2xl text-lg text-brand-100">
            {t("cta.desc")}
          </motion.p>
          <motion.div variants={fadeInUp} className="mt-10 flex flex-wrap justify-center gap-4">
            <a href={`tel:${CONTACT.sales.replace(/[^+\d]/g, "")}`} className="inline-flex h-14 items-center gap-2 rounded-xl bg-white px-8 text-[16px] font-bold text-brand-600 shadow-xl transition-all hover:bg-gray-50 hover:shadow-2xl">
              <Icon path={ICONS.phone} className="h-5 w-5" />
              {t("hero.contactSales")}
            </a>
            <Link href="/pricing" className="inline-flex h-14 items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 text-[16px] font-semibold text-white backdrop-blur transition-all hover:bg-white/20">
              {t("cta.viewPricing")}
              <Icon path={ICONS.arrow} className="h-5 w-5" />
            </Link>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Main HomePage ─────────────────────────────────────────────── */
export function HomePage() {
  return (
    <>
      <Hero />
      <TrustBadges />
      <WhyChooseSection />
      <TrustedClientsSection />
      <FeaturesSection />
      <ProductsSection />
      <IndustrySection />
      <StatsSection />
      <TestimonialsSection />
      <CertificationsSection />
      <PartnersSection />
      <FAQSection />
      <CTASection />
    </>
  );
}
