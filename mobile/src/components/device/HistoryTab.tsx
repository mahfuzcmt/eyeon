import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { locationHistory, tripsForDevice } from "@/api/endpoints";
import { extractError } from "@/api/client";
import WebMap, { MapPoint } from "@/components/WebMap";
import DateRangePicker from "@/components/device/DateRangePicker";
import { EmptyState, Loading } from "@/ui";
import { fmtDateTime, fmtDistance, fmtDuration, fmtTime } from "@/format";
import { presetRange, type DateRange } from "@/dateRange";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { LocationView, TripView } from "@/types";

const SPEEDS = [1, 2, 4] as const;

/** Trip list + route replay (play/pause/speed, live km/h). */
export default function HistoryTab({ imei }: { imei: string }) {
  const { t } = useI18n();
  const [range, setRange] = useState<DateRange>(() => presetRange("last7"));
  const [pickerOpen, setPickerOpen] = useState(false);

  const [trips, setTrips] = useState<TripView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<TripView | null>(null);
  const [points, setPoints] = useState<LocationView[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setSelected(null);
    setPoints([]);
    setTrips([]);
    (async () => {
      try {
        const rows = await tripsForDevice(imei, range.fromIso, range.toIso);
        if (mounted) setTrips(rows);
      } catch (e) {
        if (mounted) setError(extractError(e).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [imei, range]);

  const selectTrip = useCallback(
    async (trip: TripView) => {
      setSelected(trip);
      setPlaying(false);
      setIdx(0);
      setLoadingPoints(true);
      try {
        const to = trip.endedAt ?? new Date().toISOString();
        const pts = await locationHistory(imei, trip.startedAt, to);
        setPoints(pts.filter((p) => p.valid));
      } catch {
        setPoints([]);
      } finally {
        setLoadingPoints(false);
      }
    },
    [imei],
  );

  const stride = useMemo(() => Math.max(1, Math.floor(points.length / 150)), [points.length]);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!playing || points.length === 0) return;
    timer.current = setInterval(() => {
      setIdx((prev) => {
        const next = prev + stride;
        if (next >= points.length - 1) {
          setPlaying(false);
          return points.length - 1;
        }
        return next;
      });
    }, 600 / speed);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, speed, points.length, stride]);

  const route = useMemo<[number, number][]>(() => points.map((p) => [p.longitude, p.latitude]), [points]);
  const moving = useMemo<MapPoint | null>(() => {
    const p = points[idx];
    return p ? { lat: p.latitude, lng: p.longitude, course: p.course } : null;
  }, [points, idx]);
  const currentKmph = points[idx]?.speed ?? 0;

  return (
    <>
    <FlatList
      style={styles.screen}
      data={trips}
      keyExtractor={(t) => t.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <Pressable style={styles.rangeBtn} onPress={() => setPickerOpen(true)}>
            <Text style={styles.rangeBtnText}>📅  {range.label}</Text>
            <Text style={styles.rangeBtnHint}>{t("hist.change")} ▾</Text>
          </Pressable>
          <View style={styles.mapBox}>
            <WebMap route={route} moving={moving} fitRoute={!playing} />
            {selected ? (
              <View style={styles.hud} pointerEvents="box-none">
                <View style={styles.kmphBox}>
                  <Text style={styles.kmph}>{currentKmph}</Text>
                  <Text style={styles.kmphUnit}>{t("veh.kmh")}</Text>
                </View>
                <View style={styles.playbar}>
                  <CtlBtn label="⏮" onPress={() => setIdx(0)} />
                  <CtlBtn label={playing ? "⏸" : "▶"} onPress={() => setPlaying((p) => !p)} big />
                  <CtlBtn
                    label={`${speed}×`}
                    onPress={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
                  />
                </View>
              </View>
            ) : null}
          </View>

          {selected ? (
            <TripSummary trip={selected} loading={loadingPoints} />
          ) : (
            <Text style={styles.hint}>{t("hist.selectTrip")}</Text>
          )}
          <Text style={styles.sectionTitle}>{t("home.trips")} · {range.label}</Text>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <Loading label={t("hist.loadingTrips")} />
        ) : error ? (
          <EmptyState text={error} />
        ) : (
          <EmptyState text={t("hist.noTrips")} />
        )
      }
      renderItem={({ item }) => (
        <TripRow trip={item} active={selected?.id === item.id} onPress={() => selectTrip(item)} />
      )}
    />
    <DateRangePicker
      visible={pickerOpen}
      onApply={(r) => {
        setRange(r);
        setPickerOpen(false);
      }}
      onClose={() => setPickerOpen(false)}
    />
    </>
  );
}

function TripSummary({ trip, loading }: { trip: TripView; loading: boolean }) {
  const { t } = useI18n();
  return (
    <View style={styles.summary}>
      <View style={styles.summaryRow}>
        <Stat label={t("hist.distance")} value={fmtDistance(trip.distanceM)} />
        <Stat label={t("hist.duration")} value={fmtDuration(trip.durationS)} />
        <Stat label={t("hist.max")} value={`${trip.maxSpeed} ${t("veh.kmh")}`} />
        <Stat label={t("hist.avg")} value={`${trip.avgSpeed} ${t("veh.kmh")}`} />
      </View>
      <View style={styles.timeline}>
        <Text style={styles.tlLine}>
          <Text style={styles.tlDot}>▶ </Text>{t("hist.start")} {fmtDateTime(trip.startedAt)}
          {trip.startLat != null ? `  (${trip.startLat.toFixed(4)}, ${trip.startLng?.toFixed(4)})` : ""}
        </Text>
        <Text style={styles.tlLine}>
          <Text style={styles.tlDot}>⏹ </Text>{t("hist.end")} {fmtDateTime(trip.endedAt)}
          {trip.endLat != null ? `  (${trip.endLat.toFixed(4)}, ${trip.endLng?.toFixed(4)})` : ""}
        </Text>
      </View>
      {loading ? <Text style={styles.loadingPts}>{t("hist.loadingRoute")}</Text> : null}
    </View>
  );
}

function TripRow({ trip, active, onPress }: { trip: TripView; active: boolean; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tripRow, active && styles.tripRowActive, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.tripTime}>
          {fmtTime(trip.startedAt)} → {fmtTime(trip.endedAt)}
        </Text>
        <Text style={styles.tripSub}>
          {fmtDistance(trip.distanceM)} · {fmtDuration(trip.durationS)} · {t("hist.max")} {trip.maxSpeed} {t("veh.kmh")}
        </Text>
      </View>
      <Text style={[styles.tripStatus, trip.status === "IN_PROGRESS" && { color: colors.ok }]}>
        {trip.status === "IN_PROGRESS" ? t("common.live") : "▸"}
      </Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function CtlBtn({ label, onPress, big }: { label: string; onPress: () => void; big?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ctl, big && styles.ctlBig, pressed && { opacity: 0.7 }]}>
      <Text style={[styles.ctlText, big && { fontSize: 20 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { paddingBottom: space.xl },
  header: { gap: space.md },
  rangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: space.md,
    marginTop: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  rangeBtnText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  rangeBtnHint: { color: colors.brand, fontSize: 12, fontWeight: "600" },
  mapBox: { height: 320, backgroundColor: colors.bg },
  hud: { position: "absolute", left: 0, right: 0, bottom: 0, padding: space.md, gap: space.sm, alignItems: "center" },
  kmphBox: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  kmph: { color: colors.text, fontSize: 20, fontWeight: "800" },
  kmphUnit: { color: colors.textFaint, fontSize: 12 },
  playbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  ctl: { minWidth: 40, alignItems: "center" },
  ctlBig: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  ctlText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  hint: { color: colors.textFaint, fontSize: 13, paddingHorizontal: space.md },
  summary: { marginHorizontal: space.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: space.md },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", flex: 1 },
  statValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  statLabel: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  timeline: { gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
  tlLine: { color: colors.textDim, fontSize: 12 },
  tlDot: { color: colors.brand },
  loadingPts: { color: colors.textFaint, fontSize: 12 },
  sectionTitle: { color: colors.textDim, fontSize: 13, fontWeight: "700", paddingHorizontal: space.md },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: space.md,
    marginTop: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  tripRowActive: { borderColor: colors.brand },
  tripTime: { color: colors.text, fontSize: 14, fontWeight: "600" },
  tripSub: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  tripStatus: { color: colors.textFaint, fontSize: 16 },
});
