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
    sourcemap: "hidden",
    /*
     * A font small enough to inline would be emitted as a `data:` URI, and the production
     * content security policy declares `font-src 'self'` — which does not match `data:`.
     * Inlining a font therefore silently stops it loading, and the glyphs that need it fall
     * back to whatever the system has. Fonts are always emitted as files instead; everything
     * else keeps Vite's default threshold.
     */
    assetsInlineLimit: (filePath: string) => (/\.(woff2?|ttf|otf|eot)$/i.test(filePath) ? false : undefined),
    /*
     * The Task 51 visual prototype is a second HTML entry. It is added to the production build
     * **only** when LIFEWEAVE_PROTOTYPE=1, so an ordinary `pnpm build` emits exactly the chunks it
     * emitted before Task 51 and `pnpm hardening:performance` keeps measuring the real application
     * rather than the application plus a prototype.
     *
     * The dev server serves `/prototype.html` regardless, which is how the prototype is normally
     * viewed; the flag exists for producing a real WebView2 build to capture from.
     */
    ...(process.env.LIFEWEAVE_PROTOTYPE
      ? { rollupOptions: { input: { index: "index.html", prototype: "prototype.html" } } }
      : {}),
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
