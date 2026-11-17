// Server-only: exchanges the stored refresh token for a new pair and writes it into the
// session cookie. Used by the BFF proxy and the ws-token route, so the web session does not
// end when the hourly access token runs out.

import { backendBase, clearSession, writeSession, type SessionPayload } from "./session";
import { jwtExpiresAtMs } from "./jwt";

export type RefreshResult =
  | { kind: "ok"; session: SessionPayload }
  /** The backend refused the refresh token: the session is over. */
  | { kind: "refused" }
  /** Network error, timeout, 5xx, 408 or 429: the session may still be good, try later. */
  | { kind: "unavailable" };

/** Refresh this long before the access token runs out. */
export const REFRESH_AHEAD_MS = 60_000;

/**
 * How long a finished exchange is remembered. Requests already on their way with the old
 * cookie get the same new pair instead of exchanging the old refresh token again.
 */
const REMEMBER_MS = 90_000;
const REFRESH_TIMEOUT_MS = 10_000;

interface Entry {
  promise: Promise<RefreshResult>;
  at: number;
}

// One exchange per refresh token within this server process. Two processes can still race;
// the backend accepts a rotated token for 2 minutes for that case.
const exchanges = new Map<string, Entry>();

function prune(now: number): void {
  for (const [key, entry] of exchanges) {
    if (now - entry.at > REMEMBER_MS) exchanges.delete(key);
  }
}

async function exchange(session: SessionPayload): Promise<RefreshResult> {
  let r: Response;
  try {
    r = await fetch(`${backendBase()}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (!r.ok) {
    const definite = r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429;
    return definite ? { kind: "refused" } : { kind: "unavailable" };
  }
  const pair = (await r.json().catch(() => null)) as
    | { accessToken?: string; refreshToken?: string }
    | null;
  if (!pair?.accessToken) return { kind: "unavailable" };
  return {
    kind: "ok",
    session: {
      ...session,
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken ?? session.refreshToken,
      expiresAt: jwtExpiresAtMs(pair.accessToken),
    },
  };
}

/**
 * Exchange the session's refresh token (shared with every parallel request of the same
 * session) and update the cookie of the current request: the new pair on success, cleared
 * when the backend refused the token. Must be called from a route handler.
 */
export async function refreshSession(session: SessionPayload): Promise<RefreshResult> {
  const now = Date.now();
  prune(now);
  const key = session.refreshToken;
  let entry = exchanges.get(key);
  if (!entry) {
    entry = { promise: exchange(session), at: now };
    exchanges.set(key, entry);
    const mine = entry;
    void mine.promise.then((result) => {
      // Only a finished exchange is worth remembering; a failed one is tried again.
      if (result.kind === "unavailable" && exchanges.get(key) === mine) exchanges.delete(key);
    });
  }
  const result = await entry.promise;
  if (result.kind === "ok") await writeSession(result.session);
  else if (result.kind === "refused") await clearSession();
  return result;
}

/** True when the access token has run out or is about to. */
export function expiresSoon(session: SessionPayload, aheadMs: number = REFRESH_AHEAD_MS): boolean {
  return session.expiresAt - Date.now() < aheadMs;
}
