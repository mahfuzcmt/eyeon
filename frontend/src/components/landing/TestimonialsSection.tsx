"use client";

import { motion } from "framer-motion";
import { useLanguage } from "./LanguageContext";
import { AnimatedSection, SectionBadge, fadeInUp } from "./shared";

interface Testimonial {
  quote: { en: string; bn: string };
  name: { en: string; bn: string };
  /** Who they are, e.g. "Parent, Mirpur" or "Principal, <school name>". */
  role: { en: string; bn: string };
}

/*
 * ONLY REAL, ATTRIBUTABLE QUOTES MAY BE ADDED HERE.
 *
 * Every entry must be something a real EyeOn customer actually said, from a person
 * (or school) who has agreed to be quoted by name on this website. Never write
 * placeholder, "sample" or invented testimonials, and never add star ratings that
 * nobody gave. EyeOn is a new product, so this list is empty and the whole section
 * renders nothing until a real quote exists.
 */
const TESTIMONIALS: Testimonial[] = [];

export function TestimonialsSection() {
  const { t, lang } = useLanguage();

  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mx-auto mb-14 max-w-3xl text-center">
            <SectionBadge>{t("testimonials.badge")}</SectionBadge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("testimonials.title")}</h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <motion.figure key={item.name.en} variants={fadeInUp} className="rounded-3xl border border-surface-300 bg-surface-50 p-8">
                <blockquote className="text-[16px] leading-relaxed text-ink-700">&ldquo;{item.quote[lang]}&rdquo;</blockquote>
                <figcaption className="mt-6">
                  <div className="font-semibold text-ink-900">{item.name[lang]}</div>
                  <div className="text-sm text-ink-500">{item.role[lang]}</div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
