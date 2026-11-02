import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { deleteGeofence, listGeofences } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { EmptyState, Pill, PrimaryButton } from "@/ui";
import WebMap, { type MapZone } from "@/components/WebMap";

import { fmtDistance } from "@/format";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { GeofenceView } from "@/types";

const NOTIFY_KEY: Record<GeofenceView["notifyOn"], StringKey> = {
  ENTER: "geo.onEnter",
  EXIT: "geo.onExit",
  BOTH: "geo.enterExit",
  NONE: "geo.noAlerts",
};

export default function GeofencesScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [fences, setFences] = useState<GeofenceView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fit, setFit] = useState<{ nonce: number } | null>(null);
  const zones = useMemo<MapZone[]>(
    () => fences.map((g) => ({ id: g.id, name: g.name, color: g.color, center: g.center, radiusM: g.radiusM, polygon: g.polygon })),
    [fences],
  );
  const openEditor = useCallback((id: string) => router.push({ pathname: "/geofence-new", params: { id } }), [router]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Trusted places have their own screen; this one is the draw-a-boundary list.
      setFences(await listGeofences("BOUNDARY"));
      setFit({ nonce: Date.now() });
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh whenever the screen gains focus (e.g. returning from creation).
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  function confirmDelete(g: GeofenceView) {
    Alert.alert(t("geo.deleteTitle"), `"${g.name}" ${t("geo.deleteMsg")}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteGeofence(g.id);
              await reload();
            } catch (e) {
              setError(extractError(e).message);
            }
          })();
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      {fences.length > 0 ? (
        <View style={styles.mapBox}>
          <WebMap zones={zones} fitZones={fit} onZonePress={openEditor} />
          <View style={styles.mapHint} pointerEvents="none">
            <Text style={styles.mapHintText}>{t("zones.tapToEdit")}</Text>
          </View>
        </View>
      ) : null}
      <FlatList
        data={fences}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
        ListEmptyComponent={
          loading ? null : <EmptyState text={`${t("geo.none")} ${t("geo.createHint")}`} />
        }
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openEditor(item.id)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${t("geo.edit")}`}
          >
            <View style={[styles.swatch, { backgroundColor: item.color ?? colors.brand }]} />
            <View style={styles.rowMain}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.type === "CIRCLE" && item.radiusM != null
                  ? `${t("geo.circle")} · ${t("geo.radius")} ${fmtDistance(item.radiusM)}`
                  : `${t("geo.polygon")} · ${item.polygon.length} ${t("geo.points")}`}
                {"  ·  "}
                {t(NOTIFY_KEY[item.notifyOn])}
              </Text>
            </View>
            <Pill
              label={item.active ? t("geo.active") : t("geo.off")}
              color={item.active ? colors.ok : colors.textFaint}
            />
            <Pressable onPress={() => confirmDelete(item)} hitSlop={10} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>✕</Text>
            </Pressable>
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <PrimaryButton label={t("geo.new")} onPress={() => router.push("/geofence-new")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  mapBox: { height: 240, borderBottomWidth: 1, borderBottomColor: colors.border },
  mapHint: {
    position: "absolute",
    bottom: space.sm,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  mapHintText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  list: { padding: space.md, gap: space.sm, flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  rowMain: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.textFaint, fontSize: 13 },
  deleteBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  deleteText: { color: colors.danger, fontSize: 16, fontWeight: "700" },
  footer: { padding: space.md },
  error: { color: colors.danger, fontSize: 14, marginBottom: space.sm },
});
