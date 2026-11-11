// The lookahead scheduler's pure core.
//
// A pattern is one cycle (a bar, or one turn of a polyrhythm) as a list of
// events, each with `at` in [0, 1) of the cycle. `advance` walks forward from
// the next unplayed event and returns every event that falls before a horizon,
// stamped with an absolute AudioContext time.
//
// Times are built gap by gap, not as cycleStart + at * cycleSeconds. That is
// what lets the tempo change while the clicks are running: the next gap simply
// uses the new cycle length, and nothing already scheduled moves or jumps.

export function startState(time) {
  return { index: 0, time, cycle: 0 };
}

export function metronomePattern({ accents, subdivision = 1 }) {
  const beats = accents.length;
  const steps = beats * subdivision;
  const events = [];
  for (let beat = 0; beat < beats; beat++) {
    for (let sub = 0; sub < subdivision; sub++) {
      const beatLevel = accents[beat];
      const level = beatLevel === 'mute' ? 'mute' : sub === 0 ? beatLevel : 'sub';
      events.push({ at: (beat * subdivision + sub) / steps, beat, sub, level });
    }
  }
  return { events };
}

const MAX_EVENTS_PER_CALL = 512;

export function advance(state, pattern, cycleSeconds, until) {
  const evs = pattern.events;
  const out = [];
  if (!evs.length) return { events: out, state };
  let { index, time, cycle } = state;
  if (index >= evs.length) { index = 0; }
  const minGap = 0.001; // a zero-length cycle must not spin forever
  while (time < until && out.length < MAX_EVENTS_PER_CALL) {
    const ev = evs[index];
    out.push({ ...ev, time, cycle });
    const nextIndex = (index + 1) % evs.length;
    let frac = evs[nextIndex].at - ev.at;
    if (nextIndex === 0) { frac += 1; cycle += 1; }
    time += Math.max(minGap, frac * cycleSeconds);
    index = nextIndex;
  }
  return { events: out, state: { index, time, cycle } };
}

/**
 * Swap patterns mid-play (new meter, subdivision or ratio) without restarting:
 * the next unplayed event becomes the first event of the new pattern at or
 * after the same point in the cycle. If the new pattern has nothing left in
 * this cycle, its downbeat is next. The time of that next event is kept.
 */
export function realign(state, oldPattern, newPattern) {
  const cur = oldPattern.events[state.index] ?? oldPattern.events[0];
  const at = cur ? cur.at : 0;
  const i = newPattern.events.findIndex((e) => e.at >= at - 1e-9);
  if (i < 0) return { index: 0, time: state.time, cycle: state.cycle + 1 };
  return { index: i, time: state.time, cycle: state.cycle };
}
