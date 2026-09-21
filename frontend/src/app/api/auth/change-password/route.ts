import { NextRequest, NextResponse } from "next/server";
import { backendBase, readSession, writeSession } from "@/lib/session";
import { jwtExpiresAtMs } from "@/lib/jwt";

/**
 * Logged-in password change. The backend revokes every refresh token and
 * returns a fresh pair; we swap it into the HTTP-only session cookie so the
 * current browser stays signed in while other devices are logged out.
 */
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.currentPassword || !body?.newPassword) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "currentPassword and newPassword required" } },
      { status: 400 },
    );
  }
  const r = await fetch(`${backendBase()}/api/v1/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ currentPassword: body.currentPassword, newPassword: body.newPassword }),
    cache: "no-store",
  });
  if (!r.ok) {
    const errBody = await r.json().catch(() => ({ error: { code: "CHANGE_FAILED", message: "Password change failed" } }));
    return NextResponse.json(errBody, { status: r.status });
  }
  const pair = (await r.json()) as { accessToken: string; refreshToken: string };
  await writeSession({
    ...session,
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    expiresAt: jwtExpiresAtMs(pair.accessToken),
  });
  return new NextResponse(null, { status: 204 });
}
