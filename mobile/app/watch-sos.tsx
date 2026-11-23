import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { getWatchSos, saveWatchSos, type WatchSosView } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { EmptyState, Loading, PrimaryButton } from "@/ui";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";

/**
 * SOS numbers of a smart watch (shown only for watches, from the Controls tab). Up to three,
 * called in this order when the watch's SOS button is held; each also gets a text from the
 * watch. The watch cannot be asked which numbers it holds, so this shows what was last sent and
 * whether the watch acknowledged it. A watch that is not connected gets them when it next
 * connects ("Waiting for the watch").
 */

const SLOTS = 3;
const POLL_MS = 5000;
const MAX_POLLS = 12;
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** What the server accepts: separators dropped, then digits with an optional leading +. */
function clean(n: string): string {
  return n.replace(/[\s\-().]/g, "");
}

function fill(numbers: string[]): string[] {
  return Array.from({ length: SLOTS }, (_, i) => numbers[i] ?? "");
}

export default function WatchSos() {
  const { imei, name } = useLocalSearchParams<{ imei: string; name?: string }>();
  const { t, locale } = useI18n();
  const [view, setView] = useState<WatchSosView | null>(null);
  const [numbers, setNumbers] = useState<string[]>(fill([]));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const polls = useRef(0);

  const load = useCallback(async () => {
    if (!imei) return;
    try {
      const v = await getWatchSos(imei);
      setView(v);
      setNumbers(fill(v.numbers));
      setLoadError(null);
    } catch (e) {
      setLoadError(extractError(e).message);
    }
  }, [imei]);

  useEffect(() => {
    void load();
  }, [load]);

  // While a change waits for the watch, look again every few seconds for a minute.
  useEffect(() => {
    if (view?.status !== "PENDING" || !imei) return;
    if (polls.current >= MAX_POLLS) return;
    const id = setTimeout(async () => {
      polls.current++;
      try {
        setView(await getWatchSos(imei));
      } catch {
        /* keep what is shown */
      }
    }, POLL_MS);
    return () => clearTimeout(id);
  }, [view, imei]);

  const wanted = numbers.map(clean).filter((n) => n.length > 0);
  const invalid = wanted.some((n) => !/^\+?\d{3,15}$/.test(n));
  const twice = new Set(wanted).size !== wanted.length;
  const unchanged = view != null && wanted.join(",") === view.numbers.join(",");

  const save = async () => {
    if (!imei || invalid || twice) return;
    setSaving(true);
    setSaveError(null);
    polls.current = 0;
    try {
      const v = await saveWatchSos(imei, wanted);
      setView(v);
      setNumbers(fill(v.numbers));
    } catch (e) {
      setSaveError(extractError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const setAt = (i: number, value: string) => setNumbers((ns) => ns.map((n, j) => (j === i ? value : n)));
  const slotLabel = (i: number) => t("ws.number").replace("{n}", locale === "bn" ? BN_DIGITS[i + 1] : String(i + 1));

  const title = name ? `${name} · ${t("ws.title")}` : t("ws.title");
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

  const statusText = t(view.status === "SYNCED" ? "wt.status.SYNCED" : view.status === "PENDING" ? "wt.status.PENDING" : "wt.status.NONE");
  const statusColor = view.status === "SYNCED" ? colors.ok : view.status === "PENDING" ? colors.warn : colors.textFaint;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerTitle: title }} />

      <View style={styles.statusBar}>
        <View style={[styles.dot, { backgroundColor: view.online ? colors.ok : colors.textFaint }]} />
        <Text style={styles.statusText}>{t(view.online ? "wt.online" : "wt.offline")}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{t("ws.title")}</Text>
          <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
        </View>
        <Text style={styles.hint}>{t("ws.hint")}</Text>

        {numbers.map((n, i) => (
          <View key={i} style={styles.slot}>
            <Text style={styles.label}>
              {slotLabel(i)}
              {i === 0 ? <Text style={styles.labelNote}> · {t("ws.first")}</Text> : null}
            </Text>
            <View style={styles.row}>
              <TextInput
                value={n}
                onChangeText={(v) => setAt(i, v)}
                keyboardType="phone-pad"
                placeholder="01XXXXXXXXX"
                placeholderTextColor={colors.textFaint}
                maxLength={20}
                style={styles.input}
                accessibilityLabel={slotLabel(i)}
              />
              {n.length > 0 ? (
                <Pressable onPress={() => setAt(i, "")} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel={`${t("ws.clear")} ${slotLabel(i)}`}>
                  <Text style={styles.clearText}>{t("ws.clear")}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}

        {wanted.length === 0 ? <Text style={styles.hint}>{t("ws.none")}</Text> : null}
      </View>

      {invalid ? <Text style={styles.errorText}>{t("ws.bad")}</Text> : null}
      {!invalid && twice ? <Text style={styles.errorText}>{t("ws.twice")}</Text> : null}
      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
      <PrimaryButton
        label={saving ? t("ts.saving") : t("ts.save")}
        loading={saving}
        disabled={invalid || twice || (unchanged && view.status === "SYNCED")}
        onPress={() => void save()}
      />
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
  slot: { gap: space.xs, marginTop: space.sm },
  label: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
  labelNote: { color: colors.textFaint, fontWeight: "400" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: 17,
    backgroundColor: colors.bg,
  },
  clearBtn: { paddingHorizontal: space.sm, paddingVertical: space.sm, minHeight: 44, justifyContent: "center" },
  clearText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  errorText: { color: colors.danger, fontSize: 14 },
});
