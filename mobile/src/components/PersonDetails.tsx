import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentStay } from "@/hooks/useCurrentStay";
import { reverseAddress } from "@/geocode";
import { batteryColor, fmtAgo, fmtDateTime, fmtSince, fmtTime, motionColor, motionOf, speedOf } from "@/format";
import { Pill } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { DeviceView, LocationView, MotionStatus } from "@/types";

const MOTION_KEY: Record<MotionStatus, StringKey> = {
  MOVING: "state.moving",
  IDLE: "state.idle",
  STOPPED: "state.stopped",
  OFFLINE: "state.offline",
};

/** Street / area of a point, looked up once per ~110 m (see reverseAddress). */
function useAddress(lat: number | null, lng: number | null, lang: string): string | null {
  const [addr, setAddr] = useState<string | null>(null);
  const cellLat = lat == null ? null : Math.round(lat * 1000);
  const cellLng = lng == null ? null : Math.round(lng * 1000);
  useEffect(() => {
    if (lat == null || lng == null || (lat === 0 && lng === 0)) {
      setAddr(null);
      return;
    }
    let cancelled = false;
    void reverseAddress(lat, lng, lang).then((a) => {
      if (!cancelled) setAddr(a);
    });
    return () => {
      cancelled = true;
    };
    // Only a move to another ~110 m cell needs a new lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellLat, cellLng, lang]);
  return addr;
}

/**
 * What the web map popup shows about a person, for the app: state and speed, battery, how
 * long they have been where they are, the address, when the tracker last reported, and a
 * "Navigate" link. Used by the map tab's card and the person's Track tab.
 */
export default function PersonDetails({
  device,
  loc,
  overspeed = false,
}: {
  device: DeviceView;
  loc: LocationView | null;
  overspeed?: boolean;
}) {
  const { t, locale } = useI18n();
  const motion = motionOf(device, loc);
  const lat = loc?.latitude ?? device.lastLatitude;
  const lng = loc?.longitude ?? device.lastLongitude;
  const hasPos = lat != null && lng != null && !(lat === 0 && lng === 0);
  const address = useAddress(hasPos ? lat : null, hasPos ? lng : null, locale === "bn" ? "bn" : "en");
  const stay = useCurrentStay(device.imei);
  const speed = speedOf(loc, device.lastSpeed);
  const reportedAt = loc?.ts ?? device.lastSeenAt;

  return (
    <View style={styles.wrap}>
      <View style={styles.pills}>
        <Pill label={overspeed ? t("state.overspeed") : t(MOTION_KEY[motion])} color={overspeed ? colors.danger : motionColor(motion)} />
        {motion === "MOVING" ? <Pill label={`${speed} ${t("veh.kmh")}`} color={colors.textDim} /> : null}
        {device.batteryPercent != null ? (
          <Pill label={`${t("veh.battery")} ${Math.round(device.batteryPercent)}%`} color={batteryColor(device.batteryPercent)} />
        ) : null}
      </View>

      {stay ? (
        <Row icon="time-outline">
          <Text style={styles.strong}>
            {t("popup.hereFor")} {fmtSince(stay.from)}
            {stay.openStart ? "+" : ""}
          </Text>
          <Text style={styles.dim}> · {t("popup.since")} {fmtTime(stay.from)}</Text>
        </Row>
      ) : null}

      {hasPos ? (
        <Row icon="location-outline">
          <Text style={styles.text}>{address ?? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`}</Text>
        </Row>
      ) : null}

      <Row icon="refresh-outline">
        <Text style={styles.dim}>
          {t("veh.lastSeen")} {fmtAgo(reportedAt)}
          {reportedAt ? ` · ${fmtDateTime(reportedAt)}` : ""}
        </Text>
      </Row>

      {hasPos ? (
        <Pressable
          onPress={() => void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)}
          style={({ pressed }) => [styles.navigate, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Ionicons name="navigate-outline" size={18} color={colors.brand} />
          <Text style={styles.navigateText}>{t("person.navigate")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Row({ icon, children }: { icon: React.ComponentProps<typeof Ionicons>["name"]; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.textDim} style={{ marginTop: 1 }} />
      <Text style={styles.rowText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  rowText: { flex: 1 },
  text: { color: colors.text, fontSize: 15 },
  strong: { color: colors.text, fontSize: 15, fontWeight: "700" },
  dim: { color: colors.textDim, fontSize: 14 },
  navigate: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.xs,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    minHeight: 44,
  },
  navigateText: { color: colors.brand, fontSize: 15, fontWeight: "700" },
});
