import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";

/**
 * Support / contact us (owner, 2026-11-05). The same details as the website's Contact page
 * (frontend/src/components/landing/shared.tsx CONTACT): the pre-order number from the product
 * poster, for calls and WhatsApp. Keep the two in sync; add an email or address only when the
 * owner supplies a real one.
 */
export const CONTACT = {
  phoneDisplay: "01629-563645",
  phoneTel: "+8801629563645",
  whatsappNumber: "8801629563645",
};

const WEBSITE = "https://eyeon.motolinkgps.com/contact";

function open(url: string) {
  void Linking.openURL(url).catch(() => {});
}

export default function SupportScreen() {
  const { t } = useI18n();
  const whatsapp = `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(t("support.whatsappMessage"))}`;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerTitle: t("support.title") }} />
      <View>
        <Text style={styles.heading}>{t("support.heading")}</Text>
        <Text style={styles.intro}>{t("support.intro")}</Text>
      </View>

      <ContactCard
        icon="call"
        label={t("support.phoneLabel")}
        value={CONTACT.phoneDisplay}
        note={t("support.phoneNote")}
        onPress={() => open(`tel:${CONTACT.phoneTel}`)}
      />
      <ContactCard
        icon="logo-whatsapp"
        label={t("support.whatsappLabel")}
        value={CONTACT.phoneDisplay}
        note={t("support.whatsappNote")}
        onPress={() => open(whatsapp)}
      />
      <ContactCard
        icon="globe-outline"
        label={t("support.webLabel")}
        value="eyeon.motolinkgps.com"
        note={t("support.webNote")}
        onPress={() => open(WEBSITE)}
      />

      <View style={styles.infoCard}>
        <Ionicons name="chatbubbles-outline" size={22} color={colors.brand} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>{t("support.languageLabel")}</Text>
          <Text style={styles.infoText}>{t("support.languageNote")}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function ContactCard({
  icon,
  label,
  value,
  note,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  note: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${label} ${value}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={24} color={colors.onBrand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.note}>{note}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md },
  heading: { color: colors.text, fontSize: 22, fontWeight: "800" },
  intro: { color: colors.textDim, fontSize: 15, marginTop: 4, lineHeight: 21 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
  label: { color: colors.textDim, fontSize: 13, fontWeight: "700" },
  value: { color: colors.text, fontSize: 19, fontWeight: "800", marginTop: 2 },
  note: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  infoCard: {
    flexDirection: "row",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  infoTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  infoText: { color: colors.textDim, fontSize: 14, marginTop: 2 },
});
