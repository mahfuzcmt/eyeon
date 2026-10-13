import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { listMySubscriptions } from "@/api/endpoints";
import { ErrorText, FormScreen, Hint, Panel, SecondaryButton } from "@/components/settings/kit";
import { useDevices } from "@/hooks/useDevices";
import { useI18n, type StringKey } from "@/i18n";
import { colors, space } from "@/theme";
import type { SubscriptionView } from "@/types";

/** Settings → Subscription: the mobile counterpart of the web Billing tab (read-only). */
export default function BillingScreen() {
  const { t, locale } = useI18n();
  const { devices } = useDevices();
  const [subs, setSubs] = useState<SubscriptionView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSubs(await listMySubscriptions());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const names = useMemo(() => new Map(devices.map((d) => [d.imei, d.name])), [devices]);
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <FormScreen title={t("set.billing")}>
      {error ? (
        <Panel>
          <ErrorText>{error}</ErrorText>
          <SecondaryButton label={t("common.retry")} onPress={() => void load()} />
        </Panel>
      ) : subs == null ? (
        <ActivityIndicator color={colors.brand} />
      ) : subs.length === 0 ? (
        <Hint>{t("bill.none")}</Hint>
      ) : (
        subs.map((s) => {
          const bad = s.effectiveStatus === "SUSPENDED" || s.effectiveStatus === "CANCELLED" || s.isExpired;
          const warn = !bad && (s.effectiveStatus === "GRACE" || s.isExpiringSoon);
          const tone = bad ? colors.danger : warn ? colors.warn : colors.ok;
          const statusKey = `bill.status.${s.effectiveStatus}`;
          return (
            <Panel key={s.id} style={bad ? styles.bad : warn ? styles.warn : undefined}>
              <View style={styles.head}>
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>{names.get(s.deviceImei) ?? s.deviceImei}</Text>
                  <Text style={styles.imei} selectable>{s.deviceImei}</Text>
                </View>
                <Text style={[styles.pill, { color: tone, borderColor: tone }]}>
                  {statusKey in STATUS ? t(statusKey as StringKey) : s.effectiveStatus}
                </Text>
              </View>
              <Row label={t("bill.plan")} value={s.planTier === "TRIAL" ? t("bill.trial") : s.planTier} />
              <Row label={t("bill.expiresOn")} value={fmtDate(s.nextDueAt)} />
              {s.daysUntilDue >= 0 && !s.isExpired ? (
                <Row label={t("bill.daysLeft")} value={String(s.daysUntilDue)} tone={s.daysUntilDue <= 7 ? colors.warn : undefined} />
              ) : null}
              <Row label={t("bill.startedOn")} value={fmtDate(s.startedAt)} />
              {s.monthlyPriceBdt > 0 ? <Row label="" value={`৳${s.monthlyPriceBdt}${t("bill.perMonth")}`} /> : null}
              {bad ? <Text style={[styles.note, { color: colors.danger }]}>{t("bill.expired")}</Text> : null}
              {warn ? <Text style={[styles.note, { color: colors.warn }]}>{t("bill.expiringSoon")}</Text> : null}
            </Panel>
          );
        })
      )}
    </FormScreen>
  );
}

const STATUS = { "bill.status.ACTIVE": 1, "bill.status.GRACE": 1, "bill.status.SUSPENDED": 1, "bill.status.CANCELLED": 1 };

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  imei: { color: colors.textFaint, fontSize: 13, fontFamily: "monospace" },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, fontSize: 13, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  label: { color: colors.textDim, fontSize: 15 },
  value: { color: colors.text, fontSize: 15, fontWeight: "600" },
  note: { fontSize: 14, fontWeight: "600" },
  bad: { borderColor: colors.danger },
  warn: { borderColor: colors.warn },
});
