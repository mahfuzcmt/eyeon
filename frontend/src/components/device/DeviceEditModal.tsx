"use client";

import { useRef, useState } from "react";
import { api, extractError } from "@/lib/api";
import { useLocale, type StringKey } from "@/lib/i18n";
import { buildPersonAvatar, personPhotoUrl, PERSON_TYPES, DEFAULT_ICON_COLOR, normalizePersonType, type PersonTypeId } from "@/lib/personIcons";
import { useDeviceGroups } from "@/hooks/useDeviceGroups";
import type { DeviceView } from "@/types/domain";

interface Props {
  device: DeviceView;
  onClose: () => void;
  /** Called with the updated device returned by the backend. */
  onSaved: (device: DeviceView) => void;
  /** Called as soon as a photo is uploaded or removed (the form stays open). */
  onPhotoChanged?: (device: DeviceView) => void;
}

/** Upload size: the server stores 256 px; 512 keeps the re-encode sharp on dense screens. */
const PHOTO_UPLOAD_PX = 512;

/**
 * Centre-crop to a square and re-encode as JPEG in the browser. A phone photo is several
 * megabytes; this sends ~60 kB, applies the EXIF rotation and drops the metadata (the
 * server re-encodes again regardless).
 */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_UPLOAD_PX;
    canvas.height = PHOTO_UPLOAD_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, PHOTO_UPLOAD_PX, PHOTO_UPLOAD_PX);
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PHOTO_UPLOAD_PX, PHOTO_UPLOAD_PX);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.9),
    );
  } finally {
    bitmap.close();
  }
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

export function DeviceEditModal({ device, onClose, onSaved, onPhotoChanged }: Props) {
  const { t } = useLocale();
  const [name, setName] = useState(device.name ?? "");
  const [simMsisdn, setSimMsisdn] = useState(device.simMsisdn ?? "");
  const [plate, setPlate] = useState(device.vehiclePlate ?? "");
  // Stored in devices.vehicle_type (the column name is inherited); values are person types.
  const [vehicleType, setVehicleType] = useState<PersonTypeId>(normalizePersonType(device.vehicleType));
  const [iconColor, setIconColor] = useState(device.iconColor || DEFAULT_ICON_COLOR);
  const { groups, assignDevices, unassignDevices } = useDeviceGroups();
  const [groupId, setGroupId] = useState<string>(device.groupId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoAt, setPhotoAt] = useState<string | null>(device.photoUpdatedAt ?? null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoPath = `/devices/${encodeURIComponent(device.imei)}/photo`;

  const applyPhoto = (version: string | null) => {
    setPhotoAt(version);
    onPhotoChanged?.({ ...device, photoUpdatedAt: version });
  };

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const jpeg = await toSquareJpeg(file);
      const r = await api.put<{ photoUpdatedAt: string }>(photoPath, jpeg, {
        headers: { "Content-Type": "image/jpeg" },
        timeout: 30_000,
      });
      applyPhoto(r.data.photoUpdatedAt);
    } catch {
      setError(t("photo.failed"));
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    setError(null);
    try {
      await api.delete(photoPath);
      applyPhoto(null);
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setPhotoBusy(false);
    }
  };

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
    <div
      className="fixed inset-0 z-[2400] flex items-end justify-center bg-ink-950/40 p-0 sm:items-center sm:bg-white/70 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="panel max-h-[92dvh] w-full overflow-y-auto rounded-b-none sm:max-h-[90vh] sm:max-w-sm sm:rounded-b-[12px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span className="text-[14px] font-semibold text-ink-900">{t("veh.edit")}</span>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t("common.close")}>
            ×
          </button>
        </div>

        <div className="panel-body flex flex-col gap-3">
          <div className="text-[14px]">
            <span className="mb-1 block text-ink-900">{t("photo.title")}</span>
            <div className="flex items-center gap-3">
              <span
                className="shrink-0"
                // Trusted markup built from our own constants and the device's own photo URL.
                dangerouslySetInnerHTML={{
                  __html: buildPersonAvatar(vehicleType, iconColor, 72, personPhotoUrl({ imei: device.imei, photoUpdatedAt: photoAt })),
                }}
              />
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-ghost" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
                    {photoBusy ? t("common.loading") : photoAt ? t("photo.change") : t("photo.upload")}
                  </button>
                  {photoAt && (
                    <button type="button" className="btn-ghost text-alarm-red" disabled={photoBusy} onClick={() => void removePhoto()}>
                      {t("photo.remove")}
                    </button>
                  )}
                </div>
                <span className="text-[13px] text-ink-500">{t("photo.hint")}</span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void uploadPhoto(e.target.files?.[0])}
              />
            </div>
          </div>

          <label className="text-[14px]">
            <span className="mb-1 block text-ink-9000">{t("veh.name")}</span>
            <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="text-[14px]">
            <span className="mb-1 block text-ink-9000">{t("fleet.sim")}</span>
            <input
              type="tel"
              className="input font-mono"
              value={simMsisdn}
              onChange={(e) => setSimMsisdn(e.target.value)}
              placeholder="+8801XXXXXXXXX"
            />
          </label>

          <label className="text-[14px]">
            <span className="mb-1 block text-ink-9000">{t("veh.plate")}</span>
            <input
              type="text"
              className="input font-mono"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="DM-GHA-32-3223"
            />
          </label>

          <label className="text-[14px]">
            <span className="mb-1 block text-ink-9000">{t("veh.group")}</span>
            <select className="select" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">{t("list.ungrouped")}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>

          <div className="text-[14px]">
            <span className="mb-1 block text-ink-900">{t("veh.icon")}</span>
            <div className="grid grid-cols-4 gap-2">
              {PERSON_TYPES.map((ty) => (
                <button
                  key={ty}
                  type="button"
                  onClick={() => setVehicleType(ty)}
                  aria-pressed={vehicleType === ty}
                  className={`flex flex-col items-center gap-1 rounded-md border p-2 transition ${
                    vehicleType === ty
                      ? "border-brand-500 bg-brand-50"
                      : "border-surface-300 hover:bg-surface-100"
                  }`}
                >
                  <span
                    // Trusted static SVG built from our own constants.
                    dangerouslySetInnerHTML={{ __html: buildPersonAvatar(ty, iconColor, 48) }}
                  />
                  <span className="text-[13px] text-ink-700">{t(`person.type.${ty}` as StringKey)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[14px]">
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

          {error && <div className="text-[14px] text-alarm-red">{error}</div>}

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
