import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { assignToGroup, createGroup, deleteGroup, listDevices, listGroups, removeFromGroup, updateGroup } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { CheckRow, ColorSwatches, ErrorText, FormScreen, Hint, Panel, SecondaryButton } from "@/components/settings/kit";
import { EmptyState, Field, Loading, PrimaryButton } from "@/ui";
import { useI18n } from "@/i18n";
import type { DeviceGroupView, DeviceView } from "@/types";

/** Same palette as the web DeviceGroupModal. */
const GROUP_COLORS = ["#0F6B5C", "#2563EB", "#DC2626", "#F59E0B", "#8B5CF6", "#EC4899", "#0891B2", "#78716C"] as const;

/** Create (no id) or edit (id) one of the user's groups, including who is in it. */
export default function GroupEditScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = !id;

  const [group, setGroup] = useState<DeviceGroupView | null>(null);
  const [devices, setDevices] = useState<DeviceView[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(GROUP_COLORS[0]);
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listDevices(), isNew ? Promise.resolve([] as DeviceGroupView[]) : listGroups()])
      .then(([devs, groups]) => {
        setDevices(devs);
        if (!isNew) {
          const g = groups.find((x) => x.id === id) ?? null;
          setGroup(g);
          if (g) {
            setName(g.name);
            setDescription(g.description ?? "");
            setColor(g.color || GROUP_COLORS[0]);
          }
          setMembers(new Set(devs.filter((d) => d.groupId === id).map((d) => d.imei)));
        }
      })
      .catch((e) => setError(extractError(e).message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  /** Who was in the group when the screen opened. */
  const before = useMemo(() => new Set(devices.filter((d) => !isNew && d.groupId === id).map((d) => d.imei)), [devices, id, isNew]);
  const sorted = useMemo(() => [...devices].sort((a, b) => (a.name ?? a.imei).localeCompare(b.name ?? b.imei)), [devices]);

  if (loading) return <Loading label={t("common.loading")} />;
  if (!isNew && !group) {
    return (
      <FormScreen title={t("grp.edit")}>
        <ErrorText>{error ?? t("grp.none")}</ErrorText>
      </FormScreen>
    );
  }

  const toggle = (imei: string) =>
    setMembers((prev) => {
      const next = new Set(prev);
      if (next.has(imei)) next.delete(imei);
      else next.add(imei);
      return next;
    });

  async function save() {
    if (!name.trim()) return setError(t("grp.nameRequired"));
    setBusy("save");
    setError(null);
    try {
      const body = { name: name.trim(), description: description.trim(), color };
      const saved = isNew ? await createGroup(body) : await updateGroup(id!, body);
      const added = [...members].filter((imei) => !before.has(imei));
      const removed = [...before].filter((imei) => !members.has(imei));
      if (added.length) await assignToGroup(saved.id, added);
      if (removed.length) await removeFromGroup(saved.id, removed);
      router.back();
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setBusy(null);
    }
  }

  function confirmDelete() {
    if (!group) return;
    Alert.alert(`${t("grp.delete")}: ${group.name}?`, t("grp.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          setBusy("delete");
          setError(null);
          try {
            await deleteGroup(group.id);
            router.back();
          } catch (e) {
            setError(extractError(e).message);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <FormScreen title={isNew ? t("grp.new") : t("grp.edit")}>
      <Panel>
        <Field label={t("grp.name")} value={name} onChangeText={setName} placeholder={t("grp.namePh")} maxLength={255} />
        <Field label={t("grp.description")} value={description} onChangeText={setDescription} maxLength={500} />
        <Hint>{t("grp.color")}</Hint>
        <ColorSwatches options={GROUP_COLORS} value={color} onChange={setColor} />
      </Panel>

      <Panel>
        <Hint>{t("grp.members")}</Hint>
        {sorted.length === 0 ? <EmptyState text={t("usr.noPeople")} /> : null}
        {sorted.map((d) => (
          <CheckRow
            key={d.imei}
            label={d.name || d.imei}
            hint={d.vehiclePlate ?? undefined}
            checked={members.has(d.imei)}
            onToggle={() => toggle(d.imei)}
          />
        ))}
      </Panel>

      {error ? <ErrorText>{error}</ErrorText> : null}
      <PrimaryButton label={isNew ? t("grp.new") : t("set.save")} onPress={() => void save()} loading={busy === "save"} disabled={busy !== null} />
      {!isNew ? (
        <SecondaryButton label={t("grp.delete")} icon="trash-outline" danger onPress={confirmDelete} loading={busy === "delete"} disabled={busy !== null} />
      ) : null}
    </FormScreen>
  );
}
