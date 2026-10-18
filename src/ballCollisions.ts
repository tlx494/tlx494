// Ball-ball collisions for the homepage's bouncy balls.
//
// All balls are the same size and mass. Pairs are found with a uniform spatial hash
// (cell = one ball diameter), so a frame costs O(balls) instead of O(balls²), and the
// hash lives in preallocated typed arrays so nothing is allocated per frame.

export interface Vec3 { x: number; y: number; z: number }
export interface Ball {
  pos: Vec3;
  vel: Vec3;
  // the building a ball is trapped inside (null when free). Balls only touch balls in
  // the same place: a glass wall separates the inside of a building from the street.
  home: unknown;
}

// below this closing speed a contact is treated as resting: no bounce, so piles settle
// instead of buzzing
const BOUNCE_MIN_SPEED = 0.5;

const BUCKETS = 4096; // power of two, comfortably more than the ball count
const MASK = BUCKETS - 1;

export function createBallCollider(maxBalls: number, radius: number, restitution: number) {
  const diameter = radius * 2;
  const inv = 1 / diameter;
  const head = new Int32Array(BUCKETS);
  const next = new Int32Array(maxBalls);
  const seen = new Int32Array(27);

  const bucketOf = (ix: number, iy: number, iz: number) =>
    (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791)) & MASK;

  function collide(a: Ball, c: Ball) {
    const dx = c.pos.x - a.pos.x, dy = c.pos.y - a.pos.y, dz = c.pos.z - a.pos.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= diameter * diameter || d2 < 1e-10) return;
    const d = Math.sqrt(d2);
    const nx = dx / d, ny = dy / d, nz = dz / d;
    const pen = (diameter - d) * 0.5;
    a.pos.x -= nx * pen; a.pos.y -= ny * pen; a.pos.z -= nz * pen;
    c.pos.x += nx * pen; c.pos.y += ny * pen; c.pos.z += nz * pen;
    const vn = (c.vel.x - a.vel.x) * nx + (c.vel.y - a.vel.y) * ny + (c.vel.z - a.vel.z) * nz;
    if (vn >= 0) return; // already separating
    const e = -vn > BOUNCE_MIN_SPEED ? restitution : 0;
    const imp = -(1 + e) * vn * 0.5;
    a.vel.x -= imp * nx; a.vel.y -= imp * ny; a.vel.z -= imp * nz;
    c.vel.x += imp * nx; c.vel.y += imp * ny; c.vel.z += imp * nz;
  }

  function pass(balls: Ball[]) {
    head.fill(-1);
    const n = Math.min(balls.length, maxBalls);
    // insert balls one at a time, each checking only the balls inserted before it,
    // so every pair is tested once
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      const ix = Math.floor(b.pos.x * inv), iy = Math.floor(b.pos.y * inv), iz = Math.floor(b.pos.z * inv);
      let seenCount = 0;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (let oz = -1; oz <= 1; oz++) {
            const k = bucketOf(ix + ox, iy + oy, iz + oz);
            // two neighbouring cells can share a bucket; visit each bucket once
            let dup = false;
            for (let s = 0; s < seenCount; s++) if (seen[s] === k) { dup = true; break; }
            if (dup) continue;
            seen[seenCount++] = k;
            for (let j = head[k]; j !== -1; j = next[j]) {
              const o = balls[j];
              if (o.home === b.home) collide(o, b);
            }
          }
        }
      }
      const k = bucketOf(ix, iy, iz);
      next[i] = head[k];
      head[k] = i;
    }
  }

  return {
    // more iterations settle tall piles better; each costs one hash rebuild
    resolve(balls: Ball[], iterations: number) {
      for (let it = 0; it < iterations; it++) pass(balls);
    },
  };
}
