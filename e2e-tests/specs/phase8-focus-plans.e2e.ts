import { $, browser, expect } from "@wdio/globals";

describe("Task 36 — Focus Plan create and edit", () => {
  it("creates and edits one plan for the restart persistence check", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    await $("button[aria-label='Plans']").click();
    await expect($("h1=Plans")).toBeDisplayed();

    const createTitle = $("#new-plan-title");
    await createTitle.setValue("E2E Focus Plan");
    await $("button=Create").click();

    const title = $("//label[normalize-space()='Title']/input");
    await expect(title).toHaveValue("E2E Focus Plan");
    await title.setValue("E2E Focus Plan Persisted");
    await $("//label[normalize-space()='Outcome']/textarea").setValue("Persistent plan outcome");
    await $("//label[normalize-space(text())='Lifecycle']/select").selectByAttribute("value", "active");
    await $("button=Save plan").click();

    const newPhase = $("input[placeholder='New phase']");
    await newPhase.setValue("Foundation");
    await $("button=Add phase").click();
    await expect($("input[aria-label='Phase 1 title']")).toHaveValue("Foundation");
    await expect($("[role='alert']")).not.toExist();
  });
});
