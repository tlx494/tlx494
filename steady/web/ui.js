// Small UI helpers shared by the tools.

const PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 1.8 13.2 8 3.5 14.2z" fill="currentColor"/></svg>';
const STOP = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor"/></svg>';

export function setStartButton(btn, on, label, idleIcon) {
  btn.setAttribute('aria-pressed', String(on));
  btn.querySelector('.start-label').textContent = label;
  const ico = btn.querySelector('.start-ico');
  if (!btn.dataset.idleIcon) btn.dataset.idleIcon = idleIcon || ico.innerHTML || PLAY;
  ico.innerHTML = on ? STOP : btn.dataset.idleIcon;
}

export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Chips with data-pop open the matching [data-popover]. One open at a time;
 * Escape or a press outside closes it and hands focus back to its chip.
 */
export function setupPopovers(root) {
  let open = null;
  const close = (refocus) => {
    if (!open) return;
    open.pop.hidden = true;
    open.chip.setAttribute('aria-expanded', 'false');
    if (refocus) open.chip.focus();
    open = null;
  };
  root.querySelectorAll('[data-pop]').forEach((chip) => {
    const pop = root.querySelector(`[data-popover="${chip.dataset.pop}"]`);
    chip.addEventListener('click', () => {
      const was = open && open.chip === chip;
      close(false);
      if (was) return;
      pop.hidden = false;
      chip.setAttribute('aria-expanded', 'true');
      open = { chip, pop };
      const first = pop.querySelector('[aria-checked="true"], button:not(:disabled)');
      if (first) first.focus({ preventScroll: true });
    });
  });
  document.addEventListener('pointerdown', (e) => {
    if (open && !open.pop.contains(e.target) && !open.chip.contains(e.target)) close(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) close(true); });
  return { close };
}
