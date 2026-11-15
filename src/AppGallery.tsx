import React, { useEffect, useRef } from "react";
import { SECTIONS } from "./projects";

// The city listens on window for clicks, taps and wheel. Anything that starts
// inside the gallery is the gallery's business: a tap on a card or a heading
// must not also drop balls (or hit the orb and open LinkedIn), and a swipe must
// not steer it. Listeners are passive, so the page itself still scrolls.
// The gallery box is pointer-events: none and only the sections take pointer
// events, so the empty space between sections stays part of the city.
const SWALLOWED = ["click", "touchstart", "touchmove", "touchend", "wheel"] as const;

export default function AppGallery({ className = "" }: { className?: string }) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const stop = (e: Event) => e.stopPropagation();
    SWALLOWED.forEach((t) => nav.addEventListener(t, stop, { passive: true }));
    return () => SWALLOWED.forEach((t) => nav.removeEventListener(t, stop));
  }, []);

  return (
    <nav ref={navRef} className={`gallery ${className}`} aria-label="Projects">
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          className="gallery-section"
          aria-labelledby={`gallery-${section.id}`}
          style={{ "--n": section.cards.length } as React.CSSProperties}
        >
          <h2 id={`gallery-${section.id}`} className="gallery-label">
            {section.title}
          </h2>
          <ul className="gallery-grid">
            {section.cards.map((card) => (
              <li key={card.href} className="gallery-item">
                <a
                  className="card"
                  href={card.href}
                  {...(card.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  <span className="card-thumb">
                    <img src={card.thumb} alt="" width={800} height={450} loading="lazy" decoding="async" />
                  </span>
                  <span className="card-text">
                    <span className="card-name">
                      {card.name}
                      {card.external && (
                        <span className="card-ext" aria-label="(opens in a new tab)">
                          ↗
                        </span>
                      )}
                    </span>
                    <span className="card-blurb">{card.blurb}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
