import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { Divider, FormScreen, MenuRow, Panel } from "@/components/settings/kit";
import { useI18n } from "@/i18n";

/** Settings menu - the mobile counterpart of the web Settings page's tabs. */
export default function SettingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, org } = useAuth();
  const isAdmin = user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <FormScreen title={t("set.title")}>
      <Panel style={{ padding: 0, gap: 0 }}>
        <MenuRow icon="person-circle-outline" label={t("set.account")} detail={user?.email} onPress={() => router.push("/settings/account")} />
        <Divider />
        <MenuRow icon="notifications-outline" label={t("set.notifications")} onPress={() => router.push("/settings/notifications")} />
        <Divider />
        <MenuRow icon="folder-open-outline" label={t("set.groups")} onPress={() => router.push("/groups")} />
        <Divider />
        <MenuRow icon="card-outline" label={t("set.billing")} onPress={() => router.push("/settings/billing")} />
      </Panel>

      {isAdmin ? (
        <Panel style={{ padding: 0, gap: 0 }}>
          <MenuRow icon="school-outline" label={t("set.org")} detail={org?.name} onPress={() => router.push("/settings/organization")} />
          <Divider />
          <MenuRow icon="people-outline" label={t("set.users")} onPress={() => router.push("/settings/users")} />
        </Panel>
      ) : null}
    </FormScreen>
  );
}
