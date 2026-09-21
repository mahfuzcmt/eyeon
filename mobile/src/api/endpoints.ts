import { api } from "./client";
import type {
  AlarmRuleView,
  AlarmView,
  CommandResponse,
  DeviceView,
  GeofenceNotifyOn,
  GeofenceView,
  KpiSnapshot,
  LatLng,
  LocationView,
  LoginResponse,
  OrgSummary,
  TripView,
} from "@/types";

// ----- Auth -----
export async function login(email: string, password: string): Promise<LoginResponse> {
  const r = await api.post<LoginResponse>("/auth/login", { email, password });
  return r.data;
}

// ----- Devices -----
/** Current org (name, plan, map key). Backend OrgView is a superset of OrgSummary. */
export async function getMyOrg(): Promise<OrgSummary> {
  const r = await api.get<OrgSummary>("/orgs/me");
  return r.data;
}

export async function listDevices(status?: string): Promise<DeviceView[]> {
  const r = await api.get<DeviceView[]>("/devices", {
    params: status ? { status } : undefined,
  });
  return r.data;
}

export async function getDevice(imei: string): Promise<DeviceView> {
  const r = await api.get<DeviceView>(`/devices/${imei}`);
  return r.data;
}

/** Last-known position for a single device (may 404 if never reported). */
export async function deviceLastLocation(imei: string): Promise<LocationView | null> {
  try {
    const r = await api.get<LocationView>(`/devices/${imei}/locations/last`);
    return r.data;
  } catch {
    return null;
  }
}

// ----- Engine lock commands (GT06 DYD / HFYD, CLAUDE.md §7.5) -----
export async function cutFuel(imei: string, devicePassword?: string): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${imei}/commands/cut-fuel`, { devicePassword });
  return r.data;
}

export async function restoreFuel(imei: string, devicePassword?: string): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${imei}/commands/restore-fuel`, { devicePassword });
  return r.data;
}

/** Query device address/location (GT06 DWXX command). */
export async function queryAddress(imei: string, devicePassword?: string): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${imei}/commands/query-address`, { devicePassword });
  return r.data;
}

/** Reboot/reset the GT06 device. */
export async function rebootDevice(imei: string, devicePassword?: string): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${imei}/commands/reboot`, { devicePassword });
  return r.data;
}

/** Send a raw GT06 command (escape hatch for advanced users). */
export async function sendRawCommand(imei: string, command: string, timeoutMs = 30000): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${imei}/commands/raw`, { command, timeoutMs });
  return r.data;
}

// ----- Dashboard KPIs -----
export async function getKpis(): Promise<KpiSnapshot> {
  const r = await api.get<KpiSnapshot>("/dashboard/kpis");
  return r.data;
}

// ----- Locations -----
/** All last-known positions for the org — dashboard/map bootstrap. */
export async function lastKnownAll(): Promise<LocationView[]> {
  const r = await api.get<LocationView[]>("/devices/locations/last");
  return r.data;
}

/** Historical points for one device in a time range — trip playback. */
export async function locationHistory(
  imei: string,
  fromIso: string,
  toIso: string,
  limit = 5000,
): Promise<LocationView[]> {
  const r = await api.get<LocationView[]>(`/devices/${imei}/locations`, {
    params: { from: fromIso, to: toIso, limit },
  });
  return r.data;
}

// ----- Trips (moving history) -----
export async function tripsForDevice(
  imei: string,
  fromIso: string,
  toIso: string,
): Promise<TripView[]> {
  const r = await api.get<TripView[]>(`/trips/device/${imei}`, {
    params: { from: fromIso, to: toIso },
  });
  return r.data;
}

// ----- Geofences -----
export async function listGeofences(): Promise<GeofenceView[]> {
  const r = await api.get<GeofenceView[]>("/geofences");
  return r.data;
}

/** Circle geofence — the only shape the mobile app creates (polygon is web-only). */
export async function createCircleGeofence(req: {
  name: string;
  center: LatLng;
  radiusM: number;
  notifyOn: GeofenceNotifyOn;
  imeis: string[];
}): Promise<GeofenceView> {
  const r = await api.post<GeofenceView>("/geofences", {
    name: req.name,
    type: "CIRCLE",
    notifyOn: req.notifyOn,
    center: req.center,
    radiusM: req.radiusM,
    imeis: req.imeis,
  });
  return r.data;
}

export async function deleteGeofence(id: string): Promise<void> {
  await api.delete(`/geofences/${id}`);
}

// ----- Push notifications -----
export async function registerPushToken(
  token: string,
  platform: "ANDROID" | "IOS",
): Promise<void> {
  await api.post("/users/me/push-tokens", { token, platform });
}

/** Token goes in the query string — Expo tokens contain reserved chars like [ ]. */
export async function unregisterPushToken(token: string): Promise<void> {
  await api.delete("/users/me/push-tokens", { params: { token } });
}

// ----- Alarm rules (overspeed thresholds) -----
export async function listAlarmRules(): Promise<AlarmRuleView[]> {
  const r = await api.get<AlarmRuleView[]>("/alarm-rules");
  return r.data;
}

// ----- Alarms -----
export async function listAlarms(onlyUnacked = false, limit = 100): Promise<AlarmView[]> {
  const r = await api.get<AlarmView[]>("/alarms", {
    params: { unacked: onlyUnacked || undefined, limit },
  });
  return r.data;
}

export async function acknowledgeAlarm(id: string): Promise<AlarmView> {
  const r = await api.post<AlarmView>(`/alarms/${id}/acknowledge`);
  return r.data;
}
