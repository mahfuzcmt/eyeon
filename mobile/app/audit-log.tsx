import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { listAuditLog } from "@/api/endpoints";
import { extractError } from "@/api/client";
import DateRangePicker from "@/components/device/DateRangePicker";
import { SelectField } from "@/components/BottomSheet";
import { adminStyles as s, fmtDay, fmtStamp } from "@/components/admin/shared";
import { presetRange, type DateRange } from "@/dateRange";
import { EmptyState, Loading } from "@/ui";
import { useI18n } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";
import type { AuditLogEntry } from "@/types";

/** Same list as the web filter, minus the inherited engine cut/restore commands. */
const KNOWN_ACTIONS = [
  "AUTH_LOGIN",
  "ORG_UPDATE",
  "USER_CREATE",
  "USER_UPDATE",
  "USER_DISABLE",
  "GEOFENCE_CREATE",
  "GEOFENCE_DELETE",
  "GEOFENCE_ASSIGN",
  "GEOFENCE_UNASSIGN",
  "ALARM_ACKNOWLEDGE",
  "DEVICE_CMD_QUERY_ADDRESS",
  "DEVICE_CMD_RAW",
];

const PAGE = 200;

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

/** Audit log (ORG_ADMIN / SUPER_ADMIN) - mirrors the web /dashboard/audit-log page. */
export default function AuditLogScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN";

  const [range, setRange] = useState<DateRange>(() => presetRange("last7"));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [action, setAction] = useState("");
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    (offset: number) =>
      listAuditLog({ from: range.fromIso, to: range.toIso, action: action || undefined, limit: PAGE, offset }),
    [range, action],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPage(0);
      setEntries(rows);
      setMore(rows.length === PAGE);
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = async () => {
    if (loading || !more) return;
    setLoading(true);
    try {
      const rows = await fetchPage(entries.length);
      setEntries((prev) => [...prev, ...rows]);
      setMore(rows.length === PAGE);
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: t("audit.title") }} />
        <EmptyState text={t("audit.adminOnly")} />
      </>
    );
  }

  const rangeLabel = `${fmtDay(range.fromIso, locale)} – ${fmtDay(new Date(new Date(range.toIso).getTime() - 1).toISOString(), locale)}`;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerTitle: t("audit.title") }} />
      <FlatList
        data={entries}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading && entries.length > 0} onRefresh={load} tintColor={colors.brand} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => void loadMore()}
        ListHeaderComponent={
          <View style={styles.filters}>
            <View style={{ gap: space.xs }}>
              <Text style={s.meta}>{t("audit.period")}</Text>
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [styles.rangeBtn, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
              >
                <Ionicons name="calendar-outline" size={18} color={colors.brand} />
                <Text style={styles.rangeText}>{rangeLabel}</Text>
              </Pressable>
            </View>
            <SelectField
              label={t("audit.action")}
              value={action}
              placeholder={t("audit.allActions")}
              options={[{ value: "", label: t("audit.allActions") }, ...KNOWN_ACTIONS.map((a) => ({ value: a, label: a }))]}
              onChange={setAction}
            />
            {error ? <Text style={s.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={loading ? <Loading label={t("common.loading")} /> : error ? null : <EmptyState text={t("audit.none")} />}
        ListFooterComponent={loading && entries.length > 0 ? <Loading /> : null}
        renderItem={({ item: e }) => (
          <View style={s.card}>
            <View style={[s.row, { flexWrap: "wrap" }]}>
              <View style={styles.action}>
                <Text style={styles.actionText}>{e.action}</Text>
              </View>
              <Text style={[s.faint, { marginLeft: "auto" }]}>{fmtStamp(e.ts, locale)}</Text>
            </View>
            {e.resourceType ? (
              <Text style={s.meta}>
                {t("audit.resource")}: {e.resourceType} <Text style={s.mono}>{e.resourceId ?? "—"}</Text>
              </Text>
            ) : null}
            <Text style={s.meta}>
              {t("audit.actor")}: <Text style={s.mono}>{e.userId ? e.userId.slice(0, 8) : "—"}</Text>
              {"   "}
              {t("audit.ip")}: <Text style={s.mono}>{e.ipAddress ?? "—"}</Text>
            </Text>
            {e.metadata ? (
              <View style={styles.meta}>
                <Text style={styles.metaText} selectable>
                  {prettyJson(e.metadata)}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      />
      <DateRangePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onApply={(r) => {
          setRange(r);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.md, gap: space.sm, width: "100%", maxWidth: 900, alignSelf: "center" },
  filters: { gap: space.md, marginBottom: space.xs },
  rangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  rangeText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  action: { backgroundColor: colors.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  actionText: { color: colors.text, fontSize: 13, fontFamily: "monospace" },
  meta: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: space.sm },
  metaText: { color: colors.textDim, fontSize: 12, fontFamily: "monospace" },
});
