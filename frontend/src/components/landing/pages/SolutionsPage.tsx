"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "../LanguageContext";
import { AnimatedSection, CallToAction, CheckItem, Icon, ICONS, PageHero, fadeInUp } from "../shared";

const SOLUTIONS = [
  { id: "family", icon: ICONS.heart },
  { id: "school", icon: ICONS.school },
  { id: "coaching", icon: ICONS.book },
  { id: "elderly", icon: ICONS.users },
];

export function SolutionsPage() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero badgeKey="solutions.badge" titleKey="solutions.title" descKey="solutions.desc" />

      <section className="bg-surface-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection className="grid gap-6 md:grid-cols-2">
            {SOLUTIONS.map((s, i) => (
              <motion.article key={s.id} id={s.id} variants={fadeInUp} className="flex scroll-mt-32 flex-col rounded-3xl border border-surface-300 bg-white p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${i % 2 === 0 ? "bg-sun-100 text-ink-900" : "bg-brand-50 text-brand-500"}`}>
                    <Icon path={s.icon} className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-ink-900">{t(`solutions.${s.id}.title`)}</h2>
                    <p className="mt-1 text-sm font-semibold text-brand-600">{t(`solutions.${s.id}.subtitle`)}</p>
                  </div>
                </div>

                <p className="mt-5 text-[16px] leading-relaxed text-ink-700">{t(`solutions.${s.id}.desc`)}</p>

                <ul className="mt-6 space-y-3">
                  {["f1", "f2", "f3", "f4"].map((f) => (
                    <CheckItem key={f}>{t(`solutions.${s.id}.${f}`)}</CheckItem>
                  ))}
                </ul>

                <div className="mt-8 flex-1" />
                <Link href="/contact" className="inline-flex min-h-[48px] items-center gap-2 self-start rounded-2xl border-2 border-brand-500 px-6 text-[15px] font-semibold text-brand-600 transition-all hover:bg-brand-50">
                  {t("solutions.talk")}
                  <Icon path={ICONS.arrow} className="h-4 w-4" />
                </Link>
              </motion.article>
            ))}
          </AnimatedSection>
        </div>
      </section>

      <CallToAction titleKey="solutions.cta.title" descKey="solutions.cta.desc" />
    </>
  );
}
