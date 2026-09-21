"use client";

import { useLocale } from "@/lib/i18n";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import type { SubscriptionView } from "@/types/domain";

export function BillingTab() {
  const { t } = useLocale();
  const { subscriptions, loading, error, refresh } = useSubscriptions();

  if (loading) {
    return <div className="text-[14px] text-ink-400">{t("common.loading")}</div>;
  }

  if (error) {
    return (
      <div className="text-[14px] text-alarm-red">
        {error}
        <button
          onClick={() => void refresh()}
          className="ml-2 text-brand-500 underline"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (!subscriptions.length) {
    return (
      <div className="text-[14px] text-ink-400">{t("billing.noSubscriptions")}</div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-ink-900">{t("billing.title")}</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subscriptions.map((sub) => (
          <SubscriptionCard key={sub.id} subscription={sub} />
        ))}
      </div>
    </div>
  );
}

function SubscriptionCard({ subscription }: { subscription: SubscriptionView }) {
  const { t } = useLocale();
  const sub = subscription;

  const statusColorClass = getStatusColorClass(sub.effectiveStatus);
  const showWarning = sub.effectiveStatus === "GRACE" || sub.isExpiringSoon;
  const showError = sub.effectiveStatus === "SUSPENDED" || sub.isExpired;

  return (
    <div
      className={`rounded-xl border p-4 ${
        showError
          ? "border-alarm-red/40 bg-alarm-red/5"
          : showWarning
          ? "border-alarm-amber/40 bg-alarm-amber/5"
          : "border-surface-200 bg-white shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-mono text-[14px] text-ink-900">{sub.deviceImei}</p>
          <p className="text-[13px] text-ink-500">
            {sub.planTier === "TRIAL" ? t("billing.trialPlan") : sub.planTier}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[13px] font-medium ${statusColorClass}`}
        >
          {getStatusLabel(sub.effectiveStatus, t)}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 text-[14px]">
        <div className="flex justify-between">
          <span className="text-ink-500">{t("billing.expiresOn")}</span>
          <span className="text-ink-900 font-medium">
            {formatDate(sub.nextDueAt)}
          </span>
        </div>

        {sub.daysUntilDue >= 0 && !sub.isExpired && (
          <div className="flex justify-between">
            <span className="text-ink-500">{t("billing.daysLeft")}</span>
            <span
              className={`font-medium ${
                sub.daysUntilDue <= 7
                  ? "text-alarm-amber"
                  : "text-ink-900"
              }`}
            >
              {sub.daysUntilDue}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-ink-500">{t("billing.startedOn")}</span>
          <span className="text-ink-900 font-medium">{formatDate(sub.startedAt)}</span>
        </div>

        {sub.monthlyPriceBdt > 0 && (
          <div className="flex justify-between">
            <span className="text-ink-500">{t("billing.plan")}</span>
            <span className="text-ink-900 font-medium">
              ৳{sub.monthlyPriceBdt}/month
            </span>
          </div>
        )}
      </div>

      {/* Warning messages */}
      {showWarning && !showError && (
        <div className="mt-3 rounded bg-alarm-amber/10 px-2 py-1.5 text-[13px] text-alarm-amber">
          {t("billing.expiringSoon")}
        </div>
      )}

      {showError && (
        <div className="mt-3 rounded bg-alarm-red/10 px-2 py-1.5 text-[13px] text-alarm-red">
          {t("billing.expired")} - {t("billing.contactAdmin")}
        </div>
      )}
    </div>
  );
}

function getStatusColorClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-alarm-green/15 text-alarm-green";
    case "GRACE":
      return "bg-alarm-amber/15 text-alarm-amber";
    case "SUSPENDED":
    case "CANCELLED":
      return "bg-alarm-red/15 text-alarm-red";
    default:
      return "bg-ink-400/15 text-ink-400";
  }
}

type TranslateFunction = ReturnType<typeof useLocale>["t"];

function getStatusLabel(status: string, t: TranslateFunction): string {
  switch (status) {
    case "ACTIVE":
      return t("billing.status.ACTIVE");
    case "GRACE":
      return t("billing.status.GRACE");
    case "SUSPENDED":
      return t("billing.status.SUSPENDED");
    case "CANCELLED":
      return t("billing.status.CANCELLED");
    default:
      return status;
  }
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
