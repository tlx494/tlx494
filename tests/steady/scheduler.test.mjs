import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metronomePattern, advance, startState } from '../../public/steady/web/lib/scheduler.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('metronomePattern without subdivision is one event per beat', () => {
  const p = metronomePattern({ accents: ['accent', 'normal', 'normal', 'normal'], subdivision: 1 });
  assert.equal(p.events.length, 4);
  assert.deepEqual(p.events.map((e) => e.at), [0, 0.25, 0.5, 0.75]);
  assert.deepEqual(p.events.map((e) => e.level), ['accent', 'normal', 'normal', 'normal']);
  assert.deepEqual(p.events.map((e) => e.beat), [0, 1, 2, 3]);
});

test('subdivisions add quieter steps between beats', () => {
  const p = metronomePattern({ accents: ['accent', 'normal'], subdivision: 3 });
  assert.equal(p.events.length, 6);
  close(p.events[1].at, 1 / 6);
  assert.equal(p.events[1].level, 'sub');
  assert.equal(p.events[1].beat, 0);
  assert.equal(p.events[1].sub, 1);
  assert.equal(p.events[3].level, 'normal');
});

test('a muted beat silences its subdivisions too, but still emits for the visuals', () => {
  const p = metronomePattern({ accents: ['accent', 'mute'], subdivision: 2 });
  assert.deepEqual(p.events.map((e) => e.level), ['accent', 'sub', 'mute', 'mute']);
});

test('advance emits events up to the horizon at 120 BPM in 4/4', () => {
  const p = metronomePattern({ accents: ['accent', 'normal', 'normal', 'normal'], subdivision: 1 });
  let s = startState(10);
  const r = advance(s, p, 2, 12.01); // a 4/4 bar at 120 = 2 s
  assert.deepEqual(r.events.map((e) => e.time), [10, 10.5, 11, 11.5, 12]);
  assert.deepEqual(r.events.map((e) => e.beat), [0, 1, 2, 3, 0]);
  assert.deepEqual(r.events.map((e) => e.cycle), [0, 0, 0, 0, 1]);
  close(r.state.time, 12.5);
  // Calling again with the same horizon emits nothing new.
  assert.equal(advance(r.state, p, 2, 12.01).events.length, 0);
});

test('a tempo change applies from the next gap without a jump', () => {
  const p = metronomePattern({ accents: ['accent', 'normal', 'normal', 'normal'], subdivision: 1 });
  let r = advance(startState(0), p, 2, 0.6); // 0, 0.5 at 120 BPM
  assert.deepEqual(r.events.map((e) => e.time), [0, 0.5]);
  r = advance(r.state, p, 4, 3.1); // now 60 BPM: the 0.5 -> 1.0 gap was already committed
  assert.deepEqual(r.events.map((e) => e.time), [1, 2, 3]);
});

test('a shorter pattern swapped in mid-bar wraps cleanly', () => {
  const four = metronomePattern({ accents: ['accent', 'normal', 'normal', 'normal'], subdivision: 1 });
  const three = metronomePattern({ accents: ['accent', 'normal', 'normal'], subdivision: 1 });
  let r = advance(startState(0), four, 2, 1.6); // 0, .5, 1, 1.5 -> next index 0 of cycle 1
  r = advance({ ...r.state, index: 3 }, three, 1.5, 3); // index 3 no longer exists
  assert.equal(r.events[0].beat, 0);
});

test('scheduling never runs away on a zero-length cycle', () => {
  const p = metronomePattern({ accents: ['accent'], subdivision: 1 });
  const r = advance(startState(0), p, 0, 1);
  assert.ok(r.events.length < 1000);
});

import { realign } from '../../public/steady/web/lib/scheduler.js';

test('realign keeps the position in the cycle when the pattern changes mid-play', () => {
  const four = metronomePattern({ accents: ['accent', 'normal', 'normal', 'normal'], subdivision: 1 });
  const eighths = metronomePattern({ accents: ['accent', 'normal', 'normal', 'normal'], subdivision: 2 });
  // next unplayed event is beat 2 (at 0.5) of cycle 3
  const s = realign({ index: 2, time: 7, cycle: 3 }, four, eighths);
  assert.deepEqual(s, { index: 4, time: 7, cycle: 3 });
  assert.equal(eighths.events[s.index].at, 0.5);
});

test('realign wraps to the next cycle when nothing in the new pattern is left', () => {
  const four = metronomePattern({ accents: ['accent', 'normal', 'normal', 'normal'], subdivision: 1 });
  const two = metronomePattern({ accents: ['accent', 'normal'], subdivision: 1 });
  const s = realign({ index: 3, time: 7, cycle: 3 }, four, two); // at 0.75; two has 0, 0.5
  assert.deepEqual(s, { index: 0, time: 7, cycle: 4 });
});
