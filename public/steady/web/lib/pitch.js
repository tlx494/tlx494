// Pitch detection (YIN) and note naming, for the tuner.
//
// YIN: de Cheveigné & Kawahara, "YIN, a fundamental frequency estimator for
// speech and music" (2002). Difference function, cumulative mean normalised,
// first dip under an absolute threshold, then parabolic interpolation for
// sub-sample accuracy. Picking the *first* dip under the threshold rather than
// the global minimum is what keeps it on the fundamental instead of an octave
// below.

export const MIN_A4 = 415;
export const MAX_A4 = 466;
export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export function rms(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

let scratch = new Float32Array(0);

export function detectPitch(buf, sampleRate, { minHz = 40, maxHz = 2000, threshold = 0.15 } = {}) {
  const tauMin = Math.max(2, Math.floor(sampleRate / maxHz));
  const tauMax = Math.min(Math.floor(sampleRate / minHz), Math.floor(buf.length / 2));
  const W = buf.length - tauMax;
  if (W <= 0 || tauMax <= tauMin) return null;
  if (rms(buf) < 1e-4) return null;

  if (scratch.length < tauMax + 1) scratch = new Float32Array(tauMax + 1);
  const d = scratch;
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    running += sum;
    d[tau] = running > 0 ? (sum * tau) / running : 1;
  }

  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (d[t] < threshold) {
      while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;

  let better = tau;
  if (tau > 1 && tau < tauMax) {
    const a = d[tau - 1], b = d[tau], c = d[tau + 1];
    const den = a - 2 * b + c;
    if (den !== 0) better = tau + (a - c) / (2 * den);
  }
  return { freq: sampleRate / better, clarity: 1 - d[tau] };
}

/** Nearest equal-tempered note to `freq`, with cents off it, against A4 = a4. */
export function noteFromFrequency(freq, a4 = 440) {
  const exact = 69 + 12 * Math.log2(freq / a4);
  const midi = Math.round(exact);
  const cents = Math.round((exact - midi) * 100) + 0; // + 0 turns -0 into 0
  return {
    name: NOTE_NAMES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    cents,
    midi,
  };
}

/**
 * Smooths readings within a held note (so the needle does not shiver) but snaps
 * on anything more than about three quarters of a semitone away, so a new
 * string or note shows at once instead of gliding there. Same rule as the app.
 */
export class PitchSmoother {
  constructor(weight = 0.3) { this.weight = weight; this.value = 0; }
  reset() { this.value = 0; }
  push(freq) {
    if (this.value <= 0 || Math.abs(freq - this.value) / this.value > 0.043) this.value = freq;
    else this.value = this.value * (1 - this.weight) + freq * this.weight;
    return this.value;
  }
}
