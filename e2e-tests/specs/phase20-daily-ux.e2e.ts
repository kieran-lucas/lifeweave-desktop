import { $, browser, expect } from "@wdio/globals";

const viewportMetrics = () =>
  browser.execute(() => {
    const viewport = document.querySelector<HTMLElement>("[data-app-viewport]");
    if (!viewport) throw new Error("App viewport is missing");
    return {
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
      bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewportOverflow: viewport.scrollWidth - viewport.clientWidth,
    };
  });

describe("Daily interaction UX smoke", () => {
  it("keeps primary destinations, plan editing, and settings navigation usable", async () => {
    await browser.url("http://tauri.localhost");
    await browser.setWindowSize(1000, 700);
    await expect($("h1=Today")).toBeDisplayed();

    let metrics = await viewportMetrics();
    expect(metrics.bodyOverflow).toBeLessThanOrEqual(1);
    expect(metrics.viewportOverflow).toBeLessThanOrEqual(1);

    await $("button[aria-label='Calendar']").click();
    const monthHeading = $("h1#calendar-heading");
    await expect(monthHeading).toBeDisplayed();
    const currentMonth = await monthHeading.getText();
    await $("button[aria-label='Next month']").click();
    await expect(monthHeading).not.toHaveText(currentMonth);
    await $("button[aria-label='Previous month']").click();
    await expect(monthHeading).toHaveText(currentMonth);

    await $("button[aria-label='Plans']").click();
    await expect($("h1=Plans")).toBeDisplayed();
    await $("button=New plan").click();
    await expect($("h1=New plan")).toBeDisplayed();
    await expect($("input[aria-label='Plan title']")).toBeFocused();

    metrics = await viewportMetrics();
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    await expect($("[data-plan-editor-toolbar]")).toBeDisplayed();
    const toolbarPosition = await browser.execute(() => {
      const toolbar = document.querySelector<HTMLElement>("[data-plan-editor-toolbar]");
      if (!toolbar) throw new Error("Plan toolbar is missing");
      return getComputedStyle(toolbar).position;
    });
    expect(toolbarPosition).toBe("static");

    await browser.execute(() => {
      const viewport = document.querySelector<HTMLElement>("[data-app-viewport]");
      viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
    });
    await browser.waitUntil(async () => (await viewportMetrics()).scrollTop > 0);
    await $("button=Cancel").click();
    await expect($("h1=Plans")).toBeDisplayed();

    await $("button[aria-label='Life System']").click();
    await expect($("h1#life-workspace-heading")).toBeDisplayed();

    await $("button[aria-label='Settings']").click();
    await expect($("h1=Settings")).toBeDisplayed();
    await $("button[aria-controls='settings-backup']").click();
    await expect($("#settings-backup")).toBeDisplayed();
    await browser.waitUntil(async () => (await viewportMetrics()).scrollTop > 0);
    const backupTop = await browser.execute(
      () => document.getElementById("settings-backup")?.getBoundingClientRect().top ?? -1,
    );
    expect(backupTop).toBeGreaterThanOrEqual(-1);
    expect(backupTop).toBeLessThan(160);

    metrics = await viewportMetrics();
    expect(metrics.bodyOverflow).toBeLessThanOrEqual(1);
    expect(metrics.viewportOverflow).toBeLessThanOrEqual(1);
    await expect($("[role='alert']")).not.toExist();
  });
});
