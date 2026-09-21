"use client";

import { useLocale, type StringKey } from "@/lib/i18n";

interface FeatureCardProps {
  icon: React.ReactNode;
  titleKey: StringKey;
  descKey: StringKey;
}

export function FeatureCard({ icon, titleKey, descKey }: FeatureCardProps) {
  const { t } = useLocale();

  return (
    <div className="group relative rounded-mkt-lg border border-surface-200/80 bg-white p-7 transition-all duration-300 hover:border-brand-100 hover:-translate-y-1 md:p-8" style={{ boxShadow: "0 4px 24px -4px rgba(0,0,0,0.06)" }}>
      {/* Hover glow */}
      <div className="absolute inset-0 -z-10 rounded-mkt-lg bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-mkt bg-gradient-to-br from-brand-50 to-brand-100 text-brand-500 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-brand-500/10">
        {icon}
      </div>

      {/* Title */}
      <h3 className="mt-5 text-lg font-semibold text-ink-900 transition-colors duration-200 group-hover:text-brand-600">
        {t(titleKey)}
      </h3>

      {/* Description */}
      <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
        {t(descKey)}
      </p>

      {/* Learn more link */}
      <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-brand-500 opacity-0 transition-all duration-300 group-hover:opacity-100">
        <span>Learn more</span>
        <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </div>
  );
}
