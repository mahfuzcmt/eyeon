import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS, searchAddress, type GeocodeResult } from "@/geocode";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";

/**
 * Search box over a map: results appear as you type (Bangladesh only); picking one calls
 * `onPick`. Some places are hard to find by panning, so this complements tapping the map.
 */
export function AddressSearch({ near, onPick }: { near?: { lat: number; lng: number } | null; onPick: (r: GeocodeResult) => void }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const picked = useRef(false);

  useEffect(() => {
    if (picked.current) {
      picked.current = false;
      return;
    }
    if (q.trim().length < SEARCH_MIN_CHARS) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchAddress(q, near, locale, controller.signal);
        if (!controller.signal.aborted) setResults(r);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `near` only biases the ranking; a moving map must not restart the search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, locale]);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.box}>
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder={t("geo.searchAddress")}
          placeholderTextColor={colors.textFaint}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searching ? <ActivityIndicator color={colors.brand} style={{ marginRight: space.md }} /> : null}
      </View>
      {results && (
        <View style={styles.list}>
          {results.length === 0 && <Text style={styles.none}>{t("geo.searchNone")}</Text>}
          {results.map((r) => (
            <Pressable
              key={`${r.lat},${r.lng}`}
              onPress={() => {
                picked.current = true;
                setQ(r.label.split(",").slice(0, 2).join(",").trim());
                setResults(null);
                onPick(r);
              }}
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={styles.itemText} numberOfLines={2}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: space.md, right: space.md, top: space.md, zIndex: 10 },
  box: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, elevation: 3, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  input: { flex: 1, minHeight: 46, paddingHorizontal: space.md, color: colors.text, fontSize: 15 },
  list: { marginTop: space.xs, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, maxHeight: 200, overflow: "hidden" },
  none: { color: colors.textFaint, fontSize: 14, padding: space.md },
  item: { paddingHorizontal: space.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemText: { color: colors.text, fontSize: 14 },
});
