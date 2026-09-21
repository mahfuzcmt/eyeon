import type { Ionicons } from "@expo/vector-icons";
import type { StringKey } from "@/i18n";
import type { PlaceType } from "@/types";

type IconName = keyof typeof Ionicons.glyphMap;

/** Display order of the type picker; HOME and SCHOOL first because they cover most families. */
export const PLACE_TYPES: PlaceType[] = ["HOME", "SCHOOL", "COACHING", "MOSQUE", "HOSPITAL", "RELATIVE", "OTHER"];

export const PLACE_ICON: Record<PlaceType, IconName> = {
  HOME: "home",
  SCHOOL: "school",
  COACHING: "book",
  MOSQUE: "moon",
  HOSPITAL: "medkit",
  RELATIVE: "people",
  OTHER: "location",
};

export function placeTypeKey(type: PlaceType): StringKey {
  return `place.type.${type}` as StringKey;
}

/** Radius choices in metres. The backend rejects trusted places under 80 m (GPS error indoors). */
export const PLACE_RADIUS_PRESETS = [100, 150, 250, 500];
export const PLACE_DEFAULT_RADIUS = 150;
