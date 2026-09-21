"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AlarmToast } from "@/components/alarm/AlarmToast";
import { setGoogleMapsApiKey } from "@/lib/googleMapsKey";
import type { UserView } from "@/types/domain";

/**
 * Client wrapper for the dashboard chrome. Desktop keeps the ADL layout
 * (icon rail + secondary panel + top bar). Below `md` the rail is hidden and
 * the top bar's hamburger opens the navigation as an overlay drawer.
 */
export function DashboardShell({
  user,
  orgId,
  googleMapsApiKey,
  children,
}: {
  user: UserView;
  orgId: string;
  /** The org's own Google Maps key (null = platform default). */
  googleMapsApiKey?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  // Applied during render, not in an effect: child maps read the key while
  // they render, and children render after this body but before any effect.
  setGoogleMapsApiKey(googleMapsApiKey);

  // Close the drawer whenever navigation happens.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#EAEEF2] text-[#3D4353]">
      {/* Desktop sidebar */}
      <div className="hidden h-full md:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-[2400] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/50"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] shadow-2xl">
            <Sidebar mobile onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} orgId={orgId} onMenu={() => setNavOpen(true)} />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        {/* Live alarm popups (Settings → Notifications decides which types and whether they sound) */}
        <AlarmToast />
      </div>
    </div>
  );
}
