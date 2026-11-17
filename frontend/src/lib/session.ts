// Server-only helpers used by Next.js route handlers (login proxy, BFF proxy)
// to read/write the HTTP-only session cookie holding the JWT pair.

import { cookies } from "next/headers";

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "eyeon_session";
const MAX_AGE = Number(process.env.SESSION_COOKIE_MAX_AGE ?? 86_400);

export interface SessionPayload {
  accessToken: string;
  refreshToken: string;
  userId: string;
  orgId: string;
  expiresAt: number; // epoch ms
}

export async function readSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const raw = c.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export async function writeSession(p: SessionPayload): Promise<void> {
  const c = await cookies();
  const encoded = Buffer.from(JSON.stringify(p), "utf8").toString("base64url");
  c.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",  // Only secure over HTTPS
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export function backendBase(): string {
  return process.env.BACKEND_BASE ?? "http://localhost:8081";
}

/**
 * The visitor's address for a backend call made on their behalf, as the header the backend's
 * login and password-reset limits read (`X-Real-IP`, set by nginx in front of this app).
 * Without it every web login reaches the backend from this container's own address and all
 * web users share one "20 failures per address" allowance.
 */
export function visitorAddressHeader(req: { headers: Headers }): Record<string, string> {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return { "X-Real-IP": real };
  // nginx appends the address it saw: the last entry is the one we can trust.
  const last = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return last ? { "X-Real-IP": last } : {};
}
