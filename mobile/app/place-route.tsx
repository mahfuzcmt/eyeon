import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  deletePlaceRoute,
  getGeofence,
  listDevices,
  listGeofenceImeis,
  listGeofences,
  listPlaceRoutes,
  listPlaceSchedules,
  routesFromHistory,
  savePlaceRoute,
  snapRoute,
} from "@/api/endpoints";
import { extractError } from "@/api/client";
import WebMap from "@/components/WebMap";
import { ClockTimePicker } from "@/components/ClockTimePicker";
import { Chip, EmptyState, Field, PrimaryButton } from "@/ui";
import { clockText, fmtTime } from "@/format";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";
import type {
  GeofenceView,
  LatLng,
  PlaceRoute,
  PlaceSchedule,
  RouteCandidate,
  RouteDirection,
  RouteLevel,
  RouteMode,
  RouteSnap,
} from "@/types";

/**
 * The usual routes to and from one trusted place (same as the web "Usual route" dialog): several
 * each way, each with a name, its own days and hours and an alert level. The carer taps the other
 * end and a few turns, or picks a trip the person really made; the place is always the end of
 * "to" and the start of "from". During a route's hours the server tells the owner when the person
 * takes another way for two minutes, or sets off and never gets onto it.
 */

const DIRECTIONS: RouteDirection[] = ["TO", "FROM"];
const WIDTHS = [50, 100, 150, 200, 300];
const MAX_TAPS = 23;
const MAX_ROUTES = 10;
/** Shown Sunday first: the school week in Bangladesh runs Sunday to Thursday. ISO numbers, 7 = Sunday. */
const WEEK = [7, 1, 2, 3, 4, 5, 6];
const SCHOOL_DAYS = [7, 1, 2, 3, 4];
const LEVELS: RouteLevel[] = ["INFO", "WARNING", "CRITICAL"];
const LEVEL_COLOR: Record<RouteLevel, string> = { INFO: colors.brand, WARNING: colors.warn, CRITICAL: colors.danger };
/** How many days back "Use a past trip" offers. */
const HISTORY_DAYS = 7;

function shift(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(23 * 60 + 55, Math.max(0, h * 60 + m + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** The date `back` days ago in Dhaka, as YYYY-MM-DD. */
function dhakaDay(back: number): string {
  return new Date(Date.now() + 6 * 3600_000 - back * 86_400_000).toISOString().slice(0, 10);
}
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
  const [places, setPlaces] = useState<GeofenceView[]>([]);
  const [people, setPeople] = useState<{ imei: string; name: string }[]>([]);
  const [direction, setDirection] = useState<RouteDirection>("TO");
  /** The route being edited, or "new". */
  const [selectedId, setSelectedId] = useState<string>("new");
  const [routeName, setRouteName] = useState("");
  const [otherId, setOtherId] = useState("");
  const [days, setDays] = useState<number[]>(SCHOOL_DAYS);
  const [timeFrom, setTimeFrom] = useState("07:00");
  const [timeTo, setTimeTo] = useState("09:00");
  const [level, setLevel] = useState<RouteLevel>("WARNING");
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
  const [histImei, setHistImei] = useState("");
  const [histBack, setHistBack] = useState(0);
  const [trips, setTrips] = useState<RouteCandidate[] | null>(null);
  const [finding, setFinding] = useState(false);
  const snapSeq = useRef(0);
  /** Set when the line was copied (other direction, past trip): keep it exactly, do not ask the road service. */
  const skipSnap = useRef(false);

  const anchor = place?.center ?? null;
  const placeName = place?.name ?? name ?? "";
  const inDirection = useMemo(() => saved.filter((r) => r.direction === direction), [saved, direction]);
  const current = saved.find((r) => r.id === selectedId) ?? null;
  /** The route the other way that this one would mirror: between the same two places when there is one. */
  const other = useMemo(() => {
    const opposite = saved.filter((r) => r.direction !== direction);
    return opposite.find((r) => (r.otherGeofenceId ?? "") === otherId) ?? opposite[0] ?? null;
  }, [saved, direction, otherId]);

  const waypoints = useMemo<LatLng[]>(() => {
    if (!anchor) return taps;
    return direction === "TO" ? [...taps, anchor] : [anchor, ...taps];
  }, [taps, anchor, direction]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [g, r, s, all, imeis, devices] = await Promise.all([
        getGeofence(id),
        listPlaceRoutes(id),
        listPlaceSchedules(id),
        listGeofences("TRUSTED_PLACE"),
        listGeofenceImeis(id),
        listDevices(),
      ]);
      setPlace(g);
      setSaved(r);
      setSchedules(s);
      setPlaces(all.filter((x) => x.id !== id));
      setPeople(imeis.map((imei) => ({ imei, name: devices.find((d) => d.imei === imei)?.name || imei })));
      setHistImei((prev) => prev || imeis[0] || "");
      setError(null);
      if (g.center) setCenter((c) => c ?? { lat: g.center!.lat, lng: g.center!.lng, zoom: 16, nonce: Date.now() });
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // A direction shows its first route, or an empty form when it has none.
  useEffect(() => {
    if (selectedId !== "new" && inDirection.some((r) => r.id === selectedId)) return;
    if (selectedId === "new" && (inDirection.length === 0 || dirty)) return;
    setSelectedId(inDirection[0]?.id ?? "new");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inDirection]);

  /** Hours for a route that has none yet: around the place's expected time when it has one. */
  const defaultHours = useCallback((): { days: number[]; from: string; to: string } => {
    const kind = direction === "TO" ? "ARRIVE_BY" : "LEAVE_BY";
    const s = schedules.find((x) => x.kind === kind && x.active);
    if (s) {
      return direction === "TO"
        ? { days: s.weekdays, from: shift(s.time, -60), to: shift(s.time, 30) }
        : { days: s.weekdays, from: shift(s.time, -30), to: shift(s.time, 120) };
    }
    return direction === "TO"
      ? { days: SCHOOL_DAYS, from: "07:00", to: "09:00" }
      : { days: SCHOOL_DAYS, from: "12:00", to: "15:00" };
  }, [direction, schedules]);

  // Choosing a route (or reloading) starts the form from what is saved for it.
  useEffect(() => {
    const r = saved.find((x) => x.id === selectedId);
    const hours = defaultHours();
    if (r) {
      setTaps(r.direction === "TO" ? r.waypoints.slice(0, -1) : r.waypoints.slice(1));
      setMode(r.mode);
      setWidth(r.widthM);
      setSnap({ path: r.path, lengthM: r.lengthM, roads: true });
      setRouteName(r.name ?? "");
      setOtherId(r.otherGeofenceId ?? "");
      setLevel(r.severity ?? "WARNING");
      setDays(r.weekdays ?? hours.days);
      setTimeFrom(r.timeFrom ?? hours.from);
      setTimeTo(r.timeTo ?? hours.to);
    } else {
      setTaps([]);
      setSnap(null);
      setRouteName("");
      setOtherId("");
      setLevel("WARNING");
      setDays(hours.days);
      setTimeFrom(hours.from);
      setTimeTo(hours.to);
    }
    setTrips(null);
    setDirty(false);
  }, [saved, selectedId, defaultHours]);

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

  /** A trip the person really made, as the line. */
  const applyTrip = (c: RouteCandidate) => {
    const pts = direction === "TO" ? c.waypoints.slice(0, -1) : c.waypoints.slice(1);
    snapSeq.current++;
    skipSnap.current = true;
    setSnapping(false);
    setTaps(pts.slice(0, MAX_TAPS));
    setSnap({ path: c.path, lengthM: c.lengthM, roads: true });
    setDirty(true);
    const mid = c.path[Math.floor(c.path.length / 2)];
    if (mid) setCenter({ lat: mid.lat, lng: mid.lng, zoom: 14, nonce: Date.now() });
  };

  const findTrips = async () => {
    if (!histImei) return;
    setFinding(true);
    setError(null);
    try {
      setTrips(await routesFromHistory(id, histImei, dhakaDay(histBack), direction));
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setFinding(false);
    }
  };

  const otherPlace = places.find((p) => p.id === otherId) ?? null;
  const title = (d: RouteDirection) => t(`route.${d}` as StringKey).replace("{place}", placeName);
  /** What a route is called when the carer gave it no name. */
  const autoName = otherPlace
    ? direction === "TO"
      ? `${otherPlace.name} → ${placeName}`
      : `${placeName} → ${otherPlace.name}`
    : title(direction);

  const save = async () => {
    if (!snap || taps.length === 0) {
      setError(t("route.tapMore"));
      return;
    }
    if (days.length === 0) {
      setError(t("route.needDays"));
      return;
    }
    if (timeFrom >= timeTo) {
      setError(t("route.timeOrder"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await savePlaceRoute(id, current?.id ?? null, {
        direction,
        name: routeName.trim() || autoName,
        mode,
        waypoints,
        path: snap.path,
        widthM: width,
        otherGeofenceId: otherId || null,
        weekdays: days,
        timeFrom,
        timeTo,
        severity: level,
      });
      setDirty(false);
      setSelectedId(r.id);
      await load();
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!current) return;
    Alert.alert(t("common.delete"), current.name || title(direction), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await deletePlaceRoute(id, current.id);
              setSelectedId("new");
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
  };

  const km = snap ? digits(Math.round(snap.lengthM / 100) / 10, bn) : "0";
  const canSave = !busy && !snapping && !!snap && taps.length > 0;
  const dayNames = (list: number[]) => WEEK.filter((d) => list.includes(d)).map((d) => t(`day.${d}` as StringKey)).join(" ");
  const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const dayLabel = (back: number) =>
    back === 0 ? t("route.today") : back === 1 ? t("route.yesterday") : digits(dhakaDay(back).slice(5).split("-").reverse().join("/"), bn);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerTitle: t("route.title") }} />
      <View style={styles.tabs}>
        {DIRECTIONS.map((d) => {
          const on = d === direction;
          const count = saved.filter((r) => r.direction === d).length;
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
              <Text style={[styles.tabSub, on && styles.tabSubOn]}>
                {count > 0 ? t("route.count").replace("{n}", digits(count, bn)) : t("route.notSet")}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {inDirection.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routes} contentContainerStyle={styles.routesRow}>
          {inDirection.map((r) => {
            const on = r.id === selectedId;
            return (
              <Pressable
                key={r.id}
                onPress={() => setSelectedId(r.id)}
                style={[styles.routeChip, on && styles.routeChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={styles.routeChipName} numberOfLines={1}>{r.name || title(r.direction)}</Text>
                <Text style={styles.routeChipSub} numberOfLines={1}>
                  {r.weekdays && r.timeFrom && r.timeTo
                    ? `${dayNames(r.weekdays)} · ${clockText(r.timeFrom, bn)} – ${clockText(r.timeTo, bn)}`
                    : t("route.followsTime")}
                </Text>
              </Pressable>
            );
          })}
          {inDirection.length < MAX_ROUTES ? (
            <Pressable
              onPress={() => setSelectedId("new")}
              style={[styles.routeChip, styles.routeChipAdd, selectedId === "new" && styles.routeChipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedId === "new" }}
            >
              <Ionicons name="add" size={20} color={colors.brand} />
              <Text style={[styles.routeChipName, { color: colors.brand }]}>{t("route.add")}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}

      <View style={{ height: Math.max(240, height * 0.36) }}>
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

        <Field label={t("route.name")} value={routeName} onChangeText={setRouteName} placeholder={autoName} maxLength={80} />

        <Text style={styles.label}>{t(direction === "TO" ? "route.otherTO" : "route.otherFROM")}</Text>
        <View style={styles.chips}>
          <Chip label={t("route.otherNone")} active={otherId === ""} onPress={() => setOtherId("")} />
          {places.map((p) => (
            <Chip key={p.id} label={p.name} active={otherId === p.id} onPress={() => setOtherId(p.id)} />
          ))}
        </View>
        {direction === "TO" ? <Text style={styles.hint}>{t("route.otherHint")}</Text> : null}

        <Text style={styles.label}>{t("route.days")}</Text>
        <View style={styles.chips}>
          {WEEK.map((d) => (
            <Chip key={d} label={t(`day.${d}` as StringKey)} active={days.includes(d)} onPress={() => toggleDay(d)} />
          ))}
        </View>
        <View style={styles.times}>
          <View style={{ flex: 1 }}>
            <ClockTimePicker value={timeFrom} onChange={setTimeFrom} bn={bn} label={t("route.from")} />
          </View>
          <View style={{ flex: 1 }}>
            <ClockTimePicker value={timeTo} onChange={setTimeTo} bn={bn} label={t("route.until")} />
          </View>
        </View>
        <Text style={styles.hint}>
          {t(direction === "TO" ? "route.whenOwnTO" : "route.whenOwnFROM").replace("{place}", placeName)}
        </Text>
        {current && !current.weekdays ? <Text style={styles.warn}>{t("route.legacy")}</Text> : null}

        <Text style={styles.label}>{t("route.level")}</Text>
        <View style={styles.chips}>
          {LEVELS.map((l) => {
            const on = level === l;
            return (
              <Pressable
                key={l}
                onPress={() => setLevel(l)}
                style={[styles.level, on && { backgroundColor: LEVEL_COLOR[l], borderColor: LEVEL_COLOR[l] }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.levelText, on && { color: "#FFFFFF" }]}>{t(`alc.sev.${l}` as StringKey)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>{t(`route.level.${level}` as StringKey)}</Text>

        <View style={styles.history}>
          <Text style={styles.historyTitle}>{t("route.history")}</Text>
          <Text style={styles.hint}>{t("route.historyHint")}</Text>
          {people.length === 0 ? (
            <Text style={styles.summary}>{t("route.historyNobody")}</Text>
          ) : (
            <>
              {people.length > 1 ? (
                <View style={styles.chips}>
                  {people.map((p) => (
                    <Chip
                      key={p.imei}
                      label={p.name}
                      active={histImei === p.imei}
                      onPress={() => {
                        setHistImei(p.imei);
                        setTrips(null);
                      }}
                    />
                  ))}
                </View>
              ) : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routesRow}>
                {Array.from({ length: HISTORY_DAYS }, (_, back) => (
                  <Chip
                    key={back}
                    label={dayLabel(back)}
                    active={histBack === back}
                    onPress={() => {
                      setHistBack(back);
                      setTrips(null);
                    }}
                  />
                ))}
              </ScrollView>
              <Pressable
                onPress={() => void findTrips()}
                disabled={finding || !histImei}
                style={({ pressed }) => [styles.copy, (pressed || finding) && { opacity: 0.7 }]}
                accessibilityRole="button"
              >
                <Ionicons name="search-outline" size={20} color={colors.brand} />
                <Text style={styles.copyText}>{finding ? t("common.loading") : t("route.find")}</Text>
              </Pressable>
              {trips && trips.length === 0 ? <Text style={styles.summary}>{t("route.noTrips")}</Text> : null}
              {(trips ?? []).map((c) => (
                <View key={c.from} style={styles.trip}>
                  <Text style={styles.tripText}>
                    {fmtTime(c.from, bn)} – {fmtTime(c.to, bn)} ·{" "}
                    {t("route.tripKm").replace("{km}", digits(Math.round(c.lengthM / 100) / 10, bn))}
                  </Text>
                  <Pressable onPress={() => applyTrip(c)} style={styles.tripUse} accessibilityRole="button">
                    <Text style={styles.tripUseText}>{t("route.useTrip")}</Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}
        </View>

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
  routes: { flexGrow: 0 },
  routesRow: { gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.sm },
  routeChip: {
    maxWidth: 240,
    minHeight: touch.min,
    justifyContent: "center",
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  routeChipOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  routeChipAdd: { flexDirection: "row", alignItems: "center", gap: 4 },
  routeChipName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  routeChipSub: { color: colors.textFaint, fontSize: 13 },
  times: { flexDirection: "row", gap: space.md },
  level: {
    minHeight: touch.min,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  history: { gap: space.sm, padding: space.md, borderRadius: radius.sm, backgroundColor: colors.surface },
  historyTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  trip: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: touch.min },
  tripText: { flex: 1, color: colors.text, fontSize: 15 },
  tripUse: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  tripUseText: { color: colors.onBrand, fontSize: 14, fontWeight: "700" },
});
