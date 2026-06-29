import React, { useEffect, useRef } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import StartThreeJS from "./city3d";
import { Box, Link } from "@mui/material";

const theme = createTheme({
  typography: {
    fontFamily: ["Montserrat", "Nunito", "Roboto", "Helvetica Neue", "Arial", "sans-serif"].join(
      ","
    ),
  },
});

const MUSESCORE_URL = "https://musescore.com/tlx494";

// strong shadow so the white text stays readable over any sky colour
const SHADOW = "0 2px 16px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.85)";

const Pipe = () => <span style={{ color: "rgba(255,255,255,0.5)" }}> | </span>;

const MuseLink = ({ children }: { children: React.ReactNode }) => (
  <Link
    href={MUSESCORE_URL}
    target="_blank"
    rel="noopener noreferrer"
    underline="hover"
    sx={{ color: "inherit", cursor: "pointer", pointerEvents: "auto" }}
  >
    {children}
  </Link>
);

function App() {
  const cityRef = useRef<any>(null);

  useEffect(() => {
    StartThreeJS(cityRef);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* the 3D city fills the viewport */}
      <div
        ref={cityRef}
        id="city"
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
      />

      {/* name + creds, front and centre — pointer-events pass through so clicks drop balls */}
      <div
        style={{
          position: "fixed",
          top: "9%",
          left: 0,
          right: 0,
          textAlign: "center",
          color: "#fff",
          textShadow: SHADOW,
          pointerEvents: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <h1 style={{ margin: 0, fontFamily: "Dune", fontSize: "3em", letterSpacing: 2 }}>
          DANIEL O'DEA
        </h1>
        <Box sx={{ mt: 1, fontSize: "1rem", letterSpacing: 0.3 }}>
          software engineer <Pipe /> <MuseLink>pianist</MuseLink> <Pipe />{" "}
          <MuseLink>composer</MuseLink> <Pipe /> artist <Pipe /> writer
        </Box>
        <Box sx={{ mt: 3, fontSize: "0.8rem", opacity: 0.65 }}>
          click anywhere to drop bouncy balls · the orb is my LinkedIn
        </Box>
      </div>
    </ThemeProvider>
  );
}

export default App;
