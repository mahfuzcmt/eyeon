/**
 * Wire types mirroring the backend DTOs. Kept in sync with
 * frontend/src/types/domain.ts and the Java records. Only the subset the
 * mobile app uses is included.
 */

export type DeviceStatus = "ONLINE" | "OFFLINE" | "NEVER_CONNECTED";
export type UserRole = "SUPER_ADMIN" | "ORG_ADMIN" | "ORG_USER";

/** Derived motion state for the UI (backend only knows ONLINE/OFFLINE). */
export type MotionStatus = "MOVING" | "IDLE" | "STOPPED" | "OFFLINE";

export interface CommandResponse {
  ok: boolean;
  reply: string | null;
  error: string | null;
}

/** Fleet-level KPIs — mirrors backend dto.DashboardDtos.KpiSnapshot. */
export interface KpiSnapshot {
  devicesTotal: number;
  devicesOnline: number;
  devicesOffline: number;
  devicesNeverConnected: number;
  alarmsToday: number;
  alarmsCriticalToday: number;
  alarmsUnacknowledged: number;
  tripsActive: number;
  tripsCompletedToday: number;
  distanceTodayMeters: number;
  generatedAt: string;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  orgId: string;
}

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  locale: string;
  timezone: string;
  /** Org-owned Google Maps browser key; null/absent = platform default. */
  googleMapsApiKey?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
  org: OrgSummary;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Mirrors backend dto.DeviceDtos.DeviceView. */
export interface DeviceView {
  id: string;
  imei: string;
  name: string | null;
  simMsisdn: string | null;
  vehiclePlate: string | null;
  vehicleType: string | null;
  protocol: string | null;
  protocolVariant: string | null;
  model: string | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastSpeed: number | null;
  lastCourse: number | null;
  lastVoltageMv: number | null;
  lastGsmSignal: number | null;
  lastEngineHoursSeconds: number | null;
  iconColor: string | null;
  /** Last engine cut/restore state recorded after a DYD/HFYD command. */
  engineLocked: boolean;
  /** Current subscription status (ACTIVE, GRACE, SUSPENDED, …) or null if none. */
  subscriptionStatus: string | null;
  /** Subscription next-due date (ISO yyyy-MM-dd) or null if none. */
  subscriptionExpiresAt: string | null;
  /** End of the latest completed trip (ISO) — null while driving or if unknown. */
  parkedSince: string | null;
  /** The calling user's own group for this person (groups are per user), or null. */
  groupId?: string | null;
  /** Set when a photo was uploaded; it replaces the drawn portrait (see src/photos.ts). */
  photoUpdatedAt?: string | null;
  /** 0-100 for battery-powered trackers (reported by the tracker itself), otherwise null. */
  batteryPercent?: number | null;
}

export type AlarmRuleType =
  | "SPEED_OVER"
  | "VOLTAGE_UNDER"
  | "ACC_ON_DURING_WINDOW"
  | "PARKING_TIMEOUT"
  | "OFFLINE_TIMEOUT"
  | "IDLE_TIMEOUT";

/** Mirrors backend dto.AlarmRuleDtos.AlarmRuleView (GET /alarm-rules). */
export interface AlarmRuleView {
  id: string;
  name: string;
  ruleType: AlarmRuleType;
  threshold: number | null;
  /** "HH:mm:ss", only for ACC_ON_DURING_WINDOW. */
  windowStart?: string | null;
  windowEnd?: string | null;
  cooldownSeconds?: number;
  severity?: AlarmSeverity;
  active: boolean;
  appliesToAll: boolean;
  assignedImeis: string[];
  createdAt?: string;
}

/** Body of POST /alarm-rules and PATCH /alarm-rules/{id} (PATCH accepts any subset). */
export interface AlarmRuleRequest {
  name?: string;
  ruleType?: AlarmRuleType;
  threshold?: number | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  cooldownSeconds?: number;
  severity?: AlarmSeverity;
  active?: boolean;
  appliesToAll?: boolean;
  assignedImeis?: string[];
}

/** Result recorded when an alarm is acknowledged ("Process" dialog). */
export type AlarmProcessResult = "HANDLED" | "FALSE_ALARM" | "NO_ACTION";

export interface AlarmAcknowledgeRequest {
  result?: AlarmProcessResult;
  notes?: string;
}

/** Mirrors backend dto.AlarmDtos.AlarmOverview (GET /alarms/overview). */
export interface AlarmOverviewRow {
  imei: string;
  name: string | null;
  vehiclePlate: string | null;
  counts: Record<string, number>;
  total: number;
}

export interface AlarmOverview {
  types: string[];
  rows: AlarmOverviewRow[];
}

/** Filters for GET /alarms. `from`/`to` are ISO instants, `to` exclusive. */
export interface AlarmQuery {
  type?: string;
  severity?: string;
  imei?: string;
  from?: string;
  to?: string;
  unacked?: boolean;
}

/** Mirrors backend dto.LocationDtos.LocationView and the WS LocationEvent. */
export interface LocationView {
  imei: string;
  ts: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  valid: boolean;
  satellites?: number | null;
  accOn?: boolean | null;
  voltageMv?: number | null;
  mileageMeters?: number | null;
  altitude?: number | null;
  gsmSignal?: number | null;
  engineHoursSeconds?: number | null;
}

export type AlarmType =
  | "SOS"
  | "POWER_CUT"
  | "SHOCK"
  | "OVERSPEED"
  | "GEOFENCE_ENTER"
  | "GEOFENCE_EXIT"
  | "PLACE_ARRIVED"
  | "PLACE_LEFT"
  | "NOT_ARRIVED"
  | "NOT_LEFT"
  | "ARRIVED_ON_TIME"
  | "LEFT_ON_TIME"
  | "ARRIVED_LATE"
  | "LEFT_LATE"
  | "ROUTE_DEVIATION"
  | "BACK_ON_ROUTE"
  | "CHARGE_REMINDER"
  | "COLLISION"
  | "ACC_ON"
  | "ACC_OFF"
  | "LOW_BATTERY"
  | "CURFEW_VIOLATION"
  | "EXTERNAL_LOW_VOLTAGE"
  | "REMOVE"
  | "DOOR"
  | "URGENT_ACCELERATION"
  | "URGENT_DECELERATION"
  | "PARKING_TIMEOUT"
  | "OFFLINE_TIMEOUT"
  | "ENGINE_IDLE";

export type AlarmSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AlarmView {
  id: string;
  deviceImei: string;
  type: AlarmType;
  severity: AlarmSeverity;
  ts: string;
  latitude: number | null;
  longitude: number | null;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  processResult?: AlarmProcessResult | null;
  processNotes?: string | null;
  metadata: Record<string, unknown>;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type GeofenceType = "CIRCLE" | "POLYGON";
export type GeofenceNotifyOn = "ENTER" | "EXIT" | "BOTH" | "NONE";
/** TRUSTED_PLACE: somewhere they should be (calm arrived/left). BOUNDARY: an area they must not leave. */
export type GeofenceKind = "TRUSTED_PLACE" | "BOUNDARY";
export type PlaceType = "HOME" | "SCHOOL" | "COACHING" | "MOSQUE" | "HOSPITAL" | "RELATIVE" | "OTHER";

/** Mirrors backend dto.GeofenceDtos.GeofenceView. */
export interface GeofenceView {
  id: string;
  name: string;
  type: GeofenceType;
  notifyOn: GeofenceNotifyOn;
  color: string | null;
  active: boolean;
  center: LatLng | null; // CIRCLE only
  radiusM: number | null; // CIRCLE only
  polygon: LatLng[]; // POLYGON only
  kind: GeofenceKind;
  placeType: PlaceType | null; // TRUSTED_PLACE only
  address: string | null;
  exitBufferM: number;
  minDwellS: number;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors backend domain.Activity: a person's day, derived from location points. */
export interface ActivitySummary {
  distanceM: number;
  movingS: number;
  stillS: number;
  maxSpeed: number;
  points: number;
  firstTs: string | null;
  lastTs: string | null;
}

/** Mirrors backend domain.Activity.Day. `date` is an Asia/Dhaka calendar day, YYYY-MM-DD. */
export interface ActivityDay {
  date: string;
  distanceM: number;
  movingS: number;
  points: number;
}

export type TripStatus = "IN_PROGRESS" | "COMPLETED";

/** Mirrors backend dto.TripDtos.TripView — the "moving history" record. */
export interface TripView {
  id: string;
  deviceImei: string;
  startedAt: string;
  endedAt: string | null;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  distanceM: number;
  durationS: number | null;
  maxSpeed: number;
  avgSpeed: number;
  idleTimeS: number;
  status: TripStatus;
}

// ----- Stays (GET /devices/:imei/stays) -----
export interface StayView {
  from: string;
  to: string;
  seconds: number;
  latitude: number;
  longitude: number;
  /** The caller's own trusted place, else the street / area; absent while it is being looked up. */
  name?: string | null;
  placeId?: string | null;
  placeType?: PlaceType | null;
  /** Already there when the requested period began. */
  openStart: boolean;
  /** Still there now; `to` is the time of the request. */
  ongoing: boolean;
}

export interface StaysResult {
  stays: StayView[];
  namesPending: boolean;
}

// ----- Expected times of a trusted place (/geofences/:id/schedules) -----
export type PlaceScheduleKind = "ARRIVE_BY" | "LEAVE_BY";
/** TO: the way to the place (checked around its arrival time); FROM: the way back after leaving it. */
export type RouteDirection = "TO" | "FROM";
/** WALK snaps to footpaths, VEHICLE (rickshaw, van, car, bus) to roads. */
export type RouteMode = "WALK" | "VEHICLE";

export interface PlaceRoute {
  id: string;
  direction: RouteDirection;
  mode: RouteMode;
  waypoints: LatLng[];
  path: LatLng[];
  widthM: number;
  lengthM: number;
  active: boolean;
}

export interface RouteSnap {
  path: LatLng[];
  lengthM: number;
  /** False when the road service had no answer: straight lines between the points. */
  roads: boolean;
}

export interface PlaceSchedule {
  id: string;
  kind: PlaceScheduleKind;
  /** HH:mm in the organization's timezone. */
  time: string;
  /** ISO weekdays: 1 = Monday ... 7 = Sunday. */
  weekdays: number[];
  /** Minutes after `time` that still count as on time (0-120). */
  graceMinutes: number;
  active: boolean;
}

// ----- Tracker settings (/devices/:imei/settings); value shapes in backend TrackerSetting.java -----
export type TrackerSettingKey =
  | "SOS_NUMBERS"
  | "SOS_ALARM"
  | "CALL_PERMISSION"
  | "ANSWER_MODE"
  | "CALL_VOLUME"
  | "RING_VOLUME"
  | "REPORTING"
  | "HEARTBEAT"
  | "NIGHT_REST"
  | "QUIET_HOURS"
  | "LOW_BATTERY_ALARM"
  | "FALL_ALARM"
  | "POWER_OFF_LOCK"
  | "AUTO_POWER_ON";
export type TrackerSettingValue = Record<string, unknown>;
export type TrackerSettingStatus = "UNKNOWN" | "SYNCED" | "PENDING" | "FAILED" | "UNSUPPORTED";
export interface TrackerSettingItem {
  key: TrackerSettingKey;
  wanted?: TrackerSettingValue | null;
  applied?: TrackerSettingValue | null;
  status: TrackerSettingStatus;
  trackerReply?: string | null;
  syncedAt?: string | null;
}
export interface TrackerSettingsData {
  imei: string;
  online: boolean;
  reading: boolean;
  settings: TrackerSettingItem[];
}

/** A tracker whose night rest is switched on (GET /devices/rest); HH:mm in Asia/Dhaka. */
export interface NightRestView {
  imei: string;
  from: string;
  to: string;
}

// ----- Settings: organization, users, notifications (OrgController, NotificationSettingsController) -----
/** Mirrors backend dto.OrgDtos.OrgView. */
export interface OrgDetail extends OrgSummary {
  status: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PATCH /orgs/me: absent = unchanged; blank googleMapsApiKey = back to the platform key. */
export interface OrgUpdate {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  locale?: string;
  timezone?: string;
  googleMapsApiKey?: string;
}

/** Mirrors backend dto.OrgDtos.UserView. */
export interface UserDetail {
  id: string;
  orgId: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  seeAllDevices: boolean;
  assignedDeviceCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserCreate {
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  password: string;
}

export interface UserUpdate {
  fullName?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
}

/** Mirrors backend dto.NotificationDtos.NotificationSettingsView. */
export interface NotificationSettings {
  popupTypes: string[];
  soundTypes: string[];
  pushTypes: string[];
  availableTypes: string[];
  /** false = the defaults are in effect (nothing saved yet). */
  customized: boolean;
}

export interface NotificationSettingsUpdate {
  popupTypes: string[];
  soundTypes: string[];
  pushTypes: string[];
}

// ----- Groups of people (per user; /groups) -----
/** Mirrors backend dto.DeviceGroupDtos.DeviceGroupView. */
export interface DeviceGroupView {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  sortOrder: number;
  deviceCount: number;
  createdAt: string;
}

export interface DeviceGroupInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

/** Stored in devices.vehicle_type (inherited column name). Anything else renders as PERSON. */
export type PersonType = "BOY" | "GIRL" | "OLD_MAN" | "PERSON";

/** PATCH /devices/:imei - blank strings are sent as null (cleared). */
export interface DeviceUpdate {
  name: string | null;
  simMsisdn: string | null;
  vehiclePlate: string | null;
  vehicleType: PersonType;
  iconColor: string;
}

// ----- Super admin (backend AdminController / AdminSubscriptionController) -----
export interface AdminStats {
  totalOrgs: number;
  activeOrgs: number;
  totalDevices: number;
  onlineDevices: number;
  totalUsers: number;
}

export type AdminOrgStatus = "ACTIVE" | "SUSPENDED" | "CANCELLED";

export interface OrgAdminView {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  status: AdminOrgStatus;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  locale: string;
  timezone: string;
  deviceCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrgCreate {
  name: string;
  slug: string;
  planTier?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export interface DeviceAdminView {
  id: string;
  orgId: string;
  orgName: string;
  imei: string;
  name: string | null;
  simMsisdn: string | null;
  vehiclePlate: string | null;
  vehicleType: string | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface BillingStats {
  total: number;
  active: number;
  grace: number;
  suspended: number;
  cancelled: number;
  expiringIn7Days: number;
  expiredUnpaid: number;
}

export interface SubscriptionView {
  id: string;
  orgId: string;
  deviceImei: string;
  planTier: string;
  monthlyPriceBdt: number;
  startedAt: string;
  nextDueAt: string;
  status: string;
  effectiveStatus: string;
  autoRenew: boolean;
  daysUntilDue: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionSearch {
  orgId?: string;
  imei?: string;
  status?: string;
  limit?: number;
}

export interface ExtendRequest {
  additionalDays?: number;
  /** yyyy-MM-dd */
  newDueAt?: string;
}

export interface DeviceWithoutSub {
  imei: string;
  orgId: string;
  orgName: string;
  deviceName: string | null;
}

export interface DevicesWithoutSubResponse {
  total: number;
  devices: DeviceWithoutSub[];
}

export interface CreateSubscriptionRequest {
  imei: string;
  orgId: string;
  planTier?: string;
  days?: number;
}

// ----- Audit log (backend AuditController) -----
export interface AuditLogEntry {
  id: number;
  orgId: string | null;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  ts: string;
}

// ----- Share location links (backend ShareLocationController) -----
export interface ShareLinkView {
  id: string;
  deviceImei: string;
  token: string;
  shareUrl: string;
  label: string | null;
  expiresAt: string;
  isActive: boolean;
  showHistory: boolean;
  allowRealtime: boolean;
  createdAt: string;
  lastAccessedAt: string | null;
  accessCount: number;
}

export interface CreateShareLinkRequest {
  deviceImei: string;
  label?: string;
  /** 1-168 (backend limit). */
  expiresInHours: number;
  showHistory: boolean;
  allowRealtime: boolean;
}
