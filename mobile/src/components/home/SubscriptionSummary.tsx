import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { listDevices, listMySubscriptions } from "@/api/endpoints";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { DeviceView, SubscriptionView } from "@/types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Health = "ACTIVE" | "SOON" | "EXPIRED";

/** A subscription period is shown against a month; longer plans simply read as full until the last month. */
const PERIOD_DAYS = 30;

function healthOf(s: SubscriptionView): Health {
  if (
    s.isExpired ||
    s.effectiveStatus === "SUSPENDED" ||
    s.effectiveStatus === "CANCELLED"
  )
    return "EXPIRED";
  if (s.effectiveStatus === "GRACE" || s.isExpiringSoon) return "SOON";
  return "ACTIVE";
}

const TONE: Record<Health, string> = {
  ACTIVE: colors.ok,
  SOON: colors.warn,
  EXPIRED: colors.danger,
};

/**
 * Subscription overview at the foot of Home (owner, 2026-11-04): overall health, counts, the next
 * renewal, the monthly total and one row per person, with "View details" opening Settings ->
 * Subscription. Lists only the caller's own children's subscriptions (the server filters them,
 * BillingController). Read-only: there is no in-app payment yet.
 */
export function SubscriptionSummary({ refreshKey }: { refreshKey: number }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [subs, setSubs] = useState<SubscriptionView[] | null>(null);
  const [devices, setDevices] = useState<DeviceView[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([listMySubscriptions(), listDevices()])
      .then(([s, d]) => {
        if (!alive) return;
        setSubs(s);
        setDevices(d);
      })
      .catch(() => {
        // Keep what is shown; the section stays hidden until a first answer.
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const bn = locale === "bn";
  const num = (n: number) => n.toLocaleString(bn ? "bn-BD" : "en-US");
  const fmtDate = (iso: string) =>
    new Date(`${iso.slice(0, 10)}T00:00:00+06:00`).toLocaleDateString(
      bn ? "bn-BD" : "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Dhaka",
      },
    );

  const view = useMemo(() => {
    if (!subs) return null;
    const names = new Map(
      devices.map((d) => [
        d.imei,
        d.name ?? d.vehiclePlate ?? d.imei.slice(-6),
      ]),
    );
    // Only people this user can see; one subscription per person (the latest due date wins).
    const byImei = new Map<string, SubscriptionView>();
    for (const s of subs) {
      if (devices.length > 0 && !names.has(s.deviceImei)) continue;
      const cur = byImei.get(s.deviceImei);
      if (!cur || s.nextDueAt > cur.nextDueAt) byImei.set(s.deviceImei, s);
    }
    const rows = [...byImei.values()]
      .map((s) => ({
        s,
        name: names.get(s.deviceImei) ?? s.deviceImei.slice(-6),
        health: healthOf(s),
      }))
      .sort((a, b) => a.s.daysUntilDue - b.s.daysUntilDue);
    const counts = { ACTIVE: 0, SOON: 0, EXPIRED: 0 } as Record<Health, number>;
    for (const r of rows) counts[r.health] += 1;
    const noPlan = devices.filter((d) => !byImei.has(d.imei)).length;
    const next = rows.find((r) => r.health !== "EXPIRED");
    const monthly = rows
      .filter((r) => r.health !== "EXPIRED")
      .reduce((sum, r) => sum + r.s.monthlyPriceBdt, 0);
    return { rows, counts, noPlan, next, monthly };
  }, [subs, devices]);

  if (!view || (view.rows.length === 0 && view.noPlan === 0)) return null;
  const { rows, counts, noPlan, next, monthly } = view;

  const overall: { tone: string; icon: IconName; text: string } =
    counts.EXPIRED > 0
      ? {
          tone: colors.danger,
          icon: "alert-circle",
          text: t("homes.someExpired").replace("{n}", num(counts.EXPIRED)),
        }
      : counts.SOON > 0
        ? {
            tone: colors.warn,
            icon: "time",
            text: t("homes.someSoon").replace("{n}", num(counts.SOON)),
          }
        : noPlan > 0
          ? {
              tone: colors.warn,
              icon: "help-circle",
              text: t("homes.someNoPlan").replace("{n}", num(noPlan)),
            }
          : {
              tone: colors.ok,
              icon: "checkmark-circle",
              text: t("homes.allGood"),
            };

  const daysText = (d: number) =>
    d < 0
      ? t("homes.overdue").replace("{n}", num(-d))
      : d === 0
        ? t("homes.dueToday")
        : t("homes.inDays").replace("{n}", num(d));

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Ionicons name="card-outline" size={18} color={colors.textDim} />
        <Text style={styles.title}>{t("set.billing")}</Text>
      </View>

      <View style={styles.card}>
        {/* Overall health */}
        <View
          style={[
            styles.banner,
            {
              backgroundColor: `${overall.tone}14`,
              borderColor: `${overall.tone}55`,
            },
          ]}
        >
          <Ionicons name={overall.icon} size={22} color={overall.tone} />
          <Text style={[styles.bannerText, { color: overall.tone }]}>
            {overall.text}
          </Text>
        </View>

        {/* Counts */}
        <View style={styles.counts}>
          <Count
            value={num(counts.ACTIVE)}
            label={t("homes.active")}
            color={colors.ok}
          />
          <Count
            value={num(counts.SOON)}
            label={t("homes.soon")}
            color={colors.warn}
          />
          <Count
            value={num(counts.EXPIRED)}
            label={t("homes.expired")}
            color={colors.danger}
          />
          {noPlan > 0 ? (
            <Count
              value={num(noPlan)}
              label={t("homes.noPlan")}
              color={colors.offline}
            />
          ) : null}
        </View>

        {/* Key figures */}
        <View style={styles.figures}>
          <Figure
            icon="calendar-outline"
            label={t("homes.nextRenewal")}
            value={next ? fmtDate(next.s.nextDueAt) : "—"}
            sub={
              next
                ? `${next.name} · ${daysText(next.s.daysUntilDue)}`
                : undefined
            }
          />
          <View style={styles.vline} />
          <Figure
            icon="wallet-outline"
            label={t("homes.monthly")}
            value={monthly > 0 ? `৳${num(monthly)}` : "—"}
            sub={monthly > 0 ? t("homes.perMonthAll") : undefined}
          />
        </View>

        {/* Per person */}
        {rows.map(({ s, name, health }) => {
          const tone = TONE[health];
          const left = Math.max(0, Math.min(1, s.daysUntilDue / PERIOD_DAYS));
          return (
            <View key={s.id} style={styles.person}>
              <View style={styles.personTop}>
                <Text style={styles.personName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.plan}>
                  {s.planTier === "TRIAL" ? t("bill.trial") : s.planTier}
                </Text>
                <View style={[styles.pill, { borderColor: tone }]}>
                  <Text style={[styles.pillText, { color: tone }]}>
                    {health === "EXPIRED"
                      ? t("homes.expired")
                      : health === "SOON"
                        ? t("homes.soon")
                        : t("homes.active")}
                  </Text>
                </View>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max(left * 100, health === "EXPIRED" ? 0 : 3)}%`,
                      backgroundColor: tone,
                    },
                  ]}
                />
              </View>
              <Text style={styles.personSub}>
                {t("bill.expiresOn")} {fmtDate(s.nextDueAt)} ·{" "}
                {daysText(s.daysUntilDue)}
              </Text>
            </View>
          );
        })}

        {counts.EXPIRED > 0 || counts.SOON > 0 ? (
          <Text style={styles.hint}>{t("homes.renewHint")}</Text>
        ) : null}

        <Pressable
          onPress={() => router.push("/settings/billing")}
          style={({ pressed }) => [
            styles.details,
            pressed && { opacity: 0.75 },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.detailsText}>{t("homes.details")}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.brand} />
        </Pressable>
      </View>
    </View>
  );
}

function Count({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View
      style={styles.count}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.countTop}>
        <View style={[styles.countDot, { backgroundColor: color }]} />
        <Text style={styles.countValue}>{value}</Text>
      </View>
      <Text style={styles.countLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Figure({
  icon,
  label,
  value,
  sub,
}: {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.figure}>
      <View style={styles.figureHead}>
        <Ionicons name={icon} size={16} color={colors.textFaint} />
        <Text style={styles.figureLabel}>{label}</Text>
      </View>
      <Text style={styles.figureValue} numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={styles.figureSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, marginTop: space.sm },
  headRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { color: colors.textDim, fontSize: 15, fontWeight: "800" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.md,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  bannerText: { flex: 1, fontSize: 15, fontWeight: "800" },
  counts: { flexDirection: "row", gap: space.sm },
  count: {
    flex: 1,
    minWidth: 0,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    gap: 2,
  },
  countTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  countDot: { width: 8, height: 8, borderRadius: 4 },
  countValue: { color: colors.text, fontSize: 20, fontWeight: "800" },
  countLabel: { color: colors.textFaint, fontSize: 12, fontWeight: "600" },
  figures: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: space.md,
  },
  vline: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: space.md,
  },
  figure: { flex: 1, minWidth: 0, gap: 2 },
  figureHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  figureLabel: { color: colors.textFaint, fontSize: 12, fontWeight: "700" },
  figureValue: { color: colors.text, fontSize: 17, fontWeight: "800" },
  figureSub: { color: colors.textDim, fontSize: 12 },
  person: { gap: 6 },
  personTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  personName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" },
  plan: { color: colors.textFaint, fontSize: 12, fontWeight: "700" },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  pillText: { fontSize: 12, fontWeight: "700" },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3 },
  personSub: { color: colors.textDim, fontSize: 13 },
  hint: { color: colors.textDim, fontSize: 13 },
  details: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
  },
  detailsText: { color: colors.brand, fontSize: 15, fontWeight: "700" },
});
