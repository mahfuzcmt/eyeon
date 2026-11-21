import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { clock12 } from "@/format";
import { colors, radius, space } from "@/theme";

/**
 * A time of day picked on a clock face (owner, 2026-11-21: "the entry / exit time should look
 * like a watch so that people easily understand the time they set"). Same behaviour as the web
 * picker (frontend/src/components/time/ClockTimePicker.tsx): a button with a small clock and the
 * time in 12-hour form, opening a dial where the hour and then the minutes are tapped, with
 * AM / PM. Drawn with plain views (no SVG module in this app). The value stays "HH:mm".
 */

type Mode = "hour" | "minute";

function parse(value: string): { h: number; m: number } {
  const r = /^(\d{1,2}):(\d{2})/.exec(value);
  return r ? { h: Number(r[1]) % 24, m: Number(r[2]) % 60 } : { h: 8, m: 0 };
}

const pad = (n: number) => String(n).padStart(2, "0");
const BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const digits = (s: string, bn: boolean) => (bn ? s.replace(/\d/g, (d) => BN[Number(d)]) : s);

/** A hand of `length` from the centre of a `size` box, turned `deg` clockwise from 12. */
function Hand({ size, length, width, deg, color }: { size: number; length: number; width: number; deg: number; color: string }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${deg}deg` }] }]}>
      <View
        style={{
          position: "absolute",
          left: size / 2 - width / 2,
          top: size / 2 - length,
          width,
          height: length,
          borderRadius: width / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Small clock with the hands at h:m. */
export function ClockIcon({ h, m, size = 30 }: { h: number; m: number; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.brand, backgroundColor: "#fff" }}>
      <Hand size={size - 4} length={(size - 4) * 0.27} width={2.6} deg={((h % 12) + m / 60) * 30} color={colors.text} />
      <Hand size={size - 4} length={(size - 4) * 0.4} width={1.8} deg={m * 6} color={colors.brand} />
    </View>
  );
}

export function ClockTimePicker({
  value,
  onChange,
  bn,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (hhmm: string) => void;
  bn: boolean;
  label: string;
  disabled?: boolean;
}) {
  const current = parse(value);
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(current.h);
  const [m, setM] = useState(current.m);
  const [mode, setMode] = useState<Mode>("hour");

  useEffect(() => {
    if (!open) return;
    const p = parse(value);
    setH(p.h);
    setM(p.m);
    setMode("hour");
  }, [open, value]);

  const pm = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const DIAL = 264;
  const R = 104;
  const BUBBLE = 42;

  const marks =
    mode === "hour"
      ? Array.from({ length: 12 }, (_, i) => ({ v: i === 0 ? 12 : i, i, on: h % 12 === i }))
      : Array.from({ length: 12 }, (_, i) => ({ v: i * 5, i, on: m === i * 5 }));

  const choose = (i: number) => {
    if (mode === "hour") {
      setH((pm ? 12 : 0) + i);
      setMode("minute");
    } else {
      setM(i * 5);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[styles.button, disabled && styles.off]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${clock12(current.h, current.m, bn)}`}
      >
        <ClockIcon h={current.h} m={current.m} />
        <Text style={styles.buttonText}>{clock12(current.h, current.m, bn)}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.label}>{label}</Text>

            <View style={styles.readout}>
              <View style={styles.digits}>
                <Pressable onPress={() => setMode("hour")} style={[styles.part, mode === "hour" && styles.partOn]}>
                  <Text style={[styles.big, mode === "hour" && styles.bigOn]}>{digits(String(h12), bn)}</Text>
                </Pressable>
                <Text style={styles.colon}>:</Text>
                <Pressable onPress={() => setMode("minute")} style={[styles.part, mode === "minute" && styles.partOn]}>
                  <Text style={[styles.big, mode === "minute" && styles.bigOn]}>{digits(pad(m), bn)}</Text>
                </Pressable>
              </View>
              <View style={styles.ampm}>
                {(["AM", "PM"] as const).map((p) => {
                  const on = p === "PM" ? pm : !pm;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setH((x) => (p === "PM" ? (x % 12) + 12 : x % 12))}
                      style={[styles.ampmBtn, on && styles.ampmOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.ampmText, on && styles.ampmTextOn]}>{p}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Text style={styles.reads}>{clock12(h, m, bn)}</Text>

            <View style={[styles.dial, { width: DIAL, height: DIAL, borderRadius: DIAL / 2 }]}>
              {/* the other hand faint, the one being set strong */}
              <Hand
                size={DIAL - 6}
                length={mode === "hour" ? 86 : 56}
                width={mode === "hour" ? 2 : 5}
                deg={mode === "hour" ? m * 6 : ((h % 12) + m / 60) * 30}
                color="rgba(11,46,40,0.22)"
              />
              <Hand size={DIAL - 6} length={R - BUBBLE / 2} width={3} deg={mode === "hour" ? (h % 12) * 30 : m * 6} color={colors.brand} />
              <View pointerEvents="none" style={[styles.pin, { left: (DIAL - 6) / 2 - 6, top: (DIAL - 6) / 2 - 6 }]} />
              {marks.map((mk) => {
                const a = (mk.i * 30 * Math.PI) / 180;
                const cx = (DIAL - 6) / 2 + Math.sin(a) * R;
                const cy = (DIAL - 6) / 2 - Math.cos(a) * R;
                return (
                  <Pressable
                    key={mk.i}
                    onPress={() => choose(mk.i)}
                    hitSlop={4}
                    style={[
                      styles.mark,
                      { left: cx - BUBBLE / 2, top: cy - BUBBLE / 2, width: BUBBLE, height: BUBBLE, borderRadius: BUBBLE / 2 },
                      mk.on && styles.markOn,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={mode === "hour" ? String(mk.v) : pad(mk.v)}
                  >
                    <Text style={[styles.markText, mk.on && styles.markTextOn]}>
                      {digits(mode === "minute" ? pad(mk.v) : String(mk.v), bn)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {mode === "hour" ? (bn ? "ঘণ্টা বেছে নিন" : "Choose the hour") : bn ? "মিনিট বেছে নিন" : "Choose the minutes"}
            </Text>

            <View style={styles.actions}>
              <Pressable onPress={() => setOpen(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>{bn ? "বাতিল" : "Cancel"}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChange(`${pad(h)}:${pad(m)}`);
                  setOpen(false);
                }}
                style={styles.ok}
              >
                <Text style={styles.okText}>{bn ? "ঠিক আছে" : "OK"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  off: { opacity: 0.45 },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(5,40,34,0.45)", justifyContent: "center", alignItems: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, alignItems: "center" },
  label: { alignSelf: "flex-start", color: colors.textDim, fontSize: 14, fontWeight: "700" },
  readout: { flexDirection: "row", alignItems: "center", gap: space.lg, marginTop: space.sm },
  digits: { flexDirection: "row", alignItems: "center" },
  part: { paddingHorizontal: 6, borderRadius: radius.sm },
  partOn: { backgroundColor: "#E8F5F2" },
  big: { fontSize: 46, fontWeight: "800", color: colors.text },
  bigOn: { color: colors.brand },
  colon: { fontSize: 42, fontWeight: "800", color: colors.textFaint },
  ampm: { gap: 6 },
  ampmBtn: { minWidth: 58, minHeight: 38, borderRadius: radius.sm, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  ampmOn: { backgroundColor: colors.brand },
  ampmText: { fontSize: 15, fontWeight: "800", color: colors.textDim },
  ampmTextOn: { color: "#fff" },
  reads: { marginTop: 4, color: colors.brand, fontSize: 16, fontWeight: "700" },
  dial: { marginTop: space.md, backgroundColor: "#EEF4F2", borderWidth: 3, borderColor: colors.brand },
  pin: { position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: colors.brand },
  mark: { position: "absolute", alignItems: "center", justifyContent: "center" },
  markOn: { backgroundColor: colors.brand },
  markText: { fontSize: 17, fontWeight: "700", color: colors.text },
  markTextOn: { color: "#fff" },
  hint: { marginTop: space.sm, color: colors.textFaint, fontSize: 14 },
  actions: { flexDirection: "row", alignSelf: "stretch", justifyContent: "flex-end", gap: space.sm, marginTop: space.md },
  cancel: { minHeight: 48, paddingHorizontal: space.lg, justifyContent: "center" },
  cancelText: { color: colors.textDim, fontSize: 16, fontWeight: "600" },
  ok: { minHeight: 48, minWidth: 100, paddingHorizontal: space.lg, borderRadius: radius.sm, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  okText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
