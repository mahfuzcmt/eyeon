import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { extractError } from "@/api/client";
import { useI18n } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";
import { PROCESS_RESULTS, alarmTitle, resultLabel } from "@/alarmCenter";
import type { AlarmAcknowledgeRequest, AlarmProcessResult, AlarmView } from "@/types";
import { Sheet, SheetButtons } from "./Sheet";

/** "Process" step: acknowledge an alarm with a result and an optional note (same as the web dialog). */
export function ProcessSheet({
  alarm,
  who,
  onConfirm,
  onClose,
}: {
  alarm: AlarmView | null;
  who: string;
  onConfirm: (id: string, body: AlarmAcknowledgeRequest) => Promise<unknown>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [result, setResult] = useState<AlarmProcessResult>("HANDLED");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (alarm) {
      setResult("HANDLED");
      setNotes("");
      setError(null);
      setBusy(false);
    }
  }, [alarm]);

  async function submit() {
    if (!alarm) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(alarm.id, { result, notes: notes.trim() || undefined });
      onClose();
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={alarm != null}
      title={t("alc.process")}
      subtitle={alarm ? `${alarmTitle(alarm, t)} · ${who}` : undefined}
      onClose={onClose}
      footer={
        <SheetButtons
          secondary={t("common.cancel")}
          onSecondary={onClose}
          primary={busy ? t("common.loading") : t("alc.acknowledge")}
          onPrimary={() => void submit()}
          busy={busy}
        />
      }
    >
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        <Text style={styles.label}>{t("alc.result")}</Text>
        {PROCESS_RESULTS.map((r) => {
          const on = r === result;
          return (
            <Pressable
              key={r}
              onPress={() => setResult(r)}
              style={[styles.option, on && styles.optionOn]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
            >
              <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={22} color={on ? colors.brand : colors.textFaint} />
              <Text style={styles.optionText}>{resultLabel(r, t)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: space.xs }}>
        <Text style={styles.label}>{t("alc.notes")}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={1000}
          placeholder={t("alc.notesPlaceholder")}
          placeholderTextColor={colors.textFaint}
          style={styles.notes}
          textAlignVertical="top"
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textDim, fontSize: 14, fontWeight: "700" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  optionText: { color: colors.text, fontSize: 16, fontWeight: "600", flex: 1 },
  notes: {
    minHeight: 96,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: space.md,
    color: colors.text,
    fontSize: 16,
  },
  error: { color: colors.danger, fontSize: 14 },
});
