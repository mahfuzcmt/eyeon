import Constants from "expo-constants";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";

export default function MoreScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { signOut, user } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <MenuRow
          icon="shield-checkmark-outline"
          label={t("home.places")}
          onPress={() => router.push("/places")}
        />
        <View style={styles.divider} />
        <MenuRow
          icon="locate-outline"
          label={t("home.geofences")}
          onPress={() => router.push("/geofences")}
        />
        <View style={styles.divider} />
        <MenuRow icon="time-outline" label={t("stays.title")} onPress={() => router.push("/stays")} />
        <View style={styles.divider} />
        <MenuRow icon="alarm-outline" label={t("arule.title")} onPress={() => router.push("/alarm-rules")} />
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="language-outline" size={20} color={colors.textDim} />
            <Text style={styles.rowLabel}>{t("more.language")}</Text>
          </View>
          <LanguageToggle />
        </View>
      </View>

      <View style={styles.card}>
        <MenuRow icon="folder-open-outline" label={t("set.groups")} onPress={() => router.push("/groups")} />
        <View style={styles.divider} />
        <MenuRow icon="settings-outline" label={t("set.title")} onPress={() => router.push("/settings")} />
      </View>

      {user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN" ? (
        <View style={styles.card}>
          <MenuRow icon="document-text-outline" label={t("rep.title")} onPress={() => router.push("/reports")} />
          <View style={styles.divider} />
          <MenuRow icon="list-outline" label={t("audit.title")} onPress={() => router.push("/audit-log")} />
          {user.role === "SUPER_ADMIN" ? (
            <>
              <View style={styles.divider} />
              <MenuRow icon="key-outline" label={t("adm.title")} onPress={() => router.push("/admin")} />
            </>
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <MenuRow icon="log-out-outline" label={t("auth.signOut")} danger onPress={() => void signOut()} />
      </View>

      <Text style={styles.meta}>
        {user?.email ?? ""}
      </Text>
      <Text style={styles.meta}>
        EyeOn v{Constants.expoConfig?.version ?? "0.1.0"}
      </Text>
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.textDim} />
        <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      </View>
      {!danger && <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: space.md },
  rowLabel: { color: colors.text, fontSize: 16, fontWeight: "600" },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: space.lg },
  meta: { color: colors.textFaint, fontSize: 13, textAlign: "center" },
});
