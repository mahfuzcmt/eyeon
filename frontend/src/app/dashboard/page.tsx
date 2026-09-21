"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useDevices } from "@/hooks/useDevices";
import { useDeviceGroups } from "@/hooks/useDeviceGroups";
import { useDrivers } from "@/hooks/useDrivers";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { useSession } from "@/lib/session-context";
import { useLocale } from "@/lib/i18n";
import { useIsDesktop, useIsWide } from "@/hooks/useMediaQuery";
import { DeviceList, type VehicleAction } from "@/components/device/DeviceList";
import { CommandSheet } from "@/components/device/CommandSheet";
import { DeviceEditModal } from "@/components/device/DeviceEditModal";
import { DeviceGroupModal } from "@/components/device/DeviceGroupModal";
import { ShareLinkModal } from "@/components/share/ShareLinkModal";
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import type { DeviceGroupView, DeviceView, LocationView } from "@/types/domain";
import type { LiveLocationView } from "@/hooks/useLiveLocations";

// Map + map-bound panels touch window/document at import time → client-only.
const RouteHistoryPanel = dynamic(
  () => import("@/components/device/RouteHistoryPanel").then((m) => m.RouteHistoryPanel),
  { ssr: false },
);
const LiveTrackingPanel = dynamic(
  () => import("@/components/map/LiveTrackingPanel").then((m) => m.LiveTrackingPanel),
  { ssr: false },
);
const FleetMap = dynamic(
  () => import("@/components/map/FleetMap").then((m) => m.FleetMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-surface-100" /> },
);

const LIST_WIDTH = 340;
const LIST_GAP = 12;
/** Height (px) of the mobile vehicle sheet's grab bar when the sheet is closed. */
const SHEET_BAR = 48;
/** Height reserved below `lg` for the full-width KPI strip (3-line cells) above the map controls. */
const NARROW_KPI_INSET = 78;

type Panel = "history" | "live" | "command" | "share" | "edit" | null;

export default function DashboardPage() {
  const router = useRouter();
  const { orgId } = useSession();
  const { t } = useLocale();
  const isDesktop = useIsDesktop();
  const isWide = useIsWide();
  const { devices, loading, setDevices } = useDevices();
  const { groups, createGroup, updateGroup, deleteGroup, assignDevices, unassignDevices } = useDeviceGroups();
  const [groupModal, setGroupModal] = useState<{ mode: "new" } | { mode: "edit"; group: DeviceGroupView } | null>(null);
  const { drivers } = useDrivers();
  const driversById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of drivers) m.set(d.id, d.name);
    return m;
  }, [drivers]);
  const { locations, error, refresh, lastRefreshAt, advanceAnimations } = useLiveLocations(orgId);

  const [selectedImei, setSelectedImei] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [listCollapsed, setListCollapsed] = useState(false);
  // Phones: the vehicle list is a bottom sheet, closed by default so the map is usable.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hiddenImeis, setHiddenImeis] = useState<Set<string>>(new Set());

  // Latest positions without re-binding event listeners on every tick.
  const locationsRef = useRef(locations);
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // Deep-link from the Vehicles screen / top-bar search: /dashboard?focus={imei}
  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (focus) setSelectedImei(focus);
  }, []);

  const runAction = useCallback(
    (action: VehicleAction, imei: string) => {
      setSelectedImei(imei);
      const loc = locationsRef.current.get(imei);
      switch (action) {
        case "playback": setPanel("history"); break;
        case "live": setPanel("live"); break;
        case "command": setPanel("command"); break;
        case "share": setPanel("share"); break;
        case "edit": setPanel("edit"); break;
        case "details": router.push(`/dashboard/devices/${imei}`); break;
        case "geofence": router.push(`/dashboard/geofences?device=${imei}`); break;
        case "navigate":
          if (loc) window.open(`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`, "_blank", "noopener");
          break;
        case "streetview":
          if (loc) window.open(`https://www.google.com/maps?q=&layer=c&cbll=${loc.latitude},${loc.longitude}`, "_blank", "noopener");
          break;
      }
    },
    [router],
  );

  // Popup-card action bar (rendered as raw HTML inside Leaflet) and the top-bar
  // search both talk to this page through window events.
  useEffect(() => {
    const onAction = (e: Event) => {
      const d = (e as CustomEvent<{ action: VehicleAction; imei: string }>).detail;
      if (d?.imei && d.action) runAction(d.action, d.imei);
    };
    const onFocus = (e: Event) => {
      const imei = (e as CustomEvent<string>).detail;
      if (imei) {
        setSelectedImei(imei);
        setPanel(null);
        setHiddenImeis((prev) => {
          if (!prev.has(imei)) return prev;
          const next = new Set(prev);
          next.delete(imei);
          return next;
        });
      }
    };
    window.addEventListener("vehicleAction", onAction);
    window.addEventListener("focusVehicle", onFocus);
    return () => {
      window.removeEventListener("vehicleAction", onAction);
      window.removeEventListener("focusVehicle", onFocus);
    };
  }, [runAction]);

  const selectedDevice = selectedImei ? devices.find((d) => d.imei === selectedImei) ?? null : null;

  const visibleLocations = useMemo(() => {
    if (hiddenImeis.size === 0) return locations;
    const m = new Map<string, LocationView | LiveLocationView>();
    for (const [imei, loc] of locations) if (!hiddenImeis.has(imei)) m.set(imei, loc);
    return m;
  }, [locations, hiddenImeis]);

  const liveOnlineCount = devices.filter((d) => d.status === "ONLINE").length;
  const liveOfflineCount = devices.filter((d) => d.status === "OFFLINE").length;

  const onDeviceSaved = (saved: DeviceView) => {
    setDevices((prev) => prev.map((d) => (d.imei === saved.imei ? saved : d)));
    setPanel(null);
  };

  const listInset = isDesktop && !listCollapsed ? LIST_WIDTH + LIST_GAP * 2 : 0;
  const bottomInset = isDesktop ? 0 : SHEET_BAR;
  // Narrow screens: sit above the freshness/refresh row (and the sheet bar on phones).
  const statusBottom = isWide ? 24 : (isDesktop ? 68 : SHEET_BAR + 68);

  const onListSelect = (imei: string | null) => {
    setSelectedImei(imei);
    if (panel === "history" || panel === "live") setPanel(null);
    if (!isDesktop) setSheetOpen(false);
  };
  const onListAction = (action: VehicleAction, imei: string) => {
    if (!isDesktop) setSheetOpen(false);
    runAction(action, imei);
  };

  const onDeleteGroup = async (g: DeviceGroupView) => {
    if (!window.confirm(t("group.deleteConfirm").replace("{name}", g.name))) return;
    await deleteGroup(g.id);
    // devices.group_id is ON DELETE SET NULL server-side; mirror it locally.
    setDevices((prev) => prev.map((d) => (d.groupId === g.id ? { ...d, groupId: null } : d)));
  };

  const onMoveToGroup = async (imei: string, groupId: string | null) => {
    const current = devices.find((d) => d.imei === imei)?.groupId ?? null;
    if (current === groupId) return;
    try {
      if (groupId) await assignDevices(groupId, [imei]);
      else if (current) await unassignDevices(current, [imei]);
      setDevices((prev) => prev.map((d) => (d.imei === imei ? { ...d, groupId } : d)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t("group.moveFailed"));
    }
  };

  const list = (
    <DeviceList
      devices={devices}
      groups={groups}
      locations={locations}
      selectedImei={selectedImei}
      hiddenImeis={hiddenImeis}
      onSelect={onListSelect}
      onHiddenChange={setHiddenImeis}
      onAction={onListAction}
      onNewGroup={() => setGroupModal({ mode: "new" })}
      onEditGroup={(group) => setGroupModal({ mode: "edit", group })}
      onDeleteGroup={(group) => void onDeleteGroup(group)}
      onMoveToGroup={(imei, groupId) => void onMoveToGroup(imei, groupId)}
    />
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <FleetMap
        devices={devices}
        locations={visibleLocations}
        selectedImei={selectedImei}
        onSelect={setSelectedImei}
        onRefresh={refresh}
        lastRefreshAt={lastRefreshAt}
        onAdvanceAnimations={advanceAnimations}
        leftInset={listInset}
        driversById={driversById}
        topInset={isWide ? 0 : NARROW_KPI_INSET}
        bottomInset={bottomInset}
      />

      {/* Floating vehicle panel (ADL-style card over the map) — desktop only */}
      <aside
        className={`absolute bottom-3 top-3 z-[1000] hidden w-[340px] flex-col overflow-hidden rounded-xl border border-black/5 bg-white shadow-xl transition-transform duration-300 ease-out md:flex ${
          listCollapsed ? "-translate-x-[372px]" : "translate-x-0"
        }`}
        style={{ left: LIST_GAP }}
        aria-hidden={listCollapsed}
      >
        {isDesktop && list}
      </aside>

      {/* Mobile vehicle sheet: a grab bar at the bottom that expands over the map */}
      <section
        className={`absolute inset-x-0 bottom-0 z-[1000] flex flex-col overflow-hidden rounded-t-2xl border-t border-black/10 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.12)] transition-[height] duration-300 ease-out md:hidden ${
          sheetOpen ? "h-[65%]" : ""
        }`}
        style={sheetOpen ? undefined : { height: SHEET_BAR }}
        aria-label={t("nav.vehicles")}
      >
        <button
          type="button"
          onClick={() => setSheetOpen((v) => !v)}
          className="flex shrink-0 items-center gap-2 px-4 text-left"
          style={{ height: SHEET_BAR }}
          aria-expanded={sheetOpen}
        >
          <span className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-surface-300" aria-hidden />
          <span className="mt-1 text-[15px] font-semibold text-ink-900">{t("nav.vehicles")}</span>
          <span className="mt-1 text-[13px] text-ink-500">
            <span className="text-emerald-600">{liveOnlineCount}</span> {t("list.online").toLowerCase()} ·{" "}
            {liveOfflineCount} {t("list.offline").toLowerCase()}
          </span>
          <svg
            className={`ml-auto mt-1 h-4 w-4 text-ink-400 transition-transform ${sheetOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          >
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>
        <div className="min-h-0 flex-1 border-t border-surface-200">{!isDesktop && list}</div>
      </section>

      {/* Collapse handle on the panel edge */}
      <button
        type="button"
        onClick={() => setListCollapsed((v) => !v)}
        className="absolute top-1/2 z-[1001] hidden h-12 w-5 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-black/10 bg-white text-ink-500 shadow transition-all duration-300 hover:text-ink-700 md:flex"
        style={{ left: listCollapsed ? 0 : LIST_GAP + LIST_WIDTH }}
        title={listCollapsed ? t("list.expand") : t("list.collapse")}
        aria-label={listCollapsed ? t("list.expand") : t("list.collapse")}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          {listCollapsed ? <path d="m9 6 6 6-6 6" /> : <path d="m15 6-6 6 6 6" />}
        </svg>
      </button>

      <KpiStrip liveOnlineCount={liveOnlineCount} liveOfflineCount={liveOfflineCount} leftInset={listInset} />

      {selectedDevice && panel === "history" && (
        <RouteHistoryPanel device={selectedDevice} onClose={() => setPanel(null)} />
      )}
      {selectedDevice && panel === "live" && (
        <LiveTrackingPanel
          device={selectedDevice}
          location={locations.get(selectedDevice.imei)}
          onClose={() => setPanel(null)}
        />
      )}
      {selectedDevice && panel === "command" && (
        <CommandSheet device={selectedDevice} onClose={() => setPanel(null)} />
      )}
      {selectedDevice && panel === "share" && (
        <ShareLinkModal
          deviceImei={selectedDevice.imei}
          deviceName={selectedDevice.name || selectedDevice.vehiclePlate || selectedDevice.imei}
          onClose={() => setPanel(null)}
        />
      )}
      {selectedDevice && panel === "edit" && (
        <DeviceEditModal device={selectedDevice} onClose={() => setPanel(null)} onSaved={onDeviceSaved} />
      )}
      {groupModal && (
        <DeviceGroupModal
          group={groupModal.mode === "edit" ? groupModal.group : undefined}
          onClose={() => setGroupModal(null)}
          onSave={async (data) => {
            if (groupModal.mode === "edit") await updateGroup(groupModal.group.id, data);
            else await createGroup(data as Parameters<typeof createGroup>[0]);
          }}
        />
      )}

      {/* Transient status pills sit at the bottom centre, clear of the KPI strip and map controls. */}
      {loading && (
        <div
          className="pointer-events-none absolute z-[1000] -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-[13px] text-ink-600 shadow"
          style={{ left: `calc(${listInset}px + (100% - ${listInset}px) / 2)`, bottom: statusBottom }}
        >
          {t("common.loading")}
        </div>
      )}
      {error && (
        <div
          className="absolute z-[1000] max-w-[90vw] -translate-x-1/2 rounded-md border border-red-200 bg-red-50 px-3 py-1 text-[13px] text-red-700 shadow"
          style={{ left: `calc(${listInset}px + (100% - ${listInset}px) / 2)`, bottom: statusBottom }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
