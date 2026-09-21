"use client";

import { useLocale } from "@/lib/i18n";

const TESTIMONIALS = [
  {
    quoteKey: "mkt.testimonial.1.quote" as const,
    nameKey: "mkt.testimonial.1.name" as const,
    roleKey: "mkt.testimonial.1.role" as const,
    avatar: "KH",
  },
  {
    quoteKey: "mkt.testimonial.2.quote" as const,
    nameKey: "mkt.testimonial.2.name" as const,
    roleKey: "mkt.testimonial.2.role" as const,
    avatar: "RA",
  },
  {
    quoteKey: "mkt.testimonial.3.quote" as const,
    nameKey: "mkt.testimonial.3.name" as const,
    roleKey: "mkt.testimonial.3.role" as const,
    avatar: "FB",
  },
];

export function TestimonialSection() {
  const { t } = useLocale();

  return (
    <section className="mkt-section bg-white">
      <div className="mkt-container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mkt-heading-lg">
            {t("mkt.testimonials.title")}
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3 md:mt-16">
          {TESTIMONIALS.map((testimonial, idx) => (
            <div key={idx} className="mkt-testimonial">
              {/* Quote icon */}
              <svg className="h-8 w-8 text-brand-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>

              <p className="mkt-testimonial-quote">
                &ldquo;{t(testimonial.quoteKey)}&rdquo;
              </p>

              <div className="mkt-testimonial-author mt-auto pt-4 border-t border-surface-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-ink-900">{t(testimonial.nameKey)}</div>
                  <div className="text-sm text-ink-500">{t(testimonial.roleKey)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
