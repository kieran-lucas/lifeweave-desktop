import { $, browser, expect } from "@wdio/globals";
import { LINK_ALPHA, LINK_BETA, LINK_GAMMA, expectBacklink, expectOutgoing, linksPanel, openReader } from "../support/lifeLinks.js";

describe("Phase 12 — restored Life links restart", () => {
  it("keeps restored links navigable after another native relaunch", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await openReader(LINK_ALPHA);
    await expectOutgoing(LINK_BETA);
    await linksPanel().$(`button[aria-label='Open ${LINK_BETA} in Life Reader']`).click();
    await expect($("h1=" + LINK_BETA)).toBeFocused();
    await expectBacklink(LINK_ALPHA);
    await expectOutgoing(LINK_GAMMA);
  });
});
