import axios, { AxiosError, AxiosInstance } from "axios";

/**
 * Axios instance for browser → Next.js BFF proxy. The proxy forwards to the
 * Spring backend with the JWT pulled from the HTTP-only session cookie, so
 * no Authorization header is set here. 401 responses redirect to /login.
 */
const baseURL = process.env.NEXT_PUBLIC_API_BASE ?? "/api/proxy";

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      const path = window.location.pathname;
      if (!path.startsWith("/login")) {
        window.location.href = `/login?next=${encodeURIComponent(path)}`;
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
