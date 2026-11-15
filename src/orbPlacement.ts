// Where the LinkedIn orb goes. The orb is a child of the camera, so its
// position is in view space; the page says where it should appear by laying
// out an empty slot (beside the name), and this turns that slot's rectangle
// on screen into a view-space position and a scale.

export type SlotRect = { left: number; top: number; width: number; height: number };
export type Viewport = { width: number; height: number };
export type OrbCamera = { fovDeg: number; distance: number; radius: number };
export type OrbPlace = { x: number; y: number; scale: number };

export function orbPlacement(slot: SlotRect | null, view: Viewport, cam: OrbCamera): OrbPlace | null {
  if (!slot || slot.width <= 0 || slot.height <= 0 || view.width <= 0 || view.height <= 0) return null;
  const halfH = Math.tan((cam.fovDeg * Math.PI) / 360) * cam.distance;
  const halfW = halfH * (view.width / view.height);
  const ndcX = ((slot.left + slot.width / 2) / view.width) * 2 - 1;
  const ndcY = -(((slot.top + slot.height / 2) / view.height) * 2 - 1);
  const diameter = (slot.height / view.height) * 2 * halfH;
  return { x: ndcX * halfW, y: ndcY * halfH, scale: diameter / (2 * cam.radius) };
}
