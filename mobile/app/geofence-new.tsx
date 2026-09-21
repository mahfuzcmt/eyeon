import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { createCircleGeofence, lastKnownAll } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { useDevices } from "@/hooks/useDevices";
import WebMap, { MapVehicle } from "@/components/WebMap";
import { Chip, Field, PrimaryButton } from "@/ui";
import { fmtDistance } from "@/format";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { GeofenceNotifyOn, LatLng, LocationView } from "@/types";

const RADIUS_PRESETS = [100, 250, 500, 1000, 2000, 5000];
const NOTIFY_OPTIONS: { value: GeofenceNotifyOn; label: StringKey }[] = [
  { value: "BOTH", label: "geo.enterExit" },
  { value: "ENTER", label: "geo.enterOnly" },
  { value: "EXIT", label: "geo.exitOnly" },
];

export default function GeofenceNewScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { devices } = useDevices();

  const [name, setName] = useState("");
  const [center, setCenter] = useState<LatLng | null>(null);
  const [radiusM, setRadiusM] = useState(500);
  const [notifyOn, setNotifyOn] = useState<GeofenceNotifyOn>("BOTH");
  const [imeis, setImeis] = useState<Set<string>>(new Set());
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preselect the whole fleet once devices load (until the user edits the set).
  const imeisTouched = useRef(false);
  useEffect(() => {
    if (!imeisTouched.current && devices.length > 0) {
      setImeis(new Set(devices.map((d) => d.imei)));
    }
  }, [devices]);

  // Show last-known fleet positions for context and center the map on them.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const locs = await lastKnownAll();
        if (cancelled) return;
        setLocations(locs);
        const first = locs.find((l) => l.valid);
        if (first) setMapCenter({ lat: first.latitude, lng: first.longitude, zoom: 13 });
      } catch {
        // Map falls back to the Bangladesh default view.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byImei = useMemo(() => new Map(devices.map((d) => [d.imei, d])), [devices]);
  const vehicles = useMemo<MapVehicle[]>(
    () =>
      locations
        .filter((l) => l.valid)
        .map((l) => {
          const d = byImei.get(l.imei);
          return {
            imei: l.imei,
            lat: l.latitude,
            lng: l.longitude,
            course: l.course,
            color: colors.textFaint,
            label: d?.vehiclePlate ?? d?.name ?? l.imei.slice(-6),
          };
        }),
    [locations, byImei],
  );

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
    if (!name.trim()) {
      setError(t("geo.errName"));
      return;
    }
    if (!center) {
      setError(t("geo.tapCenter"));
      return;
    }
    if (imeis.size === 0) {
      setError(t("geo.errVehicles"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createCircleGeofence({
        name: name.trim(),
        center,
        radiusM,
        notifyOn,
        imeis: [...imeis],
      });
      router.back();
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.mapBox}>
        <WebMap
          vehicles={vehicles}
          center={mapCenter}
          circle={center ? { ...center, radiusM } : null}
          onMapPress={(p) => {
            setError(null);
            setCenter(p);
          }}
        />
        <View style={styles.mapHint} pointerEvents="none">
          <Text style={styles.mapHintText}>
            {center
              ? `${t("geo.centerSet")} · ${t("geo.radius")} ${fmtDistance(radiusM)}`
              : t("geo.tapCenter")}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        <Field label={t("geo.name")} placeholder={t("geo.namePlaceholder")} value={name} onChangeText={setName} />

        <Text style={styles.label}>{t("geo.radius")}</Text>
        <View style={styles.chips}>
          {RADIUS_PRESETS.map((r) => (
            <Chip key={r} label={fmtDistance(r)} active={r === radiusM} onPress={() => setRadiusM(r)} />
          ))}
        </View>

        <Text style={styles.label}>{t("geo.notify")}</Text>
        <View style={styles.chips}>
          {NOTIFY_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={t(o.label)}
              active={o.value === notifyOn}
              onPress={() => setNotifyOn(o.value)}
            />
          ))}
        </View>

        <Text style={styles.label}>{t("geo.watchVehicles")}</Text>
        <View style={styles.chips}>
          {devices.map((d) => (
            <Chip
              key={d.imei}
              label={d.vehiclePlate ?? d.name ?? d.imei.slice(-6)}
              active={imeis.has(d.imei)}
              onPress={() => toggleImei(d.imei)}
            />
          ))}
          {devices.length === 0 ? <Text style={styles.dim}>{t("veh.noneInAccount")}</Text> : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={t("geo.create")} onPress={() => void submit()} loading={submitting} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  mapBox: { height: 300, borderBottomWidth: 1, borderBottomColor: colors.border },
  mapHint: {
    position: "absolute",
    top: space.sm,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  mapHintText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  form: { flex: 1 },
  formContent: { padding: space.md, gap: space.sm, paddingBottom: space.xl },
  label: { color: colors.textDim, fontSize: 13, marginTop: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  dim: { color: colors.textFaint, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
});
