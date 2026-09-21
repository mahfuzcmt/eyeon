import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  addDays,
  daysInMonth,
  dhakaParts,
  DayParts,
  DateRange,
  fmtDay,
  ordinal,
  parseHHMM,
  PRESETS,
  presetRange,
  PresetKey,
  rangeFromDays,
  sameDay,
  weekday,
} from "@/dateRange";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";

// Saturday-first weekday headers (Bangladesh week convention).
const WD = ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PRESET_KEY: Record<PresetKey, StringKey> = {
  today: "preset.today",
  yesterday: "preset.yesterday",
  thisWeek: "preset.thisWeek",
  lastWeek: "preset.lastWeek",
  last7: "preset.last7",
  last30: "preset.last30",
};

type Cell = { day: DayParts } | null;

/** Modal date-range picker: quick presets + a month calendar + start/end times. */
export default function DateRangePicker({
  visible,
  onApply,
  onClose,
}: {
  visible: boolean;
  onApply: (r: DateRange) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const today = dhakaParts();
  const [view, setView] = useState({ y: today.y, m: today.m });
  const [start, setStart] = useState<DayParts | null>(null);
  const [end, setEnd] = useState<DayParts | null>(null);
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");

  const cells = useMemo<Cell[]>(() => {
    const first: DayParts = { y: view.y, m: view.m, d: 1 };
    const lead = (weekday(first) + 1) % 7; // days before day 1, Saturday-based
    const count = daysInMonth(view.y, view.m);
    const out: Cell[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= count; d++) out.push({ day: { y: view.y, m: view.m, d } });
    return out;
  }, [view]);

  function pick(day: DayParts) {
    // First tap sets start; second sets end; a third restarts the range.
    if (!start || (start && end)) {
      setStart(day);
      setEnd(null);
    } else {
      setEnd(day);
    }
  }

  function applyPreset(key: PresetKey) {
    onApply(presetRange(key));
  }

  function applyCustom() {
    if (!start) return;
    const to = end ?? start;
    const [lo, hi] = ordinal(start) <= ordinal(to) ? [start, to] : [to, start];
    const startMin = parseHHMM(startTime) ?? 0;
    const endMin = parseHHMM(endTime);
    const endExclusive = endMin == null ? 1440 : endMin + 1; // include the end minute
    const label = sameDay(lo, hi) ? fmtDay(lo) : `${fmtDay(lo)} – ${fmtDay(hi)}`;
    onApply(rangeFromDays(lo, hi, label, startMin, endExclusive));
  }

  function inRange(day: DayParts): "start" | "end" | "mid" | null {
    if (!start) return null;
    const hi = end ?? start;
    const [lo, up] = ordinal(start) <= ordinal(hi) ? [start, hi] : [hi, start];
    const o = ordinal(day);
    if (o === ordinal(lo) && o === ordinal(up)) return "start";
    if (o === ordinal(lo)) return "start";
    if (o === ordinal(up)) return "end";
    if (o > ordinal(lo) && o < ordinal(up)) return "mid";
    return null;
  }

  const isFuture = (day: DayParts) => ordinal(day) > ordinal(today);

  function shiftMonth(delta: number) {
    const t = addDays({ y: view.y, m: view.m, d: 1 }, delta > 0 ? 32 : -1);
    setView({ y: t.y, m: t.m });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.presetRow}>
            {PRESETS.map((p) => (
              <Pressable key={p.key} onPress={() => applyPreset(p.key)} style={styles.preset}>
                <Text style={styles.presetText}>{t(PRESET_KEY[p.key])}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.monthHead}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={12}>
              <Text style={styles.nav}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTHS[view.m]} {view.y}
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
              const state = inRange(c.day);
              const future = isFuture(c.day);
              const isToday = sameDay(c.day, today);
              return (
                <Pressable
                  key={`${c.day.y}-${c.day.m}-${c.day.d}`}
                  disabled={future}
                  onPress={() => pick(c.day)}
                  style={[
                    styles.cell,
                    state === "mid" && styles.cellMid,
                    (state === "start" || state === "end") && styles.cellEnd,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      future && styles.cellFuture,
                      isToday && !state && styles.cellToday,
                      (state === "start" || state === "end") && styles.cellEndText,
                    ]}
                  >
                    {c.day.d}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>{t("cal.startTime")}</Text>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="00:00"
                placeholderTextColor={colors.textFaint}
                style={styles.timeInput}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>{t("cal.endTime")}</Text>
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="23:59"
                placeholderTextColor={colors.textFaint}
                style={styles.timeInput}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>

          <Text style={styles.selInfo}>
            {start
              ? `${fmtDay(start)}${end && !sameDay(start, end) ? ` – ${fmtDay(end)}` : ""}`
              : t("cal.tapRange")}
          </Text>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>{t("common.cancel")}</Text>
            </Pressable>
            <Pressable
              onPress={applyCustom}
              disabled={!start}
              style={[styles.btn, styles.btnPrimary, !start && { opacity: 0.5 }]}
            >
              <Text style={styles.btnPrimaryText}>{t("common.apply")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.md,
    paddingBottom: space.xl,
    gap: space.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  preset: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  presetText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  monthHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.sm },
  nav: { color: colors.brand, fontSize: 26, fontWeight: "800", paddingHorizontal: space.md },
  monthTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  wd: { width: `${100 / 7}%`, textAlign: "center", color: colors.textFaint, fontSize: 11, paddingVertical: 4 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  cellMid: { backgroundColor: colors.brandDim },
  cellEnd: { backgroundColor: colors.brand },
  cellText: { color: colors.textDim, fontSize: 14 },
  cellFuture: { color: colors.border },
  cellToday: { color: colors.brand, fontWeight: "800" },
  cellEndText: { color: "#0A1928", fontWeight: "800" },
  timeRow: { flexDirection: "row", gap: space.md },
  timeField: { flex: 1, gap: 4 },
  timeLabel: { color: colors.textFaint, fontSize: 11 },
  timeInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 15,
  },
  selInfo: { color: colors.textFaint, fontSize: 12, textAlign: "center" },
  actions: { flexDirection: "row", gap: space.md },
  btn: { flex: 1, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.textDim, fontWeight: "700" },
  btnPrimary: { backgroundColor: colors.brand },
  btnPrimaryText: { color: "#0A1928", fontWeight: "800" },
});
