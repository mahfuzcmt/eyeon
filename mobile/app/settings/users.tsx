import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { listOrgUsers } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { ErrorText, ScreenHeader } from "@/components/settings/kit";
import { EmptyState, Loading, Pill } from "@/ui";
import { fmtDateTime } from "@/format";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { UserDetail } from "@/types";

/** Users of the school / family (admins only): who they are and whom they can see. */
export default function UsersScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await listOrgUsers());
      setError(null);
    } catch (e) {
      setError(extractError(e).message);
    }
  }, []);

  // Reload whenever the screen comes back into view (after adding or editing a user).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const addButton = () => (
    <Pressable
      onPress={() => router.push("/settings/user-edit")}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t("usr.add")}
      style={{ paddingHorizontal: space.sm }}
    >
      <Ionicons name="person-add-outline" size={24} color={colors.onHeader} />
    </Pressable>
  );

  if (!users && !error) return <Loading label={t("common.loading")} />;

  const sorted = [...(users ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.email.localeCompare(b.email));

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("set.users")} right={addButton} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: space.xl + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.brand}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.inner}>
          {error ? <ErrorText>{error}</ErrorText> : null}
          {sorted.length === 0 && !error ? <EmptyState text={t("usr.none")} /> : null}
          {sorted.map((u) => {
            const isAdminRole = u.role === "ORG_ADMIN" || u.role === "SUPER_ADMIN";
            const people = isAdminRole || u.seeAllDevices ? t("usr.everyone") : String(u.assignedDeviceCount);
            return (
              <Pressable
                key={u.id}
                onPress={() => router.push({ pathname: "/settings/user-edit", params: { id: u.id } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.card, !u.isActive && styles.cardOff, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.top}>
                  <View style={styles.flex}>
                    <Text style={styles.name} numberOfLines={1}>
                      {u.fullName || u.email}
                      {u.id === me?.id ? ` (${t("usr.you")})` : ""}
                    </Text>
                    {u.fullName ? (
                      <Text style={styles.sub} numberOfLines={1}>
                        {u.email}
                      </Text>
                    ) : null}
                    {u.phone ? <Text style={styles.sub}>{u.phone}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </View>
                <View style={styles.pills}>
                  <Pill label={t(`usr.role.${u.role}` as StringKey)} color={isAdminRole ? colors.brand : colors.textDim} />
                  <Pill label={u.isActive ? t("usr.active") : t("usr.inactive")} color={u.isActive ? colors.ok : colors.offline} />
                  <Pill label={`${t("usr.people")}: ${people}`} color={colors.textDim} />
                </View>
                <Text style={styles.meta}>
                  {t("usr.lastLogin")}: {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : t("usr.never")}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg },
  inner: { width: "100%", maxWidth: 640, alignSelf: "center", gap: space.sm },
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
  },
  cardOff: { backgroundColor: colors.surfaceAlt },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  sub: { color: colors.textDim, fontSize: 14 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  meta: { color: colors.textFaint, fontSize: 13 },
});
