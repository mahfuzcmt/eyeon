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
import { fmtDistance, fmtDuration, motionColor, motionOf } from "@/format";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { MotionStatus } from "@/types";

export default function HomeScreen() {
  const { t } = useI18n();
  const { org, user } = useAuth();
  const router = useRouter();
  const { devices, loading, reload } = useDevices();
  const { locations } = useLiveLocations(org?.id ?? null);
  const { kpis } = useKpis();
  const [picked, setPicked] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<MotionStatus, number> = { MOVING: 0, IDLE: 0, STOPPED: 0, OFFLINE: 0 };
    for (const d of devices) c[motionOf(d, locations.get(d.imei))] += 1;
    return c;
  }, [devices, locations]);

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
        <StatusCard label={t("state.moving")} value={counts.MOVING} color={motionColor("MOVING")} />
        <StatusCard label={t("state.idle")} value={counts.IDLE} color={motionColor("IDLE")} />
        <StatusCard label={t("state.stopped")} value={counts.STOPPED} color={motionColor("STOPPED")} />
        <StatusCard label={t("state.offline")} value={counts.OFFLINE} color={motionColor("OFFLINE")} />
      </View>

      {kpis ? (
        <View style={styles.kpiRow}>
          <Kpi label={t("home.alarmsToday")} value={kpis.alarmsToday} accent={kpis.alarmsCriticalToday > 0} />
          <Kpi label={t("home.unacked")} value={kpis.alarmsUnacknowledged} accent={kpis.alarmsUnacknowledged > 0} />
          <Kpi label={t("home.tripsToday")} value={kpis.tripsCompletedToday} />
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
                label={d.vehiclePlate ?? d.name ?? d.imei.slice(-6)}
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
          <Metric label={t("home.trips")} value={String(stats.trips)} />
          <Metric label={t("home.moveDuration")} value={fmtDuration(stats.moveS)} />
          <Metric label={t("home.idleDuration")} value={fmtDuration(stats.idleS)} />
          <Metric label={t("home.topSpeed")} value={`${stats.maxSpeed} ${t("veh.kmh")}`} />
          <Metric label={t("hist.avgSpeed")} value={`${stats.avgSpeed} ${t("veh.kmh")}`} />
        </View>
      )}
      <Text style={styles.openLink} onPress={onOpen}>
        {t("home.openVehicle")}
      </Text>
    </View>
  );
}

function StatusCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statusCard}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiValue, accent && { color: colors.warn }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
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
  sub: { color: colors.textFaint, fontSize: 14, marginTop: -4 },
  section: { color: colors.textDim, fontSize: 13, fontWeight: "700", marginTop: space.md },
  grid: { flexDirection: "row", gap: space.sm },
  statusCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusValue: { color: colors.text, fontSize: 22, fontWeight: "800" },
  statusLabel: { color: colors.textFaint, fontSize: 12 },
  kpiRow: { flexDirection: "row", gap: space.sm, marginTop: space.xs },
  kpi: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
    alignItems: "center",
    gap: 2,
  },
  kpiValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  kpiLabel: { color: colors.textFaint, fontSize: 10, textAlign: "center" },
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
  linkTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  linkSub: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
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
  metricValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  metricLabel: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  openLink: { color: colors.brand, fontWeight: "600", fontSize: 13 },
  loadingText: { color: colors.textFaint, fontSize: 13 },
  empty: { color: colors.textFaint, fontSize: 14 },
});
