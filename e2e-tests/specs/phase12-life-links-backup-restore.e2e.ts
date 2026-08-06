import { $, browser, expect } from "@wdio/globals";
import {
  LINK_ALPHA, LINK_BETA, LINK_GAMMA, MUTATED_BETA, expectBacklink,
  expectOutgoing, linksPanel, openLifeRoot, openReader,
} from "../support/lifeLinks.js";

describe("Phase 12 — Life link backup and restore", () => {
  it("restores exact directions, metadata, and navigation after live rename/archive/removal", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await openReader(LINK_ALPHA);
    await expectOutgoing(LINK_BETA);

    await $("button[aria-label='Settings']").click();
    await $("button=Backup").click();
    const backups = $("select[aria-label='Backup selection']");
    await backups.waitUntil(async () => (await backups.getValue()) !== "", { timeoutMsg: "Life link backup was not selected." });
    const backupId = await backups.getValue();

    await openLifeRoot();
    await $("button=Edit").click();
    const beta = $(`//button[@data-life-edit-id][.//span[normalize-space()="${LINK_BETA}"]]`);
    await expect(beta).toBeDisplayed();
    await beta.click();
    const inspector = $("aside[aria-label='Life node inspector']");
    const title = inspector.$("//label[normalize-space()='Title']/input");
    await title.clearValue();
    await title.setValue(MUTATED_BETA);
    await inspector.$("button=Save title").click();
    await expect(inspector.$(`h2=Edit ${MUTATED_BETA}`)).toBeDisplayed();
    await inspector.$("button=Archive subtree").click();

    await openReader(LINK_ALPHA);
    const archived = linksPanel().$(`button[aria-label='${MUTATED_BETA} is archived']`);
    await expect(archived).toBeDisabled();
    await expect(linksPanel().$("span=Archived")).toBeDisplayed();
    await linksPanel().$(`button[aria-label='Remove link to ${MUTATED_BETA}']`).click();
    await expect(linksPanel().$("h3=Outgoing links (0)")).toBeDisplayed();

    await $("button[aria-label='Settings']").click();
    await backups.selectByAttribute("value", backupId);
    await $("button=Restore").click();
    await expect($("p=Restore complete.")).toBeDisplayed();

    await openReader(LINK_ALPHA);
    await expectOutgoing(LINK_BETA);
    await expect(linksPanel().$(`button[aria-label='Open ${MUTATED_BETA} in Life Reader']`)).not.toExist();
    await linksPanel().$(`button[aria-label='Open ${LINK_BETA} in Life Reader']`).click();
    await expectBacklink(LINK_ALPHA);
    await expectOutgoing(LINK_GAMMA);
    await expect($("[role='alert']")).not.toExist();
  });
});
