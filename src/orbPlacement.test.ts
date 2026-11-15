import { orbPlacement, OrbPlace, SlotRect } from "./orbPlacement";

const view = { width: 1000, height: 500 };
// 90 degrees of vertical field of view at distance 5: the view is 10 units tall, 20 wide.
const cam = { fovDeg: 90, distance: 5, radius: 0.16 };
// A slot that is laid out always has a place; this fails the test if it does not.
function placed(slot: SlotRect): OrbPlace {
  const p = orbPlacement(slot, view, cam);
  if (!p) throw new Error("expected a placement");
  return p;
}

test("a slot in the middle of the screen puts the orb on the camera's axis", () => {
  const p = placed({ left: 450, top: 200, width: 100, height: 100 });
  expect(p.x).toBeCloseTo(0);
  expect(p.y).toBeCloseTo(0);
});

test("right and up on screen are positive x and y in view space", () => {
  const p = placed({ left: 900, top: 0, width: 100, height: 100 });
  // slot centre at (950, 50): 90% of the way to the right edge, 80% of the way to the top
  expect(p.x).toBeCloseTo(0.9 * 10);
  expect(p.y).toBeCloseTo(0.8 * 5);
});

test("the orb is scaled so its diameter matches the slot's height on screen", () => {
  // 100px of a 500px tall, 10 unit tall view is 2 units; the orb's own diameter is 0.32
  const p = placed({ left: 0, top: 0, width: 100, height: 100 });
  expect(p.scale).toBeCloseTo(2 / 0.32);
});

test("no slot, or one that has not been laid out, gives nothing to place", () => {
  expect(orbPlacement(null, view, cam)).toBeNull();
  expect(orbPlacement({ left: 0, top: 0, width: 0, height: 0 }, view, cam)).toBeNull();
  expect(orbPlacement({ left: 0, top: 0, width: 50, height: 50 }, { width: 0, height: 0 }, cam)).toBeNull();
});
