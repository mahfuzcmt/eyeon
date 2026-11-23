import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuth } from "@/auth/AuthContext";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { useDevices } from "@/hooks/useDevices";
import { useDayRoute } from "@/hooks/useDayRoute";
import WebMap, { MapVehicle } from "@/components/WebMap";
import PersonDetails from "@/components/PersonDetails";
import { motionColor, motionOf, speedOf } from "@/format";
import { useSpeedLimits } from "@/hooks/useSpeedLimits";
import { useDevicePhotos } from "@/photos";
import { useI18n, type StringKey } from "@/i18n";
import { colors, space } from "@/theme";

const VIEW_LABEL: Record<"street" | "satellite" | "google", StringKey> = {
  street: "map.normal",
  satellite: "map.satellite",
  google: "map.google",
};

/** How long a person who changed position keeps being followed on the map. */
const FOLLOW_AFTER_MOVE_MS = 150_000;

function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dy = (lat2 - lat1) * 111_320;
  const dx = (lng2 - lng1) * 111_320 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return Math.hypot(dx, dy);
}

export default function MapScreen() {
  const { t } = useI18n();
  const { org } = useAuth();
  const orgId = org?.id ?? null;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locations, error: liveError, refresh } = useLiveLocations(orgId);
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
  /**
   * Person whose route of today is drawn (direction arrows as on the web map): the one tapped
   * last. It stays when the status card is closed - the card covers half the map, and closing
   * it used to take the route away with it (client feedback 2026-11-17). With only one person
   * to see, their route is there from the start.
   */
  const [routeOf, setRouteOf] = useState<string | null>(null);
  const routeImei = routeOf ?? (devices.length === 1 ? devices[0].imei : null);
  const routePieces = useDayRoute(routeImei, routeImei ? locations.get(routeImei) : null);

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

  // Keep a person in view as they move (pan only; the zoom stays where the user put it): the tapped
  // one, or - when nobody is tapped - the one person who is moving, as the web map does. Without it a
  // child in a bus or train left the screen within seconds and the map looked frozen.
  //
  // "Moving" is not only what the tracker says. A watch indoors or in a vehicle is located from
  // Wi-Fi and reports speed 0, so it never counted as moving and the map stayed where it was while
  // the marker walked off the screen ("location updates, but the map does not", client feedback
  // 2026-11-17). A person whose position changed by 25 m or more counts as moving for the next
  // FOLLOW_AFTER_MOVE_MS.
  const lastSpot = useRef(new Map<string, { lat: number; lng: number }>());
  const movedAt = useRef(new Map<string, number>());
  const autoFollow = useMemo(() => {
    const now = Date.now();
    for (const l of locations.values()) {
      if (l.latitude === 0 && l.longitude === 0) continue;
      const prev = lastSpot.current.get(l.imei);
      if (prev && metersBetween(prev.lat, prev.lng, l.latitude, l.longitude) >= 25) movedAt.current.set(l.imei, now);
      if (!prev || prev.lat !== l.latitude || prev.lng !== l.longitude) {
        lastSpot.current.set(l.imei, { lat: l.latitude, lng: l.longitude });
      }
    }
    if (selected) return selected;
    let only: string | null = null;
    for (const l of locations.values()) {
      const d = byImei.get(l.imei);
      const moved = now - (movedAt.current.get(l.imei) ?? 0) < FOLLOW_AFTER_MOVE_MS;
      if (!moved && (!d || motionOf(d, l) !== "MOVING")) continue;
      if (only) return null;
      only = l.imei;
    }
    return only;
  }, [selected, locations, byImei]);
  const selLoc = autoFollow ? locations.get(autoFollow) : undefined;
  const selLat = selLoc?.latitude;
  const selLng = selLoc?.longitude;
  const follow = useMemo(
    () => (selLat != null && selLng != null && !(selLat === 0 && selLng === 0) ? { lat: selLat, lng: selLng } : null),
    [selLat, selLng],
  );

  const vehicles = useMemo<MapVehicle[]>(() => {
    const out: MapVehicle[] = [];
    for (const loc of locations.values()) {
      // Without a fix the row still carries the last known position; (0,0) means there never was one.
      if (loc.latitude === 0 && loc.longitude === 0) continue;
      const d = byImei.get(loc.imei);
      const motion = d ? motionOf(d, loc) : speedOf(loc) > 0 ? "MOVING" : "STOPPED";
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
        // Only for the person whose route is shown, and only for a position worked out from
        // Wi-Fi or phone towers: how far off it may be.
        accuracyM: loc.imei === routeImei && loc.source ? loc.accuracyM ?? null : null,
      });
    }
    return out;
  }, [locations, byImei, speedLimits, routeImei]);

  /**
   * "Locate me". It used to centre the map on a position asked for at the default (balanced)
   * accuracy, which indoors is a Wi-Fi / tower estimate that can be 100 m and more out, and drew
   * nothing - so the map could show the user "on the opposite side" with no hint of how sure it
   * was (client feedback 2026-11-17). Now: the last known position at once, then a GPS-grade fix,
   * each drawn as a blue dot with the circle it is accurate to.
   */
  const [me, setMe] = useState<{ lat: number; lng: number; accuracyM: number | null } | null>(null);
  const locateMe = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const show = (pos: Location.LocationObject, zoom: number) => {
      setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy ?? null });
      setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom, nonce: Date.now() });
    };
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
      if (last) show(last, 17);
    } catch {
      // No cached position: wait for the fix below.
    }
    try {
      show(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 18);
    } catch {
      // Location is switched off or no fix came: keep what is shown.
    }
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
        me={me}
        follow={follow}
        routePieces={routePieces}
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
          setRouteOf(imei);
          const l = locations.get(imei);
          if (l) setCenter({ lat: l.latitude, lng: l.longitude, zoom: 19, nonce: Date.now() });
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

      {/* Positions could not be refreshed (offline, server away): what is drawn is the last known.
          The hook clears the error on the next refresh that works. */}
      {liveError ? (
        <View style={[styles.lostWrap, { top: insets.top + 64 }]} pointerEvents="none">
          <View style={styles.lost} accessibilityRole="alert">
            <Ionicons name="cloud-offline-outline" size={16} color={colors.warn} />
            <Text style={styles.lostText}>{t("map.connectionLost")}</Text>
          </View>
        </View>
      ) : null}

      {selected && (() => {
        const d = byImei.get(selected);
        const l = locations.get(selected) ?? null;
        if (!d) return null;
        const motion = motionOf(d, l);
        const overspeed = speedLimits.isOverspeed(selected, l?.speed ?? 0);
        const photo = photos[selected] ?? null;
        const navLat = l?.latitude ?? d.lastLatitude;
        const navLng = l?.longitude ?? d.lastLongitude;
        return (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              {photo ? <Image source={{ uri: photo }} style={[styles.avatar, { borderColor: motionColor(motion) }]} /> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardName} numberOfLines={1}>{d.name ?? d.vehiclePlate ?? d.imei}</Text>
                {d.name && d.vehiclePlate ? <Text style={styles.cardSeen} numberOfLines={1}>{d.vehiclePlate}</Text> : null}
              </View>
              <Pressable onPress={() => setSelected(null)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("common.close")}>
                <Ionicons name="close" size={24} color={colors.textDim} />
              </Pressable>
            </View>
            <PersonDetails device={d} loc={l} overspeed={overspeed} showNavigate={false} />
            {/* Navigate, Playback and Add as place in one row (owner, 2026-11-23) */}
            <View style={styles.cardActions}>
              {navLat != null && navLng != null && (navLat !== 0 || navLng !== 0) ? (
                <Pressable
                  onPress={() => void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${navLat},${navLng}`)}
                  style={({ pressed }) => [styles.cardButtonAlt, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                >
                  <Ionicons name="navigate-outline" size={22} color={colors.brand} />
                  <Text style={styles.cardButtonAltText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                    {t("person.navigate")}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => router.push({ pathname: "/device/[imei]", params: { imei: selected, tab: "history" } })}
                style={({ pressed }) => [styles.cardButtonAlt, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
              >
                <Ionicons name="play-circle-outline" size={22} color={colors.brand} />
                <Text style={styles.cardButtonAltText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {t("person.playback")}
                </Text>
              </Pressable>
              {l && (l.latitude !== 0 || l.longitude !== 0) ? (
                <Pressable
                  onPress={() => {
                    const params = { lat: String(l.latitude), lng: String(l.longitude), imei: selected };
                    Alert.alert(t("popup.addZone"), t("popup.addZoneHint"), [
                      { text: t("common.cancel"), style: "cancel" },
                      { text: t("popup.addBoundary"), onPress: () => router.push({ pathname: "/geofence-new", params }) },
                      { text: t("popup.addPlace"), onPress: () => router.push({ pathname: "/place-new", params }) },
                    ]);
                  }}
                  style={({ pressed }) => [styles.cardButtonAlt, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                  accessibilityLabel={t("map.addHere")}
                >
                  <Ionicons name="add-circle-outline" size={22} color={colors.brand} />
                  <Text style={styles.cardButtonAltText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                    {t("act.geofence")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })()}

      <SafeAreaView edges={["bottom"]} style={styles.controls} pointerEvents="box-none">
        <View style={styles.ctlGroup}>
          <CtlButton icon="refresh" label={t("map.refresh")} onPress={refresh} />
          <View style={styles.ctlDivider} />
          <CtlButton icon="scan-outline" label={t("map.fitAll")} onPress={fitAll} />
          <View style={styles.ctlDivider} />
          <CtlButton icon="locate-outline" label={t("map.locateMe")} onPress={locateMe} />
        </View>
        <View style={styles.ctlGroup}>
          <CtlButton icon="add" label="" accessibilityLabel="Zoom in" onPress={() => zoomBy(1)} />
          <View style={styles.ctlDivider} />
          <CtlButton icon="remove" label="" accessibilityLabel="Zoom out" onPress={() => zoomBy(-1)} />
        </View>
      </SafeAreaView>
    </View>
  );
}

/** A map control: icon over a short label (or icon only for zoom). */
function CtlButton({
  icon,
  label,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [label ? styles.ctlBtn : styles.zoomBtn, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Ionicons name={icon} size={label ? 20 : 22} color={colors.text} />
      {label ? (
        <Text style={styles.ctlLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {label}
        </Text>
      ) : null}
    </Pressable>
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
  lostWrap: { position: "absolute", left: space.md, right: space.md, alignItems: "center" },
  lost: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.warn,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  lostText: { color: colors.warn, fontSize: 13, fontWeight: "700", flexShrink: 1 },
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
    gap: space.sm,
  },
  ctlGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 2,
    shadowColor: "#0B2E28",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ctlBtn: { minWidth: 64, maxWidth: 92, minHeight: 52, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", gap: 2 },
  ctlLabel: { color: colors.text, fontSize: 12, fontWeight: "700" },
  zoomBtn: { width: 44, minHeight: 52, alignItems: "center", justifyContent: "center" },
  ctlDivider: { width: 1, height: 28, backgroundColor: colors.border },
  card: {
    position: "absolute",
    left: space.md,
    right: space.md,
    bottom: 84,
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
  cardActions: { flexDirection: "row", gap: space.sm },
  cardButtonAlt: {
    flex: 1,
    borderRadius: 12,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    gap: 2,
    borderWidth: 1.5,
    borderColor: colors.brand,
    backgroundColor: colors.surface,
  },
  cardButtonAltText: { color: colors.brand, fontSize: 13, fontWeight: "700" },
});
