import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_BPM, MAX_BPM, clampBpm, parseBpm, tempoName, defaultAccents, cycleAccent, barSeconds,
} from '../../public/steady/web/lib/tempo.js';

test('tempo range is 20 to 300', () => {
  assert.equal(MIN_BPM, 20);
  assert.equal(MAX_BPM, 300);
});

test('clampBpm rounds and clamps into range', () => {
  assert.equal(clampBpm(120.4), 120);
  assert.equal(clampBpm(120.6), 121);
  assert.equal(clampBpm(5), 20);
  assert.equal(clampBpm(999), 300);
  assert.equal(clampBpm(NaN), 120);
});

test('parseBpm accepts typed numbers and rejects junk', () => {
  assert.equal(parseBpm('96'), 96);
  assert.equal(parseBpm(' 96 '), 96);
  assert.equal(parseBpm('96.6'), 97);
  assert.equal(parseBpm('1000'), 300);
  assert.equal(parseBpm('3'), 20);
  assert.equal(parseBpm(''), null);
  assert.equal(parseBpm('fast'), null);
});

test('tempoName matches the app', () => {
  assert.equal(tempoName(30), 'Grave');
  assert.equal(tempoName(50), 'Largo');
  assert.equal(tempoName(62), 'Larghetto');
  assert.equal(tempoName(70), 'Adagio');
  assert.equal(tempoName(90), 'Andante');
  assert.equal(tempoName(110), 'Moderato');
  assert.equal(tempoName(120), 'Allegro');
  assert.equal(tempoName(160), 'Vivace');
  assert.equal(tempoName(180), 'Presto');
  assert.equal(tempoName(240), 'Prestissimo');
});

test('defaultAccents: simple meters accent beat one only', () => {
  assert.deepEqual(defaultAccents(4, 4), ['accent', 'normal', 'normal', 'normal']);
  assert.deepEqual(defaultAccents(3, 4), ['accent', 'normal', 'normal']);
  assert.deepEqual(defaultAccents(1, 4), ['accent']);
});

test('defaultAccents: compound eighths group in threes', () => {
  assert.deepEqual(defaultAccents(6, 8), ['accent', 'normal', 'normal', 'accent', 'normal', 'normal']);
  assert.deepEqual(defaultAccents(9, 8).filter((a) => a === 'accent').length, 3);
  assert.deepEqual(defaultAccents(12, 8).map((a, i) => (a === 'accent' ? i : -1)).filter((i) => i >= 0), [0, 3, 6, 9]);
  // 3/8 is one group, not a compound bar.
  assert.deepEqual(defaultAccents(3, 8), ['accent', 'normal', 'normal']);
  // 7/8 is not a multiple of three: beat one only, the player marks the rest.
  assert.deepEqual(defaultAccents(7, 8), ['accent', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal']);
});

test('cycleAccent goes accent -> normal -> mute -> accent', () => {
  assert.equal(cycleAccent('accent'), 'normal');
  assert.equal(cycleAccent('normal'), 'mute');
  assert.equal(cycleAccent('mute'), 'accent');
});

test('barSeconds: the beat unit is the written note value', () => {
  assert.equal(barSeconds(120, 4), 2);
  assert.equal(barSeconds(60, 3), 3);
  assert.equal(barSeconds(120, 6), 3);
});
