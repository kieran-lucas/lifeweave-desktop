import { $, browser, expect } from "@wdio/globals";

const task = (title: string) => $(`//div[@role="listitem"][.//strong[normalize-space()="${title}"]]`);

describe("Phase 2 — task backup and restore", () => {
  it("restores the selected opaque backup after a task mutation", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await expect(task("E2E Beta")).toBeDisplayed();

    await $("button[aria-label='Settings']").click();
    await expect($("h1=Settings")).toBeDisplayed();
    await $("button=Backup").click();
    const backup = $("select[aria-label='Backup selection']");
    await backup.waitUntil(async () => (await backup.getValue()) !== "", {
      timeoutMsg: "Backup selection was not populated after creation.",
    });
    const selectedBackup = await backup.getValue();
    await expect(selectedBackup).not.toBe("");

    await $("button[aria-label='Today']").click();
    const beta = task("E2E Beta");
    await beta.doubleClick();
    const title = $("input");
    await title.clearValue();
    await title.setValue("E2E Gamma");
    await $("button=Save").click();
    await expect(task("E2E Gamma")).toBeDisplayed();

    await $("button[aria-label='Settings']").click();
    const restoreBackup = $("select[aria-label='Backup selection']");
    await restoreBackup.selectByAttribute("value", selectedBackup);
    await expect(restoreBackup).toHaveValue(selectedBackup);
    await $("button=Restore").click();
    await expect($("//p[@aria-live='polite' and normalize-space()='Restore complete.']")).toBeDisplayed();
    await $("button[aria-label='Today']").click();
    await expect($("h1=Today")).toBeDisplayed();
    await expect(task("E2E Beta")).toBeDisplayed();
    await expect(task("E2E Gamma")).not.toExist();
  });
});
