import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { listGeofences, listPlaceSchedules } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { PLACE_ICON, placeTypeKey } from "@/places";
import { Loading } from "@/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { fmtDistance } from "@/format";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { GeofenceView, PlaceSchedule, PlaceType } from "@/types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const NOTIFY_KEY: Record<GeofenceView["notifyOn"], StringKey> = {
  ENTER: "geo.enterOnly",
  EXIT: "geo.exitOnly",
  BOTH: "geo.enterExit",
  NONE: "geo.noneOption",
};

/** Quiet retries after a failed load (a request right after resuming often fails once): 3 s, 6 s, 12 s, then stop. */
const RETRY_MS = 3_000;
const MAX_RETRIES = 3;

/**
 * Home (owner, 2026-11-02/03): what a carer sets up, nothing else. A grid of tiles in the style of
 * the old status cards - trusted places, geofences, arrival / leaving times, stays - then the
 * places, each with its expected times, and the geofences. The status counts, alarm and distance
 * cards and today's arrivals were removed.
 */
export default function HomeScreen() {
  const { t } = useI18n();
  const { org, user } = useAuth();
  const router = useRouter();
  const [places, setPlaces] = useState<GeofenceView[]>([]);
  const [fences, setFences] = useState<GeofenceView[]>([]);
  const [times, setTimes] = useState<Record<string, PlaceSchedule[]>>({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempts = useRef(0);

  const reload = useCallback(async (quiet = false, fresh = false) => {
    if (retry.current) clearTimeout(retry.current);
    if (fresh) attempts.current = 0;
    if (!quiet) setLoading(true);
    try {
      const [p, f] = await Promise.all([
        listGeofences("TRUSTED_PLACE"),
        listGeofences("BOUNDARY"),
      ]);
      // One small request per place; a failure only hides that place's times.
      const entries = await Promise.all(
        p.map(
          async (pl) =>
            [
              pl.id,
              await listPlaceSchedules(pl.id).catch(
                () => [] as PlaceSchedule[],
              ),
            ] as const,
        ),
      );
      setPlaces(p);
      setFences(f);
      setTimes(Object.fromEntries(entries));
      setError(null);
      setLoaded(true);
      attempts.current = 0;
    } catch (e) {
      // Keep what is on screen and try again shortly; the user is only told when there is nothing
      // to show. Pull to refresh, coming back to the tab or to the app starts a new round.
      setError(extractError(e).message);
      if (attempts.current < MAX_RETRIES) {
        const delay = RETRY_MS * 2 ** attempts.current;
        attempts.current += 1;
        retry.current = setTimeout(() => void reload(true), delay);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload(true, true);
    }, [reload]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void reload(true, true);
    });
    return () => {
      sub.remove();
      if (retry.current) clearTimeout(retry.current);
    };
  }, [reload]);

  if (!loaded && !error) return <Loading label={t("home.loading")} />;

  const timedPlaces = places.filter((p) =>
    (times[p.id] ?? []).some((s) => s.active !== false),
  ).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => void reload(false, true)}
          tintColor={colors.brand}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="shield-checkmark" size={26} color={colors.onAccent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {org?.name ?? t("home.fleet")}
          </Text>
          {user?.fullName ? (
            <Text style={styles.heroSub} numberOfLines={1}>
              {user.fullName}
            </Text>
          ) : null}
        </View>
        <LanguageToggle />
      </View>

      {error && !loaded ? (
        <Pressable
          style={styles.errorBox}
          onPress={() => void reload(false, true)}
          accessibilityRole="button"
        >
          <Ionicons
            name="cloud-offline-outline"
            size={22}
            color={colors.danger}
          />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorRetry}>{t("common.retry")}</Text>
        </Pressable>
      ) : null}

      {loaded ? (
        <>
          <View style={styles.grid}>
            <Tile
              icon="home"
              tint={colors.accent}
              iconColor={colors.onAccent}
              value={places.length}
              label={t("home.places")}
              onPress={() => router.push("/places")}
            />
            <Tile
              icon="shield-outline"
              tint={colors.brand}
              iconColor={colors.onBrand}
              value={fences.length}
              label={t("home.geofences")}
              onPress={() => router.push("/geofences")}
            />
            <Tile
              icon="alarm-outline"
              tint={colors.brandSoft}
              iconColor={colors.brand}
              value={timedPlaces}
              label={t("homez.timesTile")}
              onPress={() => router.push("/places")}
            />
            <Tile
              icon="time-outline"
              tint={colors.brandSoft}
              iconColor={colors.brand}
              label={t("stays.title")}
              onPress={() => router.push("/stays")}
            />
          </View>

          {/* ── Trusted places + expected times ───────────────────────── */}
          <SectionHeader
            icon="home-outline"
            title={t("home.places")}
            onAll={() => router.push("/places")}
          />
          <View style={styles.group}>
            {places.length === 0 ? (
              <Text style={styles.empty}>{t("place.none")}</Text>
            ) : null}
            {places.map((p, i) => (
              <PlaceRow
                key={p.id}
                first={i === 0}
                place={p}
                schedules={times[p.id] ?? []}
                onEdit={() =>
                  router.push({ pathname: "/place-new", params: { id: p.id } })
                }
                onTimes={() =>
                  router.push({
                    pathname: "/place-times",
                    params: { id: p.id, name: p.name },
                  })
                }
              />
            ))}
            <AddRow
              first={places.length === 0}
              label={t("place.add")}
              onPress={() => router.push("/place-new")}
            />
          </View>

          {/* ── Geofences ─────────────────────────────────────────────── */}
          <SectionHeader
            icon="shield-outline"
            title={t("home.geofences")}
            onAll={() => router.push("/geofences")}
          />
          <View style={styles.group}>
            {fences.length === 0 ? (
              <Text style={styles.empty}>{t("geo.none")}</Text>
            ) : null}
            {fences.map((g, i) => (
              <Pressable
                key={g.id}
                onPress={() =>
                  router.push({
                    pathname: "/geofence-new",
                    params: { id: g.id },
                  })
                }
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${g.name}, ${t("geo.edit")}`}
              >
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: g.color ?? colors.brand },
                  ]}
                >
                  <Ionicons
                    name={
                      g.type === "POLYGON"
                        ? "git-network-outline"
                        : "radio-button-on-outline"
                    }
                    size={20}
                    color={colors.onBrand}
                  />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.name} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {g.type === "POLYGON"
                      ? t("geo.polygon")
                      : `${t("geo.circle")}${g.radiusM != null ? ` · ${fmtDistance(g.radiusM)}` : ""}`}
                    {"  ·  "}
                    {t(NOTIFY_KEY[g.notifyOn])}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textFaint}
                />
              </Pressable>
            ))}
            <AddRow
              first={fences.length === 0}
              label={t("homez.addBoundary")}
              onPress={() => router.push("/geofence-new")}
            />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function Tile({
  icon,
  tint,
  iconColor,
  value,
  label,
  onPress,
}: {
  icon: IconName;
  tint: string;
  iconColor: string;
  value?: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={value != null ? `${label}: ${value}` : label}
    >
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        {value != null ? <Text style={styles.tileValue}>{value}</Text> : null}
      </View>
      <View style={styles.tileBottom}>
        <Text style={styles.tileLabel} numberOfLines={2}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </View>
    </Pressable>
  );
}

function SectionHeader({
  icon,
  title,
  onAll,
}: {
  icon: IconName;
  title: string;
  onAll: () => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.sectionRow}>
      <Ionicons name={icon} size={18} color={colors.textDim} />
      <Text style={styles.section}>{title}</Text>
      <Pressable
        onPress={onAll}
        hitSlop={10}
        style={styles.seeAll}
        accessibilityRole="link"
      >
        <Text style={styles.seeAllText}>{t("homez.seeAll")}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.brand} />
      </Pressable>
    </View>
  );
}

function AddRow({
  label,
  onPress,
  first,
}: {
  label: string;
  onPress: () => void;
  first: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.addRow,
        !first && styles.rowDivider,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name="add-circle" size={22} color={colors.brand} />
      <Text style={styles.addText}>{label}</Text>
    </Pressable>
  );
}

function PlaceRow({
  place,
  schedules,
  first,
  onEdit,
  onTimes,
}: {
  place: GeofenceView;
  schedules: PlaceSchedule[];
  first: boolean;
  onEdit: () => void;
  onTimes: () => void;
}) {
  const { t } = useI18n();
  const type = (place.placeType ?? "OTHER") as PlaceType;
  const active = schedules.filter((s) => s.active !== false);
  const arrive = active
    .filter((s) => s.kind === "ARRIVE_BY")
    .map((s) => s.time);
  const leave = active.filter((s) => s.kind === "LEAVE_BY").map((s) => s.time);
  const hasTimes = arrive.length + leave.length > 0;
  return (
    <View style={!first && styles.rowDivider}>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${place.name}, ${t("place.edit")}`}
      >
        <View style={[styles.rowIcon, { backgroundColor: colors.accent }]}>
          <Ionicons
            name={PLACE_ICON[type] ?? "location-outline"}
            size={20}
            color={colors.onAccent}
          />
        </View>
        <View style={styles.rowMain}>
          <Text style={styles.name} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {place.address ?? t(placeTypeKey(type))}
            {place.radiusM != null ? `  ·  ${fmtDistance(place.radiusM)}` : ""}
          </Text>
          <Text
            style={[
              styles.alerts,
              place.notifyOn === "NONE" && { color: colors.textFaint },
            ]}
            numberOfLines={1}
          >
            {t(`place.alerts.${place.notifyOn}` as StringKey)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
      </Pressable>
      <Pressable
        onPress={onTimes}
        style={({ pressed }) => [styles.timesRow, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${place.name}, ${t("place.times")}`}
      >
        <Ionicons name="alarm-outline" size={18} color={colors.brand} />
        {hasTimes ? (
          <View style={styles.timeChips}>
            {arrive.map((tm, i) => (
              <TimeChip
                key={`a${i}`}
                icon="log-in-outline"
                label={`${t("homez.arrives")} ${tm}`}
              />
            ))}
            {leave.map((tm, i) => (
              <TimeChip
                key={`l${i}`}
                icon="log-out-outline"
                label={`${t("homez.leaves")} ${tm}`}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.setTimes}>{t("homez.setTimes")}</Text>
        )}
        <Ionicons
          name={hasTimes ? "create-outline" : "add"}
          size={18}
          color={colors.brand}
        />
      </Pressable>
    </View>
  );
}

function TimeChip({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.timeChip}>
      <Ionicons name={icon} size={14} color={colors.brand} />
      <Text style={styles.timeChipText}>{label}</Text>
    </View>
  );
}

const card = {
  backgroundColor: colors.surface,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  pressed: { opacity: 0.75 },

  hero: {
    ...card,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: colors.text, fontSize: 19, fontWeight: "800" },
  heroSub: { color: colors.textFaint, fontSize: 14, marginTop: 2 },

  errorBox: {
    ...card,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderColor: colors.danger,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 14 },
  errorRetry: { color: colors.brand, fontSize: 14, fontWeight: "700" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  tile: {
    ...card,
    flexGrow: 1,
    flexBasis: "45%",
    padding: space.md,
    gap: space.md,
    minHeight: 112,
  },
  tileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileValue: { color: colors.text, fontSize: 26, fontWeight: "800" },
  tileBottom: { flexDirection: "row", alignItems: "center", gap: space.xs },
  tileLabel: {
    flex: 1,
    color: colors.textDim,
    fontSize: 14,
    fontWeight: "700",
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.sm,
  },
  section: { flex: 1, color: colors.textDim, fontSize: 15, fontWeight: "800" },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 32 },
  seeAllText: { color: colors.brand, fontSize: 14, fontWeight: "700" },

  group: { ...card, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    minHeight: 64,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMain: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  alerts: {
    color: colors.brand,
    fontSize: 13,
    marginTop: 2,
    fontWeight: "600",
  },

  timesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 44,
    marginHorizontal: space.md,
    marginBottom: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
  },
  timeChips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  timeChipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  setTimes: { flex: 1, color: colors.brand, fontSize: 14, fontWeight: "700" },

  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    minHeight: 52,
  },
  addText: { color: colors.brand, fontSize: 15, fontWeight: "700" },
  empty: { color: colors.textFaint, fontSize: 14, padding: space.md },
});
