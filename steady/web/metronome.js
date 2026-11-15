import { clampBpm, parseBpm, tempoName, defaultAccents, cycleAccent, barSeconds, MIN_BPM, MAX_BPM } from './lib/tempo.js';
import { metronomePattern } from './lib/scheduler.js';
import { Transport } from './audio.js';
import { setupPopovers, setStartButton, reducedMotion } from './ui.js';

const PX_PER_BPM = 8;
const DENS = [2, 4, 8, 16];
const SOUND = { accent: ['accent'], normal: ['normal'], sub: ['sub'], mute: [] };

export function initMetronome(panel, api) {
  const $ = (s) => panel.querySelector(s);
  const prefs = api.prefs;
  const q = new URLSearchParams(location.search);
  const s = {
    bpm: clampBpm(parseBpm(q.get('bpm') || '') ?? prefs.get('bpm', 120)),
    beats: prefs.get('beats', 4),
    den: prefs.get('den', 4),
    subdiv: prefs.get('subdiv', 1),
  };
  s.accents = defaultAccents(s.beats, s.den);
  let pattern = null;
  const rebuild = () => { pattern = metronomePattern({ accents: s.accents, subdivision: s.subdiv }); };
  rebuild();

  const transport = new Transport({
    source: () => ({ pattern, cycleSeconds: barSeconds(s.bpm, s.beats) }),
    sounds: (ev) => SOUND[ev.level] || [],
  });

  // ---- beats row ---------------------------------------------------------
  const beatsEl = $('.beats');
  function renderBeats() {
    beatsEl.textContent = '';
    const n = s.accents.length;
    const w = Math.max(200, beatsEl.clientWidth || 300);
    const size = Math.max(14, Math.min(36, (w - (n - 1) * 9) / Math.min(n, 8)));
    s.accents.forEach((lvl, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `beat ${lvl}`;
      b.style.setProperty('--s', `${size}px`);
      b.setAttribute('aria-label', `Beat ${i + 1}: ${lvl === 'mute' ? 'silent' : lvl}`);
      b.innerHTML = '<i></i>';
      b.addEventListener('click', () => {
        s.accents[i] = cycleAccent(s.accents[i]);
        rebuild();
        renderBeats();
        beatsEl.children[i].focus();
      });
      beatsEl.appendChild(b);
    });
  }

  // ---- tempo: number, typed entry, ruler ---------------------------------
  const bpmBtn = $('.bpm');
  const bpmInput = $('.bpm-input');
  const marking = $('[data-role="marking"]');
  const ruler = $('.ruler');
  const canvas = ruler.querySelector('canvas');
  let shown = s.bpm; // fractional while dragging, so the ruler glides

  function setBpm(v, { fine = false } = {}) {
    shown = fine ? Math.min(MAX_BPM, Math.max(MIN_BPM, v)) : clampBpm(v);
    s.bpm = clampBpm(shown);
    bpmBtn.textContent = s.bpm;
    bpmBtn.setAttribute('aria-label', `Tempo ${s.bpm} BPM. Activate to type a tempo.`);
    marking.textContent = tempoName(s.bpm);
    ruler.setAttribute('aria-valuenow', s.bpm);
    ruler.setAttribute('aria-valuetext', `${s.bpm} BPM, ${tempoName(s.bpm)}`);
    prefs.set('bpm', s.bpm);
    drawRuler();
  }

  function drawRuler() {
    const dpr = window.devicePixelRatio || 1;
    const W = ruler.clientWidth, H = ruler.clientHeight;
    if (!W || !H) return;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const cy = H / 2;
    const span = Math.ceil(H / 2 / PX_PER_BPM) + 1;
    g.font = '600 12px Manrope, sans-serif';
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (let v = Math.floor(shown - span); v <= Math.ceil(shown + span); v++) {
      if (v < MIN_BPM || v > MAX_BPM) continue;
      const y = cy - (v - shown) * PX_PER_BPM;
      const edge = Math.min(1, Math.min(y, H - y) / (H * 0.22)); // fade at both ends
      if (edge <= 0) continue;
      const ten = v % 10 === 0, five = v % 5 === 0;
      const len = ten ? 26 : five ? 17 : 9;
      g.globalAlpha = edge * (ten ? 1 : five ? 0.6 : 0.32);
      g.fillStyle = '#8A90A0';
      g.fillRect(W - len, Math.round(y) - (ten ? 0.8 : 0.5), len, ten ? 1.6 : 1);
      if (ten) { g.globalAlpha = edge * 0.9; g.fillText(String(v), W - 52, y); }
    }
    g.globalAlpha = 1;
  }

  // Drag the ruler like the app: the ticks follow the finger, so dragging
  // down brings higher tempos to the indicator. A flick keeps gliding.
  let drag = null, glide = 0;
  ruler.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cancelAnimationFrame(glide);
    ruler.setPointerCapture(e.pointerId);
    drag = { y: e.clientY, start: shown, v: 0, t: e.timeStamp, last: e.clientY };
    e.preventDefault();
    ruler.focus({ preventScroll: true });
  });
  ruler.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dt = Math.max(1, e.timeStamp - drag.t);
    drag.v = 0.7 * drag.v + 0.3 * ((e.clientY - drag.last) / PX_PER_BPM / dt);
    drag.t = e.timeStamp; drag.last = e.clientY;
    setBpm(drag.start + (e.clientY - drag.y) / PX_PER_BPM, { fine: true });
  });
  const endDrag = () => {
    if (!drag) return;
    let v = drag.v; // BPM per ms
    drag = null;
    if (reducedMotion() || Math.abs(v) < 0.02) { setBpm(shown); return; }
    let prev = performance.now();
    const step = (now) => {
      const dt = now - prev; prev = now;
      v *= Math.pow(0.994, dt);
      setBpm(shown + v * dt, { fine: true });
      if (Math.abs(v) > 0.004 && shown > MIN_BPM && shown < MAX_BPM) glide = requestAnimationFrame(step);
      else setBpm(shown);
    };
    glide = requestAnimationFrame(step);
  };
  ruler.addEventListener('pointerup', endDrag);
  ruler.addEventListener('pointercancel', endDrag);
  ruler.addEventListener('wheel', (e) => {
    e.preventDefault();
    cancelAnimationFrame(glide);
    setBpm(s.bpm + (e.deltaY < 0 ? 1 : -1) * (Math.abs(e.deltaY) > 60 ? 2 : 1));
  }, { passive: false });
  ruler.addEventListener('keydown', (e) => {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (d) setBpm(s.bpm + d);
    else if (e.key === 'Home') setBpm(MIN_BPM);
    else if (e.key === 'End') setBpm(MAX_BPM);
    else return;
    e.preventDefault();
  });

  // Tap the number to type one.
  function openEntry() {
    bpmInput.value = s.bpm;
    bpmBtn.hidden = true;
    bpmInput.hidden = false;
    bpmInput.focus();
    bpmInput.select();
  }
  function closeEntry(commit) {
    if (bpmInput.hidden) return;
    if (commit) { const v = parseBpm(bpmInput.value); if (v !== null) setBpm(v); }
    bpmInput.hidden = true;
    bpmBtn.hidden = false;
  }
  bpmBtn.addEventListener('click', openEntry);
  bpmInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { closeEntry(true); bpmBtn.focus(); }
    else if (e.key === 'Escape') { closeEntry(false); bpmBtn.focus(); }
  });
  bpmInput.addEventListener('blur', () => closeEntry(true));

  // ---- time signature and subdivision -------------------------------------
  const num = $('[data-role="num"]'), den = $('[data-role="den"]');
  const beatsOut = $('[data-role="beats-out"]'), denOut = $('[data-role="den-out"]');
  const meterChip = $('[data-pop="meter"]');
  function renderMeter() {
    num.textContent = beatsOut.textContent = s.beats;
    den.textContent = denOut.textContent = s.den;
    meterChip.setAttribute('aria-label', `Time signature ${s.beats}/${s.den}`);
    panel.querySelector('[data-step="beats"][data-dir="-1"]').disabled = s.beats <= 1;
    panel.querySelector('[data-step="beats"][data-dir="1"]').disabled = s.beats >= 16;
    panel.querySelector('[data-step="den"][data-dir="-1"]').disabled = s.den <= DENS[0];
    panel.querySelector('[data-step="den"][data-dir="1"]').disabled = s.den >= DENS[DENS.length - 1];
  }
  panel.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const d = +b.dataset.dir;
    if (b.dataset.step === 'beats') s.beats = Math.min(16, Math.max(1, s.beats + d));
    else s.den = DENS[Math.min(DENS.length - 1, Math.max(0, DENS.indexOf(s.den) + d))];
    s.accents = defaultAccents(s.beats, s.den);
    prefs.set('beats', s.beats); prefs.set('den', s.den);
    rebuild(); renderBeats(); renderMeter();
  }));

  const subChip = $('[data-pop="subdiv"]');
  const radios = [...panel.querySelectorAll('[data-subdiv]')];
  function renderSubdiv() {
    for (const r of radios) {
      const on = +r.dataset.subdiv === s.subdiv;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
      if (on) {
        $('[data-role="subdiv-ico"]').innerHTML = r.innerHTML;
        subChip.setAttribute('aria-label', `Subdivision: ${r.getAttribute('aria-label')}`);
      }
    }
  }
  radios.forEach((r) => r.addEventListener('click', () => {
    s.subdiv = +r.dataset.subdiv;
    prefs.set('subdiv', s.subdiv);
    rebuild(); renderSubdiv();
  }));
  panel.querySelector('.seg').addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const i = Math.min(3, Math.max(0, radios.findIndex((r) => +r.dataset.subdiv === s.subdiv) + d));
    radios[i].click(); radios[i].focus();
  });
  setupPopovers(panel);

  // ---- play ---------------------------------------------------------------
  const startBtn = $('[data-role="start"]');
  let raf = 0, lit = -1;
  function frame() {
    const ev = transport.heard();
    const beat = ev ? ev.beat : -1;
    if (beat !== lit) {
      if (beatsEl.children[lit]) beatsEl.children[lit].classList.remove('on');
      if (beatsEl.children[beat]) beatsEl.children[beat].classList.add('on');
      lit = beat;
    }
    if (transport.playing) raf = requestAnimationFrame(frame);
  }
  function start() {
    if (!transport.start()) return;
    setStartButton(startBtn, true, 'Stop');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    transport.stop();
    setStartButton(startBtn, false, 'Start');
    cancelAnimationFrame(raf);
    if (beatsEl.children[lit]) beatsEl.children[lit].classList.remove('on');
    lit = -1;
  }
  const toggle = () => (transport.playing ? stop() : start());
  startBtn.addEventListener('click', toggle);

  window.addEventListener('resize', () => { renderBeats(); drawRuler(); });
  if (document.fonts) document.fonts.ready.then(drawRuler);

  return {
    transport,
    state: s,
    activate(extra) {
      if (extra && extra.bpm) setBpm(extra.bpm);
      renderBeats(); renderMeter(); renderSubdiv(); setBpm(s.bpm);
    },
    deactivate() { if (transport.playing) stop(); },
    toggle,
  };
}
