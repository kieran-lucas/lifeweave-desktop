import { $, browser, expect } from "@wdio/globals";

describe("Phase 4 — portable package fresh-process persistence", () => {
  it("keeps both source and imported documents after native relaunch", async () => {
    await browser.url("http://tauri.localhost"); await expect($("h1=Today")).toBeDisplayed(); await $("button[aria-label='Life System']").click();
    const source = $("//button[contains(.,'Portable Source')]"); const target = $("//button[contains(.,'Portable Target')]");
    await expect(source).toBeDisplayed(); await expect(target).toBeDisplayed(); await target.click();
    await expect($("//*[contains(normalize-space(.),'Portable persisted text')]")).toBeDisplayed(); await expect($("img[alt='Portable image']")).toBeDisplayed();
  });
});
