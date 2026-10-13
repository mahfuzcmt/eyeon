import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getUserDeviceImeis, listDevices, listOrgUsers, setUserDeviceImeis, setUserSeeAllDevices } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { CheckRow, ErrorText, FormScreen, Hint, Panel, SecondaryButton, fill, kitStyles } from "@/components/settings/kit";
import { EmptyState, Loading, PrimaryButton } from "@/ui";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { DeviceView, UserDetail } from "@/types";

/** Which people (trackers) a parent / carer may see, or "see everyone". */
export default function UserPeopleScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [devices, setDevices] = useState<DeviceView[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [seeAll, setSeeAll] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([listOrgUsers(), listDevices(), getUserDeviceImeis(id)])
      .then(([users, devs, imeis]) => {
        const u = users.find((x) => x.id === id) ?? null;
        setUser(u);
        setSeeAll(u?.seeAllDevices ?? false);
        setDevices(devs);
        setChosen(new Set(imeis));
      })
      .catch((e) => setError(extractError(e).message))
      .finally(() => setLoading(false));
  }, [id]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const sorted = [...devices].sort((a, b) => (a.name ?? a.imei).localeCompare(b.name ?? b.imei));
    if (!needle) return sorted;
    return sorted.filter((d) => `${d.name ?? ""} ${d.vehiclePlate ?? ""} ${d.imei}`.toLowerCase().includes(needle));
  }, [devices, q]);

  if (loading) return <Loading label={t("common.loading")} />;
  if (!user) {
    return (
      <FormScreen title={t("usr.managePeople")}>
        <ErrorText>{error ?? t("usr.none")}</ErrorText>
      </FormScreen>
    );
  }

  const toggle = (imei: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(imei)) next.delete(imei);
      else next.add(imei);
      return next;
    });

  async function save() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      if (seeAll !== user.seeAllDevices) await setUserSeeAllDevices(user.id, seeAll);
      await setUserDeviceImeis(user.id, [...chosen]);
      router.back();
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen title={t("usr.managePeople")}>
      <Text style={styles.who}>{user.fullName ? `${user.fullName} · ${user.email}` : user.email}</Text>

      <Panel>
        <CheckRow label={t("usr.seeAll")} hint={t("usr.seeAllHint")} checked={seeAll} onToggle={() => setSeeAll((v) => !v)} />
      </Panel>

      {!seeAll ? (
        <Panel>
          <Hint>{t("usr.choosePeople")}</Hint>
          {devices.length === 0 ? (
            <EmptyState text={t("usr.noPeople")} />
          ) : (
            <>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={t("usr.searchPeople")}
                placeholderTextColor={colors.textFaint}
                style={styles.search}
                autoCorrect={false}
              />
              <View style={kitStyles.row}>
                <SecondaryButton label={t("usr.selectAll")} onPress={() => setChosen(new Set(devices.map((d) => d.imei)))} />
                <SecondaryButton label={t("usr.selectNone")} onPress={() => setChosen(new Set())} />
              </View>
              <Text style={styles.count}>{fill(t("usr.chosen"), { n: chosen.size, total: devices.length })}</Text>
              <View>
                {visible.map((d) => (
                  <CheckRow
                    key={d.imei}
                    label={d.name || d.imei}
                    hint={[d.vehiclePlate, d.imei].filter(Boolean).join(" · ")}
                    checked={chosen.has(d.imei)}
                    onToggle={() => toggle(d.imei)}
                  />
                ))}
              </View>
            </>
          )}
        </Panel>
      ) : null}

      {error ? <ErrorText>{error}</ErrorText> : null}
      <PrimaryButton label={t("set.save")} onPress={() => void save()} loading={busy} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  who: { color: colors.textDim, fontSize: 15, fontWeight: "600" },
  search: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    minHeight: 48,
    color: colors.text,
    fontSize: 16,
  },
  count: { color: colors.textFaint, fontSize: 13 },
});
