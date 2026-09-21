import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { useDeviceLive } from "@/hooks/useDeviceLive";
import { useDeviceTodayStats } from "@/hooks/useDeviceTodayStats";
import { Loading, Metric, Section } from "@/ui";
import { fmtAgo, fmtDistance, fmtDuration, fmtVoltage } from "@/format";
import { useI18n, type StringKey } from "@/i18n";
import { colors, space } from "@/theme";

export default function StatisticsTab({ imei, orgId }: { imei: string; orgId: string | null }) {
  const { t } = useI18n();
  const { device, loc, loading } = useDeviceLive(imei, orgId);
  const { stats, loading: statsLoading, reload } = useDeviceTodayStats(imei);

  if (loading && !device) return <Loading label={t("stats.loading")} />;

  const serverTime = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={statsLoading} onRefresh={reload} tintColor={colors.brand} />}
    >
      <Section title={t("stats.today")}>
        <Metric label={t("hist.distance")} value={fmtDistance(stats.distanceM)} />
        <Metric label={t("home.trips")} value={String(stats.trips)} />
        <Metric label={t("hist.maxSpeed")} value={`${stats.maxSpeed} ${t("veh.kmh")}`} />
        <Metric label={t("hist.avgSpeed")} value={`${stats.avgSpeed} ${t("veh.kmh")}`} />
        <Metric label={t("home.moveDuration")} value={fmtDuration(stats.moveS)} />
        <Metric label={t("home.idleDuration")} value={fmtDuration(stats.idleS)} />
      </Section>

      <Section title={t("stats.current")}>
        <Metric label={t("graph.speed")} value={`${loc?.speed ?? device?.lastSpeed ?? 0} ${t("veh.kmh")}`} />
        <Metric label={t("stats.odometer")} value={fmtDistance(loc?.mileageMeters)} />
        <Metric label={t("stats.engineHours")} value={fmtDuration(device?.lastEngineHoursSeconds)} />
        <Metric
          label={t("stats.location")}
          width="66%"
          value={loc ? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` : "—"}
        />
        <Metric label={t("veh.lastSeen")} value={fmtAgo(device?.lastSeenAt)} />
      </Section>

      <Section title={t("stats.deviceHealth")}>
        <Metric label={t("track.voltage")} value={fmtVoltage(loc?.voltageMv ?? device?.lastVoltageMv)} />
        <Metric label="GSM" value={device?.lastGsmSignal != null ? String(device.lastGsmSignal) : "—"} />
        <Metric label={t("track.gpsSats")} value={loc?.satellites != null ? String(loc.satellites) : "—"} />
        <Metric label={t("sub.status")} value={device?.status ?? "—"} />
        <Metric label={t("track.engine")} value={device?.engineLocked ? `🔒 ${t("track.locked")}` : t("track.unlocked")} />
      </Section>

      <Section title={t("sub.title")}>
        <Metric label={t("sub.status")} value={device?.subscriptionStatus ?? "—"} />
        <Metric label={t("sub.expiresOn")} width="66%" value={fmtExpiry(device?.subscriptionExpiresAt, t)} />
      </Section>

      <Text style={styles.server}>{t("stats.serverTime")} · {serverTime}</Text>
    </ScrollView>
  );
}

/** Format a yyyy-MM-dd expiry date with a relative "in N days" / "expired" hint. */
function fmtExpiry(date: string | null | undefined, t: (k: StringKey) => string): string {
  if (!date) return "—";
  const due = new Date(`${date}T00:00:00+06:00`); // Asia/Dhaka day boundary
  if (Number.isNaN(due.getTime())) return date;
  const label = due.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium" });
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `${label} · ${t("stats.expired")}`;
  if (days === 0) return `${label} · ${t("common.today")}`;
  return `${label} · ${days} ${t("stats.days")}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl },
  server: { color: colors.textFaint, fontSize: 11 },
});
