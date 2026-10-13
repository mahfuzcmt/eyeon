"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session-context";
import { useAuditLog } from "@/hooks/useAuditLog";
import { formatDateTime } from "@/lib/format";

const KNOWN_ACTIONS = [
  "AUTH_LOGIN",
  "ORG_UPDATE",
  "USER_CREATE",
  "USER_UPDATE",
  "USER_DISABLE",
  "GEOFENCE_CREATE",
  "GEOFENCE_DELETE",
  "GEOFENCE_ASSIGN",
  "GEOFENCE_UNASSIGN",
  "ALARM_ACKNOWLEDGE",
  "DEVICE_CMD_CUT_FUEL",
  "DEVICE_CMD_RESTORE_FUEL",
  "DEVICE_CMD_QUERY_ADDRESS",
  "DEVICE_CMD_RAW",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function Page() {
  const { t, locale } = useLocale();
  const { role } = useSession();
  const isAdmin = role === "ORG_ADMIN" || role === "SUPER_ADMIN";

  const [from, setFrom] = useState(weekAgoIso());
  const [to, setTo] = useState(todayIso());
  const [action, setAction] = useState("");

  const fromIso = useMemo(() => `${from}T00:00:00Z`, [from]);
  const toIso = useMemo(() => `${to}T23:59:59Z`, [to]);

  const { entries, loading, error } = useAuditLog({
    fromIso,
    toIso,
    action: action || undefined,
    limit: 200,
  });

  if (!isAdmin) {
    return (
      <div className="p-6 text-[15px] text-ink-400">
        Admin role required to view the audit log.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-surface-300 px-4 py-3">
        <h1 className="font-display text-lg font-semibold">{t("audit.title")}</h1>
        <div className="grid w-full grid-cols-2 items-center gap-2 text-[14px] sm:ml-auto sm:flex sm:w-auto sm:flex-wrap">
          <label className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-1">
            <span className="text-ink-500">{t("common.from")}</span>
            <input
              type="date"
              className="input w-full min-w-0 py-1 sm:w-auto"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              max={to}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-1">
            <span className="text-ink-500">{t("common.to")}</span>
            <input
              type="date"
              className="input w-full min-w-0 py-1 sm:w-auto"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from}
            />
          </label>
          <select
            className="input col-span-2 w-full py-1 sm:w-auto"
            aria-label={t("audit.action")}
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">{t("audit.allActions")}</option>
            {KNOWN_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && <div className="px-4 py-6 text-[15px] text-ink-400">{t("common.loading")}</div>}
        {error && <div className="px-4 py-6 text-[15px] text-alarm-red">{error}</div>}
        {!loading && entries.length === 0 && (
          <div className="px-4 py-12 text-center text-[15px] text-ink-400">{t("common.empty")}</div>
        )}

        {entries.length > 0 && (
          <ul className="space-y-2 p-3 lg:hidden">
            {entries.map((e) => (
              <li key={e.id} className="space-y-1.5 rounded-lg border border-surface-300 bg-white p-3 text-[14px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded bg-surface-100 px-2 py-0.5 font-mono text-[13px] text-ink-800">{e.action}</span>
                  <span className="text-ink-500">{formatDateTime(e.ts, locale)}</span>
                </div>
                {e.resourceType && (
                  <div className="text-ink-700">
                    {e.resourceType} · <span className="break-all font-mono">{e.resourceId ?? "—"}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-x-3 font-mono text-[13px] text-ink-500">
                  <span>{t("audit.actor")}: {e.userId ? e.userId.slice(0, 8) : "—"}</span>
                  <span>{t("audit.ip")}: {e.ipAddress ?? "—"}</span>
                </div>
                {e.metadata && (
                  <pre className="max-h-40 overflow-auto rounded bg-surface-100 p-2 font-mono text-[13px] text-ink-800">
                    {prettyJson(e.metadata)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}

        {entries.length > 0 && (
          <table className="hidden w-full min-w-[760px] text-[15px] lg:table">
            <thead className="sticky top-0 z-10 bg-white text-left text-[14px] uppercase text-ink-400">
              <tr>
                <th className="px-4 py-2">{t("audit.when")}</th>
                <th className="px-4 py-2">{t("audit.action")}</th>
                <th className="px-4 py-2">{t("audit.resource")}</th>
                <th className="px-4 py-2">{t("audit.actor")}</th>
                <th className="px-4 py-2">{t("audit.ip")}</th>
                <th className="px-4 py-2">{t("audit.metadata")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-surface-200 hover:bg-surface-50 align-top">
                  <td className="whitespace-nowrap px-4 py-2 text-ink-800">
                    {formatDateTime(e.ts, locale)}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-surface-100 px-2 py-0.5 font-mono text-[14px]">
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-ink-800">
                    {e.resourceType && (
                      <>
                        <div className="text-[14px] text-ink-400">{e.resourceType}</div>
                        <div className="font-mono text-[14px]">{e.resourceId ?? "—"}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-[14px] text-ink-800">
                    {e.userId ? e.userId.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-[14px] text-ink-800">
                    {e.ipAddress ?? "—"}
                  </td>
                  <td className="px-4 py-2 max-w-md">
                    {e.metadata && (
                      <pre className="overflow-x-auto rounded bg-surface-100 p-2 font-mono text-[13px] text-ink-800">
                        {prettyJson(e.metadata)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function prettyJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
