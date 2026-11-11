import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TapTempo } from '../../public/steady/web/lib/taptempo.js';

function tapAt(t, ...times) { let r; for (const x of times) r = t.tap(x); return r; }

test('one tap is not a tempo yet', () => {
  const t = new TapTempo();
  assert.equal(t.tap(0), null);
  assert.equal(t.count, 1);
});

test('steady taps at 500 ms read 120 BPM', () => {
  const t = new TapTempo();
  assert.equal(tapAt(t, 0, 500, 1000, 1500), 120);
  assert.equal(t.count, 4);
});

test('averages the last N taps only', () => {
  const t = new TapTempo({ maxTaps: 4 });
  // slow start at 1000 ms (60 BPM) drifting to 600 ms (100 BPM) gradually
  tapAt(t, 0, 1000, 1900, 2700, 3400, 4050, 4650, 5250, 5850);
  assert.equal(Math.round(t.bpm), 100);
});

test('a long pause starts a new measurement', () => {
  const t = new TapTempo({ resetAfterMs: 2000 });
  tapAt(t, 0, 500, 1000);
  assert.equal(t.tap(5000), null);
  assert.equal(t.count, 1);
  assert.equal(t.tap(5250), 240);
});

test('an outlier tap restarts from the previous tap instead of skewing the average', () => {
  const t = new TapTempo();
  tapAt(t, 0, 500, 1000, 1500);
  // the player switches to a much faster tempo
  const r = t.tap(1750);
  assert.equal(r, 240);
  assert.equal(t.count, 2);
});

test('reset clears everything', () => {
  const t = new TapTempo();
  tapAt(t, 0, 500, 1000);
  t.reset();
  assert.equal(t.count, 0);
  assert.equal(t.bpm, null);
});

test('rounds to a tenth of a BPM', () => {
  const t = new TapTempo();
  assert.equal(tapAt(t, 0, 523, 1046), 114.7);
});
