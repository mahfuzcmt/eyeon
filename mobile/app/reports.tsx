import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { useDevices } from "@/hooks/useDevices";
import DateRangePicker from "@/components/device/DateRangePicker";
import { SelectField } from "@/components/BottomSheet";
import { adminStyles as s, dhakaDate, fmtDay } from "@/components/admin/shared";
import { presetRange, type DateRange } from "@/dateRange";
import { CSV_MIME, downloadAndShare, XLSX_MIME } from "@/exportFile";
import { EmptyState, PrimaryButton } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";

type ExportKind = "devices" | "alarms" | "locations";

const KINDS: { key: ExportKind; label: StringKey; hint: StringKey }[] = [
  { key: "devices", label: "rep.kind.people", hint: "rep.kind.peopleHint" },
  { key: "alarms", label: "rep.kind.alarms", hint: "rep.kind.alarmsHint" },
  { key: "locations", label: "rep.kind.locations", hint: "rep.kind.locationsHint" },
];

/** Reports and Excel exports (admins) - mirrors the web /dashboard/reports page and its export dialog. */
export default function ReportsScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN";
  const { devices } = useDevices();

  const [range, setRange] = useState<DateRange>(() => presetRange("last7"));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [kind, setKind] = useState<ExportKind>("devices");
  const [person, setPerson] = useState("");
  const [busy, setBusy] = useState<"csv" | "xlsx" | null>(null);

  const from = dhakaDate(new Date(range.fromIso));
  const to = dhakaDate(new Date(new Date(range.toIso).getTime() - 1));
  const days = Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000) + 1;

  const personOptions = useMemo(
    () =>
      devices.map((d) => ({
        value: d.imei,
        label: d.name || d.vehiclePlate || d.imei,
        hint: d.vehiclePlate && d.name ? d.vehiclePlate : undefined,
      })),
    [devices],
  );

  if (!isAdmin) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: t("rep.title") }} />
        <EmptyState text={t("rep.adminOnly")} />
      </>
    );
  }

  const tooLong = kind === "locations" && days > 7;
  const canExport = kind !== "locations" || (person !== "" && !tooLong);

  const run = async (which: "csv" | "xlsx") => {
    setBusy(which);
    try {
      if (which === "csv") {
        await downloadAndShare("/reports/alarms.csv", { from, to }, `alarms_${from}_${to}.csv`, CSV_MIME, t("rep.alarmsReport"));
      } else if (kind === "devices") {
        await downloadAndShare("/exports/devices.xlsx", {}, `people_${dhakaDate(new Date())}.xlsx`, XLSX_MIME, t("rep.excel"));
      } else if (kind === "alarms") {
        await downloadAndShare("/exports/alarms.xlsx", { from, to }, `alarms_${from}_${to}.xlsx`, XLSX_MIME, t("rep.excel"));
      } else {
        await downloadAndShare(
          "/exports/locations.xlsx",
          { device: person, from, to },
          `locations_${person.slice(-6)}_${from}_${to}.xlsx`,
          XLSX_MIME,
          t("rep.excel"),
        );
      }
    } catch (e) {
      Alert.alert(t("rep.failed"), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerTitle: t("rep.title") }} />

      <View style={s.card}>
        <Text style={s.sectionTitle}>{t("rep.period")}</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.rangeBtn, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
        >
          <Ionicons name="calendar-outline" size={18} color={colors.brand} />
          <Text style={styles.rangeText}>
            {fmtDay(from, locale)} – {fmtDay(to, locale)}
          </Text>
        </Pressable>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>{t("rep.alarmsReport")}</Text>
        <Text style={s.faint}>{t("rep.alarmsReportHint")}</Text>
        <PrimaryButton label={t("rep.download")} onPress={() => void run("csv")} loading={busy === "csv"} disabled={busy !== null} />
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>{t("rep.excel")}</Text>
        <Text style={s.faint}>{t("rep.excelHint")}</Text>
        {KINDS.map((k) => {
          const on = kind === k.key;
          return (
            <Pressable
              key={k.key}
              onPress={() => setKind(k.key)}
              style={[styles.kind, on && styles.kindOn]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
            >
              <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? colors.brand : colors.textFaint} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.kindLabel}>{t(k.label)}</Text>
                <Text style={s.faint}>{t(k.hint)}</Text>
              </View>
            </Pressable>
          );
        })}
        {kind === "locations" ? (
          <SelectField
            label={t("rep.person")}
            value={person}
            options={personOptions}
            placeholder={t("rep.pickPerson")}
            onChange={setPerson}
          />
        ) : null}
        {kind !== "devices" ? (
          <Text style={s.meta}>
            {t("rep.period")}: {fmtDay(from, locale)} – {fmtDay(to, locale)}
          </Text>
        ) : null}
        {tooLong ? <Text style={s.error}>{t("rep.max7")}</Text> : null}
        <PrimaryButton
          label={t("rep.export")}
          onPress={() => void run("xlsx")}
          loading={busy === "xlsx"}
          disabled={busy !== null || !canExport}
        />
      </View>

      <DateRangePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onApply={(r) => {
          setRange(r);
          setPickerOpen(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, gap: space.md, width: "100%", maxWidth: 720, alignSelf: "center" },
  rangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  rangeText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  kind: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: touch.min,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  kindOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  kindLabel: { color: colors.text, fontSize: 16, fontWeight: "600" },
});
