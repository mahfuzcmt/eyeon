import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getNotificationSettings, saveNotificationSettings } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { alarmTypeLabel } from "@/alarmCenter";
import { CheckBox, ErrorText, FormScreen, Heading, Hint, OkText, Panel } from "@/components/settings/kit";
import { Loading, PrimaryButton } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, space } from "@/theme";
import type { NotificationSettings } from "@/types";

type Channel = "push" | "popup" | "sound";
/** Phone first: on the app that is the column that matters. */
const CHANNELS: Channel[] = ["push", "popup", "sound"];
const CHANNEL_LABEL: Record<Channel, StringKey> = { push: "nt.push", popup: "nt.popup", sound: "nt.sound" };
const CHANNEL_HELP: Record<Channel, StringKey> = { push: "nt.pushHelp", popup: "nt.popupHelp", sound: "nt.soundHelp" };

/**
 * Vehicle-only alarm types a personal tracker never raises. They are not offered here, but
 * their current choices are sent back unchanged (the PUT replaces all three sets).
 */
const HIDDEN = new Set([
  "ACC_ON",
  "ACC_OFF",
  "EXTERNAL_LOW_VOLTAGE",
  "DOOR",
  "URGENT_ACCELERATION",
  "URGENT_DECELERATION",
  "ENGINE_IDLE",
]);

/** Per-user alarm notification matrix (alarm type x phone / popup / sound), as on the web. */
export default function NotificationsScreen() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sets, setSets] = useState<Record<Channel, Set<string>>>({ push: new Set(), popup: new Set(), sound: new Set() });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getNotificationSettings()
      .then((s) => {
        setSettings(s);
        setSets({ push: new Set(s.pushTypes), popup: new Set(s.popupTypes), sound: new Set(s.soundTypes) });
      })
      .catch((e) => setLoadError(extractError(e).message));
  }, []);

  if (loadError) {
    return (
      <FormScreen title={t("set.notifications")}>
        <ErrorText>{loadError}</ErrorText>
      </FormScreen>
    );
  }
  if (!settings) return <Loading label={t("common.loading")} />;

  const types = settings.availableTypes.filter((ty) => !HIDDEN.has(ty));

  // Sound needs a popup: ticking sound ticks popup, unticking popup clears sound (as on the web).
  function setTypes(ch: Channel, list: string[], on: boolean) {
    setSaved(false);
    setSets((prev) => {
      const next = { push: new Set(prev.push), popup: new Set(prev.popup), sound: new Set(prev.sound) };
      for (const ty of list) {
        if (on) next[ch].add(ty);
        else next[ch].delete(ty);
        if (ch === "sound" && on) next.popup.add(ty);
        if (ch === "popup" && !on) next.sound.delete(ty);
      }
      return next;
    });
  }

  const allOn = (ch: Channel) => types.length > 0 && types.every((ty) => sets[ch].has(ty));

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const s = await saveNotificationSettings({
        pushTypes: [...sets.push],
        popupTypes: [...sets.popup],
        soundTypes: [...sets.sound],
      });
      setSettings(s);
      setSaved(true);
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen title={t("set.notifications")}>
      <View style={{ gap: space.xs }}>
        <Heading>{t("nt.title")}</Heading>
        <Hint>{t("nt.intro")}</Hint>
        {!settings.customized ? <Text style={styles.note}>{t("nt.defaults")}</Text> : null}
      </View>

      <Panel style={styles.table}>
        <View style={[styles.row, styles.headRow]}>
          <Text style={[styles.typeCell, styles.headText]}>{t("nt.type")}</Text>
          {CHANNELS.map((ch) => (
            <View key={ch} style={styles.cell}>
              <Text style={styles.headText} numberOfLines={1}>
                {t(CHANNEL_LABEL[ch])}
              </Text>
              <CheckBox
                checked={allOn(ch)}
                onPress={() => setTypes(ch, types, !allOn(ch))}
                label={`${t(CHANNEL_LABEL[ch])}: ${t("nt.all")}`}
              />
            </View>
          ))}
        </View>
        {types.map((ty, i) => {
          const label = alarmTypeLabel(ty, t);
          return (
            <View key={ty} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
              <Text style={styles.typeCell}>{label}</Text>
              {CHANNELS.map((ch) => (
                <View key={ch} style={styles.cell}>
                  <CheckBox
                    checked={sets[ch].has(ty)}
                    onPress={() => setTypes(ch, [ty], !sets[ch].has(ty))}
                    label={`${label}: ${t(CHANNEL_LABEL[ch])}`}
                  />
                </View>
              ))}
            </View>
          );
        })}
      </Panel>

      <View style={{ gap: space.xs }}>
        {CHANNELS.map((ch) => (
          <Hint key={ch}>
            <Text style={styles.helpLead}>{t(CHANNEL_LABEL[ch])}:</Text> {t(CHANNEL_HELP[ch])}
          </Hint>
        ))}
      </View>

      {error ? <ErrorText>{error}</ErrorText> : null}
      {saved ? <OkText>{t("set.saved")}</OkText> : null}
      <PrimaryButton label={t("set.save")} onPress={() => void save()} loading={busy} />
    </FormScreen>
  );
}

const CELL = 56;

const styles = StyleSheet.create({
  note: { color: colors.brand, fontSize: 13, fontWeight: "600" },
  table: { padding: 0, gap: 0, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingLeft: space.md, paddingRight: space.xs, minHeight: 52 },
  rowAlt: { backgroundColor: colors.surfaceAlt },
  headRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: space.xs },
  typeCell: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "600", paddingRight: space.sm },
  cell: { width: CELL, alignItems: "center" },
  headText: { color: colors.textDim, fontSize: 12, fontWeight: "700" },
  helpLead: { color: colors.textDim, fontWeight: "700" },
});
