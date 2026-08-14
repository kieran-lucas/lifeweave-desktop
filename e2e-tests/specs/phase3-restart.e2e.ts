import { $, browser, expect } from "@wdio/globals";

describe("Phase 3 — restored task persistence", () => {
  it("keeps restored task state after a fresh native relaunch", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await expect($("//*[@role='group'][.//strong[normalize-space()='E2E Beta']]")).toBeDisplayed();
    await expect($("//*[@role='group'][.//strong[normalize-space()='E2E Gamma']]")).not.toExist();
    await expect($("button=Plan task")).toBeEnabled();
  });
});
