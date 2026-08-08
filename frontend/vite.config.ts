import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vanillaExtractPlugin(), react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2022",
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/testing/setup.ts"],
    restoreMocks: true,
    clearMocks: true,
    /*
     * The default 5s per-test budget is comfortable when a file runs alone and is not when the whole
     * suite runs: under thread contention the heaviest files take roughly twice their solo duration,
     * and query-backed screens then exceed it. Raising the budget removes that dependence on machine
     * load. It weakens nothing — a test that genuinely hangs still fails, just later.
     */
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
