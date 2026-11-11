import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch, noteFromFrequency, rms, PitchSmoother, MIN_A4, MAX_A4 } from '../../public/steady/web/lib/pitch.js';

const SR = 48000;
function tone(freq, n = 4096, { harmonics = [1], noise = 0, amp = 0.5 } = {}) {
  const out = new Float32Array(n);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < n; i++) {
    let v = 0;
    harmonics.forEach((w, h) => { v += w * Math.sin((2 * Math.PI * freq * (h + 1) * i) / SR); });
    out[i] = amp * v / harmonics.length + noise * rnd();
  }
  return out;
}

for (const f of [82.41, 110, 196, 261.63, 440, 659.25, 1046.5]) {
  test(`detects a ${f} Hz sine within 0.3%`, () => {
    const r = detectPitch(tone(f), SR);
    assert.ok(r, 'pitched');
    assert.ok(Math.abs(r.freq - f) / f < 0.003, `${r.freq}`);
  });
}

test('picks the fundamental of a harmonic-rich tone, not an overtone', () => {
  const r = detectPitch(tone(146.83, 4096, { harmonics: [0.6, 1, 0.8, 0.5] }), SR);
  assert.ok(Math.abs(r.freq - 146.83) < 0.6, `${r.freq}`);
});

test('copes with a little noise', () => {
  const r = detectPitch(tone(330, 4096, { noise: 0.05 }), SR);
  assert.ok(Math.abs(r.freq - 330) < 1.5, `${r.freq}`);
});

test('silence and white noise are not pitches', () => {
  assert.equal(detectPitch(new Float32Array(4096), SR), null);
  assert.equal(detectPitch(tone(0, 4096, { noise: 0.5, amp: 0 }), SR), null);
});

test('rms of a 0.5 sine is about 0.354', () => {
  assert.ok(Math.abs(rms(tone(440, 4800)) - 0.3536) < 0.002);
});

test('reference range is 415 to 466 Hz', () => {
  assert.equal(MIN_A4, 415);
  assert.equal(MAX_A4, 466);
});

test('noteFromFrequency names notes and cents against A4', () => {
  assert.deepEqual(noteFromFrequency(440, 440), { name: 'A', octave: 4, cents: 0, midi: 69 });
  const cs = noteFromFrequency(261.63, 440);
  assert.equal(cs.name, 'C');
  assert.equal(cs.octave, 4);
  assert.equal(cs.cents, 0);
  assert.equal(noteFromFrequency(466.16, 440).name, 'A♯');
  assert.equal(noteFromFrequency(445, 440).cents, 20);
  assert.equal(noteFromFrequency(435, 440).cents, -20);
  assert.equal(noteFromFrequency(82.41, 440).name, 'E');
  assert.equal(noteFromFrequency(82.41, 440).octave, 2);
  // Baroque pitch: A = 415 reads as A, in tune.
  assert.deepEqual(noteFromFrequency(415, 415), { name: 'A', octave: 4, cents: 0, midi: 69 });
  // B4 just under C5 must still be B4, and the octave rolls at C.
  assert.equal(noteFromFrequency(493.88, 440).octave, 4);
  assert.equal(noteFromFrequency(523.25, 440).octave, 5);
});

test('smoother eases within a note and snaps on a note change', () => {
  const s = new PitchSmoother(0.3);
  assert.equal(s.push(440), 440);
  const eased = s.push(442);
  assert.ok(eased > 440 && eased < 442, `${eased}`);
  assert.equal(s.push(494), 494); // a whole tone away: snap, no glide
  s.reset();
  assert.equal(s.push(300), 300);
});
