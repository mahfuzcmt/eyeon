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
      <div className="p-6 text-[14px] text-ink-400">
        Admin role required to view the audit log.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-surface-300 px-4 py-3">
        <h1 className="font-display text-lg font-semibold">{t("audit.title")}</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[13px]">
          <label className="flex items-center gap-1">
            <span className="text-ink-400">{t("common.from")}</span>
            <input
              type="date"
              className="input w-auto py-1"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              max={to}
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-ink-400">{t("common.to")}</span>
            <input
              type="date"
              className="input w-auto py-1"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from}
            />
          </label>
          <select
            className="input w-auto py-1"
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
        {loading && <div className="px-4 py-6 text-[14px] text-ink-400">{t("common.loading")}</div>}
        {error && <div className="px-4 py-6 text-[14px] text-alarm-red">{error}</div>}
        {!loading && entries.length === 0 && (
          <div className="px-4 py-12 text-center text-[14px] text-ink-400">{t("common.empty")}</div>
        )}

        {entries.length > 0 && (
          <table className="w-full min-w-[760px] text-[14px]">
            <thead className="sticky top-0 z-10 bg-white text-left text-[13px] uppercase text-ink-400">
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
                    <span className="rounded bg-surface-100 px-2 py-0.5 font-mono text-[13px]">
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-ink-800">
                    {e.resourceType && (
                      <>
                        <div className="text-[13px] text-ink-400">{e.resourceType}</div>
                        <div className="font-mono text-[13px]">{e.resourceId ?? "—"}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-[13px] text-ink-800">
                    {e.userId ? e.userId.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-[13px] text-ink-800">
                    {e.ipAddress ?? "—"}
                  </td>
                  <td className="px-4 py-2 max-w-md">
                    {e.metadata && (
                      <pre className="overflow-x-auto rounded bg-surface-100 p-2 font-mono text-[12px] text-ink-800">
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
