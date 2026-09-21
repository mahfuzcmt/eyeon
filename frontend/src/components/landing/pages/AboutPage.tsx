"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "../LanguageContext";

const PHONE = "+880 1999-036999";

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
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  check: "M20 6L9 17l-5-5",
  map: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
  code: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5",
  chat: "M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155",
  money: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  clock: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  target: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
};

const WHY_EYEON = [
  {
    titleKey: "about.why.local",
    descKey: "about.why.local.desc",
    icon: ICONS.map,
  },
  {
    titleKey: "about.why.owned",
    descKey: "about.why.owned.desc",
    icon: ICONS.code,
  },
  {
    titleKey: "about.why.support",
    descKey: "about.why.support.desc",
    icon: ICONS.chat,
  },
  {
    titleKey: "about.why.affordable",
    descKey: "about.why.affordable.desc",
    icon: ICONS.money,
  },
];

const STATS = [
  { value: "2016", labelKey: "about.stats.since" },
  { value: "150+", labelKey: "about.stats.clients" },
  { value: "10K+", labelKey: "about.stats.vehicles" },
  { value: "24/7", labelKey: "about.stats.support" },
];

export function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 pt-32 pb-20 lg:pt-40 lg:pb-28">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection className="text-center">
            <motion.div variants={fadeInUp} className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-4 py-2 text-sm font-semibold text-brand-300">
              <Icon path={ICONS.clock} className="h-4 w-4" />
              {t("about.badge")}
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t("about.title")}
            </motion.h1>

            <motion.p variants={fadeInUp} className="mx-auto mt-6 max-w-3xl text-lg text-gray-300 sm:text-xl">
              {t("about.subtitle")}
            </motion.p>

            {/* Stats */}
            <motion.div variants={fadeInUp} className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:gap-8">
              {STATS.map((stat, idx) => (
                <div key={idx} className="rounded-2xl bg-white/10 backdrop-blur-sm p-6 text-center">
                  <div className="text-3xl font-bold text-brand-400 sm:text-4xl">{stat.value}</div>
                  <div className="mt-1 text-sm text-gray-300">{t(stat.labelKey)}</div>
                </div>
              ))}
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection>
            <div className="mx-auto max-w-3xl">
              <motion.div variants={fadeInUp} className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-2 text-sm font-semibold text-brand-700">
                {t("about.story.badge")}
              </motion.div>

              <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-gray-900 sm:text-4xl">
                {t("about.story.title")}
              </motion.h2>

              <motion.div variants={fadeInUp} className="mt-8 space-y-6 text-lg leading-relaxed text-gray-600">
                <p>{t("about.story.p1")}</p>
                <p>{t("about.story.p2")}</p>
                <p>{t("about.story.p3")}</p>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection className="text-center">
            <motion.div variants={fadeInUp} className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-4 py-2 text-sm font-semibold text-brand-300">
              <Icon path={ICONS.target} className="h-4 w-4" />
              {t("about.mission.badge")}
            </motion.div>

            <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-white sm:text-4xl">
              {t("about.mission.title")}
            </motion.h2>

            <motion.p variants={fadeInUp} className="mx-auto mt-6 max-w-3xl text-xl leading-relaxed text-gray-300">
              {t("about.mission.desc")}
            </motion.p>
          </AnimatedSection>
        </div>
      </section>

      {/* Why EyeOn Section */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                {t("about.why.title")}
              </h2>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2">
              {WHY_EYEON.map((item, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeInUp}
                  whileHover={{ y: -5 }}
                  className="flex gap-5 rounded-2xl bg-white p-6 shadow-lg transition-shadow hover:shadow-xl"
                >
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                    <Icon path={item.icon} className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {t(item.titleKey)}
                    </h3>
                    <p className="mt-2 text-gray-600 leading-relaxed">
                      {t(item.descKey)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection className="text-center">
            <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-white sm:text-4xl">
              {t("about.cta.title")}
            </motion.h2>

            <motion.p variants={fadeInUp} className="mx-auto mt-4 max-w-2xl text-lg text-brand-100">
              {t("about.cta.desc")}
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-bold text-brand-600 shadow-lg transition hover:bg-brand-50"
              >
                <Icon path={ICONS.phone} className="h-5 w-5" />
                {t("about.cta.call")}
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 bg-white/10 px-8 py-4 text-lg font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                {t("about.cta.contact")}
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
