import { $, browser, expect } from "@wdio/globals";

const task = (title: string) => $(`//div[@role="listitem"][.//strong[normalize-space()="${title}"]]`);

describe("Phase 1 — current task lifecycle", () => {
  it("creates and edits a one-off task in Today", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    await $("button[aria-label='Create task']").click();
    await expect($("h2=Create task")).toBeDisplayed();
    await $("input").setValue("E2E Alpha");
    await $("select[aria-label='Start hour']").selectByVisibleText("09");
    await $("select[aria-label='Start minute']").selectByVisibleText("00");
    await $("select[aria-label='End hour']").selectByVisibleText("10");
    await $("select[aria-label='End minute']").selectByVisibleText("00");
    await $("button=Save").click();

    const alpha = task("E2E Alpha");
    await expect(alpha).toBeDisplayed();
    await alpha.doubleClick();
    await expect($("h2=Edit task")).toBeDisplayed();
    const title = $("input");
    await title.clearValue();
    await title.setValue("E2E Beta");
    await $("button=Save").click();

    await expect(task("E2E Beta")).toBeDisplayed();
    await expect(task("E2E Alpha")).not.toExist();
    await expect($("[role='alert']")).not.toExist();
  });
});
