import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { Loading } from "@/ui";
import { colors } from "@/theme";

export default function Index() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Loading label="Starting EyeOn…" />
      </View>
    );
  }
  return <Redirect href={status === "authed" ? "/(tabs)" : "/login"} />;
}
