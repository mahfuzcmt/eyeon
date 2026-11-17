"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, type StringKey } from "@/lib/i18n";
import { useGeofences } from "@/hooks/useGeofences";
import { useDevices } from "@/hooks/useDevices";
import { GeofenceEditor } from "@/components/geofence/GeofenceEditor";
import { formatDateTime, formatNumber } from "@/lib/format";
import { extractError } from "@/lib/api";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { ExpectedTimesDialog } from "@/components/geofence/ExpectedTimesDialog";
import { RoutesDialog } from "@/components/geofence/RoutesDialog";
import type { GeofenceCreate, GeofenceKind, GeofenceUpdate, GeofenceView, LatLng } from "@/types/domain";

function sameShape(a: LatLng[], b: LatLng[]): boolean {
  return a.length === b.length && a.every((p, i) => p.lat === b[i].lat && p.lng === b[i].lng);
}

/**
 * Editor output -> PATCH body. Geometry is sent only when it changed, because reshaping
 * a zone resets its arrived/left state on the server.
 */
function toPatch(before: GeofenceView, req: GeofenceCreate): GeofenceUpdate {
  const patch: GeofenceUpdate = { name: req.name, notifyOn: req.notifyOn, color: req.color };
  if (req.placeType) patch.placeType = req.placeType;
  // A newly searched address replaces the old one; a pin moved by hand has none (the editor
  // clears it), and a blank value clears it on the server, as on create.
  if ((req.address ?? "") !== (before.address ?? "")) patch.address = req.address ?? "";
  if (req.type === "CIRCLE" && req.center && req.radiusM != null) {
    const moved =
      before.type !== "CIRCLE" ||
      before.radiusM !== req.radiusM ||
      before.center?.lat !== req.center.lat ||
      before.center?.lng !== req.center.lng;
    if (moved) {
      patch.center = req.center;
      patch.radiusM = req.radiusM;
    }
  } else if (req.type === "POLYGON" && req.polygon) {
    if (before.type !== "POLYGON" || !sameShape(before.polygon, req.polygon)) patch.polygon = req.polygon;
  }
  return patch;
}

export default function Page() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { geofences: allGeofences, loading, error, create, update, remove, getAssignedDevices, assignDevices, unassignDevice } =
    useGeofences();
  const { devices } = useDevices();
  const [tab, setTab] = useState<GeofenceKind>("TRUSTED_PLACE");
  const geofences = useMemo(() => allGeofences.filter((g) => g.kind === tab), [allGeofences, tab]);
  const isPlaces = tab === "TRUSTED_PLACE";
  // null = closed, "new" = create for the current tab, otherwise the zone being edited.
  const [editor, setEditor] = useState<"new" | GeofenceView | null>(null);
  // From the map popup ("Add this location as ..."): where the new zone starts and who it is for.
  const [newStart, setNewStart] = useState<{ lat: number; lng: number; imei: string | null } | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const kind = p.get("new");
    const lat = parseFloat(p.get("lat") ?? "");
    const lng = parseFloat(p.get("lng") ?? "");
    if ((kind === "TRUSTED_PLACE" || kind === "BOUNDARY") && Number.isFinite(lat) && Number.isFinite(lng)) {
      setTab(kind);
      setNewStart({ lat, lng, imei: p.get("device") });
      setEditor("new");
      router.replace("/dashboard/geofences");
    }
  }, [router]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assigningGeofence, setAssigningGeofence] = useState<{ id: string; name: string } | null>(null);
  const [assignedImeis, setAssignedImeis] = useState<string[]>([]);
  const [selectedImeis, setSelectedImeis] = useState<Set<string>>(new Set());
  const [assignLoading, setAssignLoading] = useState(false);
  // Save sends added and removed people against the loaded list, so it waits for that list.
  const [assignLoaded, setAssignLoaded] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  /** Shown at the top of the dialog, e.g. right after a place was created. */
  const [assignNotice, setAssignNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // A zone whose count could not be loaded has no entry: "nobody assigned" is only shown when known.
  const [deviceCounts, setDeviceCounts] = useState<Record<string, number>>({});
  const [deviceSearch, setDeviceSearch] = useState("");
  const [timesFor, setTimesFor] = useState<GeofenceView | null>(null);
  const [routesFor, setRoutesFor] = useState<GeofenceView | null>(null);

  // Load device counts for all geofences
  useEffect(() => {
    async function loadCounts() {
      const counts: Record<string, number> = {};
      for (const g of allGeofences) {
        try {
          const imeis = await getAssignedDevices(g.id);
          counts[g.id] = imeis.length;
        } catch {
          // unknown, not zero
        }
      }
      setDeviceCounts(counts);
    }
    if (allGeofences.length > 0) {
      loadCounts();
    }
  }, [allGeofences, getAssignedDevices]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${t("common.delete")} "${name}"?`)) return;
    setBusyId(id);
    setActionError(null);
    try {
      await remove(id);
    } catch (err) {
      setActionError(`${t("common.deleteFailed")} "${name}": ${extractError(err).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const openAssignDialog = async (geofence: { id: string; name: string }, notice: string | null = null) => {
    setAssigningGeofence(geofence);
    setAssignLoading(true);
    setAssignLoaded(false);
    setAssignError(null);
    setAssignNotice(notice);
    setDeviceSearch("");
    try {
      const imeis = await getAssignedDevices(geofence.id);
      setAssignedImeis(imeis);
      setSelectedImeis(new Set(imeis));
      setAssignLoaded(true);
    } catch (err) {
      setAssignedImeis([]);
      setSelectedImeis(new Set());
      setAssignError(`${t("geo.assignLoadFailed")} ${extractError(err).message}`);
    } finally {
      setAssignLoading(false);
    }
  };

  const closeAssignDialog = () => {
    setAssigningGeofence(null);
    setAssignNotice(null);
    setAssignError(null);
  };
  useEscapeKey(closeAssignDialog, assigningGeofence !== null && !assignLoading);

  const toggleDevice = (imei: string) => {
    setSelectedImeis((prev) => {
      const next = new Set(prev);
      if (next.has(imei)) {
        next.delete(imei);
      } else {
        next.add(imei);
      }
      return next;
    });
  };

  // Filter devices based on search
  const filteredDevices = devices.filter((d) => {
    if (!deviceSearch.trim()) return true;
    const q = deviceSearch.toLowerCase();
    return (
      d.imei.toLowerCase().includes(q) ||
      (d.name?.toLowerCase().includes(q)) ||
      (d.vehiclePlate?.toLowerCase().includes(q))
    );
  });

  // Select all / Deselect all act on the people the search currently shows.
  const selectAllDevices = () => {
    setSelectedImeis((prev) => new Set([...prev, ...filteredDevices.map((d) => d.imei)]));
  };

  const deselectAllDevices = () => {
    setSelectedImeis((prev) => {
      const next = new Set(prev);
      for (const d of filteredDevices) next.delete(d.imei);
      return next;
    });
  };

  const allDevicesSelected = filteredDevices.length > 0 && filteredDevices.every((d) => selectedImeis.has(d.imei));

  const handleSaveAssignment = async () => {
    if (!assigningGeofence || !assignLoaded) return;
    setAssignLoading(true);
    setAssignError(null);
    try {
      // assignDevices only adds, so people who were unticked have to be removed one by one.
      const added = Array.from(selectedImeis).filter((imei) => !assignedImeis.includes(imei));
      const removed = assignedImeis.filter((imei) => !selectedImeis.has(imei));
      if (added.length > 0) await assignDevices(assigningGeofence.id, added);
      for (const imei of removed) await unassignDevice(assigningGeofence.id, imei);
      setDeviceCounts((prev) => ({ ...prev, [assigningGeofence.id]: selectedImeis.size }));
      closeAssignDialog();
    } catch (err) {
      setAssignError(`${t("geo.assignSaveFailed")} ${extractError(err).message}`);
      // Some changes may have been applied: show what the server has now.
      try {
        const imeis = await getAssignedDevices(assigningGeofence.id);
        setAssignedImeis(imeis);
        setDeviceCounts((prev) => ({ ...prev, [assigningGeofence.id]: imeis.length }));
      } catch {
        setAssignLoaded(false);
      }
    } finally {
      setAssignLoading(false);
    }
  };

  /** Visible marks for a zone that cannot alert anyone: alerts switched off, or nobody assigned. */
  const silentBadges = (g: GeofenceView) => (
    <>
      {g.notifyOn === "NONE" && (
        <span className="rounded-full border border-alarm-amber/50 bg-sun-100 px-2 py-0.5 text-[13px] font-semibold text-ink-900">
          {t("place.badgeAlertsOff")}
        </span>
      )}
      {deviceCounts[g.id] === 0 && (
        <span className="rounded-full border border-alarm-amber/50 bg-sun-100 px-2 py-0.5 text-[13px] font-semibold text-ink-900">
          {t("place.badgeNobody")}
        </span>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-surface-300 px-4 py-3">
        <h1 className="font-display text-lg font-semibold">{isPlaces ? t("place.tab") : t("geo.title")}</h1>
        <button type="button" className="btn-primary" onClick={() => setEditor("new")}>
          {isPlaces ? t("place.add") : t("geo.new")}
        </button>
      </div>

      <div className="tab-bar" role="tablist">
        {(["TRUSTED_PLACE", "BOUNDARY"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? "tab-item-active" : "tab-item"}
            onClick={() => setTab(k)}
          >
            {k === "TRUSTED_PLACE" ? t("place.tab") : t("geo.tabBoundaries")}
            <span className="text-ink-400">{allGeofences.filter((g) => g.kind === k).length}</span>
          </button>
        ))}
      </div>
      <p className="border-b border-surface-200 bg-surface-50 px-4 py-2.5 text-[14px] text-ink-500">
        {isPlaces ? t("place.hint") : t("geo.boundariesHint")}
      </p>

      <div className="flex-1 overflow-auto">
        {loading && <div className="px-4 py-6 text-[15px] text-ink-400">{t("common.loading")}</div>}
        {error && <div className="px-4 py-6 text-[15px] text-alarm-red">{error}</div>}
        {actionError && (
          <div className="flex items-start justify-between gap-3 border-b border-alarm-red/30 bg-alarm-red/5 px-4 py-2.5 text-[15px] text-alarm-red" role="alert">
            <span>{actionError}</span>
            <button type="button" className="btn-icon shrink-0 text-[18px]" aria-label={t("common.close")} onClick={() => setActionError(null)}>
              ×
            </button>
          </div>
        )}
        {!loading && geofences.length === 0 && (
          <div className="px-4 py-12 text-center text-[15px] text-ink-500">
            {isPlaces ? t("place.none") : t("common.empty")}
          </div>
        )}

        {geofences.length > 0 && (
          <ul className="space-y-2 p-3 lg:hidden">
            {geofences.map((g) => (
              <li key={g.id} className="space-y-1.5 rounded-lg border border-surface-300 bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: g.color }} />
                  <span className="min-w-0 truncate font-medium text-ink-900">{g.name}</span>
                </div>
                {(g.notifyOn === "NONE" || deviceCounts[g.id] === 0) && (
                  <div className="flex flex-wrap gap-1.5">{silentBadges(g)}</div>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[14px] text-ink-700">
                  <span>
                    {isPlaces
                      ? t(`place.type.${g.placeType ?? "OTHER"}` as StringKey)
                      : g.type === "CIRCLE" ? t("geo.circle") : t("geo.polygon")}
                  </span>
                  <span>
                    {isPlaces
                      ? t(`place.alerts.${g.notifyOn}` as StringKey)
                      : t(({ ENTER: "geo.notifyEnter", EXIT: "geo.notifyExit", BOTH: "geo.notifyBoth", NONE: "geo.notifyNone" } as const)[g.notifyOn])}
                  </span>
                  <span>
                    {g.radiusM
                      ? `${formatNumber(g.radiusM, locale)} ${t("geo.unitM")}`
                      : t("route.points").replace("{n}", formatNumber(g.polygon.length, locale))}
                  </span>
                </div>
                {g.address && <div className="truncate text-[14px] text-ink-500">{g.address}</div>}
                <div className="-mx-1 flex flex-wrap items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    className="btn-ghost px-2 text-[14px]"
                    onClick={() => openAssignDialog({ id: g.id, name: g.name })}
                  >
                    {t("geo.people")}: {deviceCounts[g.id] != null ? formatNumber(deviceCounts[g.id], locale) : "—"}
                  </button>
                  {isPlaces && (
                    <>
                      <button type="button" className="btn-ghost px-2 text-[14px]" onClick={() => setTimesFor(g)}>
                        {t("place.times")}
                      </button>
                      <button type="button" className="btn-ghost px-2 text-[14px]" onClick={() => setRoutesFor(g)}>
                        {t("route.title")}
                      </button>
                    </>
                  )}
                  <button type="button" className="btn-ghost px-2 text-[14px]" onClick={() => setEditor(g)}>
                    {t("common.edit")}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2 text-[14px] text-alarm-red"
                    disabled={busyId === g.id}
                    onClick={() => handleDelete(g.id, g.name)}
                  >
                    {busyId === g.id ? t("common.loading") : t("common.delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {geofences.length > 0 && (
          <table className="hidden w-full min-w-[640px] text-[15px] lg:table">
            <thead className="sticky top-0 z-10 bg-white text-left text-[14px] uppercase text-ink-400">
              <tr>
                <th className="px-4 py-2">{t("geo.name")}</th>
                <th className="px-4 py-2">{isPlaces ? t("place.type") : t("geo.shape")}</th>
                <th className="px-4 py-2">{t("geo.notifyOn")}</th>
                <th className="px-4 py-2">{t("geo.radius")}</th>
                <th className="px-4 py-2">{t("geo.people")}</th>
                <th className="px-4 py-2">{t("geo.created")}</th>
                <th className="px-4 py-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {geofences.map((g) => (
                <tr key={g.id} className="border-b border-surface-200 hover:bg-surface-50">
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: g.color }}
                      />
                      <span className="font-medium text-ink-900">{g.name}</span>
                      {silentBadges(g)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-ink-800">
                    {isPlaces
                      ? t(`place.type.${g.placeType ?? "OTHER"}` as StringKey)
                      : g.type === "CIRCLE" ? t("geo.circle") : t("geo.polygon")}
                  </td>
                  <td className="px-4 py-2 text-ink-800">
                    {isPlaces
                      ? t(`place.alerts.${g.notifyOn}` as StringKey)
                      : t(({ ENTER: "geo.notifyEnter", EXIT: "geo.notifyExit", BOTH: "geo.notifyBoth", NONE: "geo.notifyNone" } as const)[g.notifyOn])}
                  </td>
                  <td className="px-4 py-2 text-ink-800">
                    {g.radiusM
                      ? `${formatNumber(g.radiusM, locale)} ${t("geo.unitM")}`
                      : t("route.points").replace("{n}", formatNumber(g.polygon.length, locale))}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded bg-white px-2 py-1 text-[14px] text-ink-800 hover:bg-surface-200"
                      onClick={() => openAssignDialog({ id: g.id, name: g.name })}
                    >
                      <span>{deviceCounts[g.id] != null ? formatNumber(deviceCounts[g.id], locale) : "—"}</span>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-4 py-2 text-ink-800">{formatDateTime(g.createdAt, locale)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    {isPlaces && (
                      <>
                        <button type="button" className="btn-ghost" onClick={() => setTimesFor(g)}>
                          {t("place.times")}
                        </button>
                        <button type="button" className="btn-ghost" onClick={() => setRoutesFor(g)}>
                          {t("route.title")}
                        </button>
                      </>
                    )}
                    <button type="button" className="btn-ghost" onClick={() => setEditor(g)}>
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={busyId === g.id}
                      onClick={() => handleDelete(g.id, g.name)}
                    >
                      {busyId === g.id ? t("common.loading") : t("common.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editor && (
        <GeofenceEditor
          key={editor === "new" ? `new-${tab}` : editor.id}
          kind={editor === "new" ? tab : editor.kind}
          initial={editor === "new" ? undefined : editor}
          start={editor === "new" && newStart ? { lat: newStart.lat, lng: newStart.lng } : undefined}
          onCancel={() => {
            setEditor(null);
            setNewStart(null);
          }}
          onSubmit={async (req) => {
            if (editor !== "new") {
              await update(editor.id, toPatch(editor, req));
              setEditor(null);
              setNewStart(null);
              return;
            }
            const forImei = newStart?.imei ?? null;
            const created = await create(req);
            // The zone exists from here on: the editor closes whatever happens next, so a
            // second Save can never create it again.
            setEditor(null);
            setNewStart(null);
            const zone = { id: created.id, name: created.name };
            if (!forImei) {
              // Added from this page: it is for nobody yet, and a zone for nobody never alerts.
              setDeviceCounts((prev) => ({ ...prev, [created.id]: 0 }));
              void openAssignDialog(zone, t("geo.assignAfterCreate"));
              return;
            }
            // Started from a person's popup: the zone is for that person.
            try {
              await assignDevices(created.id, [forImei]);
              setDeviceCounts((prev) => ({ ...prev, [created.id]: 1 }));
            } catch {
              setDeviceCounts((prev) => ({ ...prev, [created.id]: 0 }));
              void openAssignDialog(zone, t("geo.assignFailed"));
            }
          }}
        />
      )}

      {timesFor && <ExpectedTimesDialog place={timesFor} onClose={() => setTimesFor(null)} />}
      {routesFor && <RoutesDialog place={routesFor} onClose={() => setRoutesFor(null)} />}

      {/* Device Assignment Dialog */}
      {assigningGeofence && (
        <div className="fixed inset-0 z-[2400] flex items-end justify-center bg-ink-950/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-lg sm:p-6">
            <h2 className="mb-1 text-lg font-semibold text-ink-900">
              {t("geo.assignPeople")}
            </h2>
            <p className="mb-4 text-[15px] text-ink-400">
              {assigningGeofence.name}
            </p>
            {assignNotice && (
              <p className="mb-3 rounded-lg border border-alarm-amber/50 bg-sun-100 px-3 py-2 text-[14px] text-ink-900" role="status">
                {assignNotice}
              </p>
            )}

            {assignLoading ? (
              <div className="py-8 text-center text-[15px] text-ink-400">{t("common.loading")}</div>
            ) : (
              <>
                {/* Search and Select All */}
                {assignLoaded && devices.length > 0 && (
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        className="input flex-1 text-[15px]"
                        placeholder={t("common.searchPlaceholder")}
                        value={deviceSearch}
                        onChange={(e) => setDeviceSearch(e.target.value)}
                      />
                      <button
                        type="button"
                        className="ml-2 min-h-[40px] whitespace-nowrap px-1 text-[14px] text-brand-600 hover:text-brand-500 disabled:text-ink-400"
                        onClick={allDevicesSelected ? deselectAllDevices : selectAllDevices}
                        disabled={filteredDevices.length === 0}
                      >
                        {allDevicesSelected ? t("common.deselectAll") : t("common.selectAll")}
                      </button>
                    </div>
                  </div>
                )}

                {assignLoaded && (
                <div className="max-h-80 min-h-0 flex-1 overflow-y-auto rounded border border-surface-300 bg-surface-50">
                  {devices.length === 0 ? (
                    <div className="py-6 text-center text-[15px] text-ink-400">
                      {t("common.empty")}
                    </div>
                  ) : filteredDevices.length === 0 ? (
                    <div className="py-6 text-center text-[15px] text-ink-500">
                      {t("veh.none")}
                    </div>
                  ) : (
                    <ul className="divide-y divide-surface-200">
                      {filteredDevices.map((d) => (
                        <li key={d.imei}>
                          {/* A label, not a click handler on the row: the row and the checkbox
                              both toggled, so a tap on the checkbox changed nothing. */}
                          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-100">
                          <input
                            type="checkbox"
                            checked={selectedImeis.has(d.imei)}
                            onChange={() => toggleDevice(d.imei)}
                            className="h-4 w-4 rounded border-surface-300 bg-white text-brand-500 focus:ring-brand-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium text-ink-900">
                              {d.name || d.vehiclePlate || d.imei}
                            </div>
                            <div className="truncate text-[14px] text-ink-400">
                              {d.vehiclePlate && d.name ? d.vehiclePlate : d.imei}
                            </div>
                          </div>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              d.status === "ONLINE" ? "bg-alarm-green" : "bg-ink-400"
                            }`}
                          />
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                )}
              </>
            )}

            {assignError && !assignLoading && (
              <div className="mt-3 rounded-lg border border-alarm-red/40 bg-alarm-red/5 p-3 text-[14px] text-alarm-red" role="alert">
                <div>{assignError}</div>
                {!assignLoaded && (
                  <button type="button" className="btn-ghost mt-2 px-3 text-[14px]" onClick={() => void openAssignDialog(assigningGeofence, assignNotice)}>
                    {t("common.retry")}
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[15px] text-ink-400">
                {formatNumber(selectedImeis.size, locale)} / {formatNumber(devices.length, locale)} {t("geo.selected")}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost px-4 py-2 text-[15px]"
                  onClick={closeAssignDialog}
                  disabled={assignLoading}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  className="btn-primary px-4 py-2 text-[15px]"
                  onClick={handleSaveAssignment}
                  disabled={assignLoading || !assignLoaded}
                >
                  {assignLoading ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
