import { api } from "./client";
import type {
  AdminOrgStatus,
  AdminStats,
  AuditLogEntry,
  BillingStats,
  CreateShareLinkRequest,
  CreateSubscriptionRequest,
  DeviceAdminView,
  DevicesWithoutSubResponse,
  ExtendRequest,
  OrgAdminView,
  OrgCreate,
  ShareLinkView,
  SubscriptionSearch,
  SubscriptionView,
  DeviceGroupInput,
  DeviceGroupView,
  DeviceUpdate,
  NotificationSettings,
  NotificationSettingsUpdate,
  OrgDetail,
  OrgUpdate,
  TokenPair,
  UserCreate,
  UserDetail,
  UserUpdate,
  ActivityDay,
  ActivitySummary,
  AlarmAcknowledgeRequest,
  AlarmOverview,
  AlarmQuery,
  AlarmRuleRequest,
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

export async function acknowledgeAlarm(id: string, body?: AlarmAcknowledgeRequest): Promise<AlarmView> {
  const r = await api.post<AlarmView>(`/alarms/${id}/acknowledge`, body ?? {});
  return r.data;
}

/** Alarm center list: GET /alarms?type&severity&imei&from&to&unacked, paged with limit/offset. */
export async function searchAlarms(q: AlarmQuery, limit = 50, offset = 0): Promise<AlarmView[]> {
  const params: Record<string, string | number> = { limit, offset };
  if (q.unacked) params.unacked = "true";
  if (q.type) params.type = q.type;
  if (q.severity) params.severity = q.severity;
  if (q.imei) params.imei = q.imei;
  if (q.from) params.from = q.from;
  if (q.to) params.to = q.to;
  const r = await api.get<AlarmView[]>("/alarms", { params });
  return r.data;
}

/** Person x alarm-type counts for a period (`to` exclusive). */
export async function alarmOverview(fromIso: string, toIso: string): Promise<AlarmOverview> {
  const r = await api.get<AlarmOverview>("/alarms/overview", { params: { from: fromIso, to: toIso } });
  return r.data;
}

export async function getAlarmRule(id: string): Promise<AlarmRuleView> {
  const r = await api.get<AlarmRuleView>(`/alarm-rules/${id}`);
  return r.data;
}

export async function createAlarmRule(req: AlarmRuleRequest): Promise<void> {
  await api.post("/alarm-rules", req);
}

export async function updateAlarmRule(id: string, req: AlarmRuleRequest): Promise<void> {
  await api.patch(`/alarm-rules/${id}`, req);
}

export async function deleteAlarmRule(id: string): Promise<void> {
  await api.delete(`/alarm-rules/${id}`);
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

export async function createPlaceSchedule(geofenceId: string, req: { kind: PlaceScheduleKind; time: string; weekdays: number[]; graceMinutes: number }): Promise<PlaceSchedule> {
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

// ----- Settings: account, organization, users, notifications -----
/** Returns a fresh token pair; every other session of this user is signed out. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<TokenPair> {
  const r = await api.post<TokenPair>("/auth/change-password", { currentPassword, newPassword });
  return r.data;
}

export async function getOrgDetail(): Promise<OrgDetail> {
  const r = await api.get<OrgDetail>("/orgs/me");
  return r.data;
}

export async function updateOrg(patch: OrgUpdate): Promise<OrgDetail> {
  const r = await api.patch<OrgDetail>("/orgs/me", patch);
  return r.data;
}

export async function listOrgUsers(): Promise<UserDetail[]> {
  const r = await api.get<UserDetail[]>("/orgs/me/users");
  return r.data;
}

export async function createOrgUser(req: UserCreate): Promise<UserDetail> {
  const r = await api.post<UserDetail>("/orgs/me/users", req);
  return r.data;
}

export async function updateOrgUser(id: string, patch: UserUpdate): Promise<UserDetail> {
  const r = await api.patch<UserDetail>(`/orgs/me/users/${id}`, patch);
  return r.data;
}

/** Soft delete: the account is disabled, its history kept. */
export async function disableOrgUser(id: string): Promise<void> {
  await api.delete(`/orgs/me/users/${id}`);
}

export async function getUserDeviceImeis(userId: string): Promise<string[]> {
  const r = await api.get<string[]>(`/orgs/me/users/${userId}/devices`);
  return r.data;
}

/** Replaces the user's assigned people with exactly this list. */
export async function setUserDeviceImeis(userId: string, deviceImeis: string[]): Promise<string[]> {
  const r = await api.patch<string[]>(`/orgs/me/users/${userId}/devices`, { deviceImeis });
  return r.data;
}

export async function setUserSeeAllDevices(userId: string, seeAllDevices: boolean): Promise<UserDetail> {
  const r = await api.patch<UserDetail>(`/orgs/me/users/${userId}/see-all-devices`, { seeAllDevices });
  return r.data;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const r = await api.get<NotificationSettings>("/users/me/notification-settings");
  return r.data;
}

/** Full replacement of all three sets. */
export async function saveNotificationSettings(req: NotificationSettingsUpdate): Promise<NotificationSettings> {
  const r = await api.put<NotificationSettings>("/users/me/notification-settings", req);
  return r.data;
}

// ----- Person details (PATCH /devices/:imei) -----
export async function updateDevice(imei: string, req: DeviceUpdate): Promise<DeviceView> {
  const r = await api.patch<DeviceView>(`/devices/${encodeURIComponent(imei)}`, req);
  return r.data;
}

// ----- Groups of people (per user) -----
export async function listGroups(): Promise<DeviceGroupView[]> {
  const r = await api.get<DeviceGroupView[]>("/groups");
  return r.data;
}

export async function createGroup(req: DeviceGroupInput & { name: string }): Promise<DeviceGroupView> {
  const r = await api.post<DeviceGroupView>("/groups", req);
  return r.data;
}

export async function updateGroup(id: string, req: DeviceGroupInput): Promise<DeviceGroupView> {
  const r = await api.patch<DeviceGroupView>(`/groups/${id}`, req);
  return r.data;
}

/** Its people become ungrouped. */
export async function deleteGroup(id: string): Promise<void> {
  await api.delete(`/groups/${id}`);
}

/** Moves these people into the group (out of any other group of yours). */
export async function assignToGroup(id: string, imeis: string[]): Promise<void> {
  await api.post(`/groups/${id}/devices`, { imeis });
}

export async function removeFromGroup(id: string, imeis: string[]): Promise<void> {
  await api.delete(`/groups/${id}/devices`, { data: { imeis } });
}

// ----- Super admin (SUPER_ADMIN only; mirrors web useAdminData / useAdminSubscriptions) -----
export async function adminStats(): Promise<AdminStats> {
  const r = await api.get<AdminStats>("/admin/stats");
  return r.data;
}

export async function adminListOrgs(): Promise<OrgAdminView[]> {
  const r = await api.get<OrgAdminView[]>("/admin/orgs");
  return r.data;
}

export async function adminCreateOrg(req: OrgCreate): Promise<OrgAdminView> {
  const r = await api.post<OrgAdminView>("/admin/orgs", req);
  return r.data;
}

export async function adminSetOrgStatus(id: string, status: AdminOrgStatus): Promise<OrgAdminView> {
  const r = await api.patch<OrgAdminView>(`/admin/orgs/${id}/status`, { status });
  return r.data;
}

export async function adminListDevices(orgId?: string): Promise<DeviceAdminView[]> {
  const r = await api.get<DeviceAdminView[]>("/admin/devices", { params: orgId ? { orgId } : undefined });
  return r.data;
}

export async function adminReassignDevice(imei: string, targetOrgId: string): Promise<DeviceAdminView> {
  const r = await api.patch<DeviceAdminView>(`/admin/devices/${imei}/org`, { targetOrgId });
  return r.data;
}

/** Permanently removes the tracker with its history (204). */
export async function adminDeleteDevice(imei: string): Promise<void> {
  await api.delete(`/admin/devices/${imei}`);
}

export async function adminBillingStats(): Promise<BillingStats> {
  const r = await api.get<BillingStats>("/admin/subscriptions/stats");
  return r.data;
}

export async function adminSearchSubscriptions(params: SubscriptionSearch): Promise<SubscriptionView[]> {
  const r = await api.get<SubscriptionView[]>("/admin/subscriptions", { params });
  return r.data;
}

export async function adminExpiredSubscriptions(): Promise<SubscriptionView[]> {
  const r = await api.get<SubscriptionView[]>("/admin/subscriptions/expired");
  return r.data;
}

export async function adminDueSoonSubscriptions(days = 7): Promise<SubscriptionView[]> {
  const r = await api.get<SubscriptionView[]>("/admin/subscriptions/due-soon", { params: { days } });
  return r.data;
}

export async function adminDevicesWithoutSubscription(limit = 100): Promise<DevicesWithoutSubResponse> {
  const r = await api.get<DevicesWithoutSubResponse>("/admin/subscriptions/devices-without-subscription", {
    params: { limit },
  });
  return r.data;
}

export async function adminExtendSubscription(id: string, req: ExtendRequest): Promise<SubscriptionView> {
  const r = await api.patch<SubscriptionView>(`/admin/subscriptions/${id}/extend`, req);
  return r.data;
}

export async function adminSetSubscriptionStatus(id: string, status: string): Promise<SubscriptionView> {
  const r = await api.patch<SubscriptionView>(`/admin/subscriptions/${id}/status`, null, { params: { status } });
  return r.data;
}

export async function adminCreateSubscription(req: CreateSubscriptionRequest): Promise<SubscriptionView> {
  const r = await api.post<SubscriptionView>("/admin/subscriptions/create", req);
  return r.data;
}

// ----- Audit log (ORG_ADMIN / SUPER_ADMIN) -----
export async function listAuditLog(params: {
  from?: string;
  to?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLogEntry[]> {
  const r = await api.get<AuditLogEntry[]>("/audit-log", { params });
  return r.data;
}

// ----- Share location links -----
export async function listShareLinks(imei: string): Promise<ShareLinkView[]> {
  const r = await api.get<ShareLinkView[]>(`/share-links/device/${imei}`);
  return r.data;
}

export async function createShareLink(req: CreateShareLinkRequest): Promise<ShareLinkView> {
  const r = await api.post<ShareLinkView>("/share-links", req);
  return r.data;
}

export async function revokeShareLink(id: string): Promise<void> {
  await api.delete(`/share-links/${id}`);
}

/** The caller's organization's subscriptions (Settings → Subscription). */
export async function listMySubscriptions(): Promise<SubscriptionView[]> {
  const r = await api.get<SubscriptionView[]>("/billing/subscriptions");
  return r.data;
}
