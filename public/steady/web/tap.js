import { TapTempo } from './lib/taptempo.js';
import { clampBpm } from './lib/tempo.js';
import { reducedMotion } from './ui.js';

const IGNORE_KEYS = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape', 'F5', 'ContextMenu']);

export function initTap(panel, api) {
  const $ = (s) => panel.querySelector(s);
  const tt = new TapTempo({ maxTaps: 8, resetAfterMs: 2000 });
  const pad = $('.tap-pad'), ring = $('.tap-ring');
  const out = $('[data-role="tap-bpm"]'), meta = $('[data-role="tap-meta"]'), hint = $('[data-role="tap-hint"]');
  const send = $('[data-role="tap-send"]'), reset = $('[data-role="tap-reset"]');
  let isActive = false;

  function render() {
    const bpm = tt.bpm;
    out.textContent = bpm === null ? '–' : Math.round(bpm);
    out.classList.toggle('idle', bpm === null);
    meta.textContent = tt.count === 0 ? ' ' : tt.count === 1 ? 'Keep tapping' : `${tt.count} taps · ${bpm.toFixed(1)} BPM`;
    hint.style.visibility = tt.count > 0 ? 'hidden' : 'visible'; // keep the layout still
    if (bpm === null) {
      send.setAttribute('aria-disabled', 'true');
      send.href = '/steady/metronome/';
      delete send.dataset.goto;
    } else {
      const v = clampBpm(bpm);
      send.removeAttribute('aria-disabled');
      send.href = `/steady/metronome/?bpm=${v}`;
      send.dataset.goto = 'metronome';
      send.dataset.gotoBpm = String(v);
    }
  }

  function tap(t) {
    tt.tap(t);
    render();
    if (!reducedMotion()) { ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go'); }
  }

  // Anywhere in the tool counts, except its own buttons.
  panel.addEventListener('pointerdown', (e) => {
    if (!isActive || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('a, button:not(.tap-pad)')) return;
    e.preventDefault(); // no focus ring, no text selection, no double-tap zoom
    tap(e.timeStamp);
  });
  // Any key counts, except keys that move focus or activate other controls.
  document.addEventListener('keydown', (e) => {
    if (!isActive || e.repeat || IGNORE_KEYS.has(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t.closest && t.closest('input, textarea, select')) return;
    if ((e.key === 'Enter' || e.key === ' ') && t.closest && t.closest('a, button:not(.tap-pad)')) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow') || e.key.startsWith('Page')) e.preventDefault();
    tap(e.timeStamp);
  });
  reset.addEventListener('click', () => { tt.reset(); render(); pad.focus(); });
  render();

  return {
    activate() { isActive = true; },
    deactivate() { isActive = false; },
    get bpm() { return tt.bpm; },
  };
}
