import fs from "fs";
import path from "path";
import { SECTIONS, MUSESCORE_URL } from "./projects";

const PUBLIC = path.join(__dirname, "..", "public");

// Served by a Cloudflare Worker on this origin, not from public/.
const WORKER_PATHS = ["/down-the-line/"];

const allCards = SECTIONS.flatMap((s) => s.cards);

test("sections come in Daniel's order: apps, music, games, talks", () => {
  expect(SECTIONS.map((s) => s.title)).toEqual(["Apps", "Music", "Games", "Talks"]);
});

test("every section has at least one card and a unique id", () => {
  SECTIONS.forEach((s) => expect(s.cards.length).toBeGreaterThan(0));
  expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length);
});

test("talks is one card that leads to the talks page", () => {
  const talks = SECTIONS.find((s) => s.title === "Talks")!;
  expect(talks.cards).toHaveLength(1);
  expect(talks.cards[0].href).toBe("/talks/");
});

test("music has a MuseScore compositions card", () => {
  const music = SECTIONS.find((s) => s.title === "Music")!;
  expect(music.cards.some((c) => c.href === MUSESCORE_URL)).toBe(true);
  // Never the personal handle on the public site.
  expect(MUSESCORE_URL).not.toContain("tlx494");
});

test("each project appears once", () => {
  expect(new Set(allCards.map((c) => c.href)).size).toBe(allCards.length);
});

test("same-origin cards point at a page that exists in public/ (or the Worker)", () => {
  allCards
    .filter((c) => !c.external)
    .forEach((c) => {
      expect(c.href).toMatch(/^\/[a-z-]+\/$/);
      if (WORKER_PATHS.includes(c.href)) return;
      expect(fs.existsSync(path.join(PUBLIC, c.href, "index.html"))).toBe(true);
    });
});

test("external cards are absolute https links", () => {
  allCards.filter((c) => c.external).forEach((c) => expect(c.href).toMatch(/^https:\/\//));
});

test("every card has a 16:9 thumbnail in public/apps", () => {
  allCards.forEach((c) => {
    expect(c.thumb).toMatch(/^\/apps\/[a-z]+\.webp$/);
    expect(fs.existsSync(path.join(PUBLIC, c.thumb))).toBe(true);
  });
});
