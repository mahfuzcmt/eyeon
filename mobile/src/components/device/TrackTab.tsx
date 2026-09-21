import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useDeviceLive } from "@/hooks/useDeviceLive";
import WebMap, { MapVehicle } from "@/components/WebMap";
import { Loading, Metric, Section } from "@/ui";
import {
  filterSpeed,
  fmtSince,
  fmtVoltage,
  motionColor,
  motionOf,
  subscriptionDaysLeft,
  subscriptionExpired,
} from "@/format";
import { useSpeedLimits } from "@/hooks/useSpeedLimits";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";

export default function TrackTab({ imei, orgId }: { imei: string; orgId: string | null }) {
  const { t } = useI18n();
  const { device, loc, loading } = useDeviceLive(imei, orgId);
  const speedLimits = useSpeedLimits();
  const [center, setCenter] = useState<{ lat: number; lng: number; zoom: number; nonce: number } | null>(null);
  const centered = useRef(false);

  useEffect(() => {
    if (loc && !centered.current) {
      centered.current = true;
      setCenter({ lat: loc.latitude, lng: loc.longitude, zoom: 15, nonce: 1 });
    }
  }, [loc]);

  const vehicles = useMemo<MapVehicle[]>(() => {
    if (!loc || !device) return [];
    const overspeed = speedLimits.isOverspeed(imei, loc.speed);
    return [
      {
        imei,
        lat: loc.latitude,
        lng: loc.longitude,
        course: loc.course,
        color: overspeed ? colors.danger : motionColor(motionOf(device, loc)),
        label: device.name ?? device.vehiclePlate ?? imei.slice(-6),
        vehicleType: device.vehicleType,
        iconColor: device.iconColor,
        overspeed,
        moving: motionOf(device, loc) === "MOVING",
      },
    ];
  }, [loc, device, imei, speedLimits]);

  if (loading && !device) return <Loading label={t("track.loadingDevice")} />;

  const speed = filterSpeed(loc?.speed ?? device?.lastSpeed, loc?.valid);
  const overspeeding = speedLimits.isOverspeed(imei, speed);
  const expired = device ? subscriptionExpired(device) : false;
  const daysLeft = device ? subscriptionDaysLeft(device) : null;
  const expiringSoon = !expired && daysLeft != null && daysLeft <= 7;
  const motion = device ? motionOf(device, loc) : "OFFLINE";
  const parked = (motion === "STOPPED" || motion === "OFFLINE") && device?.parkedSince;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* AutoNemo-style renewal banner */}
      {(expired || expiringSoon) && (
        <View style={[styles.banner, { borderColor: expired ? colors.danger : colors.warn }]}>
          <Text style={[styles.bannerTitle, { color: expired ? colors.danger : colors.warn }]}>
            {expired ? t("sub.expired") : t("sub.expiringSoon")}
            {device?.subscriptionExpiresAt ? ` · ${device.subscriptionExpiresAt}` : ""}
          </Text>
          <Text style={styles.bannerNote}>{t("sub.renewNote")}</Text>
        </View>
      )}

      <View style={styles.mapBox}>
        <WebMap vehicles={vehicles} center={center} />
        <View style={[styles.speedo, overspeeding && { borderColor: colors.danger }]}>
          <Text style={[styles.speedoVal, overspeeding && { color: colors.danger }]}>{speed}</Text>
          <Text style={styles.speedoUnit}>{t("veh.kmh")}</Text>
        </View>
      </View>

      {parked ? (
        <Text style={styles.parked}>
          {t("veh.parkedFor")} {fmtSince(device?.parkedSince)}
        </Text>
      ) : null}

      <Section title={t("track.telemetry")}>
        <Metric label={t("track.ignition")} value={loc?.accOn == null ? "—" : loc.accOn ? t("common.on") : t("common.off")} />
        <Metric label={t("track.gpsSats")} value={loc?.satellites != null ? String(loc.satellites) : "—"} />
        <Metric label="GSM" value={device?.lastGsmSignal != null ? String(device.lastGsmSignal) : "—"} />
        <Metric label={t("track.voltage")} value={fmtVoltage(loc?.voltageMv ?? device?.lastVoltageMv)} />
        <Metric label={t("track.course")} value={loc ? `${loc.course}°` : "—"} />
        <Metric label={t("track.fix")} value={loc ? (loc.valid ? t("track.fixValid") : t("track.fixInvalid")) : "—"} />
      </Section>

      {(device?.subscriptionStatus || device?.subscriptionExpiresAt) && (
        <Section title={t("sub.title")}>
          <Metric label={t("sub.status")} value={device?.subscriptionStatus ?? "—"} />
          <Metric label={t("sub.expiresOn")} value={device?.subscriptionExpiresAt ?? "—"} />
        </Section>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { gap: space.md, paddingBottom: space.xl },
  mapBox: { height: 300, backgroundColor: colors.bg },
  banner: {
    marginHorizontal: space.md,
    marginTop: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: space.md,
    gap: 4,
  },
  bannerTitle: { fontSize: 14, fontWeight: "800" },
  bannerNote: { color: colors.textDim, fontSize: 13 },
  parked: { color: colors.textDim, fontSize: 13, paddingHorizontal: space.md },
  speedo: {
    position: "absolute",
    right: space.md,
    top: space.md,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  speedoVal: { color: colors.text, fontSize: 24, fontWeight: "800" },
  speedoUnit: { color: colors.textFaint, fontSize: 12 },
  lockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingBottom: space.xs,
  },
  lockLabel: { color: colors.textFaint, fontSize: 13 },
  lockValue: { fontSize: 15, fontWeight: "700" },
  actions: { flexDirection: "row", gap: space.md, paddingVertical: space.sm, width: "100%" },
  action: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionText: { fontWeight: "700", fontSize: 15 },
  note: { color: colors.textFaint, fontSize: 12, paddingHorizontal: space.md },
});
