"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";

/* ────────────────────────────────────────────────────────────────
   EyeOn GPS — Professional light-theme landing page.
   Clean white backgrounds with teal accents.
   ──────────────────────────────────────────────────────────────── */

const CONTACT = {
  hotline: "+880 1999-036999",
  sales: "+880 1999-036999",
  email: "hello@eyeongps.com",
  address: "House 12, Road 5, Dhanmondi, Dhaka 1205",
};

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Features", href: "#features" },
  { label: "Products", href: "#products" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

/* ── Animation Variants ─────────────────────────────────────────── */

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

/* ── Animated Section Wrapper ─────────────────────────────────── */

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? "visible" : "hidden"} variants={staggerContainer} className={className}>
      {children}
    </motion.div>
  );
}

/* ── Small building blocks ─────────────────────────────────────── */

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <motion.div className="flex items-center gap-2.5" whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400 }}>
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="drop-shadow-sm">
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <path d="M24 6L42 40C42 42 40 44 38 44H10C8 44 6 42 6 40L24 6Z" fill="url(#logoGrad)" />
        <path d="M12 34C15 31 20 29 25 33" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M16 28C19 25 24 24 29 27" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
        <circle cx="14" cy="37" r="2" fill="white" opacity="0.9" />
        <circle cx="21" cy="34" r="1.5" fill="white" opacity="0.8" />
        <circle cx="28" cy="31" r="1.5" fill="white" opacity="0.7" />
      </svg>
      <div>
        <div className={`text-xl font-extrabold leading-tight tracking-tight ${dark ? "text-gray-900" : "text-white"}`}>EyeOn</div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-teal-600">GPS Tracking</div>
      </div>
    </motion.div>
  );
}

function SectionHeading({ eyebrow, title, subtitle, light = false }: { eyebrow: string; title: string; subtitle?: string; light?: boolean }) {
  return (
    <motion.div variants={fadeInUp} className="mx-auto mb-14 max-w-3xl text-center">
      <motion.div variants={fadeIn} className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-teal-700">
        {eyebrow}
      </motion.div>
      <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl ${light ? "text-white" : "text-gray-900"}`}>{title}</h2>
      {subtitle && <p className={`mt-4 text-lg leading-relaxed ${light ? "text-gray-300" : "text-gray-600"}`}>{subtitle}</p>}
    </motion.div>
  );
}

function Icon({ path, className = "h-6 w-6" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  map: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  replay: "M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2",
  fence: "M12 22s7-7.75 7-13a7 7 0 10-14 0c0 5.25 7 13 7 13zM12 12a3 3 0 100-6 3 3 0 000 6z",
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  report: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  gauge: "M12 15l3.5-5.5M8 21h8M3 15a9 9 0 1118 0",
  fuel: "M3 22V5a2 2 0 012-2h7a2 2 0 012 2v17M14 8h4a2 2 0 012 2v4a2 2 0 01-2 2h-4M10 6v4M6 6v4",
  video: "M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z",
  temp: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
  truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  check: "M20 6L9 17l-5-5",
  clock: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  award: "M12 15l-3 9 3-6 3 6-3-9zM7 21l3-9M17 21l-3-9M12 15a7 7 0 100-14 7 7 0 000 14z",
  arrow: "M5 12h14M12 5l7 7-7 7",
  play: "M5 3l14 9-14 9V3z",
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "M18 6L6 18M6 6l12 12",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  car: "M16 3H8l-4 6v8a1 1 0 001 1h1a1 1 0 001-1v-1h10v1a1 1 0 001 1h1a1 1 0 001-1V9l-4-6zM5.5 14a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 14a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM6 9l2.5-4h7L18 9H6z",
  motorcycle: "M5 16a3 3 0 100-6 3 3 0 000 6zM19 16a3 3 0 100-6 3 3 0 000 6zM10 13h4M7 13l3-5h4l1 2M14 10l3 3",
  bus: "M4 6v10c0 1 1 2 2 2h1v1a1 1 0 001 1h1a1 1 0 001-1v-1h4v1a1 1 0 001 1h1a1 1 0 001-1v-1h1c1 0 2-1 2-2V6c0-2-1.5-3-5-3H9C5.5 3 4 4 4 6zM7 15a1 1 0 100-2 1 1 0 000 2zM17 15a1 1 0 100-2 1 1 0 000 2zM4 10h16",
  globe: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
} as const;

/* ── Navigation ────────────────────────────────────────────────── */

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 shadow-lg shadow-gray-200/50 backdrop-blur-lg" : "bg-transparent"}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20">
        <Link href="/" aria-label="EyeOn GPS home">
          <Logo dark={scrolled} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <motion.a key={l.href} href={l.href} whileHover={{ y: -2 }} className={`rounded-lg px-4 py-2 text-[14px] font-medium transition-colors ${scrolled ? "text-gray-700 hover:text-teal-600" : "text-white/90 hover:text-white"}`}>
              {l.label}
            </motion.a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className={`rounded-lg px-5 py-2.5 text-[14px] font-semibold transition-all ${scrolled ? "text-gray-700 hover:text-teal-600" : "text-white hover:text-white/80"}`}>
            Sign In
          </Link>
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-lg bg-teal-600 px-6 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-teal-600/30 transition-all hover:bg-teal-700 hover:shadow-xl"
          >
            Get Started
          </motion.a>
        </div>

        <button type="button" className={`inline-flex h-10 w-10 items-center justify-center rounded-lg lg:hidden ${scrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10"}`} aria-label="Toggle menu" onClick={() => setOpen((v) => !v)}>
          {open ? <Icon path={ICONS.close} /> : <Icon path={ICONS.menu} />}
        </button>
      </div>

      {open && (
        <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="border-t border-gray-100 bg-white px-4 py-4 shadow-lg lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 text-[14px] font-medium text-gray-700 hover:bg-gray-50 hover:text-teal-600">
                {l.label}
              </a>
            ))}
            <div className="mt-4 flex gap-3">
              <Link href="/login" className="flex-1 rounded-lg border border-gray-200 py-3 text-center text-[14px] font-semibold text-gray-700 hover:bg-gray-50">Sign In</Link>
              <a href="#contact" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-teal-600 py-3 text-center text-[14px] font-semibold text-white">Get Started</a>
            </div>
          </div>
        </motion.nav>
      )}
    </motion.header>
  );
}

/* ── Hero Section ──────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:pb-32 lg:pt-36">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-6 inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-4 py-2 text-[13px] font-semibold text-teal-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
              </span>
              #1 GPS Tracking Platform in Bangladesh
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Track, Monitor & Manage Your Fleet
              <span className="mt-2 block text-teal-400">In Real-Time</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="mt-6 max-w-xl text-lg leading-relaxed text-gray-300">
              Professional GPS tracking platform with live monitoring, fuel tracking, geofencing, route replay, and remote engine control. Trusted by 150+ companies across Bangladesh.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-10 flex flex-wrap items-center gap-4">
              <motion.a href="#contact" whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} className="group inline-flex h-14 items-center gap-2 rounded-xl bg-teal-500 px-8 text-[15px] font-bold text-white shadow-xl shadow-teal-500/30 transition-all hover:bg-teal-600 hover:shadow-2xl">
                Get Free Demo
                <Icon path={ICONS.arrow} className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </motion.a>
              <motion.a href={`tel:${CONTACT.hotline.replace(/[^+\d]/g, "")}`} whileHover={{ scale: 1.02 }} className="inline-flex h-14 items-center gap-2 rounded-xl border-2 border-white/20 bg-white/5 px-8 text-[15px] font-semibold text-white backdrop-blur transition-all hover:border-white/40 hover:bg-white/10">
                <Icon path={ICONS.phone} className="h-5 w-5" />
                {CONTACT.hotline}
              </motion.a>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-12 flex flex-wrap items-center gap-8">
              {[
                { icon: ICONS.shield, label: "BTRC Certified" },
                { icon: ICONS.users, label: "150+ Companies" },
                { icon: ICONS.clock, label: "24/7 Support" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-teal-400">
                    <Icon path={item.icon} className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Image - Dashboard Preview */}
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="relative hidden lg:block">
            <div className="relative rounded-2xl bg-white/5 p-2 shadow-2xl backdrop-blur-sm">
              <div className="overflow-hidden rounded-xl bg-gray-900">
                <div className="flex items-center gap-2 border-b border-white/10 bg-gray-800 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 text-center text-sm text-gray-400">EyeOn Dashboard</div>
                </div>
                <div className="relative h-[340px] bg-gradient-to-br from-gray-800 to-gray-900 p-4">
                  {/* Map Background */}
                  <div className="absolute inset-4 rounded-lg bg-[#1a2332]">
                    {/* Vehicle markers */}
                    {[
                      { top: "20%", left: "25%", status: "moving", label: "BA-1234" },
                      { top: "45%", left: "55%", status: "parked", label: "DH-5678" },
                      { top: "65%", left: "30%", status: "moving", label: "RA-9012" },
                      { top: "35%", left: "70%", status: "idle", label: "CH-3456" },
                    ].map((v, i) => (
                      <motion.div key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1 + i * 0.15 }} className="absolute" style={{ top: v.top, left: v.left }}>
                        <motion.div animate={v.status === "moving" ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 2, repeat: Infinity }} className="relative">
                          <div className={`h-4 w-4 rounded-full shadow-lg ${v.status === "moving" ? "bg-teal-500 shadow-teal-500/50" : v.status === "parked" ? "bg-blue-500 shadow-blue-500/50" : "bg-amber-500 shadow-amber-500/50"}`} />
                          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white">{v.label}</div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                  {/* Stats Bar */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="absolute bottom-5 left-5 right-5 flex gap-2">
                    {[
                      { label: "Active", value: "24", color: "teal" },
                      { label: "Parked", value: "12", color: "blue" },
                      { label: "Alerts", value: "3", color: "amber" },
                    ].map((stat) => (
                      <div key={stat.label} className="flex-1 rounded-lg bg-gray-800/80 p-2.5 backdrop-blur">
                        <div className={`text-lg font-bold ${stat.color === "teal" ? "text-teal-400" : stat.color === "blue" ? "text-blue-400" : "text-amber-400"}`}>{stat.value}</div>
                        <div className="text-[10px] text-gray-500">{stat.label}</div>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Trusted Clients Section ──────────────────────────────────── */

const TRUSTED_CLIENTS = [
  { name: "Pathao", logo: "/logos/pathao.png" },
  { name: "Foodpanda", logo: "/logos/foodpanda.png" },
  { name: "Daraz", logo: "/logos/daraz.png" },
  { name: "Robi", logo: "/logos/robi.png" },
  { name: "Grameenphone", logo: "/logos/gp.png" },
  { name: "BRAC", logo: "/logos/brac.png" },
  { name: "Square", logo: "/logos/square.png" },
  { name: "Walton", logo: "/logos/walton.png" },
];

function TrustedClientsSection() {
  return (
    <section className="border-b border-gray-100 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <motion.p variants={fadeIn} className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
            Trusted by Leading Companies in Bangladesh
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
            {TRUSTED_CLIENTS.map((client) => (
              <motion.div
                key={client.name}
                whileHover={{ scale: 1.05 }}
                className="flex h-12 items-center justify-center grayscale transition-all hover:grayscale-0"
              >
                {/* Placeholder for client logos - use gray boxes with text */}
                <div className="flex h-10 items-center justify-center rounded-lg bg-gray-100 px-6 text-sm font-semibold text-gray-500 transition-colors hover:bg-teal-50 hover:text-teal-600">
                  {client.name}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Stats Section ─────────────────────────────────────────────── */

const STATS = [
  { value: "150+", label: "Corporate Clients", icon: ICONS.users },
  { value: "5,000+", label: "Vehicles Tracked", icon: ICONS.truck },
  { value: "24/7", label: "Live Support", icon: ICONS.clock },
  { value: "99.9%", label: "Uptime SLA", icon: ICONS.shield },
];

function StatsSection() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <motion.div key={stat.label} variants={fadeInUp} whileHover={{ y: -4 }} className="rounded-2xl bg-white p-6 shadow-lg shadow-gray-100 transition-shadow hover:shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <Icon path={stat.icon} className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
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

/* ── Features Section ──────────────────────────────────────────── */

const FEATURES = [
  { icon: ICONS.map, title: "Real-Time GPS Tracking", desc: "Second-by-second live updates with accurate GPS positioning on interactive map." },
  { icon: ICONS.fuel, title: "Fuel Monitoring", desc: "Track fuel levels, detect fuel theft, and monitor consumption with precision sensors." },
  { icon: ICONS.replay, title: "Route Playback", desc: "Replay any trip with complete history including speed, stops, and exact routes." },
  { icon: ICONS.fence, title: "Geo-Fencing", desc: "Create virtual boundaries with instant alerts when vehicles enter or exit zones." },
  { icon: ICONS.bell, title: "Smart Alerts", desc: "SOS, overspeed, power cut, and custom alerts via SMS, app, and email notifications." },
  { icon: ICONS.lock, title: "Engine Immobilizer", desc: "Remotely cut off fuel supply to stop the vehicle in case of theft or emergency." },
  { icon: ICONS.video, title: "Dashcam Integration", desc: "Live video streaming with AI-powered event recording and cloud storage." },
  { icon: ICONS.report, title: "Fleet Reports", desc: "Comprehensive analytics and reports for fleet performance and driver behavior." },
];

function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <SectionHeading eyebrow="Platform Features" title="Everything You Need for Fleet Management" subtitle="Comprehensive GPS tracking features designed for modern fleet operations in Bangladesh." />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={fadeInUp} whileHover={{ y: -6 }} className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-teal-100 hover:shadow-lg">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
                  <Icon path={f.icon} className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Products Section ──────────────────────────────────────────── */

const PRODUCTS = [
  {
    title: "GT06N GPS Tracker",
    subtitle: "Best Seller",
    desc: "Professional hardwired GPS tracker with engine cut-off relay. Ideal for cars, motorcycles, and trucks.",
    image: "/products/gt06n.png",
    features: ["Real-time tracking", "Engine immobilizer", "ACC detection", "SOS button", "Voice monitoring"],
    price: "৳3,500",
    badge: "Popular",
  },
  {
    title: "Wetrack 2 GPS",
    subtitle: "Advanced Tracking",
    desc: "4G LTE GPS tracker with internal battery backup and multiple I/O support for fleet management.",
    image: "/products/wetrack2.png",
    features: ["4G connectivity", "Internal battery", "Multiple I/O", "Driver ID", "Temperature sensor"],
    price: "৳5,500",
    badge: null,
  },
  {
    title: "OBD GPS Tracker",
    subtitle: "Plug & Play",
    desc: "Simply plug into OBD port for instant tracking with vehicle diagnostics and fuel data.",
    image: "/products/obd.png",
    features: ["2-minute install", "Vehicle diagnostics", "DTC codes", "Fuel consumption", "No wiring"],
    price: "৳4,500",
    badge: null,
  },
  {
    title: "Portable GPS Tracker",
    subtitle: "Asset Tracking",
    desc: "Wireless magnetic tracker with 60-day battery life for personal and asset tracking.",
    image: "/products/portable.png",
    features: ["60-day battery", "Magnetic mount", "Waterproof IP67", "Motion detection", "Geo-fence"],
    price: "৳6,000",
    badge: null,
  },
  {
    title: "Motorcycle GPS",
    subtitle: "Anti-Theft",
    desc: "Compact GPS tracker designed specifically for motorcycles with vibration alert and engine cut.",
    image: "/products/motorcycle.png",
    features: ["Compact size", "Vibration alert", "Engine cut", "ACC status", "SOS button"],
    price: "৳2,800",
    badge: "New",
  },
  {
    title: "Dashcam GPS Combo",
    subtitle: "Video + GPS",
    desc: "Dual-camera dashcam with integrated GPS tracking, live streaming, and AI event detection.",
    image: "/products/dashcam.png",
    features: ["Dual camera", "Live streaming", "AI detection", "Cloud storage", "GPS tracking"],
    price: "৳15,000",
    badge: "Premium",
  },
];

function ProductsSection() {
  return (
    <section id="products" className="scroll-mt-20 bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <SectionHeading eyebrow="GPS Devices" title="Premium Tracking Hardware" subtitle="High-quality GPS trackers from leading manufacturers including Concox, Teltonika, and Queclink." />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((p) => (
              <motion.div key={p.title} variants={fadeInUp} whileHover={{ y: -6 }} className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-xl">
                {p.badge && (
                  <div className={`absolute right-4 top-4 z-10 rounded-full px-3 py-1 text-xs font-bold uppercase ${p.badge === "Popular" ? "bg-teal-500 text-white" : p.badge === "New" ? "bg-blue-500 text-white" : "bg-amber-500 text-white"}`}>
                    {p.badge}
                  </div>
                )}
                {/* Product Image Placeholder */}
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50 p-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-md">
                    <Icon path={ICONS.map} className="h-12 w-12 text-teal-500" />
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-teal-600">{p.subtitle}</div>
                  <h3 className="mt-1 text-xl font-bold text-gray-900">{p.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{p.desc}</p>
                  <ul className="mt-4 space-y-2">
                    {p.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <Icon path={ICONS.check} className="h-4 w-4 text-teal-500" />{f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">{p.price}</span>
                      <span className="ml-1 text-sm text-gray-500">one-time</span>
                    </div>
                    <motion.a href="#contact" whileHover={{ scale: 1.05 }} className="rounded-lg bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-600 transition-colors hover:bg-teal-100">
                      Get Quote
                    </motion.a>
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

/* ── Solutions Section ─────────────────────────────────────────── */

const SOLUTIONS = [
  { icon: ICONS.truck, title: "Logistics & Delivery", desc: "Track shipments, optimize routes, and ensure on-time deliveries with real-time fleet visibility.", color: "blue" },
  { icon: ICONS.bus, title: "School Transport", desc: "Keep children safe with parent notifications, route monitoring, and attendance tracking.", color: "green" },
  { icon: ICONS.car, title: "Rent-A-Car", desc: "Monitor your rental fleet, prevent misuse, and automate vehicle recovery.", color: "purple" },
  { icon: ICONS.motorcycle, title: "Motorcycle Fleet", desc: "Anti-theft tracking for motorcycles with engine immobilizer and SOS alerts.", color: "orange" },
  { icon: ICONS.truck, title: "Corporate Fleet", desc: "Comprehensive fleet management for corporate vehicles with driver behavior monitoring.", color: "teal" },
  { icon: ICONS.temp, title: "Cold Chain", desc: "Temperature monitoring for pharmaceutical and food delivery with real-time alerts.", color: "cyan" },
];

function SolutionsSection() {
  return (
    <section id="solutions" className="scroll-mt-20 bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <SectionHeading eyebrow="Industry Solutions" title="Tailored for Every Industry" subtitle="Custom GPS tracking solutions designed for your specific business needs." />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.map((s) => (
              <motion.div key={s.title} variants={fadeInUp} whileHover={{ y: -6, scale: 1.02 }} className="group rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:border-teal-100 hover:shadow-lg">
                <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${s.color === "blue" ? "bg-blue-50 text-blue-600" : s.color === "green" ? "bg-green-50 text-green-600" : s.color === "purple" ? "bg-purple-50 text-purple-600" : s.color === "orange" ? "bg-orange-50 text-orange-600" : s.color === "teal" ? "bg-teal-50 text-teal-600" : "bg-cyan-50 text-cyan-600"}`}>
                  <Icon path={s.icon} className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{s.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{s.desc}</p>
                <motion.a href="#contact" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-teal-600 transition-colors hover:text-teal-700">
                  Learn More <Icon path={ICONS.arrow} className="h-4 w-4" />
                </motion.a>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Pricing Section ───────────────────────────────────────────── */

const PLANS = [
  { name: "Basic", price: "৳200", tagline: "Individual vehicle owners", features: ["Real-time GPS tracking", "90-day trip history", "Mobile app access", "Basic SMS alerts", "Email support"], highlight: false },
  { name: "Pro", price: "৳350", tagline: "Small fleets (5-20 vehicles)", features: ["Everything in Basic", "Unlimited geofences", "Remote engine lock", "Driver behavior reports", "Priority phone support", "Fuel monitoring"], highlight: true },
  { name: "Enterprise", price: "৳500", tagline: "Large corporate fleets", features: ["Everything in Pro", "Multi-user access", "API integration", "Custom reports", "White-label option", "Dedicated account manager"], highlight: false },
];

function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-gray-50 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimatedSection>
          <SectionHeading eyebrow="Pricing" title="Simple, Transparent Pricing" subtitle="GPS device from ৳2,800. Monthly subscription includes platform access, SIM data, and 24/7 support." />
          <div className="grid gap-8 lg:grid-cols-3">
            {PLANS.map((p) => (
              <motion.div
                key={p.name}
                variants={fadeInUp}
                whileHover={{ y: -8 }}
                className={`relative flex flex-col overflow-hidden rounded-2xl p-8 transition-all ${p.highlight ? "bg-teal-600 text-white shadow-2xl shadow-teal-600/30" : "bg-white shadow-lg"}`}
              >
                {p.highlight && <div className="absolute -right-10 top-6 rotate-45 bg-yellow-400 px-12 py-1 text-xs font-bold uppercase text-gray-900">Popular</div>}
                <h3 className={`text-2xl font-bold ${p.highlight ? "text-white" : "text-gray-900"}`}>{p.name}</h3>
                <p className={`mt-1 text-sm ${p.highlight ? "text-teal-100" : "text-gray-500"}`}>{p.tagline}</p>
                <div className="mt-6">
                  <span className={`text-5xl font-bold ${p.highlight ? "text-white" : "text-gray-900"}`}>{p.price}</span>
                  <span className={p.highlight ? "text-teal-100" : "text-gray-500"}>/month/vehicle</span>
                </div>
                <ul className="mt-8 flex-1 space-y-4">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-center gap-3 text-[15px] ${p.highlight ? "text-white" : "text-gray-600"}`}>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full ${p.highlight ? "bg-white/20" : "bg-teal-50"}`}>
                        <Icon path={ICONS.check} className={`h-3 w-3 ${p.highlight ? "text-white" : "text-teal-600"}`} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <motion.a
                  href="#contact"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`mt-8 block rounded-xl py-4 text-center text-[15px] font-semibold transition-all ${p.highlight ? "bg-white text-teal-600 hover:bg-gray-50" : "bg-teal-600 text-white hover:bg-teal-700"}`}
                >
                  Get Started
                </motion.a>
              </motion.div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-500">
            All plans include: Free installation • Free SIM card • Free platform training • 1-year device warranty
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── CTA Section ───────────────────────────────────────────────── */

function CTASection() {
  return (
    <section className="bg-gradient-to-br from-teal-600 to-teal-700 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <AnimatedSection>
          <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Ready to Transform Your Fleet Operations?
          </motion.h2>
          <motion.p variants={fadeInUp} className="mx-auto mt-4 max-w-2xl text-lg text-teal-100">
            Get a free demo and see how EyeOn can help you track, monitor, and optimize your fleet.
          </motion.p>
          <motion.div variants={fadeInUp} className="mt-10 flex flex-wrap justify-center gap-4">
            <motion.a href="#contact" whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} className="inline-flex h-14 items-center gap-2 rounded-xl bg-white px-8 text-[16px] font-bold text-teal-600 shadow-xl transition-all hover:bg-gray-50 hover:shadow-2xl">
              Get Free Demo
              <Icon path={ICONS.arrow} className="h-5 w-5" />
            </motion.a>
            <motion.a href={`tel:${CONTACT.hotline.replace(/[^+\d]/g, "")}`} whileHover={{ scale: 1.03 }} className="inline-flex h-14 items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 text-[16px] font-semibold text-white backdrop-blur transition-all hover:bg-white/20">
              <Icon path={ICONS.phone} className="h-5 w-5" />
              {CONTACT.hotline}
            </motion.a>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Contact Section ───────────────────────────────────────────── */

function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-20 bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnimatedSection>
          <div className="grid gap-12 lg:grid-cols-2">
            <motion.div variants={fadeInUp}>
              <div className="mb-4 inline-flex items-center rounded-full bg-teal-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-teal-700">
                Contact Us
              </div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Get Started Today</h2>
              <p className="mt-4 max-w-md text-lg text-gray-600">Contact our team for a free consultation. We&apos;ll help you choose the right GPS tracking solution for your fleet.</p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Sales Hotline", value: CONTACT.sales, href: `tel:${CONTACT.sales.replace(/[^+\d]/g, "")}`, icon: ICONS.phone },
                  { label: "24/7 Support", value: CONTACT.hotline, href: `tel:${CONTACT.hotline.replace(/[^+\d]/g, "")}`, icon: ICONS.clock },
                  { label: "Email Us", value: CONTACT.email, href: `mailto:${CONTACT.email}`, icon: ICONS.mail },
                  { label: "Visit Office", value: CONTACT.address, href: undefined, icon: ICONS.map },
                ].map((c) => (
                  <motion.div key={c.label} whileHover={{ y: -4 }} className="rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:border-teal-100 hover:shadow-md">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                      <Icon path={c.icon} className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{c.label}</div>
                    {c.href ? <a href={c.href} className="mt-1 block text-[15px] font-semibold text-gray-900 hover:text-teal-600">{c.value}</a> : <div className="mt-1 text-[15px] font-semibold text-gray-900">{c.value}</div>}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <div className="rounded-2xl bg-gray-50 p-8 shadow-sm">
                <h3 className="mb-6 text-xl font-bold text-gray-900">Request a Free Demo</h3>
                <form className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input type="text" placeholder="Full Name *" className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-gray-900 placeholder-gray-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" required />
                    <input type="tel" placeholder="Phone Number *" className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-gray-900 placeholder-gray-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" required />
                  </div>
                  <input type="email" placeholder="Email Address" className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-900 placeholder-gray-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
                  <input type="text" placeholder="Company Name" className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-900 placeholder-gray-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
                  <select className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-600 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                    <option value="">Fleet Size</option>
                    <option>1-5 vehicles</option>
                    <option>6-20 vehicles</option>
                    <option>21-50 vehicles</option>
                    <option>50+ vehicles</option>
                  </select>
                  <textarea rows={3} placeholder="Tell us about your tracking needs..." className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
                  <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-[15px] font-bold text-white shadow-lg shadow-teal-600/30 transition-all hover:bg-teal-700 hover:shadow-xl">
                    Request Free Demo
                    <Icon path={ICONS.arrow} className="h-5 w-5" />
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Footer ────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-900 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-6 max-w-md text-[14px] leading-relaxed text-gray-400">EyeOn GPS — Bangladesh&apos;s leading vehicle tracking platform. Real-time GPS tracking, fleet management, and analytics for businesses of all sizes.</p>
            <div className="mt-6 flex gap-3">
              {[
                { label: "Facebook", href: "#" },
                { label: "LinkedIn", href: "#" },
                { label: "YouTube", href: "#" },
              ].map((s) => (
                <motion.a key={s.label} href={s.href} whileHover={{ y: -3 }} className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-sm font-semibold text-gray-400 transition-colors hover:bg-teal-600 hover:text-white">
                  {s.label[0]}
                </motion.a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-400">Quick Links</h4>
            <ul className="space-y-3 text-[14px]">
              {NAV_LINKS.map((l) => <li key={l.href}><a href={l.href} className="text-gray-400 transition-colors hover:text-teal-400">{l.label}</a></li>)}
              <li><Link href="/login" className="text-gray-400 transition-colors hover:text-teal-400">Customer Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-400">Contact Info</h4>
            <ul className="space-y-3 text-[14px] text-gray-400">
              <li className="flex items-center gap-2"><Icon path={ICONS.phone} className="h-4 w-4 text-teal-500" /><a href={`tel:${CONTACT.hotline.replace(/[^+\d]/g, "")}`} className="hover:text-teal-400">{CONTACT.hotline}</a></li>
              <li className="flex items-center gap-2"><Icon path={ICONS.mail} className="h-4 w-4 text-teal-500" /><a href={`mailto:${CONTACT.email}`} className="hover:text-teal-400">{CONTACT.email}</a></li>
              <li className="flex items-start gap-2"><Icon path={ICONS.map} className="mt-0.5 h-4 w-4 text-teal-500" /><span>{CONTACT.address}</span></li>
            </ul>
            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Certifications</div>
              <div className="mt-2 flex gap-2">
                {["BTRC", "ISO 9001"].map((c) => <div key={c} className="rounded-md bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-400">{c}</div>)}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 sm:flex-row">
          <span className="text-sm text-gray-500">© {new Date().getFullYear()} EyeOn GPS. All rights reserved.</span>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-teal-400">Privacy Policy</a>
            <a href="#" className="hover:text-teal-400">Terms of Service</a>
            <span>Made with ❤️ in Bangladesh</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Main Page ─────────────────────────────────────────────────── */

export function LandingPageV2() {
  return (
    <div className="bg-white font-sans text-gray-900 antialiased">
      <Nav />
      <main>
        <Hero />
        <TrustedClientsSection />
        <StatsSection />
        <FeaturesSection />
        <ProductsSection />
        <SolutionsSection />
        <PricingSection />
        <CTASection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
