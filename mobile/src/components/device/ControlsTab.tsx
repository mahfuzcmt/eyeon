import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDeviceLive } from "@/hooks/useDeviceLive";
import { cutFuel, restoreFuel, queryAddress, rebootDevice } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { Loading, Metric, Section } from "@/ui";
import { fmtAgo, fmtVoltage, motionColor, motionOf, subscriptionDaysLeft, subscriptionExpired } from "@/format";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";

export default function ControlsTab({ imei, orgId }: { imei: string; orgId: string | null }) {
  const { t } = useI18n();
  const { device, loc, loading, reloadDevice } = useDeviceLive(imei, orgId);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await reloadDevice();
    setRefreshing(false);
  }

  async function runCommand(kind: "cut" | "restore" | "query" | "reboot") {
    setBusy(kind);
    setLastReply(null);
    try {
      let res;
      switch (kind) {
        case "cut":
          res = await cutFuel(imei);
          break;
        case "restore":
          res = await restoreFuel(imei);
          break;
        case "query":
          res = await queryAddress(imei);
          break;
        case "reboot":
          res = await rebootDevice(imei);
          break;
      }
      if (res.ok) {
        setLastReply(res.reply ?? t("ctrl.cmdSent"));
        await reloadDevice();
      } else {
        Alert.alert(t("ctrl.cmdFailed"), res.error ?? t("common.error"));
      }
    } catch (e) {
      Alert.alert(t("common.error"), extractError(e).message);
    } finally {
      setBusy(null);
    }
  }

  function confirmDangerous(kind: "cut" | "reboot") {
    const isCut = kind === "cut";
    Alert.alert(
      isCut ? t("ctrl.confirmCutTitle") : t("ctrl.confirmRebootTitle"),
      isCut ? t("ctrl.confirmCutMsg") : t("ctrl.confirmRebootMsg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: isCut ? t("ctrl.cutEngine") : t("ctrl.reboot"),
          style: "destructive",
          onPress: () => runCommand(kind),
        },
      ],
    );
  }

  if (loading && !device) return <Loading label={t("ctrl.loadingDevice")} />;

  const motion = device ? motionOf(device, loc) : "OFFLINE";
  const mColor = motionColor(motion);
  const expired = device ? subscriptionExpired(device) : false;
  const daysLeft = device ? subscriptionDaysLeft(device) : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} />}
    >
      {/* Connection Status */}
      <Section title={t("ctrl.connectionStatus")}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: mColor }]} />
          <Text style={[styles.statusText, { color: mColor }]}>
            {device?.status === "ONLINE" ? t("ctrl.connected") : device?.status === "NEVER_CONNECTED" ? t("ctrl.neverConnected") : t("ctrl.disconnected")}
          </Text>
        </View>
        <Metric label={t("veh.lastSeen")} value={fmtAgo(device?.lastSeenAt)} width="50%" />
        <Metric label={t("ctrl.motion")} value={t(`state.${motion.toLowerCase()}` as any)} width="50%" />
      </Section>

      {/* Device Info */}
      <Section title={t("ctrl.deviceInfo")}>
        <Metric label="IMEI" value={device?.imei ?? "—"} width="100%" />
        <Metric label={t("ctrl.model")} value={device?.model ?? "—"} width="50%" />
        <Metric label={t("ctrl.protocol")} value={`${device?.protocol ?? "—"}${device?.protocolVariant ? ` ${device.protocolVariant}` : ""}`} width="50%" />
        <Metric label={t("ctrl.sim")} value={device?.simMsisdn ?? "—"} width="50%" />
        <Metric label={t("ctrl.plate")} value={device?.vehiclePlate ?? "—"} width="50%" />
        <Metric label={t("ctrl.type")} value={device?.vehicleType ?? "—"} width="50%" />
        <Metric label={t("track.voltage")} value={fmtVoltage(loc?.voltageMv ?? device?.lastVoltageMv)} width="50%" />
      </Section>

      {/* Engine Control */}
      <Section title={t("ctrl.engineControl")}>
        <View style={styles.lockRow}>
          <Text style={styles.lockLabel}>{t("ctrl.engineState")}</Text>
          <View style={styles.lockBadge}>
            <Text style={[styles.lockValue, { color: device?.engineLocked ? colors.danger : colors.ok }]}>
              {device?.engineLocked ? `🔒 ${t("track.locked")}` : `✓ ${t("track.unlocked")}`}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <CommandBtn
            label={t("ctrl.cutEngine")}
            tone="danger"
            icon="⛔"
            disabled={busy !== null}
            loading={busy === "cut"}
            onPress={() => confirmDangerous("cut")}
          />
          <CommandBtn
            label={t("ctrl.restoreEngine")}
            tone="ok"
            icon="✓"
            disabled={busy !== null}
            loading={busy === "restore"}
            onPress={() => runCommand("restore")}
          />
        </View>
        <Text style={styles.note}>{t("ctrl.engineNote")}</Text>
      </Section>

      {/* Device Commands */}
      <Section title={t("ctrl.commands")}>
        <View style={styles.cmdGrid}>
          <CommandBtn
            label={t("ctrl.queryLocation")}
            tone="neutral"
            icon="📍"
            disabled={busy !== null}
            loading={busy === "query"}
            onPress={() => runCommand("query")}
            fullWidth
          />
          <CommandBtn
            label={t("ctrl.rebootDevice")}
            tone="warn"
            icon="🔄"
            disabled={busy !== null}
            loading={busy === "reboot"}
            onPress={() => confirmDangerous("reboot")}
            fullWidth
          />
        </View>
      </Section>

      {/* Command Response */}
      {lastReply && (
        <View style={styles.replyBox}>
          <Text style={styles.replyTitle}>{t("ctrl.deviceReply")}</Text>
          <Text style={styles.replyText}>{lastReply}</Text>
        </View>
      )}

      {/* Subscription Status */}
      <Section title={t("sub.title")}>
        <View style={styles.subRow}>
          <View style={[styles.subBadge, { borderColor: expired ? colors.danger : daysLeft != null && daysLeft <= 7 ? colors.warn : colors.ok }]}>
            <Text style={[styles.subStatus, { color: expired ? colors.danger : daysLeft != null && daysLeft <= 7 ? colors.warn : colors.ok }]}>
              {device?.subscriptionStatus ?? "—"}
            </Text>
          </View>
          {device?.subscriptionExpiresAt && (
            <Text style={styles.subExpiry}>
              {t("sub.expiresOn")}: {device.subscriptionExpiresAt}
              {daysLeft != null ? ` (${daysLeft}d)` : ""}
            </Text>
          )}
        </View>
        {expired && <Text style={styles.expiredNote}>{t("sub.renewNote")}</Text>}
      </Section>

      {/* Technical Info */}
      <Section title={t("ctrl.telemetry")}>
        <Metric label={t("track.gpsSats")} value={loc?.satellites != null ? String(loc.satellites) : "—"} width="33%" />
        <Metric label="GSM" value={device?.lastGsmSignal != null ? String(device.lastGsmSignal) : "—"} width="33%" />
        <Metric label={t("track.fix")} value={loc ? (loc.valid ? t("track.fixValid") : t("track.fixInvalid")) : "—"} width="33%" />
        <Metric label={t("track.ignition")} value={loc?.accOn == null ? "—" : loc.accOn ? t("common.on") : t("common.off")} width="33%" />
        <Metric label={t("track.course")} value={loc ? `${loc.course}°` : "—"} width="33%" />
        <Metric label={t("stats.odometer")} value={loc?.mileageMeters != null ? `${Math.round(loc.mileageMeters / 1000)} km` : "—"} width="33%" />
      </Section>

      <Text style={styles.disclaimer}>{t("ctrl.disclaimer")}</Text>
    </ScrollView>
  );
}

function CommandBtn({
  label,
  tone,
  icon,
  disabled,
  loading,
  onPress,
  fullWidth,
}: {
  label: string;
  tone: "danger" | "ok" | "warn" | "neutral";
  icon: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  fullWidth?: boolean;
}) {
  const toneColors = {
    danger: colors.danger,
    ok: colors.ok,
    warn: colors.warn,
    neutral: colors.textDim,
  };
  const color = toneColors[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.cmdBtn,
        fullWidth && styles.cmdBtnFull,
        { borderColor: color },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <Text style={[styles.cmdIcon, { color }]}>⏳</Text>
      ) : (
        <Text style={styles.cmdIcon}>{icon}</Text>
      )}
      <Text style={[styles.cmdText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl },

  statusRow: { flexDirection: "row", alignItems: "center", gap: space.sm, width: "100%", paddingVertical: space.sm },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { color: colors.text, fontSize: 15, fontWeight: "600" },

  lockRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", paddingVertical: space.sm },
  lockLabel: { color: colors.textDim, fontSize: 13 },
  lockBadge: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  lockValue: { fontSize: 14, fontWeight: "700" },

  actions: { flexDirection: "row", gap: space.md, paddingTop: space.sm, width: "100%" },
  cmdBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  cmdBtnFull: { flex: 0, width: "100%", marginTop: space.sm },
  cmdIcon: { fontSize: 16 },
  cmdText: { fontWeight: "700", fontSize: 14 },
  cmdGrid: { width: "100%" },

  note: { color: colors.textFaint, fontSize: 11, marginTop: space.sm, width: "100%" },

  replyBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  replyTitle: { color: colors.textDim, fontSize: 12, fontWeight: "600", marginBottom: space.xs },
  replyText: { color: colors.text, fontSize: 13, fontFamily: "monospace" },

  subRow: { flexDirection: "row", alignItems: "center", gap: space.md, width: "100%", paddingVertical: space.sm },
  subBadge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: space.xs },
  subStatus: { fontSize: 12, fontWeight: "700" },
  subExpiry: { color: colors.textDim, fontSize: 12 },
  expiredNote: { color: colors.danger, fontSize: 12, marginTop: space.xs, width: "100%" },

  disclaimer: { color: colors.textFaint, fontSize: 11, textAlign: "center", marginTop: space.md },
});
