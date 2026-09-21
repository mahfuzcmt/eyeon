import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useDevices } from "@/hooks/useDevices";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { useTicker } from "@/hooks/useTicker";
import { Chip, EmptyState, Loading, Pill } from "@/ui";
import { fmtAgo, fmtSince, motionColor, motionOf, subscriptionDaysLeft, subscriptionExpired } from "@/format";
import { useSpeedLimits } from "@/hooks/useSpeedLimits";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { DeviceView, LocationView, MotionStatus } from "@/types";

type Filter = "ALL" | "MOVING" | "IDLE" | "STOPPED" | "OFFLINE";

const FILTER_KEY: Record<Filter, StringKey> = {
  ALL: "common.all",
  MOVING: "state.moving",
  IDLE: "state.idle",
  STOPPED: "state.stopped",
  OFFLINE: "state.offline",
};

export default function VehiclesScreen() {
  const { t } = useI18n();
  const { org } = useAuth();
  const router = useRouter();
  const { devices, loading, reload } = useDevices();
  const { locations } = useLiveLocations(org?.id ?? null);
  const speedLimits = useSpeedLimits();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  // Force re-render every second to keep "since" times fresh
  useTicker(1000);

  const rows = useMemo(() => {
    return devices.map((d) => {
      const loc = locations.get(d.imei) ?? null;
      const overspeed = speedLimits.isOverspeed(d.imei, loc?.speed ?? d.lastSpeed);
      return { d, loc, motion: motionOf(d, loc), overspeed };
    });
  }, [devices, locations, speedLimits]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: rows.length, MOVING: 0, IDLE: 0, STOPPED: 0, OFFLINE: 0 };
    for (const r of rows) c[r.motion] += 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter !== "ALL" && r.motion !== filter) return false;
        if (!needle) return true;
        const hay = `${r.d.vehiclePlate ?? ""} ${r.d.name ?? ""} ${r.d.imei}`.toLowerCase();
        return hay.includes(needle);
      })
      // Overspeeding vehicles surface at the top of the list.
      .sort((a, b) => (a.overspeed === b.overspeed ? 0 : a.overspeed ? -1 : 1));
  }, [rows, filter, q]);

  if (loading && rows.length === 0) return <Loading label={t("veh.loading")} />;

  return (
    <View style={styles.screen}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t("veh.search")}
        placeholderTextColor={colors.textFaint}
        style={styles.search}
      />
      <View style={styles.chips}>
        {(["ALL", "MOVING", "IDLE", "STOPPED", "OFFLINE"] as Filter[]).map((f) => (
          <Chip key={f} label={`${t(FILTER_KEY[f])} (${counts[f]})`} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.d.imei}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
        ListEmptyComponent={<EmptyState text={t("veh.noneMatch")} />}
        renderItem={({ item }) => (
          <VehicleCard
            device={item.d}
            loc={item.loc}
            motion={item.motion}
            overspeed={item.overspeed}
            onPress={() => router.push({ pathname: "/device/[imei]", params: { imei: item.d.imei } })}
          />
        )}
      />
    </View>
  );
}

function VehicleCard({
  device,
  loc,
  motion,
  overspeed,
  onPress,
}: {
  device: DeviceView;
  loc: LocationView | null;
  motion: MotionStatus;
  overspeed: boolean;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const speed = loc?.speed ?? device.lastSpeed ?? 0;
  const accOn = loc?.accOn;
  const parked = (motion === "STOPPED" || motion === "OFFLINE") && device.parkedSince;
  const expired = subscriptionExpired(device);
  const daysLeft = subscriptionDaysLeft(device);
  const expiringSoon = !expired && daysLeft != null && daysLeft <= 7;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, overspeed && styles.cardOverspeed, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.plate, overspeed && styles.plateOverspeed]}>
          {device.vehiclePlate ?? device.name ?? device.imei}
        </Text>
        <Text style={[styles.speed, overspeed && styles.plateOverspeed]}>
          {speed} {t("veh.kmh")}
        </Text>
      </View>
      {device.name && device.vehiclePlate ? <Text style={styles.sub}>{device.name}</Text> : null}
      <View style={styles.pills}>
        {overspeed ? (
          <Pill label={t("state.overspeed")} color={colors.danger} />
        ) : (
          <Pill label={t(FILTER_KEY[motion])} color={motionColor(motion)} />
        )}
        {accOn != null ? (
          <Pill
            label={accOn ? t("veh.ignitionOn") : t("veh.ignitionOff")}
            color={accOn ? colors.ok : colors.textFaint}
          />
        ) : null}
        {device.engineLocked ? <Pill label={`🔒 ${t("track.locked")}`} color={colors.danger} /> : null}
        {expired ? <Pill label={t("sub.expired")} color={colors.danger} /> : null}
        {expiringSoon ? <Pill label={t("sub.expiringSoon")} color={colors.warn} /> : null}
      </View>
      <Text style={styles.seen}>
        {parked
          ? `${t("veh.parkedFor")} ${fmtSince(device.parkedSince)}`
          : `${t("veh.lastSeen")} ${fmtAgo(device.lastSeenAt)}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  search: {
    margin: space.md,
    marginBottom: space.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    color: colors.text,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.sm },
  list: { padding: space.md, paddingTop: space.xs, gap: space.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: 6,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardOverspeed: { borderColor: colors.danger },
  plateOverspeed: { color: colors.danger },
  plate: { color: colors.text, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  speed: { color: colors.textDim, fontSize: 13 },
  sub: { color: colors.textFaint, fontSize: 13 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: 2 },
  seen: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
});
