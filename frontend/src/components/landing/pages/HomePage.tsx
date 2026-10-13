"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "../LanguageContext";
import { WhyChooseSection } from "../WhyChooseSection";
import { TestimonialsSection } from "../TestimonialsSection";
import { FAQSection } from "../FAQSection";
import {
  AnimatedSection,
  CallToAction,
  ContactButtons,
  FEATURES,
  Icon,
  ICONS,
  SectionBadge,
  fadeInUp,
  staggerContainer,
} from "../shared";

/*
 * Schools that use EyeOn, shown as a "Schools using EyeOn" strip.
 *
 * This list must contain ONLY schools that have actually agreed, in writing, to be
 * listed on this website. Never add a school as a placeholder, a prospect, a pilot
 * that has not confirmed, or an example. While the list is empty the strip is not
 * rendered at all - that is the correct state for a new product.
 */
export const PARTNER_SCHOOLS: { name: string; city?: string }[] = [];

/* ── Hero ──────────────────────────────────────────────────────── */
function PhoneMock() {
  const { t } = useLanguage();
  const notifications = ["mock.n1", "mock.n2", "mock.n3"];

  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="rounded-[2.5rem] border-4 border-white/20 bg-brand-900/60 p-3 shadow-2xl backdrop-blur">
        <div className="overflow-hidden rounded-[2rem] bg-surface-100">
          {/* Stylised map with a safe zone - an illustration, not a screenshot */}
          <div className="relative h-44 bg-brand-50">
            <div aria-hidden="true" className="absolute left-0 right-0 top-16 h-3 -rotate-6 bg-white" />
            <div aria-hidden="true" className="absolute bottom-0 left-24 top-0 w-3 rotate-12 bg-white" />
            <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-brand-400 bg-brand-200/40" />
            <motion.div
              aria-hidden="true"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sun-400 text-ink-900 shadow-lg"
            >
              <Icon path={ICONS.pin} className="h-5 w-5" />
            </motion.div>
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-brand-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {t("mock.live")}
            </div>
            <div className="absolute bottom-3 left-3 rounded-full bg-brand-500 px-2.5 py-1 text-[12px] font-semibold text-white">{t("mock.safeZone")}</div>
          </div>

          {/* Notifications */}
          <div className="space-y-2 p-3">
            {notifications.map((key, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.25 }}
                className="rounded-2xl bg-white p-3 shadow-sm"
              >
                <div className="flex items-center justify-between text-[12px] font-semibold text-ink-500">
                  <span>EyeOn</span>
                  {i === 0 && <span>{t("mock.now")}</span>}
                </div>
                <div className="mt-1 text-[13px] font-medium leading-snug text-ink-900">{t(key)}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-brand-100">{t("mock.caption")}</p>
    </div>
  );
}

function Hero() {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800">
      <div aria-hidden="true" className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-sun-400/10" />
      <div aria-hidden="true" className="absolute -bottom-40 -left-24 h-[30rem] w-[30rem] rounded-full bg-brand-400/10" />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-36 sm:px-6 lg:pb-28 lg:pt-48">
        <div className="grid items-center gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeInUp}>
              <SectionBadge onDark>{t("hero.badge")}</SectionBadge>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t("hero.title1")}
              <span className="mt-2 block text-sun-400">{t("hero.title2")}</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="mt-6 max-w-xl text-lg leading-relaxed text-brand-50">
              {t("hero.desc")}
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-10">
              <ContactButtons onDark />
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-6">
              <a href="#how" className="inline-flex min-h-[44px] items-center gap-2 text-[15px] font-semibold text-sun-300 underline-offset-4 hover:underline">
                {t("hero.howItWorks")}
                <Icon path={ICONS.arrow} className="h-4 w-4" />
              </a>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
            <PhoneMock />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Product facts (no numbers we do not have) ─────────────────── */
function FactsBand() {
  const { t } = useLanguage();
  const facts = [
    { key: "facts.1", icon: ICONS.message },
    { key: "facts.2", icon: ICONS.app },
    { key: "facts.3", icon: ICONS.sos },
    { key: "facts.4", icon: ICONS.bell },
  ];

  return (
    <section className="bg-sun-400 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {facts.map((f) => (
            <li key={f.key} className="flex items-center justify-center gap-2.5 text-center text-ink-900">
              <Icon path={f.icon} className="h-5 w-5 shrink-0" />
              <span className="text-sm font-semibold">{t(f.key)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── The eight features ────────────────────────────────────────── */
function FeaturesSection() {
  const { t } = useLanguage();

  return (
    <section className="bg-surface-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mx-auto mb-14 max-w-3xl text-center">
            <SectionBadge>{t("features.badge")}</SectionBadge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("features.title")}</h2>
            <p className="mt-4 text-lg text-ink-500">{t("features.desc")}</p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.id}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                className="rounded-3xl border border-surface-300 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${i % 2 === 0 ? "bg-brand-50 text-brand-500" : "bg-sun-100 text-ink-900"}`}>
                  <Icon path={f.icon} className="h-7 w-7" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink-900">{t(`feature.${f.id}.title`)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{t(`feature.${f.id}.desc`)}</p>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="mt-12 text-center">
            <Link href="/features" className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-brand-500 px-8 text-[16px] font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600">
              {t("features.viewAll")}
              <Icon path={ICONS.arrow} className="h-5 w-5" />
            </Link>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── How it works ──────────────────────────────────────────────── */
function HowItWorksSection() {
  const { t, lang } = useLanguage();
  const steps = [
    { id: "step1", icon: ICONS.bag },
    { id: "step2", icon: ICONS.home },
    { id: "step3", icon: ICONS.bell },
  ];
  const numerals = lang === "bn" ? ["১", "২", "৩"] : ["1", "2", "3"];

  return (
    <section id="how" className="scroll-mt-32 bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mx-auto mb-14 max-w-3xl text-center">
            <SectionBadge>{t("how.badge")}</SectionBadge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("how.title")}</h2>
          </motion.div>

          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.li key={s.id} variants={fadeInUp} className="relative rounded-3xl bg-surface-50 p-8">
                <div className="mb-5 flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sun-400 font-display text-xl font-bold text-ink-900">{numerals[i]}</span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                    <Icon path={s.icon} className="h-6 w-6" />
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold text-ink-900">{t(`how.${s.id}.title`)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{t(`how.${s.id}.desc`)}</p>
              </motion.li>
            ))}
          </ol>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Built for schools and families (replaces the old client-logo wall) ── */
function AudienceSection() {
  const { t } = useLanguage();
  const audiences = [
    { id: "parents", icon: ICONS.heart },
    { id: "schools", icon: ICONS.school },
    { id: "coaching", icon: ICONS.book },
    { id: "madrasa", icon: ICONS.moon },
    { id: "daycare", icon: ICONS.smile },
    { id: "elderly", icon: ICONS.users },
  ];

  return (
    <section className="bg-surface-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mx-auto mb-14 max-w-3xl text-center">
            <SectionBadge>{t("audience.badge")}</SectionBadge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("audience.title")}</h2>
            <p className="mt-4 text-lg text-ink-500">{t("audience.desc")}</p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((a) => (
              <motion.div key={a.id} variants={fadeInUp} className="flex items-start gap-4 rounded-3xl border border-surface-300 bg-white p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-100 text-ink-900">
                  <Icon path={a.icon} className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink-900">{t(`audience.${a.id}.title`)}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{t(`audience.${a.id}.desc`)}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="mt-10 text-center">
            <Link href="/solutions" className="inline-flex min-h-[44px] items-center gap-2 text-[15px] font-semibold text-brand-600 underline-offset-4 hover:underline">
              {t("nav.solutions")}
              <Icon path={ICONS.arrow} className="h-4 w-4" />
            </Link>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Schools using EyeOn - rendered only when PARTNER_SCHOOLS is non-empty ── */
function PartnerSchoolsStrip() {
  const { t } = useLanguage();
  if (PARTNER_SCHOOLS.length === 0) return null;

  return (
    <section className="border-y border-surface-200 bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-ink-500">{t("partners.title")}</p>
        <ul className="flex flex-wrap items-center justify-center gap-3">
          {PARTNER_SCHOOLS.map((s) => (
            <li key={`${s.name}-${s.city ?? ""}`} className="rounded-full border border-surface-300 bg-surface-50 px-5 py-2 text-[15px] font-medium text-ink-700">
              {s.name}
              {s.city && <span className="text-ink-500"> · {s.city}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── What a school gets ────────────────────────────────────────── */
function SchoolDashboardMock() {
  const { t, lang } = useLanguage();
  const numerals = lang === "bn" ? ["১", "২", "৩", "৪"] : ["1", "2", "3", "4"];
  const rows = [true, true, false, true];

  return (
    <div>
      <div className="rounded-3xl border border-white/15 bg-white/5 p-3 shadow-2xl backdrop-blur">
        <div className="overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center gap-2 border-b border-surface-200 px-4 py-3 text-sm font-semibold text-ink-900">
            <Icon path={ICONS.monitor} className="h-4 w-4 text-brand-500" />
            {t("school.mock.title")}
          </div>
          <ul className="divide-y divide-surface-200">
            {rows.map((inSchool, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-3 text-[14px] font-medium text-ink-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                    <Icon path={ICONS.pin} className="h-4 w-4" />
                  </span>
                  {t("school.mock.student")} {numerals[i]}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inSchool ? "bg-brand-50 text-brand-600" : "bg-sun-100 text-ink-900"}`}>
                  {inSchool ? t("school.mock.inSchool") : t("school.mock.onTheWay")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-brand-100">{t("school.mock.caption")}</p>
    </div>
  );
}

function SchoolsSection() {
  const { t } = useLanguage();
  const points = [
    { id: "s1", icon: ICONS.monitor },
    { id: "s2", icon: ICONS.eye },
    { id: "s3", icon: ICONS.bell },
    { id: "s4", icon: ICONS.sos },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 py-20">
      <div aria-hidden="true" className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-sun-400/10" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <motion.div variants={fadeInUp}>
                <SectionBadge onDark>{t("school.badge")}</SectionBadge>
                <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{t("school.title")}</h2>
                <p className="mt-4 text-lg leading-relaxed text-brand-50">{t("school.desc")}</p>
              </motion.div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {points.map((p) => (
                  <motion.div key={p.id} variants={fadeInUp} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sun-400 text-ink-900">
                      <Icon path={p.icon} className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-[17px] font-semibold text-white">{t(`school.${p.id}.title`)}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-brand-50">{t(`school.${p.id}.desc`)}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={fadeInUp} className="mt-8">
                <Link href="/contact" className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-sun-400 px-7 text-[16px] font-bold text-ink-900 transition-all hover:bg-sun-300">
                  {t("school.cta")}
                  <Icon path={ICONS.arrow} className="h-5 w-5" />
                </Link>
              </motion.div>
            </div>

            <motion.div variants={fadeInUp}>
              <SchoolDashboardMock />
            </motion.div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
export function HomePage() {
  return (
    <>
      <Hero />
      <FactsBand />
      <FeaturesSection />
      <HowItWorksSection />
      <AudienceSection />
      <PartnerSchoolsStrip />
      <SchoolsSection />
      <WhyChooseSection />
      {/* Renders nothing until TestimonialsSection.tsx contains a real, attributable quote. */}
      <TestimonialsSection />
      <FAQSection />
      <CallToAction />
    </>
  );
}
