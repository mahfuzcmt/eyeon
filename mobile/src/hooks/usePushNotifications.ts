import { useEffect } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { registerForAlarmPush } from "@/push";
import { useI18n } from "@/i18n";

// Survives hook remounts (sign out/in) so a cold-start tap is handled once.
let lastHandledId: string | null = null;

/** Re-register at most this often when the app comes back to the foreground. */
const REREGISTER_MS = 5 * 60_000;

/**
 * Register this install for alarm push and route notification taps:
 * alarm pushes carry `{ imei }` in their data payload → open that vehicle,
 * otherwise fall back to the Alerts tab.
 */
export function usePushNotifications(enabled: boolean): void {
  const router = useRouter();
  const { locale } = useI18n();

  // Registers at start and when the app language changes (so notifications follow it), and again
  // whenever the app comes back to the foreground or the phone gets a new push token. Until
  // 2026-11-03 it only registered at start: when Firebase rotated a phone's token the server got
  // DeviceNotRegistered and rightly deleted it, and a phone that stayed signed in with the app
  // minimized never registered again, so it silently stopped getting notifications.
  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    void registerForAlarmPush(locale);
    const appSub = AppState.addEventListener("change", (s) => {
      if (s !== "active" || Date.now() - last < REREGISTER_MS) return;
      last = Date.now();
      void registerForAlarmPush(locale, false);
    });
    const tokenSub = Notifications.addPushTokenListener(() => {
      last = Date.now();
      void registerForAlarmPush(locale, false);
    });
    return () => {
      appSub.remove();
      tokenSub.remove();
    };
  }, [enabled, locale]);

  useEffect(() => {
    if (!enabled) return;

    function handleTap(resp: Notifications.NotificationResponse): void {
      const id = resp.notification.request.identifier;
      if (id === lastHandledId) return;
      lastHandledId = id;
      const data = resp.notification.request.content.data as { imei?: string } | null;
      if (data?.imei) {
        router.push({ pathname: "/device/[imei]", params: { imei: data.imei } });
      } else {
        router.push("/(tabs)/alerts");
      }
    }

    // Cold start: the app may have been launched by tapping a notification.
    void Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp) handleTap(resp);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(handleTap);
    return () => sub.remove();
  }, [enabled, router]);
}
