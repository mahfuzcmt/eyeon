import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { deleteAlarmRule, listAlarmRules, updateAlarmRule } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { EmptyState, PrimaryButton } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";
import { MINUTE_RULES, ruleTypeLabel, ruleUnit, severityLabel } from "@/alarmCenter";
import type { AlarmRuleView } from "@/types";

/** Alarm rules (web: /dashboard/rules): list, switch on/off, edit, delete. Rules are per user. */
export default function AlarmRulesScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 2 : 1;
  const [rules, setRules] = useState<AlarmRuleView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerTitle: t("arule.title") });
  }, [navigation, t]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRules(await listAlarmRules());
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh on focus, e.g. after returning from the editor.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  async function toggle(r: AlarmRuleView) {
    setBusyId(r.id);
    // Optimistic: flip now, put it back if the server refuses.
    setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: !r.active } : x)));
    try {
      await updateAlarmRule(r.id, { active: !r.active });
    } catch (e) {
      setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: r.active } : x)));
      setError(extractError(e).message);
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(r: AlarmRuleView) {
    Alert.alert(t("arule.deleteTitle"), `"${r.name}" — ${t("arule.deleteMsg")}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteAlarmRule(r.id);
              await reload();
            } catch (e) {
              setError(extractError(e).message);
            }
          })();
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <FlatList
        key={`rules-${columns}`}
        data={rules}
        numColumns={columns}
        keyExtractor={(r) => r.id}
        columnWrapperStyle={columns > 1 ? { gap: space.sm } : undefined}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
        ListHeaderComponent={
          <View style={{ gap: space.sm }}>
            <Text style={styles.hint}>{t("arule.hint")}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={loading ? null : <EmptyState text={t("arule.empty")} />}
        renderItem={({ item }) => (
          <RuleCard
            rule={item}
            busy={busyId === item.id}
            onToggle={() => void toggle(item)}
            onEdit={() => router.push({ pathname: "/alarm-rule-edit", params: { id: item.id } })}
            onDelete={() => confirmDelete(item)}
          />
        )}
      />
      <View style={styles.footer}>
        <PrimaryButton label={t("arule.new")} onPress={() => router.push("/alarm-rule-edit")} />
      </View>
    </View>
  );
}

function describe(r: AlarmRuleView, t: (k: StringKey) => string): string {
  if (r.ruleType === "ACC_ON_DURING_WINDOW") {
    return `${r.windowStart?.slice(0, 5) ?? "—"} → ${r.windowEnd?.slice(0, 5) ?? "—"}`;
  }
  const n = r.threshold ?? 0;
  const sign = r.ruleType === "VOLTAGE_UNDER" ? "<" : ">";
  return `${sign} ${n} ${ruleUnit(r.ruleType, t)}`;
}

function RuleCard({
  rule,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: AlarmRuleView;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const who = rule.appliesToAll
    ? t("arule.everyone")
    : `${rule.assignedImeis.length} ${t("arule.peopleCount")}`;
  const cooldown = rule.cooldownSeconds ?? 0;
  const cooldownText =
    cooldown >= 60 && cooldown % 60 === 0
      ? `${cooldown / 60} ${t("arule.unit.minutes")}`
      : `${cooldown} ${t("arule.unit.seconds")}`;
  return (
    <View style={[styles.card, !rule.active && { opacity: 0.75 }]}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={2}>
            {rule.name}
          </Text>
          <Text style={styles.type}>{ruleTypeLabel(rule.ruleType, t)}</Text>
        </View>
        <Switch
          value={rule.active}
          disabled={busy}
          onValueChange={onToggle}
          trackColor={{ true: colors.brand, false: colors.border }}
          thumbColor={colors.surface}
          accessibilityLabel={`${rule.name}, ${rule.active ? t("common.on") : t("common.off")}`}
        />
      </View>
      <View style={styles.facts}>
        <Fact icon="speedometer-outline" text={describe(rule, t)} />
        <Fact icon="people-outline" text={who} />
        {rule.severity ? <Fact icon="alert-circle-outline" text={severityLabel(rule.severity, t)} /> : null}
        <Fact icon="timer-outline" text={`${t("arule.cooldownShort")} ${cooldownText}`} />
      </View>
      {MINUTE_RULES.includes(rule.ruleType) || rule.ruleType === "SPEED_OVER" ? null : (
        <Text style={styles.legacy}>{t("arule.legacyType")}</Text>
      )}
      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Ionicons name="create-outline" size={18} color={colors.brand} />
          <Text style={styles.actionText}>{t("arule.edit")}</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>{t("common.delete")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={16} color={colors.textFaint} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.md, gap: space.sm, paddingBottom: space.xl },
  hint: { color: colors.textFaint, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
  footer: { padding: space.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  name: { color: colors.text, fontSize: 17, fontWeight: "700" },
  type: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  fact: { flexDirection: "row", alignItems: "center", gap: 4 },
  factText: { color: colors.textDim, fontSize: 14 },
  legacy: { color: colors.textFaint, fontSize: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: touch.min - 4,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { color: colors.brand, fontSize: 15, fontWeight: "700" },
});
