"use client";

import { useLocale } from "@/lib/i18n";
import { FeatureCard } from "./FeatureCard";

const FEATURES = [
  {
    titleKey: "mkt.features.realtime.title" as const,
    descKey: "mkt.features.realtime.desc" as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    titleKey: "mkt.features.history.title" as const,
    descKey: "mkt.features.history.desc" as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    titleKey: "mkt.features.geofence.title" as const,
    descKey: "mkt.features.geofence.desc" as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    titleKey: "mkt.features.speed.title" as const,
    descKey: "mkt.features.speed.desc" as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    titleKey: "mkt.features.ignition.title" as const,
    descKey: "mkt.features.ignition.desc" as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
      </svg>
    ),
  },
  {
    titleKey: "mkt.features.mobile.title" as const,
    descKey: "mkt.features.mobile.desc" as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
];

export function FeatureGrid() {
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden bg-surface-50 py-24 md:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-accent-teal/5 blur-3xl" />
      </div>

      <div className="mkt-container">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            Features
          </div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-ink-900 md:text-4xl lg:text-5xl" style={{ letterSpacing: "-0.02em" }}>
            {t("mkt.features.title")}
          </h2>
          <p className="mt-5 text-lg text-ink-500" style={{ lineHeight: "1.7" }}>
            {t("mkt.features.subtitle")}
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3 md:mt-20">
          {FEATURES.map((feature) => (
            <FeatureCard
              key={feature.titleKey}
              icon={feature.icon}
              titleKey={feature.titleKey}
              descKey={feature.descKey}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center md:mt-20">
          <a
            href="/features"
            className="group inline-flex items-center gap-2 text-brand-500 font-semibold hover:text-brand-600 transition-colors"
          >
            See all features
            <svg className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
