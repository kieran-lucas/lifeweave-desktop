import { $, browser, expect } from "@wdio/globals";

describe("Task 36 — Focus Plan fresh-process persistence", () => {
  it("restores the edited plan and its phase after application restart", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    await $("button[aria-label='Plans']").click();
    await expect($("h1=Plans")).toBeDisplayed();

    const plan = $("button*=E2E Focus Plan Persisted");
    await expect(plan).toBeDisplayed();
    await plan.click();

    await expect($("label=Title").$("input")).toHaveValue("E2E Focus Plan Persisted");
    await expect($("label=Outcome").$("textarea")).toHaveValue("Persistent plan outcome");
    await expect($("label=Lifecycle").$("select")).toHaveValue("active");
    await expect($("input[aria-label='Phase 1 title']")).toHaveValue("Foundation");
    await expect($("[role='alert']")).not.toExist();
  });
});
