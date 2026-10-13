import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useDevices } from "@/hooks/useDevices";
import { useGroups } from "@/hooks/useGroups";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { useTicker } from "@/hooks/useTicker";
import { Chip, EmptyState, Loading, Pill } from "@/ui";
import { batteryColor, fmtAgo, fmtSince, motionColor, motionOf, subscriptionDaysLeft, subscriptionExpired } from "@/format";
import { fmtDay } from "@/localDate";
import { useDevicePhotos } from "@/photos";
import { useSpeedLimits } from "@/hooks/useSpeedLimits";
import { useNightRest } from "@/hooks/useNightRest";
import { restingUntil } from "@/geocode";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { DeviceView, LocationView, MotionStatus } from "@/types";

type Filter = "ALL" | "MOVING" | "IDLE" | "STOPPED" | "OFFLINE" | "EXPIRED" | "NODATA";

/** Section id for people not in one of the user's groups. */
const UNGROUPED = "__ungrouped";

const FILTER_KEY: Record<Filter, StringKey> = {
  ALL: "common.all",
  MOVING: "state.moving",
  IDLE: "state.idle",
  STOPPED: "state.stopped",
  OFFLINE: "state.offline",
  EXPIRED: "ppl.expired",
  NODATA: "ppl.nodata",
};

export default function VehiclesScreen() {
  const { t } = useI18n();
  const { org } = useAuth();
  const router = useRouter();
  const { devices, loading, reload } = useDevices();
  const restByImei = useNightRest();
  const { locations } = useLiveLocations(org?.id ?? null);
  const speedLimits = useSpeedLimits();
  const photos = useDevicePhotos(devices);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  // The user's own groups (as in the web list's accordion); collapsed sections are kept per visit.
  const { groups } = useGroups();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Home status cards link here with ?state=MOVING|IDLE|STOPPED|OFFLINE (n re-applies the same link).
  const { state: stateParam, n: linkNonce } = useLocalSearchParams<{ state?: string; n?: string }>();
  useEffect(() => {
    if (stateParam && stateParam in FILTER_KEY) setFilter(stateParam as Filter);
  }, [stateParam, linkNonce]);
  // Force re-render every second to keep "since" times fresh
  useTicker(1000);

  const rows = useMemo(() => {
    return devices.map((d) => {
      const loc = locations.get(d.imei) ?? null;
      const overspeed = speedLimits.isOverspeed(d.imei, loc?.speed ?? d.lastSpeed);
      const motion = motionOf(d, loc);
      // Same exclusive states as the web list: a lapsed subscription or a tracker never heard from first.
      const state: Exclude<Filter, "ALL"> = subscriptionExpired(d)
        ? "EXPIRED"
        : d.status === "NEVER_CONNECTED" || !d.lastSeenAt
          ? "NODATA"
          : motion;
      return { d, loc, motion, state, overspeed };
    });
  }, [devices, locations, speedLimits]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: rows.length, MOVING: 0, IDLE: 0, STOPPED: 0, OFFLINE: 0, EXPIRED: 0, NODATA: 0 };
    for (const r of rows) c[r.state] += 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter !== "ALL" && r.state !== filter) return false;
        if (!needle) return true;
        const hay = `${r.d.vehiclePlate ?? ""} ${r.d.name ?? ""} ${r.d.imei}`.toLowerCase();
        return hay.includes(needle);
      })
      // Overspeeding vehicles surface at the top of the list.
      .sort((a, b) => {
        if (a.overspeed !== b.overspeed) return a.overspeed ? -1 : 1;
        // Then most recently heard from first, as on the web.
        const at = a.loc?.ts ?? a.d.lastSeenAt ?? "";
        const bt = b.loc?.ts ?? b.d.lastSeenAt ?? "";
        return bt < at ? -1 : bt > at ? 1 : 0;
      });
  }, [rows, filter, q]);

  type Row = (typeof filtered)[number];
  const sections = useMemo(() => {
    // No groups: one plain list without headers.
    if (groups.length === 0) return [{ id: UNGROUPED, name: "", color: "", total: filtered.length, data: filtered }];
    const known = new Set(groups.map((g) => g.id));
    const byGroup = new Map<string, Row[]>();
    for (const r of filtered) {
      const key = r.d.groupId && known.has(r.d.groupId) ? r.d.groupId : UNGROUPED;
      byGroup.set(key, [...(byGroup.get(key) ?? []), r]);
    }
    const searching = q.trim() !== "" || filter !== "ALL";
    const out = [
      { id: UNGROUPED, name: t("pe.ungrouped"), color: colors.offline, rows: byGroup.get(UNGROUPED) ?? [] },
      ...groups.map((g) => ({ id: g.id, name: g.name, color: g.color, rows: byGroup.get(g.id) ?? [] })),
    ];
    return out
      .filter((sec) => sec.rows.length > 0 || (!searching && sec.id !== UNGROUPED))
      .map((sec) => ({ id: sec.id, name: sec.name, color: sec.color, total: sec.rows.length, data: collapsed.has(sec.id) ? [] : sec.rows }));
  }, [filtered, groups, collapsed, q, filter, t]);

  const toggleSection = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
        {(["ALL", "MOVING", "IDLE", "STOPPED", "OFFLINE", "EXPIRED", "NODATA"] as Filter[])
          .filter((f) => (f !== "EXPIRED" && f !== "NODATA") || counts[f] > 0 || filter === f)
          .map((f) => (
          <Chip key={f} label={`${t(FILTER_KEY[f])} (${counts[f]})`} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(r) => r.d.imei}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
        ListEmptyComponent={<EmptyState text={t("veh.noneMatch")} />}
        renderSectionHeader={({ section }) =>
          section.name ? (
            <Pressable
              onPress={() => toggleSection(section.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: !collapsed.has(section.id) }}
              style={({ pressed }) => [styles.groupHead, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name={collapsed.has(section.id) ? "chevron-forward" : "chevron-down"} size={18} color={colors.textDim} />
              <View style={[styles.groupDot, { backgroundColor: section.color }]} />
              <Text style={styles.groupName} numberOfLines={1}>
                {section.name}
              </Text>
              <Text style={styles.groupCount}>{section.total}</Text>
            </Pressable>
          ) : null
        }
        ListFooterComponent={
          <Pressable onPress={() => router.push("/groups")} accessibilityRole="button" style={styles.manage} hitSlop={8}>
            <Ionicons name="folder-open-outline" size={18} color={colors.brand} />
            <Text style={styles.manageText}>{t("grp.manage")}</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <VehicleCard
            device={item.d}
            loc={item.loc}
            motion={item.motion}
            overspeed={item.overspeed}
            photo={photos[item.d.imei] ?? null}
            restingUntil={item.motion === "OFFLINE" ? restingUntil(restByImei.get(item.d.imei)) : null}
            onPress={() => router.push({ pathname: "/device/[imei]", params: { imei: item.d.imei } })}
            onLongPress={() => router.push({ pathname: "/person-edit", params: { imei: item.d.imei } })}
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
  photo,
  restingUntil: wakesAt,
  onPress,
  onLongPress,
}: {
  device: DeviceView;
  loc: LocationView | null;
  motion: MotionStatus;
  overspeed: boolean;
  /** data: URI of the uploaded photo, or null. */
  photo: string | null;
  /** "07:00" while the tracker is switched off for its night rest. */
  restingUntil: string | null;
  onPress: () => void;
  /** Opens "Edit person" (name, class, group). */
  onLongPress?: () => void;
}) {
  const { t, locale } = useI18n();
  const speed = loc?.speed ?? device.lastSpeed ?? 0;
  const parked = (motion === "STOPPED" || motion === "OFFLINE") && device.parkedSince;
  const expired = subscriptionExpired(device);
  const daysLeft = subscriptionDaysLeft(device);
  const expiringSoon = !expired && daysLeft != null && daysLeft <= 7;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, overspeed && styles.cardOverspeed, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cardTop}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={[styles.avatar, { borderColor: overspeed ? colors.danger : motionColor(motion) }]}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <Text style={[styles.plate, styles.plateGrow, overspeed && styles.plateOverspeed]} numberOfLines={1}>
          {device.name ?? device.vehiclePlate ?? device.imei}
        </Text>
        <Text style={[styles.speed, overspeed && styles.plateOverspeed]}>
          {speed} {t("veh.kmh")}
        </Text>
      </View>
      {device.name && device.vehiclePlate ? <Text style={styles.sub}>{device.vehiclePlate}</Text> : null}
      <View style={styles.pills}>
        {overspeed ? (
          <Pill label={t("state.overspeed")} color={colors.danger} />
        ) : (
          <Pill label={t(FILTER_KEY[motion])} color={motionColor(motion)} />
        )}
        {device.batteryPercent != null ? (
          <Pill
            label={`${t("veh.battery")} ${Math.round(device.batteryPercent)}%`}
            color={batteryColor(device.batteryPercent)}
          />
        ) : null}
        {expired ? <Pill label={t("sub.expired")} color={colors.danger} /> : null}
        {expiringSoon ? <Pill label={t("sub.expiringSoon")} color={colors.warn} /> : null}
      </View>
      <Text style={styles.seen}>
        {wakesAt
          ? `${t("veh.resting")} ${wakesAt}`
          : parked
            ? `${t("veh.parkedFor")} ${fmtSince(device.parkedSince)}`
            : `${t("veh.lastSeen")} ${fmtAgo(device.lastSeenAt)}`}
      </Text>
      {device.subscriptionExpiresAt ? (
        <Text style={[styles.seen, expired && { color: colors.danger, fontWeight: "700" }]}>
          {t("sub.expiresOn")} {fmtDay(device.subscriptionExpiresAt, locale)}
        </Text>
      ) : null}
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
  groupHead: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 44, paddingTop: space.xs },
  groupDot: { width: 12, height: 12, borderRadius: 6 },
  groupName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" },
  groupCount: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
  manage: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, minHeight: 48, marginTop: space.sm },
  manageText: { color: colors.brand, fontSize: 15, fontWeight: "700" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: 6,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, backgroundColor: colors.surfaceAlt },
  plateGrow: { flex: 1 },
  cardOverspeed: { borderColor: colors.danger },
  plateOverspeed: { color: colors.danger },
  plate: { color: colors.text, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  speed: { color: colors.textDim, fontSize: 14 },
  sub: { color: colors.textFaint, fontSize: 14 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: 2 },
  seen: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
});
