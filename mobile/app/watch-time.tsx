import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { getWatchTime, saveWatchTime, type WatchTimeView } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { Chip, EmptyState, Loading, PrimaryButton } from "@/ui";
import { useI18n } from "@/i18n";
import { clock12 } from "@/format";
import { colors, radius, space } from "@/theme";

/**
 * Time zone and language of a smart watch (shown only for watches, from the Controls tab).
 * The watch protocol sets both with one command and has none for the date or the time: the
 * watch takes its clock from the mobile network, the zone decides what it shows. A watch that
 * is not connected gets the change when it next connects ("Waiting for the watch").
 */

/** Codes of the watch protocol, each named in its own language. */
const LANGUAGES: { code: number; label: string }[] = [
  { code: 0, label: "English" },
  { code: 1, label: "简体中文" },
  { code: 3, label: "Português" },
  { code: 4, label: "Español" },
  { code: 5, label: "Deutsch" },
  { code: 7, label: "Türkçe" },
  { code: 8, label: "Tiếng Việt" },
  { code: 9, label: "Русский" },
  { code: 10, label: "Français" },
];
const MIN_ZONE = -12;
const MAX_ZONE = 14;
const POLL_MS = 5000;
const MAX_POLLS = 12;

/** The phone's own zone in whole hours; the watch takes whole hours only. */
function phoneZone(): number {
  return Math.max(MIN_ZONE, Math.min(MAX_ZONE, Math.round(-new Date().getTimezoneOffset() / 60)));
}

export function zoneLabel(hours: number): string {
  return hours === 0 ? "UTC" : `UTC${hours > 0 ? "+" : "−"}${Math.abs(hours)}`;
}

/** "2:05 PM" (or "দুপুর ২:০৫") in the zone `hours` from UTC. */
export function clockIn(hours: number, now: Date, bn = false): string {
  const d = new Date(now.getTime() + hours * 3_600_000);
  return clock12(d.getUTCHours(), d.getUTCMinutes(), bn);
}

export default function WatchTime() {
  const { imei, name } = useLocalSearchParams<{ imei: string; name?: string }>();
  const { t, locale } = useI18n();
  const [view, setView] = useState<WatchTimeView | null>(null);
  const [zone, setZone] = useState(phoneZone());
  const [language, setLanguage] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const polls = useRef(0);

  const load = useCallback(async () => {
    if (!imei) return;
    try {
      const v = await getWatchTime(imei);
      setView(v);
      if (v.zoneHours != null) setZone(v.zoneHours);
      if (v.language != null) setLanguage(v.language);
      setLoadError(null);
    } catch (e) {
      setLoadError(extractError(e).message);
    }
  }, [imei]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  // While a change waits for the watch, look again every few seconds for a minute.
  useEffect(() => {
    if (view?.status !== "PENDING" || !imei) return;
    if (polls.current >= MAX_POLLS) return;
    const id = setTimeout(async () => {
      polls.current++;
      try {
        const v = await getWatchTime(imei);
        setView(v);
      } catch {
        /* keep what is shown */
      }
    }, POLL_MS);
    return () => clearTimeout(id);
  }, [view, imei]);

  const save = async () => {
    if (!imei) return;
    setSaving(true);
    setSaveError(null);
    polls.current = 0;
    try {
      setView(await saveWatchTime(imei, language, zone));
    } catch (e) {
      setSaveError(extractError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const title = name ? `${name} · ${t("wt.title")}` : t("wt.title");
  if (!view && !loadError) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerTitle: title }} />
        <Loading />
      </View>
    );
  }
  if (!view) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerTitle: title }} />
        <EmptyState text={loadError ?? ""} />
        <View style={styles.retry}>
          <PrimaryButton label={t("common.retry")} onPress={() => void load()} />
        </View>
      </View>
    );
  }

  const unchanged = view.zoneHours === zone && view.language === language;
  const statusText = t(view.status === "SYNCED" ? "wt.status.SYNCED" : view.status === "PENDING" ? "wt.status.PENDING" : "wt.status.NONE");
  const statusColor = view.status === "SYNCED" ? colors.ok : view.status === "PENDING" ? colors.warn : colors.textFaint;
  const phone = phoneZone();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerTitle: title }} />

      <View style={styles.statusBar}>
        <View style={[styles.dot, { backgroundColor: view.online ? colors.ok : colors.textFaint }]} />
        <Text style={styles.statusText}>{t(view.online ? "wt.online" : "wt.offline")}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{t("wt.zone")}</Text>
          <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
        </View>
        <Text style={styles.hint}>{t("wt.zoneHint")}</Text>
        <View style={styles.stepper}>
          <Pressable
            style={[styles.stepBtn, zone <= MIN_ZONE && styles.stepOff]}
            disabled={zone <= MIN_ZONE}
            onPress={() => setZone((z) => Math.max(MIN_ZONE, z - 1))}
            accessibilityRole="button"
            accessibilityLabel={zoneLabel(Math.max(MIN_ZONE, zone - 1))}
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.zoneValue}>{zoneLabel(zone)}</Text>
          <Pressable
            style={[styles.stepBtn, zone >= MAX_ZONE && styles.stepOff]}
            disabled={zone >= MAX_ZONE}
            onPress={() => setZone((z) => Math.min(MAX_ZONE, z + 1))}
            accessibilityRole="button"
            accessibilityLabel={zoneLabel(Math.min(MAX_ZONE, zone + 1))}
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.now}>
          {t("wt.timeNow")}: <Text style={styles.nowValue}>{clockIn(zone, now, locale === "bn")}</Text>
        </Text>
        {zone !== phone ? (
          <View style={styles.chips}>
            <Chip label={`${t("wt.phoneZone")} (${zoneLabel(phone)})`} active={false} onPress={() => setZone(phone)} />
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("wt.language")}</Text>
        <Text style={styles.hint}>{t("wt.languageHint")}</Text>
        <View style={styles.chips}>
          {LANGUAGES.map((l) => (
            <Chip key={l.code} label={l.label} active={language === l.code} onPress={() => setLanguage(l.code)} />
          ))}
        </View>
      </View>

      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
      <PrimaryButton label={saving ? t("ts.saving") : t("ts.save")} loading={saving} disabled={unchanged && view.status === "SYNCED"} onPress={() => void save()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  retry: { padding: space.lg },
  statusBar: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { flex: 1, color: colors.textDim, fontSize: 14 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: space.sm },
  cardTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "700" },
  status: { fontSize: 13, fontWeight: "700" },
  hint: { color: colors.textFaint, fontSize: 14 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.lg, marginTop: space.sm },
  stepBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.brand, alignItems: "center", justifyContent: "center" },
  stepOff: { opacity: 0.35 },
  stepText: { color: colors.brand, fontSize: 28, fontWeight: "700", lineHeight: 30 },
  zoneValue: { minWidth: 110, textAlign: "center", color: colors.text, fontSize: 26, fontWeight: "700" },
  now: { textAlign: "center", color: colors.textDim, fontSize: 15 },
  nowValue: { color: colors.text, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "flex-start" },
  errorText: { color: colors.danger, fontSize: 14 },
});
