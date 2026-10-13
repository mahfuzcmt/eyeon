import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGroups } from "@/hooks/useGroups";
import { FormScreen, Hint, fill } from "@/components/settings/kit";
import { EmptyState, Loading, PrimaryButton } from "@/ui";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";

/** The user's own groups of people: create, rename, recolour, choose members, delete. */
export default function GroupsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { groups, loading } = useGroups();

  const addButton = () => (
    <Pressable
      onPress={() => router.push("/group-edit")}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t("grp.new")}
      style={{ paddingHorizontal: space.sm }}
    >
      <Ionicons name="add-circle-outline" size={26} color={colors.brand} />
    </Pressable>
  );

  if (loading && groups.length === 0) return <Loading label={t("common.loading")} />;

  return (
    <FormScreen title={t("grp.title")} headerRight={addButton}>
      <Hint>{t("grp.hint")}</Hint>
      {groups.length === 0 ? <EmptyState text={t("grp.none")} /> : null}
      <View style={{ gap: space.sm }}>
        {groups.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => router.push({ pathname: "/group-edit", params: { id: g.id } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.dot, { backgroundColor: g.color }]} />
            <View style={styles.flex}>
              <Text style={styles.name} numberOfLines={1}>
                {g.name}
              </Text>
              {g.description ? (
                <Text style={styles.sub} numberOfLines={2}>
                  {g.description}
                </Text>
              ) : null}
            </View>
            <Text style={styles.count}>{fill(t("grp.count"), { n: g.deviceCount })}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        ))}
      </View>
      <PrimaryButton label={t("grp.new")} onPress={() => router.push("/group-edit")} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    minHeight: 56,
  },
  dot: { width: 16, height: 16, borderRadius: 8 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  sub: { color: colors.textFaint, fontSize: 13 },
  count: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
});
