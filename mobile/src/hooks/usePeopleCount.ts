import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { listDevices } from "@/api/endpoints";

/** Re-checked every 5 minutes and whenever the app comes back to the foreground. */
const REFRESH_MS = 5 * 60_000;

/**
 * How many people (trackers) this user can see; null until the first answer. Light on purpose:
 * the tab bar only needs to know whether there is more than one person, so this does not poll
 * like useDevices does.
 */
export function usePeopleCount(enabled: boolean): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () => {
      listDevices()
        .then((rows) => {
          if (alive) setCount(rows.length);
        })
        .catch(() => {
          // Keep the last answer; a failed check must not flip the tab bar.
        });
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") load();
    });
    return () => {
      alive = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [enabled]);

  return count;
}
