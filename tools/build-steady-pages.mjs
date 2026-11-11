#!/usr/bin/env node
// Generates Steady's free web tools and their search landing pages from one
// template:
//
//   /steady/app/                      the web app: four tools, switched in place
//   /steady/metronome/  /steady/tap-tempo/  /steady/tuner/  /steady/polyrhythm/
//   /steady/polyrhythm/<a>-against-<b>/   one page per common ratio
//
// Output is plain static HTML under public/steady/, committed like every other
// page in public/ (CRA copies public/ verbatim, and `npm run deploy` replaces
// gh-pages wholesale, so the generated files must live in git). Re-run after
// editing this file:   node tools/build-steady-pages.mjs
//
// It also rewrites the Steady block of public/sitemap.xml between its markers.

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countGrid, ratioSlug } from '../public/steady/web/lib/poly.js';
import { MIN_A4, MAX_A4 } from '../public/steady/web/lib/pitch.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const SITE = 'https://danielodea.com';
const APP_STORE = 'https://apps.apple.com/app/id6808475583';
const PLAY = 'https://play.google.com/store/apps/details?id=com.danielodea.steady';
const OG_IMAGE = `${SITE}/apps/steady.webp`;
// Bump when web/ assets change, so returning visitors don't run a stale script
// against new markup (GitHub Pages caches for 10 minutes).
const V = '1';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// --------------------------------------------------------------------------
// Content
// --------------------------------------------------------------------------

const TOOLS = [
  { id: 'metronome', label: 'Metronome', short: 'Metronome', path: '/steady/metronome/' },
  { id: 'tap', label: 'Tap tempo', short: 'Tap', path: '/steady/tap-tempo/' },
  { id: 'tuner', label: 'Tuner', short: 'Tuner', path: '/steady/tuner/' },
  { id: 'poly', label: 'Polyrhythm', short: 'Poly', path: '/steady/polyrhythm/' },
];

// One or two true, useful sentences per ratio. The counts ("the 4 lands on
// 1, 4, 7, 10") are computed, not typed, so they cannot be wrong.
const RATIOS = [
  { a: 3, b: 2, note: 'It is a triplet against two straight notes, the most common polyrhythm there is. A popular way to say it is “nice cup of tea”: nice on 1, cup on 3, of on 4, tea on 5.' },
  { a: 2, b: 3, note: 'The same six-slot pattern as 3 against 2 with the roles swapped: the three is now the beat and the two is laid across it. In 3/4, two dotted crotchets (dotted quarter notes) fill the bar, which is the hemiola feel.' },
  { a: 4, b: 3, note: 'The classic mnemonic is “pass the golden butter”, one syllable for each note of the combined rhythm.' },
  { a: 3, b: 4, note: 'In 4/4 this is a bar of half-note triplets: each of the three lasts one and a third beats, so only the first one lands on a beat.' },
  { a: 5, b: 4, note: 'In 4/4 this is a bar of quarter-note quintuplets. Each of the five is four fifths of a beat long, so each one arrives a fifth of a beat further ahead of its beat than the one before.' },
  { a: 4, b: 5, note: 'Four even notes across a bar of 5/4: each lasts one and a quarter beats, so each lands a quarter of a beat further behind its beat than the one before.' },
  { a: 5, b: 3, note: 'The two voices meet only on the downbeat. Learn the five on its own first, evenly across three slow beats, before adding the click for the three.' },
  { a: 5, b: 2, note: 'The landmark to aim for: the second beat falls exactly halfway between the third and fourth notes of the five.' },
  { a: 7, b: 4, note: 'Seven notes over four beats, meeting only on the downbeat. A reliable way in is to play seven even notes per bar with only the downbeat clicking, then bring in the other beats.' },
  { a: 7, b: 8, note: 'Almost even, which is the point: each of the seven falls a further seventh of a beat behind its beat, so the two pulses drift apart and come back together on the next downbeat.' },
  { a: 6, b: 4, note: 'This is 3 against 2 played twice per cycle: in 4/4, a bar of quarter-note triplets. The voices meet on beat 1 and again on beat 3.' },
];

function countSentence(a, b) {
  const g = countGrid(a, b);
  if (g.grid > 30) return `Both voices fit into ${g.grid} even slots per cycle, too many to count aloud, so practise it slowly against the click and listen for the downbeat where they meet.`;
  const list = (xs) => (xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  return `Count ${g.grid} even slots per cycle: the ${a} lands on ${list(g.a)}, the ${b} on ${list(g.b)}. Together they make the rhythm ${g.composite.join(', ')}.`;
}

// --------------------------------------------------------------------------
// Panels (the tools themselves). Markup only; web/*.js brings them to life.
// --------------------------------------------------------------------------

const ICON = {
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 1.8 13.2 8 3.5 14.2z" fill="currentColor"/></svg>',
  mic: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5"/><path d="M3 7.5a5 5 0 0 0 10 0M8 12.5V15"/></svg>',
  swap: '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h12l-3-3M16 13H4l3 3"/></svg>',
  apple: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M10.9 8.5c0-1.4 1.1-2.1 1.2-2.1-.7-1-1.7-1.1-2.1-1.1-.9-.1-1.7.5-2.2.5s-1.2-.5-1.9-.5c-1 0-1.9.6-2.4 1.5-1 1.8-.3 4.4.7 5.9.5.7 1.1 1.5 1.9 1.5.7 0 1-.5 1.9-.5s1.1.5 1.9.5 1.3-.7 1.8-1.4c.6-.8.8-1.6.8-1.6s-1.6-.6-1.6-2.7zM9.5 4.3c.4-.5.7-1.2.6-1.9-.6 0-1.3.4-1.7.9-.4.4-.7 1.1-.6 1.8.7.1 1.3-.3 1.7-.8z"/></svg>',
  playstore: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.2 1.6 11.9 8 3.2 14.4z"/></svg>',
};

// The subdivision glyphs, drawn rather than typed: music symbols are missing
// from many phone fonts and would fall back to boxes.
const SUBDIV = {
  1: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="9" cy="17.5" rx="3.6" ry="2.7" transform="rotate(-20 9 17.5)" fill="currentColor"/><path d="M12.2 16.6V3.5" stroke="currentColor" stroke-width="1.7"/></svg>',
  2: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><ellipse cx="5.6" cy="18" rx="3.2" ry="2.4" transform="rotate(-20 5.6 18)"/><ellipse cx="16.6" cy="18" rx="3.2" ry="2.4" transform="rotate(-20 16.6 18)"/><path d="M8.3 17.2V4.5h11v12.7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.3 4h11v2.8h-11z"/></svg>',
  3: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><ellipse cx="3.9" cy="19" rx="2.6" ry="2" transform="rotate(-20 3.9 19)"/><ellipse cx="11.4" cy="19" rx="2.6" ry="2" transform="rotate(-20 11.4 19)"/><ellipse cx="18.9" cy="19" rx="2.6" ry="2" transform="rotate(-20 18.9 19)"/><path d="M6.1 18.3V8h15v10.3M13.6 18.3V8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6.1 7.5h15v2.4h-15z"/><text x="13.6" y="5.3" font-size="5.6" font-weight="800" text-anchor="middle" font-family="sans-serif">3</text></svg>',
  4: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><g><ellipse cx="3.2" cy="19" rx="2.2" ry="1.7" transform="rotate(-20 3.2 19)"/><ellipse cx="9" cy="19" rx="2.2" ry="1.7" transform="rotate(-20 9 19)"/><ellipse cx="14.8" cy="19" rx="2.2" ry="1.7" transform="rotate(-20 14.8 19)"/><ellipse cx="20.6" cy="19" rx="2.2" ry="1.7" transform="rotate(-20 20.6 19)"/></g><path d="M5 18.4V5h17.4v13.4M10.8 18.4V5M16.6 18.4V5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 4.5h17.4v2.1H5zM5 8.4h17.4v2.1H5z"/></svg>',
};
const SUBDIV_NAMES = { 1: 'Quarter notes, no subdivision', 2: 'Eighth notes', 3: 'Triplets', 4: 'Sixteenth notes' };

function startButton(label, icon = ICON.play) {
  return `<button type="button" class="start" data-role="start" aria-pressed="false"><span class="start-ico">${icon}</span><span class="start-label">${label}</span></button>`;
}

function metronomePanel() {
  const beats = ['accent', 'normal', 'normal', 'normal']
    .map((l, i) => `<button type="button" class="beat ${l}" aria-label="Beat ${i + 1}: ${l}"><i></i></button>`).join('');
  return `
<section class="panel" data-panel="metronome" aria-label="Metronome">
  <div class="stage">
    <div class="beats" role="group" aria-label="Beats in the bar. Tap a beat to cycle accent, normal and silent.">${beats}</div>
    <div class="bpm-wrap">
      <button type="button" class="bpm" aria-label="Tempo 120 BPM. Activate to type a tempo.">120</button>
      <input class="bpm-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" aria-label="Type a tempo from 20 to 300" hidden>
    </div>
    <p class="bpm-label">BPM · <span data-role="marking">Allegro</span></p>
    <div class="ruler" tabindex="0" role="slider" aria-label="Tempo" aria-valuemin="20" aria-valuemax="300" aria-valuenow="120" aria-valuetext="120 BPM, Allegro" aria-orientation="vertical">
      <canvas aria-hidden="true"></canvas><span class="ruler-ind" aria-hidden="true"><i></i><b></b></span>
    </div>
  </div>
  <div class="strip">
    <button type="button" class="chip" data-pop="meter" aria-haspopup="dialog" aria-expanded="false" aria-label="Time signature 4/4">
      <span class="frac" aria-hidden="true"><b data-role="num">4</b><b data-role="den">4</b></span><span class="chip-label">Time</span></button>
    <button type="button" class="chip" data-pop="subdiv" aria-haspopup="dialog" aria-expanded="false" aria-label="Subdivision: ${SUBDIV_NAMES[1]}">
      <span class="chip-ico" data-role="subdiv-ico" aria-hidden="true">${SUBDIV[1]}</span><span class="chip-label">Subdiv</span></button>
    <a class="chip" href="/steady/tap-tempo/" data-goto="tap">
      <span class="chip-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="14" r="2.6" fill="currentColor" stroke="none"/><path d="M7.6 9.6a6.2 6.2 0 0 1 8.8 0M4.6 6.6a10.4 10.4 0 0 1 14.8 0"/></svg></span><span class="chip-label">Tap</span></a>
  </div>
  ${startButton('Start')}
  <div class="pop" data-popover="meter" role="dialog" aria-label="Time signature" hidden>
    <div class="stepper"><span class="stepper-label">Beats</span>
      <button type="button" class="step" data-step="beats" data-dir="-1" aria-label="Fewer beats">−</button>
      <output data-role="beats-out">4</output>
      <button type="button" class="step" data-step="beats" data-dir="1" aria-label="More beats">+</button></div>
    <div class="stepper"><span class="stepper-label">Note</span>
      <button type="button" class="step" data-step="den" data-dir="-1" aria-label="Longer note value">−</button>
      <output data-role="den-out">4</output>
      <button type="button" class="step" data-step="den" data-dir="1" aria-label="Shorter note value">+</button></div>
  </div>
  <div class="pop" data-popover="subdiv" role="dialog" aria-label="Subdivision" hidden>
    <div class="seg" role="radiogroup" aria-label="Subdivision">
      ${[1, 2, 3, 4].map((n) => `<button type="button" role="radio" aria-checked="${n === 1}" data-subdiv="${n}" aria-label="${SUBDIV_NAMES[n]}" title="${SUBDIV_NAMES[n]}">${SUBDIV[n]}</button>`).join('')}
    </div>
  </div>
</section>`;
}

function tapPanel() {
  return `
<section class="panel" data-panel="tap" aria-label="Tap tempo">
  <button type="button" class="tap-pad" aria-describedby="tap-hint">
    <span class="tap-ring" aria-hidden="true"></span>
    <span class="tap-bpm idle" data-role="tap-bpm">–</span>
    <span class="tap-unit">BPM</span>
    <span class="tap-hint" id="tap-hint" data-role="tap-hint">Tap here, or press any key, on the beat</span>
  </button>
  <p class="tap-meta" aria-live="polite" data-role="tap-meta">&nbsp;</p>
  <div class="row2">
    <button type="button" class="ghost" data-role="tap-reset">Reset</button>
    <a class="ghost" href="/steady/metronome/" data-role="tap-send" aria-disabled="true">Use in metronome</a>
  </div>
</section>`;
}

function gaugeSvg() {
  const cx = 160, cy = 186, r = 126;
  const pt = (c, rad) => {
    const t = (c / 50) * (Math.PI / 3);
    return [(cx + rad * Math.sin(t)).toFixed(1), (cy - rad * Math.cos(t)).toFixed(1)];
  };
  let ticks = '';
  for (let c = -50; c <= 50; c += 5) {
    const major = c % 10 === 0;
    const [x1, y1] = pt(c, r);
    const [x2, y2] = pt(c, r - (major ? 14 : 8));
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${major ? 'tk major' : 'tk'}"/>`;
    if (major && c !== 0) {
      const [lx, ly] = pt(c, r + 17);
      ticks += `<text x="${lx}" y="${ly}" class="tl">${c > 0 ? '+' : ''}${c}</text>`;
    }
  }
  const [ax, ay] = pt(-50, r), [bx, by] = pt(50, r);
  const [z1x, z1y] = pt(-5, r - 2), [z2x, z2y] = pt(5, r - 2);
  return `<svg class="gauge" viewBox="0 0 320 202" aria-hidden="true">
    <path class="arc" d="M${ax} ${ay} A${r} ${r} 0 0 1 ${bx} ${by}"/>
    <path class="zone" d="M${cx} ${cy} L${z1x} ${z1y} A${r - 2} ${r - 2} 0 0 1 ${z2x} ${z2y} Z"/>
    ${ticks}
    <g class="needle" data-role="needle"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r + 6}"/><circle cx="${cx}" cy="${cy}" r="8"/></g>
  </svg>`;
}

function tunerPanel() {
  return `
<section class="panel" data-panel="tuner" aria-label="Tuner">
  <div class="tuner-stage stale">
    <p class="note" aria-live="off"><span class="note-name" data-role="note">–</span><span class="note-oct" data-role="octave">&nbsp;</span></p>
    ${gaugeSvg()}
    <p class="readout" data-role="readout">&nbsp;</p>
    <p class="tuner-state" data-role="tuner-state" aria-live="polite">Allow the microphone, then play a single note.</p>
  </div>
  <div class="ref">
    <span class="ref-label" id="ref-label">Reference</span>
    <div class="ref-row" role="group" aria-labelledby="ref-label">
      <button type="button" class="step" data-role="ref-down" aria-label="Lower reference pitch">−</button>
      <output data-role="ref-out" aria-live="polite">A = 440 Hz</output>
      <button type="button" class="step" data-role="ref-up" aria-label="Raise reference pitch">+</button>
    </div>
  </div>
  ${startButton('Start tuner', ICON.mic)}
  <p class="fine">Sound is analysed in your browser. Nothing is recorded or sent anywhere.</p>
</section>`;
}

function polyPanel(a, b) {
  const voice = (v, n, label) => `
    <div class="voice" data-voice="${v}" role="group" aria-label="${label}">
      <button type="button" class="step" data-dir="-1" aria-label="${label}: fewer">−</button>
      <output data-role="${v}-out">${n}</output>
      <button type="button" class="step" data-dir="1" aria-label="${label}: more">+</button>
    </div>`;
  return `
<section class="panel" data-panel="poly" data-a="${a}" data-b="${b}" aria-label="Polyrhythm">
  <div class="ratio">
    ${voice('a', a, 'Notes laid across')}
    <div class="against"><span>against</span>
      <button type="button" class="swap" data-role="swap" aria-label="Swap the two voices">${ICON.swap}</button></div>
    ${voice('b', b, 'Beats')}
  </div>
  <canvas class="poly-canvas" role="img" aria-label="${a} against ${b}"></canvas>
  <div class="voices">
    <button type="button" class="vt va" data-role="mute-a" aria-pressed="true"><i aria-hidden="true"></i><span><span data-role="va-label">${a}</span> · high</span></button>
    <button type="button" class="vt vb" data-role="mute-b" aria-pressed="true"><i aria-hidden="true"></i><span><span data-role="vb-label">${b}</span> · low, the beat</span></button>
  </div>
  <div class="tempo-row">
    <label for="poly-tempo">Tempo</label>
    <input id="poly-tempo" type="range" min="20" max="200" step="1" value="60" data-role="poly-tempo">
    <output for="poly-tempo" data-role="poly-tempo-out">60 BPM</output>
  </div>
  ${startButton('Start')}
</section>`;
}

const PANELS = { metronome: metronomePanel, tap: tapPanel, tuner: tunerPanel };

// --------------------------------------------------------------------------
// Page chrome
// --------------------------------------------------------------------------

function pointer() {
  // Quiet, persistent, never in the way: one line on what only the app can do,
  // and the two store buttons. web/common.js puts the visitor's own store first.
  return `
<aside class="pointer" aria-label="Steady app">
  <p>The <a href="/steady/">Steady app</a> does what a browser can’t: it keeps playing with the screen off, keeps your practice history and streaks, saves setlists, has a gap trainer and works offline.</p>
  <div class="stores">
    <a class="store" data-store="ios" href="${APP_STORE}">${ICON.apple}App Store</a>
    <a class="store" data-store="android" href="${PLAY}">${ICON.playstore}Google Play</a>
  </div>
</aside>`;
}

function header(active, mode) {
  const tabs = TOOLS.map((t) => {
    const cur = t.id === active ? ' aria-current="page"' : '';
    const href = mode === 'app' ? `#${t.id === 'poly' ? 'polyrhythm' : t.id}` : t.path;
    return `<a href="${href}" data-tool="${t.id}"${cur}><span class="t-long">${t.label}</span><span class="t-short" aria-hidden="true">${t.short}</span></a>`;
  }).join('');
  return `
<header class="top">
  <a class="brand" href="/steady/" aria-label="Steady, metronome and tuner app">
    <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Steady</a>
  <nav class="tabs" aria-label="Tools">${tabs}</nav>
</header>`;
}

function footer() {
  return `
<footer class="foot">
  <span class="links">
    <a href="/steady/">Steady app</a><span class="sep">·</span>
    <a href="/steady-support/">Support</a><span class="sep">·</span>
    <a href="/steady-privacy">Privacy</a><span class="sep">·</span>
    <a href="/">danielodea.com</a>
  </span>
  <span class="made">Free, no ads, no tracking. Made by Daniel O'Dea.</span>
</footer>`;
}

function jsonLd({ name, url, description }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    url,
    description,
    applicationCategory: 'MusicApplication',
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript and the Web Audio API',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' },
    author: { '@type': 'Person', name: "Daniel O'Dea", url: `${SITE}/` },
    image: OG_IMAGE,
  };
  // No aggregateRating, deliberately: inventing one is a lie and a rich-results violation.
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function page({ path, title, description, ogTitle, h1, tool, mode = 'page', body = '', ld, poly }) {
  const url = SITE + path;
  let panels;
  if (mode === 'app') panels = metronomePanel() + tapPanel() + tunerPanel() + polyPanel(3, 2);
  else if (tool === 'poly') panels = polyPanel(poly.a, poly.b);
  else panels = PANELS[tool]();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#0F1115">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="danielodea.com">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(ogTitle || title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="800">
<meta property="og:image:height" content="450">
<meta property="og:image:alt" content="Steady, a metronome and tuner">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ogTitle || title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${OG_IMAGE}">
${jsonLd({ name: ld, url, description })}
<link rel="preload" href="/steady/manrope.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/steady/web/steady.css?v=${V}">
<script type="module" src="/steady/web/app.js?v=${V}"></script>
</head>
<body data-mode="${mode}" data-tool="${tool}">
<!-- Generated by tools/build-steady-pages.mjs. Edit the generator, not this file. -->
${header(tool, mode)}
<main class="main">
  <h1 class="tool-title">${esc(h1)}</h1>
  <div class="toolwrap">${panels}
  <noscript><p class="fine">This tool needs JavaScript to make sound.</p></noscript>
  </div>
  ${pointer()}
  ${body ? `<article class="about">${body}</article>` : ''}
</main>
${footer()}
</body>
</html>
`;
}

const toolLinks = (except) => `<p class="more">More free tools: ${TOOLS.filter((t) => t.id !== except)
  .map((t) => `<a href="${t.path}">${t.id === 'tap' ? 'tap tempo' : t.label.toLowerCase()}</a>`).join(' · ')}</p>`;

const ratioLinks = (except) => `<nav class="ratios" aria-label="Polyrhythms"><h2>Common polyrhythms</h2><ul>${RATIOS
  .map(({ a, b }) => {
    const slug = ratioSlug(a, b);
    return slug === except ? `<li><span aria-current="page">${a} against ${b}</span></li>` : `<li><a href="/steady/polyrhythm/${slug}/">${a} against ${b}</a></li>`;
  }).join('')}</ul></nav>`;

// --------------------------------------------------------------------------
// The pages
// --------------------------------------------------------------------------

const pages = [];

pages.push({
  path: '/steady/app/', tool: 'metronome', mode: 'app',
  title: 'Steady web app: metronome, tap tempo, tuner and polyrhythms',
  description: 'Steady in your browser: a metronome, a tap tempo BPM counter, a chromatic tuner and a polyrhythm player. Free, no ads, no sign-up.',
  h1: 'Steady, in your browser', ld: 'Steady web app',
});

pages.push({
  path: '/steady/metronome/', tool: 'metronome',
  title: 'Online Metronome: free, accurate, any time signature | Steady',
  ogTitle: 'Online metronome',
  description: 'A free online metronome from 20 to 300 BPM, with any time signature, accents and audible subdivisions. Timed on the audio clock. No ads, no sign-up.',
  h1: 'Online metronome', ld: 'Steady online metronome',
  body: `<h2>How to use it</h2>
<p>Drag the ruler on the right, or tap the number and type a tempo, then press Start or the space bar. Tap any beat to cycle it between accented, normal and silent. <b>Time</b> sets the meter and <b>Subdiv</b> adds eighths, triplets or sixteenths you can hear.</p>
<p>Clicks are scheduled on the browser’s audio clock a fraction of a second ahead, not fired by a timer, so a busy page or a slow phone does not push them late. Compound meters such as 6/8 and 12/8 accent each group of three by default.</p>
${toolLinks('metronome')}`,
});

pages.push({
  path: '/steady/tap-tempo/', tool: 'tap',
  title: 'Tap Tempo: free BPM counter | Steady',
  ogTitle: 'Tap tempo BPM counter',
  description: 'Tap the screen or any key along with a song to find its tempo in beats per minute. A free BPM counter that ignores stray taps, then sends the tempo to a metronome.',
  h1: 'Tap tempo and BPM counter', ld: 'Steady tap tempo',
  body: `<h2>How it counts</h2>
<p>Tap along with the beat, on the pad or on any key. The reading is the average of your last eight taps, so it settles after a few beats. Pause for two seconds and it starts a fresh count; a tap far off the beat restarts from the tap before it rather than dragging the average.</p>
<p>When the number holds steady, <b>Use in metronome</b> carries it across.</p>
${toolLinks('tap')}`,
});

pages.push({
  path: '/steady/tuner/', tool: 'tuner',
  title: 'Online Tuner: chromatic tuner with your microphone | Steady',
  ogTitle: 'Online chromatic tuner',
  description: `A free chromatic tuner that listens through your microphone: note, octave and cents in real time, with A4 adjustable from ${MIN_A4} to ${MAX_A4} Hz. Audio never leaves your device.`,
  h1: 'Online chromatic tuner', ld: 'Steady online tuner',
  body: `<h2>How to tune</h2>
<p>Press Start tuner and allow the microphone, then play one note at a time. The needle shows how many cents (hundredths of a semitone) you are sharp or flat; within five cents either way the note is in tune.</p>
<p>The reference defaults to A = 440 Hz. Set 415 Hz for Baroque pitch, or 442 to 443 Hz to match many European orchestras. The sound is analysed inside your browser and is never recorded or sent anywhere.</p>
${toolLinks('tuner')}`,
});

pages.push({
  path: '/steady/polyrhythm/', tool: 'poly', poly: { a: 3, b: 2 },
  title: 'Polyrhythm Player: hear and see any ratio | Steady',
  ogTitle: 'Polyrhythm player',
  description: 'Hear and see any polyrhythm from 2 to 9 against 2 to 9: two distinct clicks, a moving playhead and the count to say out loud. Free in your browser.',
  h1: 'Polyrhythm player', ld: 'Steady polyrhythm player',
  body: `<h2>What you are hearing</h2>
<p>A polyrhythm sets two even pulses against each other in the same span of time: 3 against 2 means three evenly spaced notes in the time of two beats. Choose any pair from 2 to 9. The high click plays the first number, the low click is the beat the tempo counts, and either can be muted to practise one hand against the other.</p>
<p>The numbers under the lanes are the shared count: the smallest number of equal slots both voices fit into (six for 3 against 2, twelve for 4 against 3). Counting those slots slowly, then speeding up, is the most reliable way to learn a new ratio.</p>
${ratioLinks(null)}
${toolLinks('poly')}`,
});

for (const r of RATIOS) {
  const slug = ratioSlug(r.a, r.b);
  pages.push({
    path: `/steady/polyrhythm/${slug}/`, tool: 'poly', poly: r,
    title: `${r.a} Against ${r.b} Polyrhythm (${r.a}:${r.b}): hear it, see it, count it | Steady`,
    ogTitle: `${r.a} against ${r.b} polyrhythm`,
    description: `Play ${r.a} against ${r.b} (${r.a}:${r.b}) in your browser: ${r.a} even notes over ${r.b} beats, with two clicks, a moving playhead and the count. Free, no sign-up.`,
    h1: `${r.a} against ${r.b} polyrhythm`, ld: `${r.a} against ${r.b} polyrhythm player`,
    body: `<h2>How to count ${r.a} against ${r.b}</h2>
<p>${countSentence(r.a, r.b)}</p>
<p>${r.note}</p>
<p>Press Start to hear it, mute either voice to practise one part against the other, and change the numbers above to try any other ratio.</p>
${ratioLinks(slug)}
${toolLinks('poly')}`,
  });
}

// --------------------------------------------------------------------------
// Write
// --------------------------------------------------------------------------

for (const p of pages) {
  const file = join(PUBLIC, p.path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page(p));
}

// Sitemap: replace the generated block, leave every hand-written entry alone.
const SM = join(PUBLIC, 'sitemap.xml');
const BEGIN = '  <!-- steady-web:begin (generated by tools/build-steady-pages.mjs) -->';
const END = '  <!-- steady-web:end -->';
let sm = readFileSync(SM, 'utf8');
const block = [BEGIN, ...pages.map((p) => `  <url>
    <loc>${SITE}${p.path}</loc>
    <changefreq>monthly</changefreq>
    <priority>${p.path.split('/').length > 4 ? '0.6' : '0.8'}</priority>
  </url>`), END].join('\n');
if (sm.includes(BEGIN)) sm = sm.replace(new RegExp(`${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END}`), block);
else sm = sm.replace('</urlset>', `${block}\n</urlset>`);
writeFileSync(SM, sm);

console.log(`wrote ${pages.length} pages + sitemap`);
for (const p of pages) console.log('  ' + p.path);
