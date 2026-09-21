// Product data consumed by the product detail route, src/app/(marketing)/products/[id]/page.tsx
// (a file outside this directory, so the exported names and the Product shape must stay).
//
// EyeOn sells ONE product, the EyeOn tracker, and it is described on the /products
// page itself (pages/ProductsPage.tsx). This list is intentionally empty: the detail
// route renders a price, a warranty length and a product photo for every entry, and
// EyeOn has no published price, no confirmed warranty terms and no product photo yet.
// With an empty list every /products/<id> URL shows the "page not found" message.
//
// Do not add an entry until the business owner supplies real values for all fields.

export type ProductCategory = "TRACKER";

export interface Product {
  id: string;
  titleKey: string;
  subtitleKey: string;
  descKey: string;
  image: string;
  featureKeys: string[];
  category: ProductCategory;
  categoryBadge: string;
  categoryColor: string;
  /** BDT. null = "contact for price". Never invent an amount. */
  price: number | null;
  originalPrice?: number;
  warrantyMonths: number;
  freeInstallation: boolean;
}

export const PRODUCTS: Product[] = [];

export function formatPrice(price: number, lang: string): string {
  if (lang === "bn") {
    const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return price.toLocaleString("en-IN").replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
  }
  return price.toLocaleString("en-IN");
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
