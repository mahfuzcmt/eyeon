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

/** Returns false when audio is unavailable or still blocked by autoplay policy. */
export function playAlarmSound(severity: AlarmSeverity): boolean {
  const c = getContext();
  if (!c) return false;
  if (c.state === "suspended") {
    void c.resume();
    if (c.state === "suspended") return false;
  }
  const beeps = severity === "CRITICAL" ? 4 : severity === "WARNING" ? 2 : 1;
  const freq = severity === "CRITICAL" ? 880 : severity === "WARNING" ? 660 : 520;
  let t = c.currentTime + 0.01;
  for (let i = 0; i < beeps; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.2);
    t += 0.26;
  }
  return true;
}
