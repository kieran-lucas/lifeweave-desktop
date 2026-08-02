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
    "tauri:options": { application: "../src-tauri/target/debug/lifeweave-desktop.exe" },
  }],
  mochaOpts: { timeout: 120_000 },
};
