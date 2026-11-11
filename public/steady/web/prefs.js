// Remembers a visitor's tempo, meter and reference pitch in this browser only
// (localStorage, never sent anywhere). Storage can be missing or throw in a
// private window; everything works without it.

const KEY = 'steady-web';

export function loadPrefs() {
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { data = {}; }
  return {
    get: (k, d) => (data[k] === undefined ? d : data[k]),
    set: (k, v) => {
      data[k] = v;
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* fine */ }
    },
  };
}
