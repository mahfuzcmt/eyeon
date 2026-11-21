"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EyeOnMark } from "@/components/brand/EyeOnLogo";
import { useLanguage } from "../LanguageContext";
import { AnimatedSection, CallToAction, CONTACT, Icon, ICONS, PageHero, WhatsAppIcon, fadeInUp, whatsappLink } from "../shared";

/*
 * EyeOn AI Watch (2026-11-21). The feature list is the owner's. There is no product photograph
 * yet, so the watch is drawn and labelled as an illustration, and there is no published price:
 * "Call for price" with the sales number and WhatsApp. Add a photo or a price only when the
 * owner supplies them.
 */
const FEATURES: { key: string; icon: string }[] = [
  { key: "f1", icon: ICONS.pin },
  { key: "f2", icon: ICONS.home },
  { key: "f3", icon: ICONS.school },
  { key: "f4", icon: ICONS.bell },
  { key: "f5", icon: ICONS.boundary },
  { key: "f6", icon: ICONS.arrow },
  { key: "f7", icon: ICONS.history },
  { key: "f8", icon: ICONS.sos },
  { key: "f9", icon: ICONS.phone },
  { key: "f10", icon: ICONS.heart },
];

function WatchIllustration() {
  const { t } = useLanguage();
  return (
    <div>
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sun-400/15" />
        <div aria-hidden="true" className="absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-brand-400/15" />
        {/* strap */}
        <div aria-hidden="true" className="absolute left-1/2 top-0 h-full w-[26%] -translate-x-1/2 bg-sun-400/90" />
        {/* watch body */}
        <motion.div
          aria-hidden="true"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="relative flex h-[46%] w-[40%] flex-col items-center justify-center gap-3 rounded-[2rem] border-[6px] border-ink-900 bg-white shadow-2xl"
        >
          <EyeOnMark size={44} color="#0F6B5C" />
          <div className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
            <Icon path={ICONS.pin} className="h-3.5 w-3.5" />
            LIVE
          </div>
        </motion.div>
      </div>
      <p className="mt-3 text-center text-xs text-ink-500">{t("watchPage.illustration")}</p>
    </div>
  );
}

/** "Call for price": the sales number and WhatsApp, with a message that names the watch. */
function PriceBox() {
  const { t } = useLanguage();
  return (
    <div className="rounded-3xl border-2 border-sun-400 bg-sun-50 p-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-ink-500">{t("watchPage.priceLabel")}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink-900">{t("watchPage.callForPrice")}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{t("watchPage.priceHint")}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={`tel:${CONTACT.phoneTel}`}
          className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 text-[16px] font-bold text-white shadow-lg shadow-black/10 transition-all hover:bg-brand-600"
        >
          <Icon path={ICONS.phone} className="h-5 w-5" />
          <span>
            {t("cta.call")} {CONTACT.phoneDisplay}
          </span>
        </a>
        <a
          href={whatsappLink(t("watchPage.whatsappMessage"))}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-brand-500 bg-white px-6 text-[16px] font-semibold text-brand-600 transition-all hover:bg-brand-50"
        >
          <WhatsAppIcon />
          {t("cta.whatsapp")}
        </a>
      </div>
    </div>
  );
}

export function WatchProductPage() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero badgeKey="watchPage.badge" titleKey="watchPage.title" descKey="watchPage.desc" />

      {/* Picture and price */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div variants={fadeInUp} className="mx-auto w-full max-w-md">
              <WatchIllustration />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <h2 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">{t("watchPage.title")}</h2>
              <p className="mt-3 text-lg leading-relaxed text-ink-700">{t("watchPage.desc")}</p>
              <div className="mt-8">
                <PriceBox />
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* Feature list */}
      <section className="bg-surface-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.h2 variants={fadeInUp} className="mb-12 text-center font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {t("watchPage.featuresTitle")}
            </motion.h2>
            <ol className="grid gap-5 md:grid-cols-2">
              {FEATURES.map((f, i) => (
                <motion.li key={f.key} variants={fadeInUp} className="flex items-start gap-4 rounded-3xl border border-surface-300 bg-white p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-100 text-ink-900">
                    <Icon path={f.icon} className="h-6 w-6" />
                  </div>
                  <p className="pt-2 text-[16px] leading-relaxed text-ink-900">
                    <span className="sr-only">{i + 1}. </span>
                    {t(`watchPage.${f.key}`)}
                  </p>
                </motion.li>
              ))}
            </ol>
          </AnimatedSection>
        </div>
      </section>

      {/* The app */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeInUp} className="flex flex-col items-start gap-6 rounded-3xl bg-brand-50 p-8 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-500">
                <Icon path={ICONS.app} className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-semibold text-ink-900">{t("watchPage.appTitle")}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{t("watchPage.appDesc")}</p>
              </div>
              <Link
                href="/app"
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 font-bold text-white hover:bg-brand-600"
              >
                {t("watchPage.getApp")}
                <Icon path={ICONS.arrow} className="h-4 w-4" />
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      <CallToAction />
    </>
  );
}
