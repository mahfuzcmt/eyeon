"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "@/lib/i18n";

export function ContactForm() {
  const { t } = useLocale();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // In production, send to backend API
    setSubmitting(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="mkt-card text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-status-moving/10">
          <svg className="h-8 w-8 text-status-moving" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-ink-900">Message Sent!</h3>
        <p className="mt-2 text-ink-600">{t("mkt.contact.form.success")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mkt-card">
      <h3 className="mb-6 text-lg font-semibold text-ink-900">
        {t("mkt.contact.form.title")}
      </h3>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink-700">
              {t("mkt.contact.form.name")} *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mkt-input"
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700">
              {t("mkt.contact.form.email")} *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mkt-input"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-ink-700">
              {t("mkt.contact.form.phone")} *
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="+880 1XX-XXXXXXX"
              className="mkt-input"
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-ink-700">
              {t("mkt.contact.form.company")}
            </label>
            <input
              id="company"
              name="company"
              type="text"
              className="mkt-input"
              disabled={submitting}
            />
          </div>
        </div>

        <div>
          <label htmlFor="fleetSize" className="mb-1.5 block text-sm font-medium text-ink-700">
            {t("mkt.contact.form.fleetSize")} *
          </label>
          <select
            id="fleetSize"
            name="fleetSize"
            required
            className="mkt-select"
            disabled={submitting}
          >
            <option value="">{t("common.loading").replace("…", "")}</option>
            <option value="1-5">{t("mkt.contact.fleetSize.1-5")}</option>
            <option value="6-20">{t("mkt.contact.fleetSize.6-20")}</option>
            <option value="21-50">{t("mkt.contact.fleetSize.21-50")}</option>
            <option value="50+">{t("mkt.contact.fleetSize.50+")}</option>
          </select>
        </div>

        <div>
          <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-ink-700">
            {t("mkt.contact.form.message")} *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            className="mkt-textarea"
            disabled={submitting}
          />
        </div>

        {error && (
          <div className="rounded-md border border-alarm-red/40 bg-alarm-red/10 px-4 py-3 text-sm text-alarm-red">
            {t("mkt.contact.form.error")}
          </div>
        )}

        <button type="submit" className="mkt-btn-primary w-full" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              {t("common.loading")}
            </span>
          ) : (
            <>
              {t("mkt.contact.form.submit")}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
