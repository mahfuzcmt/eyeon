"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { LanguageToggle } from "./LanguageToggle";
import type { UserView } from "@/types/domain";

/**
 * ADL-style top bar: brand + live status on the left, notifications /
 * language / user / settings on the right. Vehicle search lives in the
 * dashboard's vehicle panel, not here.
 */
export function Topbar({ user, onMenu }: { user: UserView; orgId: string; onMenu?: () => void }) {
  const router = useRouter();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  async function onSignOut() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="z-[2100] flex h-[52px] shrink-0 items-center gap-2 border-b border-surface-300 bg-white px-3 sm:px-4">
      {/* Mobile: open the navigation drawer */}
      {onMenu && (
        <button
          type="button"
          onClick={onMenu}
          className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-700 hover:bg-surface-100 md:hidden"
          aria-label="Open navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Left: brand + live status */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity="0.9" />
              <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-lg font-bold text-ink-900">
            <span className="text-brand-500">Moto</span>Link
          </span>
        </Link>
        <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] text-emerald-700 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium">Live</span>
        </div>
      </div>

      {/* Right: controls */}
      <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
        <LanguageToggle />

        <div className="mx-1 hidden h-5 w-px bg-surface-300 sm:block" />

        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[13px] font-semibold text-white">
            {(user.fullName ?? user.email).charAt(0).toUpperCase()}
          </div>
          <span className="hidden text-[14px] font-medium text-ink-700 lg:block">
            {user.fullName ?? user.email.split("@")[0]}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 hover:bg-surface-100"
            aria-label="Account menu"
            aria-expanded={showSettingsMenu}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {showSettingsMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-surface-300 bg-white py-1 shadow-lg">
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2.5 px-4 py-2 text-[14px] text-ink-700 hover:bg-surface-50"
                  onClick={() => setShowSettingsMenu(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
                  </svg>
                  System Configuration
                </Link>
                <Link
                  href="/dashboard/settings?tab=account"
                  className="flex items-center gap-2.5 px-4 py-2 text-[14px] text-ink-700 hover:bg-surface-50"
                  onClick={() => setShowSettingsMenu(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Change Password
                </Link>
                <div className="my-1 border-t border-surface-200" />
                <button
                  onClick={onSignOut}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-[14px] text-red-600 hover:bg-red-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="m16 17 5-5-5-5M21 12H9" />
                  </svg>
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
