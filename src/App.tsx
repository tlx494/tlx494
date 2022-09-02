import React from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import "./city3d";
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

const City = () => {
  return (
    <div
      id="city"
      style={{
        position: "fixed",
        width: "100vw",
        height: "100vh",
      }}
    ></div>
  );
};

const Pipe = () => {
  return <span style={{ color: "#8f8f8f" }}>|</span>;
};

function App() {
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
