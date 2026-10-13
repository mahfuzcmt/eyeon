import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { useAlarmCenter } from "@/hooks/useAlarmCenter";
import { useDevices } from "@/hooks/useDevices";
import { Chip, EmptyState, Loading } from "@/ui";
import { fmtDateTime } from "@/format";
import { useI18n } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";
import {
  RANGE_PRESETS,
  PRESET_LABEL,
  alarmColor,
  alarmTitle,
  alarmTypeLabel,
  defaultRange,
  rangeFor,
  rangeLabel,
  resultLabel,
  severityLabel,
  type AlarmRange,
} from "@/alarmCenter";
import DateRangePicker from "@/components/device/DateRangePicker";
import { AlarmFilterSheet, EMPTY_FILTER, activeFilterCount, type AlarmFilterValues } from "@/components/alarm/AlarmFilterSheet";
import { ProcessSheet } from "@/components/alarm/ProcessSheet";
import { AlarmMapSheet } from "@/components/alarm/AlarmMapSheet";
import { AlarmOverviewList } from "@/components/alarm/AlarmOverviewList";
import type { AlarmView, DeviceView } from "@/types";
import { XLSX_MIME, downloadAndShare } from "@/exportFile";

type Tab = "details" | "overview";

/**
 * Alarm center (web: /dashboard/alarms). Details: filterable, paged alarm history with a map
 * per alarm and the "Process" acknowledge step. Overview: person x type counts for the period.
 * Deep link: /alerts?unacked=1&imei=…&type=…&tab=overview (add `n` to re-apply the same link).
 */
export default function AlertsScreen() {
  const { t } = useI18n();
  const { org } = useAuth();
  const { width } = useWindowDimensions();
  const columns = width >= 960 ? 3 : width >= 620 ? 2 : 1;
  const params = useLocalSearchParams<{ unacked?: string; imei?: string; type?: string; tab?: string; n?: string }>();

  const [tab, setTab] = useState<Tab>("details");
  const [range, setRange] = useState<AlarmRange>(defaultRange);
  const [filter, setFilter] = useState<AlarmFilterValues>(EMPTY_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mapAlarm, setMapAlarm] = useState<AlarmView | null>(null);
  const [ackAlarm, setAckAlarm] = useState<AlarmView | null>(null);

  useEffect(() => {
    if (!params.unacked && !params.imei && !params.type && !params.tab) return;
    setFilter({
      ...EMPTY_FILTER,
      unacked: params.unacked === "1" || params.unacked === "true",
      imei: params.imei ?? "",
      type: params.type ?? "",
    });
    setTab(params.tab === "overview" ? "overview" : "details");
  }, [params.unacked, params.imei, params.type, params.tab, params.n]);

  const { devices } = useDevices();
  const byImei = useMemo(() => new Map<string, DeviceView>(devices.map((d) => [d.imei, d])), [devices]);
  const nameOf = (imei: string) => {
    const d = byImei.get(imei);
    return d ? d.name || d.vehiclePlate || imei.slice(-6) : imei.slice(-6);
  };

  const query = useMemo(
    () => ({
      type: filter.type || undefined,
      severity: filter.severity || undefined,
      imei: filter.imei || undefined,
      unacked: filter.unacked,
      from: range.fromIso,
      to: range.toIso,
    }),
    [filter, range],
  );
  const center = useAlarmCenter(org?.id ?? null, query);
  const unackedCount = center.alarms.filter((a) => !a.acknowledged).length;
  const nFilters = activeFilterCount(filter);

  const filterSummary = [
    filter.unacked ? t("alc.unackedOnly") : null,
    filter.imei ? nameOf(filter.imei) : null,
    filter.severity ? severityLabel(filter.severity, t) : null,
    filter.type ? alarmTypeLabel(filter.type, t) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const rangeRow = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeRow}>
      {RANGE_PRESETS.map((p) => (
        <Chip key={p} label={t(PRESET_LABEL[p])} active={range.preset === p} onPress={() => setRange(rangeFor(p))} />
      ))}
      <Chip
        label={range.preset ? t("alc.customRange") : `${t("alc.customRange")}: ${rangeLabel(range, t)}`}
        active={range.preset == null}
        onPress={() => setPickerOpen(true)}
      />
      <Chip
        label={exporting ? t("alc.exporting") : t("alc.exportExcel")}
        active={false}
        onPress={() => {
          if (exporting) return;
          setExporting(true);
          const overview = tab === "overview";
          downloadAndShare(
            overview ? "/exports/alarm-overview.xlsx" : "/exports/alarms.xlsx",
            { from: range.fromIso, to: range.toIso },
            overview ? "alarm-overview.xlsx" : "alarms.xlsx",
            XLSX_MIME,
            t("alc.exportExcel"),
          )
            .catch((e: unknown) => Alert.alert(t("alc.exportFailed"), e instanceof Error ? e.message : String(e)))
            .finally(() => setExporting(false));
        }}
      />
    </ScrollView>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.tabs} accessibilityRole="tablist">
        <TabButton label={t("alc.tabDetails")} active={tab === "details"} onPress={() => setTab("details")} />
        <TabButton label={t("alc.tabOverview")} active={tab === "overview"} onPress={() => setTab("overview")} />
      </View>
      {rangeRow}

      {tab === "overview" ? (
        <AlarmOverviewList
          fromIso={range.fromIso}
          toIso={range.toIso}
          columns={columns}
          onOpen={(imei, type) => {
            setFilter({ ...EMPTY_FILTER, imei, type: type ?? "" });
            setTab("details");
          }}
        />
      ) : (
        <>
          <View style={styles.toolbar}>
            <Text style={styles.summary} numberOfLines={2}>
              {center.alarms.length}
              {center.hasMore ? "+" : ""} {t("alc.shown")} · {unackedCount} {t("alc.unacked")}
            </Text>
            <Pressable
              onPress={() => setFilterOpen(true)}
              style={({ pressed }) => [styles.filterBtn, nFilters > 0 && styles.filterBtnOn, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel={t("alc.filters")}
            >
              <Ionicons name="options-outline" size={18} color={nFilters > 0 ? colors.onBrand : colors.text} />
              <Text style={[styles.filterText, nFilters > 0 && { color: colors.onBrand }]}>
                {t("alc.filters")}
                {nFilters > 0 ? ` (${nFilters})` : ""}
              </Text>
            </Pressable>
          </View>
          {nFilters > 0 ? (
            <View style={styles.activeRow}>
              <Text style={styles.activeText} numberOfLines={2}>
                {filterSummary}
              </Text>
              <Pressable onPress={() => setFilter(EMPTY_FILTER)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.clear}>{t("alc.clear")}</Text>
              </Pressable>
            </View>
          ) : null}

          {center.loading && center.alarms.length === 0 ? (
            <Loading label={t("alerts.loading")} />
          ) : (
            <FlatList
              key={`al-${columns}`}
              data={center.alarms}
              numColumns={columns}
              keyExtractor={(a) => a.id}
              columnWrapperStyle={columns > 1 ? { gap: space.sm } : undefined}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={center.refreshing} onRefresh={() => void center.refresh()} tintColor={colors.brand} />
              }
              onEndReachedThreshold={0.4}
              onEndReached={() => void center.loadMore()}
              ListHeaderComponent={
                <View style={{ gap: space.xs }}>
                  <Text style={styles.disclaimer}>{t("alerts.disclaimer")}</Text>
                  {center.error ? <Text style={styles.error}>{center.error}</Text> : null}
                </View>
              }
              ListEmptyComponent={<EmptyState text={t("alerts.none")} />}
              ListFooterComponent={
                center.loadingMore ? <ActivityIndicator color={colors.brand} style={{ marginVertical: space.lg }} /> : null
              }
              renderItem={({ item }) => (
                <AlarmCard
                  alarm={item}
                  who={nameOf(item.deviceImei)}
                  onMap={() => setMapAlarm(item)}
                  onProcess={() => setAckAlarm(item)}
                />
              )}
            />
          )}
        </>
      )}

      <AlarmFilterSheet
        visible={filterOpen}
        value={filter}
        devices={devices}
        onApply={(v) => {
          setFilter(v);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
      <ProcessSheet
        alarm={ackAlarm}
        who={ackAlarm ? nameOf(ackAlarm.deviceImei) : ""}
        onConfirm={center.acknowledge}
        onClose={() => setAckAlarm(null)}
      />
      <AlarmMapSheet
        alarm={mapAlarm}
        device={mapAlarm ? byImei.get(mapAlarm.deviceImei) : undefined}
        who={mapAlarm ? nameOf(mapAlarm.deviceImei) : ""}
        onClose={() => setMapAlarm(null)}
      />
      <DateRangePicker
        visible={pickerOpen}
        onApply={(r) => {
          setRange({ fromIso: r.fromIso, toIso: r.toIso, preset: null, label: r.label });
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabOn]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabText, active && styles.tabTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function AlarmCard({
  alarm,
  who,
  onMap,
  onProcess,
}: {
  alarm: AlarmView;
  who: string;
  onMap: () => void;
  onProcess: () => void;
}) {
  const { t } = useI18n();
  const color = alarmColor(alarm);
  const hasPos = alarm.latitude != null && alarm.longitude != null;
  const urgent = !alarm.acknowledged && alarm.severity === "CRITICAL";
  return (
    <View style={[styles.card, urgent && styles.cardUrgent]}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.type, { color }]} numberOfLines={2}>
            {alarmTitle(alarm, t)}
          </Text>
          <View style={[styles.sev, { borderColor: color }]}>
            <Text style={[styles.sevText, { color }]}>{severityLabel(alarm.severity, t)}</Text>
          </View>
        </View>
        <Text style={styles.who}>{who}</Text>
        <Text style={styles.time}>{fmtDateTime(alarm.ts)}</Text>
        {alarm.processResult ? (
          <Text style={styles.result} numberOfLines={3}>
            {t("alc.result")}: {resultLabel(alarm.processResult, t)}
            {alarm.processNotes ? ` · ${alarm.processNotes}` : ""}
          </Text>
        ) : null}
        <View style={styles.actions}>
          {hasPos ? (
            <Pressable
              onPress={onMap}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
            >
              <Ionicons name="map-outline" size={18} color={colors.brand} />
              <Text style={styles.actionText}>{t("alc.showMap")}</Text>
            </Pressable>
          ) : null}
          {alarm.acknowledged ? (
            <View style={styles.ackedBox}>
              <Ionicons name="checkmark-circle" size={18} color={colors.ok} />
              <Text style={styles.acked}>{t("alerts.acked")}</Text>
            </View>
          ) : (
            <Pressable
              onPress={onProcess}
              style={({ pressed }) => [styles.action, styles.actionPrimary, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.actionText, { color: colors.onBrand }]}>{t("alc.process")}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tabs: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },
  tab: {
    flex: 1,
    minHeight: touch.min - 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  tabOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.textDim, fontSize: 15, fontWeight: "700" },
  tabTextOn: { color: colors.onBrand },
  rangeRow: { gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  summary: { flex: 1, color: colors.textDim, fontSize: 14 },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterBtnOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.xs,
  },
  activeText: { flex: 1, color: colors.text, fontSize: 14 },
  clear: { color: colors.brand, fontSize: 14, fontWeight: "700" },
  list: { padding: space.md, gap: space.sm, paddingBottom: space.xl },
  disclaimer: { color: colors.textFaint, fontSize: 13 },
  error: { color: colors.danger, fontSize: 14 },
  card: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardUrgent: { borderColor: colors.danger, backgroundColor: "#FEF3F2" },
  bar: { width: 4 },
  body: { flex: 1, padding: space.md, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  type: { flex: 1, fontSize: 16, fontWeight: "700" },
  sev: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  sevText: { fontSize: 12, fontWeight: "700" },
  who: { color: colors.text, fontSize: 15, fontWeight: "600" },
  time: { color: colors.textFaint, fontSize: 13, fontVariant: ["tabular-nums"] },
  result: { color: colors.textDim, fontSize: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm, marginTop: 6 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  actionPrimary: { backgroundColor: colors.brand, borderColor: colors.brand },
  actionText: { color: colors.brand, fontSize: 14, fontWeight: "700" },
  ackedBox: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 40 },
  acked: { color: colors.ok, fontSize: 14, fontWeight: "600" },
});
