import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createPlaceSchedule, deletePlaceSchedule, listPlaceSchedules } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { Chip, EmptyState, Loading, PrimaryButton } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";
import type { PlaceSchedule, PlaceScheduleKind } from "@/types";

/**
 * "Reaches School at 08:00, leaves at 12:00, 10 minutes grace, Sunday to Thursday": the expected
 * times of one trusted place (same as the web dialog). The carer is told either way once the grace
 * is over. An arrival and a leaving time are stored as two schedules.
 */

/** Shown Sunday first: the school week in Bangladesh runs Sunday to Thursday. ISO numbers, 7 = Sunday. */
const WEEK = [7, 1, 2, 3, 4, 5, 6];
const SCHOOL_DAYS = [7, 1, 2, 3, 4];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const GRACE_CHOICES = [0, 5, 10, 15, 20, 30, 45, 60];
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const digits = (n: number, bn: boolean) => (bn ? String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : String(n));

export default function PlaceTimesScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { t, locale } = useI18n();
  const bn = locale === "bn";
  const [schedules, setSchedules] = useState<PlaceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arriveOn, setArriveOn] = useState(true);
  const [arrive, setArrive] = useState("08:00");
  const [leaveOn, setLeaveOn] = useState(true);
  const [leave, setLeave] = useState("12:00");
  const [grace, setGrace] = useState(10);
  const [days, setDays] = useState<number[]>(SCHOOL_DAYS);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setSchedules(await listPlaceSchedules(id));
      setError(null);
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!id) return <EmptyState text={t("common.error")} />;

  const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const dayNames = (list: number[]) => WEEK.filter((d) => list.includes(d)).map((d) => t(`day.${d}` as StringKey)).join(" · ");

  const add = async () => {
    const wanted: [PlaceScheduleKind, string][] = [];
    if (arriveOn) wanted.push(["ARRIVE_BY", arrive.trim()]);
    if (leaveOn) wanted.push(["LEAVE_BY", leave.trim()]);
    if (wanted.some(([, time]) => !TIME_RE.test(time))) {
      setError("HH:MM");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const added: PlaceSchedule[] = [];
      for (const [kind, time] of wanted) {
        added.push(await createPlaceSchedule(id, { kind, time, weekdays: days, graceMinutes: grace }));
      }
      setSchedules((prev) => [...prev, ...added].sort((a, b) => a.time.localeCompare(b.time)));
    } catch (e) {
      setError(extractError(e).message);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const remove = (s: PlaceSchedule) =>
    Alert.alert(t("common.delete"), `${t(`place.times.${s.kind}` as StringKey)} ${s.time}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deletePlaceSchedule(id, s.id);
              setSchedules((prev) => prev.filter((x) => x.id !== s.id));
            } catch (e) {
              setError(extractError(e).message);
            }
          })();
        },
      },
    ]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerTitle: t("place.times") }} />
      <ScrollView contentContainerStyle={styles.content}>
        {name ? <Text style={styles.placeName}>{name}</Text> : null}
        <Text style={styles.hint}>{t("place.timesHint")}</Text>

        {loading ? (
          <Loading label={t("common.loading")} />
        ) : schedules.length === 0 ? (
          <Text style={styles.none}>{t("place.timesNone")}</Text>
        ) : (
          <View style={styles.card}>
            {schedules.map((s) => (
              <View key={s.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {t(`place.times.${s.kind}` as StringKey)} <Text style={styles.mono}>{s.time}</Text>
                    {s.graceMinutes > 0 ? (
                      <Text style={styles.grace}> {t("place.timesGraceShort").replace("{n}", digits(s.graceMinutes, bn))}</Text>
                    ) : null}
                  </Text>
                  <Text style={styles.rowDays}>{dayNames(s.weekdays)}</Text>
                </View>
                <Pressable onPress={() => remove(s)} hitSlop={8} style={styles.deleteBtn} accessibilityRole="button" accessibilityLabel={t("common.delete")}>
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.form}>
          {(
            [
              ["arrive", t("place.timesArrive"), arriveOn, setArriveOn, arrive, setArrive],
              ["leave", t("place.timesLeave"), leaveOn, setLeaveOn, leave, setLeave],
            ] as const
          ).map(([key, label, on, setOn, value, setValue]) => (
            <View key={key} style={styles.timeRow}>
              <Pressable
                onPress={() => setOn(!on)}
                style={styles.check}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={label}
              >
                <Ionicons name={on ? "checkbox" : "square-outline"} size={26} color={on ? colors.brand : colors.textFaint} />
                <Text style={styles.timeLabel}>{label}</Text>
              </Pressable>
              <TextInput
                style={[styles.input, !on && styles.inputOff]}
                value={value}
                editable={on}
                onChangeText={setValue}
                placeholder="HH:MM"
                placeholderTextColor={colors.textFaint}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          ))}
          <Text style={styles.label}>{t("place.timesGrace")}</Text>
          <View style={styles.chips}>
            {GRACE_CHOICES.map((n) => (
              <Chip key={n} label={digits(n, bn)} active={grace === n} onPress={() => setGrace(n)} />
            ))}
          </View>
          <Text style={styles.label}>{t("place.timesDays")}</Text>
          <View style={styles.chips}>
            {WEEK.map((d) => (
              <Chip key={d} label={t(`day.${d}` as StringKey)} active={days.includes(d)} onPress={() => toggleDay(d)} />
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label={t("place.timesAdd")} loading={saving} disabled={(!arriveOn && !leaveOn) || days.length === 0} onPress={() => void add()} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  placeName: { color: colors.brand, fontSize: 18, fontWeight: "700" },
  hint: { color: colors.textFaint, fontSize: 14 },
  none: { color: colors.textFaint, fontSize: 15, backgroundColor: colors.surfaceAlt, padding: space.md, borderRadius: radius.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  mono: { fontFamily: "monospace" },
  rowDays: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  deleteBtn: { width: touch.min, height: touch.min, alignItems: "center", justifyContent: "center" },
  form: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  label: { color: colors.textFaint, fontSize: 14 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: space.md, color: colors.text, fontSize: 16, width: 120 },
  error: { color: colors.danger, fontSize: 14 },
  grace: { color: colors.textFaint, fontSize: 14, fontWeight: "400" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  check: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: touch.min },
  timeLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },
  inputOff: { opacity: 0.45 },
});
