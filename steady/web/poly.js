import { polyPattern, countGrid, MIN_VOICE, MAX_VOICE } from './lib/poly.js';
import { Transport, heardTime } from './audio.js';
import { setStartButton } from './ui.js';

const C = {
  bg: '#0F1115', muted: '#3A3F4B', line: '#262B34', dim: '#8A90A0', ink: '#F2F3F5',
  accent: '#FFC152', accent2: '#FF8A3D', accentDim: '#745B2F', voiceA: '#E4E7EE',
};
const FLASH = 0.16; // seconds a struck marker takes to fade back

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/**
 * Draw one frame. Pure in its inputs: `phase` (cycles elapsed, or null when
 * stopped) decides everything that moves, which is what lets a video renderer
 * step through frames deterministically with clipFrame(t).
 */
export function drawPoly(g, W, H, { a, b, phase, cycleSeconds, muteA, muteB, clip }) {
  g.clearRect(0, 0, W, H);
  if (clip) { g.fillStyle = C.bg; g.fillRect(0, 0, W, H); }
  const { grid, events } = polyPattern(a, b);
  const count = countGrid(a, b);
  const font = (w, px) => `${w} ${px}px Manrope, -apple-system, sans-serif`;

  let top = 0, h = H;
  if (clip) {
    // The ratio as the headline, the lanes in the middle, a quiet address at the foot.
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = C.ink; g.font = font(300, Math.round(W * 0.24));
    g.fillText(`${a}:${b}`, W / 2, H * 0.25);
    g.fillStyle = C.dim; g.font = font(600, Math.round(W * 0.04));
    g.fillText(`${a} against ${b}`, W / 2, H * 0.25 + W * 0.08);
    g.fillStyle = C.muted; g.font = font(600, Math.round(W * 0.03));
    g.fillText('danielodea.com/steady', W / 2, H * 0.94);
    top = H * 0.36; h = H * 0.42;
  }
  const padX = clip ? W * 0.11 : Math.max(22, W * 0.07);
  const x = (t) => padX + t * (W - 2 * padX);
  const yA = top + h * 0.2, yB = top + h * 0.54, yN = top + h * 0.86;
  const cap = clip ? W * 0.07 : 30;
  const sA = Math.min(cap, ((W - 2 * padX) / a) * 0.5);
  const sB = Math.min(cap, ((W - 2 * padX) / b) * 0.5);
  const playing = phase !== null && phase !== undefined;
  const ph = playing ? ((phase % 1) + 1) % 1 : 0;

  // Since a marker at `at` last sounded, in seconds; Infinity before it ever has.
  const since = (at) => {
    if (!playing) return Infinity;
    let d = ph - at;
    if (d < -1e-9) { if (phase < 1) return Infinity; d += 1; }
    return d * cycleSeconds;
  };
  const glow = (at) => { const s = since(at); return s === Infinity ? 0 : Math.exp(-s / FLASH); };

  // The shared count: faint slot lines, brighter where the voices meet.
  g.lineWidth = 1;
  for (let k = 0; k <= grid; k++) {
    const both = k === grid || count.both.includes(k + 1);
    if (grid > 30 && !both) continue;
    g.strokeStyle = both ? 'rgba(255,193,82,.22)' : 'rgba(138,144,160,.09)';
    const xx = Math.round(x(k / grid)) + 0.5;
    g.beginPath(); g.moveTo(xx, yA - sA * 0.9); g.lineTo(xx, yB + sB * 0.9); g.stroke();
  }
  // Lane tracks.
  g.strokeStyle = C.line; g.lineWidth = 2;
  for (const y of [yA, yB]) { g.beginPath(); g.moveTo(x(0), y); g.lineTo(x(1), y); g.stroke(); }

  // Markers: voice A as circles, voice B (the beat) as rounded squares, the
  // same shapes as the app's poly and beat rows. The cycle's end shows the
  // next downbeat as a ghost, so the loop reads as a loop.
  const marker = (voice, i, n, at, ghost) => {
    const isA = voice === 'a';
    const s = isA ? sA : sB, y = isA ? yA : yB, cx = x(at);
    const muted = isA ? muteA : muteB;
    const k = ghost ? 0 : glow(at);
    const down = i === 0;
    g.save();
    g.globalAlpha = ghost ? 0.28 : 1;
    const path = () => (isA ? (g.beginPath(), g.arc(cx, y, s / 2, 0, Math.PI * 2)) : roundRect(g, cx - s / 2, y - s / 2, s, s, s * 0.28));
    if (k > 0.02) { g.shadowColor = isA ? 'rgba(228,231,238,.8)' : 'rgba(255,193,82,.85)'; g.shadowBlur = (clip ? 40 : 16) * k; }
    path();
    if (muted) {
      g.lineWidth = Math.max(2, s * 0.08);
      g.strokeStyle = k > 0.02 ? (isA ? C.voiceA : C.accent) : C.muted;
      g.stroke();
    } else {
      const base = down ? (isA ? '#6B6F7A' : C.accentDim) : C.muted;
      g.fillStyle = base; g.fill();
      if (k > 0.02) {
        g.globalAlpha = (ghost ? 0.28 : 1) * k;
        if (isA) g.fillStyle = C.voiceA;
        else { const gr = g.createLinearGradient(cx - s / 2, y - s / 2, cx + s / 2, y + s / 2); gr.addColorStop(0, C.accent); gr.addColorStop(1, C.accent2); g.fillStyle = gr; }
        path(); g.fill();
      }
    }
    g.restore();
  };
  for (const ev of events) {
    if (ev.a !== null) marker('a', ev.a, a, ev.at);
    if (ev.b !== null) marker('b', ev.b, b, ev.at);
  }
  marker('a', 0, a, 1, true);
  marker('b', 0, b, 1, true);

  // The count to say out loud, under the lanes.
  const slot = (W - 2 * padX) / grid;
  if (grid <= 24) {
    const px = Math.round(Math.min(clip ? W * 0.035 : 15, slot * 0.62));
    g.font = font(700, px); g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 0; k < grid; k++) {
      const n = k + 1;
      const inA = count.a.includes(n), inB = count.b.includes(n);
      const lit = playing && glow(k / grid) > 0.35 && (inA || inB);
      g.fillStyle = lit ? C.accent : inB ? '#D9B77A' : inA ? C.ink : C.muted;
      g.globalAlpha = inA || inB ? 1 : 0.9;
      g.fillText(String(n), x(k / grid), yN);
    }
    g.globalAlpha = 1;
  } else {
    for (const n of count.composite) {
      const k = n - 1;
      g.fillStyle = count.b.includes(n) ? '#D9B77A' : C.dim;
      g.beginPath(); g.arc(x(k / grid), yN, clip ? 5 : 2.5, 0, Math.PI * 2); g.fill();
    }
  }

  // Playhead.
  if (playing) {
    const px = x(ph);
    const y0 = yA - sA * 1.1, y1 = yB + sB * 1.1;
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, 'rgba(255,193,82,0)'); gr.addColorStop(0.2, C.accent); gr.addColorStop(0.8, C.accent2); gr.addColorStop(1, 'rgba(255,138,61,0)');
    g.strokeStyle = gr; g.lineWidth = clip ? 5 : 2.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(px, y0); g.lineTo(px, y1); g.stroke();
  }
}

export function initPoly(panel, api) {
  const $ = (s) => panel.querySelector(s);
  const prefs = api.prefs;
  const s = {
    a: +panel.dataset.a || 3,
    b: +panel.dataset.b || 2,
    bpm: prefs.get('polyBpm', 60),
    muteA: false, muteB: false,
  };
  let pattern = polyPattern(s.a, s.b);
  const cycleSeconds = () => (60 / s.bpm) * s.b;
  const transport = new Transport({
    source: () => ({ pattern, cycleSeconds: cycleSeconds() }),
    sounds: (ev) => {
      const v = [];
      if (ev.a !== null && !s.muteA) v.push('polyA');
      if (ev.b !== null && !s.muteB) v.push('polyB');
      return v;
    },
  });

  const canvas = $('.poly-canvas');
  const g = canvas.getContext('2d');
  let clip = false, clipStart = 0, phaseOverride = null;

  function size() {
    const dpr = clip ? 1 : window.devicePixelRatio || 1; // clip: one canvas pixel per captured pixel
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [W, H];
  }
  function livePhase() {
    if (phaseOverride !== null) return phaseOverride;
    if (clip && clipStart) return (performance.now() - clipStart) / 1000 / cycleSeconds();
    if (!transport.playing) return null;
    const ev = transport.heard();
    if (!ev) return null;
    return ev.cycle + ev.at + Math.max(0, heardTime() - ev.time) / ev.cycleSeconds;
  }
  function draw(phase = livePhase()) {
    const [W, H] = size();
    if (!W || !H) return;
    drawPoly(g, W, H, { a: s.a, b: s.b, phase, cycleSeconds: cycleSeconds(), muteA: s.muteA, muteB: s.muteB, clip });
  }

  let raf = 0;
  const loop = () => { draw(); if (transport.playing || (clip && clipStart)) raf = requestAnimationFrame(loop); };

  // ---- controls -------------------------------------------------------------
  const outA = $('[data-role="a-out"]'), outB = $('[data-role="b-out"]');
  const labA = $('[data-role="va-label"]'), labB = $('[data-role="vb-label"]');
  function renderRatio() {
    outA.textContent = labA.textContent = s.a;
    outB.textContent = labB.textContent = s.b;
    for (const v of ['a', 'b']) {
      const el = panel.querySelector(`[data-voice="${v}"]`);
      el.querySelector('[data-dir="-1"]').disabled = s[v] <= MIN_VOICE;
      el.querySelector('[data-dir="1"]').disabled = s[v] >= MAX_VOICE;
    }
    const c = countGrid(s.a, s.b);
    canvas.setAttribute('aria-label', `${s.a} against ${s.b}. Count ${c.grid}: the ${s.a} lands on ${c.a.join(', ')}; the ${s.b} on ${c.b.join(', ')}.`);
    pattern = polyPattern(s.a, s.b);
    draw();
  }
  panel.querySelectorAll('[data-voice]').forEach((el) => {
    const v = el.dataset.voice;
    el.querySelectorAll('[data-dir]').forEach((btn) => btn.addEventListener('click', () => {
      s[v] = Math.min(MAX_VOICE, Math.max(MIN_VOICE, s[v] + +btn.dataset.dir));
      renderRatio();
    }));
  });
  $('[data-role="swap"]').addEventListener('click', () => { [s.a, s.b] = [s.b, s.a]; renderRatio(); });

  const muteBtn = { a: $('[data-role="mute-a"]'), b: $('[data-role="mute-b"]') };
  for (const v of ['a', 'b']) {
    muteBtn[v].addEventListener('click', () => {
      const k = v === 'a' ? 'muteA' : 'muteB';
      s[k] = !s[k];
      muteBtn[v].setAttribute('aria-pressed', String(!s[k]));
      draw();
    });
  }

  const tempo = $('[data-role="poly-tempo"]'), tempoOut = $('[data-role="poly-tempo-out"]');
  function setTempo(v) {
    s.bpm = Math.min(+tempo.max, Math.max(+tempo.min, Math.round(v)));
    tempo.value = s.bpm;
    tempoOut.textContent = `${s.bpm} BPM`;
    prefs.set('polyBpm', s.bpm);
  }
  tempo.addEventListener('input', () => setTempo(+tempo.value));
  setTempo(s.bpm);

  const startBtn = $('[data-role="start"]');
  function start() {
    if (!transport.start()) return;
    setStartButton(startBtn, true, 'Stop');
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function stop() {
    transport.stop();
    setStartButton(startBtn, false, 'Start');
    cancelAnimationFrame(raf);
    draw(null);
  }
  const toggle = () => (transport.playing ? stop() : start());
  startBtn.addEventListener('click', toggle);

  new ResizeObserver(() => draw()).observe(canvas);
  if (document.fonts) document.fonts.ready.then(() => draw());

  // ---- clip mode: for rendering short videos of a ratio -------------------
  if (location.hash === '#clip') {
    clip = true;
    document.documentElement.classList.add('clip');
    // startClip({ a, b, bpm }) runs the visuals on the page clock, no gesture
    // needed (audio is rendered separately). clipFrame(t) draws the frame at t
    // seconds, for frame-exact capture. Both return the cycle length in seconds.
    window.startClip = (o = {}) => {
      if (o.a) s.a = o.a; if (o.b) s.b = o.b; if (o.bpm) s.bpm = o.bpm;
      renderRatio();
      phaseOverride = null;
      clipStart = performance.now();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
      return cycleSeconds();
    };
    window.clipFrame = (t, o = {}) => {
      if (o.a) s.a = o.a; if (o.b) s.b = o.b; if (o.bpm) s.bpm = o.bpm;
      cancelAnimationFrame(raf); clipStart = 0;
      pattern = polyPattern(s.a, s.b);
      phaseOverride = t / cycleSeconds();
      draw();
      return cycleSeconds();
    };
  }
  renderRatio();

  return {
    transport,
    state: s,
    draw,
    activate() { renderRatio(); },
    deactivate() { if (transport.playing) stop(); },
    toggle,
  };
}

