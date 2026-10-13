import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Chip } from "@/ui";
import { useI18n } from "@/i18n";
import { colors, space } from "@/theme";
import { FILTER_TYPES, SEVERITIES, alarmTypeLabel, severityLabel } from "@/alarmCenter";
import type { DeviceView } from "@/types";
import { Sheet, SheetButtons } from "./Sheet";

export interface AlarmFilterValues {
  type: string;
  severity: string;
  imei: string;
  unacked: boolean;
}

export const EMPTY_FILTER: AlarmFilterValues = { type: "", severity: "", imei: "", unacked: false };

export function activeFilterCount(f: AlarmFilterValues): number {
  return (f.type ? 1 : 0) + (f.severity ? 1 : 0) + (f.imei ? 1 : 0) + (f.unacked ? 1 : 0);
}

/** Type / severity / person / unacknowledged filters, applied together with one button. */
export function AlarmFilterSheet({
  visible,
  value,
  devices,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: AlarmFilterValues;
  devices: DeviceView[];
  onApply: (v: AlarmFilterValues) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);

  // Start from the applied filters every time the sheet opens.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const set = <K extends keyof AlarmFilterValues>(k: K, v: AlarmFilterValues[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Sheet
      visible={visible}
      title={t("alc.filters")}
      onClose={onClose}
      footer={
        <SheetButtons
          secondary={t("alc.reset")}
          onSecondary={() => setDraft(EMPTY_FILTER)}
          primary={t("common.apply")}
          onPrimary={() => onApply(draft)}
        />
      }
    >
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t("alc.unackedOnly")}</Text>
        <Switch
          value={draft.unacked}
          onValueChange={(v) => set("unacked", v)}
          trackColor={{ true: colors.brand, false: colors.border }}
          thumbColor={colors.surface}
          accessibilityLabel={t("alc.unackedOnly")}
        />
      </View>

      <Group label={t("alc.person")}>
        <Chip label={t("alc.everyone")} active={!draft.imei} onPress={() => set("imei", "")} />
        {devices.map((d) => (
          <Chip
            key={d.imei}
            label={d.name || d.vehiclePlate || d.imei.slice(-6)}
            active={draft.imei === d.imei}
            onPress={() => set("imei", d.imei)}
          />
        ))}
      </Group>

      <Group label={t("alc.severity")}>
        <Chip label={t("alc.allSeverities")} active={!draft.severity} onPress={() => set("severity", "")} />
        {SEVERITIES.map((s) => (
          <Chip key={s} label={severityLabel(s, t)} active={draft.severity === s} onPress={() => set("severity", s)} />
        ))}
      </Group>

      <Group label={t("alc.type")}>
        <Chip label={t("alc.allTypes")} active={!draft.type} onPress={() => set("type", "")} />
        {FILTER_TYPES.map((ty) => (
          <Chip key={ty} label={alarmTypeLabel(ty, t)} active={draft.type === ty} onPress={() => set("type", ty)} />
        ))}
      </Group>
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.wrap}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md, minHeight: 48 },
  switchLabel: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" },
  groupLabel: { color: colors.textDim, fontSize: 14, fontWeight: "700" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
