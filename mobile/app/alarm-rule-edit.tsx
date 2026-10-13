import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createAlarmRule, getAlarmRule, updateAlarmRule } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { useDevices } from "@/hooks/useDevices";
import { Chip, Field, Loading, PrimaryButton } from "@/ui";
import { parseHHMM } from "@/dateRange";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";
import { MINUTE_RULES, OFFERED_RULE_TYPES, SEVERITIES, ruleTypeLabel, ruleUnit, severityLabel } from "@/alarmCenter";
import type { AlarmRuleRequest, AlarmRuleType, AlarmRuleView, AlarmSeverity } from "@/types";

/** Create or edit one alarm rule (web: the rule form on /dashboard/rules). `?id=` edits. */
export default function AlarmRuleEditScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = typeof id === "string" && id.length > 0;
  const { devices } = useDevices();

  const [existing, setExisting] = useState<AlarmRuleView | null>(null);
  const [loading, setLoading] = useState(editing);
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState<AlarmRuleType>("SPEED_OVER");
  const [threshold, setThreshold] = useState("60");
  const [windowStart, setWindowStart] = useState("22:00");
  const [windowEnd, setWindowEnd] = useState("06:00");
  const [cooldownMin, setCooldownMin] = useState("5");
  const [severity, setSeverity] = useState<AlarmSeverity>("WARNING");
  const [appliesToAll, setAppliesToAll] = useState(true);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerTitle: editing ? t("arule.edit") : t("arule.new") });
  }, [navigation, editing, t]);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    getAlarmRule(id)
      .then((r) => {
        if (cancelled) return;
        setExisting(r);
        setName(r.name);
        setRuleType(r.ruleType);
        setThreshold(r.threshold != null ? String(r.threshold) : "");
        setWindowStart(r.windowStart?.slice(0, 5) ?? "22:00");
        setWindowEnd(r.windowEnd?.slice(0, 5) ?? "06:00");
        setCooldownMin(String(Math.max(1, Math.round((r.cooldownSeconds ?? 300) / 60))));
        setSeverity(r.severity ?? "WARNING");
        setAppliesToAll(r.appliesToAll);
        setAssigned(r.assignedImeis);
      })
      .catch((e) => {
        if (!cancelled) setError(extractError(e).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  // Inherited types stay selectable only for the rule that already uses one.
  const types = useMemo<AlarmRuleType[]>(
    () => (existing && !OFFERED_RULE_TYPES.includes(existing.ruleType) ? [...OFFERED_RULE_TYPES, existing.ruleType] : OFFERED_RULE_TYPES),
    [existing],
  );
  const isWindow = ruleType === "ACC_ON_DURING_WINDOW";
  const isMinutes = MINUTE_RULES.includes(ruleType);

  function pickType(next: AlarmRuleType) {
    setRuleType(next);
    if (!editing) {
      setThreshold(next === "SPEED_OVER" ? "60" : next === "VOLTAGE_UNDER" ? "11500" : MINUTE_RULES.includes(next) ? "30" : threshold);
      setCooldownMin(MINUTE_RULES.includes(next) ? "60" : "5");
    }
  }

  function toggleImei(imei: string) {
    setAssigned((prev) => (prev.includes(imei) ? prev.filter((i) => i !== imei) : [...prev, imei]));
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError(t("arule.errName"));
    const n = Number(threshold);
    if (!isWindow && (!Number.isFinite(n) || n < 1)) return setError(t("arule.errThreshold"));
    if (isWindow && (parseHHMM(windowStart) == null || parseHHMM(windowEnd) == null)) return setError(t("arule.errTime"));
    const cd = Number(cooldownMin);
    if (!Number.isFinite(cd) || cd < 1) return setError(t("arule.errCooldown"));
    if (!appliesToAll && assigned.length === 0) return setError(t("arule.errPeople"));

    const pad = (s: string) => {
      const m = parseHHMM(s) ?? 0;
      return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;
    };
    const req: AlarmRuleRequest = {
      name: name.trim(),
      ruleType,
      threshold: isWindow ? null : n,
      windowStart: isWindow ? pad(windowStart) : null,
      windowEnd: isWindow ? pad(windowEnd) : null,
      cooldownSeconds: Math.round(cd * 60),
      severity,
      active: existing?.active ?? true,
      appliesToAll,
      assignedImeis: appliesToAll ? [] : assigned,
    };
    setSaving(true);
    try {
      if (editing) await updateAlarmRule(id, req);
      else await createAlarmRule(req);
      router.back();
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label={t("common.loading")} />;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Field label={t("arule.name")} value={name} onChangeText={setName} placeholder={t("arule.namePlaceholder")} maxLength={255} />

          <Group label={t("arule.type")}>
            {types.map((rt) => (
              <Chip key={rt} label={ruleTypeLabel(rt, t)} active={ruleType === rt} onPress={() => pickType(rt)} />
            ))}
          </Group>
          <Text style={styles.hint}>{t(`arule.help.${ruleType}` as StringKey)}</Text>

          {isWindow ? (
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Field label={t("arule.from")} value={windowStart} onChangeText={setWindowStart} placeholder="22:00" keyboardType="numbers-and-punctuation" maxLength={5} />
              </View>
              <View style={styles.col}>
                <Field label={t("arule.to")} value={windowEnd} onChangeText={setWindowEnd} placeholder="06:00" keyboardType="numbers-and-punctuation" maxLength={5} />
              </View>
            </View>
          ) : (
            <Field
              label={`${isMinutes ? t("arule.afterMinutes") : t("arule.threshold")} (${ruleUnit(ruleType, t)})`}
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="number-pad"
              maxLength={6}
            />
          )}

          <Group label={t("arule.severity")}>
            {SEVERITIES.map((s) => (
              <Chip key={s} label={severityLabel(s, t)} active={severity === s} onPress={() => setSeverity(s)} />
            ))}
          </Group>

          <Field
            label={`${t("arule.cooldown")} (${t("arule.unit.minutes")})`}
            value={cooldownMin}
            onChangeText={setCooldownMin}
            keyboardType="number-pad"
            maxLength={5}
          />
          <Text style={styles.hint}>{t("arule.cooldownHint")}</Text>

          <Group label={t("arule.appliesTo")}>
            <Chip label={t("arule.everyone")} active={appliesToAll} onPress={() => setAppliesToAll(true)} />
            <Chip label={t("arule.specific")} active={!appliesToAll} onPress={() => setAppliesToAll(false)} />
          </Group>
          {!appliesToAll ? (
            <View style={styles.people}>
              {devices.length === 0 ? <Text style={styles.hint}>{t("home.noVehicles")}</Text> : null}
              {devices.map((d, i) => {
                const on = assigned.includes(d.imei);
                return (
                  <Pressable
                    key={d.imei}
                    onPress={() => toggleImei(d.imei)}
                    style={[styles.person, i > 0 && styles.personDivider]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                  >
                    <Ionicons name={on ? "checkbox" : "square-outline"} size={24} color={on ? colors.brand : colors.textFaint} />
                    <Text style={styles.personName} numberOfLines={1}>
                      {d.name || d.vehiclePlate || d.imei}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={styles.inner}>
          <PrimaryButton label={t("arule.save")} onPress={() => void save()} loading={saving} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wrap}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl },
  inner: { width: "100%", maxWidth: 640, alignSelf: "center", gap: space.lg },
  label: { color: colors.textDim, fontSize: 14 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  hint: { color: colors.textFaint, fontSize: 13, marginTop: -space.sm },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  col: { flexGrow: 1, flexBasis: 140 },
  people: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  person: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: touch.min, paddingHorizontal: space.md },
  personDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  personName: { flex: 1, color: colors.text, fontSize: 16 },
  error: { color: colors.danger, fontSize: 14 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
