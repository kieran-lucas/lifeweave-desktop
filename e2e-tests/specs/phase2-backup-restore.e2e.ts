import { $, browser, expect } from "@wdio/globals";
import { createManagedBackup, restoreManagedBackup } from "../support/managedBackups.js";

const task = (title: string) => $(`//*[@role="group"][.//strong[normalize-space()="${title}"]]`);

describe("Phase 2 — task backup and restore", () => {
  it("restores the selected opaque backup after a task mutation", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await expect(task("E2E Beta")).toBeDisplayed();

    await $("button[aria-label='Settings']").click();
    await expect($("h1=Settings")).toBeDisplayed();
    const selectedBackup = await createManagedBackup();

    await $("button[aria-label='Today']").click();
    const beta = task("E2E Beta");
    await beta.doubleClick();
    const title = $("input");
    await title.clearValue();
    await title.setValue("E2E Gamma");
    await $("button=Save changes").click();
    await expect(task("E2E Gamma")).toBeDisplayed();

    await $("button[aria-label='Settings']").click();
    await restoreManagedBackup(selectedBackup);
    await $("button[aria-label='Today']").click();
    await expect($("h1=Today")).toBeDisplayed();
    await expect(task("E2E Beta")).toBeDisplayed();
    await expect(task("E2E Gamma")).not.toExist();
  });
});
