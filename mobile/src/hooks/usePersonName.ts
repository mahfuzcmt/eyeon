import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getDevice } from "@/api/endpoints";

/**
 * Display name of one person ("Rafi"), falling back to class/ID; null until loaded.
 * Re-read whenever the screen regains focus so a rename shows straight away.
 */
export function usePersonName(imei: string | undefined): string | null {
  const [name, setName] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!imei) return;
      let alive = true;
      getDevice(imei)
        .then((d) => {
          if (alive) setName(d.name || d.vehiclePlate || null);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [imei]),
  );
  return name;
}
