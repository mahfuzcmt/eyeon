"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "../LanguageContext";
import { AnimatedSection, CallToAction, FEATURES, Icon, ICONS, PageHero, fadeInUp } from "../shared";

export function FeaturesPage() {
  const { t, lang } = useLanguage();
  const numerals = lang === "bn" ? ["১", "২", "৩", "৪", "৫", "৬", "৭", "৮"] : ["1", "2", "3", "4", "5", "6", "7", "8"];

  return (
    <>
      <PageHero badgeKey="featuresPage.badge" titleKey="featuresPage.title" descKey="featuresPage.desc" />

      {/* The eight features, in detail */}
      <section className="bg-surface-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <AnimatedSection className="grid gap-5 md:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.article key={f.id} variants={fadeInUp} className="rounded-3xl border border-surface-300 bg-white p-7 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${i % 2 === 0 ? "bg-brand-50 text-brand-500" : "bg-sun-100 text-ink-900"}`}>
                    <Icon path={f.icon} className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-ink-500">{numerals[i]}</div>
                    <h2 className="font-display text-xl font-semibold text-ink-900">{t(`feature.${f.id}.title`)}</h2>
                  </div>
                </div>
                <p className="mt-4 text-[16px] font-medium leading-relaxed text-ink-900">{t(`feature.${f.id}.desc`)}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{t(`feature.${f.id}.detail`)}</p>
              </motion.article>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* Where you see it */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.h2 variants={fadeInUp} className="mb-10 text-center font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {t("featuresPage.whereTitle")}
            </motion.h2>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                { id: "app", icon: ICONS.app },
                { id: "web", icon: ICONS.monitor },
              ].map((item) => (
                <motion.div key={item.id} variants={fadeInUp} className="rounded-3xl bg-surface-50 p-8">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-100 text-ink-900">
                    <Icon path={item.icon} className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-ink-900">{t(`featuresPage.${item.id}.title`)}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{t(`featuresPage.${item.id}.desc`)}</p>
                </motion.div>
              ))}
            </div>
            <motion.div variants={fadeInUp} className="mt-10 text-center">
              <Link href="/products" className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-brand-500 px-8 text-[16px] font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600">
                {t("featuresPage.viewTracker")}
                <Icon path={ICONS.arrow} className="h-5 w-5" />
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      <CallToAction />
    </>
  );
}
