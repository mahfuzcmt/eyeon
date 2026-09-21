"use client";

import { motion } from "framer-motion";
import { useLanguage } from "../LanguageContext";
import { AnimatedSection, CallToAction, Icon, ICONS, PageHero, SectionBadge, fadeInUp } from "../shared";

/*
 * Kept short on purpose. Do not add a founding year, team size, customer counts,
 * awards, certifications or an office address unless the business owner supplies them.
 */
export function AboutPage() {
  const { t } = useLanguage();
  const values = [
    { id: "simple", icon: ICONS.smile },
    { id: "private", icon: ICONS.lock },
    { id: "bangla", icon: ICONS.message },
    { id: "honest", icon: ICONS.check },
  ];

  return (
    <>
      <PageHero badgeKey="about.badge" titleKey="about.title" descKey="about.subtitle" />

      {/* Story */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeInUp}>
              <SectionBadge>{t("about.story.badge")}</SectionBadge>
              <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("about.story.title")}</h2>
            </motion.div>
            <motion.p variants={fadeInUp} className="mt-6 text-lg leading-relaxed text-ink-700">
              {t("about.story.p1")}
            </motion.p>
            <motion.p variants={fadeInUp} className="mt-4 text-lg leading-relaxed text-ink-700">
              {t("about.story.p2")}
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-10 rounded-3xl bg-sun-50 p-8">
              <h3 className="font-display text-xl font-semibold text-ink-900">{t("about.today.title")}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-ink-700">{t("about.today.desc")}</p>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* Values */}
      <section className="bg-surface-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.h2 variants={fadeInUp} className="mb-12 text-center font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {t("about.values.title")}
            </motion.h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v) => (
                <motion.div key={v.id} variants={fadeInUp} className="rounded-3xl border border-surface-300 bg-white p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                    <Icon path={v.icon} className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink-900">{t(`about.values.${v.id}.title`)}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{t(`about.values.${v.id}.desc`)}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <CallToAction titleKey="about.cta.title" descKey="about.cta.desc" />
    </>
  );
}
