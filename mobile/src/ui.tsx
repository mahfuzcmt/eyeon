import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, radius, space } from "./theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#000" />
      ) : (
        <Text style={styles.btnText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={{ gap: space.xs }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipOn : styles.chipOff]}
    >
      <Text style={[styles.chipText, { color: active ? "#000" : colors.textDim }]}>{label}</Text>
    </Pressable>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

/** Labeled metric cell for stat grids (width defaults to a 3-up column). */
export function Metric({ label, value, width = "33%" }: { label: string; value: string; width?: `${number}%` }) {
  return (
    <View style={[styles.metric, { width }]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.brand} />
      {label ? <Text style={styles.dim}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.dim}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 11, fontWeight: "600" },
  btn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#000", fontWeight: "700", fontSize: 15 },
  label: { color: colors.textDim, fontSize: 13 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipOff: { backgroundColor: "transparent", borderColor: colors.border },
  chipText: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.sm },
  dim: { color: colors.textFaint, fontSize: 14, textAlign: "center" },
  sectionTitle: { color: colors.textDim, fontSize: 13, fontWeight: "700" },
  sectionCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  metric: { paddingVertical: space.sm },
  metricValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  metricLabel: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
});
