import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { adminDeleteDevice, adminListDevices, adminListOrgs, adminReassignDevice } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { BottomSheet, OutlineButton, SelectField } from "@/components/BottomSheet";
import { EmptyState, Loading, PrimaryButton } from "@/ui";
import { useI18n } from "@/i18n";
import { colors, radius, space, touch } from "@/theme";
import type { DeviceAdminView, OrgAdminView } from "@/types";
import { adminStyles as s, fmtStamp, StatusBadge } from "./shared";

function labelOf(d: DeviceAdminView): string {
  return d.name || d.vehiclePlate || d.imei;
}

/** Trackers of every organization: filter by organization, move to another one, delete for good. */
export default function DevicesTab({ onChanged }: { onChanged: () => void }) {
  const { t, locale } = useI18n();
  const [orgs, setOrgs] = useState<OrgAdminView[]>([]);
  const [orgFilter, setOrgFilter] = useState("");
  const [devices, setDevices] = useState<DeviceAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<DeviceAdminView | null>(null);
  const [deleting, setDeleting] = useState<DeviceAdminView | null>(null);

  useEffect(() => {
    adminListOrgs()
      .then(setOrgs)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDevices(await adminListDevices(orgFilter || undefined));
      setError(null);
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, [orgFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const orgOptions = useMemo(
    () => [{ value: "", label: t("adm.allOrgs") }, ...orgs.map((o) => ({ value: o.id, label: o.name }))],
    [orgs, t],
  );

  if (loading && devices.length === 0 && !error) return <Loading label={t("common.loading")} />;

  return (
    <>
      <FlatList
        data={devices}
        keyExtractor={(d) => d.imei}
        contentContainerStyle={{ padding: space.md, gap: space.sm }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />}
        ListHeaderComponent={
          <View style={{ gap: space.sm, marginBottom: space.xs }}>
            <SelectField
              label={t("adm.filterOrg")}
              value={orgFilter}
              options={orgOptions}
              placeholder={t("adm.allOrgs")}
              onChange={setOrgFilter}
            />
            {error ? <Text style={s.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={error ? null : <EmptyState text={t("adm.dev.none")} />}
        renderItem={({ item: d }) => (
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.grow}>
                <Text style={s.name} numberOfLines={1}>
                  {d.name || d.vehiclePlate || "—"}
                </Text>
                <Text style={s.mono}>{d.imei}</Text>
              </View>
              <StatusBadge status={d.status} />
            </View>
            <Text style={s.meta}>
              {d.orgName} · {t("adm.lastSeen")} {d.lastSeenAt ? fmtStamp(d.lastSeenAt, locale) : t("adm.never")}
            </Text>
            <View style={s.wrap}>
              <View style={{ flexGrow: 1 }}>
                <OutlineButton icon="swap-horizontal" label={t("adm.dev.move")} onPress={() => setMoving(d)} />
              </View>
              <View style={{ flexGrow: 1 }}>
                <OutlineButton icon="trash-outline" danger label={t("common.delete")} onPress={() => setDeleting(d)} />
              </View>
            </View>
          </View>
        )}
      />
      {moving ? (
        <MoveSheet
          device={moving}
          orgs={orgs}
          onClose={() => setMoving(null)}
          onDone={() => {
            setMoving(null);
            void load();
            onChanged();
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteSheet
          device={deleting}
          onClose={() => setDeleting(null)}
          onDone={() => {
            setDevices((prev) => prev.filter((x) => x.imei !== deleting.imei));
            setDeleting(null);
            void load();
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}

function MoveSheet({
  device,
  orgs,
  onClose,
  onDone,
}: {
  device: DeviceAdminView;
  orgs: OrgAdminView[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const targetName = orgs.find((o) => o.id === target)?.name ?? "";

  const submit = () => {
    Alert.alert(t("adm.dev.move"), `${labelOf(device)} → ${targetName}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("adm.dev.move"),
        onPress: async () => {
          setBusy(true);
          setErr(null);
          try {
            await adminReassignDevice(device.imei, target);
            onDone();
          } catch (e) {
            setErr(extractError(e).message);
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <BottomSheet
      visible
      title={`${t("adm.dev.move")}: ${labelOf(device)}`}
      subtitle={`${t("adm.dev.currentOrg")}: ${device.orgName}`}
      onClose={onClose}
      dismissable={!busy}
      footer={
        <>
          <PrimaryButton label={t("adm.dev.move")} onPress={submit} loading={busy} disabled={!target} />
          <OutlineButton label={t("common.cancel")} onPress={onClose} disabled={busy} />
        </>
      }
    >
      <SelectField
        label={t("adm.dev.targetOrg")}
        value={target}
        placeholder={t("adm.dev.pickOrg")}
        options={orgs.filter((o) => o.id !== device.orgId).map((o) => ({ value: o.id, label: o.name }))}
        onChange={setTarget}
      />
      {err ? <Text style={s.error}>{err}</Text> : null}
    </BottomSheet>
  );
}

/** The super admin must type the last 4 digits of the IMEI before the tracker is deleted for good. */
function DeleteSheet({ device, onClose, onDone }: { device: DeviceAdminView; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tail = device.imei.slice(-4);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await adminDeleteDevice(device.imei);
      onDone();
    } catch (e) {
      setErr(extractError(e).message);
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible
      title={`${t("adm.dev.deleteTitle")} ${labelOf(device)}?`}
      onClose={onClose}
      dismissable={!busy}
      footer={
        <>
          <DangerButton label={busy ? t("adm.dev.deleting") : t("adm.dev.deleteForGood")} disabled={busy || typed !== tail} onPress={submit} />
          <OutlineButton label={t("common.cancel")} onPress={onClose} disabled={busy} />
        </>
      }
    >
      <Text style={s.meta}>
        {t("adm.dev.deleteBody1")} <Text style={s.mono}>{device.imei}</Text> ({device.orgName}) {t("adm.dev.deleteBody2")}
      </Text>
      <Text style={s.faint}>{t("adm.dev.deleteReconnect")}</Text>
      <View style={{ gap: space.xs }}>
        <Text style={s.meta}>
          {t("adm.dev.typeLast4")} <Text style={[s.mono, { fontWeight: "700" }]}>{tail}</Text>
        </Text>
        <TextInput
          value={typed}
          onChangeText={(v) => setTyped(v.trim())}
          keyboardType="number-pad"
          autoComplete="off"
          autoCorrect={false}
          maxLength={4}
          accessibilityLabel={t("adm.dev.typeLast4")}
          style={{
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: typed === tail ? colors.danger : colors.border,
            borderRadius: radius.sm,
            paddingHorizontal: space.md,
            minHeight: touch.min,
            color: colors.text,
            fontSize: 18,
            fontFamily: "monospace",
            letterSpacing: 4,
          }}
        />
      </View>
      {err ? <Text style={s.error}>{err}</Text> : null}
    </BottomSheet>
  );
}

function DangerButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        backgroundColor: colors.danger,
        minHeight: touch.button,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: space.lg,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: colors.onBrand, fontSize: 17, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
