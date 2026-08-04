import { $, browser, expect } from "@wdio/globals";

describe("Phase 6 — planning persistence", () => {
  it("keeps the reviewed item out after a fresh process while source tasks remain", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await $("button=Overdue").click();
    await expect($("//strong[normalize-space()='E2E Past Review']")).not.toExist();
    await $("button[aria-label='Calendar']").click();
    await expect($("h1=Calendar")).toBeDisplayed();
  });
});
