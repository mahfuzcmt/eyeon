import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { translate } from "@/i18n";
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

let onTokens: (pair: TokenPair) => void | Promise<void> = () => {};
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
  /** True while a refresh token is held, i.e. the session has not been ended. */
  hasSession(): boolean {
    return tokens.refreshToken !== null;
  },
  /** AuthContext registers persistence + sign-out reactions. */
  bind(handlers: { onTokens: (p: TokenPair) => void | Promise<void>; onAuthLost: () => void }) {
    onTokens = handlers.onTokens;
    onAuthLost = handlers.onAuthLost;
  },
};

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

// The access token lives an hour. It is renewed here, before a request goes out with one that
// has run out or is about to (shared with every request waiting at that moment), so a signed-in
// user never sees a refused request because of it. The 401 handling below stays as the net for
// a token the server no longer accepts for another reason. When the server cannot be reached
// the request goes out with the token there is; it would have failed either way.
api.interceptors.request.use(async (config) => {
  const token = await freshAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
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

/**
 * The backend's own refusals of a refresh token (AuthService.refresh, GlobalExceptionHandler):
 * 401 INVALID_REFRESH / REFRESH_REVOKED / REFRESH_EXPIRED, 403 ACCOUNT_INACTIVE, and 422
 * USER_NOT_FOUND (the account was deleted).
 */
const REFRESH_REJECTED_CODES = new Set([
  "INVALID_REFRESH",
  "REFRESH_REVOKED",
  "REFRESH_EXPIRED",
  "ACCOUNT_INACTIVE",
  "USER_NOT_FOUND",
]);

/**
 * Only the backend saying so in its own words ends the session. Until 2026-11-17 any 4xx did,
 * so a 400 / 404 or an HTML error page from the proxy while the backend was being deployed
 * signed people out. Those, like 408 / 429 / 5xx, now count as "unavailable" and are retried.
 */
function isDefinitiveRejection(err: unknown): boolean {
  if (!axios.isAxiosError(err) || !err.response) return false;
  const s = err.response.status;
  if (s !== 401 && s !== 403 && s !== 422) return false;
  const data: unknown = err.response.data;
  if (!data || typeof data !== "object") return false; // not the backend's JSON
  const error: unknown = (data as { error?: unknown }).error;
  if (!error || typeof error !== "object") return false;
  const code: unknown = (error as { code?: unknown }).code;
  return typeof code === "string" && REFRESH_REJECTED_CODES.has(code);
}

async function refreshOnce(refreshToken: string): Promise<TokenPair> {
  const r = await axios.post<TokenPair>(
    `${baseURL}/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" }, timeout: 20_000 },
  );
  // A 200 that is not a token pair (a proxy's page) must not replace the tokens we hold.
  const pair: unknown = r.data;
  if (
    !pair ||
    typeof pair !== "object" ||
    typeof (pair as TokenPair).accessToken !== "string" ||
    typeof (pair as TokenPair).refreshToken !== "string"
  ) {
    throw new Error("refresh answered without a token pair");
  }
  return pair as TokenPair;
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
          // Saved before anything uses the new pair, so an app killed right after a refresh
          // reopens with the token the server expects (the server also forgives the old one
          // while the new one is unused, V34).
          try {
            await onTokens(pair);
          } catch {
            /* keep the session in memory; the next refresh saves again */
          }
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
 * The server refused the refresh token: the session is over. The refresh token is dropped at
 * once, so nothing tries to refresh again; an access token that has not run out yet is kept for
 * the moment, because AuthContext.doSignOut first unregisters this phone's push token (which
 * needs the header) and then clears everything. Until 2026-11-17 both were cleared here first,
 * so that call got a 401 and the phone kept receiving the old account's alerts.
 */
function endSession(): void {
  const access = tokens.accessToken;
  const exp = access ? jwtExpiry(access) : null;
  tokens.refreshToken = null;
  if (exp === null || exp * 1000 <= Date.now()) tokens.accessToken = null;
  onAuthLost();
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
    endSession();
    return null;
  }
  return tokens.accessToken;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;

    // 401 = the access token is not accepted. A 403 counts the same when our access token has
    // in fact run out: backends before 2026-11-17 answered an expired token with 403, and the
    // app then showed "Request failed with status code 403" on every screen for half a minute.
    const access = tokens.accessToken;
    const exp = access ? jwtExpiry(access) : null;
    const expired = status === 403 && (exp === null || exp * 1000 <= Date.now());
    if ((status === 401 || expired) && original && !original._retried && tokens.refreshToken) {
      original._retried = true;
      const r = await refreshAccessToken();
      if (r.ok) {
        original.headers.set("Authorization", `Bearer ${r.accessToken}`);
        return api.request(original);
      }
      // Only a definitive refusal ends the session; a network failure keeps the tokens so the
      // next request (the app polls every 10 s) tries again.
      if (r.rejected) endSession();
    }
    // Several screens show `error.message` as it is; make it the server's own words or a plain
    // sentence, never "Request failed with status code 403".
    error.message = extractError(error).message;
    return Promise.reject(error);
  },
);

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  /** HTTP status when the server answered. */
  status?: number;
}

function nonEmpty(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * The error of a failed request, always with a message that can be shown. The API answers
 * `{ error: { code, message, details } }`; tracker commands answer 409 / 504 with
 * `{ ok: false, error: "Device offline: 123" }` (a plain string), which used to come back as
 * if it were the object and showed an empty "Error" popup.
 */
export function extractError(err: unknown): ApiError {
  const fallback = translate("common.requestFailed");
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data: unknown = err.response?.data;
    const raw: unknown = data && typeof data === "object" ? (data as { error?: unknown }).error : undefined;
    const text = nonEmpty(raw);
    if (text) return { code: "ERROR", message: text, status };
    if (raw && typeof raw === "object") {
      const e = raw as { code?: unknown; message?: unknown; details?: unknown };
      return {
        code: nonEmpty(e.code) ?? "ERROR",
        message: nonEmpty(e.message) ?? fallback,
        details: e.details && typeof e.details === "object" ? (e.details as Record<string, unknown>) : undefined,
        status,
      };
    }
    // Never axios's own "Request failed with status code 403" / "Network Error": say it in the
    // user's language.
    return { code: "NETWORK", message: err.response ? fallback : translate("common.offline"), status };
  }
  return { code: "UNKNOWN", message: nonEmpty(err instanceof Error ? err.message : String(err)) ?? fallback };
}
