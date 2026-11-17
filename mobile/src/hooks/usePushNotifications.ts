import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { isPushPermissionDenied, recheckPushPermission, registerForAlarmPush, subscribePushPermission } from "@/push";
import { useI18n } from "@/i18n";

// Survives hook remounts (sign out/in) so a cold-start tap is handled once.
let lastHandledId: string | null = null;

/** After a successful registration, re-register at most this often when the app comes back to the foreground. */
const REREGISTER_MS = 5 * 60_000;
/** Waits before retrying a failed registration; the last one repeats. */
const RETRY_MS = [15_000, 60_000, 5 * 60_000];

/**
 * True when notifications are not allowed for the app on this phone (Android 13+ asks, and the
 * answer can be "no"). Checked again whenever the app returns to the foreground, e.g. from the
 * phone's settings.
 */
export function usePushPermissionDenied(): boolean {
  const denied = useSyncExternalStore(subscribePushPermission, isPushPermissionDenied);
  useEffect(() => {
    void recheckPushPermission();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void recheckPushPermission();
    });
    return () => sub.remove();
  }, []);
  return denied;
}

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
  //
  // Only a registration that worked counts (2026-11-17). The attempt used to be stamped before
  // it ran and its failure swallowed, so a first attempt that failed (offline at login, Expo
  // token fetch error) was not repeated until the app had been in the background and five
  // minutes had passed. A failure is now retried after 15 s, 60 s and then every 5 min while
  // the app is in the foreground, and at once when the app returns to it.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let lastOk = 0;
    let failures = 0;
    let running = false;
    let again = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const attempt = async (askPermission: boolean): Promise<void> => {
      if (running) {
        again = true; // e.g. a new token arrived meanwhile: go once more when this one ends
        return;
      }
      running = true;
      if (retry) clearTimeout(retry);
      retry = null;
      const result = await registerForAlarmPush(locale, askPermission);
      running = false;
      if (cancelled) return;
      if (again) {
        again = false;
        void attempt(false);
        return;
      }
      if (result === "ok") {
        lastOk = Date.now();
        failures = 0;
        return;
      }
      // "denied" / "unsupported": waiting does not help; the return to the foreground (from the
      // phone settings) checks again.
      if (result !== "failed") return;
      const wait = RETRY_MS[Math.min(failures, RETRY_MS.length - 1)];
      failures++;
      retry = setTimeout(() => {
        retry = null;
        if (AppState.currentState === "active") void attempt(false);
      }, wait);
    };

    void attempt(true);
    const appSub = AppState.addEventListener("change", (s) => {
      if (s !== "active" || Date.now() - lastOk < REREGISTER_MS) return;
      void attempt(false);
    });
    const tokenSub = Notifications.addPushTokenListener(() => {
      void attempt(false);
    });
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
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
