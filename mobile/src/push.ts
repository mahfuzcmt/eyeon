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

/**
 * False from sign-out until the next registration (which only happens signed in). A push that
 * arrives while the login screen is open belongs to the account that just signed out - after a
 * forced sign-out its token may still be registered - so it is not shown.
 */
let showInForeground = true;

// Show alarm banners even while the app is foregrounded — a dispatcher
// watching the map still wants the SOS banner + sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: showInForeground,
    shouldPlaySound: showInForeground,
    shouldSetBadge: false,
  }),
});

/** Token registered with the backend for this session, if any. */
let currentToken: string | null = null;

/**
 * "ok" = the backend has this phone's token. "denied" = notifications are not allowed for the app
 * (the user must change that in the phone settings). "unsupported" = an emulator. "failed" =
 * anything else (offline, Expo token fetch error, backend error): worth trying again soon.
 */
export type PushRegistration = "ok" | "denied" | "unsupported" | "failed";

// ---- "notifications are off for this phone", remembered for Settings -> Notifications ----
let permissionDenied = false;
const permissionListeners = new Set<() => void>();

function setPermissionDenied(denied: boolean): void {
  if (permissionDenied === denied) return;
  permissionDenied = denied;
  permissionListeners.forEach((fn) => fn());
}

export function isPushPermissionDenied(): boolean {
  return permissionDenied;
}

export function subscribePushPermission(listener: () => void): () => void {
  permissionListeners.add(listener);
  return () => {
    permissionListeners.delete(listener);
  };
}

/** Look at the permission again without asking for it (e.g. back from the phone settings). */
export async function recheckPushPermission(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionDenied(status !== "granted");
  } catch {
    // Keep what was known.
  }
}

/**
 * Ask for notification permission, obtain the Expo push token, and register
 * it with the backend. Best-effort: it never throws — push must never block sign-in — and
 * reports how it went so the caller can retry a failure.
 * `askPermission` false only checks it (re-registering on return to the app must not
 * show the permission dialog again and again).
 */
export async function registerForAlarmPush(locale: "bn" | "en", askPermission = true): Promise<PushRegistration> {
  showInForeground = true;
  try {
    if (!Device.isDevice) return "unsupported"; // emulators/simulators can't receive push

    if (Platform.OS === "android") {
      // Backend sends channelId "alarms" — the channel must exist client-side.
      await Notifications.setNotificationChannelAsync("alarms", {
        name: "Urgent alerts",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0F6B5C",
      });
      // "Reached School" / "left School": good news, so a normal-importance channel
      // with the default sound rather than the alarm treatment.
      await Notifications.setNotificationChannelAsync("arrivals", {
        name: "Arrivals and departures",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
        lightColor: "#0F6B5C",
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted" && askPermission) {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    setPermissionDenied(status !== "granted");
    if (status !== "granted") return "denied";

    // EAS builds need the projectId; Expo Go infers it from the experience.
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {},
    );

    await registerPushToken(token, Platform.OS === "ios" ? "IOS" : "ANDROID", locale);
    currentToken = token;
    return "ok";
  } catch {
    // Never thrown further — see doc comment.
    return "failed";
  }
}

/**
 * Unregister this install's token on sign-out (needs the auth header, so call before clearing
 * tokens). Also stops showing pushes while signed out and takes the old account's alerts off the
 * notification shade - the part that still works when the access token has run out (a forced
 * sign-out) and the backend call is refused.
 */
export async function unregisterAlarmPush(): Promise<void> {
  showInForeground = false;
  const token = currentToken;
  currentToken = null;
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // Not worth failing a sign-out for.
  }
  if (!token) return;
  try {
    await unregisterPushToken(token);
  } catch {
    // Signing out anyway; a stale row gets purged when Expo reports DeviceNotRegistered.
  }
}
