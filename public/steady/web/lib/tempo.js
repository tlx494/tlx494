// Tempo maths shared by the metronome, tap tempo and polyrhythm tools.
// Pure functions only: no DOM, no audio, so `node --test` can cover them.

export const MIN_BPM = 20;
export const MAX_BPM = 300;
export const DEFAULT_BPM = 120;

export function clampBpm(bpm) {
  if (!Number.isFinite(bpm)) return DEFAULT_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

/** A typed tempo, or null when the text is not a number at all. */
export function parseBpm(text) {
  const s = String(text ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return clampBpm(parseFloat(s));
}

/** The same Italian marking the app shows under the tempo. */
export function tempoName(bpm) {
  if (bpm < 40) return 'Grave';
  if (bpm < 60) return 'Largo';
  if (bpm < 66) return 'Larghetto';
  if (bpm < 76) return 'Adagio';
  if (bpm < 108) return 'Andante';
  if (bpm < 120) return 'Moderato';
  if (bpm < 156) return 'Allegro';
  if (bpm < 176) return 'Vivace';
  if (bpm < 200) return 'Presto';
  return 'Prestissimo';
}

/**
 * Accents a bar starts with. Convention, not a setting: compound eighth-note
 * meters (6/8, 9/8, 12/8) are felt in groups of three, so each group's first
 * eighth is accented. Anything else accents beat one and leaves the rest to the
 * player, who taps a beat to change it.
 */
export function defaultAccents(beats, noteValue) {
  const compound = noteValue === 8 && beats > 3 && beats % 3 === 0;
  return Array.from({ length: beats }, (_, i) =>
    i === 0 || (compound && i % 3 === 0) ? 'accent' : 'normal');
}

const NEXT_ACCENT = { accent: 'normal', normal: 'mute', mute: 'accent' };
export function cycleAccent(level) {
  return NEXT_ACCENT[level] ?? 'normal';
}

/** One bar in seconds. The tempo counts the written beat (the lower number). */
export function barSeconds(bpm, beats) {
  return (60 / bpm) * beats;
}
