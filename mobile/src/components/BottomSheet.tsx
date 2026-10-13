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
 * Bottom sheet for forms and pickers (admin panel, share links, reports): scrollable
 * body, optional fixed footer, keyboard-aware, safe-area padded, and capped at 640 px
 * wide so on a tablet it reads as a sheet rather than a full-width slab.
 */
export function BottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  dismissable = true,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** false while a request is running, so a stray tap does not close it. */
  dismissable?: boolean;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const close = () => {
    if (dismissable) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t("kit.close")} />
        <View
          style={[
            styles.sheet,
            { maxHeight: height * 0.9 - insets.top, paddingBottom: Math.max(insets.bottom, space.md) },
          ]}
        >
          <View style={styles.grip} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable
              onPress={close}
              hitSlop={8}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t("kit.close")}
            >
              <Ionicons name="close" size={24} color={colors.textDim} />
            </Pressable>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

/** A form field that opens a sheet with a list of choices (stands in for a web <select>). */
export function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: space.xs }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.select, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder}`}
      >
        <Text style={[styles.selectText, !current && { color: colors.textFaint }]} numberOfLines={1}>
          {current?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textDim} />
      </Pressable>
      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value || "__none"}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.optionText, on && { color: colors.brand }]}>{o.label}</Text>
                {o.hint ? <Text style={styles.optionHint}>{o.hint}</Text> : null}
              </View>
              {on ? <Ionicons name="checkmark" size={20} color={colors.brand} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

/** Secondary (outlined) button; `danger` paints it red. */
export function OutlineButton({
  label,
  onPress,
  danger,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const tint = danger ? colors.danger : colors.brand;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.outline,
        { borderColor: tint },
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
    >
      {icon ? <Ionicons name={icon} size={18} color={tint} /> : null}
      <Text style={[styles.outlineText, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(11,46,40,0.45)" },
  sheet: {
    width: "100%",
    maxWidth: 640,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  grip: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: space.sm },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 18, fontWeight: "700" },
  subtitle: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  close: { width: touch.min, height: touch.min, alignItems: "center", justifyContent: "center", marginTop: -space.sm, marginRight: -space.sm },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space.sm,
  },
  fieldLabel: { color: colors.textDim, fontSize: 14 },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    minHeight: touch.min,
  },
  selectText: { flex: 1, color: colors.text, fontSize: 16 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  optionText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  optionHint: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  outline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  outlineText: { fontSize: 15, fontWeight: "700" },
});
