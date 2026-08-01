import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "./design-system/global.css";

const element = document.getElementById("root");

if (!element) {
  throw new Error("Missing #root application mount");
}

createRoot(element).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
