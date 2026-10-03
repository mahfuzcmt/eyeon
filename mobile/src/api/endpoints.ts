import { api } from "./client";
import type {
  ActivityDay,
  ActivitySummary,
  AlarmRuleView,
  AlarmView,
  CommandResponse,
  DeviceView,
  GeofenceKind,
  GeofenceNotifyOn,
  GeofenceView,
  KpiSnapshot,
  LatLng,
  LocationView,
  LoginResponse,
  NightRestView,
  OrgSummary,
  PlaceSchedule,
  PlaceScheduleKind,
  PlaceType,
  StaysResult,
  TrackerSettingItem,
  TrackerSettingKey,
  TrackerSettingsData,
  TrackerSettingValue,
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

/** Historical points for one person in a time range — route playback. */
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

// ----- Activity (derived from location points; EyeOn has no trips) -----
export async function deviceActivity(imei: string, fromIso: string, toIso: string): Promise<ActivitySummary> {
  const r = await api.get<ActivitySummary>(`/devices/${imei}/activity`, { params: { from: fromIso, to: toIso } });
  return r.data;
}

/** One row per Asia/Dhaka calendar day that has data. */
export async function deviceDailyActivity(imei: string, fromIso: string, toIso: string): Promise<ActivityDay[]> {
  const r = await api.get<ActivityDay[]>(`/devices/${imei}/activity/daily`, { params: { from: fromIso, to: toIso } });
  return r.data;
}

/** Alarms for one person in a range — feeds the day timeline (arrived / left / SOS). */
export async function alarmsForDevice(imei: string, fromIso: string, toIso: string): Promise<AlarmView[]> {
  const r = await api.get<AlarmView[]>("/alarms", { params: { imei, from: fromIso, to: toIso, limit: 500 } });
  return r.data;
}

// ----- Geofences -----
export async function listGeofences(kind?: GeofenceKind): Promise<GeofenceView[]> {
  const r = await api.get<GeofenceView[]>("/geofences", { params: kind ? { kind } : undefined });
  return r.data;
}

/** Circle geofence — the only shape the mobile app creates (polygon is web-only). */
export async function createCircleGeofence(req: {
  name: string;
  center: LatLng;
  radiusM: number;
  notifyOn: GeofenceNotifyOn;
  imeis: string[];
  /** Omit for a plain boundary geofence. */
  kind?: GeofenceKind;
  placeType?: PlaceType;
  address?: string;
}): Promise<GeofenceView> {
  const r = await api.post<GeofenceView>("/geofences", {
    name: req.name,
    type: "CIRCLE",
    notifyOn: req.notifyOn,
    center: req.center,
    radiusM: req.radiusM,
    imeis: req.imeis,
    kind: req.kind,
    placeType: req.placeType,
    address: req.address,
  });
  return r.data;
}

/** Partial update; omitted fields keep their value. Reshaping resets arrived/left state server-side. */
export async function updateGeofence(
  id: string,
  patch: Partial<{
    name: string;
    notifyOn: GeofenceNotifyOn;
    placeType: PlaceType;
    address: string;
    center: LatLng;
    radiusM: number;
  }>,
): Promise<GeofenceView> {
  const r = await api.patch<GeofenceView>(`/geofences/${id}`, patch);
  return r.data;
}

export async function getGeofence(id: string): Promise<GeofenceView> {
  const r = await api.get<GeofenceView>(`/geofences/${id}`);
  return r.data;
}

export async function listGeofenceImeis(id: string): Promise<string[]> {
  const r = await api.get<string[]>(`/geofences/${id}/devices`);
  return r.data;
}

export async function assignGeofenceDevices(id: string, imeis: string[]): Promise<void> {
  await api.post(`/geofences/${id}/devices`, { imeis });
}

export async function unassignGeofenceDevice(id: string, imei: string): Promise<void> {
  await api.delete(`/geofences/${id}/devices/${imei}`);
}

export async function deleteGeofence(id: string): Promise<void> {
  await api.delete(`/geofences/${id}`);
}

// ----- Push notifications -----
export async function registerPushToken(
  token: string,
  platform: "ANDROID" | "IOS",
  locale: "bn" | "en",
): Promise<void> {
  // locale decides the language the backend writes this install's notifications in.
  await api.post("/users/me/push-tokens", { token, platform, locale });
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

// ----- Personal tracker commands (PL601; CLAUDE.md §8.3) -----
/** A burst of live positions for ~30 s: about three fresh fixes. */
export async function locateNow(imei: string): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${imei}/commands/locate`, {}, { timeout: 30_000 });
  return r.data;
}

/** 10-second updates for this long (30-1800 s). */
export async function followLive(imei: string, seconds = 300): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${imei}/commands/live`, { seconds }, { timeout: 30_000 });
  return r.data;
}

/** Buzzer and lights on the tracker for this long (5-60 s). */
export async function findTracker(imei: string, seconds = 20): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${imei}/commands/find`, { seconds }, { timeout: 30_000 });
  return r.data;
}

// ----- Stays -----
export async function deviceStays(imei: string, params: { from?: string; to?: string; names?: boolean; lang?: string }): Promise<StaysResult> {
  const r = await api.get<StaysResult>(`/devices/${imei}/stays`, { params });
  return r.data;
}

// ----- Expected times of a trusted place -----
export async function listPlaceSchedules(geofenceId: string): Promise<PlaceSchedule[]> {
  const r = await api.get<PlaceSchedule[]>(`/geofences/${geofenceId}/schedules`);
  return r.data;
}

export async function createPlaceSchedule(geofenceId: string, req: { kind: PlaceScheduleKind; time: string; weekdays: number[] }): Promise<PlaceSchedule> {
  const r = await api.post<PlaceSchedule>(`/geofences/${geofenceId}/schedules`, req);
  return r.data;
}

export async function deletePlaceSchedule(geofenceId: string, scheduleId: string): Promise<void> {
  await api.delete(`/geofences/${geofenceId}/schedules/${scheduleId}`);
}

// ----- Tracker settings -----
export async function getTrackerSettings(imei: string): Promise<TrackerSettingsData> {
  const r = await api.get<TrackerSettingsData>(`/devices/${imei}/settings`);
  return r.data;
}

/** Asks the tracker for all its settings; answers arrive over the next seconds (poll getTrackerSettings). */
export async function readTrackerSettings(imei: string): Promise<boolean> {
  try {
    const r = await api.post<{ started: boolean }>(`/devices/${imei}/settings/read`);
    return r.data.started;
  } catch {
    return false;   // 409: not connected
  }
}

export async function saveTrackerSetting(imei: string, key: TrackerSettingKey, value: TrackerSettingValue): Promise<TrackerSettingItem> {
  const r = await api.put<TrackerSettingItem>(`/devices/${imei}/settings/${key}`, value, { timeout: 30_000 });
  return r.data;
}

/** Trackers the user can see whose night rest is on. */
export async function listNightRest(): Promise<NightRestView[]> {
  const r = await api.get<NightRestView[]>("/devices/rest");
  return r.data;
}

// ----- Photo of the person -----
/** Uploads a JPEG; the server crops it square and strips its metadata. */
export async function uploadDevicePhoto(imei: string, body: Blob | ArrayBuffer): Promise<{ photoUpdatedAt: string }> {
  const r = await api.put<{ photoUpdatedAt: string }>(`/devices/${imei}/photo`, body, {
    headers: { "Content-Type": "image/jpeg" },
    timeout: 60_000,
  });
  return r.data;
}

export async function deleteDevicePhoto(imei: string): Promise<void> {
  await api.delete(`/devices/${imei}/photo`);
}
