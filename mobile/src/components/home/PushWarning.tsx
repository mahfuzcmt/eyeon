import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { openNotificationSettings, pushHealth, type PushHealth } from "@/push";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";

/**
 * Shown on Home only while this phone would not alert its owner: notifications are off for
 * EyeOn, or one of its two alert types was turned down to silent in the phone settings. A phone
 * keeps those settings per installed app, so installing the app again (the Play Store build
 * replaces a hand-delivered one) starts from the phone maker's defaults, which on several
 * brands are silent. The app cannot change them; it can only say so and open the right page.
 */
export function PushWarning() {
  const { t } = useI18n();
  const [health, setHealth] = useState<PushHealth | null>(null);
  const check = useCallback(() => {
    void pushHealth().then(setHealth);
  }, []);
  useEffect(() => {
    check();
    // The channels are created during registration, a moment after sign-in.
    const later = setTimeout(check, 4000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check(); // back from the phone settings
    });
    return () => {
      clearTimeout(later);
      sub.remove();
    };
  }, [check]);

  if (!health || (health.allowed && !health.quiet)) return null;
  return (
    <View style={styles.card} accessibilityRole="alert">
      <View style={styles.row}>
        <Ionicons name="notifications-off" size={22} color={colors.danger} />
        <Text style={styles.text}>{t(health.allowed ? "nt.warn.quiet" : "nt.warn.off")}</Text>
      </View>
      <Pressable style={styles.button} accessibilityRole="button" onPress={() => void openNotificationSettings()}>
        <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
        <Text style={styles.buttonText}>{t("nt.warn.fix")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FEF3F2",
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  row: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  text: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: "600" },
  button: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
