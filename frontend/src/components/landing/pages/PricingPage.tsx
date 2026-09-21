"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "../LanguageContext";
import { FAQSection } from "../FAQSection";
import { AnimatedSection, CONTACT, CheckItem, ContactButtons, Icon, ICONS, PageHero, fadeInUp } from "../shared";

/*
 * EyeOn has no published prices. This page must not show taka amounts, plan tiers
 * with numbers, discounts, warranty lengths or "free" offers until the business
 * owner supplies the real ones. It is a pre-order page: what you get, who it is
 * for, and how to reach us.
 */
export function PricingPage() {
  const { t } = useLanguage();
  const included = [
    { id: "get1", icon: ICONS.pin },
    { id: "get2", icon: ICONS.app },
    { id: "get3", icon: ICONS.monitor },
    { id: "get4", icon: ICONS.message },
  ];

  return (
    <>
      <PageHero badgeKey="pricing.badge" titleKey="pricing.title" descKey="pricing.desc" />

      {/* Call band */}
      <section className="bg-sun-400 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="font-display text-xl font-bold text-ink-900">
            {t("pricing.family.cta")}: {CONTACT.phoneDisplay}
          </p>
          <a href={`tel:${CONTACT.phoneTel}`} className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-ink-900 px-7 text-[16px] font-bold text-white transition-all hover:bg-ink-800">
            <Icon path={ICONS.phone} className="h-5 w-5" />
            {t("cta.call")}
          </a>
        </div>
      </section>

      {/* What you get */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.h2 variants={fadeInUp} className="mb-12 text-center font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {t("pricing.get.title")}
            </motion.h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {included.map((item) => (
                <motion.div key={item.id} variants={fadeInUp} className="rounded-3xl bg-surface-50 p-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                    <Icon path={item.icon} className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink-900">{t(`pricing.${item.id}.title`)}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{t(`pricing.${item.id}.desc`)}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Two audiences */}
      <section className="bg-surface-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <AnimatedSection className="grid gap-6 md:grid-cols-2">
            {/* Family */}
            <motion.div variants={fadeInUp} className="flex flex-col rounded-3xl border border-surface-300 bg-white p-8 shadow-sm">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-100 text-ink-900">
                <Icon path={ICONS.heart} className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-bold text-ink-900">{t("pricing.family.title")}</h2>
              <p className="mt-1 text-[15px] text-ink-500">{t("pricing.family.tagline")}</p>
              <ul className="mt-6 space-y-3">
                {["f1", "f2", "f3", "f4"].map((f) => (
                  <CheckItem key={f}>{t(`pricing.family.${f}`)}</CheckItem>
                ))}
              </ul>
              <div className="mt-8 flex-1" />
              <a href={`tel:${CONTACT.phoneTel}`} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 text-[16px] font-semibold text-white transition-all hover:bg-brand-600">
                <Icon path={ICONS.phone} className="h-5 w-5" />
                {t("pricing.family.cta")}
              </a>
            </motion.div>

            {/* School / institution */}
            <motion.div variants={fadeInUp} className="flex flex-col rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 p-8 shadow-lg">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-400 text-ink-900">
                <Icon path={ICONS.school} className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white">{t("pricing.school.title")}</h2>
              <p className="mt-1 text-[15px] text-brand-50">{t("pricing.school.tagline")}</p>
              <ul className="mt-6 space-y-3">
                {["f1", "f2", "f3", "f4"].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px] leading-relaxed text-white">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sun-400 text-ink-900">
                      <Icon path={ICONS.check} className="h-3 w-3" />
                    </span>
                    <span>{t(`pricing.school.${f}`)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-2xl bg-white/10 p-4 text-[14px] leading-relaxed text-brand-50">{t("pricing.school.note")}</p>
              <div className="mt-8 flex-1" />
              <Link href="/contact" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-sun-400 px-6 text-[16px] font-bold text-ink-900 transition-all hover:bg-sun-300">
                {t("pricing.school.cta")}
                <Icon path={ICONS.arrow} className="h-5 w-5" />
              </Link>
            </motion.div>
          </AnimatedSection>

          <div className="mt-12 flex justify-center">
            <ContactButtons />
          </div>
        </div>
      </section>

      <FAQSection />
    </>
  );
}
