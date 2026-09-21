"use client";

import { useLocale, type StringKey } from "@/lib/i18n";

export function Placeholder({ titleKey }: { titleKey: StringKey }) {
  const { t } = useLocale();
  return (
    <div className="flex h-full items-center justify-center bg-surface-50">
      <div className="panel px-6 py-8 text-center">
        <div className="text-[14px] font-semibold text-ink-900">{t(titleKey)}</div>
        <div className="mt-1 text-[13px] text-ink-500">Coming in a later phase.</div>
      </div>
    </div>
  );
}
