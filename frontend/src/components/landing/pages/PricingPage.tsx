"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
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
  check: "M20 6L9 17l-5-5",
  arrow: "M5 12h14M12 5l7 7-7 7",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
};

export function PricingPage() {
  const { t, lang } = useLanguage();

  const plans = [
    {
      nameKey: "pricing.basic",
      price: lang === "bn" ? "৳২০০" : "৳200",
      taglineKey: "plan.basic.tagline",
      featureKeys: [
        "plan.feature.realtime",
        "plan.feature.history",
        "plan.feature.mobileApp",
        "plan.feature.smsAlerts",
        "plan.feature.overspeed",
        "plan.feature.emailSupport",
      ],
      highlight: false,
    },
    {
      nameKey: "pricing.pro",
      price: lang === "bn" ? "৳৩৫০" : "৳350",
      taglineKey: "plan.pro.tagline",
      featureKeys: [
        "plan.feature.everything",
        "plan.feature.geofences",
        "plan.feature.engineLock",
        "plan.feature.fuelMonitor",
        "plan.feature.driverReports",
        "plan.feature.phoneSupport",
        "plan.feature.multiUser",
      ],
      highlight: true,
    },
    {
      nameKey: "pricing.enterprise",
      price: lang === "bn" ? "৳৫০০" : "৳500",
      taglineKey: "plan.enterprise.tagline",
      featureKeys: [
        "plan.feature.everythingPro",
        "plan.feature.unlimitedUsers",
        "plan.feature.api",
        "plan.feature.customReports",
        "plan.feature.whiteLabel",
        "plan.feature.accountManager",
        "plan.feature.sla",
        "plan.feature.training",
      ],
      highlight: false,
    },
  ];

  const faq = [
    { qKey: "faq.q1", aKey: "faq.a1" },
    { qKey: "faq.q2", aKey: "faq.a2" },
    { qKey: "faq.q3", aKey: "faq.a3" },
    { qKey: "faq.q4", aKey: "faq.a4" },
    { qKey: "faq.q5", aKey: "faq.a5" },
    { qKey: "faq.q6", aKey: "faq.a6" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 pb-20 pt-32">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 inline-flex items-center rounded-full bg-brand-500/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-300">
              {t("pricing.badge")}
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-4xl font-bold text-white sm:text-5xl">
              {t("pricing.title")}
            </motion.h1>
            <motion.p variants={fadeInUp} className="mx-auto mt-4 max-w-2xl text-lg text-gray-300">
              {t("pricing.desc")}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection>
            <div className="grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => (
                <motion.div
                  key={plan.nameKey}
                  variants={fadeInUp}
                  whileHover={{ y: -8 }}
                  className={`relative flex flex-col overflow-hidden rounded-2xl p-8 transition-all ${
                    plan.highlight
                      ? "bg-brand-600 text-white shadow-2xl shadow-brand-600/30"
                      : "bg-white shadow-lg"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -right-10 top-6 rotate-45 bg-yellow-400 px-12 py-1 text-xs font-bold uppercase text-gray-900">
                      {t("pricing.popular")}
                    </div>
                  )}

                  <h3 className={`text-2xl font-bold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                    {t(plan.nameKey)}
                  </h3>
                  <p className={`mt-1 text-sm ${plan.highlight ? "text-brand-100" : "text-gray-500"}`}>
                    {t(plan.taglineKey)}
                  </p>

                  <div className="mt-6">
                    <span className={`text-5xl font-bold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                      {plan.price}
                    </span>
                    <span className={plan.highlight ? "text-brand-100" : "text-gray-500"}>{t("pricing.perMonth")}</span>
                  </div>

                  <ul className="mt-8 flex-1 space-y-4">
                    {plan.featureKeys.map((featureKey) => (
                      <li key={featureKey} className={`flex items-center gap-3 text-[15px] ${plan.highlight ? "text-white" : "text-gray-600"}`}>
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full ${plan.highlight ? "bg-white/20" : "bg-brand-50"}`}>
                          <Icon path={ICONS.check} className={`h-3 w-3 ${plan.highlight ? "text-white" : "text-brand-600"}`} />
                        </div>
                        {t(featureKey)}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/contact"
                    className={`mt-8 block rounded-xl py-4 text-center text-[15px] font-semibold transition-all ${
                      plan.highlight
                        ? "bg-white text-brand-600 hover:bg-gray-50"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}
                  >
                    {t("pricing.getStarted")}
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.p variants={fadeInUp} className="mt-8 text-center text-sm text-gray-500">
              {t("pricing.includes")}: <strong>{t("pricing.freeInstall")}</strong> • <strong>{t("pricing.freeSim")}</strong> • <strong>{t("pricing.warranty")}</strong> • <strong>{t("pricing.supportIncluded")}</strong>
            </motion.p>
          </AnimatedSection>
        </div>
      </section>

      {/* Device Pricing */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeInUp} className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">{t("device.title")}</h2>
              <p className="mt-4 text-lg text-gray-600">
                {t("device.desc")}
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-12 overflow-hidden rounded-2xl bg-gray-50 shadow-sm">
              <div className="p-8 text-center">
                <p className="text-lg text-gray-600 mb-4">
                  {t("device.startFrom")} <span className="font-bold text-gray-900">{lang === "bn" ? "৳২,৮০০" : "৳2,800"}</span> {t("device.depending")}
                </p>
                <a
                  href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-600 hover:shadow-xl"
                >
                  <Icon path={ICONS.phone} className="h-5 w-5" />
                  {t("products.callForPrice")}
                </a>
                <p className="mt-4 text-sm text-gray-500">
                  {t("device.visitProducts")} <Link href="/products" className="text-brand-600 hover:text-brand-700 font-medium">{t("nav.products")}</Link>
                </p>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeInUp} className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">{t("faq.title")}</h2>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-12 space-y-4">
              {faq.map((item, i) => (
                <div key={i} className="rounded-xl bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">{t(item.qKey)}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{t(item.aKey)}</p>
                </div>
              ))}
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">{t("quote.title")}</h2>
          <p className="mt-4 text-lg text-brand-100">
            {t("quote.desc")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-brand-600 shadow-xl transition-all hover:bg-gray-50">
              {t("quote.contactSales")}
              <Icon path={ICONS.arrow} className="h-5 w-5" />
            </Link>
            <a
              href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition-all hover:bg-white/20"
            >
              <Icon path={ICONS.phone} className="h-5 w-5" />
              {PHONE}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
