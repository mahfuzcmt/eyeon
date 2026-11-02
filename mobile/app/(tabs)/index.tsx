import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useDevices } from "@/hooks/useDevices";
import { useTodayPlaceVisits } from "@/hooks/useTodayPlaceVisits";
import { Ionicons } from "@expo/vector-icons";
import { listGeofences, listPlaceSchedules } from "@/api/endpoints";
import { PLACE_ICON, placeTypeKey } from "@/places";
import { Chip, Loading } from "@/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { fmtDistance, fmtTime } from "@/format";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { GeofenceView, PlaceSchedule, PlaceType } from "@/types";

const NOTIFY_KEY: Record<GeofenceView["notifyOn"], StringKey> = {
  ENTER: "geo.enterOnly",
  EXIT: "geo.exitOnly",
  BOTH: "geo.enterExit",
  NONE: "geo.noneOption",
};

/**
 * Home (owner's request 2026-11-02): only what a carer configures - trusted places with their
 * expected arrival / leaving times, and geofences - plus today's arrivals and departures. The
 * status counts (moving, paused, offline, ...), alarm and distance cards were removed.
 */
export default function HomeScreen() {
  const { t } = useI18n();
  const { org, user } = useAuth();
  const router = useRouter();
  const { devices, loading: devicesLoading, reload: reloadDevices } = useDevices();
  const [places, setPlaces] = useState<GeofenceView[]>([]);
  const [fences, setFences] = useState<GeofenceView[]>([]);
  const [times, setTimes] = useState<Record<string, PlaceSchedule[]>>({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, f] = await Promise.all([listGeofences("TRUSTED_PLACE"), listGeofences("BOUNDARY")]);
      setPlaces(p);
      setFences(f);
      // One small request per place; a failure only hides that place's times.
      const entries = await Promise.all(
        p.map(async (pl) => [pl.id, await listPlaceSchedules(pl.id).catch(() => [] as PlaceSchedule[])] as const),
      );
      setTimes(Object.fromEntries(entries));
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [t]);

  // Refresh on focus, so a place or time edited on another screen shows here at once.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const selectedImei = picked ?? devices[0]?.imei ?? null;

  if (!loaded && loading) return <Loading label={t("home.loading")} />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading || devicesLoading}
          onRefresh={() => {
            void reload();
            reloadDevices();
          }}
          tintColor={colors.brand}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>{org?.name ?? t("home.fleet")}</Text>
          {user?.fullName ? <Text style={styles.sub}>{user.fullName}</Text> : null}
        </View>
        <LanguageToggle />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* ── Trusted places + expected times ───────────────────────── */}
      <SectionHeader title={t("home.places")} onAll={() => router.push("/places")} />
      <Text style={styles.linkSub}>{t("homez.placesSub")}</Text>
      {places.length === 0 && !loading ? <Text style={styles.empty}>{t("place.none")}</Text> : null}
      {places.map((p) => (
        <PlaceCard
          key={p.id}
          place={p}
          schedules={times[p.id] ?? []}
          onEdit={() => router.push({ pathname: "/place-new", params: { id: p.id } })}
          onTimes={() => router.push({ pathname: "/place-times", params: { id: p.id, name: p.name } })}
        />
      ))}
      <AddButton label={t("place.add")} onPress={() => router.push("/place-new")} />

      {/* ── Geofences ─────────────────────────────────────────────── */}
      <SectionHeader title={t("home.geofences")} onAll={() => router.push("/geofences")} />
      <Text style={styles.linkSub}>{t("home.geofenceSub")}</Text>
      {fences.length === 0 && !loading ? <Text style={styles.empty}>{t("geo.none")}</Text> : null}
      {fences.map((g) => (
        <Pressable
          key={g.id}
          onPress={() => router.push({ pathname: "/geofence-new", params: { id: g.id } })}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={`${g.name}, ${t("geo.edit")}`}
        >
          <View style={[styles.iconTile, { backgroundColor: g.color ?? colors.brand }]}>
            <Ionicons name="shield-outline" size={22} color={colors.onBrand} />
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.name} numberOfLines={1}>
              {g.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {g.type === "POLYGON" ? t("geo.polygon") : `${t("geo.circle")}${g.radiusM != null ? ` · ${fmtDistance(g.radiusM)}` : ""}`}
              {"  ·  "}
              {t(NOTIFY_KEY[g.notifyOn])}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
        </Pressable>
      ))}
      <AddButton label={t("homez.addBoundary")} onPress={() => router.push("/geofence-new")} />

      {/* ── Today's arrivals / departures ─────────────────────────── */}
      {devices.length > 0 ? (
        <>
          <Text style={styles.section}>{t("homez.today")}</Text>
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
            <PlaceVisitsCard imei={selectedImei} onAll={() => router.push({ pathname: "/stays", params: { imei: selectedImei } })} />
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function SectionHeader({ title, onAll }: { title: string; onAll: () => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.section, { flex: 1 }]}>{title}</Text>
      <Text style={[styles.openLink, { marginTop: space.md }]} onPress={onAll} accessibilityRole="link">
        {t("homez.seeAll")} →
      </Text>
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name="add-circle-outline" size={20} color={colors.brand} />
      <Text style={styles.addText}>{label}</Text>
    </Pressable>
  );
}

function PlaceCard({
  place,
  schedules,
  onEdit,
  onTimes,
}: {
  place: GeofenceView;
  schedules: PlaceSchedule[];
  onEdit: () => void;
  onTimes: () => void;
}) {
  const { t } = useI18n();
  const type = (place.placeType ?? "OTHER") as PlaceType;
  const active = schedules.filter((s) => s.active !== false);
  const arrive = active.filter((s) => s.kind === "ARRIVE_BY").map((s) => s.time);
  const leave = active.filter((s) => s.kind === "LEAVE_BY").map((s) => s.time);
  return (
    <View style={styles.placeCard}>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [styles.placeTop, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={`${place.name}, ${t("place.edit")}`}
      >
        <View style={[styles.iconTile, { backgroundColor: colors.accent }]}>
          <Ionicons name={PLACE_ICON[type] ?? "location-outline"} size={22} color={colors.onAccent} />
        </View>
        <View style={styles.cardMain}>
          <Text style={styles.name} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {place.address ?? t(placeTypeKey(type))}
            {place.radiusM != null ? `  ·  ${fmtDistance(place.radiusM)}` : ""}
          </Text>
          <Text style={[styles.alerts, place.notifyOn === "NONE" && { color: colors.textFaint }]}>
            {t(`place.alerts.${place.notifyOn}` as StringKey)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
      </Pressable>
      <Pressable
        onPress={onTimes}
        style={({ pressed }) => [styles.timesRow, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={`${place.name}, ${t("place.times")}`}
      >
        <Ionicons name="alarm-outline" size={20} color={colors.brand} />
        {arrive.length + leave.length === 0 ? (
          <Text style={[styles.timesText, { color: colors.brand, fontWeight: "600" }]}>{t("homez.setTimes")}</Text>
        ) : (
          <Text style={styles.timesText}>
            {arrive.length ? `${t("homez.arrives")} ${arrive.join(", ")}` : ""}
            {arrive.length && leave.length ? "  ·  " : ""}
            {leave.length ? `${t("homez.leaves")} ${leave.join(", ")}` : ""}
          </Text>
        )}
        <Ionicons name="create-outline" size={18} color={colors.textFaint} />
      </Pressable>
    </View>
  );
}

/**
 * Arrival / leaving times at the person's places and boundaries today and how long they
 * stayed (client feedback 2026-11-01), paired from PLACE_ARRIVED/LEFT and GEOFENCE_ENTER/EXIT.
 * Place alarms only reach the place's owner, so each parent sees their own places.
 */
function PlaceVisitsCard({ imei, onAll }: { imei: string; onAll: () => void }) {
  const { t } = useI18n();
  const { visits, loading } = useTodayPlaceVisits(imei);
  const length = (seconds: number): string => {
    const mins = Math.max(1, Math.round(seconds / 60));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} ${t("stays.unit.h")}`);
    if (m > 0) parts.push(`${m} ${t("stays.unit.min")}`);
    return parts.join(" ");
  };
  return (
    <View style={styles.statsCard}>
      <View>
        <Text style={styles.linkTitle}>{t("homev.title")}</Text>
        <Text style={styles.linkSub}>{t("homev.hint")}</Text>
      </View>
      {loading && visits.length === 0 ? (
        <Text style={styles.loadingText}>{t("homev.loading")}</Text>
      ) : visits.length === 0 ? (
        <Text style={styles.loadingText}>{t("homev.none")}</Text>
      ) : (
        visits.map((v, i) => {
          const boundary = v.kind === "BOUNDARY";
          const icon = boundary ? "shield-outline" : PLACE_ICON[(v.placeType as PlaceType) ?? "OTHER"] ?? "location-outline";
          return (
            <View key={`${v.geofenceId}-${v.from ?? "start"}-${i}`} style={styles.visit}>
              <View style={[styles.visitIcon, !v.to && { backgroundColor: colors.brand }]}>
                <Ionicons name={icon} size={18} color={v.to ? colors.brand : colors.onBrand} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.visitName} numberOfLines={1}>
                  {v.name}
                  {boundary ? <Text style={styles.visitKind}> · {t("homev.boundary")}</Text> : null}
                </Text>
                <Text style={styles.visitTimes}>
                  {t("homev.arrived")} {v.from ? fmtTime(v.from) : t("homev.beforeToday")}
                  {"  →  "}
                  {v.to ? `${t("homev.left")} ${fmtTime(v.to)}` : t("homev.stillThere")}
                </Text>
              </View>
              <View style={styles.visitLen}>
                <Text style={styles.visitLenValue}>{length(v.seconds)}</Text>
                <Text style={styles.visitLenLabel}>{v.to ? t("homev.stayed") : t("homev.inside")}</Text>
              </View>
            </View>
          );
        })
      )}
      <Text style={styles.openLink} onPress={onAll}>
        {t("stays.title")} →
      </Text>
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
  linkTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  linkSub: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  picker: { gap: space.sm, paddingVertical: space.xs, paddingRight: space.md },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.md,
  },
  openLink: { color: colors.brand, fontWeight: "600", fontSize: 14 },
  visit: { flexDirection: "row", alignItems: "center", gap: space.md },
  visitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  visitName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  visitKind: { color: colors.textFaint, fontSize: 13, fontWeight: "400" },
  visitTimes: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  visitLen: { alignItems: "flex-end" },
  visitLenValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  visitLenLabel: { color: colors.textFaint, fontSize: 12 },
  loadingText: { color: colors.textFaint, fontSize: 14 },
  empty: { color: colors.textFaint, fontSize: 15 },
  sectionRow: { flexDirection: "row", alignItems: "center" },
  error: { color: colors.danger, fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  placeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  placeTop: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  timesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timesText: { flex: 1, color: colors.text, fontSize: 14 },
  iconTile: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  cardMain: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  alerts: { color: colors.brand, fontSize: 13, marginTop: 2, fontWeight: "600" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.brand,
  },
  addText: { color: colors.brand, fontSize: 15, fontWeight: "700" },
});
