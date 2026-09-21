import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { registerForAlarmPush } from "@/push";

// Survives hook remounts (sign out/in) so a cold-start tap is handled once.
let lastHandledId: string | null = null;

/**
 * Register this install for alarm push and route notification taps:
 * alarm pushes carry `{ imei }` in their data payload → open that vehicle,
 * otherwise fall back to the Alerts tab.
 */
export function usePushNotifications(enabled: boolean): void {
  const router = useRouter();

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

    void registerForAlarmPush();

    // Cold start: the app may have been launched by tapping a notification.
    void Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp) handleTap(resp);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(handleTap);
    return () => sub.remove();
  }, [enabled, router]);
}
