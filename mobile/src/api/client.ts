import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type { TokenPair } from "@/types";

const baseURL = process.env.EXPO_PUBLIC_API_BASE ?? "http://10.0.2.2:8081/api/v1";

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

// Single-flight refresh: concurrent 401s share one refresh call.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!tokens.refreshToken) return null;
  if (!refreshing) {
    refreshing = axios
      .post<TokenPair>(
        `${baseURL}/auth/refresh`,
        { refreshToken: tokens.refreshToken },
        { headers: { "Content-Type": "application/json" } },
      )
      .then((r) => {
        tokenStore.set(r.data);
        onTokens(r.data);
        return r.data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
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
  return (await refreshAccessToken()) ?? tokens.accessToken;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retried && tokens.refreshToken) {
      original._retried = true;
      const fresh = await refreshAccessToken();
      if (fresh) {
        original.headers.set("Authorization", `Bearer ${fresh}`);
        return api.request(original);
      }
      tokenStore.clear();
      onAuthLost();
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
