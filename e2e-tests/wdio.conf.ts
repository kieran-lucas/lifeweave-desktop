import type { Options } from "@wdio/types";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const e2eRoot = dirname(fileURLToPath(import.meta.url));

export const config: Options.Testrunner = {
  runner: "local",
  specs: ["./specs/**/*.e2e.ts"],
  maxInstances: 1,
  logLevel: "info",
  framework: "mocha",
  reporters: ["spec"],
  services: [[
    "visual",
    {
      baselineFolder: join(e2eRoot, "visual-baselines", "windows-webview2"),
      screenshotPath: join(e2eRoot, "..", "target", "visual-regression"),
      formatImageName: "{tag}-{width}x{height}",
      autoSaveBaseline: process.env.LIFEWEAVE_ACCEPT_VISUAL_BASELINES === "1",
      alwaysSaveActualImage: true,
      clearRuntimeFolder: true,
      disableBlinkingCursor: true,
      disableCSSAnimation: true,
      enableLegacyScreenshotMethod: true,
      hideScrollBars: false,
      savePerInstance: false,
      waitForFontsLoaded: true,
    },
  ]],
  hostname: "127.0.0.1",
  port: 4444,
  path: "/",
  capabilities: [{
    browserName: "wry",
    "wdio:enforceWebDriverClassic": true,
    "tauri:options": { application: process.env.LIFEWEAVE_E2E_BINARY ?? "" },
  }],
  mochaOpts: { timeout: 120_000 },
};
