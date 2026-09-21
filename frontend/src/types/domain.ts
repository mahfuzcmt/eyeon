export type DeviceStatus = "ONLINE" | "OFFLINE" | "NEVER_CONNECTED";
export type UserRole = "SUPER_ADMIN" | "ORG_ADMIN" | "ORG_USER";

export interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  status: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  locale: string;
  timezone: string;
  /** Org-owned Google Maps browser key; null = platform default. */
  googleMapsApiKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgUpdate {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  locale?: string;
  timezone?: string;
  /** Omit = unchanged, "" = clear (use platform key). */
  googleMapsApiKey?: string;
}

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
  phone?: string;
  fullName: string;
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

/**
 * Mirrors backend `dto.DeviceDtos.DeviceView`. Field names are the wire
 * format — keep them aligned with the Java record.
 */
export interface DeviceView {
  id: string;
  groupId: string | null;
  driverId: string | null;
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
}

// ─────────────────────────────────────────────────────────────
// Device Group types
// ─────────────────────────────────────────────────────────────

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

export interface DeviceGroupCreate {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface DeviceGroupUpdate {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

// ─────────────────────────────────────────────────────────────
// Driver types
// ─────────────────────────────────────────────────────────────

export type DriverStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface DriverView {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  licenseNo: string | null;
  licenseType: string | null;
  licenseExpiry: string | null;
  nid: string | null;
  photoUrl: string | null;
  rfidCard: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  hireDate: string | null;
  status: DriverStatus;
  notes: string | null;
  assignedDeviceCount: number;
  licenseExpired: boolean;
  licenseExpiringSoon: boolean;
  createdAt: string;
}

export interface DriverCreate {
  name: string;
  phone?: string;
  email?: string;
  licenseNo?: string;
  licenseType?: string;
  licenseExpiry?: string;
  nid?: string;
  photoUrl?: string;
  rfidCard?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
  dateOfBirth?: string;
  hireDate?: string;
  notes?: string;
}

export interface DriverUpdate {
  name?: string;
  phone?: string;
  email?: string;
  licenseNo?: string;
  licenseType?: string;
  licenseExpiry?: string;
  nid?: string;
  photoUrl?: string;
  rfidCard?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
  dateOfBirth?: string;
  hireDate?: string;
  status?: DriverStatus;
  notes?: string;
}

/**
 * Mirrors backend `dto.DeviceDtos.DeviceUpdateRequest` (PATCH /devices/{imei}).
 * Null/omitted fields keep their current value.
 */
export interface DeviceUpdateRequest {
  name?: string | null;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  iconColor?: string | null;
}

/**
 * Mirrors backend `dto.LocationDtos.LocationView` AND the Redis-published
 * LocationEvent shape (LocationService.toJson). Both use latitude/longitude.
 */
export interface LocationView {
  imei: string;
  ts: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  /** Whether the NEWEST packet had a GPS fix. False ⇒ the coordinates are stale. */
  valid: boolean;
  /** When the coordinates were last confirmed by a fix. Null if never fixed. */
  lastValidTs?: string | null;
  satellites?: number | null;
  accOn?: boolean | null;
  voltageMv?: number | null;
  mileageMeters?: number | null;
  altitude?: number | null;
  gsmSignal?: number | null;
  engineHoursSeconds?: number | null;
}

export interface UserView {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  locale: "en" | "bn";
}

export interface OrgView {
  id: string;
  name: string;
  plan: string;
  locale: "en" | "bn";
}

export interface AuthMeResponse {
  user: UserView;
  org: OrgView;
}

export type GeofenceType = "CIRCLE" | "POLYGON";
export type GeofenceNotifyOn = "ENTER" | "EXIT" | "BOTH";

export interface LatLng { lat: number; lng: number; }

export interface GeofenceView {
  id: string;
  name: string;
  type: GeofenceType;
  notifyOn: GeofenceNotifyOn;
  color: string;
  active: boolean;
  center: LatLng | null;
  radiusM: number | null;
  polygon: LatLng[];
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceCreate {
  name: string;
  type: GeofenceType;
  notifyOn: GeofenceNotifyOn;
  color?: string;
  center?: LatLng;
  radiusM?: number;
  polygon?: LatLng[];
  imeis?: string[];
}

/** Mirrors backend domain.enums.AlarmType. */
export type AlarmType =
  | "SOS"
  | "POWER_CUT"
  | "SHOCK"
  | "OVERSPEED"
  | "GEOFENCE_ENTER"
  | "GEOFENCE_EXIT"
  | "COLLISION"
  | "ACC_ON"
  | "ACC_OFF"
  | "LOW_BATTERY"
  | "EXTERNAL_LOW_VOLTAGE"
  | "REMOVE"
  | "DOOR"
  | "URGENT_ACCELERATION"
  | "URGENT_DECELERATION"
  | "CURFEW_VIOLATION"
  | "PARKING_TIMEOUT"
  | "OFFLINE_TIMEOUT"
  | "ENGINE_IDLE";

/** ADL-style "process result" recorded when an alarm is acknowledged. */
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

/** Mirrors backend dto.NotificationDtos.NotificationSettingsView (sets arrive as arrays). */
export interface NotificationSettings {
  popupTypes: string[];
  soundTypes: string[];
  pushTypes: string[];
  availableTypes: string[];
  /** false = the user has never saved settings; values are platform defaults. */
  customized: boolean;
}

export interface NotificationSettingsUpdate {
  popupTypes: string[];
  soundTypes: string[];
  pushTypes: string[];
}

export type AlarmRuleType =
  | "SPEED_OVER"
  | "VOLTAGE_UNDER"
  | "ACC_ON_DURING_WINDOW"
  | "PARKING_TIMEOUT"
  | "OFFLINE_TIMEOUT"
  | "IDLE_TIMEOUT";

export interface AlarmRuleView {
  id: string;
  name: string;
  ruleType: AlarmRuleType;
  threshold: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  cooldownSeconds: number;
  severity: AlarmSeverity;
  active: boolean;
  appliesToAll: boolean;
  assignedImeis: string[];
  createdAt: string;
}

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
  processResult: AlarmProcessResult | null;
  processNotes: string | null;
  metadata: Record<string, unknown>;
}

export type ScheduleKind = "ONE_TIME" | "DAILY";
export type ScheduledCommandStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type ScheduledCommandType = "CUT_FUEL" | "RESTORE_FUEL" | "QUERY_ADDRESS" | "RAW";

export interface ScheduledCommandView {
  id: string;
  deviceImei: string;
  commandType: ScheduledCommandType;
  commandText: string;
  scheduleKind: ScheduleKind;
  runAt: string | null;
  daysOfWeek: number | null;
  timeOfDay: string | null;
  nextRunAt: string;
  status: ScheduledCommandStatus;
  lastAttemptAt: string | null;
  lastReply: string | null;
  lastError: string | null;
  attemptCount: number;
  createdAt: string;
}

export interface ScheduleRequest {
  deviceImei: string;
  commandType: ScheduledCommandType;
  rawCommand?: string;
  devicePassword?: string;
  scheduleKind: ScheduleKind;
  runAt?: string;
  daysOfWeek?: number | null;
  timeOfDay?: string;
}

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

/** Mirrors backend dto.ReportDtos.MonthlyDay. */
export interface MonthlyDayRow {
  date: string;
  trips: number;
  distanceM: number;
  drivingS: number;
  idleS: number;
  stoppedS: number;
  maxSpeed: number;
}

export interface MonthlyTotals {
  trips: number;
  distanceM: number;
  drivingS: number;
  idleS: number;
  stoppedS: number;
  maxSpeed: number;
}

/** Mirrors backend dto.ReportDtos.MonthlySummary (GET /reports/monthly-summary). */
export interface MonthlySummary {
  deviceImei: string;
  month: string;
  days: MonthlyDayRow[];
  totals: MonthlyTotals;
}

export type TripStatus = "IN_PROGRESS" | "COMPLETED";

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

// ─────────────────────────────────────────────────────────────
// Super Admin types
// ─────────────────────────────────────────────────────────────

export type OrgStatus = "ACTIVE" | "SUSPENDED" | "CANCELLED";

export interface OrgAdminView {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  status: OrgStatus;
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
  lastLat: number | null;
  lastLng: number | null;
  lastSpeed: number | null;
  lastVoltageMv: number | null;
  createdAt: string;
}

export interface AdminStats {
  totalOrgs: number;
  activeOrgs: number;
  totalDevices: number;
  onlineDevices: number;
  totalUsers: number;
}

// ─────────────────────────────────────────────────────────────
// User-Device Assignment types
// ─────────────────────────────────────────────────────────────

export interface DeviceAssignment {
  imei: string;
  name: string;
  vehiclePlate: string;
  assignedUsers: AssignedUserInfo[];
}

export interface AssignedUserInfo {
  id: string;
  email: string;
  fullName: string;
}

// ─────────────────────────────────────────────────────────────
// Subscription & Billing types
// ─────────────────────────────────────────────────────────────

export type SubscriptionStatus = "ACTIVE" | "GRACE" | "SUSPENDED" | "CANCELLED";

export interface SubscriptionView {
  id: string;
  orgId: string;
  deviceImei: string;
  planTier: string;
  monthlyPriceBdt: number;
  startedAt: string;
  nextDueAt: string;
  status: SubscriptionStatus;
  effectiveStatus: string;
  autoRenew: boolean;
  daysUntilDue: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface ExtendRequest {
  additionalDays?: number;
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
  monthlyPriceBdt?: number;
  days?: number;
}

// ─────────────────────────────────────────────────────────────
// Share Location Link types
// ─────────────────────────────────────────────────────────────

export interface ShareLinkView {
  id: string;
  deviceImei: string;
  token: string;
  label: string | null;
  expiresAt: string;
  showHistory: boolean;
  allowRealtime: boolean;
  shareUrl: string;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
}

export interface CreateShareLinkRequest {
  deviceImei: string;
  label?: string;
  expiresInHours: number;
  showHistory: boolean;
  allowRealtime: boolean;
}

/** Mirrors backend dto.ShareLocationDtos.SharedLocationView (public, no auth). */
export interface SharedLocationView {
  vehicleName: string | null;
  vehiclePlate: string | null;
  vehicleType: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  lastUpdate: string | null;
  isOnline: boolean;
  showHistory: boolean;
  allowRealtime: boolean;
}

export interface SharedHistoryPoint {
  ts: string;
  latitude: number;
  longitude: number;
  speed: number;
}
