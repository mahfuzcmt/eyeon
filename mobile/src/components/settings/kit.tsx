import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space, touch } from "@/theme";

/** Content never stretches wider than this on tablets; it is centred instead. */
const MAX_WIDTH = 640;

/** Replaces `{name}` placeholders in a translated string. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Header options shared by every settings screen (they are not declared in app/_layout.tsx). */
export function ScreenHeader({ title, right }: { title: string; right?: () => React.ReactNode }) {
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTitle: title,
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.onHeader,
        headerRight: right,
      }}
    />
  );
}

/**
 * A scrolling form screen: keyboard-aware, taps on buttons work while the keyboard is open,
 * respects the bottom safe area and keeps a readable width on tablets.
 */
export function FormScreen({ title, headerRight, children }: { title: string; headerRight?: () => React.ReactNode; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScreenHeader title={title} right={headerRight} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: space.xl + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Panel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.error} accessibilityLiveRegion="polite">{children}</Text>;
}

export function OkText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.ok} accessibilityLiveRegion="polite">{children}</Text>;
}

/** Label + value pair for read-only facts (email, role, plan). */
export function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>
        {value}
      </Text>
    </View>
  );
}

export function CheckBox({ checked, onPress, label, disabled }: { checked: boolean; onPress: () => void; label: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.boxHit, pressed && { opacity: 0.7 }, disabled && { opacity: 0.4 }]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Ionicons name="checkmark" size={18} color={colors.onBrand} /> : null}
      </View>
    </Pressable>
  );
}

/** A whole tappable row with a checkbox, a label and an optional hint underneath. */
export function CheckRow({
  label,
  hint,
  checked,
  onToggle,
  disabled,
  right,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      style={({ pressed }) => [styles.checkRow, pressed && { opacity: 0.8 }, disabled && { opacity: 0.5 }]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Ionicons name="checkmark" size={18} color={colors.onBrand} /> : null}
      </View>
      <View style={styles.flex}>
        <Text style={styles.checkLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  danger,
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const tint = danger ? colors.danger : colors.brand;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.secondary,
        { borderColor: tint },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={tint} /> : null}
          <Text style={[styles.secondaryText, { color: tint }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Round colour swatches; the selected one gets a dark ring. */
export function ColorSwatches({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (c: string) => void }) {
  return (
    <View style={styles.swatches}>
      {options.map((c) => {
        const on = c.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={c}
            style={[styles.swatchHit, on && styles.swatchOn]}
          >
            <View style={[styles.swatch, { backgroundColor: c }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** One row of the settings menu. */
export function MenuRow({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={colors.textDim} />
      <View style={styles.flex}>
        <Text style={styles.menuLabel}>{label}</Text>
        {detail ? <Text style={styles.hint} numberOfLines={2}>{detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export const kitStyles = StyleSheet.create({
  /** Gap between stacked fields inside a panel. */
  stack: { gap: space.md },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, alignItems: "center" },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg },
  inner: { width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", gap: space.lg },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  heading: { color: colors.text, fontSize: 17, fontWeight: "700" },
  hint: { color: colors.textFaint, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 14 },
  ok: { color: colors.ok, fontSize: 14, fontWeight: "600" },
  info: { minWidth: 140, flexGrow: 1, flexBasis: 140, gap: 2 },
  infoLabel: { color: colors.textFaint, fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  infoValue: { color: colors.text, fontSize: 15, fontWeight: "600" },
  boxHit: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  box: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.textFaint,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: touch.min, paddingVertical: space.xs },
  checkLabel: { color: colors.text, fontSize: 16, fontWeight: "600" },
  secondary: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: radius.md,
    minHeight: touch.min,
    paddingHorizontal: space.lg,
    backgroundColor: colors.surface,
  },
  secondaryText: { fontSize: 16, fontWeight: "700" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  swatchHit: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "transparent" },
  swatchOn: { borderColor: colors.text },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14, minHeight: touch.min },
  menuLabel: { color: colors.text, fontSize: 16, fontWeight: "600" },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: space.lg },
});
