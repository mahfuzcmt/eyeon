"use client";

import { useLocale } from "@/lib/i18n";

const STATS = [
  { value: "24/7", key: "mkt.stats.support", icon: "headset" },
  { value: "99.9%", key: "mkt.stats.uptime", icon: "signal" },
  { value: "5s", key: "mkt.stats.updateInterval", icon: "clock" },
  { value: "100%", key: "mkt.stats.local", icon: "map" },
] as const;

const icons = {
  headset: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
  signal: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  clock: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  map: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
};

export function StatsSection() {
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden border-y border-surface-200 bg-white py-16 md:py-20">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="stats-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stats-grid)" />
        </svg>
      </div>

      <div className="mkt-container relative">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {STATS.map((stat, index) => (
            <div
              key={stat.key}
              className="group relative text-center"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-100">
                {icons[stat.icon]}
              </div>

              {/* Value */}
              <div className="text-4xl font-extrabold tracking-tight text-ink-900 md:text-5xl" style={{ letterSpacing: "-0.02em" }}>
                <span className="bg-gradient-to-r from-brand-500 to-brand-600 bg-clip-text text-transparent">
                  {stat.value}
                </span>
              </div>

              {/* Label */}
              <div className="mt-2 text-sm font-medium text-ink-500 md:text-base">
                {t(stat.key)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
