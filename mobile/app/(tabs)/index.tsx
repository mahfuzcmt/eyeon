import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useDevices } from "@/hooks/useDevices";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { useKpis } from "@/hooks/useKpis";
import { useDeviceTodayStats } from "@/hooks/useDeviceTodayStats";
import { Chip, Loading } from "@/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { fmtDistance, fmtDuration, motionColor, motionOf, subscriptionExpired } from "@/format";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { DeviceView, LocationView, MotionStatus } from "@/types";

/** Home status buckets: the four motion states plus the two the web home also counts. */
type HomeState = MotionStatus | "NO_DATA" | "EXPIRED";

function homeState(d: DeviceView, live?: LocationView | null): HomeState {
  if (d.status === "NEVER_CONNECTED" || !d.lastSeenAt) return "NO_DATA";
  if (subscriptionExpired(d)) return "EXPIRED";
  return motionOf(d, live);
}

export default function HomeScreen() {
  const { t } = useI18n();
  const { org, user } = useAuth();
  const router = useRouter();
  const { devices, loading, reload } = useDevices();
  const { locations } = useLiveLocations(org?.id ?? null);
  const { kpis } = useKpis();
  const [picked, setPicked] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<HomeState, number> = { MOVING: 0, IDLE: 0, STOPPED: 0, OFFLINE: 0, NO_DATA: 0, EXPIRED: 0 };
    for (const d of devices) c[homeState(d, locations.get(d.imei))] += 1;
    return c;
  }, [devices, locations]);
  // Status cards open the people list filtered to that state; alarm figures open the alarm center.
  const openPeople = (state: MotionStatus) =>
    router.navigate({ pathname: "/vehicles", params: { state, n: String(Date.now()) } });
  const openAlarms = (unacked: boolean) =>
    router.navigate({ pathname: "/alerts", params: { unacked: unacked ? "1" : "0", tab: "details", n: String(Date.now()) } });

  const selectedImei = picked ?? devices[0]?.imei ?? null;

  if (loading && devices.length === 0) return <Loading label={t("home.loading")} />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>{org?.name ?? t("home.fleet")}</Text>
          {user?.fullName ? <Text style={styles.sub}>{user.fullName}</Text> : null}
        </View>
        <LanguageToggle />
      </View>

      <Text style={styles.section}>{t("home.fleetStatus")}</Text>
      <View style={styles.grid}>
        <StatusCard label={t("state.moving")} value={counts.MOVING} color={motionColor("MOVING")} onPress={() => openPeople("MOVING")} />
        <StatusCard label={t("state.idle")} value={counts.IDLE} color={motionColor("IDLE")} onPress={() => openPeople("IDLE")} />
        <StatusCard label={t("state.stopped")} value={counts.STOPPED} color={motionColor("STOPPED")} onPress={() => openPeople("STOPPED")} />
        <StatusCard label={t("state.offline")} value={counts.OFFLINE} color={motionColor("OFFLINE")} onPress={() => openPeople("OFFLINE")} />
        <StatusCard label={t("homex.noData")} value={counts.NO_DATA} color={colors.warn} />
        <StatusCard label={t("homex.expired")} value={counts.EXPIRED} color={colors.danger} />
      </View>

      {kpis ? (
        <View style={styles.kpiRow}>
          <Kpi label={t("home.alarmsToday")} value={kpis.alarmsToday} accent={kpis.alarmsCriticalToday > 0} onPress={() => openAlarms(false)} />
          <Kpi label={t("home.unacked")} value={kpis.alarmsUnacknowledged} accent={kpis.alarmsUnacknowledged > 0} onPress={() => openAlarms(true)} />
          <Kpi label={t("home.fleetDistance")} value={fmtDistance(kpis.distanceTodayMeters)} />
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.8 }]}
        onPress={() => router.push("/geofences")}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.linkTitle}>🛡️ {t("home.geofences")}</Text>
          <Text style={styles.linkSub}>{t("home.geofenceSub")}</Text>
        </View>
        <Text style={styles.linkArrow}>›</Text>
      </Pressable>

      <Text style={styles.section}>{t("home.vehicleStats")}</Text>
      {devices.length > 0 ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
            {devices.map((d) => (
              <Chip
                key={d.imei}
                label={d.name ?? d.vehiclePlate ?? d.imei.slice(-6)}
                active={d.imei === selectedImei}
                onPress={() => setPicked(d.imei)}
              />
            ))}
          </ScrollView>
          {selectedImei ? (
            <SingleVehicleStats imei={selectedImei} onOpen={() => router.push({ pathname: "/device/[imei]", params: { imei: selectedImei } })} />
          ) : null}
        </>
      ) : (
        <Text style={styles.empty}>{t("home.noVehicles")}</Text>
      )}
    </ScrollView>
  );
}

function SingleVehicleStats({ imei, onOpen }: { imei: string; onOpen: () => void }) {
  const { t } = useI18n();
  const { stats, loading } = useDeviceTodayStats(imei);
  return (
    <View style={styles.statsCard}>
      {loading ? (
        <Text style={styles.loadingText}>{t("home.loadingToday")}</Text>
      ) : (
        <View style={styles.statsGrid}>
          <Metric label={t("home.routeLength")} value={fmtDistance(stats.distanceM)} />
          <Metric label={t("home.moveDuration")} value={fmtDuration(stats.moveS)} />
          <Metric label={t("home.stopDuration")} value={fmtDuration(stats.stillS)} />
        </View>
      )}
      <Text style={styles.openLink} onPress={onOpen}>
        {t("home.openVehicle")}
      </Text>
    </View>
  );
}

function StatusCard({ label, value, color, onPress }: { label: string; value: number; color: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.statusCard, pressed && { opacity: 0.8 }]}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function Kpi({ label, value, accent, onPress }: { label: string; value: number | string; accent?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.kpi, pressed && { opacity: 0.8 }]}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={[styles.kpiValue, accent && { color: colors.warn }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, gap: space.sm, paddingBottom: space.xl },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  hello: { color: colors.text, fontSize: 22, fontWeight: "800" },
  sub: { color: colors.textFaint, fontSize: 15, marginTop: -4 },
  section: { color: colors.textDim, fontSize: 14, fontWeight: "700", marginTop: space.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  statusCard: {
    flexGrow: 1,
    flexBasis: 96,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusValue: { color: colors.text, fontSize: 22, fontWeight: "800" },
  statusLabel: { color: colors.textFaint, fontSize: 13 },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xs },
  kpi: {
    flexGrow: 1,
    flexBasis: 96,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
    alignItems: "center",
    gap: 2,
  },
  kpiValue: { color: colors.text, fontSize: 16, fontWeight: "700" },
  kpiLabel: { color: colors.textFaint, fontSize: 12, textAlign: "center" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginTop: space.sm,
  },
  linkTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  linkSub: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  linkArrow: { color: colors.textFaint, fontSize: 22, fontWeight: "300" },
  picker: { gap: space.sm, paddingVertical: space.xs, paddingRight: space.md },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.md,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  metric: { width: "33%", paddingVertical: space.sm },
  metricValue: { color: colors.text, fontSize: 16, fontWeight: "700" },
  metricLabel: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  openLink: { color: colors.brand, fontWeight: "600", fontSize: 14 },
  loadingText: { color: colors.textFaint, fontSize: 14 },
  empty: { color: colors.textFaint, fontSize: 15 },
});
