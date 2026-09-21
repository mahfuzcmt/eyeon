import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { backendBase } from "@/lib/session";
import { DashboardShell } from "@/components/shell/DashboardShell";
import { SessionProvider } from "@/lib/session-context";
import type { AuthMeResponse } from "@/types/domain";

interface BackendUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  orgId: string;
}

interface BackendOrg {
  id: string;
  name: string;
  planTier: string;
  locale: string;
  googleMapsApiKey: string | null;
}

async function loadMe(): Promise<AuthMeResponse & { googleMapsApiKey: string | null }> {
  const session = await readSession();
  if (!session) redirect("/login");

  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const [r, ro] = await Promise.all([
    fetch(`${backendBase()}/api/v1/auth/me`, { headers, cache: "no-store" }),
    fetch(`${backendBase()}/api/v1/orgs/me`, { headers, cache: "no-store" }),
  ]);
  if (!r.ok) redirect("/login");
  const u = (await r.json()) as BackendUser;
  // The org call is best-effort: a failure only loses the org name and map key.
  const o = ro.ok ? ((await ro.json()) as BackendOrg) : null;

  return {
    user: {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role as AuthMeResponse["user"]["role"],
      locale: "en",
    },
    org: {
      id: session.orgId,
      name: o?.name ?? "—",
      plan: o?.planTier ?? "—",
      locale: o?.locale === "bn" ? "bn" : "en",
    },
    googleMapsApiKey: o?.googleMapsApiKey ?? null,
  };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = await loadMe();

  return (
    <SessionProvider
      value={{
        userId: me.user.id,
        orgId: me.org.id,
        email: me.user.email,
        role: me.user.role,
      }}
    >
      {/* ADL-style layout: rail + top bar on desktop, drawer nav on mobile */}
      <DashboardShell user={me.user} orgId={me.org.id} googleMapsApiKey={me.googleMapsApiKey}>
        {children}
      </DashboardShell>
    </SessionProvider>
  );
}
