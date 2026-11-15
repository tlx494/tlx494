// Click synthesis: the browser twin of the app's ClickSynth (lib/click_synth.dart).
// A short decaying tone with two upper partials and an optional burst of
// high-passed noise. Rendered once into AudioBuffers, then each click is just a
// buffer source started at an exact AudioContext time.

export const VOICES = {
  accent: { freq: 1568, amp: 0.95, decayMs: 26, noiseMix: 0.12, bright: 0.55 },
  normal: { freq: 1046, amp: 0.7, decayMs: 22, noiseMix: 0.12, bright: 0.45 },
  sub:    { freq: 784,  amp: 0.32, decayMs: 14, noiseMix: 0.2, bright: 0.3 },
  // Polyrhythm: two clearly different timbres, so each voice can be followed
  // by ear. A is bright and high; B (the pulse) is a lower, woodier knock.
  polyA:  { freq: 1318, amp: 0.7, decayMs: 24, noiseMix: 0.05, bright: 0.6 },
  polyB:  { freq: 523,  amp: 0.9, decayMs: 30, noiseMix: 0.35, bright: 0.2 },
};

function lcg(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
}

export function clickSamples({ freq, amp, decayMs, noiseMix, bright }, sampleRate) {
  const dur = Math.min(0.22, Math.max(0.02, (decayMs * 3) / 1000));
  const n = Math.round(sampleRate * dur);
  const tau = Math.min(0.2, Math.max(0.002, decayMs / 1000));
  const noiseW = Math.min(1, Math.max(0, noiseMix));
  const toneW = 1 - noiseW;
  const rnd = lcg(Math.round(freq) * 7 + 1);
  const modes = [[freq, 1], [freq * 1.7, 0.4 * bright], [freq * 2.5, 0.2 * bright]];
  const tail = Math.round(sampleRate * 0.004);
  const attack = 0.0003;
  const out = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const a = t < attack ? t / attack : 1;
    const fade = i > n - tail ? (n - 1 - i) / tail : 1;
    const e = a * Math.exp(-t / tau) * fade;
    const noise = rnd();
    const hp = noise - prev;
    prev = noise;
    let body = 0;
    for (const [f, w] of modes) body += w * Math.sin(2 * Math.PI * f * t);
    let v = amp * 0.9 * (noiseW * hp * Math.exp(-t / 0.003) * a * fade + toneW * body * e) / 1.6;
    out[i] = Math.max(-1, Math.min(1, v));
  }
  return out;
}
