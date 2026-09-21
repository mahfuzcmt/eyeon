"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";

export function Hero() {
  const { t } = useLocale();

  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-b from-[#0A1928] via-[#0E3257] to-[#0A1928]">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gradient orbs */}
        <div className="absolute top-0 -right-1/4 h-[600px] w-[600px] rounded-full bg-brand-500/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[500px] w-[500px] rounded-full bg-accent-teal/15 blur-[100px] animate-pulse-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-brand-600/10 blur-[80px]" />
      </div>

      <div className="relative mkt-container flex min-h-[90vh] flex-col items-center justify-center py-20 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          {/* Trust badge */}
          <div className="mb-8 inline-flex animate-fade-in items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 backdrop-blur-sm">
            <span className="flex h-2 w-2 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-accent-teal opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-accent-teal" />
            </span>
            <span className="text-sm font-medium text-slate-300">
              {t("mkt.hero.badge")}
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-slide-up text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl" style={{ letterSpacing: "-0.03em" }}>
            {t("mkt.hero.headline.part1")}
            <span className="relative">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-accent-teal to-brand-400 animate-gradient" style={{ backgroundSize: "200% auto" }}>
                {" "}{t("mkt.hero.headline.highlight")}
              </span>
            </span>
            {t("mkt.hero.headline.part2")}
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-8 max-w-2xl animate-slide-up text-lg text-slate-400 md:text-xl" style={{ animationDelay: "0.1s", lineHeight: "1.7" }}>
            {t("mkt.hero.subheadline")}
          </p>

          {/* CTAs */}
          <div className="mt-12 flex animate-slide-up flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5" style={{ animationDelay: "0.2s" }}>
            <Link href="/contact">
              <button className="group relative inline-flex items-center justify-center gap-3 rounded-mkt-lg bg-gradient-to-r from-brand-500 to-brand-600 px-8 py-4 text-base font-semibold text-white shadow-mkt-lg shadow-brand-500/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-mkt-xl hover:shadow-brand-500/30">
                <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {t("mkt.hero.cta.primary")}
                <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </Link>
            <Link href="/features">
              <button className="group relative inline-flex items-center justify-center gap-3 rounded-mkt-lg border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/10">
                <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                {t("mkt.hero.cta.secondary")}
              </button>
            </Link>
          </div>

          {/* Quick stats row */}
          <div className="mt-16 flex animate-slide-up flex-wrap items-center justify-center gap-8 border-t border-white/10 pt-10 md:gap-12" style={{ animationDelay: "0.3s" }}>
            <div className="text-center">
              <div className="text-2xl font-bold text-white md:text-3xl">5s</div>
              <div className="mt-1 text-sm text-slate-400">Update Interval</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white md:text-3xl">99.9%</div>
              <div className="mt-1 text-sm text-slate-400">Uptime</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white md:text-3xl">24/7</div>
              <div className="mt-1 text-sm text-slate-400">Support</div>
            </div>
            <div className="h-8 w-px bg-white/10 hidden sm:block" />
            <div className="text-center hidden sm:block">
              <div className="text-2xl font-bold text-white md:text-3xl">100%</div>
              <div className="mt-1 text-sm text-slate-400">Bangladesh Made</div>
            </div>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="relative mt-16 w-full max-w-5xl animate-slide-up lg:mt-20" style={{ animationDelay: "0.4s" }}>
          <div className="relative overflow-hidden rounded-mkt-xl border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur-sm">
            {/* Browser chrome */}
            <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-white/5 px-4">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <div className="h-3 w-3 rounded-full bg-green-400/80" />
              </div>
              <div className="mx-auto flex items-center gap-2 rounded-md bg-white/5 px-4 py-1">
                <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-slate-400">app.eyeongps.com</span>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="aspect-[16/9] bg-gradient-to-br from-[#0A1928] to-[#0E3257] p-4">
              <div className="grid h-full grid-cols-12 gap-3">
                {/* Sidebar */}
                <div className="col-span-2 rounded-lg bg-white/5 p-3">
                  <div className="mb-4 h-6 w-16 rounded bg-brand-500/30" />
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-2 ${i === 1 ? "bg-brand-500/30" : "bg-transparent"}`}>
                        <div className="h-4 w-4 rounded bg-white/20" />
                        <div className="h-2 w-12 rounded bg-white/20" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Map area */}
                <div className="col-span-7 relative overflow-hidden rounded-lg bg-[#0E1F2F]">
                  {/* Fake roads */}
                  <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                    <line x1="10%" y1="30%" x2="90%" y2="30%" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    <line x1="20%" y1="60%" x2="80%" y2="70%" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
                    <line x1="30%" y1="20%" x2="30%" y2="80%" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
                  </svg>

                  {/* Vehicle markers with pulse animation */}
                  <div className="absolute top-[25%] left-[35%] flex h-4 w-4 items-center justify-center">
                    <span className="absolute h-4 w-4 animate-ping rounded-full bg-status-moving opacity-75" />
                    <span className="relative h-3 w-3 rounded-full bg-status-moving shadow-lg shadow-status-moving/50" />
                  </div>
                  <div className="absolute top-[45%] left-[55%] flex h-4 w-4 items-center justify-center">
                    <span className="absolute h-4 w-4 animate-ping rounded-full bg-status-moving opacity-75" style={{ animationDelay: "0.5s" }} />
                    <span className="relative h-3 w-3 rounded-full bg-status-moving shadow-lg shadow-status-moving/50" />
                  </div>
                  <div className="absolute top-[65%] left-[25%] h-3 w-3 rounded-full bg-status-idle shadow-lg shadow-status-idle/50" />
                  <div className="absolute top-[35%] right-[25%] h-3 w-3 rounded-full bg-status-stopped shadow-lg shadow-status-stopped/50" />

                  {/* Zoom controls */}
                  <div className="absolute bottom-3 right-3 flex flex-col rounded-md bg-white/10 backdrop-blur-sm">
                    <button className="px-2 py-1 text-white/60 hover:text-white text-sm">+</button>
                    <div className="h-px bg-white/10" />
                    <button className="px-2 py-1 text-white/60 hover:text-white text-sm">−</button>
                  </div>
                </div>

                {/* Vehicle list panel */}
                <div className="col-span-3 rounded-lg bg-white/5 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="h-3 w-16 rounded bg-white/30" />
                    <div className="h-4 w-4 rounded bg-white/10" />
                  </div>
                  <div className="space-y-2">
                    {[
                      { color: "bg-status-moving", speed: "45 km/h" },
                      { color: "bg-status-moving", speed: "32 km/h" },
                      { color: "bg-status-idle", speed: "Idle" },
                      { color: "bg-status-stopped", speed: "Stopped" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-md bg-white/5 p-2.5">
                        <div className={`h-8 w-8 rounded-md ${item.color}/20 flex items-center justify-center`}>
                          <div className={`h-2 w-2 rounded-full ${item.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="h-2 w-20 rounded bg-white/30" />
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 w-12 rounded bg-white/15" />
                            <span className="text-[8px] text-slate-400">{item.speed}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Glow effect */}
          <div className="absolute -inset-8 -z-10 rounded-3xl bg-brand-500/15 blur-3xl" />
          <div className="absolute -inset-16 -z-20 rounded-3xl bg-accent-teal/10 blur-[80px]" />
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
