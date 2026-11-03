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
import { Loading } from "@/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { GeofenceView, PlaceSchedule } from "@/types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];


/** Quiet retries after a failed load (a request right after resuming often fails once): 3 s, 6 s, 12 s, then stop. */
const RETRY_MS = 3_000;
const MAX_RETRIES = 3;

/**
 * Home (owner, 2026-11-02/03): what a carer sets up, nothing else. A grid of tiles in the style of
 * the old status cards - trusted places, geofences, arrival / leaving times, stays - and below
 * them the space reserved for sponsor ads. The status counts, alarm and distance
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

          <SponsorBanner />
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

/**
 * Space reserved for sponsors (owner, 2026-11-03): it will become an ad slider. Until there are
 * sponsors it is a plain placeholder, so the layout is final now.
 */
function SponsorBanner() {
  const { t } = useI18n();
  return (
    <View style={styles.sponsor} accessibilityLabel={t("homez.sponsor")}>
      <Text style={styles.sponsorTag}>{t("homez.sponsorTag")}</Text>
      <Ionicons name="megaphone-outline" size={34} color={colors.brand} />
      <Text style={styles.sponsorText}>{t("homez.sponsor")}</Text>
      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotOn]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
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

  sponsor: {
    ...card,
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    padding: space.lg,
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  sponsorTag: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  sponsorText: {
    color: colors.brand,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  dots: { flexDirection: "row", gap: 6, marginTop: space.xs },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { width: 18, backgroundColor: colors.brand },
});
