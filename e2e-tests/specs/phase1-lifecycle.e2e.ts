import { $, browser, expect } from "@wdio/globals";

describe("Phase 1 — native lifecycle", () => {
  it("creates, edits, archives and restores a record", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Foundation Records")).toBeDisplayed();
    await expect($("text=No records yet. Add one above.")).toBeDisplayed();
    await $("input[aria-label='New record label']").setValue("E2E Alpha");
    await $("button=Add").click();
    await expect($("text=E2E Alpha")).toBeDisplayed();
    await $("button[aria-label='Edit E2E Alpha']").click();
    const edit = $("input[aria-label='Edit record label']");
    await edit.clearValue(); await edit.setValue("E2E Beta"); await $("button=Save").click();
    await expect($("text=E2E Beta")).toBeDisplayed();
    await $("button[aria-label='Archive E2E Beta']").click();
    await expect($("ul[aria-label='Archived foundation records']")).toBeDisplayed();
    await $("button[aria-label='Restore E2E Beta']").click();
    await expect($("ul[aria-label='Active foundation records']")).toBeDisplayed();
    await expect($("text=E2E Beta")).toBeDisplayed();
  });
});
