"use client";
/**
 * Kitchen / dashboard notification sounds.
 * Plays the bundled MP3 through HTML5 Audio and falls back to a Web Audio API synth when the
 * file can't be loaded or decoded — so an alert is never silently lost to a missing asset.
 * Browsers only allow audio after a user gesture: call `unlockAudio()` from a click first.
 */
export type SoundName = "kitchenBell" | "billAlert" | "newOrder";

const FILES: Record<SoundName, string> = {
  kitchenBell: "/sounds/kitchen-bell.mp3",
  billAlert: "/sounds/chime.mp3",
  newOrder: "/sounds/chime.mp3",
};

/** Fallback synth patterns: [frequency Hz, start s, duration s] */
const SYNTH: Record<SoundName, [number, number, number][]> = {
  kitchenBell: [[1318, 0, 1.0], [3145, 0, 0.5], [1318, 0.32, 1.1], [3145, 0.32, 0.5]],
  billAlert: [[988, 0, 0.6], [784, 0.28, 0.9], [988, 0.75, 0.6], [784, 1.03, 0.9]],
  newOrder: [[988, 0, 0.5], [784, 0.25, 0.8]],
};

let ctx: AudioContext | null = null;
const elements = new Map<SoundName, HTMLAudioElement>();

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

function synth(name: SoundName) {
  const ac = audioContext();
  if (!ac) return false;
  const now = ac.currentTime + 0.02;
  const master = ac.createGain();
  master.gain.value = 0.35;
  master.connect(ac.destination);
  for (const [freq, start, dur] of SYNTH[name]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(1, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain).connect(master);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
  }
  return true;
}

function element(name: SoundName): HTMLAudioElement {
  let el = elements.get(name);
  if (!el) {
    el = new Audio(FILES[name]);
    el.preload = "auto";
    elements.set(name, el);
  }
  return el;
}

/** Play a notification. Resolves true if something was audible (file or synth). */
export async function playSound(name: SoundName): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const el = element(name);
    // restart if already ringing (two orders arriving back-to-back)
    el.currentTime = 0;
    await el.play();
    return true;
  } catch (err) {
    // NotAllowedError = autoplay still locked; anything else = asset/decoding problem → synth
    if (err instanceof DOMException && err.name === "NotAllowedError" && ctx?.state !== "running") return false;
    return synth(name);
  }
}

/** Call from a click/tap handler: resumes Web Audio and warms up the audio elements. */
export async function unlockAudio(): Promise<boolean> {
  const ac = audioContext();
  try {
    await ac?.resume();
  } catch {
    /* ignore */
  }
  (Object.keys(FILES) as SoundName[]).forEach((n) => element(n).load());
  return playSound("newOrder");
}

/* Back-compat helpers */
export const playChime = () => playSound("newOrder");
export const playAlert = () => playSound("billAlert");
