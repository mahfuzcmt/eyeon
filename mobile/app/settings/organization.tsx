import { useEffect, useState } from "react";
import { View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { getOrgDetail, updateOrg } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { ErrorText, FormScreen, Heading, Hint, InfoItem, OkText, Panel, SecondaryButton, kitStyles } from "@/components/settings/kit";
import { Chip, Field, Loading, PrimaryButton } from "@/ui";
import { useI18n } from "@/i18n";
import type { OrgDetail, OrgUpdate } from "@/types";

const TIMEZONES = ["Asia/Dhaka", "Asia/Kolkata", "Asia/Karachi", "Asia/Singapore", "UTC"];
const LANGUAGES: { id: string; label: string }[] = [
  { id: "bn", label: "বাংলা" },
  { id: "en", label: "English" },
];

/** School / family details and the optional own Google Maps key (admins only; PATCH /orgs/me). */
export default function OrganizationScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const canEdit = user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN";
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [form, setForm] = useState<OrgUpdate>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<"plain" | "key" | null>(null);

  useEffect(() => {
    getOrgDetail()
      .then((o) => {
        setOrg(o);
        setForm({
          name: o.name,
          contactEmail: o.contactEmail ?? "",
          contactPhone: o.contactPhone ?? "",
          address: o.address ?? "",
          locale: o.locale?.startsWith("bn") ? "bn" : "en",
          timezone: o.timezone,
          googleMapsApiKey: o.googleMapsApiKey ?? "",
        });
      })
      .catch((e) => setLoadError(extractError(e).message));
  }, []);

  if (loadError) {
    return (
      <FormScreen title={t("set.org")}>
        <ErrorText>{loadError}</ErrorText>
      </FormScreen>
    );
  }
  if (!org) return <Loading label={t("common.loading")} />;

  const set = <K extends keyof OrgUpdate>(k: K, v: OrgUpdate[K]) => {
    setSaved(null);
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  async function save() {
    if (!org) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const before = org.googleMapsApiKey ?? "";
      const next = await updateOrg({
        ...form,
        name: form.name?.trim(),
        contactEmail: form.contactEmail?.trim(),
        contactPhone: form.contactPhone?.trim(),
        address: form.address?.trim(),
      });
      setOrg(next);
      // The map loads the key once per session, so a new key needs a restart to show.
      setSaved((next.googleMapsApiKey ?? "") !== before ? "key" : "plain");
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen title={t("set.org")}>
      <Panel>
        <View style={kitStyles.row}>
          <InfoItem label={t("org.plan")} value={org.planTier} />
        </View>
        <Field label={t("org.name")} value={form.name ?? ""} onChangeText={(v) => set("name", v)} editable={canEdit} />
        <Field
          label={t("org.contactEmail")}
          value={form.contactEmail ?? ""}
          onChangeText={(v) => set("contactEmail", v)}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={canEdit}
        />
        <Field
          label={t("org.contactPhone")}
          value={form.contactPhone ?? ""}
          onChangeText={(v) => set("contactPhone", v)}
          keyboardType="phone-pad"
          editable={canEdit}
        />
        <Field
          label={t("org.address")}
          value={form.address ?? ""}
          onChangeText={(v) => set("address", v)}
          multiline
          editable={canEdit}
        />
      </Panel>

      <Panel>
        <Hint>{t("org.locale")}</Hint>
        <View style={kitStyles.row}>
          {LANGUAGES.map((l) => (
            <Chip key={l.id} label={l.label} active={form.locale === l.id} onPress={() => canEdit && set("locale", l.id)} />
          ))}
        </View>
        <Hint>{t("org.timezone")}</Hint>
        <View style={kitStyles.row}>
          {TIMEZONES.map((tz) => (
            <Chip key={tz} label={tz} active={form.timezone === tz} onPress={() => canEdit && set("timezone", tz)} />
          ))}
        </View>
      </Panel>

      <Panel>
        <Heading>{t("org.mapTitle")}</Heading>
        <Field
          label={t("org.mapKey")}
          value={form.googleMapsApiKey ?? ""}
          onChangeText={(v) => set("googleMapsApiKey", v.trim())}
          secureTextEntry={!showKey}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="AIza…"
          maxLength={39}
          editable={canEdit}
        />
        <View style={kitStyles.row}>
          <SecondaryButton
            label={showKey ? t("set.hide") : t("set.show")}
            icon={showKey ? "eye-off-outline" : "eye-outline"}
            onPress={() => setShowKey((v) => !v)}
          />
        </View>
        <Hint>{t("org.mapKeyHelp")}</Hint>
        <Hint>{org.googleMapsApiKey ? t("org.usingOwn") : t("org.usingDefault")}</Hint>
      </Panel>

      {error ? <ErrorText>{error}</ErrorText> : null}
      {saved === "plain" ? <OkText>{t("set.saved")}</OkText> : null}
      {saved === "key" ? <OkText>{t("org.keyRestart")}</OkText> : null}
      {canEdit ? <PrimaryButton label={t("set.save")} onPress={() => void save()} loading={busy} /> : null}
    </FormScreen>
  );
}
