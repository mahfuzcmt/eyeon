"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { useOrg } from "@/hooks/useOrg";
import { extractError } from "@/lib/api";
import type { OrgUpdate } from "@/types/domain";

const TIMEZONES = [
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Singapore",
  "UTC",
];

export function OrgInfoTab({ readOnly }: { readOnly: boolean }) {
  const { t } = useLocale();
  const { org, loading, error, update } = useOrg();

  const [form, setForm] = useState<OrgUpdate>({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyChanged, setKeyChanged] = useState(false);

  useEffect(() => {
    if (!org) return;
    setForm({
      name: org.name,
      contactEmail: org.contactEmail ?? "",
      contactPhone: org.contactPhone ?? "",
      address: org.address ?? "",
      locale: org.locale,
      timezone: org.timezone,
      googleMapsApiKey: org.googleMapsApiKey ?? "",
    });
  }, [org]);

  if (loading) return <div className="text-[14px] text-ink-400">{t("common.loading")}</div>;
  if (error) return <div className="text-[14px] text-alarm-red">{error}</div>;
  if (!org) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    setSaved(false);
    try {
      const wasKey = org?.googleMapsApiKey ?? "";
      const saved = await update(form);
      setSaved(true);
      // The Google JS API is loaded once per page, so a key change needs a reload to apply.
      setKeyChanged((saved.googleMapsApiKey ?? "") !== wasKey);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(extractError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const setField = <K extends keyof OrgUpdate>(k: K, v: OrgUpdate[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-surface-200 bg-surface-50 p-3 text-[13px] text-ink-500">
        <div>
          <div className="uppercase">{t("settings.org.plan")}</div>
          <div className="mt-0.5 font-semibold text-ink-900">{org.planTier}</div>
        </div>
        <div>
          <div className="uppercase">Slug</div>
          <div className="mt-0.5 font-mono font-semibold text-ink-900">{org.slug}</div>
        </div>
      </div>

      <Field label={t("settings.org.name")}>
        <input
          type="text"
          className="input"
          value={form.name ?? ""}
          onChange={(e) => setField("name", e.target.value)}
          disabled={readOnly}
        />
      </Field>

      <Field label={t("settings.org.contactEmail")}>
        <input
          type="email"
          className="input"
          value={form.contactEmail ?? ""}
          onChange={(e) => setField("contactEmail", e.target.value)}
          disabled={readOnly}
        />
      </Field>

      <Field label={t("settings.org.contactPhone")}>
        <input
          type="tel"
          className="input"
          value={form.contactPhone ?? ""}
          onChange={(e) => setField("contactPhone", e.target.value)}
          disabled={readOnly}
        />
      </Field>

      <Field label={t("settings.org.address")}>
        <textarea
          className="input min-h-[80px]"
          value={form.address ?? ""}
          onChange={(e) => setField("address", e.target.value)}
          disabled={readOnly}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("settings.org.locale")}>
          <select
            className="input"
            value={form.locale ?? "en"}
            onChange={(e) => setField("locale", e.target.value)}
            disabled={readOnly}
          >
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
        </Field>

        <Field label={t("settings.org.timezone")}>
          <select
            className="input"
            value={form.timezone ?? "Asia/Dhaka"}
            onChange={(e) => setField("timezone", e.target.value)}
            disabled={readOnly}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Map: bring-your-own Google Maps key (ADL-style per-account map key) */}
      <fieldset className="space-y-2 rounded-lg border border-surface-200 p-3">
        <legend className="px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-700">
          {t("settings.map.title")}
        </legend>
        <Field label={t("settings.map.googleKey")}>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              className="input font-mono"
              autoComplete="off"
              spellCheck={false}
              placeholder="AIza…"
              maxLength={39}
              value={form.googleMapsApiKey ?? ""}
              onChange={(e) => setField("googleMapsApiKey", e.target.value.trim())}
              disabled={readOnly}
            />
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={() => setShowKey((v) => !v)}
              aria-pressed={showKey}
            >
              {showKey ? t("settings.map.hide") : t("settings.map.show")}
            </button>
          </div>
        </Field>
        <p className="text-[13px] text-ink-500">{t("settings.map.googleKeyHelp")}</p>
        <p className="text-[13px] font-medium text-ink-700">
          {org.googleMapsApiKey ? t("settings.map.usingOwn") : t("settings.map.usingDefault")}
        </p>
      </fieldset>

      {saveError && <div className="text-[13px] text-alarm-red">{saveError}</div>}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? t("common.loading") : t("common.save")}
          </button>
          {saved && <span className="text-[13px] text-brand-500">{t("settings.org.saved")}</span>}
          {keyChanged && (
            <span className="text-[13px] text-amber-700">
              {t("settings.map.reloadHint")}{" "}
              <button type="button" className="underline" onClick={() => window.location.reload()}>
                {t("common.reload")}
              </button>
            </span>
          )}
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[14px]">
      <span className="mb-1 block text-[13px] uppercase tracking-wide text-ink-500">{label}</span>
      {children}
    </label>
  );
}
