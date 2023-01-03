import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "@0xsequence/design-system/styles";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
