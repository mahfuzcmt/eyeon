import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { adminCreateOrg, adminListOrgs, adminSetOrgStatus } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { BottomSheet, OutlineButton, SelectField } from "@/components/BottomSheet";
import { Chip, EmptyState, Field, Loading, PrimaryButton } from "@/ui";
import { useI18n } from "@/i18n";
import { colors, space } from "@/theme";
import type { AdminOrgStatus, OrgAdminView, OrgCreate } from "@/types";
import { adminStyles as s, fmtDay, PlanBadge, planLabel, StatusBadge } from "./shared";

const ORG_STATUSES: AdminOrgStatus[] = ["ACTIVE", "SUSPENDED", "CANCELLED"];
const EMPTY_FORM: OrgCreate = { name: "", slug: "", planTier: "BASIC", contactEmail: "", contactPhone: "", address: "" };

/** Organizations: list, create, change status (web admin "Organizations" tab). */
export default function OrgsTab({ onChanged }: { onChanged: () => void }) {
  const { t, locale } = useI18n();
  const [orgs, setOrgs] = useState<OrgAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrgs(await adminListOrgs());
      setError(null);
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = (org: OrgAdminView, status: AdminOrgStatus) => {
    if (status === org.status) return;
    Alert.alert(
      t("adm.org.statusTitle"),
      `${org.name}: ${t(`adm.status.${status}`)}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("adm.change"),
          style: status === "ACTIVE" ? "default" : "destructive",
          onPress: async () => {
            setBusyId(org.id);
            try {
              const updated = await adminSetOrgStatus(org.id, status);
              setOrgs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
              onChanged();
            } catch (e) {
              Alert.alert(t("common.error"), extractError(e).message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  if (loading && orgs.length === 0) return <Loading label={t("common.loading")} />;

  return (
    <>
      <FlatList
        data={orgs}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: space.md, gap: space.sm }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />}
        ListHeaderComponent={
          <View style={{ gap: space.sm, marginBottom: space.xs }}>
            <PrimaryButton label={t("adm.org.create")} onPress={() => setCreating(true)} />
            {error ? <Text style={s.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={error ? null : <EmptyState text={t("adm.org.none")} />}
        renderItem={({ item: org }) => (
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.grow}>
                <Text style={s.name}>{org.name}</Text>
                <Text style={s.mono}>{org.slug}</Text>
              </View>
              <StatusBadge status={org.status} />
            </View>
            <View style={s.wrap}>
              <PlanBadge plan={org.planTier} />
              <Text style={s.meta}>
                {org.deviceCount} {t("adm.trackers")} · {org.userCount} {t("adm.users")}
              </Text>
            </View>
            <Text style={s.faint}>
              {t("adm.created")} {fmtDay(org.createdAt, locale)}
            </Text>
            <Text style={s.meta}>{t("adm.org.setStatus")}</Text>
            <View style={s.wrap}>
              {ORG_STATUSES.map((st) => (
                <Chip
                  key={st}
                  label={t(`adm.status.${st}`)}
                  active={org.status === st}
                  onPress={() => (busyId ? undefined : changeStatus(org, st))}
                />
              ))}
            </View>
          </View>
        )}
      />
      <CreateOrgSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          void load();
          onChanged();
        }}
      />
    </>
  );
}

function CreateOrgSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState<OrgCreate>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid = form.name.trim().length > 0 && form.slug.trim().length > 0;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await adminCreateOrg({
        name: form.name.trim(),
        slug: form.slug.trim(),
        planTier: form.planTier,
        contactEmail: form.contactEmail?.trim() || undefined,
        contactPhone: form.contactPhone?.trim() || undefined,
        address: form.address?.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      onCreated();
    } catch (e) {
      setErr(extractError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={t("adm.org.new")}
      onClose={onClose}
      dismissable={!busy}
      footer={
        <>
          <PrimaryButton label={t("adm.create")} onPress={submit} loading={busy} disabled={!valid} />
          <OutlineButton label={t("common.cancel")} onPress={onClose} disabled={busy} />
        </>
      }
    >
      <Field label={`${t("adm.org.name")} *`} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
      <Field
        label={`${t("adm.org.slug")} *`}
        value={form.slug}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="org-slug"
        onChangeText={(v) => setForm({ ...form, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
      />
      <SelectField
        label={t("adm.plan")}
        value={form.planTier ?? "BASIC"}
        placeholder={t("adm.plan")}
        options={["BASIC", "PRO", "ENTERPRISE"].map((p) => ({ value: p, label: planLabel(t, p) }))}
        onChange={(v) => setForm({ ...form, planTier: v })}
      />
      <Field
        label={t("adm.org.email")}
        value={form.contactEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(v) => setForm({ ...form, contactEmail: v })}
      />
      <Field
        label={t("adm.org.phone")}
        value={form.contactPhone}
        keyboardType="phone-pad"
        onChangeText={(v) => setForm({ ...form, contactPhone: v })}
      />
      <Field label={t("adm.org.address")} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
      {err ? <Text style={s.error}>{err}</Text> : null}
    </BottomSheet>
  );
}
