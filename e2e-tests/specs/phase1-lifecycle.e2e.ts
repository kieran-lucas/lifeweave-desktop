import { $, browser, expect } from "@wdio/globals";

const task = (title: string) => $(`//*[@role="group"][.//strong[normalize-space()="${title}"]]`);

describe("Phase 1 - current task lifecycle", () => {
  it("creates and edits a one-off task in Today", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    const initialWindow = await browser.execute(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      availableWidth: window.screen.availWidth,
      availableHeight: window.screen.availHeight,
    }));
    // A decorated maximized window fills the work-area width while its WebView height excludes the
    // native titlebar. This distinguishes the previous 1280x800 startup without assuming a fixed
    // Windows titlebar size or hiding the native controls.
    expect(Math.abs(initialWindow.innerWidth - initialWindow.availableWidth)).toBeLessThanOrEqual(2);
    expect(initialWindow.innerHeight).toBeGreaterThanOrEqual(initialWindow.availableHeight - 64);

    await $("button=Plan task").click();
    const createDialog = $("[role='dialog'][aria-labelledby='task-composer-heading']");
    await expect(createDialog.$("h2=Plan task")).toBeDisplayed();
    await createDialog.$("//label[.//span[normalize-space()='Title']]/input").setValue("E2E Alpha");
    await createDialog.$("button=Add to day").click();

    const alpha = task("E2E Alpha");
    await expect(alpha).toBeDisplayed();
    await alpha.doubleClick();
    await expect($("h2=Edit task")).toBeDisplayed();
    const editDialog = $("[role='dialog'][aria-labelledby='task-composer-heading']");
    const title = editDialog.$("//label[.//span[normalize-space()='Title']]/input");
    await title.clearValue();
    await title.setValue("E2E Beta");
    await editDialog.$("button=Save changes").click();

    await expect(task("E2E Beta")).toBeDisplayed();
    await expect(task("E2E Alpha")).not.toExist();
    await expect($("[role='alert']")).not.toExist();
  });
});
