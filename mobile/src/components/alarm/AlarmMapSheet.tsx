import { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import WebMap, { type MapVehicle } from "@/components/WebMap";
import { fmtDateTime } from "@/format";
import { useI18n } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";
import { alarmColor, alarmTitle, resultLabel } from "@/alarmCenter";
import type { AlarmView, DeviceView } from "@/types";
import { Sheet } from "./Sheet";

/** Where an alarm happened: the person's marker at the alarm position, with a directions link. */
export function AlarmMapSheet({
  alarm,
  device,
  who,
  onClose,
}: {
  alarm: AlarmView | null;
  device: DeviceView | undefined;
  who: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const mapHeight = Math.max(240, Math.min(height * 0.5, 520));
  const hasPos = alarm?.latitude != null && alarm?.longitude != null;

  const vehicles = useMemo<MapVehicle[]>(() => {
    if (!alarm || alarm.latitude == null || alarm.longitude == null) return [];
    return [
      {
        imei: alarm.deviceImei,
        lat: alarm.latitude,
        lng: alarm.longitude,
        course: 0,
        color: alarmColor(alarm),
        label: who,
        vehicleType: device?.vehicleType ?? null,
      },
    ];
  }, [alarm, device?.vehicleType, who]);

  const center = useMemo(
    () => (alarm && alarm.latitude != null && alarm.longitude != null ? { lat: alarm.latitude, lng: alarm.longitude, zoom: 16, nonce: Date.now() } : null),
    [alarm],
  );

  return (
    <Sheet
      visible={alarm != null}
      title={alarm ? alarmTitle(alarm, t) : ""}
      subtitle={alarm ? `${who} · ${fmtDateTime(alarm.ts)}` : undefined}
      onClose={onClose}
      scroll={false}
    >
      {alarm && hasPos ? (
        <>
          <View style={[styles.map, { height: mapHeight }]}>
            <WebMap vehicles={vehicles} center={center} baseLayer="street" />
          </View>
          <View style={styles.row}>
            <Text style={styles.coords} selectable>
              {alarm.latitude!.toFixed(5)}, {alarm.longitude!.toFixed(5)}
            </Text>
            <Pressable
              onPress={() =>
                void Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${alarm.latitude},${alarm.longitude}`,
                )
              }
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
            >
              <Ionicons name="navigate-outline" size={18} color={colors.brand} />
              <Text style={styles.navText}>{t("alc.directions")}</Text>
            </Pressable>
          </View>
          {alarm.processResult ? (
            <Text style={styles.result}>
              {t("alc.result")}: {resultLabel(alarm.processResult, t)}
              {alarm.processNotes ? ` · ${alarm.processNotes}` : ""}
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.coords}>{t("alc.noPosition")}</Text>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  map: { borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  coords: { color: colors.textDim, fontSize: 14, fontVariant: ["tabular-nums"] },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navText: { color: colors.brand, fontSize: 15, fontWeight: "700" },
  result: { color: colors.textDim, fontSize: 14 },
});
