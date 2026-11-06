import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentStay } from "@/hooks/useCurrentStay";
import { reverseAddress } from "@/geocode";
import { batteryColor, fmtAgo, fmtDateTime, fmtDistance, fmtSince, fmtTime, fmtVoltage, motionColor, motionOf, speedOf } from "@/format";
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
  full = false,
}: {
  device: DeviceView;
  loc: LocationView | null;
  overspeed?: boolean;
  /** Also show the tracker's readings (the web popup's grid): used on the person's Track tab. */
  full?: boolean;
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
  // The tracker is still talking but has no GPS fix (in a train or bus, indoors): the position is the
  // last fix's. Say so, or "last seen just now" makes an old position look current.
  const fixAt = loc ? (loc.valid ? loc.ts : loc.lastValidTs ?? null) : null;
  const noFixFor = loc && fixAt ? (Date.parse(loc.ts) - Date.parse(fixAt)) / 1000 : 0;
  const gpsLost = !!loc && !loc.valid && noFixFor >= 30;

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

      {gpsLost ? (
        <Row icon="cloud-offline-outline">
          <Text style={styles.warn}>
            {t("person.noGps")} · {t("person.lastFix")} {fmtAgo(fixAt)}
          </Text>
        </Row>
      ) : null}

      <Row icon="refresh-outline">
        <Text style={styles.dim}>
          {t("veh.lastSeen")} {fmtAgo(reportedAt)}
          {reportedAt ? ` · ${fmtDateTime(reportedAt)}` : ""}
        </Text>
      </Row>

      {full ? <FullGrid device={device} loc={loc} speed={speed} lat={hasPos ? lat! : null} lng={hasPos ? lng! : null} /> : null}

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

const COMPASS_EN = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const COMPASS_BN = ["উত্তর", "উত্তর-পূর্ব", "পূর্ব", "দক্ষিণ-পূর্ব", "দক্ষিণ", "দক্ষিণ-পশ্চিম", "পশ্চিম", "উত্তর-পশ্চিম"];

/** Everything the web popup lists about the tracker's last report, as a two-column grid. */
function FullGrid({
  device,
  loc,
  speed,
  lat,
  lng,
}: {
  device: DeviceView;
  loc: LocationView | null;
  speed: number;
  lat: number | null;
  lng: number | null;
}) {
  const { t, locale } = useI18n();
  const approx = loc?.accuracyM != null ? ` (≈${loc.accuracyM >= 1000 ? `${(loc.accuracyM / 1000).toFixed(1)} km` : `${loc.accuracyM} m`})` : "";
  const fix = !loc
    ? "—"
    : loc.source === "WIFI"
      ? `${t("person.fixWifi")}${approx}`
      : loc.source === "LBS" || !loc.valid
        ? `${t("person.fixCell")}${approx}`
        : t("person.fixGps");
  const course = loc?.course ?? device.lastCourse;
  const heading =
    speed > 0 && course != null
      ? `${(locale === "bn" ? COMPASS_BN : COMPASS_EN)[Math.round((((course % 360) + 360) % 360) / 45) % 8]} (${course}°)`
      : "—";
  const mileage = loc?.mileageM ?? loc?.mileageMeters;
  const voltage = loc?.voltageMv ?? device.lastVoltageMv;
  const gsm = loc?.gsmSignal ?? device.lastGsmSignal;
  const status =
    device.status === "ONLINE" ? t("person.online") : device.status === "OFFLINE" ? t("person.offline") : t("person.never");

  const cells: [string, string][] = [
    [t("person.speed"), `${speed} ${t("veh.kmh")}`],
    [t("person.heading"), heading],
    [t("person.gpsTime"), fmtDateTime(loc?.lastValidTs ?? (loc?.valid ? loc.ts : null) ?? loc?.ts)],
    [t("person.fix"), fix],
    [t("veh.battery"), device.batteryPercent != null ? `${Math.round(device.batteryPercent)}%` : "—"],
    [t("person.power"), fmtVoltage(voltage)],
    [t("person.satellites"), loc?.satellites != null ? String(loc.satellites) : "—"],
    [t("person.signal"), gsm != null ? String(gsm) : "—"],
    [t("person.mileage"), mileage ? fmtDistance(mileage) : "—"],
    [t("person.status"), status],
    [t("person.sim"), device.simMsisdn || "—"],
    ["IMEI", device.imei],
  ];

  return (
    <View style={styles.grid}>
      {cells.map(([label, value]) => (
        <View key={label} style={styles.cell}>
          <Text style={styles.cellLabel}>{label}</Text>
          <Text style={styles.cellValue} selectable>{value}</Text>
        </View>
      ))}
      {lat != null && lng != null ? (
        <View style={[styles.cell, { width: "100%" }]}>
          <Text style={styles.cellLabel}>{t("person.coords")}</Text>
          <Text style={styles.cellValue} selectable>{`${lat.toFixed(6)}, ${lng.toFixed(6)}`}</Text>
        </View>
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
  warn: { color: colors.warn, fontSize: 14, fontWeight: "700" },
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.sm,
    rowGap: space.sm,
  },
  cell: { width: "50%", paddingRight: space.sm },
  cellLabel: { color: colors.textFaint, fontSize: 13 },
  cellValue: { color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 1 },
  navigateText: { color: colors.brand, fontSize: 15, fontWeight: "700" },
});
