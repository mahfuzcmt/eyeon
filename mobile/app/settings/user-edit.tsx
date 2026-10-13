import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { createOrgUser, disableOrgUser, listOrgUsers, updateOrgUser } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { CheckRow, ErrorText, FormScreen, Hint, Panel, SecondaryButton, kitStyles } from "@/components/settings/kit";
import { Chip, Field, Loading, PrimaryButton } from "@/ui";
import { useI18n, type StringKey } from "@/i18n";
import type { UserDetail, UserRole, UserUpdate } from "@/types";

const ROLES: UserRole[] = ["ORG_USER", "ORG_ADMIN"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Add a user (no id) or edit one (id): name, phone, role, password, active; disable. */
export default function UserEditScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user: me } = useAuth();
  const isNew = !id;

  const [original, setOriginal] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("ORG_USER");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState<"save" | "disable" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // There is no GET for one user; the list is small.
  useEffect(() => {
    if (isNew) return;
    listOrgUsers()
      .then((all) => {
        const u = all.find((x) => x.id === id) ?? null;
        setOriginal(u);
        if (u) {
          setEmail(u.email);
          setFullName(u.fullName ?? "");
          setPhone(u.phone ?? "");
          setRole(u.role);
          setIsActive(u.isActive);
        }
      })
      .catch((e) => setError(extractError(e).message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  if (loading) return <Loading label={t("common.loading")} />;
  if (!isNew && !original) {
    return (
      <FormScreen title={t("usr.edit")}>
        <ErrorText>{error ?? t("usr.none")}</ErrorText>
      </FormScreen>
    );
  }

  const isSelf = original?.id === me?.id;
  const isSuper = original?.role === "SUPER_ADMIN";

  async function save() {
    setError(null);
    if (isNew && !EMAIL.test(email.trim())) return setError(t("usr.errEmail"));
    if (!fullName.trim()) return setError(t("usr.errName"));
    if ((isNew || password) && password.length < 8) return setError(t("acct.tooShort"));
    setBusy("save");
    try {
      if (isNew) {
        const created = await createOrgUser({
          email: email.trim(),
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          role,
          password,
        });
        // A new parent sees no one until people are assigned: go straight there.
        if (created.role === "ORG_USER") {
          router.replace({ pathname: "/settings/user-people", params: { id: created.id } });
        } else {
          router.back();
        }
        return;
      }
      const patch: UserUpdate = { fullName: fullName.trim(), phone: phone.trim() };
      if (!isSuper) patch.role = role;
      if (!isSelf) patch.isActive = isActive;
      if (password) patch.password = password;
      await updateOrgUser(original!.id, patch);
      router.back();
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setBusy(null);
    }
  }

  function confirmDisable() {
    if (!original) return;
    Alert.alert(`${t("usr.disable")}?`, `${original.email}\n\n${t("usr.disableConfirm")}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("usr.disable"),
        style: "destructive",
        onPress: async () => {
          setBusy("disable");
          setError(null);
          try {
            await disableOrgUser(original.id);
            router.back();
          } catch (e) {
            setError(extractError(e).message);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <FormScreen title={isNew ? t("usr.add") : t("usr.edit")}>
      <Panel>
        <Field
          label={t("usr.email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={isNew}
        />
        <Field label={t("usr.fullName")} value={fullName} onChangeText={setFullName} />
        <Field label={t("usr.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+8801XXXXXXXXX" />
        <Hint>{t("usr.phoneHint")}</Hint>
      </Panel>

      {!isSuper ? (
        <Panel>
          <Hint>{t("usr.role")}</Hint>
          <View style={kitStyles.row}>
            {ROLES.map((r) => (
              <Chip key={r} label={t(`usr.role.${r}` as StringKey)} active={role === r} onPress={() => setRole(r)} />
            ))}
          </View>
          {role !== "ORG_USER" ? <Hint>{t("usr.adminSeesAll")}</Hint> : null}
        </Panel>
      ) : null}

      <Panel>
        <Field
          label={t("usr.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          placeholder={isNew ? t("usr.passwordNew") : t("usr.passwordKeep")}
        />
        {!isNew && !isSelf ? (
          <CheckRow label={t("usr.active")} hint={t("usr.activeHint")} checked={isActive} onToggle={() => setIsActive((v) => !v)} />
        ) : null}
      </Panel>

      {error ? <ErrorText>{error}</ErrorText> : null}
      <PrimaryButton label={t("set.save")} onPress={() => void save()} loading={busy === "save"} disabled={busy !== null} />

      {!isNew && original?.role === "ORG_USER" ? (
        <SecondaryButton
          label={t("usr.managePeople")}
          icon="people-outline"
          onPress={() => router.push({ pathname: "/settings/user-people", params: { id: original.id } })}
          disabled={busy !== null}
        />
      ) : null}
      {!isNew && original?.isActive && !isSelf ? (
        <SecondaryButton label={t("usr.disable")} icon="ban-outline" danger onPress={confirmDisable} loading={busy === "disable"} disabled={busy !== null} />
      ) : null}
    </FormScreen>
  );
}
