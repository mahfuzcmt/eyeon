import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  assignGeofenceDevices,
  createCircleGeofence,
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
import { useI18n } from "@/i18n";
import { PLACE_DEFAULT_RADIUS, PLACE_ICON, PLACE_RADIUS_PRESETS, PLACE_TYPES, placeTypeKey } from "@/places";
import { colors, radius, space, touch } from "@/theme";
import type { DeviceView, GeofenceNotifyOn, LatLng, LocationView, PlaceType } from "@/types";

function personLabel(d: DeviceView): string {
  return d.name ?? d.vehiclePlate ?? d.imei.slice(-6);
}

/** The backend accepts trusted places of 80 m to 5 km. */
const PLACE_MIN_M = 80;
const PLACE_MAX_M = 5000;
function radiusStep(r: number): number {
  return r < 300 ? 10 : r < 1000 ? 50 : 250;
}

function toNotifyOn(arrive: boolean, leave: boolean): GeofenceNotifyOn {
  if (arrive && leave) return "BOTH";
  if (arrive) return "ENTER";
  if (leave) return "EXIT";
  return "NONE";
}

/** Add a trusted place, or edit one when opened with `?id=`. */
export default function PlaceNewScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const { id, lat: startLat, lng: startLng, imei: startImei } = useLocalSearchParams<{ id?: string; lat?: string; lng?: string; imei?: string }>();
  const editing = typeof id === "string" && id.length > 0;
  // From a person's screen ("Add this location as ..."): pin at their position, watching them.
  const start = !editing && startLat && startLng && Number.isFinite(parseFloat(startLat)) && Number.isFinite(parseFloat(startLng))
    ? { lat: parseFloat(startLat), lng: parseFloat(startLng) }
    : null;
  const { devices } = useDevices();

  const [placeType, setPlaceType] = useState<PlaceType>("HOME");
  const [name, setName] = useState("");
  const [center, setCenter] = useState<LatLng | null>(start);
  const [radiusM, setRadiusM] = useState(PLACE_DEFAULT_RADIUS);
  /** Label of the searched address; cleared when the pin is moved by hand (as on the web). */
  const [address, setAddress] = useState<string | null>(null);
  const [arrive, setArrive] = useState(true);
  const [leave, setLeave] = useState(true);
  const [imeis, setImeis] = useState<Set<string>>(new Set(startImei ? [startImei] : []));
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom: number; nonce?: number } | null>(start ? { ...start, zoom: 18 } : null);
  const [loadingPlace, setLoadingPlace] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What the server had when the edit screen opened, to diff on save.
  const original = useRef<{ center: LatLng | null; radiusM: number; address: string | null; imeis: Set<string> } | null>(null);
  const nameTouched = useRef(false);
  const imeisTouched = useRef(!!startImei);

  useEffect(() => {
    navigation.setOptions({ headerTitle: editing ? t("place.edit") : t("place.add") });
  }, [navigation, editing, t]);

  // Edit mode: load the place and who it watches.
  useEffect(() => {
    if (!editing || !id) return;
    let cancelled = false;
    void (async () => {
      try {
        const [g, assigned] = await Promise.all([getGeofence(id), listGeofenceImeis(id)]);
        if (cancelled) return;
        nameTouched.current = true;
        imeisTouched.current = true;
        setPlaceType(g.placeType ?? "OTHER");
        setName(g.name);
        setCenter(g.center);
        setRadiusM(g.radiusM ?? PLACE_DEFAULT_RADIUS);
        setArrive(g.notifyOn === "BOTH" || g.notifyOn === "ENTER");
        setLeave(g.notifyOn === "BOTH" || g.notifyOn === "EXIT");
        setImeis(new Set(assigned));
        setAddress(g.address);
        original.current = { center: g.center, radiusM: g.radiusM ?? PLACE_DEFAULT_RADIUS, address: g.address, imeis: new Set(assigned) };
        if (g.center) setMapCenter({ ...g.center, zoom: 17 });
      } catch (e) {
        if (!cancelled) setError(extractError(e).message);
      } finally {
        if (!cancelled) setLoadingPlace(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  // New place: watch everyone until the user edits the set.
  useEffect(() => {
    if (!editing && !imeisTouched.current && devices.length > 0) {
      setImeis(new Set(devices.map((d) => d.imei)));
    }
  }, [devices, editing]);

  // New place: until the user types a name, the name follows the chosen type ("Home", "School").
  useEffect(() => {
    if (!nameTouched.current) setName(t(placeTypeKey(placeType)));
  }, [placeType, t]);

  // Last-known positions give context on the map and power "use where they are now".
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const locs = await lastKnownAll();
        if (cancelled) return;
        setLocations(locs);
        const first = locs.find((l) => l.latitude !== 0 || l.longitude !== 0);
        if (first && !editing && !startLat) setMapCenter({ lat: first.latitude, lng: first.longitude, zoom: 17 });
      } catch {
        // Map falls back to the Bangladesh default view.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editing, startLat]);

  const byImei = useMemo(() => new Map(devices.map((d) => [d.imei, d])), [devices]);
  const located = useMemo(() => locations.filter((l) => (l.latitude !== 0 || l.longitude !== 0) && byImei.has(l.imei)), [locations, byImei]);
  const markers = useMemo<MapVehicle[]>(
    () =>
      located.map((l) => ({
        imei: l.imei,
        lat: l.latitude,
        lng: l.longitude,
        course: l.course,
        color: colors.textFaint,
        label: personLabel(byImei.get(l.imei) as DeviceView),
      })),
    [located, byImei],
  );

  function placePin(p: LatLng, recenter: boolean, label: string | null = null) {
    setError(null);
    setCenter(p);
    setAddress(label);
    if (recenter) setMapCenter({ ...p, zoom: 18, nonce: Date.now() });
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

  async function submit() {
    const trimmed = name.trim() || t(placeTypeKey(placeType));
    if (!center) {
      setError(t("place.errPin"));
      return;
    }
    if (imeis.size === 0) {
      setError(t("place.errWho"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const notifyOn = toNotifyOn(arrive, leave);
      if (editing && id) {
        const prev = original.current;
        const moved =
          !prev?.center || prev.center.lat !== center.lat || prev.center.lng !== center.lng || prev.radiusM !== radiusM;
        // Only send geometry when it changed: reshaping resets arrived/left state on the server.
        await updateGeofence(id, {
          name: trimmed,
          placeType,
          notifyOn,
          ...(address && address !== prev?.address ? { address } : {}),
          ...(moved ? { center, radiusM } : {}),
        });
        const before = prev?.imeis ?? new Set<string>();
        const added = [...imeis].filter((i) => !before.has(i));
        const removed = [...before].filter((i) => !imeis.has(i));
        if (added.length > 0) await assignGeofenceDevices(id, added);
        for (const imei of removed) await unassignGeofenceDevice(id, imei);
      } else {
        await createCircleGeofence({
          name: trimmed,
          center,
          radiusM,
          notifyOn,
          imeis: [...imeis],
          kind: "TRUSTED_PLACE",
          placeType,
          ...(address ? { address } : {}),
        });
      }
      router.back();
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingPlace) return <Loading />;

  return (
    <View style={styles.screen}>
      <View style={styles.mapBox}>
        <WebMap
          vehicles={markers}
          center={mapCenter}
          circle={center ? { ...center, radiusM } : null}
          onMapPress={(p) => placePin(p, false)}
        />
        <AddressSearch near={center ?? mapCenter} onPick={(r) => placePin({ lat: r.lat, lng: r.lng }, true, r.label)} />
        <View style={styles.mapHint} pointerEvents="none">
          <Text style={styles.mapHintText}>
            {center ? `${t("place.pinSet")} · ${fmtDistance(radiusM)}` : t("place.tapMap")}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t("place.whatKind")}</Text>
        <View style={styles.typeGrid}>
          {PLACE_TYPES.map((pt) => {
            const active = pt === placeType;
            return (
              <Pressable
                key={pt}
                onPress={() => setPlaceType(pt)}
                style={[styles.typeTile, active && styles.typeTileOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={PLACE_ICON[pt]} size={26} color={active ? colors.onAccent : colors.textDim} />
                <Text style={[styles.typeText, active && { color: colors.onAccent }]} numberOfLines={1}>
                  {t(placeTypeKey(pt))}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field
          label={t("place.name")}
          value={name}
          onChangeText={(v) => {
            nameTouched.current = true;
            setName(v);
          }}
        />

        {located.length > 0 ? (
          <>
            <Text style={styles.label}>{t("place.useCurrent")}</Text>
            <View style={styles.chips}>
              {located.map((l) => (
                <Chip
                  key={l.imei}
                  label={personLabel(byImei.get(l.imei) as DeviceView)}
                  active={false}
                  onPress={() => placePin({ lat: l.latitude, lng: l.longitude }, true)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>{t("place.size")}</Text>
        <View style={styles.chips}>
          {PLACE_RADIUS_PRESETS.map((r) => (
            <Chip key={r} label={fmtDistance(r)} active={r === radiusM} onPress={() => setRadiusM(r)} />
          ))}
        </View>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => setRadiusM((r) => Math.max(PLACE_MIN_M, r - radiusStep(r - 1)))}
            style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t("geo.smaller")}
          >
            <Ionicons name="remove" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.stepValue}>{fmtDistance(radiusM)}</Text>
          <Pressable
            onPress={() => setRadiusM((r) => Math.min(PLACE_MAX_M, r + radiusStep(r)))}
            style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t("geo.bigger")}
          >
            <Ionicons name="add" size={22} color={colors.text} />
          </Pressable>
        </View>
        <Text style={styles.hint}>{t("place.sizeHint")}</Text>

        <Text style={styles.label}>{t("place.tellMe")}</Text>
        <View style={styles.chips}>
          <Chip label={t("place.arrive")} active={arrive} onPress={() => setArrive((v) => !v)} />
          <Chip label={t("place.leave")} active={leave} onPress={() => setLeave((v) => !v)} />
        </View>

        <Text style={styles.label}>{t("place.who")}</Text>
        <View style={styles.chips}>
          {devices.map((d) => (
            <Chip key={d.imei} label={personLabel(d)} active={imeis.has(d.imei)} onPress={() => toggleImei(d.imei)} />
          ))}
          {devices.length === 0 ? <Text style={styles.hint}>{t("veh.noneInAccount")}</Text> : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={editing ? t("place.saveChanges") : t("place.save")}
          onPress={() => void submit()}
          loading={submitting}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  mapBox: { height: 320, borderBottomWidth: 1, borderBottomColor: colors.border },
  mapHint: {
    position: "absolute",
    top: space.sm,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  mapHintText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  form: { flex: 1 },
  formContent: { padding: space.lg, gap: space.sm, paddingBottom: space.xl },
  label: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: space.md },
  hint: { color: colors.textFaint, fontSize: 14 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  typeTile: {
    width: "31%",
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.xs,
  },
  typeTileOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeText: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.md },
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
  error: { color: colors.danger, fontSize: 15, marginTop: space.sm },
});
