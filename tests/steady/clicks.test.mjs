import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clickSamples, VOICES } from '../../public/steady/web/lib/clicks.js';

test('every named voice renders a short, bounded, decaying click', () => {
  for (const [name, v] of Object.entries(VOICES)) {
    const s = clickSamples(v, 48000);
    assert.ok(s instanceof Float32Array, name);
    assert.ok(s.length > 48000 * 0.015 && s.length < 48000 * 0.25, `${name} length ${s.length}`);
    let peak = 0;
    for (const x of s) peak = Math.max(peak, Math.abs(x));
    assert.ok(peak > 0.05 && peak <= 1, `${name} peak ${peak}`);
    assert.ok(Math.abs(s[s.length - 1]) < 1e-3, `${name} ends silent`);
    // The first sample is not a full-scale step (that would pop).
    assert.ok(Math.abs(s[0]) < 0.05, `${name} soft start`);
  }
});

test('the accent is louder than a normal beat, which is louder than a subdivision', () => {
  const peak = (v) => clickSamples(v, 48000).reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  assert.ok(peak(VOICES.accent) > peak(VOICES.normal));
  assert.ok(peak(VOICES.normal) > peak(VOICES.sub));
});

test('the two polyrhythm voices differ in pitch', () => {
  assert.notEqual(VOICES.polyA.freq, VOICES.polyB.freq);
});

test('deterministic: same input, same samples', () => {
  const a = clickSamples(VOICES.polyB, 44100);
  const b = clickSamples(VOICES.polyB, 44100);
  assert.deepEqual(a, b);
});
