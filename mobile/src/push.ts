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

const CHANNEL_ALARMS = "alarms_v2";
const CHANNEL_ARRIVALS = "arrivals_v2";

/** The token this phone is registered with, or null when it is not (yet). */
export function registeredPushToken(): string | null {
  return currentToken;
}

/** How this phone treats our notifications, as far as the app can see it. */
export interface PushHealth {
  /** Notifications are allowed for the app. */
  allowed: boolean;
  /** This phone is registered with the server. */
  registered: boolean;
  /** A channel was switched off or turned down to silent in the phone's settings (Android). */
  quiet: boolean;
}

export async function pushHealth(): Promise<PushHealth> {
  let allowed = false;
  let quiet = false;
  try {
    allowed = (await Notifications.getPermissionsAsync()).status === "granted";
    if (Platform.OS === "android") {
      for (const id of [CHANNEL_ALARMS, CHANNEL_ARRIVALS]) {
        const ch = await Notifications.getNotificationChannelAsync(id);
        // Below "default" a notification makes no sound; a channel can also keep its importance
        // and have its sound taken away.
        if (ch && (ch.importance < Notifications.AndroidImportance.DEFAULT || ch.sound === null)) quiet = true;
      }
    }
  } catch {
    // Keep what could be read.
  }
  return { allowed, registered: currentToken !== null, quiet };
}

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
      // The backend sends channelId "alarms_v2" / "arrivals_v2"; the channels must exist here.
      // They are the second generation (2026-11-17, "notifications arrive in silent mode"):
      // Android keeps a channel's sound and importance from the moment it is first created,
      // whatever a later build asks for, and remembers them even when the channel is deleted
      // and made again under the same id. So a phone on which "alarms" or "arrivals" was created
      // differently by an old build, or turned down, could only be put right under new ids.
      await Notifications.setNotificationChannelAsync(CHANNEL_ALARMS, {
        name: "Urgent alerts",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0F6B5C",
      });
      // "Reached School" / "left School": good news, but parents want to hear it and see it
      // come in, so high importance (sound and a banner) with a short buzz; it was normal
      // importance, which on many phones shows no banner at all.
      await Notifications.setNotificationChannelAsync(CHANNEL_ARRIVALS, {
        name: "Arrivals and departures",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 200],
        lightColor: "#0F6B5C",
      });
      // The first generation is no longer used by the backend; take it off the phone's list.
      for (const old of ["alarms", "arrivals"]) {
        try {
          await Notifications.deleteNotificationChannelAsync(old);
        } catch {
          // Never created on this phone.
        }
      }
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
