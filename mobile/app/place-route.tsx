import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  deletePlaceRoute,
  getGeofence,
  listPlaceRoutes,
  listPlaceSchedules,
  savePlaceRoute,
  snapRoute,
} from "@/api/endpoints";
import { extractError } from "@/api/client";
import WebMap from "@/components/WebMap";
import { Chip, EmptyState, PrimaryButton } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";
import type { GeofenceView, LatLng, PlaceRoute, PlaceSchedule, RouteDirection, RouteMode, RouteSnap } from "@/types";

/**
 * The usual way to and from one trusted place (same as the web "Usual route" dialog). The carer
 * taps the other end and a few turns; the place is always the end of "to" and the start of "from".
 * The server snaps the line to the roads and, around the place's expected times, tells the owner
 * when the person takes another way for two minutes.
 */

const DIRECTIONS: RouteDirection[] = ["TO", "FROM"];
const WIDTHS = [50, 100, 150, 200, 300];
const MAX_TAPS = 23;
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const digits = (v: number | string, bn: boolean) => (bn ? String(v).replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : String(v));
const toLngLat = (pts: LatLng[]): [number, number][] => pts.map((p) => [p.lng, p.lat]);

export default function PlaceRouteScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { t, locale } = useI18n();
  const bn = locale === "bn";
  const { height } = useWindowDimensions();
  const [place, setPlace] = useState<GeofenceView | null>(null);
  const [saved, setSaved] = useState<PlaceRoute[]>([]);
  const [schedules, setSchedules] = useState<PlaceSchedule[]>([]);
  const [direction, setDirection] = useState<RouteDirection>("TO");
  const [taps, setTaps] = useState<LatLng[]>([]);
  const [mode, setMode] = useState<RouteMode>("VEHICLE");
  const [width, setWidth] = useState(100);
  const [snap, setSnap] = useState<RouteSnap | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number; zoom: number; nonce: number } | null>(null);
  const snapSeq = useRef(0);
  /** Set when the line was copied from the other direction: keep it exactly, do not ask the road service. */
  const skipSnap = useRef(false);

  const anchor = place?.center ?? null;
  const placeName = place?.name ?? name ?? "";
  const current = saved.find((r) => r.direction === direction) ?? null;
  const other = saved.find((r) => r.direction !== direction) ?? null;

  const waypoints = useMemo<LatLng[]>(() => {
    if (!anchor) return taps;
    return direction === "TO" ? [...taps, anchor] : [anchor, ...taps];
  }, [taps, anchor, direction]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [g, r, s] = await Promise.all([getGeofence(id), listPlaceRoutes(id), listPlaceSchedules(id)]);
      setPlace(g);
      setSaved(r);
      setSchedules(s);
      setError(null);
      if (g.center) setCenter({ lat: g.center.lat, lng: g.center.lng, zoom: 15, nonce: Date.now() });
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Switching direction (or reloading) starts from what is saved for it.
  useEffect(() => {
    const r = saved.find((x) => x.direction === direction);
    if (r) {
      setTaps(direction === "TO" ? r.waypoints.slice(0, -1) : r.waypoints.slice(1));
      setMode(r.mode);
      setWidth(r.widthM);
      setSnap({ path: r.path, lengthM: r.lengthM, roads: true });
    } else {
      setTaps([]);
      setSnap(null);
    }
    setDirty(false);
  }, [saved, direction]);

  // Snap the edited points to the roads; a newer edit wins over a slower answer.
  useEffect(() => {
    if (!dirty) return;
    if (skipSnap.current) {
      skipSnap.current = false;
      return;
    }
    if (waypoints.length < 2) {
      setSnap(null);
      setSnapping(false);
      return;
    }
    const seq = ++snapSeq.current;
    setSnapping(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const r = await snapRoute(waypoints, mode);
          if (seq === snapSeq.current) setSnap(r);
        } catch (e) {
          if (seq === snapSeq.current) setError(extractError(e).message);
        } finally {
          if (seq === snapSeq.current) setSnapping(false);
        }
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [waypoints, mode, dirty]);

  const line = useMemo<[number, number][]>(
    () => toLngLat(snap?.path ?? (waypoints.length >= 2 ? waypoints : [])),
    [snap, waypoints],
  );
  const ghost = useMemo<[number, number][]>(() => (other ? toLngLat(other.path) : []), [other]);
  const circle = useMemo(
    () => (anchor && place?.radiusM ? { lat: anchor.lat, lng: anchor.lng, radiusM: place.radiusM } : null),
    [anchor, place?.radiusM],
  );

  if (!id) return <EmptyState text={t("common.error")} />;

  const edit = (next: LatLng[]) => {
    setTaps(next);
    setDirty(true);
  };

  /** The other direction's road, reversed: the usual case of coming back the way they went. */
  const copyOther = () => {
    if (!other) return;
    const otherTaps = other.direction === "TO" ? other.waypoints.slice(0, -1) : other.waypoints.slice(1);
    snapSeq.current++;
    skipSnap.current = true;
    setSnapping(false);
    setTaps([...otherTaps].reverse());
    setMode(other.mode);
    setWidth(other.widthM);
    setSnap({ path: [...other.path].reverse(), lengthM: other.lengthM, roads: true });
    setDirty(true);
  };

  const save = async () => {
    if (!snap || taps.length === 0) {
      setError(t("route.tapMore"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await savePlaceRoute(id, direction, { mode, waypoints, path: snap.path, widthM: width });
      await load();
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    Alert.alert(t("common.delete"), t(`route.${direction}` as StringKey).replace("{place}", placeName), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await deletePlaceRoute(id, direction);
              await load();
            } catch (e) {
              setError(extractError(e).message);
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);

  const neededKind = direction === "TO" ? "ARRIVE_BY" : "LEAVE_BY";
  const hasTime = schedules.some((s) => s.kind === neededKind && s.active);
  const km = snap ? digits(Math.round(snap.lengthM / 100) / 10, bn) : "0";
  const canSave = !busy && !snapping && !!snap && taps.length > 0 && (dirty || width !== current?.widthM);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerTitle: t("route.title") }} />
      <View style={styles.tabs}>
        {DIRECTIONS.map((d) => {
          const on = d === direction;
          const has = saved.some((r) => r.direction === d);
          return (
            <Pressable
              key={d}
              onPress={() => setDirection(d)}
              style={[styles.tab, on && styles.tabOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.tabTitle, on && styles.tabTitleOn]} numberOfLines={1}>
                {t(`route.${d}` as StringKey).replace("{place}", placeName)}
              </Text>
              <Text style={[styles.tabSub, on && styles.tabSubOn]}>{has ? t("route.saved") : t("route.notSet")}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: Math.max(260, height * 0.42) }}>
        <WebMap
          center={center}
          circle={circle}
          route={line}
          ghostRoute={ghost}
          pins={taps}
          onMapPress={(p) => {
            if (taps.length < MAX_TAPS) edit([...taps, p]);
          }}
        />
        {(snapping || loading) && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{loading ? t("common.loading") : t("route.snapping")}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>{t("route.hint")}</Text>
        <Text style={styles.hint}>{t(direction === "TO" ? "route.whenTO" : "route.whenFROM")}</Text>
        {!loading && !hasTime ? (
          <Text style={styles.warn}>
            {t("route.needTime").replace("{kind}", t(direction === "TO" ? "route.kindArrive" : "route.kindLeave"))}
          </Text>
        ) : null}
        {snap && !snap.roads && !snapping ? <Text style={styles.amber}>{t("route.straight")}</Text> : null}

        <View style={styles.chips}>
          {(["VEHICLE", "WALK"] as const).map((m) => (
            <Chip
              key={m}
              label={t(m === "WALK" ? "route.walk" : "route.vehicle")}
              active={mode === m}
              onPress={() => {
                setMode(m);
                setDirty(true);
              }}
            />
          ))}
        </View>
        <Text style={styles.summary}>
          {t("route.summary").replace("{n}", digits(waypoints.length, bn)).replace("{km}", km)}
        </Text>

        <Text style={styles.label}>{t("route.width")}</Text>
        <View style={styles.chips}>
          {WIDTHS.map((w) => (
            <Chip key={w} label={`${digits(w, bn)} m`} active={width === w} onPress={() => setWidth(w)} />
          ))}
        </View>

        {other ? (
          <Pressable
            onPress={copyOther}
            disabled={busy}
            style={({ pressed }) => [styles.copy, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Ionicons name="swap-horizontal-outline" size={20} color={colors.brand} />
            <Text style={styles.copyText}>{t(other.direction === "TO" ? "route.sameTO" : "route.sameFROM")}</Text>
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={() => edit(taps.slice(0, -1))}
            disabled={taps.length === 0}
            style={[styles.action, taps.length === 0 && styles.off]}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-undo-outline" size={20} color={colors.brand} />
            <Text style={styles.actionText}>{t("route.undo")}</Text>
          </Pressable>
          <Pressable
            onPress={() => edit([])}
            disabled={taps.length === 0}
            style={[styles.action, taps.length === 0 && styles.off]}
            accessibilityRole="button"
          >
            <Ionicons name="refresh-outline" size={20} color={colors.brand} />
            <Text style={styles.actionText}>{t("route.clear")}</Text>
          </Pressable>
          {current ? (
            <Pressable onPress={remove} disabled={busy} style={styles.action} accessibilityRole="button">
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>{t("common.delete")}</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={t("route.save")} loading={busy} disabled={!canSave} onPress={() => void save()} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: "row", gap: space.sm, padding: space.md },
  tab: {
    flex: 1,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  tabTitleOn: { color: colors.onBrand },
  tabSub: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  tabSubOn: { color: colors.onBrand },
  badge: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  badgeText: { color: colors.text, fontSize: 14 },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  hint: { color: colors.textFaint, fontSize: 14 },
  warn: { color: colors.text, fontSize: 14, backgroundColor: "#FFEEC2", padding: space.md, borderRadius: radius.sm },
  amber: { color: colors.warn, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  summary: { color: colors.text, fontSize: 15, fontWeight: "600" },
  label: { color: colors.textFaint, fontSize: 14 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  action: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: touch.min, paddingHorizontal: space.sm },
  actionText: { color: colors.brand, fontSize: 15, fontWeight: "600" },
  off: { opacity: 0.4 },
  copy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minHeight: touch.min,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: space.md,
  },
  copyText: { color: colors.brand, fontSize: 15, fontWeight: "700", flexShrink: 1 },
  error: { color: colors.danger, fontSize: 14 },
});
