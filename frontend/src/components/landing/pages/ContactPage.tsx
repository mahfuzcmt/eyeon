"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLanguage } from "../LanguageContext";

const PHONE = "+880 1999-036999";
const EMAIL = "hello@eyeongps.com";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? "visible" : "hidden"} variants={staggerContainer} className={className}>
      {children}
    </motion.div>
  );
}

function Icon({ path, className = "h-6 w-6" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  map: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  clock: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  arrow: "M5 12h14M12 5l7 7-7 7",
};

export function ContactPage() {
  const { t } = useLanguage();

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 pb-20 pt-32">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 inline-flex items-center rounded-full bg-brand-500/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-300">
              {t("contact.badge")}
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-4xl font-bold text-white sm:text-5xl">
              {t("contact.title")}
            </motion.h1>
            <motion.p variants={fadeInUp} className="mx-auto mt-4 max-w-2xl text-lg text-gray-300">
              {t("contact.desc")}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection>
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Contact Info */}
              <motion.div variants={fadeInUp}>
                <h2 className="text-3xl font-bold text-gray-900">{t("contact.letsTalk")}</h2>
                <p className="mt-4 text-lg text-gray-600">
                  {t("contact.letsTalkDesc")}
                </p>

                <div className="mt-10 space-y-6">
                  {/* Phone */}
                  <motion.a
                    href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}
                    whileHover={{ x: 4 }}
                    className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5 transition-all hover:border-brand-100 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                      <Icon path={ICONS.phone} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wider text-gray-500">{t("contact.salesSupport")}</div>
                      <div className="mt-1 text-xl font-bold text-gray-900">{PHONE}</div>
                      <div className="mt-1 text-sm text-gray-500">{t("contact.available")}</div>
                    </div>
                  </motion.a>

                  {/* Email */}
                  <motion.a
                    href={`mailto:${EMAIL}`}
                    whileHover={{ x: 4 }}
                    className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5 transition-all hover:border-brand-100 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                      <Icon path={ICONS.mail} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wider text-gray-500">{t("contact.email")}</div>
                      <div className="mt-1 text-xl font-bold text-gray-900">{EMAIL}</div>
                      <div className="mt-1 text-sm text-gray-500">{t("contact.emailResponse")}</div>
                    </div>
                  </motion.a>

                  {/* Address */}
                  <motion.div
                    whileHover={{ x: 4 }}
                    className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5 transition-all hover:border-brand-100 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                      <Icon path={ICONS.map} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wider text-gray-500">{t("contact.office")}</div>
                      <div className="mt-1 text-xl font-bold text-gray-900">{t("footer.address")}</div>
                      <div className="mt-1 text-sm text-gray-500">{t("contact.visitDemo")}</div>
                    </div>
                  </motion.div>

                  {/* Business Hours */}
                  <motion.div
                    whileHover={{ x: 4 }}
                    className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5 transition-all hover:border-brand-100 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                      <Icon path={ICONS.clock} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wider text-gray-500">{t("contact.businessHours")}</div>
                      <div className="mt-1 text-lg font-bold text-gray-900">{t("contact.hours")}</div>
                      <div className="mt-1 text-sm text-gray-500">{t("contact.fridayClosed")}</div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Contact Form */}
              <motion.div variants={fadeInUp}>
                <div className="rounded-2xl bg-gray-50 p-8 shadow-sm">
                  <h3 className="mb-6 text-2xl font-bold text-gray-900">{t("contact.requestDemo")}</h3>
                  <form className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("contact.fullName")} *</label>
                        <input
                          type="text"
                          required
                          className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          placeholder=""
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("contact.phoneNumber")} *</label>
                        <input
                          type="tel"
                          required
                          className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          placeholder="01XXX-XXXXXX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("contact.emailAddress")}</label>
                      <input
                        type="email"
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        placeholder=""
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("contact.companyName")}</label>
                      <input
                        type="text"
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        placeholder=""
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("contact.fleetSize")}</label>
                      <select className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
                        <option value="">{t("contact.selectFleet")}</option>
                        <option>1-5 {t("contact.vehicles")}</option>
                        <option>6-20 {t("contact.vehicles")}</option>
                        <option>21-50 {t("contact.vehicles")}</option>
                        <option>50-100 {t("contact.vehicles")}</option>
                        <option>100+ {t("contact.vehicles")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("contact.message")}</label>
                      <textarea
                        rows={4}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        placeholder={t("contact.messagePlaceholder")}
                      />
                    </div>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[16px] font-bold text-white shadow-lg shadow-brand-600/30 transition-all hover:bg-brand-700 hover:shadow-xl"
                    >
                      {t("contact.submit")}
                      <Icon path={ICONS.arrow} className="h-5 w-5" />
                    </motion.button>
                  </form>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Map Section */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeInUp} className="overflow-hidden rounded-2xl shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3651.8982253779893!2d90.37568847607619!3d23.751006588731426!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b8b33cffc3fb%3A0x4a826f475fd312af!2sDhanmondi%2C%20Dhaka!5e0!3m2!1sen!2sbd!4v1691234567890!5m2!1sen!2sbd"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="EyeOn Office Location"
                className="w-full"
              />
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
