import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";

/**
 * Returns the access token to the browser so the STOMP CONNECT frame can
 * carry it as `Authorization: Bearer <jwt>`. The token is short-lived; the
 * long-lived refresh token never leaves the server cookie.
 */
export async function GET() {
  const s = await readSession();
  if (!s) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }
  const expiresIn = Math.max(0, Math.floor((s.expiresAt - Date.now()) / 1000));
  return NextResponse.json({ token: s.accessToken, expiresIn });
}
