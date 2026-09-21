"use client";

import { useMemo } from "react";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { useActivity } from "@/hooks/useActivity";
import { useLocale } from "@/lib/i18n";
import {
  dhakaTodayStartIso,
  formatDate,
  formatDurationS,
  formatEngineHours,
  formatNumber,
  formatRelative,
  formatVoltage,
} from "@/lib/format";
import type { DeviceView } from "@/types/domain";

export default function StatisticsTab({ device, orgId }: { device: DeviceView; orgId: string }) {
  const { t, locale } = useLocale();
  const { locations } = useLiveLocations(orgId);
  const live = locations.get(device.imei);

  const range = useMemo(() => ({ from: dhakaTodayStartIso(), to: new Date().toISOString() }), []);
  const { activity } = useActivity({ imei: device.imei, fromIso: range.from, toIso: range.to });

  const serverTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="h-full overflow-y-auto bg-surface-50 p-3">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <Section title={t("home.today")}>
          <M label={t("home.routeLength")} value={`${formatNumber(activity.distanceM / 1000, locale, { maximumFractionDigits: 1 })} ${t("kpi.km")}`} />
          <M label={t("home.moveDuration")} value={formatDurationS(activity.movingS, locale)} />
          <M label={t("home.stopDuration")} value={formatDurationS(activity.stillS, locale)} />
          <M label={t("home.topSpeed")} value={`${activity.maxSpeed} ${t("fleet.kmh")}`} />
        </Section>

        <Section title={t("stats.now")}>
          <M label={t("fleet.speed")} value={`${live?.speed ?? device.lastSpeed ?? 0} ${t("fleet.kmh")}`} />
          <M label={t("fleet.lastSeen")} value={formatRelative(live?.ts ?? device.lastSeenAt, locale)} />
        </Section>

        <Section title={t("stats.tracker")}>
          <M label={t("stats.battery")} value={formatVoltage(live?.voltageMv ?? device.lastVoltageMv, locale)} />
          <M label={t("stats.satellites")} value={live?.satellites != null ? String(live.satellites) : "—"} />
        </Section>

        <Section title={t("stats.subscription")}>
          <M label={t("stats.status")} value={device.subscriptionStatus ?? "—"} />
          <M label={t("veh.expiresOn")} value={formatDate(device.subscriptionExpiresAt, locale)} />
        </Section>

        <p className="text-[12px] text-ink-400">Server time · {serverTime}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <div className="panel-header"><span className="text-[14px] font-semibold text-ink-900">{title}</span></div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">{children}</div>
    </div>
  );
}

function M({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-surface-200 bg-surface-50 px-2.5 py-1.5">
      <div className="text-[12px] uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-0.5 text-[14px] font-semibold text-ink-900">{value}</div>
    </div>
  );
}
