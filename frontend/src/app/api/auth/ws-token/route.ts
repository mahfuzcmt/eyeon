import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { expiresSoon, refreshSession } from "@/lib/sessionRefresh";

/**
 * Returns the access token to the browser so the STOMP CONNECT frame can
 * carry it as `Authorization: Bearer <jwt>`. The token is short-lived; the
 * long-lived refresh token never leaves the server cookie. A token that is
 * about to run out is exchanged first, so a reconnect always gets a usable one.
 */
export async function GET() {
  let s = await readSession();
  if (!s) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }
  if (expiresSoon(s)) {
    const refreshed = await refreshSession(s);
    if (refreshed.kind === "ok") {
      s = refreshed.session;
    } else if (refreshed.kind === "refused") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
    } else if (s.expiresAt <= Date.now()) {
      return NextResponse.json({ error: { code: "REFRESH_UNAVAILABLE" } }, { status: 503 });
    }
  }
  const expiresIn = Math.max(0, Math.floor((s.expiresAt - Date.now()) / 1000));
  return NextResponse.json({ token: s.accessToken, expiresIn });
}
