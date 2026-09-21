import { NextRequest, NextResponse } from "next/server";
import { backendBase, writeSession } from "@/lib/session";
import { jwtExpiresAtMs } from "@/lib/jwt";

interface BackendUserSummary {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  orgId: string;
}

interface BackendOrgSummary {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  locale: "en" | "bn";
  timezone: string;
}

interface BackendLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: BackendUserSummary;
  org: BackendOrgSummary;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "email and password required" } },
      { status: 400 },
    );
  }

  const r = await fetch(`${backendBase()}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: "no-store",
  });

  if (!r.ok) {
    const errBody = await r.json().catch(() => ({
      error: { code: "AUTH_FAILED", message: "Login failed" },
    }));
    return NextResponse.json(errBody, { status: r.status });
  }

  const data = (await r.json()) as BackendLoginResponse;
  await writeSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userId: data.user.id,
    orgId: data.org.id,
    expiresAt: jwtExpiresAtMs(data.accessToken),
  });

  // Reshape org → frontend AuthMeResponse-compatible shape
  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.fullName,
      role: data.user.role,
      locale: data.org.locale,
    },
    org: {
      id: data.org.id,
      name: data.org.name,
      plan: data.org.planTier,
      locale: data.org.locale,
    },
  });
}
