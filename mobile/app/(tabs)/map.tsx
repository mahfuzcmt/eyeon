import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuth } from "@/auth/AuthContext";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { useDevices } from "@/hooks/useDevices";
import WebMap, { MapVehicle } from "@/components/WebMap";
import { motionColor, motionOf } from "@/format";
import { useSpeedLimits } from "@/hooks/useSpeedLimits";
import { useI18n } from "@/i18n";
import { colors, space } from "@/theme";

export default function MapScreen() {
  const { t } = useI18n();
  const { org } = useAuth();
  const orgId = org?.id ?? null;
  const router = useRouter();
  const { locations, refresh } = useLiveLocations(orgId);
  const { devices } = useDevices();
  const [center, setCenter] = useState<{ lat: number; lng: number; zoom: number; nonce: number } | null>(null);
  const [zoomStep, setZoomStep] = useState<{ dir: 1 | -1; nonce: number } | null>(null);
  const [baseLayer, setBaseLayer] = useState<"street" | "satellite">("street");
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [trafficAvailable, setTrafficAvailable] = useState(false);
  const [fitVehicles, setFitVehicles] = useState<{ nonce: number } | null>(null);
  const initialFitDone = useRef(false);

  const byImei = useMemo(() => new Map(devices.map((d) => [d.imei, d])), [devices]);
  const speedLimits = useSpeedLimits();

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
      if (!loc.valid) continue;
      const d = byImei.get(loc.imei);
      const motion = d ? motionOf(d, loc) : loc.speed > 3 ? "MOVING" : "STOPPED";
      const overspeed = speedLimits.isOverspeed(loc.imei, loc.speed);
      out.push({
        imei: loc.imei,
        lat: loc.latitude,
        lng: loc.longitude,
        course: loc.course,
        color: overspeed ? colors.danger : motionColor(motion),
        label: d?.vehiclePlate ?? d?.name ?? loc.imei.slice(-6),
        vehicleType: d?.vehicleType,
        iconColor: d?.iconColor,
        overspeed,
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
        center={center}
        zoomStep={zoomStep}
        baseLayer={baseLayer}
        showTraffic={showTraffic}
        fitVehicles={fitVehicles}
        onTrafficAvailable={setTrafficAvailable}
        onSelect={(imei) => router.push({ pathname: "/device/[imei]", params: { imei } })}
      />

      <SafeAreaView edges={["top"]} style={styles.topOverlay} pointerEvents="box-none">
        <View>
          <Pressable
            onPress={() => setViewMenuOpen((v) => !v)}
            style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.pillLabel}>
              {t("map.view")}: {baseLayer === "street" ? t("map.normal") : t("map.satellite")}
            </Text>
            <Ionicons name={viewMenuOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.text} />
          </Pressable>
          {viewMenuOpen && (
            <View style={styles.viewMenu}>
              {(["street", "satellite"] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => {
                    setBaseLayer(k);
                    setViewMenuOpen(false);
                  }}
                  style={({ pressed }) => [styles.viewMenuItem, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.pillLabel, baseLayer === k && { color: colors.brand }]}>
                    {k === "street" ? t("map.normal") : t("map.satellite")}
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
    shadowColor: "#0F2742",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pillLabel: { color: colors.text, fontWeight: "600", fontSize: 14 },
  viewMenu: {
    marginTop: space.xs,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 160,
    shadowColor: "#0F2742",
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
    shadowColor: "#0F2742",
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
});
