// Server-only helpers used by Next.js route handlers (login proxy, BFF proxy)
// to read/write the HTTP-only session cookie holding the JWT pair.

import { cookies } from "next/headers";

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "pp_session";
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
  return process.env.BACKEND_BASE ?? "http://localhost:8080";
}
