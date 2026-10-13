import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";

/**
 * Bottom sheet used by the alarm center: slides up, scrollable body, fixed footer,
 * keyboard-aware, and capped at 640 px wide so it reads as a sheet on tablets too.
 */
export function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  scroll = true,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** false for content that manages its own size (a map). */
  scroll?: boolean;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t("alc.close")} />
        <View style={[styles.sheet, { maxHeight: height * 0.9 - insets.top, paddingBottom: Math.max(insets.bottom, space.md) }]}>
          <View style={styles.grip} />
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t("alc.close")}
            >
              <Ionicons name="close" size={24} color={colors.textDim} />
            </Pressable>
          </View>
          {scroll ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.bodyContent, { flexShrink: 1 }]}>{children}</View>
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Two equal buttons for sheet footers: secondary on the left, primary on the right. */
export function SheetButtons({
  secondary,
  onSecondary,
  primary,
  onPrimary,
  busy,
  disabled,
}: {
  secondary: string;
  onSecondary: () => void;
  primary: string;
  onPrimary: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={styles.buttons}>
      <Pressable
        onPress={onSecondary}
        disabled={busy}
        style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
      >
        <Text style={styles.btnGhostText}>{secondary}</Text>
      </Pressable>
      <Pressable
        onPress={onPrimary}
        disabled={busy || disabled}
        style={({ pressed }) => [styles.btn, styles.btnPrimary, (busy || disabled) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
      >
        <Text style={styles.btnPrimaryText}>{primary}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(11,46,40,0.45)" },
  sheet: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  grip: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: space.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  subtitle: { color: colors.textFaint, fontSize: 14, marginTop: 2 },
  close: { width: touch.min, height: touch.min, alignItems: "center", justifyContent: "center", marginTop: -10, marginRight: -10 },
  body: { flexGrow: 0 },
  bodyContent: { padding: space.lg, gap: space.lg },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  buttons: { flexDirection: "row", gap: space.sm },
  btn: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  btnGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  btnGhostText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  btnPrimary: { backgroundColor: colors.brand },
  btnPrimaryText: { color: colors.onBrand, fontSize: 16, fontWeight: "700" },
});
