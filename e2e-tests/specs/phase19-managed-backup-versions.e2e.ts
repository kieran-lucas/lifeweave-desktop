import { $, browser, expect } from "@wdio/globals";
import { backupRow, createManagedBackup } from "../support/managedBackups.js";

describe("Phase 19 — managed backup versions", () => {
  it("creates and confirms a first-class compatible managed backup restore", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    await $("button[aria-label='Settings']").click();
    await expect($("h1=Settings")).toBeDisplayed();
    await expect($("h2=Backup & restore")).toBeDisplayed();
    await expect($("h3=Retention policy")).toBeDisplayed();
    await expect($("//*[contains(normalize-space(),'12 total')]")).toBeDisplayed();

    const backupId = await createManagedBackup();
    const row = backupRow(backupId);
    await expect(row).toBeDisplayed();
    await expect(row.$("td=Ready")).toBeDisplayed();
    await expect(row.$("td=2")).toBeDisplayed();
    await expect(row.$("td=27")).toBeDisplayed();
    const created = row.$("time");
    await expect(created).toBeDisplayed();
    expect(await created.getAttribute("datetime")).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const restore = row.$("button=Restore");
    await restore.click();
    let dialog = $("[role='dialog'][aria-modal='true']");
    await expect(dialog).toBeDisplayed();
    await expect(dialog.$("h2=Restore managed backup?")).toBeDisplayed();
    await expect(dialog.$("//*[contains(normalize-space(),'Backup format 2')]")).toBeDisplayed();
    await expect(dialog.$("//*[contains(normalize-space(),'schema 27')]")).toBeDisplayed();
    await expect(dialog.$("//*[contains(normalize-space(),'safety snapshot')]")).toBeDisplayed();
    await dialog.$("button=Cancel").click();
    await expect(dialog).not.toExist();
    expect(await browser.execute(() => document.activeElement?.textContent?.trim())).toBe("Restore");

    await restore.click();
    dialog = $("[role='dialog'][aria-modal='true']");
    await dialog.$("button=Restore backup").click();
    await expect($("//p[@aria-live='polite' and normalize-space()='Restore complete.']")).toBeDisplayed();
    await expect(backupRow(backupId)).toBeDisplayed();
    await $("button[aria-label='Today']").click();
    await expect($("h1=Today")).toBeDisplayed();
    await expect($("[role='alert']")).not.toExist();
  });
});
