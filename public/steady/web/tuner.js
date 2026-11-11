import { detectPitch, noteFromFrequency, rms, PitchSmoother, MIN_A4, MAX_A4 } from './lib/pitch.js';
import { unlockAudio } from './audio.js';
import { setStartButton } from './ui.js';

const GATE = 0.008;        // RMS below this is silence, not a note
const IN_TUNE = 5;         // cents either way
const STALE_MS = 700;      // dim the last note after this much silence

export function initTuner(panel, api) {
  const $ = (s) => panel.querySelector(s);
  const prefs = api.prefs;
  const stage = $('.tuner-stage');
  const noteEl = $('[data-role="note"]'), octEl = $('[data-role="octave"]');
  const needle = $('[data-role="needle"]'), readout = $('[data-role="readout"]');
  const stateEl = $('[data-role="tuner-state"]'), refOut = $('[data-role="ref-out"]');
  const startBtn = $('[data-role="start"]');
  let a4 = Math.min(MAX_A4, Math.max(MIN_A4, prefs.get('a4', 440)));
  let starting = false, stream = null, src = null, analyser = null, buf = null, raf = 0, n = 0, lastPitch = 0;
  const smooth = new PitchSmoother(0.3);

  function renderRef() {
    refOut.textContent = `A = ${a4} Hz`;
    $('[data-role="ref-down"]').disabled = a4 <= MIN_A4;
    $('[data-role="ref-up"]').disabled = a4 >= MAX_A4;
  }
  function stepRef(d) { a4 = Math.min(MAX_A4, Math.max(MIN_A4, a4 + d)); prefs.set('a4', a4); renderRef(); }
  // Press and hold to run through the range; a single press is one hertz.
  for (const [role, d] of [['ref-down', -1], ['ref-up', 1]]) {
    const b = $(`[data-role="${role}"]`);
    let hold = 0, rep = 0;
    const end = () => { clearTimeout(hold); clearInterval(rep); };
    b.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      stepRef(d);
      hold = setTimeout(() => { rep = setInterval(() => stepRef(d), 70); }, 400);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => b.addEventListener(t, end));
    b.addEventListener('click', (e) => { if (e.detail === 0) stepRef(d); }); // keyboard
  }

  function message(text, retry) {
    stateEl.textContent = text;
    if (retry) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ghost'; b.textContent = 'Try again';
      b.addEventListener('click', start);
      stateEl.append(document.createElement('br'), b);
    }
  }

  function show(freq) {
    const r = noteFromFrequency(freq, a4);
    noteEl.textContent = r.name;
    octEl.textContent = `Octave ${r.octave}`;
    const c = Math.max(-50, Math.min(50, r.cents));
    needle.style.transform = `rotate(${(c / 50) * 60}deg)`;
    const inTune = Math.abs(r.cents) <= IN_TUNE;
    needle.classList.toggle('in', inTune);
    readout.textContent = `${inTune ? 'In tune' : `${r.cents > 0 ? '+' : ''}${r.cents} cents`} · ${freq.toFixed(1)} Hz`;
    stage.classList.remove('stale');
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (++n % 2) return; // ~30 detections a second is plenty
    analyser.getFloatTimeDomainData(buf);
    const hit = rms(buf) >= GATE ? detectPitch(buf, analyser.context.sampleRate, { minHz: 40, maxHz: 2000 }) : null;
    if (hit) {
      lastPitch = now;
      show(smooth.push(hit.freq));
      if (stateEl.dataset.s !== 'pitch') { stateEl.dataset.s = 'pitch'; message(' '); }
    } else if (now - lastPitch > STALE_MS) {
      smooth.reset();
      if (stateEl.dataset.s !== 'quiet') {
        stateEl.dataset.s = 'quiet';
        stage.classList.add('stale');
        message('Listening. Play a single note.');
      }
    }
  }

  async function start() {
    if (starting || stream) return;
    starting = true;
    try { await begin(); } finally { starting = false; }
  }
  async function begin() {
    const ctx = unlockAudio(); // inside the tap, for iOS
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !ctx) {
      message('This browser can’t use a microphone on this page. Try a current Chrome, Safari or Firefox.');
      return;
    }
    message('Waiting for microphone permission…');
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (err) {
      stream = null;
      const name = err && err.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        message('Microphone access is blocked. Allow it for this site in your browser’s settings, then try again.', true);
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        message('No microphone found. Connect one, then try again.', true);
      } else {
        message('The microphone couldn’t be started. It may be in use by another app.', true);
      }
      return;
    }
    if (ctx.state !== 'running') await ctx.resume().catch(() => {});
    src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    buf = new Float32Array(analyser.fftSize);
    src.connect(analyser); // analysis only: never routed to the speakers
    stateEl.dataset.s = '';
    lastPitch = 0;
    setStartButton(startBtn, true, 'Stop tuner');
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    if (src) src.disconnect();
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = src = analyser = null;
    smooth.reset();
    stage.classList.add('stale');
    stateEl.dataset.s = '';
    setStartButton(startBtn, false, 'Start tuner');
    message('Stopped. Press Start tuner to listen again.');
  }
  const toggle = () => (stream ? stop() : start());
  startBtn.addEventListener('click', toggle);
  renderRef();

  return {
    activate() {},
    deactivate() { if (stream) stop(); },
    toggle,
    show, // exposed for screenshots and tests: show(441)
  };
}
