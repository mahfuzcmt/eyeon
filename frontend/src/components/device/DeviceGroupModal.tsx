"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { extractError } from "@/lib/api";
import type { DeviceGroupView, DeviceGroupCreate, DeviceGroupUpdate } from "@/types/domain";

const GROUP_COLORS = ["#0421bc", "#16A34A", "#DC2626", "#F59E0B", "#8B5CF6", "#EC4899", "#0891B2", "#78716C"];

export const GROUP_ICONS = [
  { id: "folder", svg: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
  { id: "truck", svg: "M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0zM5 8h10a2 2 0 012 2v5H3V10a2 2 0 012-2z" },
  { id: "motorcycle", svg: "M5 17a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4zM5 15h4l2-4h4l2 4h2" },
  { id: "car", svg: "M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0zM3 12h18v4H3v-4zm2-4h14l2 4H3l2-4z" },
  { id: "bus", svg: "M5 17a1 1 0 100-2 1 1 0 000 2zm14 0a1 1 0 100-2 1 1 0 000 2zM4 6h16a2 2 0 012 2v8H2V8a2 2 0 012-2z" },
  { id: "delivery", svg: "M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z" },
];

interface DeviceGroupModalProps {
  /** Present when editing; absent when creating. */
  group?: DeviceGroupView;
  onSave: (data: DeviceGroupCreate | DeviceGroupUpdate) => Promise<void>;
  onClose: () => void;
}

/** Create / edit a vehicle group (name, colour, icon). Sits above the floating vehicle panel. */
export function DeviceGroupModal({ group, onSave, onClose }: DeviceGroupModalProps) {
  const { t } = useLocale();
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [color, setColor] = useState(group?.color ?? GROUP_COLORS[0]);
  const [icon, setIcon] = useState(group?.icon ?? "folder");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("group.nameRequired"));
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave({ name: name.trim(), description: description.trim() || undefined, color, icon });
      onClose();
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal max-w-md" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="t-heading">{group ? t("group.edit") : t("group.new")}</span>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t("common.close")}>×</button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <label className="text-[13px]">
            <span className="mb-1 block text-ink-500">{t("group.name")} *</span>
            <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("group.namePlaceholder")} disabled={saving} autoFocus />
          </label>

          <label className="text-[13px]">
            <span className="mb-1 block text-ink-500">{t("group.description")}</span>
            <input type="text" className="input" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
          </label>

          <div className="text-[13px]">
            <span className="mb-1 block text-ink-500">{t("group.color")}</span>
            <div className="flex flex-wrap gap-1.5">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 transition ${color === c ? "scale-110 border-ink-900" : "border-transparent hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                  disabled={saving}
                />
              ))}
            </div>
          </div>

          <div className="text-[13px]">
            <span className="mb-1 block text-ink-500">{t("group.icon")}</span>
            <div className="flex flex-wrap gap-1.5">
              {GROUP_ICONS.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setIcon(i.id)}
                  className={`flex h-9 w-9 items-center justify-center rounded-sm border transition ${
                    icon === i.id ? "border-brand-500 bg-brand-50 text-brand-500" : "border-surface-300 text-ink-500 hover:bg-surface-100"
                  }`}
                  aria-label={i.id}
                  disabled={saving}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={i.svg} />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[13px] text-alarm-red">{error}</p>}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t("common.cancel")}</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? t("common.loading") : group ? t("common.save") : t("group.create")}
          </button>
        </div>
      </form>
    </div>
  );
}
