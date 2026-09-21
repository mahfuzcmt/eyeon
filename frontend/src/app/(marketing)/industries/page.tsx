"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import { CTASection } from "@/components/marketing/CTASection";

const INDUSTRIES = [
  {
    titleKey: "mkt.industries.personal.title" as const,
    descKey: "mkt.industries.personal.desc" as const,
    featuresKey: "mkt.industries.personal.features" as const,
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    benefits: [
      "Instant theft alerts when your vehicle moves unexpectedly",
      "Remote engine immobilization to stop thieves",
      "Share live location with family members",
      "SOS panic button for emergencies",
    ],
  },
  {
    titleKey: "mkt.industries.logistics.title" as const,
    descKey: "mkt.industries.logistics.desc" as const,
    featuresKey: "mkt.industries.logistics.features" as const,
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    benefits: [
      "Track every delivery in real-time",
      "Optimize routes to reduce fuel costs",
      "Automatic delivery timestamps and proof of delivery",
      "Send ETA notifications to customers",
    ],
  },
  {
    titleKey: "mkt.industries.bus.title" as const,
    descKey: "mkt.industries.bus.desc" as const,
    featuresKey: "mkt.industries.bus.features" as const,
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
    benefits: [
      "Parents can track their child's bus in real-time",
      "Automatic pickup and dropoff notifications",
      "Monitor driver behavior and speed",
      "Ensure route compliance and timing",
    ],
  },
  {
    titleKey: "mkt.industries.truck.title" as const,
    descKey: "mkt.industries.truck.desc" as const,
    featuresKey: "mkt.industries.truck.features" as const,
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    benefits: [
      "Track trucks across Bangladesh and beyond",
      "Monitor driving hours and rest compliance",
      "Fuel consumption monitoring and theft detection",
      "Temperature monitoring for perishable goods",
    ],
  },
  {
    titleKey: "mkt.industries.rental.title" as const,
    descKey: "mkt.industries.rental.desc" as const,
    featuresKey: "mkt.industries.rental.features" as const,
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
    benefits: [
      "Know where every rental vehicle is at all times",
      "Track mileage and rental period automatically",
      "Set geofence boundaries to prevent unauthorized travel",
      "Remote immobilization for non-returns",
    ],
  },
  {
    titleKey: "mkt.industries.corporate.title" as const,
    descKey: "mkt.industries.corporate.desc" as const,
    featuresKey: "mkt.industries.corporate.features" as const,
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
    benefits: [
      "Complete visibility over company vehicle usage",
      "Automate expense reports and mileage tracking",
      "Ensure vehicles are used for business purposes only",
      "Schedule maintenance based on actual usage",
    ],
  },
];

export default function IndustriesPage() {
  const { t } = useLocale();

  return (
    <>
      {/* Hero */}
      <section className="mkt-section-dark">
        <div className="mkt-container text-center">
          <h1 className="mkt-heading-xl text-white">
            {t("mkt.industries.title")}
          </h1>
          <p className="mkt-body mx-auto mt-4 max-w-2xl text-ink-300">
            {t("mkt.industries.subtitle")}
          </p>
        </div>
      </section>

      {/* Industries */}
      <section className="mkt-section bg-white">
        <div className="mkt-container">
          <div className="space-y-16 md:space-y-24">
            {INDUSTRIES.map((industry, idx) => (
              <div key={idx} className={`flex flex-col gap-8 lg:flex-row lg:gap-16 ${idx % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                {/* Content */}
                <div className="flex-1">
                  <div className="mkt-icon-container h-16 w-16">
                    {industry.icon}
                  </div>
                  <h2 className="mkt-heading-sm mt-6">
                    {t(industry.titleKey)}
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-ink-600">
                    {t(industry.descKey)}
                  </p>
                  <p className="mt-3 text-sm text-ink-500">
                    {t(industry.featuresKey)}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {industry.benefits.map((benefit, i) => (
                      <li key={i} className="mkt-checklist-item">
                        <svg className="mkt-checklist-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Link href="/contact">
                      <button className="mkt-btn-primary">
                        {t("mkt.talkToSales")}
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Visual */}
                <div className="flex-1">
                  <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-brand-50 to-surface-100 flex items-center justify-center overflow-hidden">
                    <div className="relative w-3/4 h-3/4 rounded-lg bg-white shadow-xl p-4">
                      {/* Simple dashboard mockup */}
                      <div className="h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-6 w-6 rounded bg-brand-500" />
                          <div className="h-3 w-24 rounded bg-surface-200" />
                        </div>
                        <div className="flex-1 rounded bg-brand-50/50 relative">
                          {/* Map dots */}
                          <div className="absolute top-1/4 left-1/4 h-3 w-3 rounded-full bg-status-moving animate-pulse" />
                          <div className="absolute top-1/2 left-2/3 h-3 w-3 rounded-full bg-status-moving animate-pulse" />
                          <div className="absolute top-3/4 left-1/3 h-3 w-3 rounded-full bg-status-idle" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
