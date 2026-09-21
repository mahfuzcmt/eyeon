import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { deleteGeofence, listGeofences } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { EmptyState, PrimaryButton } from "@/ui";
import { fmtDistance } from "@/format";
import { useI18n, type StringKey } from "@/i18n";
import { PLACE_ICON, placeTypeKey } from "@/places";
import { colors, radius, space, touch } from "@/theme";
import type { GeofenceView } from "@/types";

export default function PlacesScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [places, setPlaces] = useState<GeofenceView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlaces(await listGeofences("TRUSTED_PLACE"));
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh whenever the screen gains focus (e.g. returning from the add/edit screen).
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  function confirmDelete(p: GeofenceView) {
    Alert.alert(t("place.deleteTitle"), `"${p.name}" — ${t("place.deleteMsg")}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteGeofence(p.id);
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
      <FlatList
        data={places}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
        ListEmptyComponent={loading ? null : <EmptyState text={`${t("place.none")}\n\n${t("place.noneHint")}`} />}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        renderItem={({ item }) => {
          const type = item.placeType ?? "OTHER";
          return (
            <Pressable
              onPress={() => router.push({ pathname: "/place-new", params: { id: item.id } })}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${t("place.edit")}`}
            >
              <View style={styles.iconTile}>
                <Ionicons name={PLACE_ICON[type]} size={26} color={colors.onAccent} />
              </View>
              <View style={styles.cardMain}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.address ?? t(placeTypeKey(type))}
                  {item.radiusM != null ? `  ·  ${fmtDistance(item.radiusM)}` : ""}
                </Text>
                <Text style={[styles.alerts, item.notifyOn === "NONE" && { color: colors.textFaint }]}>
                  {t(`place.alerts.${item.notifyOn}` as StringKey)}
                </Text>
              </View>
              <Pressable
                onPress={() => confirmDelete(item)}
                hitSlop={8}
                style={styles.deleteBtn}
                accessibilityRole="button"
                accessibilityLabel={t("common.delete")}
              >
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </Pressable>
            </Pressable>
          );
        }}
      />
      <View style={styles.footer}>
        <PrimaryButton label={t("place.add")} onPress={() => router.push("/place-new")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.md, gap: space.md, flexGrow: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMain: { flex: 1, gap: 3 },
  name: { color: colors.text, fontSize: 18, fontWeight: "700" },
  meta: { color: colors.textDim, fontSize: 14 },
  alerts: { color: colors.brand, fontSize: 14, fontWeight: "600" },
  deleteBtn: { width: touch.min, height: touch.min, alignItems: "center", justifyContent: "center" },
  footer: { padding: space.md },
  error: { color: colors.danger, fontSize: 15, marginBottom: space.sm },
});
