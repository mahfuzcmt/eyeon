import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createShareLink, listShareLinks, revokeShareLink } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { BottomSheet, OutlineButton } from "@/components/BottomSheet";
import { adminStyles as s, fmtStamp } from "@/components/admin/shared";
import { Chip, Field, Loading, PrimaryButton } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { ShareLinkView } from "@/types";

/** The backend accepts 1-168 hours (ShareLocationDtos.CreateShareLinkRequest). */
const EXPIRY: { hours: number; label: StringKey }[] = [
  { hours: 1, label: "share.h1" },
  { hours: 6, label: "share.h6" },
  { hours: 24, label: "share.h24" },
  { hours: 72, label: "share.d3" },
  { hours: 168, label: "share.d7" },
];

/**
 * Create, list, share and revoke "see where they are" links for one person
 * (web: the map popup's Share action, ShareLinkModal).
 */
export default function ShareLinksSheet({
  imei,
  personName,
  visible,
  onClose,
}: {
  imei: string;
  personName: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const [links, setLinks] = useState<ShareLinkView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState(24);
  const [live, setLive] = useState(true);
  const [history, setHistory] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLinks(await listShareLinks(imei));
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, [imei]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const shareOut = async (link: ShareLinkView) => {
    try {
      await Share.share({
        message: `${personName} - ${t("share.message")} ${link.shareUrl}`,
        title: t("share.title"),
      });
    } catch {
      // user dismissed
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const link = await createShareLink({
        deviceImei: imei,
        label: label.trim() || undefined,
        expiresInHours: hours,
        allowRealtime: live,
        showHistory: history,
      });
      setLinks((prev) => [link, ...prev]);
      setCreating(false);
      setLabel("");
      void shareOut(link);
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = (link: ShareLinkView) => {
    Alert.alert(t("share.revokeTitle"), t("share.revokeMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("share.revoke"),
        style: "destructive",
        onPress: async () => {
          try {
            await revokeShareLink(link.id);
            setLinks((prev) => prev.filter((l) => l.id !== link.id));
          } catch (e) {
            Alert.alert(t("common.error"), extractError(e).message);
          }
        },
      },
    ]);
  };

  const timeLeft = (iso: string): string => {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return t("share.expired");
    const h = Math.floor(ms / 3_600_000);
    if (h >= 24) return `${Math.floor(h / 24)} ${t("share.daysLeft")}`;
    if (h >= 1) return `${h} ${t("share.hoursLeft")}`;
    return `${Math.max(1, Math.floor(ms / 60_000))} ${t("share.minutesLeft")}`;
  };

  const active = links.filter((l) => l.isActive && new Date(l.expiresAt).getTime() > Date.now());

  return (
    <BottomSheet
      visible={visible}
      title={t("share.title")}
      subtitle={personName}
      onClose={onClose}
      dismissable={!busy}
      footer={
        creating ? (
          <>
            <PrimaryButton label={t("share.createAndSend")} onPress={create} loading={busy} />
            <OutlineButton label={t("common.cancel")} onPress={() => setCreating(false)} disabled={busy} />
          </>
        ) : (
          <PrimaryButton label={t("share.new")} onPress={() => setCreating(true)} />
        )
      }
    >
      <Text style={s.faint}>{t("share.hint")}</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}

      {creating ? (
        <View style={{ gap: space.md }}>
          <Field label={t("share.label")} value={label} onChangeText={setLabel} placeholder={t("share.labelPh")} maxLength={80} />
          <Text style={s.meta}>{t("share.validFor")}</Text>
          <View style={s.wrap}>
            {EXPIRY.map((e) => (
              <Chip key={e.hours} label={t(e.label)} active={hours === e.hours} onPress={() => setHours(e.hours)} />
            ))}
          </View>
          <ToggleRow label={t("share.live")} hint={t("share.liveHint")} value={live} onChange={setLive} />
          <ToggleRow label={t("share.history")} hint={t("share.historyHint")} value={history} onChange={setHistory} />
        </View>
      ) : loading && links.length === 0 ? (
        <Loading />
      ) : active.length === 0 ? (
        <Text style={s.meta}>{t("share.none")}</Text>
      ) : (
        active.map((link) => (
          <View key={link.id} style={styles.link}>
            <View style={s.row}>
              <View style={s.grow}>
                <Text style={s.name} numberOfLines={1}>
                  {link.label || t("share.untitled")}
                </Text>
                <Text style={s.faint} numberOfLines={1}>
                  {link.shareUrl}
                </Text>
              </View>
              <Text style={[s.meta, { color: colors.warn, fontWeight: "700" }]}>{timeLeft(link.expiresAt)}</Text>
            </View>
            <View style={s.wrap}>
              {link.allowRealtime ? <Tag text={t("share.liveTag")} /> : null}
              {link.showHistory ? <Tag text={t("share.historyTag")} /> : null}
              <Text style={s.faint}>
                {t("share.opened")} {link.accessCount}
                {link.lastAccessedAt ? ` · ${fmtStamp(link.lastAccessedAt, locale)}` : ""}
              </Text>
            </View>
            <View style={s.wrap}>
              <View style={{ flexGrow: 1 }}>
                <OutlineButton icon="share-social-outline" label={t("share.send")} onPress={() => void shareOut(link)} />
              </View>
              <View style={{ flexGrow: 1 }}>
                <OutlineButton icon="close-circle-outline" danger label={t("share.revoke")} onPress={() => revoke(link)} />
              </View>
            </View>
          </View>
        ))
      )}
    </BottomSheet>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={[s.row, { alignItems: "center" }]}>
      <View style={s.grow}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{label}</Text>
        <Text style={s.faint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.brand, false: colors.border }}
        thumbColor={colors.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  tag: { backgroundColor: colors.brandSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { color: colors.brandDim, fontSize: 12, fontWeight: "700" },
});

/** Header button on the person screen that opens the share-links sheet. */
export function ShareButton({ imei, personName }: { imei: string; personName: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("share.title")}
        style={{ paddingHorizontal: space.sm }}
      >
        <Ionicons name="share-social-outline" size={24} color={colors.brand} />
      </Pressable>
      <ShareLinksSheet imei={imei} personName={personName} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
