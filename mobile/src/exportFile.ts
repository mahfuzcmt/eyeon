import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, freshAccessToken } from "@/api/client";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const CSV_MIME = "text/csv";

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

/** Keeps a server-supplied file name safe for the cache directory. */
function safeName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "export";
}

/**
 * Downloads a report from the API with the user's bearer token (the export endpoints
 * are not public) into the app cache, then opens the system share sheet so the carer
 * can save it, open it in a spreadsheet app or send it on.
 */
export async function downloadAndShare(
  path: string,
  params: Record<string, string | undefined>,
  fallbackName: string,
  mimeType: string,
  dialogTitle: string,
): Promise<void> {
  const token = await freshAccessToken();
  const query = Object.entries(params)
    .filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const base = (api.defaults.baseURL ?? "").replace(/\/$/, "");
  const url = `${base}${path}${query ? `?${query}` : ""}`;

  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new Error("No cache directory");
  const tmp = `${dir}${safeName(fallbackName)}`;

  const res = await FileSystem.downloadAsync(url, tmp, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status < 200 || res.status >= 300) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await FileSystem.readAsStringAsync(res.uri);
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // keep the status line
    }
    await FileSystem.deleteAsync(res.uri, { idempotent: true });
    throw new Error(message);
  }

  // Use the server's file name when it gives one.
  let fileUri = res.uri;
  const cd = headerValue(res.headers, "content-disposition");
  const match = cd?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (match?.[1]) {
    const named = `${dir}${safeName(decodeURIComponent(match[1]))}`;
    if (named !== fileUri) {
      await FileSystem.deleteAsync(named, { idempotent: true });
      await FileSystem.moveAsync({ from: fileUri, to: named });
      fileUri = named;
    }
  }

  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device");
  await Sharing.shareAsync(fileUri, {
    mimeType,
    dialogTitle,
    UTI: mimeType === XLSX_MIME ? "org.openxmlformats.spreadsheetml.sheet" : "public.comma-separated-values-text",
  });
}
