import { useState } from "react";
import { View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { changePassword } from "@/api/endpoints";
import { tokenStore } from "@/api/client";
import { ErrorText, FormScreen, Heading, Hint, InfoItem, OkText, Panel, kitStyles } from "@/components/settings/kit";
import { Field, PrimaryButton } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";

/** The signed-in user's own account: who they are, and a password change. */
export default function AccountScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const roleKey = `usr.role.${user?.role ?? "ORG_USER"}` as StringKey;

  async function submit() {
    setError(null);
    setSaved(false);
    if (next.length < 8) return setError(t("acct.tooShort"));
    if (next !== confirm) return setError(t("acct.mismatch"));
    setBusy(true);
    try {
      // The server revokes every other session and hands this one a new pair.
      const pair = await changePassword(current, next);
      tokenStore.replace(pair);
      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setError(t("acct.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen title={t("set.account")}>
      <Panel>
        <View style={kitStyles.row}>
          {user?.fullName ? <InfoItem label={t("acct.name")} value={user.fullName} /> : null}
          <InfoItem label={t("acct.email")} value={user?.email ?? "—"} />
          <InfoItem label={t("acct.role")} value={t(roleKey)} />
        </View>
      </Panel>

      <Panel>
        <Heading>{t("acct.changePassword")}</Heading>
        <Hint>{t("acct.changePasswordHelp")}</Hint>
        <Field
          label={t("acct.current")}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          editable={!busy}
        />
        <Field
          label={t("acct.new")}
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!busy}
        />
        <Field
          label={t("acct.confirm")}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!busy}
          onSubmitEditing={() => void submit()}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        {saved ? <OkText>{t("acct.updated")}</OkText> : null}
        <PrimaryButton
          label={t("acct.update")}
          onPress={() => void submit()}
          loading={busy}
          disabled={!current || !next || !confirm}
        />
      </Panel>
    </FormScreen>
  );
}
