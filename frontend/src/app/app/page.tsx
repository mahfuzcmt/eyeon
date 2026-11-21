import type { Metadata } from "next";
import { GetTheApp } from "./GetTheApp";

/**
 * https://eyeoniot.com/app - the address in the QR code the watch maker prints on each watch
 * (2026-11-21). That code cannot be changed once it is printed, so this path must never move.
 *
 * The store links are read when the page is requested, not when the site is built, so they can
 * be added or changed in the server's .env (EYEON_PLAY_STORE_URL, EYEON_APP_STORE_URL,
 * EYEON_ANDROID_APK_URL) with a restart of eyeon-frontend and no rebuild. A link that is not
 * set is shown as "coming soon".
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get the EyeOn app",
  description: "Install the EyeOn app to see where your child or relative is, or open EyeOn in the browser.",
};

function httpsOrNull(value: string | undefined): string | null {
  const v = value?.trim();
  return v && /^https:\/\/[^\s]+$/i.test(v) ? v : null;
}

export default function AppPage() {
  return (
    <GetTheApp
      playStoreUrl={httpsOrNull(process.env.EYEON_PLAY_STORE_URL)}
      appStoreUrl={httpsOrNull(process.env.EYEON_APP_STORE_URL)}
      androidApkUrl={httpsOrNull(process.env.EYEON_ANDROID_APK_URL)}
    />
  );
}
