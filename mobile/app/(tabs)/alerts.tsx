import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { useAlarms } from "@/hooks/useAlarms";
import { useDevices } from "@/hooks/useDevices";
import { EmptyState, Loading } from "@/ui";
import { fmtAgo, severityColor } from "@/format";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { AlarmView } from "@/types";

const ZONE_EVENTS = new Set(["PLACE_ARRIVED", "PLACE_LEFT", "GEOFENCE_EXIT", "GEOFENCE_ENTER"]);

/** Zone events read as "Arrived · School"; everything else falls back to Title Case. */
function alarmLabel(alarm: AlarmView, t: (k: StringKey) => string): string {
  if (ZONE_EVENTS.has(alarm.type)) {
    const place = alarm.metadata?.geofenceName;
    const label = t(`alarm.${alarm.type}` as StringKey);
    return typeof place === "string" && place ? `${label} · ${place}` : label;
  }
  return alarm.type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function AlertsScreen() {
  const { t } = useI18n();
  const { org } = useAuth();
  const { alarms, loading, reload, acknowledge } = useAlarms(org?.id ?? null);
  const { devices } = useDevices();
  const nameOf = (imei: string) => devices.find((d) => d.imei === imei)?.name ?? imei;

  if (loading && alarms.length === 0) return <Loading label={t("alerts.loading")} />;

  return (
    <View style={styles.screen}>
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{t("alerts.disclaimer")}</Text>
      </View>
      <FlatList
        data={alarms}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
        ListEmptyComponent={<EmptyState text={t("alerts.none")} />}
        renderItem={({ item }) => (
          <AlarmCard alarm={item} who={nameOf(item.deviceImei)} onAck={() => acknowledge(item.id)} />
        )}
      />
    </View>
  );
}

function AlarmCard({ alarm, who, onAck }: { alarm: AlarmView; who: string; onAck: () => void }) {
  const { t } = useI18n();
  // Arrivals and departures are good news: brand teal, not the grey used for other INFO rows.
  const color = alarm.type.startsWith("PLACE_") ? colors.brand : severityColor(alarm.severity);
  return (
    <View style={styles.card}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.rowBetween}>
          <Text style={[styles.type, { color }]}>{alarmLabel(alarm, t)}</Text>
          <Text style={styles.time}>{fmtAgo(alarm.ts)}</Text>
        </View>
        <Text style={styles.device}>{who}</Text>
        {alarm.latitude != null && alarm.longitude != null ? (
          <Text style={styles.coords}>
            {alarm.latitude.toFixed(5)}, {alarm.longitude.toFixed(5)}
          </Text>
        ) : null}
        {alarm.acknowledged ? (
          <Text style={styles.acked}>✓ {t("alerts.acked")}</Text>
        ) : (
          <Pressable onPress={onAck} style={({ pressed }) => [styles.ackBtn, pressed && { opacity: 0.7 }]}>
            <Text style={styles.ackText}>{t("alerts.acknowledge")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  disclaimer: { padding: space.md, paddingBottom: space.xs },
  disclaimerText: { color: colors.textFaint, fontSize: 13 },
  list: { padding: space.md, paddingTop: space.xs, gap: space.sm },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  bar: { width: 4 },
  body: { flex: 1, padding: space.md, gap: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  type: { fontSize: 16, fontWeight: "700" },
  time: { color: colors.textFaint, fontSize: 13 },
  device: { color: colors.textDim, fontSize: 14, fontVariant: ["tabular-nums"] },
  coords: { color: colors.textFaint, fontSize: 13, fontVariant: ["tabular-nums"] },
  acked: { color: colors.ok, fontSize: 13, marginTop: 4 },
  ackBtn: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  ackText: { color: colors.text, fontSize: 14, fontWeight: "600" },
});
