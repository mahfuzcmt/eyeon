"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../LanguageContext";
import { AnimatedSection, CONTACT, Icon, ICONS, PageHero, WhatsAppIcon, fadeInUp, whatsappLink } from "../shared";

type Role = "parent" | "school" | "coaching" | "other";
const ROLES: Role[] = ["parent", "school", "coaching", "other"];

const inputClass =
  "h-12 w-full rounded-xl border border-surface-300 bg-white px-4 text-ink-800 placeholder-ink-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";
const labelClass = "mb-1.5 block text-sm font-medium text-ink-700";

/*
 * There is no enquiry endpoint on the backend, so the form does not pretend to
 * submit anywhere: it opens WhatsApp with the message pre-filled, addressed to the
 * pre-order number. Office address, email, map and opening hours are deliberately
 * absent until the business owner supplies real ones.
 */
export function ContactPage() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("parent");
  const [institution, setInstitution] = useState("");
  const [howMany, setHowMany] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const lines = [
      t("contact.form.intro"),
      `${t("contact.form.name")}: ${name}`,
      `${t("contact.form.phone")}: ${phone}`,
      `${t("contact.form.iAm")}: ${t(`contact.form.role.${role}`)}`,
      role !== "parent" && institution ? `${t("contact.form.institution")}: ${institution}` : "",
      howMany ? `${t("contact.form.howMany")}: ${howMany}` : "",
      message ? `${t("contact.form.message")}: ${message}` : "",
    ].filter(Boolean);
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <PageHero badgeKey="contact.badge" titleKey="contact.title" descKey="contact.desc" />

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection>
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Contact details */}
              <motion.div variants={fadeInUp}>
                <h2 className="font-display text-3xl font-bold text-ink-900">{t("contact.letsTalk")}</h2>
                <p className="mt-4 text-lg text-ink-500">{t("contact.letsTalkDesc")}</p>

                <div className="mt-10 space-y-5">
                  <a
                    href={`tel:${CONTACT.phoneTel}`}
                    className="flex items-start gap-4 rounded-2xl border border-surface-300 bg-surface-50 p-5 transition-all hover:border-brand-200 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sun-400 text-ink-900">
                      <Icon path={ICONS.phone} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wider text-ink-500">{t("contact.phoneLabel")}</div>
                      <div className="mt-1 font-display text-2xl font-bold text-ink-900">{CONTACT.phoneDisplay}</div>
                      <div className="mt-1 text-sm text-ink-500">{t("contact.phoneNote")}</div>
                    </div>
                  </a>

                  <a
                    href={whatsappLink(t("whatsapp.message"))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-4 rounded-2xl border border-surface-300 bg-surface-50 p-5 transition-all hover:border-brand-200 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                      <WhatsAppIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wider text-ink-500">{t("contact.whatsappLabel")}</div>
                      <div className="mt-1 font-display text-2xl font-bold text-ink-900">{CONTACT.phoneDisplay}</div>
                      <div className="mt-1 text-sm text-ink-500">{t("contact.whatsappNote")}</div>
                    </div>
                  </a>

                  <div className="flex items-start gap-4 rounded-2xl border border-surface-300 bg-surface-50 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                      <Icon path={ICONS.message} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wider text-ink-500">{t("contact.supportLabel")}</div>
                      <div className="mt-1 text-[16px] font-medium text-ink-900">{t("contact.supportNote")}</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Enquiry form -> WhatsApp */}
              <motion.div variants={fadeInUp}>
                <div className="rounded-3xl bg-surface-50 p-6 shadow-sm sm:p-8">
                  <h3 className="mb-6 font-display text-2xl font-bold text-ink-900">{t("contact.form.title")}</h3>
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="enquiry-name" className={labelClass}>{t("contact.form.name")} *</label>
                        <input id="enquiry-name" type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label htmlFor="enquiry-phone" className={labelClass}>{t("contact.form.phone")} *</label>
                        <input id="enquiry-phone" type="tel" required autoComplete="tel" placeholder="01XXX-XXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="enquiry-role" className={labelClass}>{t("contact.form.iAm")}</label>
                      <select id="enquiry-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t(`contact.form.role.${r}`)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {role !== "parent" && (
                      <div>
                        <label htmlFor="enquiry-institution" className={labelClass}>{t("contact.form.institution")}</label>
                        <input id="enquiry-institution" type="text" autoComplete="organization" value={institution} onChange={(e) => setInstitution(e.target.value)} className={inputClass} />
                      </div>
                    )}

                    <div>
                      <label htmlFor="enquiry-how-many" className={labelClass}>{t("contact.form.howMany")}</label>
                      <input id="enquiry-how-many" type="number" min={1} inputMode="numeric" value={howMany} onChange={(e) => setHowMany(e.target.value)} className={inputClass} />
                    </div>

                    <div>
                      <label htmlFor="enquiry-message" className={labelClass}>{t("contact.form.message")}</label>
                      <textarea
                        id="enquiry-message"
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t("contact.form.messagePlaceholder")}
                        className="w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-ink-800 placeholder-ink-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>

                    <button
                      type="submit"
                      className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 text-[16px] font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600"
                    >
                      <WhatsAppIcon />
                      {t("contact.form.submit")}
                    </button>
                    <p className="text-sm leading-relaxed text-ink-500">{t("contact.form.note")}</p>
                  </form>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
