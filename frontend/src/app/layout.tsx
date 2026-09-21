import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

// Self-hosted fonts via fontsource (no build-time fetches to fonts.gstatic.com).
import "@fontsource-variable/nunito/wght.css";
import "@fontsource-variable/baloo-da-2/wght.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/open-sans/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "@fontsource/hind-siliguri/latin-400.css";
import "@fontsource/hind-siliguri/latin-500.css";
import "@fontsource/hind-siliguri/latin-600.css";
import "@fontsource/hind-siliguri/latin-700.css";
import "@fontsource/hind-siliguri/bengali-400.css";
import "@fontsource/hind-siliguri/bengali-500.css";
import "@fontsource/hind-siliguri/bengali-600.css";
import "@fontsource/hind-siliguri/bengali-700.css";

import { LocaleProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "EyeOn — Keep an eye on the ones you love",
  description: "Live location, safe-zone alerts and SOS for children and elderly family members.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0F6B5C",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("pp_locale")?.value === "bn" ? "bn" : "en") as "en" | "bn";

  return (
    <html lang={locale}>
      <body>
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
