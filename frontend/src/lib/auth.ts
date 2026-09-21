import { api } from "./api";
import type { AuthMeResponse } from "@/types/domain";

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login goes through the Next.js BFF (/api/auth/login) which sets the
 * HTTP-only session cookie. The browser never touches the JWT directly.
 */
export async function login(req: LoginRequest): Promise<AuthMeResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Login failed (${res.status})`);
  }
  return (await res.json()) as AuthMeResponse;
}

async function postJson(path: string, body: unknown, fallback: string): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message ?? `${fallback} (${res.status})`);
  }
}

/** Logged-in change; the BFF rotates the session cookie so this tab stays signed in. */
export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return postJson("/api/auth/change-password", { currentPassword, newPassword }, "Password change failed");
}

/** Step 1 of forgot-password: request an SMS code. Always resolves for unknown emails. */
export function forgotPassword(email: string): Promise<void> {
  return postJson("/api/auth/forgot-password", { email }, "Request failed");
}

/** Step 2: code from the SMS plus the new password. */
export function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  return postJson("/api/auth/reset-password", { email, code, newPassword }, "Reset failed");
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function fetchMe(): Promise<AuthMeResponse> {
  const r = await api.get<AuthMeResponse>("/auth/me");
  return r.data;
}

/**
 * Fetch a short-lived JWT for the WebSocket CONNECT frame. The backend
 * holds the long-lived refresh token; this endpoint mints a token bound
 * to the current session cookie. Cached in-memory until expiry.
 */
let cachedWsToken: { token: string; expiresAt: number } | null = null;

export async function fetchWsToken(): Promise<string> {
  const now = Date.now();
  if (cachedWsToken && cachedWsToken.expiresAt > now + 30_000) {
    return cachedWsToken.token;
  }
  const res = await fetch("/api/auth/ws-token", { credentials: "include" });
  if (!res.ok) throw new Error(`ws-token failed (${res.status})`);
  const data = (await res.json()) as { token: string; expiresIn: number };
  cachedWsToken = { token: data.token, expiresAt: now + data.expiresIn * 1000 };
  return data.token;
}
