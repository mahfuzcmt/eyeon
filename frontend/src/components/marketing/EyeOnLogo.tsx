import { EyeOnLogo } from "@/components/brand/EyeOnLogo";

/** Auth-page lockup. dark=true means it sits on a dark background. */
export function EyeOnLogoInline({ dark = true }: { dark?: boolean }) {
  return <EyeOnLogo height={36} tone={dark ? "dark" : "light"} />;
}
