"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLanguage } from "./LanguageContext";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
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

const TESTIMONIALS = [
  {
    quoteKey: "testimonial.1.quote",
    nameKey: "testimonial.1.name",
    roleKey: "testimonial.1.role",
    avatar: "কা",
    avatarEn: "KH",
    rating: 5,
    color: "bg-brand-500",
  },
  {
    quoteKey: "testimonial.2.quote",
    nameKey: "testimonial.2.name",
    roleKey: "testimonial.2.role",
    avatar: "রা",
    avatarEn: "RA",
    rating: 5,
    color: "bg-emerald-500",
  },
  {
    quoteKey: "testimonial.3.quote",
    nameKey: "testimonial.3.name",
    roleKey: "testimonial.3.role",
    avatar: "ফা",
    avatarEn: "FB",
    rating: 5,
    color: "bg-violet-500",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`h-5 w-5 ${i < rating ? "text-yellow-400" : "text-gray-300"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  const { t, lang } = useLanguage();

  return (
    <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeInUp} className="mx-auto mb-14 max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-brand-500/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-400">
              {t("testimonials.badge")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("testimonials.title")}
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              {t("testimonials.desc")}
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <motion.div
                key={testimonial.nameKey}
                variants={fadeInUp}
                whileHover={{ y: -8 }}
                className="group relative overflow-hidden rounded-2xl bg-white/5 p-6 backdrop-blur transition-all hover:bg-white/10"
              >
                {/* Quote icon */}
                <div className="absolute right-4 top-4 opacity-10">
                  <svg className="h-16 w-16 text-brand-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                  </svg>
                </div>

                {/* Rating */}
                <div className="mb-4">
                  <StarRating rating={testimonial.rating} />
                </div>

                {/* Quote */}
                <p className="mb-6 text-[15px] leading-relaxed text-gray-300">
                  &ldquo;{t(testimonial.quoteKey)}&rdquo;
                </p>

                {/* Author */}
                <div className="mt-auto flex items-center gap-3 border-t border-white/10 pt-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${testimonial.color} text-lg font-bold text-white`}>
                    {lang === "bn" ? testimonial.avatar : testimonial.avatarEn}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{t(testimonial.nameKey)}</div>
                    <div className="text-sm text-gray-400">{t(testimonial.roleKey)}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
