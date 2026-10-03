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

/** "Should be at School by 08:15, Sunday to Thursday": the expected times of one trusted place. */

/** Shown Sunday first: the school week in Bangladesh runs Sunday to Thursday. ISO numbers, 7 = Sunday. */
const WEEK = [7, 1, 2, 3, 4, 5, 6];
const SCHOOL_DAYS = [7, 1, 2, 3, 4];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function PlaceTimesScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { t } = useI18n();
  const [schedules, setSchedules] = useState<PlaceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<PlaceScheduleKind>("ARRIVE_BY");
  const [time, setTime] = useState("08:15");
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
    if (!TIME_RE.test(time)) {
      setError("HH:MM");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createPlaceSchedule(id, { kind, time, weekdays: days });
      setSchedules((prev) => [...prev, created].sort((a, b) => a.time.localeCompare(b.time)));
    } catch (e) {
      setError(extractError(e).message);
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
          <View style={styles.chips}>
            {(["ARRIVE_BY", "LEAVE_BY"] as const).map((k) => (
              <Chip key={k} label={t(`place.times.${k}` as StringKey)} active={kind === k} onPress={() => setKind(k)} />
            ))}
          </View>
          <Text style={styles.label}>{t("ts.to")}</Text>
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            placeholderTextColor={colors.textFaint}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
          <Text style={styles.label}>{t("place.timesDays")}</Text>
          <View style={styles.chips}>
            {WEEK.map((d) => (
              <Chip key={d} label={t(`day.${d}` as StringKey)} active={days.includes(d)} onPress={() => toggleDay(d)} />
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label={t("place.timesAdd")} loading={saving} disabled={!time || days.length === 0} onPress={() => void add()} />
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
});
