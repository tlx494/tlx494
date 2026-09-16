import { galleryEdges } from "./galleryEdges";

test("cards that fit do not scroll and show no fades", () => {
  expect(galleryEdges(0, 900, 900)).toEqual({ scrollable: false, atStart: true, atEnd: true });
});

test("sub-pixel overflow from rounding is not treated as scrollable", () => {
  expect(galleryEdges(0, 899.5, 900)).toEqual({ scrollable: false, atStart: true, atEnd: true });
});

test("an overflowing row at rest has more to the right only", () => {
  expect(galleryEdges(0, 358, 880)).toEqual({ scrollable: true, atStart: true, atEnd: false });
});

test("mid-scroll has more on both sides", () => {
  expect(galleryEdges(200, 358, 880)).toEqual({ scrollable: true, atStart: false, atEnd: false });
});

test("scrolled to the end (within a pixel) has more to the left only", () => {
  expect(galleryEdges(521.4, 358, 880)).toEqual({ scrollable: true, atStart: false, atEnd: true });
});
