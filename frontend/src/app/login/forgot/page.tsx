"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forgotPassword, resetPassword } from "@/lib/auth";
import { useLocale } from "@/lib/i18n";
import { LanguageToggle } from "@/components/shell/LanguageToggle";
import { EyeOnLogoInline } from "@/components/marketing/EyeOnLogo";

type Step = "email" | "code" | "done";

/**
 * Forgot-password: email → 6-digit SMS code + new password → back to login.
 * The backend never says whether the email exists, so the copy after step 1
 * is deliberately conditional.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRequest(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await forgotPassword(email.trim());
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.reset.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("auth.reset.mismatch"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(email.trim(), code.trim(), password);
      setStep("done");
      setTimeout(() => router.replace("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.reset.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-900 via-[#134472] to-brand-700">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/login-bg.svg')" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-900/60 via-transparent to-brand-700/40" />

      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-4">
        <EyeOnLogoInline />
        <LanguageToggle />
      </header>

      <div className="relative z-0 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">{t("auth.reset.title")}</h2>
            <p className="mt-2 text-[14px] text-brand-100/80">
              {step === "email" ? t("auth.reset.introEmail") : step === "code" ? t("auth.reset.introCode") : t("auth.reset.done")}
            </p>
          </div>

          <div className="panel border-surface-200 bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
            {step === "email" && (
              <form onSubmit={onRequest} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ink-600">
                    {t("auth.email")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input h-10 text-[14px]"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                {error && <div className="rounded-md border border-alarm-red/40 bg-alarm-red/10 px-3 py-2.5 text-[14px] text-alarm-red">{error}</div>}
                <button type="submit" className="btn-primary h-10 w-full text-[14px]" disabled={submitting}>
                  {submitting ? t("common.loading") : t("auth.reset.sendCode")}
                </button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={onReset} className="space-y-5">
                <div className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2.5 text-[13px] text-ink-700">
                  {t("auth.reset.sentNotice")}
                </div>
                <div>
                  <label htmlFor="code" className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ink-600">
                    {t("auth.reset.code")}
                  </label>
                  <input
                    id="code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                    className="input h-10 text-center font-mono text-lg tracking-[0.4em]"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label htmlFor="new" className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ink-600">
                    {t("auth.reset.newPassword")}
                  </label>
                  <input id="new" type="password" autoComplete="new-password" required minLength={8} className="input h-10 text-[14px]" value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <label htmlFor="confirm" className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ink-600">
                    {t("auth.reset.confirmPassword")}
                  </label>
                  <input id="confirm" type="password" autoComplete="new-password" required minLength={8} className="input h-10 text-[14px]" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={submitting} />
                </div>
                {error && <div className="rounded-md border border-alarm-red/40 bg-alarm-red/10 px-3 py-2.5 text-[14px] text-alarm-red">{error}</div>}
                <button type="submit" className="btn-primary h-10 w-full text-[14px]" disabled={submitting}>
                  {submitting ? t("common.loading") : t("auth.reset.submit")}
                </button>
                <button type="button" className="w-full text-center text-[13px] text-ink-500 hover:text-ink-800" onClick={() => { setStep("email"); setError(null); }}>
                  {t("auth.reset.resend")}
                </button>
              </form>
            )}

            {step === "done" && (
              <div className="py-2 text-center text-[14px] text-ink-700">{t("auth.reset.done")}</div>
            )}

            <div className="mt-6 border-t border-surface-200 pt-5 text-center">
              <Link href="/login" className="text-[13px] font-medium text-brand-500 hover:text-brand-600">
                ← {t("auth.reset.backToLogin")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
