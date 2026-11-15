export type ProjectCard = { href: string; name: string; blurb: string; thumb: string; external?: boolean };
export type Section = { id: string; title: string; cards: ProjectCard[] };

// This profile URL carries his personal handle, which the public-identity
// rule otherwise keeps off the site. Daniel accepted it here on 15 November
// 2026 ("musescore link being personal handle is OK ish"): it has been linked
// from the hero since before that rule, and his LinkedIn links the same profile.
// Swap in a handle-free address if MuseScore offers one. Changing it here
// changes every MuseScore link on the homepage.
export const MUSESCORE_URL = "https://musescore.com/tlx494";

// Reclaim, Steady, Just Fits and Talks are static pages served from this same
// origin, so they are ordinary navigations. Down the Line is served on this
// origin too, by a Cloudflare Worker routed at /down-the-line (its builds sit
// behind a password). PianoRoom and MuseScore live on their own domains.
export const SECTIONS: Section[] = [
  {
    id: "games",
    title: "Games",
    cards: [
      // Down the Line first: the bigger, longer game (Daniel, 2026-11-15).
      {
        href: "/down-the-line/",
        name: "Down the Line",
        blurb: "Co-op horror on a steam train across the outback at night.",
        thumb: "/apps/downtheline.webp",
      },
      {
        href: "/just-fits/",
        name: "Just Fits",
        blurb: "Grow a shape, let go, fit the hole. Coming soon.",
        thumb: "/apps/justfits.webp",
      },
    ],
  },
  {
    id: "music",
    title: "Music",
    cards: [
      {
        href: "https://pianoroom.live",
        name: "PianoRoom",
        blurb: "Play piano with a friend online, in real time.",
        thumb: "/apps/pianoroom.webp",
        external: true,
      },
      {
        href: MUSESCORE_URL,
        name: "Compositions",
        blurb: "Original piano pieces, with scores on MuseScore.",
        thumb: "/apps/musescore.webp",
        external: true,
      },
    ],
  },
  {
    id: "apps",
    title: "Apps",
    cards: [
      {
        href: "/steady/",
        name: "Steady",
        blurb: "A calm metronome and tuner for iPhone and Android.",
        thumb: "/apps/steady.webp",
      },
      {
        href: "/reclaim/",
        name: "Reclaim Disk Space",
        blurb: "See what is filling your Mac, and clear it safely.",
        thumb: "/apps/reclaim.webp",
      },
    ],
  },
  {
    id: "talks",
    title: "Talks",
    cards: [
      {
        href: "/talks/",
        name: "SREcon talks",
        blurb: "Monitoring Jira at scale, from SREcon APAC and Americas.",
        thumb: "/apps/talks.webp",
      },
    ],
  },
];
