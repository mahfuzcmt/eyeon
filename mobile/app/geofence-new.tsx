import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  assignGeofenceDevices,
  createCircleGeofence,
  createPolygonGeofence,
  getGeofence,
  lastKnownAll,
  listGeofenceImeis,
  unassignGeofenceDevice,
  updateGeofence,
} from "@/api/endpoints";
import { extractError } from "@/api/client";
import { useDevices } from "@/hooks/useDevices";
import WebMap, { MapVehicle } from "@/components/WebMap";
import { AddressSearch } from "@/components/AddressSearch";
import { Chip, Field, Loading, PrimaryButton } from "@/ui";
import { fmtDistance } from "@/format";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";
import type { GeofenceNotifyOn, GeofenceType, LatLng, LocationView } from "@/types";

const RADIUS_PRESETS = [100, 250, 500, 1000, 2000, 5000];
const MIN_RADIUS_M = 10;
const MAX_RADIUS_M = 50_000;
const NOTIFY_OPTIONS: { value: GeofenceNotifyOn; label: StringKey }[] = [
  { value: "BOTH", label: "geo.enterExit" },
  { value: "ENTER", label: "geo.enterOnly" },
  { value: "EXIT", label: "geo.exitOnly" },
  { value: "NONE", label: "geo.noneOption" },
];
/** Same default as the web editor's boundary colour, plus a few that stay readable on the map. */
export const ZONE_COLORS = ["#0F2742", "#0F6B5C", "#2563EB", "#D97706", "#D92D20", "#7C3AED", "#DB2777"];

/** Step for the -/+ buttons: fine for small zones, coarse for big ones. */
function radiusStep(r: number): number {
  if (r < 200) return 10;
  if (r < 1000) return 50;
  if (r < 5000) return 250;
  return 1000;
}

function samePoints(a: LatLng[], b: LatLng[]): boolean {
  return a.length === b.length && a.every((p, i) => p.lat === b[i].lat && p.lng === b[i].lng);
}

/**
 * Add a boundary, or edit one when opened with `?id=` - the mobile counterpart of the web's
 * GeofenceEditor for boundaries: circle or polygon (tap the corners), alerts, colour, people.
 */
export default function GeofenceNewScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const { devices } = useDevices();
  const { id, lat: startLat, lng: startLng, imei: startImei } = useLocalSearchParams<{ id?: string; lat?: string; lng?: string; imei?: string }>();
  const editing = typeof id === "string" && id.length > 0;
  // From a person's screen ("Add this location as ..."): centred on their position, watching them.
  const start = !editing && startLat && startLng && Number.isFinite(parseFloat(startLat)) && Number.isFinite(parseFloat(startLng))
    ? { lat: parseFloat(startLat), lng: parseFloat(startLng) }
    : null;

  const [name, setName] = useState("");
  const [shape, setShape] = useState<GeofenceType>("CIRCLE");
  const [center, setCenter] = useState<LatLng | null>(start);
  const [radiusM, setRadiusM] = useState(500);
  const [corners, setCorners] = useState<LatLng[]>([]);
  const [notifyOn, setNotifyOn] = useState<GeofenceNotifyOn>("BOTH");
  const [color, setColor] = useState(ZONE_COLORS[0]);
  const [address, setAddress] = useState<string | null>(null);
  const [imeis, setImeis] = useState<Set<string>>(new Set(startImei ? [startImei] : []));
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom: number; nonce?: number } | null>(
    start ? { ...start, zoom: 17 } : null,
  );
  const [loadingZone, setLoadingZone] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** What the server had when the edit screen opened, to send only what changed. */
  const original = useRef<{
    shape: GeofenceType;
    center: LatLng | null;
    radiusM: number;
    corners: LatLng[];
    address: string | null;
    imeis: Set<string>;
  } | null>(null);
  const imeisTouched = useRef(!!startImei);

  useEffect(() => {
    navigation.setOptions({ headerTitle: editing ? t("geo.edit") : t("geo.new") });
  }, [navigation, editing, t]);

  // Edit mode: load the zone and who it watches.
  useEffect(() => {
    if (!editing || !id) return;
    let cancelled = false;
    void (async () => {
      try {
        const [g, assigned] = await Promise.all([getGeofence(id), listGeofenceImeis(id)]);
        if (cancelled) return;
        imeisTouched.current = true;
        setName(g.name);
        setShape(g.type);
        setCenter(g.center);
        setRadiusM(g.radiusM ?? 500);
        setCorners(g.polygon ?? []);
        setNotifyOn(g.notifyOn);
        setColor(g.color ?? ZONE_COLORS[0]);
        setAddress(g.address);
        setImeis(new Set(assigned));
        original.current = {
          shape: g.type,
          center: g.center,
          radiusM: g.radiusM ?? 500,
          corners: g.polygon ?? [],
          address: g.address,
          imeis: new Set(assigned),
        };
        const focus = g.center ?? g.polygon?.[0] ?? null;
        if (focus) setMapCenter({ ...focus, zoom: 16 });
      } catch (e) {
        if (!cancelled) setError(extractError(e).message);
      } finally {
        if (!cancelled) setLoadingZone(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  // New zone: watch everyone until the user edits the set.
  useEffect(() => {
    if (!editing && !imeisTouched.current && devices.length > 0) {
      setImeis(new Set(devices.map((d) => d.imei)));
    }
  }, [devices, editing]);

  // Last-known positions for context; a new zone opens where the people are.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const locs = await lastKnownAll();
        if (cancelled) return;
        setLocations(locs);
        const first = locs.find((l) => l.latitude !== 0 || l.longitude !== 0);
        if (first && !startLat && !editing) setMapCenter({ lat: first.latitude, lng: first.longitude, zoom: 16 });
      } catch {
        // Map falls back to the Bangladesh default view.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startLat, editing]);

  const byImei = useMemo(() => new Map(devices.map((d) => [d.imei, d])), [devices]);
  const vehicles = useMemo<MapVehicle[]>(
    () =>
      locations
        .filter((l) => (l.latitude !== 0 || l.longitude !== 0) && byImei.has(l.imei))
        .map((l) => {
          const d = byImei.get(l.imei);
          return {
            imei: l.imei,
            lat: l.latitude,
            lng: l.longitude,
            course: l.course,
            color: colors.textFaint,
            label: d?.name ?? d?.vehiclePlate ?? l.imei.slice(-6),
            vehicleType: d?.vehicleType,
          };
        }),
    [locations, byImei],
  );

  const circleOverlay = useMemo(
    () => (shape === "CIRCLE" && center ? { ...center, radiusM, color } : null),
    [shape, center, radiusM, color],
  );
  const polygonOverlay = useMemo(
    () => (shape === "POLYGON" && corners.length > 0 ? { points: corners, color } : null),
    [shape, corners, color],
  );
  const pins = useMemo(() => (shape === "POLYGON" ? corners : []), [shape, corners]);

  function onMapPress(p: LatLng) {
    setError(null);
    if (shape === "CIRCLE") {
      setCenter(p);
      setAddress(null); // moved by hand: the searched address no longer describes it
    } else {
      setCorners((prev) => [...prev, p]);
    }
  }

  function toggleImei(imei: string) {
    imeisTouched.current = true;
    setImeis((prev) => {
      const next = new Set(prev);
      if (next.has(imei)) next.delete(imei);
      else next.add(imei);
      return next;
    });
  }

  function changeShape(next: GeofenceType) {
    if (next === shape) return;
    setError(null);
    setShape(next);
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("geo.errName"));
      return;
    }
    if (shape === "CIRCLE" && !center) {
      setError(t("geo.tapCenter"));
      return;
    }
    if (shape === "POLYGON" && corners.length < 3) {
      setError(t("geo.errPolygon"));
      return;
    }
    if (imeis.size === 0) {
      setError(t("geo.errVehicles"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editing && id) {
        const prev = original.current;
        // Only send geometry when it changed: reshaping resets inside/outside state on the server.
        const geometry =
          shape === "CIRCLE"
            ? !prev || prev.shape !== "CIRCLE" || prev.radiusM !== radiusM ||
              prev.center?.lat !== center!.lat || prev.center?.lng !== center!.lng
              ? { center: center!, radiusM }
              : {}
            : !prev || prev.shape !== "POLYGON" || !samePoints(prev.corners, corners)
              ? { polygon: corners }
              : {};
        await updateGeofence(id, {
          name: trimmed,
          notifyOn,
          color,
          ...(address && address !== prev?.address ? { address } : {}),
          ...geometry,
        });
        const before = prev?.imeis ?? new Set<string>();
        const added = [...imeis].filter((i) => !before.has(i));
        const removed = [...before].filter((i) => !imeis.has(i));
        if (added.length > 0) await assignGeofenceDevices(id, added);
        for (const imei of removed) await unassignGeofenceDevice(id, imei);
      } else if (shape === "CIRCLE") {
        await createCircleGeofence({
          name: trimmed,
          center: center!,
          radiusM,
          notifyOn,
          imeis: [...imeis],
          color,
          ...(address ? { address } : {}),
        });
      } else {
        await createPolygonGeofence({ name: trimmed, polygon: corners, notifyOn, imeis: [...imeis], color });
      }
      router.back();
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingZone) return <Loading />;

  const hint =
    shape === "CIRCLE"
      ? center
        ? `${t("geo.centerSet")} · ${t("geo.radius")} ${fmtDistance(radiusM)}`
        : t("geo.tapCenter")
      : corners.length > 0
        ? `${corners.length} ${t("geo.cornersSet")} · ${t("geo.tapVertex")}`
        : t("geo.tapVertex");

  return (
    <View style={styles.screen}>
      <View style={styles.mapBox}>
        <WebMap
          vehicles={vehicles}
          center={mapCenter}
          circle={circleOverlay}
          polygon={polygonOverlay}
          pins={pins}
          onMapPress={onMapPress}
        />
        <AddressSearch
          near={center ?? mapCenter}
          onPick={(r) => {
            setError(null);
            setMapCenter({ lat: r.lat, lng: r.lng, zoom: 17, nonce: Date.now() });
            if (shape === "CIRCLE") {
              setCenter({ lat: r.lat, lng: r.lng });
              setAddress(r.label);
            }
          }}
        />
        <View style={styles.mapHint} pointerEvents="none">
          <Text style={styles.mapHintText}>{hint}</Text>
        </View>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Field label={t("geo.name")} placeholder={t("geo.namePlaceholder")} value={name} onChangeText={setName} />

        <Text style={styles.label}>{t("geo.shape")}</Text>
        <View style={styles.chips}>
          <Chip label={t("geo.circle")} active={shape === "CIRCLE"} onPress={() => changeShape("CIRCLE")} />
          <Chip label={t("geo.polygon")} active={shape === "POLYGON"} onPress={() => changeShape("POLYGON")} />
        </View>

        {shape === "CIRCLE" ? (
          <>
            <Text style={styles.label}>{t("geo.radius")}</Text>
            <View style={styles.chips}>
              {RADIUS_PRESETS.map((r) => (
                <Chip key={r} label={fmtDistance(r)} active={r === radiusM} onPress={() => setRadiusM(r)} />
              ))}
            </View>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setRadiusM((r) => Math.max(MIN_RADIUS_M, r - radiusStep(r - 1)))}
                style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={t("geo.smaller")}
              >
                <Ionicons name="remove" size={22} color={colors.text} />
              </Pressable>
              <Text style={styles.stepValue}>{fmtDistance(radiusM)}</Text>
              <Pressable
                onPress={() => setRadiusM((r) => Math.min(MAX_RADIUS_M, r + radiusStep(r)))}
                style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={t("geo.bigger")}
              >
                <Ionicons name="add" size={22} color={colors.text} />
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.chips}>
            <Chip
              label={t("geo.undoCorner")}
              active={false}
              onPress={() => setCorners((prev) => prev.slice(0, -1))}
            />
            <Chip label={t("geo.clearShape")} active={false} onPress={() => setCorners([])} />
          </View>
        )}

        <Text style={styles.label}>{t("geo.notify")}</Text>
        <View style={styles.chips}>
          {NOTIFY_OPTIONS.map((o) => (
            <Chip key={o.value} label={t(o.label)} active={o.value === notifyOn} onPress={() => setNotifyOn(o.value)} />
          ))}
        </View>

        <Text style={styles.label}>{t("geo.color")}</Text>
        <View style={styles.chips}>
          {ZONE_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: c === color }}
              accessibilityLabel={c}
            >
              {c === color ? <Ionicons name="checkmark" size={20} color="#fff" /> : null}
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t("geo.watchVehicles")}</Text>
        <View style={styles.chips}>
          {devices.map((d) => (
            <Chip
              key={d.imei}
              label={d.name ?? d.vehiclePlate ?? d.imei.slice(-6)}
              active={imeis.has(d.imei)}
              onPress={() => toggleImei(d.imei)}
            />
          ))}
          {devices.length === 0 ? <Text style={styles.dim}>{t("veh.noneInAccount")}</Text> : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={editing ? t("geo.saveChanges") : t("geo.create")}
          onPress={() => void submit()}
          loading={submitting}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  mapBox: { height: 340, borderBottomWidth: 1, borderBottomColor: colors.border },
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
  mapHintText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  form: { flex: 1 },
  formContent: { padding: space.md, gap: space.sm, paddingBottom: space.xl },
  label: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.xs },
  stepBtn: {
    width: touch.min,
    height: touch.min,
    borderRadius: touch.min / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { color: colors.text, fontSize: 17, fontWeight: "700", minWidth: 80, textAlign: "center" },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  swatchOn: { borderWidth: 3, borderColor: colors.text },
  dim: { color: colors.textFaint, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
});
