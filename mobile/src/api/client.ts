import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type { TokenPair } from "@/types";

const baseURL = process.env.EXPO_PUBLIC_API_BASE ?? "http://10.0.2.2:8080/api/v1";

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
