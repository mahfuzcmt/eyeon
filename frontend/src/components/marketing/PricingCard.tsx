"use client";

import Link from "next/link";
import { useLocale, type StringKey } from "@/lib/i18n";

interface PricingCardProps {
  tier: "basic" | "pro" | "enterprise";
  popular?: boolean;
}

const PLANS = {
  basic: {
    titleKey: "mkt.pricing.basic.title" as const,
    priceKey: "mkt.pricing.basic.price" as const,
    descKey: "mkt.pricing.basic.desc" as const,
    features: [
      "mkt.pricing.basic.f1" as const,
      "mkt.pricing.basic.f2" as const,
      "mkt.pricing.basic.f3" as const,
      "mkt.pricing.basic.f4" as const,
      "mkt.pricing.basic.f5" as const,
    ],
  },
  pro: {
    titleKey: "mkt.pricing.pro.title" as const,
    priceKey: "mkt.pricing.pro.price" as const,
    descKey: "mkt.pricing.pro.desc" as const,
    features: [
      "mkt.pricing.pro.f1" as const,
      "mkt.pricing.pro.f2" as const,
      "mkt.pricing.pro.f3" as const,
      "mkt.pricing.pro.f4" as const,
      "mkt.pricing.pro.f5" as const,
      "mkt.pricing.pro.f6" as const,
      "mkt.pricing.pro.f7" as const,
    ],
  },
  enterprise: {
    titleKey: "mkt.pricing.enterprise.title" as const,
    priceKey: "mkt.pricing.enterprise.price" as const,
    descKey: "mkt.pricing.enterprise.desc" as const,
    features: [
      "mkt.pricing.enterprise.f1" as const,
      "mkt.pricing.enterprise.f2" as const,
      "mkt.pricing.enterprise.f3" as const,
      "mkt.pricing.enterprise.f4" as const,
      "mkt.pricing.enterprise.f5" as const,
      "mkt.pricing.enterprise.f6" as const,
      "mkt.pricing.enterprise.f7" as const,
      "mkt.pricing.enterprise.f8" as const,
    ],
  },
};

export function PricingCard({ tier, popular = false }: PricingCardProps) {
  const { t } = useLocale();
  const plan = PLANS[tier];

  return (
    <div className={popular ? "mkt-card-pricing-popular" : "mkt-card-pricing"}>
      {popular && (
        <div className="mkt-badge-popular">
          {t("mkt.pricing.pro.badge")}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-ink-900">{t(plan.titleKey)}</h3>
        <p className="mt-2 text-sm text-ink-500">{t(plan.descKey)}</p>
      </div>

      <div className="mb-6">
        <span className="mkt-price">{t(plan.priceKey)}</span>
        <span className="mkt-price-period"> / {t("mkt.pricing.perVehicle")}</span>
      </div>

      <ul className="mkt-checklist mb-8">
        {plan.features.map((featureKey) => (
          <li key={featureKey} className="mkt-checklist-item">
            <svg className="mkt-checklist-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>{t(featureKey)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Link href="/contact">
          <button className={`w-full ${popular ? "mkt-btn-primary" : "mkt-btn-secondary"}`}>
            {tier === "enterprise" ? t("mkt.pricing.contactSales") : t("mkt.pricing.choosePlan")}
          </button>
        </Link>
      </div>
    </div>
  );
}
