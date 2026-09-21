"use client";

import { motion } from "framer-motion";
import { EyeOnMark } from "@/components/brand/EyeOnLogo";
import { useLanguage } from "../LanguageContext";
import { AnimatedSection, CallToAction, CheckItem, ContactButtons, Icon, ICONS, PageHero, fadeInUp } from "../shared";

/*
 * EyeOn has ONE product. There is no product photograph yet, so the tracker is drawn
 * as a CSS illustration and labelled as one. Do not add specifications (battery
 * capacity, weight, water resistance, dimensions) or a price until the business
 * owner supplies the real values.
 */
function TrackerIllustration() {
  const { t } = useLanguage();
  return (
    <div>
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sun-400/15" />
        <div aria-hidden="true" className="absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-brand-400/15" />
        {/* lanyard */}
        <div aria-hidden="true" className="absolute left-1/2 top-0 h-[22%] w-1.5 -translate-x-1/2 rounded-b-full bg-sun-400" />
        {/* device body */}
        <motion.div
          aria-hidden="true"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="relative flex h-[52%] w-[40%] flex-col items-center justify-between rounded-[2rem] bg-white p-5 shadow-2xl"
        >
          <EyeOnMark size={48} color="#0F6B5C" />
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sun-400 font-display text-sm font-bold text-ink-900 shadow-inner">SOS</div>
        </motion.div>
      </div>
      <p className="mt-3 text-center text-xs text-ink-500">{t("productsPage.illustration")}</p>
    </div>
  );
}

export function ProductsPage() {
  const { t } = useLanguage();
  const wearOptions = [
    { id: "neck", icon: ICONS.lanyard },
    { id: "bag", icon: ICONS.bag },
    { id: "wrist", icon: ICONS.watch },
  ];

  return (
    <>
      <PageHero badgeKey="productsPage.badge" titleKey="productsPage.title" descKey="productsPage.desc" />

      {/* The product */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div variants={fadeInUp} className="mx-auto w-full max-w-md">
              <TrackerIllustration />
            </motion.div>

            <motion.div variants={fadeInUp}>
              <h2 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">{t("productsPage.name")}</h2>
              <p className="mt-2 text-lg font-medium text-brand-600">{t("productsPage.tagline")}</p>
              <ul className="mt-8 space-y-4">
                {["p1", "p2", "p3", "p4"].map((p) => (
                  <CheckItem key={p}>{t(`productsPage.${p}`)}</CheckItem>
                ))}
              </ul>
              <ContactButtons className="mt-10" />
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* Ways to carry it */}
      <section className="bg-surface-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.h2 variants={fadeInUp} className="mb-12 text-center font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {t("productsPage.wear.title")}
            </motion.h2>
            <div className="grid gap-6 md:grid-cols-3">
              {wearOptions.map((w) => (
                <motion.div key={w.id} variants={fadeInUp} className="rounded-3xl border border-surface-300 bg-white p-8 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sun-100 text-ink-900">
                    <Icon path={w.icon} className="h-8 w-8" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-ink-900">{t(`productsPage.wear.${w.id}.title`)}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{t(`productsPage.wear.${w.id}.desc`)}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* App + specifications note */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <AnimatedSection className="grid gap-6 md:grid-cols-2">
            <motion.div variants={fadeInUp} className="rounded-3xl bg-brand-50 p-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-500">
                <Icon path={ICONS.app} className="h-7 w-7" />
              </div>
              <h2 className="font-display text-xl font-semibold text-ink-900">{t("productsPage.app.title")}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{t("productsPage.app.desc")}</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="rounded-3xl bg-sun-50 p-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink-900">
                <Icon path={ICONS.book} className="h-7 w-7" />
              </div>
              <h2 className="font-display text-xl font-semibold text-ink-900">{t("productsPage.specs.title")}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{t("productsPage.specs.desc")}</p>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      <CallToAction />
    </>
  );
}
