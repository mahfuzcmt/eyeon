import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { locationHistory } from "@/api/endpoints";
import { addDays, dhakaMidnight, dhakaParts, fmtDay, ordinal, sameDay, type DayParts } from "@/dateRange";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { LocationView } from "@/types";

/**
 * Speed/voltage-over-day charts. Rendered with plain Views (no chart/SVG
 * dependency — the stack forbids adding deps, see dateRange.ts header):
 * the day is split into buckets and each bucket draws as a thin bar.
 * Colors validated for the dark surface (dataviz six-checks).
 */
const SPEED_COLOR = "#3B82F6";
const VOLTAGE_COLOR = "#EA580C";
const BUCKETS = 48; // 30-minute buckets across the day

export default function GraphTab({ imei }: { imei: string }) {
  const { t } = useI18n();
  const today = dhakaParts();
  const [day, setDay] = useState<DayParts>(today);
  const [locs, setLocs] = useState<LocationView[]>([]);
  const [loading, setLoading] = useState(false);

  const dayStartMs = dhakaMidnight(day);
  const dayEndMs = dayStartMs + 86_400_000;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    locationHistory(imei, new Date(dayStartMs).toISOString(), new Date(dayEndMs).toISOString())
      .then((r) => {
        if (!cancelled) setLocs(r);
      })
      .catch(() => {
        if (!cancelled) setLocs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [imei, dayStartMs, dayEndMs]);

  const speedBuckets = useMemo(
    () => bucketize(locs, dayStartMs, (l) => l.speed, "max"),
    [locs, dayStartMs],
  );
  const voltageBuckets = useMemo(
    () =>
      bucketize(
        locs.filter((l) => l.voltageMv != null),
        dayStartMs,
        (l) => (l.voltageMv as number) / 1000,
        "avg",
      ),
    [locs, dayStartMs],
  );

  const isToday = sameDay(day, today);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Day navigation */}
      <View style={styles.dayNav}>
        <Pressable onPress={() => setDay(addDays(day, -1))} hitSlop={12}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.dayTitle}>
          {isToday ? t("common.today") : fmtDay(day)}
          {loading ? " …" : ""}
        </Text>
        <Pressable
          disabled={isToday}
          onPress={() => {
            if (ordinal(addDays(day, 1)) <= ordinal(today)) setDay(addDays(day, 1));
          }}
          hitSlop={12}
        >
          <Text style={[styles.nav, isToday && { opacity: 0.3 }]}>›</Text>
        </Pressable>
      </View>

      <BarChart
        title={t("graph.speed")}
        unit={t("veh.kmh")}
        color={SPEED_COLOR}
        buckets={speedBuckets}
        emptyText={t("graph.noData")}
        format={(v) => String(Math.round(v))}
      />
      <BarChart
        title={t("graph.voltage")}
        unit="V"
        color={VOLTAGE_COLOR}
        buckets={voltageBuckets}
        emptyText={t("graph.noData")}
        format={(v) => v.toFixed(1)}
        fromMin
      />
    </ScrollView>
  );
}

/** Aggregate points into fixed time buckets (null = no data in bucket). */
function bucketize(
  locs: LocationView[],
  dayStartMs: number,
  pick: (l: LocationView) => number,
  mode: "max" | "avg",
): (number | null)[] {
  const sums = new Array<number>(BUCKETS).fill(0);
  const counts = new Array<number>(BUCKETS).fill(0);
  const maxs = new Array<number>(BUCKETS).fill(-Infinity);
  for (const l of locs) {
    const ms = Date.parse(l.ts) - dayStartMs;
    if (ms < 0 || ms >= 86_400_000) continue;
    const b = Math.min(BUCKETS - 1, Math.floor((ms / 86_400_000) * BUCKETS));
    const v = pick(l);
    sums[b] += v;
    counts[b] += 1;
    if (v > maxs[b]) maxs[b] = v;
  }
  return sums.map((s, i) =>
    counts[i] === 0 ? null : mode === "max" ? maxs[i] : s / counts[i],
  );
}

function BarChart({
  title,
  unit,
  color,
  buckets,
  emptyText,
  format,
  fromMin = false,
}: {
  title: string;
  unit: string;
  color: string;
  buckets: (number | null)[];
  emptyText: string;
  format: (v: number) => string;
  /** Scale from the data minimum instead of zero (voltage). */
  fromMin?: boolean;
}) {
  const present = buckets.filter((b): b is number => b != null);
  const max = present.length ? Math.max(...present) : 0;
  const min = present.length ? Math.min(...present) : 0;
  const lo = fromMin ? min : 0;
  const span = Math.max(max - lo, 1e-6);
  const avg = present.length ? present.reduce((s, v) => s + v, 0) / present.length : 0;

  return (
    <View style={styles.card}>
      <View style={styles.chartHead}>
        <Text style={styles.chartTitle}>
          {title} <Text style={styles.chartUnit}>{unit}</Text>
        </Text>
        {present.length > 0 && (
          <Text style={styles.chartStats}>
            max <Text style={{ color }}>{format(max)}</Text> · avg{" "}
            <Text style={{ color }}>{format(avg)}</Text>
          </Text>
        )}
      </View>
      {present.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        <>
          <View style={styles.plot}>
            {buckets.map((b, i) => (
              <View key={i} style={styles.barSlot}>
                {b != null && (
                  <View
                    style={{
                      backgroundColor: color,
                      borderTopLeftRadius: 2,
                      borderTopRightRadius: 2,
                      width: "70%",
                      height: `${Math.max(3, ((b - lo) / span) * 100)}%`,
                    }}
                  />
                )}
              </View>
            ))}
          </View>
          <View style={styles.axis}>
            <Text style={styles.axisText}>00:00</Text>
            <Text style={styles.axisText}>06:00</Text>
            <Text style={styles.axisText}>12:00</Text>
            <Text style={styles.axisText}>18:00</Text>
            <Text style={styles.axisText}>24:00</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl },
  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  nav: { color: colors.brand, fontSize: 24, fontWeight: "800", paddingHorizontal: space.md },
  dayTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  chartHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  chartTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  chartUnit: { color: colors.textFaint, fontSize: 11, fontWeight: "400" },
  chartStats: { color: colors.textFaint, fontSize: 11 },
  plot: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  barSlot: { flex: 1, height: "100%", justifyContent: "flex-end", alignItems: "center" },
  axis: { flexDirection: "row", justifyContent: "space-between" },
  axisText: { color: colors.textFaint, fontSize: 9 },
  empty: { color: colors.textFaint, fontSize: 12, paddingVertical: space.lg, textAlign: "center" },
});
