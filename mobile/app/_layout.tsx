import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/auth/AuthContext";
import { LocaleProvider } from "@/i18n";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocaleProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen
            name="device/[imei]"
            options={{
              headerShown: true,
              headerTitle: "",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="places"
            options={{
              headerShown: true,
              headerTitle: "",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="place-new"
            options={{
              headerShown: true,
              headerTitle: "",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="geofences"
            options={{
              headerShown: true,
              headerTitle: "",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="tracker-settings"
            options={{
              headerShown: true,
              headerTitle: "",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="stays"
            options={{
              headerShown: true,
              headerTitle: "",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="place-times"
            options={{
              headerShown: true,
              headerTitle: "",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="geofence-new"
            options={{
              headerShown: true,
              headerTitle: "",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="alarm-rules"
            options={{
              headerShown: true,
              headerTitle: "",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="alarm-rule-edit"
            options={{
              headerShown: true,
              headerTitle: "",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          {["admin", "audit-log", "reports"].map((name) => (
            <Stack.Screen
              key={name}
              name={name}
              options={{
                headerShown: true,
                headerTitle: "",
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
              }}
            />
          ))}
        </Stack>
      </AuthProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
