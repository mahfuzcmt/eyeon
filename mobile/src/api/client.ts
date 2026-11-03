import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type { TokenPair } from "@/types";

const baseURL = process.env.EXPO_PUBLIC_API_BASE ?? "http://10.0.2.2:8081/api/v1";
/** The API base URL, for building absolute URLs of public files (e.g. sponsor ad images). */
export const API_BASE = baseURL;

/**
 * In-memory token holder, decoupled from React so the axios interceptors can
 * read/refresh tokens without hooks. AuthContext keeps this in sync with
 * SecureStore and registers the two callbacks below.
 */
interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
}
const tokens: TokenState = { accessToken: null, refreshToken: null };

let onTokens: (pair: TokenPair) => void = () => {};
let onAuthLost: () => void = () => {};

export const tokenStore = {
  set(pair: TokenPair) {
    tokens.accessToken = pair.accessToken;
    tokens.refreshToken = pair.refreshToken;
  },
  /** Swap in a new pair (e.g. after a password change) and persist it like a refresh would. */
  replace(pair: TokenPair) {
    tokens.accessToken = pair.accessToken;
    tokens.refreshToken = pair.refreshToken;
    onTokens(pair);
  },
  clear() {
    tokens.accessToken = null;
    tokens.refreshToken = null;
  },
  getAccess(): string | null {
    return tokens.accessToken;
  },
  /** AuthContext registers persistence + sign-out reactions. */
  bind(handlers: { onTokens: (p: TokenPair) => void; onAuthLost: () => void }) {
    onTokens = handlers.onTokens;
    onAuthLost = handlers.onAuthLost;
  },
};

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  if (tokens.accessToken) {
    config.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
  }
  return config;
});

/**
 * Result of a refresh attempt. "rejected" means the server definitively refused the refresh
 * token (revoked, expired, unknown) and the user must sign in again; "unavailable" means the
 * server could not be reached or failed (no network, timeout, 5xx, 429), which says nothing
 * about the session. Until 2026-11-01 both signed the user out, so a parent whose phone was on
 * a weak connection when the hourly access token ran out was logged out of the app.
 */
type RefreshOutcome = { ok: true; accessToken: string } | { ok: false; rejected: boolean };

// Single-flight refresh: concurrent 401s share one refresh call.
let refreshing: Promise<RefreshOutcome> | null = null;

const REFRESH_ATTEMPTS = 3;

function isDefinitiveRejection(err: unknown): boolean {
  if (!axios.isAxiosError(err) || !err.response) return false;
  const s = err.response.status;
  return s >= 400 && s < 500 && s !== 408 && s !== 429;
}

async function refreshOnce(refreshToken: string): Promise<TokenPair> {
  const r = await axios.post<TokenPair>(
    `${baseURL}/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" }, timeout: 20_000 },
  );
  return r.data;
}

async function refreshAccessToken(): Promise<RefreshOutcome> {
  const refreshToken = tokens.refreshToken;
  if (!refreshToken) return { ok: false, rejected: true };
  if (!refreshing) {
    refreshing = (async (): Promise<RefreshOutcome> => {
      for (let attempt = 0; attempt < REFRESH_ATTEMPTS; attempt++) {
        try {
          const pair = await refreshOnce(refreshToken);
          tokenStore.set(pair);
          onTokens(pair);
          return { ok: true, accessToken: pair.accessToken };
        } catch (err) {
          if (isDefinitiveRejection(err)) return { ok: false, rejected: true };
          if (attempt < REFRESH_ATTEMPTS - 1) await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
        }
      }
      return { ok: false, rejected: false };
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** Seconds since the epoch at which a JWT expires, or null when it cannot be read. */
function jwtExpiry(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part || typeof atob !== "function") return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

/**
 * An access token that is still valid for at least a minute, refreshing it first when needed.
 * For the WebSocket CONNECT frame, which (unlike REST) has no 401-and-retry: a socket that
 * reconnected with the expired token from an hour ago was refused, and live updates stopped.
 */
export async function freshAccessToken(): Promise<string | null> {
  const current = tokens.accessToken;
  if (current) {
    const exp = jwtExpiry(current);
    if (exp === null || exp * 1000 - Date.now() > 60_000) return current;
  }
  if (!tokens.refreshToken) return tokens.accessToken; // signed out (or signing out)
  const r = await refreshAccessToken();
  if (r.ok) return r.accessToken;
  if (r.rejected) {
    tokenStore.clear();
    onAuthLost();
    return null;
  }
  return tokens.accessToken;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retried && tokens.refreshToken) {
      original._retried = true;
      const r = await refreshAccessToken();
      if (r.ok) {
        original.headers.set("Authorization", `Bearer ${r.accessToken}`);
        return api.request(original);
      }
      // Only a definitive refusal ends the session; a network failure keeps the tokens so the
      // next request (the app polls every 10 s) tries again.
      if (r.rejected) {
        tokenStore.clear();
        onAuthLost();
      }
    }
    return Promise.reject(error);
  },
);

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function extractError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: ApiError } | undefined;
    if (data?.error) return data.error;
    return { code: "NETWORK", message: err.message };
  }
  return { code: "UNKNOWN", message: String(err) };
}
