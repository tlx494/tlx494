import React, { useEffect, useRef, useState } from "react";
import { galleryEdges, GalleryEdges } from "./galleryEdges";

type AppCard = { href: string; name: string; blurb: string; thumb: string; external?: boolean };

// Reclaim and Steady are static pages served from this same origin, so they are
// ordinary navigations. PianoRoom lives on its own domain.
const APPS: AppCard[] = [
  {
    href: "/reclaim/",
    name: "Reclaim Disk Space",
    blurb: "See what is filling your Mac, and clear it safely.",
    thumb: "/apps/reclaim.webp",
  },
  {
    href: "/steady/",
    name: "Steady",
    blurb: "A calm metronome and tuner for Android.",
    thumb: "/apps/steady.webp",
  },
  {
    href: "https://pianoroom.live",
    name: "PianoRoom",
    blurb: "Play piano with a friend online, in real time.",
    thumb: "/apps/pianoroom.webp",
    external: true,
  },
];

// The city listens on window for clicks, taps and wheel. Anything that starts
// inside the gallery is the gallery's business: a tap on a card must not also
// drop balls (or hit the orb and open LinkedIn), and a swipe must not steer it.
const SWALLOWED = ["click", "touchstart", "touchmove", "touchend", "wheel"] as const;

export default function AppGallery({ className = "" }: { className?: string }) {
  const rowRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState<GalleryEdges>({ scrollable: false, atStart: true, atEnd: true });

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const update = () => {
      const next = galleryEdges(row.scrollLeft, row.clientWidth, row.scrollWidth);
      setEdges((prev) =>
        prev.scrollable === next.scrollable && prev.atStart === next.atStart && prev.atEnd === next.atEnd
          ? prev
          : next
      );
    };
    const stop = (e: Event) => e.stopPropagation();
    update();
    const ro = new ResizeObserver(update);
    ro.observe(row);
    row.addEventListener("scroll", update, { passive: true });
    SWALLOWED.forEach((t) => row.addEventListener(t, stop, { passive: true }));
    return () => {
      ro.disconnect();
      row.removeEventListener("scroll", update);
      SWALLOWED.forEach((t) => row.removeEventListener(t, stop));
    };
  }, []);

  return (
    <nav className={`gallery ${className}`} aria-label="Apps">
      <p className="gallery-label">apps</p>
      <ul
        ref={rowRef}
        className="gallery-row"
        data-scrollable={edges.scrollable}
        data-more-left={!edges.atStart}
        data-more-right={!edges.atEnd}
        // Focusable only when there is something to scroll, so arrow keys work.
        tabIndex={edges.scrollable ? 0 : undefined}
      >
        {APPS.map((app) => (
          <li key={app.href} className="gallery-item">
            <a
              className="card"
              href={app.href}
              {...(app.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <span className="card-thumb">
                <img src={app.thumb} alt="" width={800} height={450} loading="lazy" decoding="async" />
              </span>
              <span className="card-text">
                <span className="card-name">
                  {app.name}
                  {app.external && (
                    <span className="card-ext" aria-label="(opens in a new tab)">
                      ↗
                    </span>
                  )}
                </span>
                <span className="card-blurb">{app.blurb}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
