export type GalleryEdges = { scrollable: boolean; atStart: boolean; atEnd: boolean };

// Layout sizes are fractional, so allow a pixel of slack: a row that fits
// must never be treated as scrollable (no fades, nothing to hint at).
const SLACK = 1;

export function galleryEdges(scrollLeft: number, clientWidth: number, scrollWidth: number): GalleryEdges {
  const scrollable = scrollWidth - clientWidth > SLACK;
  return {
    scrollable,
    atStart: !scrollable || scrollLeft <= SLACK,
    atEnd: !scrollable || scrollLeft + clientWidth >= scrollWidth - SLACK,
  };
}
