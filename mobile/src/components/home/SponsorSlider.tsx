import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE } from "@/api/client";
import { listSponsorAds } from "@/api/endpoints";
import { useI18n } from "@/i18n";
import { colors, radius, space } from "@/theme";
import type { SponsorAd } from "@/types";

/** Time each banner stays before the slider moves on by itself. */
const ADVANCE_MS = 5_000;
/** Banners are stored 1200 x 600 (SponsorAdService). */
const ASPECT = 2;

/** The server only stores http(s) links; checked again here because the phone opens it. */
const isWebLink = (url: string | null): url is string =>
  !!url && /^https?:\/\/\S+$/i.test(url);

/**
 * The sponsor ads slider on Home (owner, 2026-11-03; ads are set by a super admin on the web,
 * CLAUDE.md §8.11). Swipe or wait 5 s for the next banner; tapping one with a link opens it in
 * the phone's browser. Without any ad switched on, the "Sponsor ads will be here" placeholder
 * keeps the space.
 */
export function SponsorSlider({ refreshKey }: { refreshKey: number }) {
  const { t } = useI18n();
  const [ads, setAds] = useState<SponsorAd[]>([]);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const touching = useRef(false);
  const indexRef = useRef(0);
  indexRef.current = index;

  useEffect(() => {
    let alive = true;
    listSponsorAds()
      .then((rows) => {
        if (alive) setAds(rows.filter((a) => !!a.imageUrl));
      })
      .catch(() => {
        // Keep the last list (or the placeholder); ads must never get in the way of Home.
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  // Keep the index valid when the list shrinks.
  useEffect(() => {
    if (index >= ads.length && ads.length > 0) setIndex(0);
  }, [ads.length, index]);

  const goTo = useCallback(
    (i: number) => {
      if (width <= 0) return;
      scroller.current?.scrollTo({ x: i * width, animated: true });
      setIndex(i);
    },
    [width],
  );

  useEffect(() => {
    if (ads.length < 2 || width <= 0) return;
    const timer = setInterval(() => {
      if (touching.current || AppState.currentState !== "active") return;
      const next = (indexRef.current + 1) % ads.length;
      scroller.current?.scrollTo({ x: next * width, animated: true });
      indexRef.current = next;
      setIndex(next);
    }, ADVANCE_MS);
    return () => clearInterval(timer);
  }, [ads.length, width]);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(Math.round(e.nativeEvent.layout.width));
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    touching.current = false;
    if (width > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  if (ads.length === 0) return <SponsorPlaceholder />;

  return (
    <View style={styles.frame} onLayout={onLayout}>
      {width > 0 ? (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => {
            touching.current = true;
          }}
          onMomentumScrollEnd={onScrollEnd}
        >
          {ads.map((ad) => {
            const link = isWebLink(ad.linkUrl) ? ad.linkUrl : null;
            return (
              <Pressable
                key={ad.id}
                disabled={!link}
                onPress={() => {
                  if (link) void Linking.openURL(link).catch(() => {});
                }}
                style={{ width, height: width / ASPECT }}
                accessibilityRole={link ? "link" : "image"}
                accessibilityLabel={ad.title ?? t("homez.sponsorTag")}
              >
                <Image
                  source={{ uri: `${API_BASE}${ad.imageUrl}` }}
                  style={styles.image}
                  resizeMode="cover"
                />
                {link ? (
                  <View style={styles.openBadge} pointerEvents="none">
                    <Ionicons
                      name="open-outline"
                      size={14}
                      color={colors.onBrand}
                    />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={{ aspectRatio: ASPECT }} />
      )}
      <Text style={[styles.tag, styles.tagOver]}>{t("homez.sponsorTag")}</Text>
      {ads.length > 1 ? (
        <View style={styles.dotsOver}>
          {ads.map((ad, i) => (
            <Pressable
              key={ad.id}
              onPress={() => goTo(i)}
              hitSlop={6}
              accessibilityRole="button"
            >
              <View style={[styles.dot, i === index && styles.dotOn]} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SponsorPlaceholder() {
  const { t } = useI18n();
  return (
    <View style={styles.placeholder} accessibilityLabel={t("homez.sponsor")}>
      <Text style={[styles.tag, styles.tagCorner]}>
        {t("homez.sponsorTag")}
      </Text>
      <Ionicons name="megaphone-outline" size={34} color={colors.brand} />
      <Text style={styles.placeholderText}>{t("homez.sponsor")}</Text>
      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotOn]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: "100%", height: "100%" },
  openBadge: {
    position: "absolute",
    right: space.sm,
    top: space.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,46,40,0.6)",
  },
  tag: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  tagOver: { position: "absolute", left: space.sm, top: space.sm },
  tagCorner: { position: "absolute", left: space.sm, top: space.sm },
  dotsOver: {
    position: "absolute",
    bottom: space.sm,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  placeholder: {
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.md,
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  placeholderText: {
    color: colors.brand,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  dots: { flexDirection: "row", gap: 6, marginTop: space.xs },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { width: 18, backgroundColor: colors.brand },
});
