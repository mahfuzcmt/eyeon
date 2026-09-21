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
  arrow: "M5 12h14M12 5l7 7-7 7",
  check: "M20 6L9 17l-5-5",
  truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  bus: "M4 6v10c0 1 1 2 2 2h1v1a1 1 0 001 1h1a1 1 0 001-1v-1h4v1a1 1 0 001 1h1a1 1 0 001-1v-1h1c1 0 2-1 2-2V6c0-2-1.5-3-5-3H9C5.5 3 4 4 4 6zM7 15a1 1 0 100-2 1 1 0 000 2zM17 15a1 1 0 100-2 1 1 0 000 2zM4 10h16",
  car: "M16 3H8l-4 6v8a1 1 0 001 1h1a1 1 0 001-1v-1h10v1a1 1 0 001 1h1a1 1 0 001-1V9l-4-6zM5.5 14a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 14a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM6 9l2.5-4h7L18 9H6z",
  motorcycle: "M5 16a3 3 0 100-6 3 3 0 000 6zM19 16a3 3 0 100-6 3 3 0 000 6zM10 13h4M7 13l3-5h4l1 2M14 10l3 3",
  temp: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
  package: "M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
};

const SOLUTIONS = [
  {
    id: "logistics",
    titleKey: "solutions.logistics.title",
    subtitleKey: "solutions.logistics.subtitle",
    descKey: "solutions.logistics.desc",
    icon: ICONS.truck,
    color: "blue",
    featureKeys: [
      "solutions.logistics.f1",
      "solutions.logistics.f2",
      "solutions.logistics.f3",
      "solutions.logistics.f4",
      "solutions.logistics.f5",
      "solutions.logistics.f6",
    ],
  },
  {
    id: "school",
    titleKey: "solutions.school.title",
    subtitleKey: "solutions.school.subtitle",
    descKey: "solutions.school.desc",
    icon: ICONS.bus,
    color: "green",
    featureKeys: [
      "solutions.school.f1",
      "solutions.school.f2",
      "solutions.school.f3",
      "solutions.school.f4",
      "solutions.school.f5",
      "solutions.school.f6",
    ],
  },
  {
    id: "rentacar",
    titleKey: "solutions.rentacar.title",
    subtitleKey: "solutions.rentacar.subtitle",
    descKey: "solutions.rentacar.desc",
    icon: ICONS.car,
    color: "purple",
    featureKeys: [
      "solutions.rentacar.f1",
      "solutions.rentacar.f2",
      "solutions.rentacar.f3",
      "solutions.rentacar.f4",
      "solutions.rentacar.f5",
      "solutions.rentacar.f6",
    ],
  },
  {
    id: "motorcycle",
    titleKey: "solutions.motorcycle.title",
    subtitleKey: "solutions.motorcycle.subtitle",
    descKey: "solutions.motorcycle.desc",
    icon: ICONS.motorcycle,
    color: "orange",
    featureKeys: [
      "solutions.motorcycle.f1",
      "solutions.motorcycle.f2",
      "solutions.motorcycle.f3",
      "solutions.motorcycle.f4",
      "solutions.motorcycle.f5",
      "solutions.motorcycle.f6",
    ],
  },
  {
    id: "corporate",
    titleKey: "solutions.corporate.title",
    subtitleKey: "solutions.corporate.subtitle",
    descKey: "solutions.corporate.desc",
    icon: ICONS.truck,
    color: "teal",
    featureKeys: [
      "solutions.corporate.f1",
      "solutions.corporate.f2",
      "solutions.corporate.f3",
      "solutions.corporate.f4",
      "solutions.corporate.f5",
      "solutions.corporate.f6",
    ],
  },
  {
    id: "coldchain",
    titleKey: "solutions.coldchain.title",
    subtitleKey: "solutions.coldchain.subtitle",
    descKey: "solutions.coldchain.desc",
    icon: ICONS.temp,
    color: "cyan",
    featureKeys: [
      "solutions.coldchain.f1",
      "solutions.coldchain.f2",
      "solutions.coldchain.f3",
      "solutions.coldchain.f4",
      "solutions.coldchain.f5",
      "solutions.coldchain.f6",
    ],
  },
];

function SolutionCard({ solution, t }: { solution: typeof SOLUTIONS[0]; t: (key: string) => string }) {
  const colorClasses = {
    blue: "bg-brand-50 text-brand-600",
    green: "bg-brand-50 text-brand-600",
    purple: "bg-brand-50 text-brand-600",
    orange: "bg-brand-50 text-brand-600",
    teal: "bg-brand-50 text-brand-600",
    cyan: "bg-brand-50 text-brand-600",
  };

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -6 }}
      className="overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-xl"
    >
      <div className="p-8">
        <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${colorClasses[solution.color as keyof typeof colorClasses]}`}>
          <Icon path={solution.icon} className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">{t(solution.titleKey)}</h3>
        <p className="mt-1 text-sm text-brand-600">{t(solution.subtitleKey)}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{t(solution.descKey)}</p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {solution.featureKeys.map((featureKey) => (
            <div key={featureKey} className="flex items-center gap-2 text-sm text-gray-600">
              <Icon path={ICONS.check} className="h-4 w-4 shrink-0 text-brand-500" />
              <span>{t(featureKey)}</span>
            </div>
          ))}
        </div>

        <Link href="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
          {t("solutions.learnMore")} <Icon path={ICONS.arrow} className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}

export function SolutionsPage() {
  const { t } = useLanguage();

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 pb-20 pt-32">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 inline-flex items-center rounded-full bg-brand-500/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-300">
              {t("solutions.badge")}
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-4xl font-bold text-white sm:text-5xl">
              {t("solutions.title")}
            </motion.h1>
            <motion.p variants={fadeInUp} className="mx-auto mt-4 max-w-2xl text-lg text-gray-300">
              {t("solutions.desc")}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {SOLUTIONS.map((solution) => (
                <SolutionCard key={solution.id} solution={solution} t={t} />
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">{t("solutions.needCustom")}</h2>
          <p className="mt-4 text-lg text-brand-100">
            {t("solutions.customDesc")}
          </p>
          <Link href="/contact" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-brand-600 shadow-xl transition-all hover:bg-gray-50">
            {t("solutions.contactExperts")}
            <Icon path={ICONS.arrow} className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
