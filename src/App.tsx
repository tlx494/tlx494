import React, { useEffect, useRef, useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import StartThreeJS from "./city3d";
import { fontSize } from "@mui/system";
import { Box, Icon, Link } from "@mui/material";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

const theme = createTheme({
  typography: {
    fontFamily: [
      "Montserrat",
      "Nunito",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ].join(","),
  },
});

const Pipe = () => {
  return <span style={{ color: "#8f8f8f" }}>|</span>;
};

function App() {
  const cityRef = useRef<any>();
  useEffect(() => {
    if (cityRef != null) {
      StartThreeJS(cityRef);
    }
  }, [cityRef]);
  const City = () => {
    return (
      <div
        ref={cityRef}
        id="city"
        style={{
          position: "fixed",
          width: "100vw",
          height: "100vh",
        }}
      ></div>
    );
  };
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <City />
      <div
        style={{
          position: "fixed",
          width: "100vw",
          height: "100vw",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#fff",
            fontSize: "3em",
            marginTop: "20%",
            fontFamily: "Dune",
          }}
        >
          DANIEL O'DEA
        </h1>
        <Box
          sx={{
            textAlign: "center",
            color: "white",
          }}
        >
          software engineer <Pipe /> pianist <Pipe /> composer <Pipe /> artist{" "}
          <Pipe /> writer
          <LinkedInIcon fontSize="large" />
        </Box>
      </div>
    </ThemeProvider>
  );
}

export default App;
