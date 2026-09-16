import React, { useEffect, useRef } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import StartThreeJS from "./city3d";
import "./overlay.css";

const MUSESCORE_URL = "https://musescore.com/tlx494";

const Sep = () => <span className="sep">·</span>;

const MuseLink = ({ children }: { children: React.ReactNode }) => (
  <a className="link" href={MUSESCORE_URL} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

// Same-origin pages served straight from GitHub Pages, so these are ordinary
// navigations rather than routes — no router, and nothing to keep in sync.
const APPS = [
  { href: "/reclaim", name: "Reclaim Disk Space" },
  { href: "/steady", name: "Steady" },
];

function App() {
  const cityRef = useRef<any>(null);

  useEffect(() => {
    StartThreeJS(cityRef);
  }, []);

  return (
    <>
      <CssBaseline />

      {/* the living city fills the viewport */}
      <div
        ref={cityRef}
        id="city"
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
      />

      {/* cinematic depth + legibility */}
      <div className="scene-scrim scene-scrim--top" />
      <div className="scene-scrim scene-scrim--bottom" />
      <div className="scene-vignette" />

      {/* identity */}
      <div className="overlay">
        <div className="hero">
          <div className="name-wrap rise d2">
            <h1 className="name">DANIEL O'DEA</h1>
          </div>
          <div className="rule rise" />
          <p className="creds rise d4">
            software engineer <Sep /> <MuseLink>pianist</MuseLink> <Sep />{" "}
            <MuseLink>composer</MuseLink> <Sep /> artist
          </p>
          <p className="apps rise d5">
            <span className="apps-label">apps</span>
            {APPS.map((app, i) => (
              <React.Fragment key={app.href}>
                {i > 0 && <Sep />}
                <a className="link" href={app.href}>
                  {app.name}
                </a>
              </React.Fragment>
            ))}
          </p>
        </div>

        <div className="cue rise d6">
          <span className="dot" />
          click anywhere to play
        </div>
      </div>
    </>
  );
}

export default App;
