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

    await expect($("//label[normalize-space()='Title']/input")).toHaveValue("E2E Focus Plan Persisted");
    // `text()`, not the element string-value: after a restart the textarea carries its persisted
    // content, so `normalize-space()` on the wrapping label reads "OutcomePersistent plan outcome"
    // and never matches. The Lifecycle selector below already avoids this for the same reason.
    await expect($("//label[normalize-space(text())='Outcome']/textarea")).toHaveValue("Persistent plan outcome");
    await expect($("//label[normalize-space(text())='Lifecycle']/select")).toHaveValue("active");
    await expect($("input[aria-label='Phase 1 title']")).toHaveValue("Foundation");
    await expect($("[role='alert']")).not.toExist();
  });
});
