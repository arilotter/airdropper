import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "@0xsequence/design-system/styles";
import { ThemeProvider } from "@0xsequence/design-system";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
