"use client";

import { motion } from "framer-motion";
import { useLanguage } from "./LanguageContext";
import { AnimatedSection, Icon, ICONS, SectionBadge, fadeInUp } from "./shared";

// Reasons must be things that are true of the product today - no certifications,
// price claims or support-hours promises.
const REASONS = [
  { id: "bangla", icon: ICONS.message },
  { id: "simple", icon: ICONS.smile },
  { id: "private", icon: ICONS.lock },
  { id: "support", icon: ICONS.phone },
];

export function WhyChooseSection() {
  const { t } = useLanguage();

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mx-auto mb-14 max-w-3xl text-center">
            <SectionBadge>{t("why.badge")}</SectionBadge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("why.title")}</h2>
            <p className="mt-4 text-lg text-ink-500">{t("why.desc")}</p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map((r) => (
              <motion.div key={r.id} variants={fadeInUp} className="rounded-3xl border border-surface-300 bg-surface-50 p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-100 text-ink-900">
                  <Icon path={r.icon} className="h-7 w-7" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink-900">{t(`why.${r.id}.title`)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{t(`why.${r.id}.desc`)}</p>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
