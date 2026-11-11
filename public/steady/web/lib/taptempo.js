// Tap tempo: BPM from the most recent taps.
//
// Two things make a naive average useless in practice. A pause (the player
// stopped, then starts tapping a new song) must start a fresh measurement, and
// a tap far off the running interval (a change of tempo, or a fumble) must not
// drag the average for the next eight taps. Both restart the count; an outlier
// restarts from the tap before it, so the new tempo reads after one interval.

export class TapTempo {
  constructor({ maxTaps = 8, resetAfterMs = 2000, outlierRatio = 0.35 } = {}) {
    this.maxTaps = maxTaps;
    this.resetAfterMs = resetAfterMs;
    this.outlierRatio = outlierRatio;
    this.reset();
  }

  reset() {
    this.times = [];
    this.bpm = null;
  }

  get count() { return this.times.length; }

  /** Register a tap at `ms` (any monotonic clock). Returns the BPM or null. */
  tap(ms) {
    const last = this.times[this.times.length - 1];
    if (last !== undefined) {
      const gap = ms - last;
      if (gap <= 0) return this.bpm;
      if (gap > this.resetAfterMs) {
        this.times = [];
      } else if (this.times.length >= 2) {
        const mean = this._meanInterval();
        if (Math.abs(gap - mean) / mean > this.outlierRatio) this.times = [last];
      }
    }
    this.times.push(ms);
    if (this.times.length > this.maxTaps) this.times.shift();
    this.bpm = this.times.length < 2 ? null : Math.round((600000 / this._meanInterval())) / 10;
    return this.bpm;
  }

  _meanInterval() {
    const t = this.times;
    return (t[t.length - 1] - t[0]) / (t.length - 1);
  }
}
