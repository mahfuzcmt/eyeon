"use client";

import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
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

const FAQ_ITEMS = [
  { qKey: "faq.q1", aKey: "faq.a1" },
  { qKey: "faq.q2", aKey: "faq.a2" },
  { qKey: "faq.q3", aKey: "faq.a3" },
  { qKey: "faq.q4", aKey: "faq.a4" },
  { qKey: "faq.q5", aKey: "faq.a5" },
  { qKey: "faq.q6", aKey: "faq.a6" },
];

function FAQItem({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) {
  return (
    <motion.div
      variants={fadeInUp}
      className={`overflow-hidden rounded-xl border transition-all ${
        isOpen ? "border-brand-200 bg-brand-50/50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className={`text-[15px] font-semibold ${isOpen ? "text-brand-700" : "text-gray-900"}`}>
          {question}
        </span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
          isOpen ? "bg-brand-500 text-white rotate-180" : "bg-gray-100 text-gray-500"
        }`}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="border-t border-brand-100 px-5 pb-5 pt-4">
              <p className="text-[14px] leading-relaxed text-gray-600">{answer}</p>
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
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-700">
              {t("faq.badge")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("faq.title")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("faq.desc")}
            </p>
          </motion.div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <FAQItem
                key={item.qKey}
                question={t(item.qKey)}
                answer={t(item.aKey)}
                isOpen={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>

          {/* CTA below FAQ */}
          <motion.div variants={fadeInUp} className="mt-12 text-center">
            <p className="mb-4 text-gray-600">{t("faq.moreQuestions")}</p>
            <a
              href="tel:+8801999036999"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white shadow-lg shadow-brand-600/30 transition-all hover:bg-brand-700 hover:shadow-xl"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              {t("faq.callUs")}
            </a>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}
