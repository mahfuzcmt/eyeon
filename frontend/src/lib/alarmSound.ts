import type { AlarmSeverity } from "@/types/domain";

/**
 * Short synthesized alert tones so the dashboard needs no audio asset.
 * Browsers only allow audio after a user gesture; call unlockAlarmAudio()
 * from the first click/keypress so later alarms can actually play.
 */
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

export function unlockAlarmAudio(): void {
  const c = getContext();
  if (c && c.state === "suspended") void c.resume();
}

/** One note of a tone: frequency (Hz), start offset and length (s), waveform and loudness. */
interface Note { f: number; at: number; len: number; type: OscillatorType; vol: number }

/**
 * A different sound per severity, so a carer can tell them apart without looking:
 * - INFO (arrived, left a place, back in the safe area): a soft two-note chime going up
 * - WARNING (left the safe area, low battery): two firm notes going down, played twice
 * - CRITICAL (SOS): an urgent, harsh triple beep, played twice (and repeated by the toast)
 */
const TONES: Record<AlarmSeverity, Note[]> = {
  INFO: [
    { f: 784, at: 0, len: 0.22, type: "sine", vol: 0.22 },
    { f: 1047, at: 0.16, len: 0.42, type: "sine", vol: 0.22 },
  ],
  WARNING: [
    { f: 740, at: 0, len: 0.2, type: "triangle", vol: 0.3 },
    { f: 554, at: 0.2, len: 0.3, type: "triangle", vol: 0.3 },
    { f: 740, at: 0.65, len: 0.2, type: "triangle", vol: 0.3 },
    { f: 554, at: 0.85, len: 0.3, type: "triangle", vol: 0.3 },
  ],
  CRITICAL: [0, 0.22, 0.44, 0.9, 1.12, 1.34].map((at) => ({ f: 932, at, len: 0.16, type: "square" as OscillatorType, vol: 0.2 })),
};

/** Returns false when audio is unavailable or still blocked by autoplay policy. */
export function playAlarmSound(severity: AlarmSeverity): boolean {
  const c = getContext();
  if (!c) return false;
  if (c.state === "suspended") {
    void c.resume();
    if (c.state === "suspended") return false;
  }
  const start = c.currentTime + 0.01;
  for (const n of TONES[severity] ?? TONES.INFO) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const t = start + n.at;
    osc.type = n.type;
    osc.frequency.value = n.f;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(n.vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + n.len);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + n.len + 0.03);
  }
  return true;
}
