// Audio: one AudioContext, pre-rendered click buffers, and a lookahead
// transport. Timing lives on AudioContext.currentTime; the timer only decides
// *when to look ahead*, never when a click sounds.

import { clickSamples, VOICES } from './lib/clicks.js';
import { advance, startState, realign } from './lib/scheduler.js';

const LOOKAHEAD = 0.12;       // seconds of clicks queued while the page is visible
const LOOKAHEAD_HIDDEN = 1.2; // background tabs throttle timers; queue further ahead
const TICK_MS = 25;

let ctx = null;
const buffers = {};
let master = null;

/** Create/resume the context. Must run inside a user gesture on iOS. */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    // iOS 16.4+: play through the ring/silent switch, like a music app would.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* optional */ }
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    for (const [name, v] of Object.entries(VOICES)) {
      const data = clickSamples(v, ctx.sampleRate);
      const b = ctx.createBuffer(1, data.length, ctx.sampleRate);
      b.getChannelData(0).set(data);
      buffers[name] = b;
    }
    // A silent buffer started inside the gesture is what finally unlocks iOS.
    const s = ctx.createBufferSource();
    s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    s.connect(master);
    s.start(0);
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}

export function audioContext() { return ctx; }

export function playVoice(name, time) {
  const b = buffers[name];
  if (!b || !ctx) return;
  const s = ctx.createBufferSource();
  s.buffer = b;
  s.connect(master);
  s.start(Math.max(time, ctx.currentTime));
}

/** The context time of the sample leaving the speaker now (for visuals). */
export function heardTime() {
  if (!ctx) return 0;
  if (ctx.getOutputTimestamp) {
    const ts = ctx.getOutputTimestamp();
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0) {
      return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
  }
  return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
}

// A worker's timer keeps ticking in a background tab where the page's own
// setInterval is throttled to once a second or worse.
function makeTimer(fn) {
  try {
    const src = 'let id=0;onmessage=e=>{clearInterval(id);if(e.data>0)id=setInterval(()=>postMessage(0),e.data)}';
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = fn;
    return { start: () => w.postMessage(TICK_MS), stop: () => w.postMessage(0) };
  } catch (_) {
    let id = 0;
    return { start: () => { clearInterval(id); id = setInterval(fn, TICK_MS); }, stop: () => clearInterval(id) };
  }
}

/**
 * Plays a pattern on a loop. `source()` returns { pattern, cycleSeconds } each
 * tick, so tempo changes land on the next gap; `sounds(ev)` names the voices an
 * event plays. Played events wait in `queue` until they are heard, for visuals.
 */
export class Transport {
  constructor({ source, sounds }) {
    this.source = source;
    this.sounds = sounds;
    this.playing = false;
    this.queue = [];
    this.timer = makeTimer(() => this.tick());
    this.pattern = null;
    this.log = null; // set to [] to record { time, now } per scheduled event (debugging)
  }
  start() {
    const c = unlockAudio();
    if (!c) return false;
    this.state = startState(c.currentTime + 0.08);
    this.pattern = null;
    this.queue = [];
    this.lastHeard = null;
    this.playing = true;
    this.tick();
    this.timer.start();
    wakeLock(true);
    return true;
  }
  stop() {
    this.playing = false;
    this.timer.stop();
    this.queue = [];
    this.lastHeard = null;
    wakeLock(false);
  }
  tick() {
    if (!this.playing || !ctx) return;
    const { pattern, cycleSeconds } = this.source();
    if (this.pattern && pattern !== this.pattern) this.state = realign(this.state, this.pattern, pattern);
    this.pattern = pattern;
    const horizon = ctx.currentTime + (document.hidden ? LOOKAHEAD_HIDDEN : LOOKAHEAD);
    const r = advance(this.state, pattern, cycleSeconds, horizon);
    this.state = r.state;
    for (const ev of r.events) {
      for (const v of this.sounds(ev)) playVoice(v, ev.time);
      ev.cycleSeconds = cycleSeconds;
      this.queue.push(ev);
      if (this.log) this.log.push({ time: ev.time, now: ctx.currentTime });
    }
    if (this.queue.length > 256) this.queue.splice(0, this.queue.length - 256);
  }
  /** The most recent event that has been heard, discarding older ones. */
  heard() {
    const t = heardTime();
    let last = null;
    while (this.queue.length && this.queue[0].time <= t) last = this.queue.shift();
    if (last) this.lastHeard = last;
    return this.lastHeard || null;
  }
}

// Keep the screen on while something is playing. Unsupported or refused (low
// battery, no permission) is fine: the click carries on either way.
let lock = null;
let wantLock = false;
async function wakeLock(on) {
  wantLock = on;
  try {
    if (on && !lock && navigator.wakeLock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) {
      const l = lock; lock = null; await l.release();
    }
  } catch (_) { lock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wantLock) wakeLock(true);
});
