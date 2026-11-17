"use client";

import { useEffect, useRef } from "react";

/** Closes a dialog on Escape. Pass `enabled = false` while the dialog must not be dismissed. */
export function useEscapeKey(onEscape: () => void, enabled: boolean = true): void {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) handler.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
