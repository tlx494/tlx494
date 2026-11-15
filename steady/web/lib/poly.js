// Polyrhythm maths: "A against B" means A evenly spaced notes in the time of B
// beats. B is the pulse the tempo counts; A is the voice laid across it.

export const MIN_VOICE = 2;
export const MAX_VOICE = 9;

export function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
export function lcm(a, b) { return (a / gcd(a, b)) * b; }

/**
 * One cycle as merged events on the shared grid of lcm(a, b) slots. Positions
 * are integers, so coincidences are exact rather than float comparisons. Each
 * event says which note of each voice sounds there (index, or null).
 */
export function polyPattern(a, b) {
  const grid = lcm(a, b);
  const byPos = new Map();
  const put = (pos, voice, i) => {
    if (!byPos.has(pos)) byPos.set(pos, { pos, at: pos / grid, a: null, b: null });
    byPos.get(pos)[voice] = i;
  };
  for (let i = 0; i < a; i++) put(i * (grid / a), 'a', i);
  for (let i = 0; i < b; i++) put(i * (grid / b), 'b', i);
  const events = [...byPos.values()].sort((x, y) => x.pos - y.pos);
  return { a, b, grid, events };
}

/** The count a player says out loud: 1..grid, and where each voice lands. */
export function countGrid(a, b) {
  const { grid, events } = polyPattern(a, b);
  const one = (e) => e.pos + 1;
  return {
    grid,
    a: events.filter((e) => e.a !== null).map(one),
    b: events.filter((e) => e.b !== null).map(one),
    both: events.filter((e) => e.a !== null && e.b !== null).map(one),
    composite: events.map(one),
  };
}

export function ratioSlug(a, b) { return `${a}-against-${b}`; }

export function parseRatioSlug(slug) {
  const m = /^(\d)-against-(\d)$/.exec(String(slug));
  if (!m) return null;
  const a = +m[1], b = +m[2];
  const ok = (n) => n >= MIN_VOICE && n <= MAX_VOICE;
  return ok(a) && ok(b) ? { a, b } : null;
}
