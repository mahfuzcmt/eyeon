import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import TrackTab from "@/components/device/TrackTab";
import CalendarTab from "@/components/device/CalendarTab";
import HistoryTab from "@/components/device/HistoryTab";
import GraphTab from "@/components/device/GraphTab";
import StatisticsTab from "@/components/device/StatisticsTab";
import ControlsTab from "@/components/device/ControlsTab";
import { EmptyState } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, space } from "@/theme";

type Tab = "track" | "controls" | "history" | "calendar" | "graph" | "stats";
const TABS: { key: Tab; label: StringKey }[] = [
  { key: "track", label: "det.track" },
  { key: "controls", label: "det.controls" },
  { key: "history", label: "det.history" },
  { key: "calendar", label: "det.calendar" },
  { key: "graph", label: "det.graph" },
  { key: "stats", label: "det.stats" },
];

export default function DeviceScreen() {
  const { imei } = useLocalSearchParams<{ imei: string }>();
  const { org } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("track");
  const orgId = org?.id ?? null;

  if (!imei) return <EmptyState text={t("det.noDevice")} />;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerTitle: imei.slice(-8) }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabs}>
        {TABS.map((tb) => (
          <Pressable
            key={tb.key}
            onPress={() => setTab(tb.key)}
            style={[styles.tab, tab === tb.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === tb.key && styles.tabTextActive]}>{t(tb.label)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.body}>
        {tab === "track" && <TrackTab imei={imei} orgId={orgId} />}
        {tab === "controls" && <ControlsTab imei={imei} orgId={orgId} />}
        {tab === "history" && <HistoryTab imei={imei} />}
        {tab === "calendar" && <CalendarTab imei={imei} />}
        {tab === "graph" && <GraphTab imei={imei} />}
        {tab === "stats" && <StatisticsTab imei={imei} orgId={orgId} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tabScroll: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexGrow: 0,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: space.md,
  },
  tab: { paddingVertical: space.md, marginRight: space.lg, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.brand },
  tabText: { color: colors.textFaint, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: colors.text },
  body: { flex: 1 },
});
