"use client";

import Link from "next/link";
import { useLocale, type StringKey } from "@/lib/i18n";

interface IndustryCardProps {
  icon: React.ReactNode;
  titleKey: StringKey;
  descKey: StringKey;
  featuresKey: StringKey;
  href?: string;
}

export function IndustryCard({ icon, titleKey, descKey, featuresKey, href = "/industries" }: IndustryCardProps) {
  const { t } = useLocale();

  return (
    <Link href={href}>
      <div className="mkt-card-industry group h-full">
        <div className="flex items-start gap-4">
          <div className="mkt-icon-container flex-shrink-0 transition-colors group-hover:bg-brand-100">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-ink-900 transition-colors group-hover:text-brand-600">
              {t(titleKey)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {t(descKey)}
            </p>
            <p className="mt-3 text-xs text-ink-500">
              {t(featuresKey)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
