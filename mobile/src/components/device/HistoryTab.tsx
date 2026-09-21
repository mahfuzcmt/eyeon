import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { alarmsForDevice, deviceActivity, locationHistory } from "@/api/endpoints";
import { extractError } from "@/api/client";
import WebMap, { MapPoint } from "@/components/WebMap";
import DateRangePicker from "@/components/device/DateRangePicker";
import { EmptyState, Loading } from "@/ui";
import { fmtDistance, fmtDuration, fmtTime } from "@/format";
import { presetRange, type DateRange } from "@/dateRange";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { ActivitySummary, AlarmView, LocationView } from "@/types";

const SPEEDS = [1, 2, 4] as const;
/** The events that tell the story of a day. */
const TIMELINE_TYPES = new Set(["PLACE_ARRIVED", "PLACE_LEFT", "GEOFENCE_EXIT", "GEOFENCE_ENTER", "SOS"]);

/**
 * "Where were they all day": the whole range as one route with playback, and under it a
 * plain-language timeline (arrived at School, left School ...). EyeOn has no trips.
 */
export default function HistoryTab({ imei }: { imei: string }) {
  const { t } = useI18n();
  const [range, setRange] = useState<DateRange>(() => presetRange("today"));
  const [pickerOpen, setPickerOpen] = useState(false);

  const [points, setPoints] = useState<LocationView[]>([]);
  const [events, setEvents] = useState<AlarmView[]>([]);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setPlaying(false);
    setIdx(0);
    (async () => {
      try {
        const [pts, alarms, act] = await Promise.all([
          locationHistory(imei, range.fromIso, range.toIso),
          alarmsForDevice(imei, range.fromIso, range.toIso),
          deviceActivity(imei, range.fromIso, range.toIso),
        ]);
        if (!mounted) return;
        setPoints(pts.filter((p) => p.valid).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)));
        setEvents(alarms.filter((a) => TIMELINE_TYPES.has(a.type)).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)));
        setActivity(act);
      } catch (e) {
        if (!mounted) return;
        setError(extractError(e).message);
        setPoints([]);
        setEvents([]);
        setActivity(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [imei, range]);

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

  /** Move the playback marker to the point closest in time to a timeline event. */
  function jumpTo(ev: AlarmView) {
    setSelectedId(ev.id);
    setPlaying(false);
    if (points.length === 0) return;
    const target = Date.parse(ev.ts);
    let best = 0;
    let bestGap = Infinity;
    points.forEach((p, i) => {
      const gap = Math.abs(Date.parse(p.ts) - target);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    });
    setIdx(best);
  }

  return (
    <>
    <FlatList
      style={styles.screen}
      data={events}
      keyExtractor={(e) => e.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <Pressable style={styles.rangeBtn} onPress={() => setPickerOpen(true)}>
            <Text style={styles.rangeBtnText}>📅  {range.label}</Text>
            <Text style={styles.rangeBtnHint}>{t("hist.change")} ▾</Text>
          </Pressable>
          <View style={styles.mapBox}>
            <WebMap route={route} moving={moving} fitRoute={!playing} />
            {points.length > 0 ? (
              <View style={styles.hud} pointerEvents="box-none">
                <View style={styles.kmphBox}>
                  <Text style={styles.kmph}>{fmtTime(points[idx]?.ts)}</Text>
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

          {activity ? (
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Stat label={t("hist.distance")} value={fmtDistance(activity.distanceM)} />
                <Stat label={t("home.moveDuration")} value={fmtDuration(activity.movingS)} />
                <Stat label={t("home.stopDuration")} value={fmtDuration(activity.stillS)} />
              </View>
            </View>
          ) : null}
          <Text style={styles.sectionTitle}>{t("hist.timeline")} · {range.label}</Text>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <Loading label={t("common.loading")} />
        ) : error ? (
          <EmptyState text={error} />
        ) : (
          <EmptyState text={points.length === 0 ? t("hist.noData") : t("hist.noEvents")} />
        )
      }
      renderItem={({ item }) => {
        const place = typeof item.metadata?.geofenceName === "string" ? item.metadata.geofenceName : null;
        const urgent = item.type === "SOS" || item.type === "GEOFENCE_EXIT";
        return (
          <Pressable
            onPress={() => jumpTo(item)}
            style={[styles.tripRow, selectedId === item.id && styles.tripRowActive]}
            accessibilityRole="button"
          >
            <Text style={styles.eventTime}>{fmtTime(item.ts)}</Text>
            <View style={[styles.eventDot, { backgroundColor: urgent ? colors.danger : colors.brand }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tripTime, urgent && { color: colors.danger }]}>
                {t(`hist.event.${item.type}` as StringKey)}
              </Text>
              {place ? <Text style={styles.tripSub}>{place}</Text> : null}
            </View>
          </Pressable>
        );
      }}
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
      <Text style={[styles.ctlText, big && { fontSize: 20, color: colors.onBrand }]}>{label}</Text>
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
  rangeBtnText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rangeBtnHint: { color: colors.brand, fontSize: 13, fontWeight: "600" },
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
  kmphUnit: { color: colors.textFaint, fontSize: 13 },
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
  ctlBig: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  ctlText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  hint: { color: colors.textFaint, fontSize: 14, paddingHorizontal: space.md },
  summary: { marginHorizontal: space.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: space.md },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", flex: 1 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: "700" },
  statLabel: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  timeline: { gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
  tlLine: { color: colors.textDim, fontSize: 13 },
  tlDot: { color: colors.brand },
  loadingPts: { color: colors.textFaint, fontSize: 13 },
  sectionTitle: { color: colors.textDim, fontSize: 14, fontWeight: "700", paddingHorizontal: space.md },
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
  eventTime: { color: colors.text, fontSize: 15, fontWeight: "700", width: 74 },
  eventDot: { width: 10, height: 10, borderRadius: 5 },
  tripTime: { color: colors.text, fontSize: 15, fontWeight: "600" },
  tripSub: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  tripStatus: { color: colors.textFaint, fontSize: 16 },
});
