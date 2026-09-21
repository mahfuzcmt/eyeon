import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { extractError } from "@/api/client";
import { Field, PrimaryButton } from "@/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n";
import { colors, space } from "@/theme";

export default function Login() {
  const { status, signIn } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authed") return <Redirect href="/(tabs)" />;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = email.includes("@") && password.length >= 8 && !busy;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.langRow}>
        <LanguageToggle />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.brand}>
          <View style={styles.dot} />
          <Text style={styles.brandText}>EyeOn</Text>
        </View>
        <Text style={styles.tagline}>{t("auth.tagline")}</Text>

        <View style={styles.form}>
          <Field
            label={t("auth.email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Field
            label={t("auth.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label={t("auth.signIn")} onPress={submit} loading={busy} disabled={!canSubmit} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  langRow: { alignItems: "flex-end", paddingHorizontal: space.md, paddingTop: space.md },
  container: { flex: 1, justifyContent: "center", padding: space.xl, gap: space.lg },
  brand: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.brand },
  brandText: { color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { color: colors.textFaint, fontSize: 16, marginTop: -space.sm },
  form: { gap: space.md, marginTop: space.lg },
  error: { color: colors.danger, fontSize: 14 },
});
