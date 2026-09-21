"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";

export function CTASection() {
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0A1928] via-[#0E3257] to-[#0A1928] py-24 md:py-32">
      {/* Background effects */}
      <div className="absolute inset-0">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="cta-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-grid)" />
          </svg>
        </div>

        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-500/20 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent-teal/15 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-600/10 blur-[120px]" />
      </div>

      <div className="mkt-container relative text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur-sm">
          <span className="flex h-2 w-2 items-center justify-center">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-accent-teal opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-accent-teal" />
          </span>
          <span className="text-sm font-medium text-slate-300">
            Start tracking today
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl" style={{ letterSpacing: "-0.02em" }}>
          {t("mkt.cta.ready.title")}
        </h2>

        {/* Description */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400" style={{ lineHeight: "1.7" }}>
          {t("mkt.cta.ready.desc")}
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
          <Link href="/contact">
            <button className="group relative inline-flex items-center justify-center gap-3 rounded-mkt-lg bg-gradient-to-r from-brand-500 to-brand-600 px-8 py-4 text-base font-semibold text-white shadow-mkt-lg shadow-brand-500/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-mkt-xl hover:shadow-brand-500/30">
              {t("mkt.nav.getStarted")}
              <svg className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </Link>
          <Link href="/pricing">
            <button className="group relative inline-flex items-center justify-center gap-3 rounded-mkt-lg border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/10">
              {t("mkt.nav.pricing")}
            </button>
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-accent-teal" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            No setup fees
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-accent-teal" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cancel anytime
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-accent-teal" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            24/7 support
          </div>
        </div>
      </div>
    </section>
  );
}
