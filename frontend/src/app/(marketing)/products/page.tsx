import { redirect } from "next/navigation";

/**
 * EyeOn sells one product, the EyeOn AI Watch (owner, 2026-11-23: "use EyeOn AI Watch instead
 * of tracker device" across the site). /products, linked from the menu, opens its page.
 */
export default function Products() {
  redirect("/products/eyeon-ai-watch");
}
