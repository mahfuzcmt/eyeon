import { api } from "@/lib/api";

/** Mirrors backend dto.CommandDtos.CommandResponse. */
export interface CommandResponse {
  ok: boolean;
  reply: string | null;
  error: string | null;
}

/** Cut the engine (GT06 DYD). Backend defaults the device password to 123456. */
export async function cutFuel(imei: string, devicePassword?: string): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${encodeURIComponent(imei)}/commands/cut-fuel`, {
    devicePassword,
  });
  return r.data;
}

/** Restore the engine (GT06 HFYD). */
export async function restoreFuel(imei: string, devicePassword?: string): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${encodeURIComponent(imei)}/commands/restore-fuel`, {
    devicePassword,
  });
  return r.data;
}

/** Ask the device to report its current address (GT06 DWXX). */
export async function queryAddress(imei: string, devicePassword?: string): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${encodeURIComponent(imei)}/commands/query-address`, {
    devicePassword,
  });
  return r.data;
}

/** Reboot/restart the device (GT06 RESET). */
export async function rebootDevice(imei: string, devicePassword?: string): Promise<CommandResponse> {
  const password = devicePassword || "123456";
  const r = await api.post<CommandResponse>(`/devices/${encodeURIComponent(imei)}/commands/raw`, {
    rawCommand: `RESET,${password}#`,
  });
  return r.data;
}

/** Send an arbitrary GT06 ASCII command, e.g. "SPDADD,ON,10,2#". */
export async function sendRawCommand(imei: string, rawCommand: string): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${encodeURIComponent(imei)}/commands/raw`, {
    rawCommand,
  });
  return r.data;
}

// ---- Jimi PL601 personal tracker (PL601 command list V1.4) ----

/** "Follow live": the tracker reports every 10 s for `seconds`, then returns to battery saving. */
export async function followLive(imei: string, seconds = 300): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${encodeURIComponent(imei)}/commands/live`, { seconds }, { timeout: 25_000 });
  return r.data;
}

/** "Locate now": a 30-second burst, i.e. about three fresh positions. */
export async function locateNow(imei: string): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${encodeURIComponent(imei)}/commands/locate`, {}, { timeout: 25_000 });
  return r.data;
}

/** "Find tracker": buzzer at full volume and flashing lights for `seconds`. */
export async function findTracker(imei: string, seconds = 20): Promise<CommandResponse> {
  const r = await api.post<CommandResponse>(`/devices/${encodeURIComponent(imei)}/commands/find`, { seconds }, { timeout: 25_000 });
  return r.data;
}
