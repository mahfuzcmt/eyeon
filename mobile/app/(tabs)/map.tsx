import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuth } from "@/auth/AuthContext";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { useDevices } from "@/hooks/useDevices";
import WebMap, { MapVehicle } from "@/components/WebMap";
import { batteryColor, filterSpeed, fmtAgo, fmtSince, motionColor, motionOf } from "@/format";
import { Pill } from "@/ui";
import type { MotionStatus } from "@/types";
import { useSpeedLimits } from "@/hooks/useSpeedLimits";
import { useDevicePhotos } from "@/photos";
import { useI18n, type StringKey } from "@/i18n";
import { colors, space } from "@/theme";

const MOTION_KEY: Record<MotionStatus, StringKey> = {
  MOVING: "state.moving",
  IDLE: "state.idle",
  STOPPED: "state.stopped",
  OFFLINE: "state.offline",
};

const VIEW_LABEL: Record<"street" | "satellite" | "google", StringKey> = {
  street: "map.normal",
  satellite: "map.satellite",
  google: "map.google",
};

export default function MapScreen() {
  const { t } = useI18n();
  const { org } = useAuth();
  const orgId = org?.id ?? null;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locations, refresh } = useLiveLocations(orgId);
  const { devices } = useDevices();
  const [center, setCenter] = useState<{ lat: number; lng: number; zoom: number; nonce: number } | null>(null);
  const [zoomStep, setZoomStep] = useState<{ dir: 1 | -1; nonce: number } | null>(null);
  const [baseLayer, setBaseLayer] = useState<"street" | "satellite" | "google">("google");
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [trafficAvailable, setTrafficAvailable] = useState(false);
  const [fitVehicles, setFitVehicles] = useState<{ nonce: number } | null>(null);
  const initialFitDone = useRef(false);
  /** Person whose status card is open (tapped on the map). */
  const [selected, setSelected] = useState<string | null>(null);

  const byImei = useMemo(() => new Map(devices.map((d) => [d.imei, d])), [devices]);
  const speedLimits = useSpeedLimits();
  const photos = useDevicePhotos(devices);

  // Auto-fit map to show all vehicles on initial load
  useEffect(() => {
    if (!initialFitDone.current && locations.size > 0) {
      // Small delay to ensure WebMap has received the vehicles
      const timer = setTimeout(() => {
        setFitVehicles({ nonce: Date.now() });
        initialFitDone.current = true;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [locations.size]);

  const vehicles = useMemo<MapVehicle[]>(() => {
    const out: MapVehicle[] = [];
    for (const loc of locations.values()) {
      // Without a fix the row still carries the last known position; (0,0) means there never was one.
      if (loc.latitude === 0 && loc.longitude === 0) continue;
      const d = byImei.get(loc.imei);
      const motion = d ? motionOf(d, loc) : filterSpeed(loc.speed, loc.valid) > 0 ? "MOVING" : "STOPPED";
      const overspeed = speedLimits.isOverspeed(loc.imei, loc.speed);
      out.push({
        imei: loc.imei,
        lat: loc.latitude,
        lng: loc.longitude,
        course: loc.course,
        color: overspeed ? colors.danger : motionColor(motion),
        label: d?.name ?? d?.vehiclePlate ?? loc.imei.slice(-6),
        vehicleType: d?.vehicleType,
        iconColor: d?.iconColor,
        overspeed,
        moving: motion === "MOVING",
      });
    }
    return out;
  }, [locations, byImei, speedLimits]);

  const locateMe = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({});
    setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 14, nonce: Date.now() });
  }, []);

  const zoomBy = useCallback((dir: 1 | -1) => {
    setZoomStep({ dir, nonce: Date.now() });
  }, []);

  const fitAll = useCallback(() => {
    setFitVehicles({ nonce: Date.now() });
  }, []);

  return (
    <View style={styles.fill}>
      <WebMap
        vehicles={vehicles}
        photos={photos}
        center={center}
        zoomStep={zoomStep}
        baseLayer={baseLayer}
        showTraffic={showTraffic}
        fitVehicles={fitVehicles}
        onTrafficAvailable={setTrafficAvailable}
        onGoogleAvailable={(ok) => {
          setGoogleAvailable(ok);
          if (!ok) setBaseLayer((b) => (b === "google" ? "street" : b));
        }}
        onSelect={(imei) => {
          setSelected(imei);
          const l = locations.get(imei);
          if (l) setCenter({ lat: l.latitude, lng: l.longitude, zoom: 17, nonce: Date.now() });
        }}
        onMapPress={() => setSelected(null)}
      />

      {/* The status bar icons are white app-wide: give them the header teal here too. */}
      <View style={[styles.statusStrip, { height: insets.top }]} pointerEvents="none" />
      <SafeAreaView edges={["top"]} style={styles.topOverlay} pointerEvents="box-none">
        <View>
          <Pressable
            onPress={() => setViewMenuOpen((v) => !v)}
            style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.pillLabel}>
              {t("map.view")}: {t(VIEW_LABEL[baseLayer])}
            </Text>
            <Ionicons name={viewMenuOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.text} />
          </Pressable>
          {viewMenuOpen && (
            <View style={styles.viewMenu}>
              {(googleAvailable ? (["street", "satellite", "google"] as const) : (["street", "satellite"] as const)).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => {
                    setBaseLayer(k);
                    setViewMenuOpen(false);
                  }}
                  style={({ pressed }) => [styles.viewMenuItem, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.pillLabel, baseLayer === k && { color: colors.brand }]}>
                    {t(VIEW_LABEL[k])}
                  </Text>
                  {baseLayer === k && <Ionicons name="checkmark" size={16} color={colors.brand} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>
        {trafficAvailable && (
          <Pressable
            onPress={() => setShowTraffic((v) => !v)}
            style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.trafficBox, showTraffic && styles.trafficBoxOn]}>
              {showTraffic && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={styles.pillLabel}>{t("map.traffic")}</Text>
          </Pressable>
        )}
      </SafeAreaView>

      {selected && (() => {
        const d = byImei.get(selected);
        const l = locations.get(selected) ?? null;
        if (!d) return null;
        const motion = motionOf(d, l);
        const overspeed = speedLimits.isOverspeed(selected, l?.speed ?? 0);
        const parked = (motion === "STOPPED" || motion === "OFFLINE") && d.parkedSince;
        const photo = photos[selected] ?? null;
        return (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              {photo ? <Image source={{ uri: photo }} style={[styles.avatar, { borderColor: motionColor(motion) }]} /> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardName} numberOfLines={1}>{d.name ?? d.vehiclePlate ?? d.imei}</Text>
                <Text style={styles.cardSeen} numberOfLines={1}>
                  {parked ? `${t("veh.parkedFor")} ${fmtSince(d.parkedSince)}` : `${t("veh.lastSeen")} ${fmtAgo(d.lastSeenAt)}`}
                </Text>
              </View>
              <Pressable onPress={() => setSelected(null)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("common.close")}>
                <Ionicons name="close" size={24} color={colors.textDim} />
              </Pressable>
            </View>
            <View style={styles.cardPills}>
              <Pill label={overspeed ? t("state.overspeed") : t(MOTION_KEY[motion])} color={overspeed ? colors.danger : motionColor(motion)} />
              <Pill label={`${l?.speed ?? d.lastSpeed ?? 0} ${t("veh.kmh")}`} color={colors.textDim} />
              {d.batteryPercent != null ? (
                <Pill label={`${t("veh.battery")} ${Math.round(d.batteryPercent)}%`} color={batteryColor(d.batteryPercent)} />
              ) : null}
            </View>
            <Pressable
              onPress={() => router.push({ pathname: "/device/[imei]", params: { imei: selected } })}
              style={({ pressed }) => [styles.cardButton, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
            >
              <Text style={styles.cardButtonText}>{t("home.openVehicle")}</Text>
            </Pressable>
          </View>
        );
      })()}

      <SafeAreaView edges={["bottom"]} style={styles.controls} pointerEvents="box-none">
        <Pressable onPress={refresh} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}>
          <Ionicons name="refresh" size={16} color={colors.text} />
          <Text style={styles.pillLabel}>{t("map.refresh")}</Text>
        </Pressable>
        <Pressable onPress={fitAll} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}>
          <Ionicons name="scan-outline" size={16} color={colors.text} />
          <Text style={styles.pillLabel}>{t("map.fitAll")}</Text>
        </Pressable>
        <Pressable onPress={locateMe} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}>
          <Ionicons name="locate-outline" size={16} color={colors.text} />
          <Text style={styles.pillLabel}>{t("map.locateMe")}</Text>
        </Pressable>
        <View style={styles.zoomGroup}>
          <Pressable onPress={() => zoomBy(1)} style={({ pressed }) => [styles.zoomBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="add" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable onPress={() => zoomBy(-1)} style={({ pressed }) => [styles.zoomBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="remove" size={20} color={colors.text} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  statusStrip: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.header },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: space.md,
  },
  trafficBox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: colors.textFaint,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  trafficBoxOn: { borderColor: colors.brand, backgroundColor: colors.brand },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    shadowColor: "#0B2E28",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pillLabel: { color: colors.text, fontWeight: "600", fontSize: 15 },
  viewMenu: {
    marginTop: space.xs,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 160,
    shadowColor: "#0B2E28",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  viewMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: 10,
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: space.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoomGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 4,
    shadowColor: "#0B2E28",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomDivider: { width: 1, height: 20, backgroundColor: colors.border },
  card: {
    position: "absolute",
    left: space.md,
    right: space.md,
    bottom: 76,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: space.lg,
    gap: space.md,
    shadowColor: "#0B2E28",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, backgroundColor: colors.surfaceAlt },
  cardName: { color: colors.text, fontSize: 18, fontWeight: "800" },
  cardSeen: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  cardPills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  cardButton: { backgroundColor: colors.brand, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  cardButtonText: { color: colors.onBrand, fontSize: 16, fontWeight: "700" },
});
