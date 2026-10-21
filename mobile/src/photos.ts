import { useEffect, useState } from "react";
import { api } from "@/api/client";
import type { DeviceView } from "@/types";

/**
 * Uploaded photos of the people being tracked (GET /devices/{imei}/photo).
 *
 * The picture is private to users who may see that person, so it needs the app's bearer
 * token. An <Image> or the map's WebView cannot send that header, so the photo is fetched
 * here once per version and handed around as a data: URI (a 256x256 JPEG, ~10-40 kB).
 */
const cache = new Map<string, string>();                    // `${imei}|${version}` -> data URI
const inFlight = new Map<string, Promise<string | null>>();

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("unreadable photo")));
    reader.onerror = () => reject(reader.error ?? new Error("unreadable photo"));
    reader.readAsDataURL(blob);
  });
}

export function loadDevicePhoto(imei: string, version: string): Promise<string | null> {
  const key = `${imei}|${version}`;
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  let p = inFlight.get(key);
  if (!p) {
    p = api
      .get<Blob>(`/devices/${encodeURIComponent(imei)}/photo`, { params: { v: version }, responseType: "blob" })
      .then((r) => blobToDataUri(r.data))
      .then((uri) => {
        // A photo always replaces the previous version of the same person.
        for (const k of cache.keys()) if (k.startsWith(`${imei}|`)) cache.delete(k);
        cache.set(key, uri);
        return uri;
      })
      .catch(() => null)   // no photo is not an error: the drawn portrait is shown instead
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, p);
  }
  return p;
}

/** imei -> data URI for every listed person who has a photo. Updates as photos finish loading. */
export function useDevicePhotos(devices: Pick<DeviceView, "imei" | "photoUpdatedAt">[]): Record<string, string> {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  // Only the (imei, version) pairs matter; the device list itself is re-fetched every 10 s.
  const signature = devices.map((d) => `${d.imei}|${d.photoUpdatedAt ?? ""}`).join(",");

  useEffect(() => {
    let cancelled = false;
    const wanted = signature
      .split(",")
      .map((s) => s.split("|"))
      .filter(([imei, version]) => imei && version) as [string, string][];

    // Start from what is already cached, dropping people whose photo was removed.
    const initial: Record<string, string> = {};
    for (const [imei, version] of wanted) {
      const hit = cache.get(`${imei}|${version}`);
      if (hit) initial[imei] = hit;
    }
    setPhotos(initial);

    for (const [imei, version] of wanted) {
      if (initial[imei]) continue;
      void loadDevicePhoto(imei, version).then((uri) => {
        if (!cancelled && uri) setPhotos((prev) => (prev[imei] === uri ? prev : { ...prev, [imei]: uri }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [signature]);

  return photos;
}
