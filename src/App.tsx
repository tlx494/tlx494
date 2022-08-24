import React from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import "./city3d";
import { fontSize } from "@mui/system";

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
          }}
        >
          DANIEL O'DEA
        </h1>
      </div>
    </ThemeProvider>
  );
}

export default App;
