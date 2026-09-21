"use client";

import { useState } from "react";
import { api, extractError } from "@/lib/api";
import { useLocale, type StringKey } from "@/lib/i18n";
import { buildVehicleSvg, VEHICLE_TYPES, DEFAULT_ICON_COLOR, type VehicleTypeId } from "@/lib/vehicleIcons";
import { useDeviceGroups } from "@/hooks/useDeviceGroups";
import type { DeviceView } from "@/types/domain";

interface Props {
  device: DeviceView;
  onClose: () => void;
  /** Called with the updated device returned by the backend. */
  onSaved: (device: DeviceView) => void;
}

const COLOR_SWATCHES = [
  DEFAULT_ICON_COLOR, // brand orange
  "#DC2626", // red
  "#16A34A", // green
  "#2B82D4", // blue
  "#7C3AED", // purple
  "#0F2742", // navy
  "#D97706", // amber
  "#DB2777", // pink
];

export function DeviceEditModal({ device, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const [name, setName] = useState(device.name ?? "");
  const [simMsisdn, setSimMsisdn] = useState(device.simMsisdn ?? "");
  const [plate, setPlate] = useState(device.vehiclePlate ?? "");
  const [vehicleType, setVehicleType] = useState<VehicleTypeId>(
    (VEHICLE_TYPES as readonly string[]).includes(device.vehicleType ?? "")
      ? (device.vehicleType as VehicleTypeId)
      : "CAR",
  );
  const [iconColor, setIconColor] = useState(device.iconColor || DEFAULT_ICON_COLOR);
  const { groups, assignDevices, unassignDevices } = useDeviceGroups();
  const [groupId, setGroupId] = useState<string>(device.groupId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.patch<DeviceView>(`/devices/${encodeURIComponent(device.imei)}`, {
        name: name.trim() || null,
        simMsisdn: simMsisdn.trim() || null,
        vehiclePlate: plate.trim() || null,
        vehicleType,
        iconColor,
      });
      // Group membership lives on the groups API, not the device PATCH.
      let saved = r.data;
      const oldGroup = device.groupId ?? "";
      if (groupId !== oldGroup) {
        if (groupId) await assignDevices(groupId, [device.imei]);
        else if (oldGroup) await unassignDevices(oldGroup, [device.imei]);
        saved = { ...saved, groupId: groupId || null };
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-white/70 p-4" onClick={onClose}>
      <div
        className="panel w-full max-w-sm max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span className="text-[13px] font-semibold text-ink-900">{t("veh.edit")}</span>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t("common.close")}>
            ×
          </button>
        </div>

        <div className="panel-body flex flex-col gap-3">
          <label className="text-[13px]">
            <span className="mb-1 block text-ink-9000">{t("veh.name")}</span>
            <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="text-[13px]">
            <span className="mb-1 block text-ink-9000">{t("fleet.sim")}</span>
            <input
              type="tel"
              className="input font-mono"
              value={simMsisdn}
              onChange={(e) => setSimMsisdn(e.target.value)}
              placeholder="+8801XXXXXXXXX"
            />
          </label>

          <label className="text-[13px]">
            <span className="mb-1 block text-ink-9000">{t("veh.plate")}</span>
            <input
              type="text"
              className="input font-mono"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="DM-GHA-32-3223"
            />
          </label>

          <label className="text-[13px]">
            <span className="mb-1 block text-ink-9000">{t("veh.group")}</span>
            <select className="select" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">{t("list.ungrouped")}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>

          <div className="text-[13px]">
            <span className="mb-1 block text-ink-9000">{t("veh.icon")}</span>
            <div className="grid grid-cols-5 gap-1.5">
              {VEHICLE_TYPES.map((ty) => (
                <button
                  key={ty}
                  type="button"
                  onClick={() => setVehicleType(ty)}
                  className={`flex flex-col items-center gap-0.5 rounded-sm border p-1.5 transition ${
                    vehicleType === ty
                      ? "border-brand-500 bg-brand-50"
                      : "border-surface-300 hover:bg-surface-100"
                  }`}
                >
                  <span
                    // Trusted static SVG built from our own constants.
                    dangerouslySetInnerHTML={{ __html: buildVehicleSvg(ty, iconColor, 0, 34) }}
                  />
                  <span className="text-[11px] text-ink-700">{t(`veh.type.${ty}` as StringKey)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[13px]">
            <span className="mb-1 block text-ink-9000">{t("veh.iconColor")}</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setIconColor(c)}
                  className={`h-6 w-6 rounded-full border-2 transition ${
                    iconColor.toLowerCase() === c.toLowerCase()
                      ? "border-ink-900 scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                className="h-6 w-8 cursor-pointer rounded border border-surface-300"
                value={iconColor}
                onChange={(e) => setIconColor(e.target.value)}
                title={iconColor}
              />
            </div>
          </div>

          {error && <div className="text-[13px] text-alarm-red">{error}</div>}

          <div className="mt-1 flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={busy}>
              {t("common.cancel")}
            </button>
            <button type="button" className="btn-primary flex-1" onClick={save} disabled={busy}>
              {busy ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
