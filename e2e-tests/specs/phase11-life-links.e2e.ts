import { $, browser, expect } from "@wdio/globals";
import {
  LINK_ALPHA, LINK_BETA, LINK_GAMMA, addLink, establishLinkLeaves,
  expectBacklink, expectOutgoing, linksPanel, openReader,
} from "../support/lifeLinks.js";

describe("Phase 11 — explicit Life links", () => {
  it("adds, navigates, removes, and recreates directed links through the Reader UI", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await establishLinkLeaves();

    await openReader(LINK_ALPHA);
    await addLink(LINK_BETA);
    await expectOutgoing(LINK_BETA);
    await linksPanel().$(`button[aria-label='Open ${LINK_BETA} in Life Reader']`).click();
    await expect($("h1=" + LINK_BETA)).toBeFocused();
    await expectBacklink(LINK_ALPHA);

    await addLink(LINK_GAMMA);
    await linksPanel().$(`button[aria-label='Open ${LINK_GAMMA} in Life Reader']`).click();
    await expect($("h1=" + LINK_GAMMA)).toBeFocused();
    await expectBacklink(LINK_BETA);
    await $("button*=Back to Life Browse").click();
    await expect($("h1=" + LINK_BETA)).toBeDisplayed();
    await $("button*=Back to Life Browse").click();
    await expect($("h1=" + LINK_ALPHA)).toBeDisplayed();

    await linksPanel().$(`button[aria-label='Remove link to ${LINK_BETA}']`).click();
    await expect(linksPanel().$("h3=Outgoing links (0)")).toBeDisplayed();
    await addLink(LINK_BETA);
    await expectOutgoing(LINK_BETA);
    await expect($("[role='alert']")).not.toExist();
  });
});
