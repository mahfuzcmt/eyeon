import { Alert } from "react-native";
import type { StringKey } from "@/i18n";

/**
 * Ask before signing out. Every "Sign out" control goes through this: the header button sits
 * where a thumb lands by accident, and a signed-out phone gets no alerts.
 */
export function confirmSignOut(t: (k: StringKey) => string, signOut: () => Promise<void>): void {
  Alert.alert(t("auth.signOut"), t("auth.signOutConfirm"), [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("auth.signOut"), style: "destructive", onPress: () => void signOut() },
  ]);
}
