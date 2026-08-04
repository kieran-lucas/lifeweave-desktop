import type { Options } from "@wdio/types";

export const config: Options.Testrunner = {
  runner: "local",
  specs: ["./specs/**/*.e2e.ts"],
  maxInstances: 1,
  logLevel: "info",
  framework: "mocha",
  reporters: ["spec"],
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
