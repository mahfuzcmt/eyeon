"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session-context";
import { changePassword } from "@/lib/auth";

/** The signed-in user's own account: identity + password change. */
export function AccountTab() {
  const { t } = useLocale();
  const { email, role } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (next !== confirm) {
      setError(t("auth.reset.mismatch"));
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.reset.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-surface-200 bg-surface-50 p-3 text-[13px] text-ink-500">
        <div>
          <div className="uppercase">{t("auth.email")}</div>
          <div className="mt-0.5 font-semibold text-ink-900">{email}</div>
        </div>
        <div>
          <div className="uppercase">{t("account.role")}</div>
          <div className="mt-0.5 font-semibold text-ink-900">{role}</div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <h2 className="t-heading">{t("account.changePassword")}</h2>
          <p className="t-caption mt-1">{t("account.changePasswordHelp")}</p>
        </div>
        <Field label={t("account.currentPassword")}>
          <input type="password" autoComplete="current-password" required className="input" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={busy} />
        </Field>
        <Field label={t("auth.reset.newPassword")}>
          <input type="password" autoComplete="new-password" required minLength={8} className="input" value={next} onChange={(e) => setNext(e.target.value)} disabled={busy} />
        </Field>
        <Field label={t("auth.reset.confirmPassword")}>
          <input type="password" autoComplete="new-password" required minLength={8} className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy} />
        </Field>
        {error && <div className="text-[13px] text-alarm-red">{error}</div>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? t("common.loading") : t("account.updatePassword")}
          </button>
          {saved && <span className="text-[13px] text-brand-500">{t("account.passwordUpdated")}</span>}
        </div>
      </form>
    </div>
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
