/**
 * Synthesises a short two-tone chime as a WAV blob and plays it through HTML5 Audio,
 * so no binary asset needs to ship. Browsers only allow playback after a user gesture,
 * so screens call `unlockAudio()` from a click first.
 */
let chimeUrl: string | null = null;
let alertUrl: string | null = null;

function synth(notes: { freq: number; start: number; dur: number }[], total: number): string {
  const rate = 22050;
  const len = Math.floor(rate * total);
  const buf = new ArrayBuffer(44 + len * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + len * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) {
    const t = i / rate;
    let s = 0;
    for (const n of notes) {
      if (t < n.start || t > n.start + n.dur) continue;
      const lt = t - n.start;
      const env = Math.min(1, lt * 80) * Math.exp(-lt * 5);
      s += Math.sin(2 * Math.PI * n.freq * lt) * env * 0.45 + Math.sin(4 * Math.PI * n.freq * lt) * env * 0.1;
    }
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true);
  }
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

function urls() {
  if (!chimeUrl) {
    chimeUrl = synth([{ freq: 880, start: 0, dur: 0.5 }, { freq: 1318.5, start: 0.18, dur: 0.7 }], 1);
    alertUrl = synth(
      [0, 0.25, 0.5].map((start) => ({ freq: 1046.5, start, dur: 0.2 })).concat({ freq: 1568, start: 0.75, dur: 0.6 }),
      1.4,
    );
  }
  return { chime: chimeUrl!, alert: alertUrl! };
}

async function play(url: string) {
  try {
    const a = new Audio(url);
    a.volume = 1;
    await a.play();
    return true;
  } catch {
    return false; // autoplay blocked until the user interacts
  }
}

export const playChime = () => (typeof window === "undefined" ? Promise.resolve(false) : play(urls().chime));
export const playAlert = () => (typeof window === "undefined" ? Promise.resolve(false) : play(urls().alert));
export const unlockAudio = () => playChime();
