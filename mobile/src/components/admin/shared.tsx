import { StyleSheet, Text, View } from "react-native";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";

/** Small number tile for the admin stat rows; wraps two-up on a phone, more on a tablet. */
export function StatTile({ label, value, sub, loading }: { label: string; value: number | undefined; sub?: string; loading?: boolean }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.tileValue}>{loading || value == null ? "…" : value}</Text>
      {sub ? (
        <Text style={styles.tileSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: colors.ok,
  ONLINE: colors.ok,
  GRACE: colors.warn,
  SUSPENDED: colors.danger,
  CANCELLED: colors.offline,
  OFFLINE: colors.offline,
  NEVER_CONNECTED: colors.offline,
};

const STATUS_KEY: Record<string, StringKey> = {
  ACTIVE: "adm.status.ACTIVE",
  GRACE: "adm.status.GRACE",
  SUSPENDED: "adm.status.SUSPENDED",
  CANCELLED: "adm.status.CANCELLED",
  ONLINE: "adm.status.ONLINE",
  OFFLINE: "adm.status.OFFLINE",
  NEVER_CONNECTED: "adm.status.NEVER_CONNECTED",
};

/** Coloured status badge for organizations, trackers and subscriptions. */
export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const color = STATUS_COLOR[status] ?? colors.textFaint;
  const key = STATUS_KEY[status];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{key ? t(key) : status}</Text>
    </View>
  );
}

const PLAN_KEY: Record<string, StringKey> = {
  TRIAL: "adm.plan.TRIAL",
  BASIC: "adm.plan.BASIC",
  PRO: "adm.plan.PRO",
  ENTERPRISE: "adm.plan.ENTERPRISE",
};

export function PlanBadge({ plan }: { plan: string }) {
  const { t } = useI18n();
  const key = PLAN_KEY[plan];
  return (
    <View style={styles.plan}>
      <Text style={styles.planText}>{key ? t(key) : plan}</Text>
    </View>
  );
}

export function planLabel(t: (k: StringKey) => string, plan: string): string {
  const key = PLAN_KEY[plan];
  return key ? t(key) : plan;
}

export { dhakaDate, fmtDay, fmtStamp, isIsoDate } from "@/localDate";

export const adminStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, alignItems: "center" },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  mono: { color: colors.textDim, fontSize: 13, fontFamily: "monospace" },
  meta: { color: colors.textDim, fontSize: 14 },
  faint: { color: colors.textFaint, fontSize: 13 },
  error: { color: colors.danger, fontSize: 14 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  grow: { flex: 1, minWidth: 0 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: 96,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  tileLabel: { color: colors.textDim, fontSize: 13, fontWeight: "600" },
  tileValue: { color: colors.text, fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  tileSub: { color: colors.textFaint, fontSize: 12 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  plan: { backgroundColor: colors.brandSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  planText: { color: colors.brandDim, fontSize: 12, fontWeight: "700" },
});
