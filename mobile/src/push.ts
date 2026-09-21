import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "@/api/endpoints";

/**
 * Alarm push notifications via the Expo Push Service. The backend
 * (PushService) posts to exp.host, which relays through FCM (Android) /
 * APNs (iOS) — so this stays Expo Go-compatible with no native build.
 */

// Show alarm banners even while the app is foregrounded — a dispatcher
// watching the map still wants the SOS banner + sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Token registered with the backend for this session, if any. */
let currentToken: string | null = null;

/**
 * Ask for notification permission, obtain the Expo push token, and register
 * it with the backend. Best-effort: any failure (simulator, permission
 * denied, offline) resolves silently — push must never block sign-in.
 */
export async function registerForAlarmPush(): Promise<void> {
  try {
    if (!Device.isDevice) return; // emulators/simulators can't receive push

    if (Platform.OS === "android") {
      // Backend sends channelId "alarms" — the channel must exist client-side.
      await Notifications.setNotificationChannelAsync("alarms", {
        name: "Vehicle alarms",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#E8900A",
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") return;

    // EAS builds need the projectId; Expo Go infers it from the experience.
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {},
    );

    await registerPushToken(token, Platform.OS === "ios" ? "IOS" : "ANDROID");
    currentToken = token;
  } catch {
    // Swallowed by design — see doc comment.
  }
}

/** Unregister this install's token on sign-out (needs the auth header, so call before clearing tokens). */
export async function unregisterAlarmPush(): Promise<void> {
  const token = currentToken;
  currentToken = null;
  if (!token) return;
  try {
    await unregisterPushToken(token);
  } catch {
    // Signing out anyway; a stale row gets purged when Expo reports DeviceNotRegistered.
  }
}
