// Entry point for every Steady web page. Brings to life whichever tool panels
// the page carries; on /steady/app/ (data-mode="app") it also switches between
// them in place.

import { initMetronome } from './metronome.js';
import { initTap } from './tap.js';
import { initTuner } from './tuner.js';
import { initPoly } from './poly.js';
import { loadPrefs } from './prefs.js';

const body = document.body;
const appMode = body.dataset.mode === 'app';
const controllers = {};
const INIT = { metronome: initMetronome, tap: initTap, tuner: initTuner, poly: initPoly };
const HASH = { metronome: 'metronome', tap: 'tap', tuner: 'tuner', poly: 'polyrhythm' };
let active = body.dataset.tool;

function go(id, extra) {
  if (!appMode || !controllers[id]) return false;
  for (const [k, c] of Object.entries(controllers)) if (k !== id) c.deactivate();
  for (const p of document.querySelectorAll('.panel')) p.classList.toggle('on', p.dataset.panel === id);
  for (const a of document.querySelectorAll('.tabs a')) {
    if (a.dataset.tool === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  active = id;
  body.dataset.tool = id;
  controllers[id].activate(extra);
  history.replaceState(null, '', `#${HASH[id]}`);
  return true;
}

const api = { go: (id, extra) => go(id, extra), appMode, prefs: loadPrefs() };

for (const panel of document.querySelectorAll('.panel')) {
  const id = panel.dataset.panel;
  controllers[id] = INIT[id](panel, api);
}

if (appMode) {
  const fromHash = Object.keys(HASH).find((k) => `#${HASH[k]}` === location.hash) || 'metronome';
  go(fromHash);
  window.addEventListener('hashchange', () => {
    const id = Object.keys(HASH).find((k) => `#${HASH[k]}` === location.hash);
    if (id && id !== active) go(id);
  });
  document.querySelector('.tabs').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-tool]');
    if (a && go(a.dataset.tool)) e.preventDefault();
  });
} else {
  controllers[active]?.activate();
}

// Links that lead to another tool ("Tap", "Use in metronome") switch in place
// in the app, and navigate normally on a landing page.
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-goto]');
  if (!a || !appMode) return;
  if (go(a.dataset.goto, a.dataset.gotoBpm ? { bpm: +a.dataset.gotoBpm } : undefined)) e.preventDefault();
});

// Space starts and stops whatever is on screen, unless focus is on something
// space already means something to.
document.addEventListener('keydown', (e) => {
  if (e.key !== ' ' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest('button, a, input, select, textarea, [role="slider"], [contenteditable]')) return;
  const c = controllers[active];
  if (c && c.toggle) { e.preventDefault(); c.toggle(); }
});

// Put the visitor's own store first.
const ua = navigator.userAgent;
const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const android = /Android/.test(ua);
const stores = document.querySelector('.stores');
if (stores && android) stores.prepend(stores.querySelector('[data-store="android"]'));
if (stores && ios) stores.prepend(stores.querySelector('[data-store="ios"]'));

window.steady = { controllers, go: api.go };
