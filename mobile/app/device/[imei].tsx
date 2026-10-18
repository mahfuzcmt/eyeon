import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import TrackTab from "@/components/device/TrackTab";
import HistoryTab from "@/components/device/HistoryTab";
import StaysView from "@/components/StaysView";
import StatisticsTab from "@/components/device/StatisticsTab";
import ControlsTab from "@/components/device/ControlsTab";
import { ShareButton } from "@/components/device/ShareLinksSheet";
import { usePersonName } from "@/hooks/usePersonName";
import { EmptyState } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, space } from "@/theme";

type Tab = "track" | "controls" | "history" | "stays" | "stats";
const TABS: { key: Tab; label: StringKey }[] = [
  { key: "track", label: "det.track" },
  { key: "controls", label: "det.controls" },
  { key: "history", label: "det.history" },
  { key: "stays", label: "stays.title" },
  { key: "stats", label: "det.stats" },
];

export default function DeviceScreen() {
  const { imei } = useLocalSearchParams<{ imei: string }>();
  const { org } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("track");
  const orgId = org?.id ?? null;
  const personName = usePersonName(imei);

  if (!imei) return <EmptyState text={t("det.noDevice")} />;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerTitle: personName ?? imei.slice(-8),
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ShareButton imei={imei} personName={personName ?? imei.slice(-8)} />
            <Pressable
              onPress={() => router.push({ pathname: "/person-edit", params: { imei } })}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("pe.title")}
              style={{ paddingHorizontal: space.sm }}
            >
              <Ionicons name="create-outline" size={24} color={colors.onHeader} />
            </Pressable>
            </View>
          ),
        }}
      />
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
        {tab === "stays" && <StaysView imei={imei} />}
        {tab === "stats" && <StatisticsTab imei={imei} orgId={orgId} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tabScroll: {
    backgroundColor: colors.header,
    flexGrow: 0,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: space.md,
  },
  tab: { paddingVertical: space.md, marginRight: space.lg, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.tabActive, borderBottomWidth: 3 },
  tabText: { color: colors.onHeaderDim, fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: colors.onHeader },
  body: { flex: 1 },
});
