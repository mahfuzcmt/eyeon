import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { getTrackerSettings, readTrackerSettings, saveTrackerSetting } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { Chip, EmptyState, Loading, PrimaryButton } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { TrackerSettingItem, TrackerSettingKey, TrackerSettingsData, TrackerSettingStatus, TrackerSettingValue } from "@/types";

/**
 * The tracker's own settings (Jimi PL601), same cards as the web panel: SOS numbers, calls,
 * reporting, night rest, alarms, power. Each card saves on its own; "On the tracker" means the
 * tracker itself confirmed the value. A tracker that is not connected gets the change when it
 * next connects.
 */

const POLL_MS = 2500;
const MAX_POLLS = 16;

const DEFAULTS: Record<TrackerSettingKey, TrackerSettingValue> = {
  SOS_NUMBERS: { numbers: [] },
  SOS_ALARM: { enabled: true, method: 0 },
  CALL_PERMISSION: { who: 2 },
  ANSWER_MODE: { auto: false },
  CALL_VOLUME: { level: 5 },
  RING_VOLUME: { level: 4 },
  REPORTING: { mode: 4, steps: 100, idleWait: 300, accel: 10, riding: 300 },
  HEARTBEAT: { minutes: 7 },
  NIGHT_REST: { enabled: false, from: "00:00", to: "07:00" },
  QUIET_HOURS: { enabled: false, from: "08:00", to: "13:00" },
  LOW_BATTERY_ALARM: { enabled: true, method: 0 },
  FALL_ALARM: { enabled: false, method: 0, immobileSeconds: 30, muteMinutes: 3 },
  POWER_OFF_LOCK: { enabled: false },
  AUTO_POWER_ON: { enabled: true },
};

const REPORTING_DEFAULTS: Record<number, TrackerSettingValue> = {
  1: { mode: 1, interval: 300 },
  2: { mode: 2, moving: 10, still: 300 },
  4: { mode: 4, steps: 100, idleWait: 300, accel: 10, riding: 300 },
};

const STATUS_COLOR: Record<TrackerSettingStatus, string> = {
  UNKNOWN: colors.textFaint,
  SYNCED: colors.ok,
  PENDING: colors.warn,
  FAILED: colors.danger,
  UNSUPPORTED: colors.textFaint,
};

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}
function withCurrent(options: number[], current: number): number[] {
  return options.includes(current) ? options : [...options, current].sort((a, b) => a - b);
}
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function TrackerSettingsScreen() {
  const { imei, name } = useLocalSearchParams<{ imei: string; name?: string }>();
  const { t } = useI18n();
  const [data, setData] = useState<TrackerSettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<TrackerSettingKey, TrackerSettingValue>>>({});
  const [saving, setSaving] = useState<TrackerSettingKey | null>(null);
  const [cardError, setCardError] = useState<Partial<Record<TrackerSettingKey, string>>>({});
  const polls = useRef(0);

  const load = useCallback(async () => {
    if (!imei) return null;
    try {
      const d = await getTrackerSettings(imei);
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError(extractError(e).message);
      return null;
    }
  }, [imei]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const first = await load();
      if (cancelled || !first || !imei) return;
      if (first.online && !first.reading && first.settings.every((s) => s.status === "UNKNOWN")) {
        await readTrackerSettings(imei);
        if (!cancelled) void load();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, imei]);

  const busy = data != null && (data.reading || (data.online && data.settings.some((s) => s.status === "PENDING")));
  useEffect(() => {
    if (!busy) {
      polls.current = 0;
      return;
    }
    if (polls.current >= MAX_POLLS) return;
    const id = setTimeout(() => {
      polls.current += 1;
      void load();
    }, POLL_MS);
    return () => clearTimeout(id);
  }, [busy, data, load]);

  const items = useMemo(() => {
    const m = new Map<TrackerSettingKey, TrackerSettingItem>();
    for (const s of data?.settings ?? []) m.set(s.key, s);
    return m;
  }, [data]);

  const value = (key: TrackerSettingKey): TrackerSettingValue => {
    const item = items.get(key);
    const stored = item && (item.status === "PENDING" || item.status === "FAILED") ? item.wanted : null;
    return drafts[key] ?? stored ?? item?.applied ?? DEFAULTS[key];
  };
  const edit = (key: TrackerSettingKey, patch: TrackerSettingValue) => setDrafts((p) => ({ ...p, [key]: { ...value(key), ...patch } }));
  const replace = (key: TrackerSettingKey, next: TrackerSettingValue) => setDrafts((p) => ({ ...p, [key]: next }));
  const discard = (key: TrackerSettingKey) =>
    setDrafts((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });

  const save = async (key: TrackerSettingKey) => {
    const draft = drafts[key];
    if (!draft || !imei) return;
    const v = value(key);
    for (const f of ["from", "to"]) {
      if (typeof v[f] === "string" && !TIME_RE.test(v[f] as string)) {
        setCardError((p) => ({ ...p, [key]: `${f === "from" ? t("ts.from") : t("ts.to")}: HH:MM` }));
        return;
      }
    }
    setSaving(key);
    setCardError((p) => ({ ...p, [key]: undefined }));
    try {
      const item = await saveTrackerSetting(imei, key, draft);
      setData((prev) => (prev ? { ...prev, settings: prev.settings.map((s) => (s.key === key ? item : s)) } : prev));
      discard(key);
      polls.current = 0;
    } catch (e) {
      setCardError((p) => ({ ...p, [key]: extractError(e).message }));
    } finally {
      setSaving(null);
    }
  };

  const seconds = (s: number): string => {
    if (s < 60) return `${s} ${t("ts.unit.s")}`;
    if (s < 3600) return `${Math.round(s / 60)} ${t("ts.unit.min")}`;
    return `${Math.round(s / 360) / 10} ${t("ts.unit.h")}`;
  };

  if (!imei) return <EmptyState text={t("det.noDevice")} />;
  if (!data && !error) return <Loading label={t("common.loading")} />;

  const needsNumbers = (key: TrackerSettingKey): boolean => {
    const numbers = value("SOS_NUMBERS").numbers;
    const filled = Array.isArray(numbers) ? numbers.filter((n) => String(n).trim() !== "").length : 0;
    return value(key).enabled === true && num(value(key).method, 0) > 0 && filled === 0;
  };

  const card = (key: TrackerSettingKey, title: string, body: React.ReactNode, hint?: string) => {
    const item = items.get(key);
    const status: TrackerSettingStatus = item?.status ?? "UNKNOWN";
    return (
      <View style={styles.card} key={key}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={[styles.status, { color: STATUS_COLOR[status] }]}>{t(`ts.status.${status}` as StringKey)}</Text>
        </View>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        <View style={[styles.cardBody, status === "UNSUPPORTED" && { opacity: 0.5 }]} pointerEvents={status === "UNSUPPORTED" ? "none" : "auto"}>
          {body}
        </View>
        {status === "FAILED" && item?.trackerReply ? <Text style={styles.reply}>{item.trackerReply}</Text> : null}
        {cardError[key] ? <Text style={styles.errorText}>{cardError[key]}</Text> : null}
        {drafts[key] && (
          <View style={styles.actions}>
            <Pressable onPress={() => discard(key)} style={styles.ghost}>
              <Text style={styles.ghostText}>{t("common.cancel")}</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <PrimaryButton label={saving === key ? t("ts.saving") : t("ts.save")} loading={saving === key} disabled={saving !== null} onPress={() => void save(key)} />
            </View>
          </View>
        )}
      </View>
    );
  };

  const toggle = (key: TrackerSettingKey, field: string, label: string) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value(key)[field] === true} onValueChange={(on) => edit(key, { [field]: on })} trackColor={{ true: colors.brand }} />
    </View>
  );

  const chips = (key: TrackerSettingKey, field: string, options: { v: number; label: string }[]) => {
    const current = num(value(key)[field], options[0]?.v ?? 0);
    return (
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip key={o.v} label={o.label} active={current === o.v} onPress={() => edit(key, { [field]: o.v })} />
        ))}
      </View>
    );
  };

  const methodChips = (key: TrackerSettingKey) => (
    <View style={{ gap: space.xs }}>
      <Text style={styles.fieldLabel}>{t("ts.method")}</Text>
      {chips(key, "method", [0, 1, 2, 3].map((m) => ({ v: m, label: t(`ts.method.${m}` as StringKey) })))}
      {needsNumbers(key) && <Text style={styles.warning}>{t("ts.methodNeedsNumbers")}</Text>}
    </View>
  );

  const secondsChips = (key: TrackerSettingKey, field: string, options: number[], fallback: number, zeroLabel?: string) => {
    const current = num(value(key)[field], fallback);
    return chips(key, field, withCurrent(options, current).map((s) => ({ v: s, label: s === 0 && zeroLabel ? zeroLabel : seconds(s) })));
  };

  const timeRange = (key: TrackerSettingKey, fromDefault: string, toDefault: string) => (
    <View style={styles.timeRow}>
      {(["from", "to"] as const).map((f) => (
        <View key={f} style={{ flex: 1, gap: space.xs }}>
          <Text style={styles.fieldLabel}>{f === "from" ? t("ts.from") : t("ts.to")}</Text>
          <TextInput
            style={styles.input}
            value={str(value(key)[f], f === "from" ? fromDefault : toDefault)}
            placeholder="HH:MM"
            placeholderTextColor={colors.textFaint}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            onChangeText={(text) => edit(key, { [f]: text })}
          />
        </View>
      ))}
    </View>
  );

  const sosNumbers = (() => {
    const raw = value("SOS_NUMBERS").numbers;
    const list = Array.isArray(raw) ? raw.map((n) => String(n)) : [];
    return [0, 1, 2, 3].map((i) => list[i] ?? "");
  })();
  const reporting = value("REPORTING");
  const mode = num(reporting.mode, 4);
  const levels = [1, 2, 3, 4, 5, 6, 7].map((l) => ({ v: l, label: String(l) }));

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerTitle: t("ts.title") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusBar}>
          <View style={[styles.dot, { backgroundColor: data?.online ? colors.ok : colors.offline }]} />
          <Text style={styles.statusText}>{name ? `${name} · ` : ""}{data?.online ? t("ts.online") : t("ts.offline")}</Text>
        </View>
        <Pressable
          disabled={!data?.online || data.reading}
          onPress={() => void (async () => { await readTrackerSettings(imei); polls.current = 0; await load(); })()}
          style={({ pressed }) => [styles.readBtn, (!data?.online || data?.reading) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.readBtnText}>{data?.reading ? t("ts.reading") : t("ts.read")}</Text>
        </Pressable>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.section}>{t("ts.sec.emergency")}</Text>
        {card(
          "SOS_NUMBERS",
          t("ts.SOS_NUMBERS"),
          <View style={{ gap: space.sm }}>
            {sosNumbers.map((n, i) => (
              <TextInput
                key={i}
                style={styles.input}
                value={n}
                placeholder={`${t("ts.SOS_NUMBERS.placeholder")} ${i + 1}`}
                placeholderTextColor={colors.textFaint}
                keyboardType="phone-pad"
                onChangeText={(text) => {
                  const next = [...sosNumbers];
                  next[i] = text;
                  replace("SOS_NUMBERS", { numbers: next });
                }}
              />
            ))}
          </View>,
          t("ts.SOS_NUMBERS.hint"),
        )}
        {card("SOS_ALARM", t("ts.SOS_ALARM"), <>{toggle("SOS_ALARM", "enabled", t("ts.on"))}{methodChips("SOS_ALARM")}</>, t("ts.SOS_ALARM.hint"))}

        <Text style={styles.section}>{t("ts.sec.calls")}</Text>
        {card("CALL_PERMISSION", t("ts.CALL_PERMISSION"), chips("CALL_PERMISSION", "who", [0, 2, 3].map((w) => ({ v: w, label: t(`ts.who.${w}` as StringKey) }))))}
        {card("ANSWER_MODE", t("ts.ANSWER_MODE"), toggle("ANSWER_MODE", "auto", t("ts.on")), t("ts.ANSWER_MODE.hint"))}
        {card("CALL_VOLUME", t("ts.CALL_VOLUME"), chips("CALL_VOLUME", "level", levels))}
        {card("RING_VOLUME", t("ts.RING_VOLUME"), chips("RING_VOLUME", "level", levels))}

        <Text style={styles.section}>{t("ts.sec.location")}</Text>
        {card(
          "REPORTING",
          t("ts.REPORTING"),
          <View style={{ gap: space.md }}>
            <View style={styles.chips}>
              {[2, 4, 1].map((m) => (
                <Chip key={m} label={t(`ts.mode.${m}` as StringKey)} active={mode === m} onPress={() => replace("REPORTING", REPORTING_DEFAULTS[m])} />
              ))}
            </View>
            {mode === 2 && (
              <>
                <Text style={styles.fieldLabel}>{t("ts.moving")}</Text>
                {secondsChips("REPORTING", "moving", [10, 30, 60, 120, 300], 10)}
                <Text style={styles.fieldLabel}>{t("ts.still")}</Text>
                {secondsChips("REPORTING", "still", [0, 300, 600, 1800, 3600], 300, t("ts.stillNever"))}
              </>
            )}
            {mode === 4 && (
              <>
                <Text style={styles.fieldLabel}>{t("ts.steps")}</Text>
                {chips("REPORTING", "steps", withCurrent([50, 100, 200, 500], num(reporting.steps, 100)).map((s) => ({ v: s, label: `${s} ${t("ts.stepsUnit")}` })))}
                <Text style={styles.fieldLabel}>{t("ts.riding")}</Text>
                {secondsChips("REPORTING", "riding", [60, 120, 300, 600], 300)}
              </>
            )}
            {mode === 1 && (
              <>
                <Text style={styles.fieldLabel}>{t("ts.interval")}</Text>
                {secondsChips("REPORTING", "interval", [60, 300, 600, 1800, 3600], 300)}
              </>
            )}
          </View>,
          t("ts.REPORTING.hint"),
        )}
        {card("HEARTBEAT", t("ts.HEARTBEAT"), chips("HEARTBEAT", "minutes", [1, 2, 3, 4, 5, 6, 7, 8].map((m) => ({ v: m, label: `${m} ${t("ts.unit.min")}` }))), t("ts.HEARTBEAT.hint"))}

        <Text style={styles.section}>{t("ts.sec.rest")}</Text>
        {card(
          "NIGHT_REST",
          t("ts.NIGHT_REST"),
          <>
            {toggle("NIGHT_REST", "enabled", t("ts.on"))}
            {timeRange("NIGHT_REST", "00:00", "07:00")}
            {value("NIGHT_REST").enabled === true && <Text style={styles.warning}>{t("ts.NIGHT_REST.warning")}</Text>}
          </>,
          t("ts.NIGHT_REST.hint"),
        )}
        {card("QUIET_HOURS", t("ts.QUIET_HOURS"), <>{toggle("QUIET_HOURS", "enabled", t("ts.on"))}{timeRange("QUIET_HOURS", "08:00", "13:00")}</>, t("ts.QUIET_HOURS.hint"))}

        <Text style={styles.section}>{t("ts.sec.alarms")}</Text>
        {card("LOW_BATTERY_ALARM", t("ts.LOW_BATTERY_ALARM"), <>{toggle("LOW_BATTERY_ALARM", "enabled", t("ts.on"))}{methodChips("LOW_BATTERY_ALARM")}</>)}
        {card(
          "FALL_ALARM",
          t("ts.FALL_ALARM"),
          <>
            {toggle("FALL_ALARM", "enabled", t("ts.on"))}
            {methodChips("FALL_ALARM")}
            <Text style={styles.fieldLabel}>{t("ts.immobile")}</Text>
            {secondsChips("FALL_ALARM", "immobileSeconds", [30, 60, 120, 300], 30)}
          </>,
          t("ts.FALL_ALARM.hint"),
        )}

        <Text style={styles.section}>{t("ts.sec.power")}</Text>
        {card("POWER_OFF_LOCK", t("ts.POWER_OFF_LOCK"), toggle("POWER_OFF_LOCK", "enabled", t("ts.on")), t("ts.POWER_OFF_LOCK.hint"))}
        {card("AUTO_POWER_ON", t("ts.AUTO_POWER_ON"), toggle("AUTO_POWER_ON", "enabled", t("ts.on")))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  statusBar: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { flex: 1, color: colors.textDim, fontSize: 14 },
  readBtn: { alignSelf: "flex-start", paddingHorizontal: space.lg, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.brand },
  readBtnText: { color: colors.brand, fontWeight: "700", fontSize: 15 },
  section: { marginTop: space.sm, color: colors.textFaint, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: space.sm },
  cardTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "700" },
  status: { fontSize: 13, fontWeight: "700" },
  hint: { color: colors.textFaint, fontSize: 14 },
  cardBody: { gap: space.md, marginTop: space.xs },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLabel: { color: colors.text, fontSize: 15 },
  fieldLabel: { color: colors.textFaint, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  timeRow: { flexDirection: "row", gap: space.md },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: space.md, color: colors.text, fontSize: 16, backgroundColor: colors.surface },
  warning: { backgroundColor: "#FFF4D6", color: "#7A4B00", padding: space.md, borderRadius: radius.sm, fontSize: 14, fontWeight: "600" },
  reply: { color: colors.danger, fontSize: 12, fontFamily: "monospace" },
  errorText: { color: colors.danger, fontSize: 14 },
  actions: { flexDirection: "row", gap: space.sm, alignItems: "center", marginTop: space.xs },
  ghost: { paddingHorizontal: space.lg, paddingVertical: 12 },
  ghostText: { color: colors.textDim, fontWeight: "600", fontSize: 15 },
});
