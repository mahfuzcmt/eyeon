import { Pressable, StyleSheet, Text } from "react-native";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";

/** Bengali ⇄ English switch — shows the language you would switch TO. */
export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <Pressable
      onPress={() => setLocale(locale === "en" ? "bn" : "en")}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel="Switch language"
    >
      <Text style={styles.text}>{locale === "en" ? "বাংলা" : "English"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  text: { color: colors.brand, fontSize: 12, fontWeight: "700" },
});
