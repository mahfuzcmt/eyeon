"use client";

import Link from "next/link";
import { useState } from "react";

/* ────────────────────────────────────────────────────────────────
   EyeOn GPS — public marketing landing page.
   ──────────────────────────────────────────────────────────────── */

const CONTACT = {
  hotline: "+880 1999-036999",
  email: "hello@eyeongps.com",
  address: "Dhaka, Bangladesh",
};

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
  { label: "Mobile App", href: "#app" },
  { label: "Contact", href: "#contact" },
];

/* ── Small building blocks ─────────────────────────────────────── */

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* Triangle Icon */}
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="drop-shadow-lg">
        <defs>
          <linearGradient id="logoTriGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="50%" stopColor="#1E5799" />
            <stop offset="100%" stopColor="#0A1F44" />
          </linearGradient>
        </defs>
        <path
          d="M24 6L42 40C42 42 40 44 38 44H10C8 44 6 42 6 40L24 6Z"
          fill="url(#logoTriGrad)"
        />
        {/* Motion waves */}
        <path d="M12 34C15 31 20 29 25 33" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M16 28C19 25 24 24 29 27" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Signal dots */}
        <circle cx="14" cy="37" r="2" fill="white" opacity="0.9" />
        <circle cx="21" cy="34" r="1.5" fill="white" opacity="0.9" />
        <circle cx="28" cy="31" r="1.5" fill="white" opacity="0.9" />
      </svg>
      {/* Text */}
      <div>
        <div className={`font-display text-xl font-extrabold leading-tight tracking-tight ${dark ? "text-white" : "text-[#0A2540]"}`}>
          EyeOn
        </div>
        <div className="text-[12px] font-semibold uppercase tracking-widest text-brand-400">GPS Tracking</div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-500">{eyebrow}</div>
      <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-[16px] leading-relaxed text-ink-600">{subtitle}</p>}
    </div>
  );
}

function Icon({ path, className = "h-6 w-6" }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

/* Lucide-style icon paths */
const ICONS = {
  map: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  replay: "M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2",
  fence: "M12 22s7-7.75 7-13a7 7 0 10-14 0c0 5.25 7 13 7 13zM12 12a3 3 0 100-6 3 3 0 000 6z",
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  report: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  gauge: "M12 15l3.5-5.5M8 21h8M3 15a9 9 0 1118 0",
} as const;

/* ── Sections ──────────────────────────────────────────────────── */

function TopBar() {
  return (
    <div className="bg-brand-900 text-[13px] text-brand-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
        <div className="flex items-center gap-5">
          <a href={`tel:${CONTACT.hotline.replace(/[^+\d]/g, "")}`} className="flex items-center gap-1.5 hover:text-white">
            <Icon path="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" className="h-3.5 w-3.5" />
            <span>Hotline: {CONTACT.hotline}</span>
          </a>
          <a href={`mailto:${CONTACT.email}`} className="hidden items-center gap-1.5 hover:text-white sm:flex">
            <Icon path="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" className="h-3.5 w-3.5" />
            <span>{CONTACT.email}</span>
          </a>
        </div>
        <div className="flex items-center gap-1.5 text-brand-100/70">
          <span className="hidden sm:inline">Made in Bangladesh</span>
          <span aria-hidden>🇧🇩</span>
        </div>
      </div>
    </div>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-surface-300 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="EyeOn GPS home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[14px] font-semibold text-ink-700 transition hover:text-brand-500">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-md border border-surface-300 px-5 text-[14px] font-semibold text-ink-900 transition hover:border-brand-500 hover:text-brand-500"
          >
            Sign In
          </Link>
          <a
            href="#contact"
            className="inline-flex h-10 items-center rounded-md bg-brand-500 px-5 text-[14px] font-semibold text-white transition hover:bg-brand-600"
          >
            Contact Sales
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-700 lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <Icon path="M18 6L6 18M6 6l12 12" />
          ) : (
            <Icon path="M3 6h18M3 12h18M3 18h18" />
          )}
        </button>
      </div>

      {open && (
        <nav className="border-t border-surface-200 bg-white px-4 py-4 lg:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-[15px] font-semibold text-ink-800 hover:bg-surface-100"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex gap-3">
              <Link
                href="/login"
                className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-surface-300 text-[14px] font-semibold text-ink-900"
              >
                Sign In
              </Link>
              <a
                href="#contact"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-brand-500 text-[14px] font-semibold text-white"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-[#134472] to-brand-700">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
        style={{ backgroundImage: "url('/login-bg.svg')" }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-900/80 via-brand-900/20 to-brand-700/50" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold text-brand-50">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
            </span>
            Live vehicle tracking, built in Bangladesh
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Know where every vehicle is.
            <span className="block text-[#9CD2FF]">Every second.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-brand-100">
            EyeOn GPS is a complete vehicle tracking platform for bikes, cars, and fleets —
            real-time location, route replay, geofence alerts, remote engine lock, and reports,
            with a Bengali-first dashboard and mobile app.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#contact"
              className="inline-flex h-12 items-center rounded-md bg-brand-500 px-8 text-[16px] font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
            >
              Get Started
            </a>
            <Link
              href="/login"
              className="inline-flex h-12 items-center rounded-md border border-white/25 px-8 text-[16px] font-semibold text-white transition hover:border-white/60 hover:bg-white/5"
            >
              Sign In to Dashboard
            </Link>
          </div>

          <dl className="mt-14 grid max-w-xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[
              { value: "24/7", label: "Live monitoring" },
              { value: "90 days", label: "Route history" },
              { value: "বাংলা + EN", label: "Full Bengali UI" },
            ].map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-2xl font-bold text-white">{s.value}</dd>
                <dd className="mt-1 text-xs text-brand-100/70">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: ICONS.map,
    title: "Real-Time Tracking",
    desc: "Watch every vehicle move live on the map, with speed, direction, and ignition status updating in seconds.",
  },
  {
    icon: ICONS.replay,
    title: "Route Replay",
    desc: "Rewind any day and replay the exact route a vehicle travelled, stop by stop, with speed at every point.",
  },
  {
    icon: ICONS.fence,
    title: "Geofence Alerts",
    desc: "Draw zones around garages, depots, or schools and get instant alerts when a vehicle enters or leaves.",
  },
  {
    icon: ICONS.lock,
    title: "Remote Engine Lock",
    desc: "Stolen bike? Cut the fuel line remotely from the dashboard or app and immobilize the vehicle safely.",
  },
  {
    icon: ICONS.bell,
    title: "Instant Alarms",
    desc: "SOS, power cut, vibration, overspeed, and low battery alarms — pushed to SMS, app, and dashboard.",
  },
  {
    icon: ICONS.gauge,
    title: "Driver Behavior",
    desc: "Overspeed events, harsh acceleration, and idle time per vehicle help you coach drivers and cut costs.",
  },
  {
    icon: ICONS.report,
    title: "Reports & Statistics",
    desc: "Daily mileage, parking time, trip summaries, and monthly fleet reports in PDF or Excel.",
  },
  {
    icon: ICONS.bolt,
    title: "bKash & Nagad Billing",
    desc: "Renew your subscription in seconds with mobile payments — no bank visit, no paperwork.",
  },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Platform Features"
          title="Everything a fleet needs, in one place"
          subtitle="From a single motorbike to a corporate fleet of hundreds — the same platform scales with you."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-lg border border-surface-300 bg-white p-6 transition hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-500 transition group-hover:bg-brand-500 group-hover:text-white">
                <Icon path={f.icon} />
              </div>
              <h3 className="text-[16px] font-bold text-ink-950">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SOLUTIONS = [
  { emoji: "🏍️", title: "Motorbike Anti-Theft", desc: "Live location, vibration alarm, and remote engine lock protect the most-stolen vehicle type in Dhaka." },
  { emoji: "🛵", title: "Ride-Sharing & Delivery", desc: "Track rider fleets in real time and verify trips for Pathao, Foodpanda, and courier partners." },
  { emoji: "🚕", title: "CNG & Taxi Operators", desc: "Know where every unit is, monitor daily mileage, and stop unauthorized trips." },
  { emoji: "🚌", title: "School & Staff Transport", desc: "Geofence the route and let parents and admins know the van arrived safely." },
  { emoji: "🚚", title: "Logistics & Trucking", desc: "Route history, fuel-line control, and driver behavior reports for long-haul fleets." },
  { emoji: "🏢", title: "Corporate Fleets", desc: "Multi-user access, role-based permissions, audit logs, and custom reports for your operations team." },
];

function Solutions() {
  return (
    <section id="solutions" className="scroll-mt-20 bg-surface-100 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Solutions"
          title="Built for how Bangladesh moves"
          subtitle="One platform, tuned for the vehicles and businesses on our roads."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s) => (
            <div key={s.title} className="rounded-lg border border-surface-300 bg-white p-6 transition hover:border-brand-400 hover:shadow-md">
              <div className="mb-3 text-3xl" aria-hidden>{s.emoji}</div>
              <h3 className="text-[16px] font-bold text-ink-950">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  {
    name: "Basic",
    price: "৳200",
    highlight: false,
    tagline: "For individual owners",
    features: ["Real-time live tracking", "90-day route history & replay", "Mobile app (Android & iOS)", "Ignition & power-cut alarms", "bKash / Nagad renewal"],
  },
  {
    name: "Pro",
    price: "৳350",
    highlight: true,
    tagline: "For small fleets",
    features: ["Everything in Basic", "Geofence zones & alerts", "Remote engine lock (fuel cut)", "Overspeed & driver behavior alerts", "Daily & monthly PDF/Excel reports"],
  },
  {
    name: "Enterprise",
    price: "৳500",
    highlight: false,
    tagline: "For corporate operations",
    features: ["Everything in Pro", "Multi-user team access & roles", "API access & integrations", "Custom reports & SLA support", "Dedicated account manager"],
  },
];

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple monthly pricing, per vehicle"
          subtitle="GPS device with professional installation from ৳3,000 one-time. Subscription covers the platform, SIM data support, and alerts."
        />
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-xl border p-8 ${
                p.highlight ? "border-brand-500 shadow-xl shadow-brand-500/10" : "border-surface-300"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-4 py-1 text-[12px] font-bold uppercase tracking-wide text-white">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold text-ink-950">{p.name}</h3>
              <p className="mt-1 text-[13px] text-ink-500">{p.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-ink-950">{p.price}</span>
                <span className="text-[14px] text-ink-500">/ vehicle / month</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink-700">
                    <Icon path="M20 6L9 17l-5-5" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-md text-[15px] font-semibold transition ${
                  p.highlight
                    ? "bg-brand-500 text-white hover:bg-brand-600"
                    : "border border-surface-300 text-ink-900 hover:border-brand-500 hover:text-brand-500"
                }`}
              >
                Choose {p.name}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsBand() {
  return (
    <section className="bg-gradient-to-r from-brand-900 to-brand-700 py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 text-center sm:px-6 lg:grid-cols-4">
        {[
          { value: "Real-time", label: "Second-by-second updates" },
          { value: "24/7", label: "Alarm monitoring" },
          { value: "বাংলা", label: "Bengali-first support" },
          { value: "Own stack", label: "No white-label middleman" },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-3xl font-bold text-white">{s.value}</div>
            <div className="mt-2 text-[14px] text-brand-100/80">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AppPromo() {
  return (
    <section id="app" className="scroll-mt-20 bg-surface-100 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-500">Mobile App</div>
            <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              Your fleet, in your pocket
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
              The EyeOn app for Android and iOS gives you live tracking, trip history with a calendar
              view, vehicle statistics, geofences, and instant push notifications for SOS and power-cut
              alarms — in Bengali or English.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Live map with all your vehicles",
                "Trip history & route playback",
                "Push alerts for SOS, theft & power cut",
                "One-tap engine lock & unlock",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[15px] text-ink-700">
                  <Icon path="M20 6L9 17l-5-5" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#contact" className="inline-flex h-11 items-center gap-2 rounded-md bg-brand-900 px-5 text-[14px] font-semibold text-white transition hover:bg-brand-700">
                <Icon path="M5 3l14 9-14 9V3z" className="h-4 w-4" />
                Get it for Android
              </a>
              <a href="#contact" className="inline-flex h-11 items-center gap-2 rounded-md bg-brand-900 px-5 text-[14px] font-semibold text-white transition hover:bg-brand-700">
                <Icon path="M12 2a4 4 0 014 4M8 22c-3 0-5-6-5-10a6 6 0 0111-3.3A6 6 0 0121 12c0 4-2 10-5 10-1.5 0-2-.8-4-.8s-2.5.8-4 .8z" className="h-4 w-4" />
                Get it for iOS
              </a>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center">
            <div className="relative h-[480px] w-[240px] rounded-[36px] border-8 border-ink-950 bg-brand-900 shadow-2xl">
              <div className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-ink-700" />
              <div
                className="absolute inset-3 top-6 overflow-hidden rounded-[22px] bg-cover bg-center"
                style={{ backgroundImage: "url('/login-bg.svg')" }}
              >
                <div className="absolute inset-x-0 top-0 bg-white/95 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                      <defs>
                        <linearGradient id="phoneTriGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#00D4FF" />
                          <stop offset="50%" stopColor="#1E5799" />
                          <stop offset="100%" stopColor="#0A1F44" />
                        </linearGradient>
                      </defs>
                      <path d="M24 6L42 40C42 42 40 44 38 44H10C8 44 6 42 6 40L24 6Z" fill="url(#phoneTriGrad)" />
                      <path d="M12 34C15 31 20 29 25 33" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                      <circle cx="14" cy="37" r="2" fill="white" />
                      <circle cx="21" cy="34" r="1.5" fill="white" />
                    </svg>
                    <span className="text-[12px] font-extrabold text-[#0A2540]">EyeOn</span>
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/95 p-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-ink-950">Dhaka Metro-LA 25-1234</span>
                    <span className="rounded-full bg-status-moving/15 px-2 py-0.5 text-[9px] font-bold text-status-moving">Moving</span>
                  </div>
                  <div className="mt-1.5 text-[9px] text-ink-500">42 km/h · Ignition on · 12.4 V</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Why EyeOn"
          title="A platform we build, not one we rent"
          subtitle="Most local GPS brands resell a foreign white-label platform. EyeOn owns its entire stack — server, dashboard, and apps — so features ship for Bangladesh first."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Bengali-first, always",
              desc: "Dashboard, app, SMS alerts, and support in বাংলা — not a translated afterthought.",
            },
            {
              title: "Local payments built in",
              desc: "bKash and Nagad subscription renewal is native to the platform, not a manual workaround.",
            },
            {
              title: "Direct support & installation",
              desc: "Our own technicians install and configure your tracker, and our team answers the hotline.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-lg border border-surface-300 p-6">
              <h3 className="text-[16px] font-bold text-ink-950">{c.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="scroll-mt-20 bg-gradient-to-br from-brand-900 to-brand-700 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-100">Contact Sales</div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Start tracking this week
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-brand-100">
              Call us or drop an email — we&apos;ll help you pick the right tracker, install it,
              and get your vehicles on the map.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Sales & Support Hotline", value: CONTACT.hotline, href: `tel:${CONTACT.hotline.replace(/[^+\d]/g, "")}` },
              { label: "Email", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
              { label: "Office", value: CONTACT.address, href: undefined },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-white/10 bg-white/5 p-5">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-brand-100/70">{c.label}</div>
                {c.href ? (
                  <a href={c.href} className="mt-1 block text-[16px] font-semibold text-white hover:text-brand-100">
                    {c.value}
                  </a>
                ) : (
                  <div className="mt-1 text-[16px] font-semibold text-white">{c.value}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0B2A49] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo dark />
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-brand-100/70">
              EyeOn GPS — vehicle tracking platform by Web Innovation. Real-time tracking,
              geofencing, engine lock, and fleet reports for Bangladesh.
            </p>
          </div>
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-wide text-brand-100">Platform</h4>
            <ul className="mt-4 space-y-2.5 text-[14px] text-brand-100/70">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-white">{l.label}</a>
                </li>
              ))}
              <li>
                <Link href="/login" className="hover:text-white">Sign In</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-wide text-brand-100">Contact</h4>
            <ul className="mt-4 space-y-2.5 text-[14px] text-brand-100/70">
              <li>{CONTACT.hotline}</li>
              <li>
                <a href={`mailto:${CONTACT.email}`} className="hover:text-white">{CONTACT.email}</a>
              </li>
              <li>{CONTACT.address}</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-[13px] text-brand-100/60 sm:flex-row">
          <span>© {new Date().getFullYear()} EyeOn GPS · Web Innovation. All rights reserved.</span>
          <span>Dhaka, Bangladesh 🇧🇩</span>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="bg-white font-sans text-ink-900 antialiased">
      <TopBar />
      <Nav />
      <main>
        <Hero />
        <Features />
        <Solutions />
        <Pricing />
        <StatsBand />
        <AppPromo />
        <WhyUs />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
