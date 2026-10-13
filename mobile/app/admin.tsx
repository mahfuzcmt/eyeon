import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { adminStats } from "@/api/endpoints";
import OrgsTab from "@/components/admin/OrgsTab";
import DevicesTab from "@/components/admin/DevicesTab";
import SubscriptionsTab from "@/components/admin/SubscriptionsTab";
import { StatTile } from "@/components/admin/shared";
import { EmptyState } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, space } from "@/theme";
import type { AdminStats } from "@/types";

type Tab = "orgs" | "devices" | "subs";
const TABS: { key: Tab; label: StringKey }[] = [
  { key: "orgs", label: "adm.tab.orgs" },
  { key: "devices", label: "adm.tab.trackers" },
  { key: "subs", label: "adm.tab.subs" },
];

/** Super admin panel (SUPER_ADMIN only) - mirrors the web /dashboard/admin page. */
export default function AdminScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("orgs");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const isSuper = user?.role === "SUPER_ADMIN";

  const loadStats = useCallback(() => {
    adminStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSuper) return;
    loadStats();
    const id = setInterval(loadStats, 30_000);
    return () => clearInterval(id);
  }, [isSuper, loadStats]);

  if (!isSuper) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: t("adm.title") }} />
        <EmptyState text={t("adm.superOnly")} />
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerTitle: t("adm.title") }} />
      <View style={styles.stats}>
        <StatTile
          label={t("adm.tab.orgs")}
          value={stats?.totalOrgs}
          sub={stats ? `${stats.activeOrgs} ${t("adm.activeLower")}` : undefined}
          loading={!stats}
        />
        <StatTile
          label={t("adm.tab.trackers")}
          value={stats?.totalDevices}
          sub={stats ? `${stats.onlineDevices} ${t("adm.onlineLower")}` : undefined}
          loading={!stats}
        />
        <StatTile label={t("adm.usersTitle")} value={stats?.totalUsers} loading={!stats} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabs}>
        {TABS.map((tb) => (
          <Pressable
            key={tb.key}
            onPress={() => setTab(tb.key)}
            style={[styles.tab, tab === tb.key && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === tb.key }}
          >
            <Text style={[styles.tabText, tab === tb.key && styles.tabTextActive]}>{t(tb.label)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.body}>
        {tab === "orgs" && <OrgsTab onChanged={loadStats} />}
        {tab === "devices" && <DevicesTab onChanged={loadStats} />}
        {tab === "subs" && <SubscriptionsTab />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, padding: space.md, paddingBottom: space.sm },
  tabScroll: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  tabs: { flexDirection: "row", paddingHorizontal: space.md },
  tab: { paddingVertical: space.md, marginRight: space.lg, borderBottomWidth: 2, borderBottomColor: "transparent", minHeight: 48, justifyContent: "center" },
  tabActive: { borderBottomColor: colors.brand },
  tabText: { color: colors.textFaint, fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: colors.text },
  body: { flex: 1 },
});
