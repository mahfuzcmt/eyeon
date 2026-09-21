"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { AlarmRuleView } from "@/types/domain";

export interface SpeedLimits {
  /** Configured SPEED_OVER threshold for this device, or null if none applies. */
  limitFor: (imei: string) => number | null;
  /** True when the live speed exceeds the device's configured threshold. */
  isOverspeed: (imei: string, speed: number | null | undefined) => boolean;
}

/**
 * Per-device overspeed thresholds derived from the org's active SPEED_OVER
 * alarm rules (the same configuration the backend uses to raise OVERSPEED
 * alarms). When several rules match a device the strictest one wins.
 */
export function useSpeedLimits(): SpeedLimits {
  const [rules, setRules] = useState<AlarmRuleView[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AlarmRuleView[]>("/alarm-rules")
      .then((r) => {
        if (!cancelled) setRules(r.data);
      })
      .catch(() => {
        /* no rules → no overspeed highlighting */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const speedRules = rules.filter(
      (r) => r.active && r.ruleType === "SPEED_OVER" && r.threshold != null,
    );
    const orgWideMin = speedRules
      .filter((r) => r.appliesToAll)
      .reduce((m, r) => Math.min(m, r.threshold as number), Infinity);
    const perDevice = new Map<string, number>();
    for (const r of speedRules) {
      if (r.appliesToAll) continue;
      for (const imei of r.assignedImeis) {
        perDevice.set(imei, Math.min(perDevice.get(imei) ?? Infinity, r.threshold as number));
      }
    }
    const limitFor = (imei: string): number | null => {
      const v = Math.min(perDevice.get(imei) ?? Infinity, orgWideMin);
      return Number.isFinite(v) ? v : null;
    };
    const isOverspeed = (imei: string, speed: number | null | undefined): boolean => {
      if (speed == null || speed <= 0) return false;
      const limit = limitFor(imei);
      return limit != null && speed > limit;
    };
    return { limitFor, isOverspeed };
  }, [rules]);
}
