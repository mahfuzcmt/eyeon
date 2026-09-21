// Shared product data for Products page and Product detail page

export type ProductCategory = "ALL" | "WIRED" | "4G" | "OBD" | "WIRELESS" | "DASHCAM";

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
  // Pricing
  price: number | null; // BDT, null = "Contact for price"
  originalPrice?: number; // For showing discounts
  // Warranty
  warrantyMonths: number;
  // Installation
  freeInstallation: boolean;
  // Additional details for product page
  specifications?: {
    key: string;
    valueKey: string;
  }[];
}

export const PRODUCTS: Product[] = [
  {
    id: "gt06n",
    titleKey: "productsPage.gt06n.title",
    subtitleKey: "productsPage.gt06n.subtitle",
    descKey: "productsPage.gt06n.desc",
    image: "/images/products/wired-gps.png",
    featureKeys: [
      "productsPage.gt06n.f1",
      "productsPage.gt06n.f2",
      "productsPage.gt06n.f3",
      "productsPage.gt06n.f4",
      "productsPage.gt06n.f5",
      "productsPage.gt06n.f6",
    ],
    category: "WIRED",
    categoryBadge: "productsPage.badge.wired",
    categoryColor: "bg-emerald-500",
    price: 4500,
    warrantyMonths: 12,
    freeInstallation: true,
  },
  {
    id: "wetrack2",
    titleKey: "productsPage.wetrack2.title",
    subtitleKey: "productsPage.wetrack2.subtitle",
    descKey: "productsPage.wetrack2.desc",
    image: "/images/products/wired-gps.png",
    featureKeys: [
      "productsPage.wetrack2.f1",
      "productsPage.wetrack2.f2",
      "productsPage.wetrack2.f3",
      "productsPage.wetrack2.f4",
      "productsPage.wetrack2.f5",
      "productsPage.wetrack2.f6",
    ],
    category: "4G",
    categoryBadge: "productsPage.badge.4g",
    categoryColor: "bg-blue-600",
    price: 6500,
    warrantyMonths: 12,
    freeInstallation: true,
  },
  {
    id: "obd",
    titleKey: "productsPage.obd.title",
    subtitleKey: "productsPage.obd.subtitle",
    descKey: "productsPage.obd.desc",
    image: "/images/products/obd-tracker.png",
    featureKeys: [
      "productsPage.obd.f1",
      "productsPage.obd.f2",
      "productsPage.obd.f3",
      "productsPage.obd.f4",
      "productsPage.obd.f5",
      "productsPage.obd.f6",
    ],
    category: "OBD",
    categoryBadge: "productsPage.badge.obd",
    categoryColor: "bg-violet-500",
    price: 5500,
    warrantyMonths: 12,
    freeInstallation: false, // Plug & Play - no installation needed
  },
  {
    id: "portable",
    titleKey: "productsPage.portable.title",
    subtitleKey: "productsPage.portable.subtitle",
    descKey: "productsPage.portable.desc",
    image: "/images/products/portable-tracker.png",
    featureKeys: [
      "productsPage.portable.f1",
      "productsPage.portable.f2",
      "productsPage.portable.f3",
      "productsPage.portable.f4",
      "productsPage.portable.f5",
      "productsPage.portable.f6",
    ],
    category: "WIRELESS",
    categoryBadge: "productsPage.badge.wireless",
    categoryColor: "bg-purple-500",
    price: 7500,
    warrantyMonths: 12,
    freeInstallation: false, // Wireless - no installation
  },
  {
    id: "motorcycle",
    titleKey: "productsPage.motorcycle.title",
    subtitleKey: "productsPage.motorcycle.subtitle",
    descKey: "productsPage.motorcycle.desc",
    image: "/images/products/wired-gps.png",
    featureKeys: [
      "productsPage.motorcycle.f1",
      "productsPage.motorcycle.f2",
      "productsPage.motorcycle.f3",
      "productsPage.motorcycle.f4",
      "productsPage.motorcycle.f5",
      "productsPage.motorcycle.f6",
    ],
    category: "WIRED",
    categoryBadge: "productsPage.badge.wired",
    categoryColor: "bg-emerald-500",
    price: 3500,
    warrantyMonths: 12,
    freeInstallation: true,
  },
  {
    id: "dashcam",
    titleKey: "productsPage.dashcam.title",
    subtitleKey: "productsPage.dashcam.subtitle",
    descKey: "productsPage.dashcam.desc",
    image: "/images/products/dashcam.png",
    featureKeys: [
      "productsPage.dashcam.f1",
      "productsPage.dashcam.f2",
      "productsPage.dashcam.f3",
      "productsPage.dashcam.f4",
      "productsPage.dashcam.f5",
      "productsPage.dashcam.f6",
    ],
    category: "DASHCAM",
    categoryBadge: "productsPage.badge.dashcam",
    categoryColor: "bg-amber-500",
    price: 12500,
    originalPrice: 15000,
    warrantyMonths: 12,
    freeInstallation: true,
  },
];

export const CATEGORY_FILTERS: { key: ProductCategory; labelKey: string }[] = [
  { key: "ALL", labelKey: "productsPage.filter.all" },
  { key: "WIRED", labelKey: "productsPage.filter.wired" },
  { key: "4G", labelKey: "productsPage.filter.4g" },
  { key: "OBD", labelKey: "productsPage.filter.obd" },
  { key: "WIRELESS", labelKey: "productsPage.filter.wireless" },
  { key: "DASHCAM", labelKey: "productsPage.filter.dashcam" },
];

export function formatPrice(price: number, lang: string): string {
  if (lang === "bn") {
    // Bengali numerals
    const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return price.toLocaleString("en-IN").replace(/\d/g, (d) => bnDigits[parseInt(d)]);
  }
  return price.toLocaleString("en-IN");
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
