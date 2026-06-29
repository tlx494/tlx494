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
          <p className="eyebrow rise d1">con brio</p>
          <div className="name-wrap rise d2">
            <h1 className="name">DANIEL O'DEA</h1>
          </div>
          <div className="rule rise" />
          <p className="creds rise d4">
            software engineer <Sep /> <MuseLink>pianist</MuseLink> <Sep />{" "}
            <MuseLink>composer</MuseLink> <Sep /> artist <Sep /> writer
          </p>
        </div>

        <div className="cue rise d5">
          <span className="dot" />
          click anywhere to play
        </div>
      </div>
    </>
  );
}

export default App;
