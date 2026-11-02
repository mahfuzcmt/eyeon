import { Redirect, Tabs } from "expo-router";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePeopleCount } from "@/hooks/usePeopleCount";
import { useI18n } from "@/i18n";
import { colors, space } from "@/theme";

function SignOut() {
  const { signOut } = useAuth();
  const { t } = useI18n();
  return (
    <Pressable onPress={() => void signOut()} hitSlop={12} style={{ paddingHorizontal: space.md }}>
      <Text style={{ color: colors.onHeader, fontSize: 14, fontWeight: "600" }}>{t("auth.signOut")}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { status } = useAuth();
  const { t } = useI18n();
  usePushNotifications(status === "authed");
  // People tab only for 2+ people (owner, 2026-11-02); with one person the map and Home cover it,
  // and More always has a People row. Hidden until the count is known, so it never flashes in.
  const peopleCount = usePeopleCount(status === "authed");
  const showPeople = peopleCount != null && peopleCount > 1;
  if (status === "anon") return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.onHeader,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.tabBar },
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tab.home"),
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={26} color={color} />,
          headerRight: () => <SignOut />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t("tab.map"),
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="location-outline" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: t("tab.vehicles"),
          href: showPeople ? undefined : null,
          tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={26} color={color} />,
          headerRight: () => <SignOut />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: t("tab.alerts"),
          tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" size={26} color={color} />,
          headerRight: () => <SignOut />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t("tab.more"),
          tabBarIcon: ({ color }) => <Ionicons name="ellipsis-horizontal" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}
