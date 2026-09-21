"use client";

import { useParams, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/landing/LanguageContext";
import { getProductById, formatPrice, PRODUCTS } from "@/components/landing/data/products";

const PHONE = "+880 1999-036999";

function Icon({ path, className = "h-6 w-6" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  check: "M20 6L9 17l-5-5",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  arrow: "M19 12H5M12 19l-7-7 7-7",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  warranty: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

export default function ProductDetailPage() {
  const params = useParams();
  const { t, lang } = useLanguage();
  const productId = params.id as string;

  const product = getProductById(productId);

  if (!product) {
    // Show a styled 404 for product not found
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">{t("productDetail.notFound")}</h1>
          <p className="text-gray-400 mb-8">{t("productDetail.notFoundDesc")}</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-400"
          >
            <Icon path={ICONS.arrow} className="h-5 w-5" />
            {t("productDetail.backToProducts")}
          </Link>
        </div>
      </div>
    );
  }

  // Find related products (same category, excluding current)
  const relatedProducts = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      {/* Breadcrumb */}
      <div className="border-b border-gray-800 bg-black/50">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/" className="hover:text-brand-400 transition">{t("nav.home")}</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-brand-400 transition">{t("nav.products")}</Link>
            <span>/</span>
            <span className="text-white">{t(product.titleKey)}</span>
          </nav>
        </div>
      </div>

      {/* Main Product Section */}
      <section className="py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Product Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* Category Badge */}
              <div className={`absolute left-4 top-4 z-10 rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white ${product.categoryColor}`}>
                {t(product.categoryBadge)}
              </div>

              {/* Sale Badge */}
              {product.originalPrice && (
                <div className="absolute right-4 top-4 z-10 rounded-full bg-red-500 px-4 py-1.5 text-sm font-bold uppercase text-white">
                  {t("productsPage.badge.sale")}
                </div>
              )}

              {/* Image Container - Brand gradient background (cyan to light blue) */}
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-brand-50 to-slate-100 p-8 md:p-16 shadow-xl">
                <div className="relative aspect-square">
                  <Image
                    src={product.image}
                    alt={t(product.titleKey)}
                    fill
                    className="object-contain drop-shadow-2xl"
                    priority
                  />
                </div>
              </div>
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col justify-center"
            >
              {/* Title & Subtitle */}
              <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                {t(product.titleKey)}
              </h1>
              <p className="mt-2 text-lg text-brand-400 font-medium">
                {t(product.subtitleKey)}
              </p>
              <p className="mt-4 text-gray-400 text-lg leading-relaxed">
                {t(product.descKey)}
              </p>

              {/* Price Section */}
              <div className="mt-8 flex items-baseline gap-4">
                {product.price ? (
                  <>
                    <span className="text-4xl font-bold text-white">
                      ৳{formatPrice(product.price, lang)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xl text-gray-500 line-through">
                        ৳{formatPrice(product.originalPrice, lang)}
                      </span>
                    )}
                    <span className="text-gray-400">{t("products.onwards")}</span>
                  </>
                ) : (
                  <span className="text-2xl text-brand-400 font-semibold">
                    {t("productsPage.contactForPrice")}
                  </span>
                )}
              </div>

              {/* Trust Badges */}
              <div className="mt-6 flex flex-wrap gap-4">
                {/* Warranty Badge */}
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-emerald-400">
                  <Icon path={ICONS.warranty} className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {product.warrantyMonths} {t("productsPage.monthWarranty")}
                  </span>
                </div>

                {/* Free Installation Badge */}
                {product.freeInstallation && (
                  <div className="flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-2 text-brand-400">
                    <Icon path={ICONS.truck} className="h-5 w-5" />
                    <span className="text-sm font-medium">{t("productsPage.freeInstall")}</span>
                  </div>
                )}
              </div>

              {/* Features List */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">{t("productDetail.features")}</h3>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {product.featureKeys.map((featureKey, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20">
                        <Icon path={ICONS.check} className="h-3 w-3 text-brand-400" />
                      </span>
                      <span className="text-gray-300">{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Buttons */}
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}
                  className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-brand-500/25 transition hover:shadow-brand-500/40 hover:scale-105"
                >
                  <Icon path={ICONS.phone} className="h-5 w-5" />
                  {t("productDetail.orderNow")}
                </a>
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 rounded-full border-2 border-gray-600 bg-transparent px-8 py-4 text-lg font-semibold text-white transition hover:border-brand-500 hover:text-brand-400"
                >
                  {t("productDetail.getQuote")}
                </Link>
              </div>

              {/* Contact Info */}
              <div className="mt-8 flex items-center gap-3 text-gray-400">
                <Icon path={ICONS.phone} className="h-5 w-5 text-brand-400" />
                <span>{t("productDetail.callUs")}: </span>
                <a href={`tel:${PHONE.replace(/[^+\d]/g, "")}`} className="text-white font-semibold hover:text-brand-400 transition">
                  {PHONE}
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose This Product */}
      <section className="py-16 border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white md:text-4xl">{t("productDetail.whyChoose")}</h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: ICONS.shield, titleKey: "productDetail.benefit1Title", descKey: "productDetail.benefit1Desc" },
              { icon: ICONS.warranty, titleKey: "productDetail.benefit2Title", descKey: "productDetail.benefit2Desc" },
              { icon: ICONS.star, titleKey: "productDetail.benefit3Title", descKey: "productDetail.benefit3Desc" },
            ].map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl bg-gray-800/50 p-8 text-center border border-gray-700/50"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10">
                  <Icon path={benefit.icon} className="h-8 w-8 text-brand-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t(benefit.titleKey)}</h3>
                <p className="text-gray-400">{t(benefit.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-16 border-t border-gray-800">
          <div className="mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-white md:text-4xl">{t("productDetail.relatedProducts")}</h2>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-3">
              {relatedProducts.map((relProduct, idx) => (
                <motion.div
                  key={relProduct.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link
                    href={`/products/${relProduct.id}`}
                    className="group block overflow-hidden rounded-2xl bg-gray-800/50 border border-gray-700/50 transition hover:border-brand-500/50"
                  >
                    <div className="relative h-48 bg-gradient-to-br from-brand-50 via-brand-50 to-slate-100 p-4">
                      <div className={`absolute left-3 top-3 z-10 rounded-full px-2 py-0.5 text-xs font-bold uppercase text-white ${relProduct.categoryColor}`}>
                        {t(relProduct.categoryBadge)}
                      </div>
                      <div className="relative h-full w-full">
                        <Image
                          src={relProduct.image}
                          alt={t(relProduct.titleKey)}
                          fill
                          className="object-contain transition group-hover:scale-105 drop-shadow-lg"
                        />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-white group-hover:text-brand-400 transition">
                        {t(relProduct.titleKey)}
                      </h3>
                      {relProduct.price && (
                        <p className="mt-1 text-lg font-bold text-brand-400">
                          ৳{formatPrice(relProduct.price, lang)}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back to Products */}
      <section className="py-8 border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-400 transition"
          >
            <Icon path={ICONS.arrow} className="h-5 w-5" />
            {t("productDetail.backToProducts")}
          </Link>
        </div>
      </section>
    </div>
  );
}
