import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { listGroups } from "@/api/endpoints";
import type { DeviceGroupView } from "@/types";

/**
 * The calling user's own groups of people (groups are per user), sorted for display.
 * Re-read whenever the screen comes back into focus, so edits made elsewhere show up.
 */
export function useGroups() {
  const [groups, setGroups] = useState<DeviceGroupView[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    try {
      const rows = await listGroups();
      if (mounted.current) setGroups([...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
    } catch {
      /* keep what we had; grouping is a convenience */
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { groups, loading, reload };
}
