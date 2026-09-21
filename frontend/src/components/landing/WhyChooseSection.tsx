"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLanguage } from "./LanguageContext";

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

const VALUE_PROPS = [
  {
    titleKey: "why.btrc.title",
    descKey: "why.btrc.desc",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    color: "bg-red-500",
  },
  {
    titleKey: "why.price.title",
    descKey: "why.price.desc",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    color: "bg-emerald-500",
  },
  {
    titleKey: "why.owned.title",
    descKey: "why.owned.desc",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    color: "bg-violet-500",
  },
  {
    titleKey: "why.support.title",
    descKey: "why.support.desc",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    color: "bg-brand-500",
  },
  {
    titleKey: "why.local.title",
    descKey: "why.local.desc",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    color: "bg-teal-500",
  },
];

export function WhyChooseSection() {
  const { t } = useLanguage();

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mx-auto mb-14 max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-700">
              {t("why.badge")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("why.title")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("why.desc")}
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {VALUE_PROPS.map((prop, index) => (
              <motion.div
                key={prop.titleKey}
                variants={fadeInUp}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-all hover:shadow-xl"
              >
                {/* Top accent bar */}
                <div className={`absolute left-0 right-0 top-0 h-1 ${prop.color}`} />

                {/* Icon */}
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${prop.color} text-white shadow-lg transition-transform group-hover:scale-110`}>
                  {prop.icon}
                </div>

                {/* Title */}
                <h3 className="mb-2 text-lg font-bold text-gray-900">{t(prop.titleKey)}</h3>

                {/* Description */}
                <p className="text-sm text-gray-600">{t(prop.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
