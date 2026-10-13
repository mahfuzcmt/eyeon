import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import {
  adminBillingStats,
  adminCreateSubscription,
  adminDevicesWithoutSubscription,
  adminDueSoonSubscriptions,
  adminExpiredSubscriptions,
  adminExtendSubscription,
  adminListOrgs,
  adminSearchSubscriptions,
} from "@/api/endpoints";
import { extractError } from "@/api/client";
import { BottomSheet, OutlineButton, SelectField } from "@/components/BottomSheet";
import { Chip, EmptyState, Field, Loading, PrimaryButton } from "@/ui";
import { useI18n } from "@/i18n";
import { colors, space } from "@/theme";
import type {
  BillingStats,
  DeviceWithoutSub,
  OrgAdminView,
  SubscriptionSearch,
  SubscriptionView,
} from "@/types";
import { adminStyles as s, fmtDay, isIsoDate, PlanBadge, planLabel, StatTile, StatusBadge } from "./shared";

type ListMode = "search" | "expired" | "dueSoon";
const SUB_STATUSES = ["", "ACTIVE", "GRACE", "SUSPENDED", "CANCELLED"] as const;

/** Subscriptions: billing stats, search, expired / due soon, trackers without one, extend, create. */
export default function SubscriptionsTab() {
  const { t, locale } = useI18n();
  const [orgs, setOrgs] = useState<OrgAdminView[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [subs, setSubs] = useState<SubscriptionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ListMode>("search");

  const [imei, setImei] = useState("");
  const [orgId, setOrgId] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState<SubscriptionSearch>({});

  const [noSub, setNoSub] = useState<{ total: number; devices: DeviceWithoutSub[] } | null>(null);
  const [loadingNoSub, setLoadingNoSub] = useState(false);
  const [extending, setExtending] = useState<SubscriptionView | null>(null);
  const [creatingFor, setCreatingFor] = useState<DeviceWithoutSub | null>(null);

  const loadStats = useCallback(() => {
    adminBillingStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows =
        mode === "expired"
          ? await adminExpiredSubscriptions()
          : mode === "dueSoon"
            ? await adminDueSoonSubscriptions(7)
            : await adminSearchSubscriptions(applied);
      setSubs(rows);
      setError(null);
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, [mode, applied]);

  useEffect(() => {
    adminListOrgs()
      .then(setOrgs)
      .catch(() => {});
    loadStats();
    // The web refreshes billing stats every 30 s.
    const id = setInterval(loadStats, 30_000);
    return () => clearInterval(id);
  }, [loadStats]);

  useEffect(() => {
    void load();
  }, [load]);

  const orgName = useCallback((id: string) => orgs.find((o) => o.id === id)?.name ?? t("adm.unknown"), [orgs, t]);

  const orgOptions = useMemo(
    () => [{ value: "", label: t("common.all") }, ...orgs.map((o) => ({ value: o.id, label: o.name }))],
    [orgs, t],
  );

  const search = () => {
    setMode("search");
    setApplied({ imei: imei.trim() || undefined, orgId: orgId || undefined, status: status || undefined, limit: 100 });
  };

  const loadNoSub = async () => {
    setLoadingNoSub(true);
    try {
      setNoSub(await adminDevicesWithoutSubscription(100));
    } catch (e) {
      Alert.alert(t("common.error"), extractError(e).message);
    } finally {
      setLoadingNoSub(false);
    }
  };

  const header = (
    <View style={{ gap: space.md, marginBottom: space.xs }}>
      <View style={s.card}>
        <Text style={s.sectionTitle}>{t("adm.sub.billing")}</Text>
        <View style={s.tiles}>
          <StatTile label={t("adm.sub.total")} value={stats?.total} loading={!stats} />
          <StatTile label={t("adm.status.ACTIVE")} value={stats?.active} loading={!stats} />
          <StatTile label={t("adm.status.GRACE")} value={stats?.grace} loading={!stats} />
          <StatTile label={t("adm.status.SUSPENDED")} value={stats?.suspended} loading={!stats} />
          <StatTile label={t("adm.sub.expiring7")} value={stats?.expiringIn7Days} loading={!stats} />
          <StatTile label={t("adm.sub.expiredUnpaid")} value={stats?.expiredUnpaid} loading={!stats} />
        </View>
      </View>

      <View style={s.card}>
        <Field
          label={t("adm.sub.searchImei")}
          value={imei}
          onChangeText={setImei}
          placeholder={t("adm.sub.imeiPrefix")}
          keyboardType="number-pad"
          autoCorrect={false}
        />
        <SelectField label={t("adm.org")} value={orgId} options={orgOptions} placeholder={t("common.all")} onChange={setOrgId} />
        <Text style={s.meta}>{t("adm.sub.status")}</Text>
        <View style={s.wrap}>
          {SUB_STATUSES.map((st) => (
            <Chip
              key={st || "all"}
              label={st ? t(`adm.status.${st}`) : t("common.all")}
              active={status === st}
              onPress={() => setStatus(st)}
            />
          ))}
        </View>
        <PrimaryButton label={t("adm.sub.search")} onPress={search} />
        <View style={s.wrap}>
          <View style={{ flexGrow: 1 }}>
            <OutlineButton label={t("adm.sub.showExpired")} onPress={() => setMode("expired")} />
          </View>
          <View style={{ flexGrow: 1 }}>
            <OutlineButton label={t("adm.sub.dueSoon")} onPress={() => setMode("dueSoon")} />
          </View>
        </View>
        <OutlineButton
          danger
          label={loadingNoSub ? t("common.loading") : t("adm.sub.withoutSub")}
          onPress={loadNoSub}
          disabled={loadingNoSub}
        />
      </View>

      {noSub ? (
        <View style={[s.card, { borderColor: colors.danger }]}>
          <View style={s.row}>
            <Text style={[s.sectionTitle, s.grow]}>
              {t("adm.sub.withoutSub")} ({noSub.total})
            </Text>
            <Text style={[s.meta, { color: colors.brand, fontWeight: "700" }]} onPress={() => setNoSub(null)} accessibilityRole="button">
              {t("adm.hide")}
            </Text>
          </View>
          {noSub.devices.length === 0 ? (
            <Text style={s.meta}>{t("adm.sub.allHave")}</Text>
          ) : (
            noSub.devices.map((d) => (
              <View key={d.imei} style={[s.row, { alignItems: "center", flexWrap: "wrap", paddingVertical: space.xs }]}>
                <View style={[s.grow, { minWidth: 160 }]}>
                  <Text style={s.name} numberOfLines={1}>
                    {d.deviceName || "—"}
                  </Text>
                  <Text style={s.mono}>{d.imei}</Text>
                  <Text style={s.faint}>{d.orgName}</Text>
                </View>
                <OutlineButton label={t("adm.sub.create")} onPress={() => setCreatingFor(d)} />
              </View>
            ))
          )}
        </View>
      ) : null}

      <Text style={s.sectionTitle}>
        {mode === "expired" ? t("adm.sub.showExpired") : mode === "dueSoon" ? t("adm.sub.dueSoon") : t("adm.tab.subs")}
      </Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );

  return (
    <>
      <FlatList
        data={subs}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: space.md, gap: space.sm }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              loadStats();
              void load();
            }}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={loading ? <Loading /> : error ? null : <EmptyState text={t("adm.sub.none")} />}
        renderItem={({ item: sub }) => (
          <View style={[s.card, sub.isExpired && { borderColor: colors.danger }]}>
            <View style={s.row}>
              <View style={s.grow}>
                <Text style={s.mono}>{sub.deviceImei}</Text>
                <Text style={s.meta}>{orgName(sub.orgId)}</Text>
              </View>
              <StatusBadge status={sub.effectiveStatus} />
            </View>
            <View style={s.wrap}>
              <PlanBadge plan={sub.planTier} />
              <Text style={s.meta}>
                {t("adm.sub.expires")} {fmtDay(sub.nextDueAt, locale)}
              </Text>
              <Text
                style={[
                  s.meta,
                  { fontWeight: "700" },
                  sub.isExpired ? { color: colors.danger } : sub.daysUntilDue <= 7 ? { color: colors.warn } : null,
                ]}
              >
                {sub.isExpired ? t("adm.sub.expired") : `${sub.daysUntilDue} ${t("adm.sub.daysLeft")}`}
              </Text>
            </View>
            <OutlineButton icon="calendar-outline" label={t("adm.sub.extend")} onPress={() => setExtending(sub)} />
          </View>
        )}
      />
      {extending ? (
        <ExtendSheet
          sub={extending}
          onClose={() => setExtending(null)}
          onDone={() => {
            setExtending(null);
            loadStats();
            void load();
          }}
        />
      ) : null}
      {creatingFor ? (
        <CreateSubSheet
          device={creatingFor}
          onClose={() => setCreatingFor(null)}
          onDone={async () => {
            setCreatingFor(null);
            loadStats();
            void load();
            try {
              setNoSub(await adminDevicesWithoutSubscription(100));
            } catch {
              // list stays as it was
            }
          }}
        />
      ) : null}
    </>
  );
}

function ExtendSheet({ sub, onClose, onDone }: { sub: SubscriptionView; onClose: () => void; onDone: () => void }) {
  const { t, locale } = useI18n();
  const [days, setDays] = useState("30");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const daysNum = Number.parseInt(days, 10);
  const dateOk = date === "" || isIsoDate(date);
  const valid = date ? isIsoDate(date) : Number.isFinite(daysNum) && daysNum > 0;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await adminExtendSubscription(sub.id, date ? { newDueAt: date } : { additionalDays: daysNum });
      onDone();
    } catch (e) {
      setErr(extractError(e).message);
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible
      title={t("adm.sub.extendTitle")}
      subtitle={`${sub.deviceImei} · ${t("adm.sub.currentExpiry")} ${fmtDay(sub.nextDueAt, locale)}`}
      onClose={onClose}
      dismissable={!busy}
      footer={
        <>
          <PrimaryButton label={t("adm.sub.extend")} onPress={submit} loading={busy} disabled={!valid} />
          <OutlineButton label={t("common.cancel")} onPress={onClose} disabled={busy} />
        </>
      }
    >
      <Field
        label={t("adm.sub.addDays")}
        value={days}
        keyboardType="number-pad"
        onChangeText={(v) => {
          setDays(v.replace(/[^0-9]/g, ""));
          setDate("");
        }}
      />
      <Text style={[s.faint, { textAlign: "center" }]}>{t("adm.sub.or")}</Text>
      <Field
        label={t("adm.sub.setDate")}
        value={date}
        placeholder="2026-12-31"
        keyboardType="numbers-and-punctuation"
        autoCorrect={false}
        maxLength={10}
        onChangeText={(v) => {
          setDate(v.trim());
          setDays("");
        }}
      />
      {!dateOk ? <Text style={s.error}>{t("adm.sub.dateFormat")}</Text> : null}
      {err ? <Text style={s.error}>{err}</Text> : null}
    </BottomSheet>
  );
}

function CreateSubSheet({ device, onClose, onDone }: { device: DeviceWithoutSub; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const [plan, setPlan] = useState("BASIC");
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const daysNum = Number.parseInt(days, 10);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await adminCreateSubscription({ imei: device.imei, orgId: device.orgId, planTier: plan, days: daysNum });
      onDone();
    } catch (e) {
      setErr(extractError(e).message);
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible
      title={t("adm.sub.createTitle")}
      subtitle={`${device.deviceName ? `${device.deviceName} · ` : ""}${device.imei} · ${device.orgName}`}
      onClose={onClose}
      dismissable={!busy}
      footer={
        <>
          <PrimaryButton
            label={t("adm.sub.create")}
            onPress={submit}
            loading={busy}
            disabled={!Number.isFinite(daysNum) || daysNum <= 0}
          />
          <OutlineButton label={t("common.cancel")} onPress={onClose} disabled={busy} />
        </>
      }
    >
      <Text style={s.meta}>{t("adm.plan")}</Text>
      <View style={s.wrap}>
        {["TRIAL", "BASIC", "PRO", "ENTERPRISE"].map((p) => (
          <Chip key={p} label={planLabel(t, p)} active={plan === p} onPress={() => setPlan(p)} />
        ))}
      </View>
      <Field
        label={t("adm.sub.duration")}
        value={days}
        keyboardType="number-pad"
        onChangeText={(v) => setDays(v.replace(/[^0-9]/g, ""))}
      />
      {err ? <Text style={s.error}>{err}</Text> : null}
    </BottomSheet>
  );
}
