"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { SponsorAdAdminView, SponsorAdInput } from "@/types/domain";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/proxy";

/** Same shape the server stores (SponsorAdService.WIDTH x HEIGHT), so the preview is what the app shows. */
const BANNER_W = 1200;
const BANNER_H = 600;

/** Centre-crop to 2:1 and encode as JPEG in the browser; the server re-encodes it again anyway. */
async function toBannerJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const target = BANNER_W / BANNER_H;
    let w = bitmap.width;
    let h = Math.round(w / target);
    if (h > bitmap.height) {
      h = bitmap.height;
      w = Math.round(h * target);
    }
    const canvas = document.createElement("canvas");
    canvas.width = BANNER_W;
    canvas.height = BANNER_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, BANNER_W, BANNER_H);
    ctx.drawImage(bitmap, (bitmap.width - w) / 2, (bitmap.height - h) / 2, w, h, 0, 0, BANNER_W, BANNER_H);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.88),
    );
  } finally {
    bitmap.close();
  }
}

function errorMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
  return msg || fallback;
}

/**
 * Super Admin → Sponsor ads: the banners of the slider on the mobile app's Home (CLAUDE.md §8.11).
 * Platform-wide: every family and school sees the same ads. An ad shows once it is switched on
 * and has an image; tapping it opens its link, if it has one.
 */
export function SponsorAdsTab() {
  const [ads, setAds] = useState<SponsorAdAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SponsorAdAdminView | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<SponsorAdAdminView[]>("/admin/sponsor-ads");
      setAds(r.data);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Could not load the sponsor ads."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (ad: SponsorAdAdminView) => {
    try {
      await api.patch(`/admin/sponsor-ads/${ad.id}`, { active: !ad.active });
      await load();
    } catch (e) {
      setError(errorMessage(e, "Could not change the ad."));
    }
  };

  const remove = async (ad: SponsorAdAdminView) => {
    if (!window.confirm(`Delete the ad "${ad.title || "untitled"}"? It disappears from every app at once.`)) return;
    try {
      await api.delete(`/admin/sponsor-ads/${ad.id}`);
      await load();
    } catch (e) {
      setError(errorMessage(e, "Could not delete the ad."));
    }
  };

  const shown = ads.filter((a) => a.active && a.imageUrl).length;

  // Several images at once (owner, 2026-11-05): one ad per image, switched on, in the order picked,
  // after the existing ones. Title and link can be added afterwards with Edit.
  const bulkRef = useRef<HTMLInputElement>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const uploadMany = async (files: File[]) => {
    if (files.length === 0) return;
    let order = ads.reduce((m, a) => Math.max(m, a.sortOrder + 1), 0);
    const failed: string[] = [];
    setError(null);
    setBulk({ done: 0, total: files.length });
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const jpeg = await toBannerJpeg(f);
        const body: SponsorAdInput = { title: "", linkUrl: "", sortOrder: order, active: true };
        const saved = (await api.post<SponsorAdAdminView>("/admin/sponsor-ads", body)).data;
        try {
          await api.put(`/admin/sponsor-ads/${saved.id}/image`, jpeg, {
            headers: { "Content-Type": "image/jpeg" },
            timeout: 30_000,
          });
          order++;
        } catch (e) {
          // Do not leave an empty ad behind.
          await api.delete(`/admin/sponsor-ads/${saved.id}`).catch(() => {});
          throw e;
        }
      } catch {
        failed.push(f.name);
      }
      setBulk({ done: i + 1, total: files.length });
    }
    setBulk(null);
    if (failed.length > 0) setError(`Could not upload: ${failed.join(", ")}`);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-900">Sponsor ads</h2>
          <p className="text-[14px] text-ink-500">
            The slider on the app&apos;s Home, the same for every family and school. {shown} of {ads.length} shown now.
            Use wide images (1200 × 600); they are cropped to that shape. &quot;Upload images&quot; adds one ad per image,
            as many as you pick.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={bulk !== null}
            onClick={() => bulkRef.current?.click()}
          >
            {bulk ? `Uploading ${bulk.done} of ${bulk.total}…` : "Upload images"}
          </button>
          <button type="button" className="btn-primary" onClick={() => setEditing("new")}>
            New ad
          </button>
          <input
            ref={bulkRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              void uploadMany(files);
            }}
          />
        </div>
      </div>

      {error && <p className="rounded-lg border border-alarm-red/40 bg-white px-3 py-2 text-[14px] text-alarm-red">{error}</p>}

      {loading && ads.length === 0 ? (
        <p className="text-[14px] text-ink-500">Loading…</p>
      ) : ads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-300 bg-white px-4 py-8 text-center text-[15px] text-ink-500">
          No sponsor ads yet. The app shows a &quot;Sponsor ads will be here&quot; placeholder until one is switched on.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ads.map((ad) => (
            <li key={ad.id} className="overflow-hidden rounded-xl border border-surface-300 bg-white">
              <div className="relative aspect-[2/1] bg-surface-100">
                {ad.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${API_BASE}${ad.imageUrl}`} alt={ad.title ?? "Sponsor ad"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[14px] text-ink-500">No image yet - not shown</div>
                )}
                <span
                  className={`absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                    ad.active && ad.imageUrl ? "bg-alarm-green text-white" : "bg-white text-ink-700"
                  }`}
                >
                  {ad.active ? (ad.imageUrl ? "Shown" : "On, needs an image") : "Off"}
                </span>
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate text-[15px] font-semibold text-ink-900">{ad.title || "Untitled"}</p>
                {ad.linkUrl ? (
                  <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-[14px] text-brand-600 underline">
                    {ad.linkUrl}
                  </a>
                ) : (
                  <p className="text-[14px] text-ink-500">No link - tapping does nothing</p>
                )}
                <p className="text-[13px] text-ink-500">Order {ad.sortOrder}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="button" className="btn-secondary" onClick={() => setEditing(ad)}>
                    Edit
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => void toggle(ad)}>
                    {ad.active ? "Switch off" : "Switch on"}
                  </button>
                  <button type="button" className="btn-danger" onClick={() => void remove(ad)}>
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <SponsorAdDialog
          ad={editing === "new" ? null : editing}
          nextOrder={ads.reduce((m, a) => Math.max(m, a.sortOrder + 1), 0)}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function SponsorAdDialog({
  ad,
  nextOrder,
  onClose,
  onSaved,
}: {
  ad: SponsorAdAdminView | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(ad?.title ?? "");
  const [link, setLink] = useState(ad?.linkUrl ?? "");
  const [order, setOrder] = useState(String(ad?.sortOrder ?? nextOrder));
  const [active, setActive] = useState(ad?.active ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(ad?.imageUrl ? `${API_BASE}${ad.imageUrl}` : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = async () => {
    const sortOrder = Number.parseInt(order, 10);
    if (Number.isNaN(sortOrder)) {
      setError("Order must be a whole number.");
      return;
    }
    const trimmed = link.trim();
    if (trimmed && !/^https?:\/\/\S+$/i.test(trimmed)) {
      setError("The link must start with https:// (or http://).");
      return;
    }
    if (!ad && !file) {
      setError("Choose an image for the ad.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body: SponsorAdInput = { title: title.trim(), linkUrl: trimmed, sortOrder, active };
      const saved = ad
        ? (await api.patch<SponsorAdAdminView>(`/admin/sponsor-ads/${ad.id}`, body)).data
        : (await api.post<SponsorAdAdminView>("/admin/sponsor-ads", body)).data;
      if (file) {
        const jpeg = await toBannerJpeg(file);
        await api.put(`/admin/sponsor-ads/${saved.id}/image`, jpeg, {
          headers: { "Content-Type": "image/jpeg" },
          timeout: 30_000,
        });
      }
      await onSaved();
    } catch (e) {
      setError(errorMessage(e, "Could not save the ad."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sponsor-ad-title">
      <div className="modal w-full max-w-lg">
        <div className="modal-header">
          <h3 id="sponsor-ad-title" className="text-base font-semibold text-ink-900">
            {ad ? "Edit sponsor ad" : "New sponsor ad"}
          </h3>
        </div>
        <div className="modal-body space-y-4">
          <div>
            <span className="mb-1 block text-[14px] font-medium text-ink-700">Image</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative block aspect-[2/1] w-full overflow-hidden rounded-xl border border-dashed border-brand-500 bg-surface-100"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[14px] font-medium text-brand-600">Choose an image (1200 × 600 works best)</span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-[13px] text-ink-500">JPEG or PNG. Cropped around the centre to a 2 : 1 banner.</p>
          </div>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-ink-700">Title (optional, read out by screen readers)</span>
            <input className="input w-full" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-ink-700">Link (optional, opened when the ad is tapped)</span>
            <input
              className="input w-full"
              value={link}
              maxLength={500}
              placeholder="https://example.com/offer"
              inputMode="url"
              onChange={(e) => setLink(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="mb-1 block text-[14px] font-medium text-ink-700">Order</span>
              <input className="input w-24" value={order} inputMode="numeric" onChange={(e) => setOrder(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 pb-2 text-[15px] text-ink-900">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5" />
              Show in the app
            </label>
          </div>
          {error && <p className="text-[14px] text-alarm-red">{error}</p>}
        </div>
        <div className="modal-footer flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
