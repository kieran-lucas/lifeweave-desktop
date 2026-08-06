import { $, browser, expect } from "@wdio/globals";
import { LINK_ALPHA, LINK_BETA, expectBacklink, expectOutgoing, linksPanel, openReader } from "../support/lifeLinks.js";

describe("Phase 11 — explicit Life links restart", () => {
  it("reopens the exact outgoing and backlink directions", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await openReader(LINK_ALPHA);
    await expectOutgoing(LINK_BETA);
    await linksPanel().$(`button[aria-label='Open ${LINK_BETA} in Life Reader']`).click();
    await expect($("h1=" + LINK_BETA)).toBeFocused();
    await expectBacklink(LINK_ALPHA);
    await $("button*=Back to Life Browse").click();
    await expect($("h1=" + LINK_ALPHA)).toBeDisplayed();
  });
});
