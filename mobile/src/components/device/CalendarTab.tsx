import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { deviceDailyActivity } from "@/api/endpoints";
import {
  addDays,
  daysInMonth,
  dhakaParts,
  ordinal,
  rangeFromDays,
  sameDay,
  weekday,
  type DayParts,
} from "@/dateRange";
import { fmtDistance, fmtDuration } from "@/format";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { ActivityDay } from "@/types";

// Saturday-first week (Bangladesh convention) — same as DateRangePicker.
const WD = ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface DayAgg {
  distanceM: number;
  movingS: number;
}

/** Month grid of per-day distance, from location-derived activity (EyeOn has no trips). */
export default function CalendarTab({ imei }: { imei: string }) {
  const { t } = useI18n();
  const today = dhakaParts();
  const [view, setView] = useState({ y: today.y, m: today.m });
  const [selected, setSelected] = useState<DayParts | null>(null);
  const [days, setDays] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const start: DayParts = { y: view.y, m: view.m, d: 1 };
    const end: DayParts = { y: view.y, m: view.m, d: daysInMonth(view.y, view.m) };
    const range = rangeFromDays(start, end, "");
    deviceDailyActivity(imei, range.fromIso, range.toIso)
      .then((r) => {
        if (!cancelled) setDays(r);
      })
      .catch(() => {
        if (!cancelled) setDays([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [imei, view]);

  const byDay = useMemo(() => {
    const m = new Map<number, DayAgg>();
    // `date` is already an Asia/Dhaka calendar day (YYYY-MM-DD) from the backend.
    for (const day of days) {
      const [y, mo, d] = day.date.split("-").map(Number);
      if (y !== view.y || mo !== view.m) continue;
      m.set(d, { distanceM: day.distanceM, movingS: day.movingS });
    }
    return m;
  }, [days, view]);

  const monthTotal = useMemo(() => {
    let d = 0;
    for (const agg of byDay.values()) d += agg.distanceM;
    return d;
  }, [byDay]);

  const cells = useMemo(() => {
    const first: DayParts = { y: view.y, m: view.m, d: 1 };
    const lead = (weekday(first) + 1) % 7;
    const count = daysInMonth(view.y, view.m);
    const out: (DayParts | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= count; d++) out.push({ y: view.y, m: view.m, d });
    return out;
  }, [view]);

  function shiftMonth(delta: number) {
    const tgt = addDays({ y: view.y, m: view.m, d: 1 }, delta > 0 ? 32 : -1);
    setView({ y: tgt.y, m: tgt.m });
    setSelected(null);
  }

  const sel = selected ? byDay.get(selected.d) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.monthHead}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={12}>
            <Text style={styles.nav}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>
            {MONTHS[view.m]} {view.y}
            {loading ? " …" : ""}
          </Text>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={12}>
            <Text style={styles.nav}>›</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {WD.map((w) => (
            <Text key={w} style={styles.wd}>
              {w}
            </Text>
          ))}
          {cells.map((c, i) => {
            if (!c) return <View key={`b${i}`} style={styles.cell} />;
            const agg = byDay.get(c.d);
            const future = ordinal(c) > ordinal(today);
            const isToday = sameDay(c, today);
            const isSel = selected != null && sameDay(c, selected);
            return (
              <Pressable
                key={`${c.y}-${c.m}-${c.d}`}
                disabled={future}
                onPress={() => setSelected(c)}
                style={[styles.cell, isSel && styles.cellSel]}
              >
                <Text style={[styles.cellDay, isToday && styles.cellToday, future && styles.cellFuture]}>
                  {c.d}
                </Text>
                {agg ? (
                  <Text style={styles.cellKm}>{(agg.distanceM / 1000).toFixed(0)}k</Text>
                ) : (
                  <Text style={styles.cellKmEmpty}> </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.total}>
          {t("cal.monthTotal")}: {fmtDistance(monthTotal)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sumTitle}>{t("cal.dailyMileage")}</Text>
        {!selected ? (
          <Text style={styles.hint}>{t("cal.tapDay")}</Text>
        ) : (
          <View style={styles.sumRow}>
            <Summary label={t("hist.distance")} value={fmtDistance(sel?.distanceM ?? 0)} />
            <Summary label={t("home.moveDuration")} value={fmtDuration(sel?.movingS ?? 0)} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sumBox}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  monthHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nav: { color: colors.brand, fontSize: 26, fontWeight: "800", paddingHorizontal: space.md },
  monthTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  wd: { width: `${100 / 7}%`, textAlign: "center", color: colors.textFaint, fontSize: 12, paddingVertical: 4 },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  cellSel: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.brand },
  cellDay: { color: colors.textDim, fontSize: 14 },
  cellToday: { color: colors.brand, fontWeight: "800" },
  cellFuture: { color: colors.border },
  cellKm: { color: colors.ok, fontSize: 12, fontWeight: "700" },
  cellKmEmpty: { fontSize: 12 },
  total: { color: colors.textDim, fontSize: 13, textAlign: "right" },
  sumTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  hint: { color: colors.textFaint, fontSize: 13 },
  sumRow: { flexDirection: "row", gap: space.sm },
  sumBox: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: space.sm,
    gap: 2,
  },
  sumLabel: { color: colors.textFaint, fontSize: 12, textTransform: "uppercase" },
  sumValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
});
