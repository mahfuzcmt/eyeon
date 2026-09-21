"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLanguage } from "../LanguageContext";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
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
  map: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  fuel: "M3 22V5a2 2 0 012-2h7a2 2 0 012 2v17M14 8h4a2 2 0 012 2v4a2 2 0 01-2 2h-4M10 6v4M6 6v4",
  replay: "M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2",
  fence: "M12 22s7-7.75 7-13a7 7 0 10-14 0c0 5.25 7 13 7 13zM12 12a3 3 0 100-6 3 3 0 000 6z",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  video: "M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z",
  report: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  gauge: "M12 15l3.5-5.5M8 21h8M3 15a9 9 0 1118 0",
  temp: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
  arrow: "M5 12h14M12 5l7 7-7 7",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
};

const GPS_FEATURES = [
  { icon: ICONS.map, titleKey: "featuresPage.gps.realtime.title", descKey: "featuresPage.gps.realtime.desc" },
  { icon: ICONS.fuel, titleKey: "featuresPage.gps.fuel.title", descKey: "featuresPage.gps.fuel.desc" },
  { icon: ICONS.replay, titleKey: "featuresPage.gps.replay.title", descKey: "featuresPage.gps.replay.desc" },
  { icon: ICONS.fence, titleKey: "featuresPage.gps.geofence.title", descKey: "featuresPage.gps.geofence.desc" },
  { icon: ICONS.bell, titleKey: "featuresPage.gps.alerts.title", descKey: "featuresPage.gps.alerts.desc" },
  { icon: ICONS.lock, titleKey: "featuresPage.gps.lock.title", descKey: "featuresPage.gps.lock.desc" },
  { icon: ICONS.video, titleKey: "featuresPage.gps.dashcam.title", descKey: "featuresPage.gps.dashcam.desc" },
  { icon: ICONS.report, titleKey: "featuresPage.gps.analytics.title", descKey: "featuresPage.gps.analytics.desc" },
];

const DASHBOARD_FEATURES = [
  { icon: ICONS.gauge, titleKey: "featuresPage.dash.live.title", descKey: "featuresPage.dash.live.desc" },
  { icon: ICONS.report, titleKey: "featuresPage.dash.reports.title", descKey: "featuresPage.dash.reports.desc" },
  { icon: ICONS.phone, titleKey: "featuresPage.dash.mobile.title", descKey: "featuresPage.dash.mobile.desc" },
  { icon: ICONS.users, titleKey: "featuresPage.dash.multiuser.title", descKey: "featuresPage.dash.multiuser.desc" },
  { icon: ICONS.bolt, titleKey: "featuresPage.dash.api.title", descKey: "featuresPage.dash.api.desc" },
  { icon: ICONS.temp, titleKey: "featuresPage.dash.sensors.title", descKey: "featuresPage.dash.sensors.desc" },
];

export function FeaturesPage() {
  const { t } = useLanguage();

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 pb-20 pt-32">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 inline-flex items-center rounded-full bg-brand-500/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-300">
              {t("featuresPage.badge")}
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-4xl font-bold text-white sm:text-5xl">
              {t("featuresPage.title")}
            </motion.h1>
            <motion.p variants={fadeInUp} className="mx-auto mt-4 max-w-2xl text-lg text-gray-300">
              {t("featuresPage.desc")}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* GPS Features */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeInUp} className="mb-14">
              <div className="inline-flex items-center rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-700">
                {t("featuresPage.gpsTracking")}
              </div>
              <h2 className="mt-4 text-3xl font-bold text-gray-900">{t("featuresPage.gpsFeatures")}</h2>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2">
              {GPS_FEATURES.map((feature) => (
                <motion.div key={feature.titleKey} variants={fadeInUp} whileHover={{ x: 4 }} className="flex gap-5 rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-brand-100 hover:shadow-md">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon path={feature.icon} className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t(feature.titleKey)}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{t(feature.descKey)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Dashboard Features */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeInUp} className="mb-14">
              <div className="inline-flex items-center rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-700">
                {t("featuresPage.dashboard")}
              </div>
              <h2 className="mt-4 text-3xl font-bold text-gray-900">{t("featuresPage.dashboardFeatures")}</h2>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {DASHBOARD_FEATURES.map((feature) => (
                <motion.div key={feature.titleKey} variants={fadeInUp} whileHover={{ y: -4 }} className="rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-lg">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon path={feature.icon} className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{t(feature.titleKey)}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{t(feature.descKey)}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">{t("featuresPage.ready")}</h2>
          <p className="mt-4 text-lg text-brand-100">
            {t("featuresPage.readyDesc")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-brand-600 shadow-xl transition-all hover:bg-gray-50">
              {t("nav.getDemo")}
              <Icon path={ICONS.arrow} className="h-5 w-5" />
            </Link>
            <Link href="/products" className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition-all hover:bg-white/20">
              {t("featuresPage.viewDevices")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
