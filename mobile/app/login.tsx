import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { extractError } from "@/api/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";

/**
 * Same look as the web login (frontend/src/app/login/page.tsx): deep teal map-grid
 * background, logo top-left, language top-right, title + subtitle in white, a white
 * card with the form, the poster tagline underneath.
 */
// Web login-bg.svg: gradient #083B33 -> #0C5A4D -> #12806F, grid lines every 60 px.
const BG = { dark: "#083B33", mid: "#0C5A4D", light: "#12806F" } as const;
const GRID = 60;
const GRID_LINES = Array.from({ length: 40 }, (_, i) => i * GRID);

export default function Login() {
  const { status, signIn } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authed") return <Redirect href="/(tabs)/map" />;

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
    <View style={styles.root}>
      <Background />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Logo />
          <LanguageToggle />
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{t("auth.signIn")}</Text>
              <Text style={styles.subtitle}>{t("auth.subtitle")}</Text>
            </View>

            <View style={styles.card}>
              <LabeledInput
                label={t("auth.email")}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@example.com"
                editable={!busy}
              />
              <LabeledInput
                label={t("auth.password")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                placeholder="••••••••"
                editable={!busy}
                onSubmitEditing={() => canSubmit && submit()}
              />
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
              <Pressable
                onPress={submit}
                disabled={!canSubmit}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.btn,
                  !canSubmit && !busy && { opacity: 0.5 },
                  pressed && { backgroundColor: colors.brandDim },
                ]}
              >
                {busy ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator color={colors.onBrand} size="small" />
                    <Text style={styles.btnText}>{t("auth.signIn")}</Text>
                  </View>
                ) : (
                  <Text style={styles.btnText}>{t("auth.signIn")}</Text>
                )}
              </Pressable>

              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>
                  <Text style={styles.footerBrand}>EyeOn</Text> Family Safety
                </Text>
              </View>
            </View>

            <Text style={styles.tagline}>{t("auth.tagline")}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function LabeledInput(props: TextInputProps & { label: string }) {
  const { label, ...rest } = props;
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, focused && styles.inputFocused]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
    </View>
  );
}

/** Eye-with-pin lockup like the web's EyeOnLogoInline: the pin from the app icon, "Eye" white, "On" yellow. */
function Logo() {
  return (
    <View style={styles.logo} accessibilityRole="image" accessibilityLabel="EyeOn">
      <View style={styles.pinBox}>
        {/* adaptive-icon.png is 1024 px with the pin at x 435-588, y 413-613; crop to it. */}
        <Image source={require("../assets/adaptive-icon.png")} style={styles.pinImg} />
      </View>
      <Text style={styles.wordmark}>
        Eye<Text style={{ color: colors.accent }}>On</Text>
      </Text>
    </View>
  );
}

/** Teal gradient with a map grid, built from plain views (no SVG/gradient native module). */
function Background() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BG.mid }]} />
      <View style={[styles.glow, styles.glowDark]} />
      <View style={[styles.glow, styles.glowLight]} />
      <View style={[styles.glow, styles.glowSun]} />
      {GRID_LINES.map((x) => (
        <View key={`v${x}`} style={[styles.gridV, { left: x }]} />
      ))}
      {GRID_LINES.map((y) => (
        <View key={`h${y}`} style={[styles.gridH, { top: y }]} />
      ))}
    </View>
  );
}

const PIN_SCALE = 30 / 200;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG.mid },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: space.lg, paddingVertical: space.xl },

  titleBlock: { alignItems: "center", marginBottom: 28 },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { color: "rgba(201,232,225,0.85)", fontSize: 15, marginTop: space.sm, textAlign: "center", lineHeight: 22 },

  card: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    gap: 18,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  fieldWrap: { gap: 6 },
  label: { color: "#3E4E4B", fontSize: 14, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    minHeight: touch.min,
    color: "#1C2B28",
    fontSize: 16,
  },
  inputFocused: { borderColor: colors.brand, borderWidth: 2 },
  errorBox: {
    borderWidth: 1,
    borderColor: "rgba(217,45,32,0.4)",
    backgroundColor: "rgba(217,45,32,0.1)",
    borderRadius: 8,
    paddingHorizontal: space.md,
    paddingVertical: 10,
  },
  errorText: { color: colors.danger, fontSize: 15 },
  btn: {
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    minHeight: touch.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  btnText: { color: colors.onBrand, fontWeight: "700", fontSize: 16 },
  cardFooter: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18, marginTop: 4 },
  footerText: { textAlign: "center", color: "#52625F", fontSize: 14 },
  footerBrand: { color: colors.brand, fontWeight: "700" },

  tagline: { color: "rgba(201,232,225,0.8)", fontSize: 14, textAlign: "center", marginTop: space.xl },

  logo: { flexDirection: "row", alignItems: "center", gap: space.sm },
  pinBox: { width: 153 * PIN_SCALE, height: 200 * PIN_SCALE, overflow: "hidden" },
  pinImg: {
    position: "absolute",
    width: 1024 * PIN_SCALE,
    height: 1024 * PIN_SCALE,
    left: -435 * PIN_SCALE,
    top: -413 * PIN_SCALE,
  },
  wordmark: { color: "#FFFFFF", fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },

  glow: { position: "absolute", borderRadius: 9999 },
  glowDark: { width: 700, height: 700, top: -360, left: -300, backgroundColor: BG.dark, opacity: 0.85 },
  glowLight: { width: 760, height: 760, bottom: -420, right: -360, backgroundColor: BG.light, opacity: 0.7 },
  glowSun: { width: 360, height: 360, bottom: 80, right: -200, backgroundColor: "rgba(255,200,87,0.06)" },
  gridV: { position: "absolute", top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: "rgba(154,211,199,0.14)" },
  gridH: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: "rgba(154,211,199,0.14)" },
});
