"use client";

import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query. Returns `false` during SSR and the first
 * client render so server and client markup agree; the real value arrives
 * before paint via useEffect.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Tailwind `md` breakpoint and up — where the desktop shell (rail + floating panels) is used. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}

/** Tailwind `lg` and up — wide enough for the centred KPI strip beside the vehicle panel. */
export function useIsWide(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
