import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import StaysView from "@/components/StaysView";
import { useI18n } from "@/i18n";
import { colors } from "@/theme";

/** Stays of any person, from the More menu (person picker on top). */
export default function StaysScreen() {
  const { imei } = useLocalSearchParams<{ imei?: string }>();
  const { t } = useI18n();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerTitle: t("stays.title") }} />
      <StaysView initialImei={imei} />
    </View>
  );
}
