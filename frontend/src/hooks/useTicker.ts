"use client";

import { useEffect, useState } from "react";

/**
 * Returns a timestamp that updates every `intervalMs` milliseconds.
 * Use this to force re-renders for relative time displays ("5 seconds ago").
 * Default: every 1 second.
 */
export function useTicker(intervalMs = 1000): number {
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return tick;
}
