import { $, expect } from "@wdio/globals";

describe("Phase 2 — backup and restore", () => {
  it("restores the selected opaque backup after mutation", async () => {
    await expect($("text=E2E Beta")).toBeDisplayed();
    await $("button=Backup").click();
    const select = $("select[aria-label='Backup selection']");
    await expect(select).toBeDisplayed();
    await expect(select.$("option:not([value=''])")).toExist();
    await $("button[aria-label='Edit E2E Beta']").click();
    const edit = $("input[aria-label='Edit record label']");
    await edit.clearValue(); await edit.setValue("E2E Gamma"); await $("button=Save").click();
    await expect($("text=E2E Gamma")).toBeDisplayed();
    await $("button=Restore").click();
    await expect($("text=Restore complete.")).toBeDisplayed();
    await expect($("text=E2E Beta")).toBeDisplayed();
    await expect($("text=E2E Gamma")).not.toExist();
  });
});
