import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gcd, lcm, polyPattern, countGrid, parseRatioSlug, ratioSlug, MIN_VOICE, MAX_VOICE } from '../../public/steady/web/lib/poly.js';

test('gcd and lcm', () => {
  assert.equal(gcd(6, 4), 2);
  assert.equal(lcm(3, 2), 6);
  assert.equal(lcm(7, 8), 56);
  assert.equal(lcm(6, 4), 12);
});

test('voices range 2 to 9', () => {
  assert.equal(MIN_VOICE, 2);
  assert.equal(MAX_VOICE, 9);
});

test('3 against 2 merges the shared downbeat into one event', () => {
  const p = polyPattern(3, 2);
  assert.equal(p.grid, 6);
  assert.deepEqual(p.events.map((e) => e.pos), [0, 2, 3, 4]);
  assert.deepEqual(p.events.map((e) => e.at), [0, 2 / 6, 3 / 6, 4 / 6]);
  assert.deepEqual(p.events[0], { pos: 0, at: 0, a: 0, b: 0 });
  assert.deepEqual(p.events[1], { pos: 2, at: 2 / 6, a: 1, b: null });
  assert.deepEqual(p.events[2], { pos: 3, at: 3 / 6, a: null, b: 1 });
});

test('every voice note appears exactly once', () => {
  for (let a = 2; a <= 9; a++) {
    for (let b = 2; b <= 9; b++) {
      const p = polyPattern(a, b);
      assert.equal(p.events.filter((e) => e.a !== null).length, a, `${a}:${b} a`);
      assert.equal(p.events.filter((e) => e.b !== null).length, b, `${a}:${b} b`);
      const ats = p.events.map((e) => e.at);
      assert.deepEqual([...ats].sort((x, y) => x - y), ats, 'sorted');
    }
  }
});

test('6 against 4 has interior coincidences, not just the downbeat', () => {
  const both = polyPattern(6, 4).events.filter((e) => e.a !== null && e.b !== null);
  assert.deepEqual(both.map((e) => e.pos), [0, 6]);
});

test('countGrid gives one-based counts for each voice', () => {
  assert.deepEqual(countGrid(3, 2), { grid: 6, a: [1, 3, 5], b: [1, 4], both: [1], composite: [1, 3, 4, 5] });
  assert.deepEqual(countGrid(4, 3), { grid: 12, a: [1, 4, 7, 10], b: [1, 5, 9], both: [1], composite: [1, 4, 5, 7, 9, 10] });
});

test('ratio slugs round-trip and reject out-of-range voices', () => {
  assert.deepEqual(parseRatioSlug('5-against-4'), { a: 5, b: 4 });
  assert.equal(ratioSlug(7, 8), '7-against-8');
  assert.equal(parseRatioSlug('1-against-4'), null);
  assert.equal(parseRatioSlug('10-against-4'), null);
  assert.equal(parseRatioSlug('five-against-four'), null);
});
