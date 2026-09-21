"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session-context";
import { BillingTab } from "@/components/settings/BillingTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { AccountTab } from "@/components/settings/AccountTab";
import { OrgInfoTab } from "@/components/settings/OrgInfoTab";
import { UsersTab } from "@/components/settings/UsersTab";

type Tab = "org" | "users" | "notifications" | "account" | "billing";
const TABS: Tab[] = ["org", "users", "notifications", "account", "billing"];
/** Tabs every role may open; org + users are admin-only. */
const OPEN_TABS: Tab[] = ["notifications", "account", "billing"];

export default function Page() {
  const { t } = useLocale();
  const { role } = useSession();
  const isAdmin = role === "ORG_ADMIN" || role === "SUPER_ADMIN";
  // Non-admins can only see billing, so default to billing for them
  const [tab, setTab] = useState<Tab>(isAdmin ? "org" : "notifications");

  // Deep link, e.g. the bell's gear → /dashboard/settings?tab=notifications
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (wanted && TABS.includes(wanted) && (isAdmin || OPEN_TABS.includes(wanted))) {
      setTab(wanted);
    }
  }, [isAdmin]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-surface-200 px-4 py-3 bg-surface-50">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("settings.title")}</h1>
        <div className="ml-auto flex max-w-full gap-1 overflow-x-auto rounded-lg border border-surface-200 bg-white p-0.5 text-[14px] shadow-sm">
          {isAdmin && (
            <>
              <TabButton active={tab === "org"} onClick={() => setTab("org")}>
                {t("settings.tab.org")}
              </TabButton>
              <TabButton active={tab === "users"} onClick={() => setTab("users")}>
                {t("settings.tab.users")}
              </TabButton>
            </>
          )}
          <TabButton active={tab === "notifications"} onClick={() => setTab("notifications")}>
            {t("settings.tab.notifications")}
          </TabButton>
          <TabButton active={tab === "account"} onClick={() => setTab("account")}>
            {t("settings.tab.account")}
          </TabButton>
          <TabButton active={tab === "billing"} onClick={() => setTab("billing")}>
            {t("settings.tab.billing")}
          </TabButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "org" && isAdmin && <OrgInfoTab readOnly={!isAdmin} />}
        {tab === "users" && isAdmin && <UsersTab canManage={isAdmin} />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "account" && <AccountTab />}
        {tab === "billing" && <BillingTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition ${
        active
          ? "bg-brand-500 text-white shadow-sm"
          : "text-ink-600 hover:text-ink-900 hover:bg-surface-100"
      }`}
    >
      {children}
    </button>
  );
}
