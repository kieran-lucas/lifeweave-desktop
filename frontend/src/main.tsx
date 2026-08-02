import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { App } from "./app/App";
import "./design-system/global.css";

const element = document.getElementById("root");

if (!element) {
  throw new Error("Missing #root application mount");
}

const queryClient = new QueryClient();
createRoot(element).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
  </StrictMode>,
);
