import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { assignToGroup, getDevice, removeFromGroup, updateDevice } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { useGroups } from "@/hooks/useGroups";
import { ColorSwatches, ErrorText, FormScreen, Hint, Panel, kitStyles } from "@/components/settings/kit";
import { Chip, Field, Loading, PrimaryButton } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { DeviceView, PersonType } from "@/types";

const PERSON_TYPES: { id: PersonType; emoji: string }[] = [
  { id: "BOY", emoji: "👦" },
  { id: "GIRL", emoji: "👧" },
  { id: "OLD_MAN", emoji: "👴" },
  { id: "PERSON", emoji: "🧑" },
];

/** Same swatches as the web DeviceEditModal; the first is the default ring colour. */
const COLOR_SWATCHES = ["#0F6B5C", "#DC2626", "#16A34A", "#2B82D4", "#7C3AED", "#0F2742", "#D97706", "#DB2777"] as const;
const HEX = /^#[0-9a-fA-F]{6}$/;

function normalizeType(v: string | null | undefined): PersonType {
  return v === "BOY" || v === "GIRL" || v === "OLD_MAN" ? v : "PERSON";
}

/** Name, picture type, class / ID, tracker SIM, ring colour and group of one person. */
export default function PersonEditScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { imei } = useLocalSearchParams<{ imei: string }>();
  const { groups } = useGroups();

  const [device, setDevice] = useState<DeviceView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [sim, setSim] = useState("");
  const [type, setType] = useState<PersonType>("PERSON");
  const [color, setColor] = useState<string>(COLOR_SWATCHES[0]);
  const [groupId, setGroupId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imei) return;
    getDevice(imei)
      .then((d) => {
        setDevice(d);
        setName(d.name ?? "");
        setPlate(d.vehiclePlate ?? "");
        setSim(d.simMsisdn ?? "");
        setType(normalizeType(d.vehicleType));
        setColor(d.iconColor && HEX.test(d.iconColor) ? d.iconColor : COLOR_SWATCHES[0]);
        setGroupId(d.groupId ?? "");
      })
      .catch((e) => setLoadError(extractError(e).message));
  }, [imei]);

  if (loadError) {
    return (
      <FormScreen title={t("pe.title")}>
        <ErrorText>{loadError}</ErrorText>
      </FormScreen>
    );
  }
  if (!device) return <Loading label={t("common.loading")} />;

  async function save() {
    if (!device) return;
    if (!HEX.test(color)) return setError(t("pe.errColor"));
    setBusy(true);
    setError(null);
    try {
      await updateDevice(device.imei, {
        name: name.trim() || null,
        simMsisdn: sim.trim() || null,
        vehiclePlate: plate.trim() || null,
        vehicleType: type,
        iconColor: color,
      });
      // Group membership lives on the groups API (groups are per user), not on the device.
      const oldGroup = device.groupId ?? "";
      if (groupId !== oldGroup) {
        if (groupId) await assignToGroup(groupId, [device.imei]);
        else if (oldGroup) await removeFromGroup(oldGroup, [device.imei]);
      }
      router.back();
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen title={t("pe.title")}>
      <Panel>
        <Field label={t("pe.name")} value={name} onChangeText={setName} maxLength={255} />
        <Field label={t("pe.class")} value={plate} onChangeText={setPlate} maxLength={50} />
        <Field label={t("pe.sim")} value={sim} onChangeText={setSim} keyboardType="phone-pad" placeholder="+8801XXXXXXXXX" maxLength={20} />
        <Hint>{t("pe.simHint")}</Hint>
      </Panel>

      <Panel>
        <Hint>{t("pe.type")}</Hint>
        <View style={styles.types}>
          {PERSON_TYPES.map((p) => {
            const on = type === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setType(p.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.type, on && styles.typeOn]}
              >
                <View style={[styles.face, { borderColor: color }]}>
                  <Text style={styles.emoji}>{p.emoji}</Text>
                </View>
                <Text style={[styles.typeText, on && { color: colors.brand }]} numberOfLines={1}>
                  {t(`ptype.${p.id}` as StringKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Hint>{t("pe.color")}</Hint>
        <ColorSwatches options={COLOR_SWATCHES} value={color} onChange={setColor} />
        <Field label={t("pe.colorHint")} value={color} onChangeText={(v) => setColor(v.trim())} autoCapitalize="none" autoCorrect={false} maxLength={7} />
      </Panel>

      <Panel>
        <Hint>{t("pe.group")}</Hint>
        <View style={kitStyles.row}>
          <Chip label={t("pe.ungrouped")} active={groupId === ""} onPress={() => setGroupId("")} />
          {groups.map((g) => (
            <Chip key={g.id} label={g.name} active={groupId === g.id} onPress={() => setGroupId(g.id)} />
          ))}
        </View>
        <Pressable onPress={() => router.push("/groups")} accessibilityRole="link" hitSlop={8}>
          <Text style={styles.link}>{t("grp.manage")}</Text>
        </Pressable>
      </Panel>

      <Hint>{t("pe.photoHint")}</Hint>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <PrimaryButton label={t("set.save")} onPress={() => void save()} loading={busy} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  types: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  type: {
    flexGrow: 1,
    flexBasis: 72,
    alignItems: "center",
    gap: space.xs,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  face: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt },
  emoji: { fontSize: 26 },
  typeText: { color: colors.textDim, fontSize: 13, fontWeight: "600" },
  link: { color: colors.brand, fontSize: 15, fontWeight: "700", paddingVertical: space.xs },
});
