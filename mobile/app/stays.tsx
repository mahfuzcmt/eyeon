import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { deviceStays } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { useDevices } from "@/hooks/useDevices";
import { addDays, dhakaMidnight, dhakaParts, type DayParts } from "@/dateRange";
import { fmtTime } from "@/format";
import { Chip, EmptyState, Loading } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { StayView } from "@/types";

/**
 * Where a person stayed and for how long (same data as the web Stays report):
 * "Karwan Bazar, 2:40 PM - 2:45 PM, 5 min". By time, or grouped by place.
 */

type Preset = "today" | "yesterday" | "last7";
type ViewMode = "timeline" | "places";
const NAME_RETRY_MS = 4000;
const NAME_RETRIES = 6;

function rangeFor(preset: Preset): { from: string; to?: string } {
  const today = dhakaParts();
  const iso = (p: DayParts) => new Date(dhakaMidnight(p)).toISOString();
  if (preset === "today") return { from: iso(today) };
  if (preset === "yesterday") return { from: iso(addDays(today, -1)), to: iso(today) };
  return { from: iso(addDays(today, -6)) };
}

const DHAKA_OFFSET_MS = 6 * 3600 * 1000;
function dayKey(iso: string): string {
  return new Date(Date.parse(iso) + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}
function fmtDayLabel(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}

function placeLabel(s: StayView): string {
  return s.name ?? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`;
}
function placeKey(s: StayView): string {
  return s.placeId ?? s.name ?? `${s.latitude.toFixed(3)},${s.longitude.toFixed(3)}`;
}

export default function StaysScreen() {
  const { imei: initialImei } = useLocalSearchParams<{ imei?: string }>();
  const { t, locale } = useI18n();
  const { devices, loading: devicesLoading } = useDevices();
  const [imei, setImei] = useState<string | null>(initialImei ?? null);
  const [preset, setPreset] = useState<Preset>("today");
  const [view, setView] = useState<ViewMode>("timeline");
  const [stays, setStays] = useState<StayView[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const selected = imei ?? devices[0]?.imei ?? null;

  const formatLength = (seconds: number): string => {
    const mins = Math.max(1, Math.round(seconds / 60));
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d} ${t("stays.unit.d")}`);
    if (h > 0) parts.push(`${h} ${t("stays.unit.h")}`);
    if (m > 0 && d === 0) parts.push(`${m} ${t("stays.unit.min")}`);
    return parts.join(" ");
  };

  const load = useCallback(
    async (quiet: boolean, attempt: number) => {
      if (!selected) return;
      const request = ++requestRef.current;
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const r = await deviceStays(selected, { ...rangeFor(preset), lang: locale });
        if (request !== requestRef.current) return;
        setStays(r.stays);
        const again = r.namesPending && attempt < NAME_RETRIES;
        setPending(again);
        if (again) setTimeout(() => { if (request === requestRef.current) void load(true, attempt + 1); }, NAME_RETRY_MS);
      } catch (e) {
        if (request === requestRef.current) setError(extractError(e).message);
      } finally {
        if (request === requestRef.current && !quiet) setLoading(false);
      }
    },
    [selected, preset, locale],
  );

  useEffect(() => {
    void load(false, 0);
    const ref = requestRef;
    return () => {
      ref.current++;
    };
  }, [load]);

  const timeRange = (s: StayView, withDay: boolean): string => {
    const start = s.openStart ? `${t("stays.before")} ${fmtTime(s.from)}` : fmtTime(s.from);
    const endDay = dayKey(s.to) !== dayKey(s.from) ? `${fmtDayLabel(s.to, locale)}, ` : "";
    const end = s.ongoing ? t("stays.now") : `${endDay}${fmtTime(s.to)}`;
    return `${withDay ? `${fmtDayLabel(s.from, locale)}, ` : ""}${start} – ${end}`;
  };

  const days = useMemo(() => {
    const map = new Map<string, StayView[]>();
    for (const s of stays) {
      const k = dayKey(s.from);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [stays]);

  const groups = useMemo(() => {
    const map = new Map<string, StayView[]>();
    for (const s of stays) {
      const k = placeKey(s);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return Array.from(map.values())
      .map((list) => ({ list, total: list.reduce((sum, s) => sum + s.seconds, 0) }))
      .sort((a, b) => b.total - a.total);
  }, [stays]);

  const total = stays.reduce((sum, s) => sum + s.seconds, 0);
  const placesCount = new Set(stays.map(placeKey)).size;

  const openMap = (s: StayView) =>
    void Linking.openURL(`https://www.openstreetmap.org/?mlat=${s.latitude}&mlon=${s.longitude}#map=17/${s.latitude}/${s.longitude}`);

  const row = (s: StayView, withDay: boolean) => (
    <Pressable key={s.from} onPress={() => openMap(s)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.dot, { backgroundColor: s.placeId ? colors.brandSoft : colors.bg }]}>
        <Ionicons name={s.placeId ? "home-outline" : "location-outline"} size={16} color={s.placeId ? colors.brand : colors.textDim} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.place} numberOfLines={1}>{placeLabel(s)}</Text>
        <Text style={styles.time}>{timeRange(s, withDay)}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.length}>{formatLength(s.seconds)}</Text>
        {s.ongoing && <Text style={styles.stillHere}>{t("stays.stillHere")}</Text>}
      </View>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerTitle: t("stays.title") }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load(false, 0)} tintColor={colors.brand} />}
      >
        <Text style={styles.hint}>{t("stays.hint")}</Text>

        {devices.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {devices.map((d) => (
              <Chip key={d.imei} label={d.name || d.vehiclePlate || d.imei.slice(-6)} active={d.imei === selected} onPress={() => setImei(d.imei)} />
            ))}
          </ScrollView>
        )}

        <View style={styles.chips}>
          {(["today", "yesterday", "last7"] as const).map((p) => (
            <Chip key={p} label={t(`stays.${p}` as StringKey)} active={preset === p} onPress={() => setPreset(p)} />
          ))}
        </View>
        <View style={styles.chips}>
          {(["timeline", "places"] as const).map((v) => (
            <Chip key={v} label={v === "timeline" ? t("stays.viewTimeline") : t("stays.viewPlaces")} active={view === v} onPress={() => setView(v)} />
          ))}
        </View>

        {pending && !loading && <Text style={styles.pending}>{t("stays.lookingUp")}</Text>}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {(loading || devicesLoading) && stays.length === 0 ? <Loading label={t("common.loading")} /> : null}
        {!devicesLoading && devices.length === 0 && <EmptyState text={t("veh.noneInAccount")} />}
        {!loading && selected && stays.length === 0 && !error && <EmptyState text={t("stays.none")} />}

        {stays.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.summary}>
              {placesCount} {t(placesCount === 1 ? "stays.place" : "stays.places")} · {formatLength(total)} {t("stays.total")}
            </Text>
            {view === "timeline" &&
              days.map(([k, list]) => (
                <View key={k}>
                  {days.length > 1 && <Text style={styles.dayHead}>{fmtDayLabel(list[0].from, locale)}</Text>}
                  {list.map((s) => row(s, false))}
                </View>
              ))}
            {view === "places" &&
              groups.map(({ list, total: sum }) => (
                <View key={placeKey(list[0])} style={styles.group}>
                  <View style={styles.groupHead}>
                    <Text style={styles.place} numberOfLines={1}>{placeLabel(list[0])}</Text>
                    <Text style={styles.length}>{formatLength(sum)}</Text>
                  </View>
                  <Text style={styles.time}>{list.length} {t(list.length === 1 ? "stays.visit" : "stays.visits")}</Text>
                  {list.map((s) => (
                    <Text key={s.from} style={styles.visit}>{timeRange(s, true)} · {formatLength(s.seconds)}</Text>
                  ))}
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  hint: { color: colors.textFaint, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  pending: { color: colors.textFaint, fontSize: 13 },
  error: { color: colors.danger, fontSize: 14 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  summary: { color: colors.textDim, fontSize: 14, padding: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayHead: { backgroundColor: colors.surfaceAlt, color: colors.textFaint, fontSize: 12, fontWeight: "700", textTransform: "uppercase", paddingHorizontal: space.lg, paddingVertical: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  place: { color: colors.text, fontSize: 15, fontWeight: "700" },
  time: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  length: { color: colors.text, fontSize: 15, fontWeight: "700" },
  stillHere: { color: colors.ok, fontSize: 12, fontWeight: "700" },
  group: { paddingHorizontal: space.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2 },
  groupHead: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  visit: { color: colors.textDim, fontSize: 13, marginTop: 2 },
});
