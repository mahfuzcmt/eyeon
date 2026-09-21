"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "./LanguageContext";
import { AnimatedSection, CONTACT, Icon, ICONS, SectionBadge, fadeInUp } from "./shared";

// Questions parents and schools actually ask. Answers must stay free of figures
// we do not have (battery hours, accuracy in metres, prices).
const FAQ_ITEMS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ qKey: `faq.q${n}`, aKey: `faq.a${n}` }));

function FAQItem({ id, question, answer, isOpen, onClick }: { id: string; question: string; answer: string; isOpen: boolean; onClick: () => void }) {
  return (
    <motion.div
      variants={fadeInUp}
      className={`overflow-hidden rounded-2xl border transition-all ${isOpen ? "border-brand-200 bg-brand-50/60 shadow-md" : "border-surface-300 bg-white hover:border-surface-400"}`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
        className="flex min-h-[56px] w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className={`text-[16px] font-semibold ${isOpen ? "text-brand-600" : "text-ink-900"}`}>{question}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${isOpen ? "rotate-180 bg-brand-500 text-white" : "bg-surface-100 text-ink-500"}`}>
          <Icon path="M19 9l-7 7-7-7" className="h-5 w-5" />
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div id={`${id}-panel`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="border-t border-brand-100 px-5 pb-5 pt-4">
              <p className="text-[15px] leading-relaxed text-ink-700">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-surface-50 py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mb-12 text-center">
            <SectionBadge>{t("faq.badge")}</SectionBadge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("faq.title")}</h2>
            <p className="mt-4 text-lg text-ink-500">{t("faq.desc")}</p>
          </motion.div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <FAQItem
                key={item.qKey}
                id={`faq-${index}`}
                question={t(item.qKey)}
                answer={t(item.aKey)}
                isOpen={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>

          <motion.div variants={fadeInUp} className="mt-12 text-center">
            <p className="mb-4 text-ink-500">{t("faq.moreQuestions")}</p>
            <a
              href={`tel:${CONTACT.phoneTel}`}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-brand-500 px-6 font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600"
            >
              <Icon path={ICONS.phone} className="h-5 w-5" />
              {t("faq.callUs")} {CONTACT.phoneDisplay}
            </a>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}
