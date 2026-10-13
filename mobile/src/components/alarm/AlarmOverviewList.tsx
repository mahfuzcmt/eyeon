import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { alarmOverview } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { EmptyState, Loading } from "@/ui";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { alarmTypeLabel } from "@/alarmCenter";
import type { AlarmOverview, AlarmOverviewRow } from "@/types";

/**
 * "Alarm overview": one card per person with a count per alarm type for the period
 * (GET /alarms/overview). Tapping a type opens the details tab filtered to it.
 */
export function AlarmOverviewList({
  fromIso,
  toIso,
  columns,
  header,
  onOpen,
}: {
  fromIso: string;
  toIso: string;
  columns: number;
  header?: ReactElement | null;
  onOpen: (imei: string, type?: string) => void;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<AlarmOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gen = useRef(0);

  const load = useCallback(
    async (refresh: boolean) => {
      const g = ++gen.current;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const d = await alarmOverview(fromIso, toIso);
        if (g !== gen.current) return;
        setData(d);
        setError(null);
      } catch (e) {
        if (g === gen.current) setError(extractError(e).message);
      } finally {
        if (g === gen.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fromIso, toIso],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const rows = data ? [...data.rows].sort((a, b) => b.total - a.total) : [];
  const grand = rows.reduce((s, r) => s + r.total, 0);
  const withAlarms = rows.filter((r) => r.total > 0).length;

  if (loading && !data) return <Loading label={t("common.loading")} />;

  return (
    <FlatList
      key={`ov-${columns}`}
      data={rows}
      numColumns={columns}
      keyExtractor={(r) => r.imei}
      columnWrapperStyle={columns > 1 ? { gap: space.sm } : undefined}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}
      ListHeaderComponent={
        <View style={{ gap: space.sm }}>
          {header}
          <Text style={styles.summary}>
            {grand} {t("alc.overviewTotal")} · {withAlarms} {t("alc.overviewPeople")}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={<EmptyState text={t("alerts.none")} />}
      renderItem={({ item }) => <Row row={item} types={data?.types ?? []} onOpen={onOpen} />}
    />
  );
}

function Row({ row, types, onOpen }: { row: AlarmOverviewRow; types: string[]; onOpen: (imei: string, type?: string) => void }) {
  const { t } = useI18n();
  const nonZero = types.filter((ty) => (row.counts[ty] ?? 0) > 0);
  const name = row.name || row.vehiclePlate || row.imei.slice(-6);
  return (
    <View style={[styles.card, row.total === 0 && { opacity: 0.6 }]}>
      <Pressable
        onPress={() => onOpen(row.imei)}
        style={styles.head}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${row.total} ${t("alc.overviewTotal")}`}
      >
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={[styles.total, row.total > 0 && styles.totalOn]}>
          <Text style={[styles.totalText, row.total > 0 && { color: colors.onBrand }]}>{row.total}</Text>
        </View>
      </Pressable>
      {nonZero.length > 0 ? (
        <View style={styles.counts}>
          {nonZero.map((ty) => (
            <Pressable
              key={ty}
              onPress={() => onOpen(row.imei, ty)}
              style={({ pressed }) => [styles.count, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
            >
              <Text style={styles.countLabel}>{alarmTypeLabel(ty, t)}</Text>
              <Text style={styles.countValue}>{row.counts[ty]}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.none}>{t("alc.overviewNone")}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.md, gap: space.sm, paddingBottom: space.xl },
  summary: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 14 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 40 },
  name: { flex: 1, color: colors.text, fontSize: 17, fontWeight: "700" },
  total: {
    minWidth: 36,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  totalText: { color: colors.textDim, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  counts: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  count: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
  },
  countLabel: { color: colors.text, fontSize: 14 },
  countValue: { color: colors.brand, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  none: { color: colors.textFaint, fontSize: 14 },
});
