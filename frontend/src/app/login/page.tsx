"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { login } from "@/lib/auth";
import { useLocale } from "@/lib/i18n";
import { LanguageToggle } from "@/components/shell/LanguageToggle";
import { EyeOnLogoInline } from "@/components/marketing/EyeOnLogo";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";

  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ email, password });
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
      {/* Branded GPS background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/login-bg.svg')" }}
      />

      {/* Additional overlay for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-900/60 via-transparent to-brand-700/40"
      />

      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-4">
        <EyeOnLogoInline />
        <LanguageToggle />
      </header>

      <div className="relative z-0 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Branding above form */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {t("auth.signIn")}
            </h2>
            <p className="mt-2 text-[15px] text-brand-100/80">
              {t("auth.subtitle")}
            </p>
          </div>

          {/* Login form card */}
          <div className="panel p-8 shadow-2xl backdrop-blur-sm bg-white/95 border-surface-200">
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[14px] font-semibold uppercase tracking-wide text-ink-600">
                  {t("auth.email")}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input h-10 text-[15px]"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-[14px] font-semibold uppercase tracking-wide text-ink-600">
                  {t("auth.password")}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  className="input h-10 text-[15px]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {error && (
                <div className="rounded-md border border-alarm-red/40 bg-alarm-red/10 px-3 py-2.5 text-[15px] text-alarm-red">
                  {error}
                </div>
              )}

              <div className="-mt-2 text-right">
                <Link href="/login/forgot" className="text-[14px] font-medium text-brand-500 hover:text-brand-600">
                  {t("auth.forgotPassword")}
                </Link>
              </div>

              <button type="submit" className="btn-primary w-full h-10 text-[15px]" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    {t("common.loading")}
                  </span>
                ) : (
                  t("auth.signIn")
                )}
              </button>
            </form>

            {/* Footer branding */}
            <div className="mt-6 pt-5 border-t border-surface-200">
              <p className="text-center text-[14px] text-ink-500">
                <span className="font-semibold text-brand-500">EyeOn</span> Family Safety
              </p>
            </div>
          </div>

          {/* Bottom tagline */}
          <p className="mt-6 text-center text-[14px] text-brand-100/70">
            {t("auth.tagline")}
          </p>
        </div>
      </div>
    </main>
  );
}
