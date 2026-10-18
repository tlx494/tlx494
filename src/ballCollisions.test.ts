import { createBallCollider, Ball } from "./ballCollisions";

const R = 0.18;

function ball(x: number, y: number, z: number, vx = 0, vy = 0, vz = 0, home: unknown = null): Ball {
  return { pos: { x, y, z }, vel: { x: vx, y: vy, z: vz }, home };
}

function gap(a: Ball, b: Ball) {
  const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, dz = b.pos.z - a.pos.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

test("overlapping balls are pushed apart to touching", () => {
  const a = ball(0, 1, 0), b = ball(0.2, 1, 0);
  createBallCollider(10, R, 0.6).resolve([a, b], 1);
  expect(gap(a, b)).toBeCloseTo(2 * R, 5);
  // pushed symmetrically about the midpoint
  expect((a.pos.x + b.pos.x) / 2).toBeCloseTo(0.1, 5);
});

test("a head-on collision bounces both balls back with restitution", () => {
  const a = ball(0, 1, 0, 2, 0, 0), b = ball(0.35, 1, 0, -2, 0, 0);
  createBallCollider(10, R, 0.5).resolve([a, b], 1);
  // equal masses: relative speed 4 reverses to 4 * 0.5 = 2
  expect(a.vel.x).toBeCloseTo(-1, 5);
  expect(b.vel.x).toBeCloseTo(1, 5);
});

test("a slow contact does not bounce, so resting piles stay still", () => {
  const a = ball(0, 1, 0, 0.1, 0, 0), b = ball(0.35, 1, 0, -0.1, 0, 0);
  createBallCollider(10, R, 0.5).resolve([a, b], 1);
  expect(a.vel.x).toBeCloseTo(0, 5);
  expect(b.vel.x).toBeCloseTo(0, 5);
});

test("balls already separating keep their velocity", () => {
  const a = ball(0, 1, 0, -1, 0, 0), b = ball(0.35, 1, 0, 1, 0, 0);
  createBallCollider(10, R, 0.5).resolve([a, b], 1);
  expect(a.vel.x).toBe(-1);
  expect(b.vel.x).toBe(1);
});

test("balls far apart are untouched", () => {
  const a = ball(0, 1, 0, 1, 0, 0), b = ball(3, 1, 0, -1, 0, 0);
  createBallCollider(10, R, 0.5).resolve([a, b], 1);
  expect(a.pos).toEqual({ x: 0, y: 1, z: 0 });
  expect(b.vel).toEqual({ x: -1, y: 0, z: 0 });
});

test("a ball inside a building does not collide with one outside it", () => {
  const building = {};
  const inside = ball(0, 1, 0, 0, 0, 0, building), outside = ball(0.2, 1, 0);
  createBallCollider(10, R, 0.5).resolve([inside, outside], 1);
  expect(inside.pos.x).toBe(0);
  expect(outside.pos.x).toBe(0.2);
});

test("balls in the same building collide with each other", () => {
  const building = {};
  const a = ball(0, 1, 0, 0, 0, 0, building), b = ball(0.2, 1, 0, 0, 0, 0, building);
  createBallCollider(10, R, 0.5).resolve([a, b], 1);
  expect(gap(a, b)).toBeCloseTo(2 * R, 5);
});

test("collisions are found across grid cell boundaries and at negative coordinates", () => {
  const a = ball(-0.01, 0.5, -3.6), b = ball(0.25, 0.5, -3.6);
  createBallCollider(10, R, 0.5).resolve([a, b], 1);
  expect(gap(a, b)).toBeCloseTo(2 * R, 5);
});

test("a crowded heap ends mostly un-overlapped", () => {
  // deterministic pseudo-random heap of 220 balls in a small area
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const heap: Ball[] = [];
  for (let i = 0; i < 220; i++) heap.push(ball(rnd() * 4 - 2, rnd() * 1.5, rnd() * 4 - 2));

  const before = countOverlaps(heap);
  expect(before).toBeGreaterThan(50);
  createBallCollider(220, R, 0.5).resolve(heap, 4);
  expect(countOverlaps(heap, 0.05)).toBeLessThan(before / 5);
});

function countOverlaps(list: Ball[], slack = 0) {
  let n = 0;
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++)
      if (gap(list[i], list[j]) < 2 * R - slack) n++;
  return n;
}
