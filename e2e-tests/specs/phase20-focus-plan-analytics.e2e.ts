import { $, browser, expect } from "@wdio/globals";

import { dateKeystrokes, shift } from "../support/deadlineSavedViews.js";

const PLAN = "E2E Plan Analytics";
const TASK = "E2E Plan Analytics Task";

const planRow = () => $(`//tr[.//th[normalize-space()='${PLAN}']]`);

/**
 * Fills an `<input type="date">` and proves the stored value is the intended ISO date.
 *
 * WebDriver types into a date input segment by segment in the presentation locale's order, so
 * sending an ISO string silently stores a nonsense date. Asserting the ISO value afterwards makes
 * a different locale fail loudly instead.
 */
async function setDate(selector: string, isoDate: string) {
  const field = $(selector);
  await field.clearValue();
  await field.setValue(dateKeystrokes(isoDate));
  await expect(field).toHaveValue(isoDate);
}

describe("Phase 20 — Focus Plan activity Analytics", () => {
  it("reports factual linked work, evaluation and review evidence, and opens the exact Plan", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    // A yesterday-dated Task is assessable at any hour the suite happens to start, because
    // eligibility is `local_date < today` for a past day. Today-scheduled fixtures are only
    // assessable after their end minute has passed, which is not deterministic.
    const yesterday = shift(-1);
    const crossedYearBoundary = yesterday.slice(0, 4) !== shift(0).slice(0, 4);

    // ── One known active Focus Plan.
    await $("button[aria-label='Plans']").click();
    await expect($("h1=Plans")).toBeDisplayed();
    await $("#new-plan-title").setValue(PLAN);
    await $("button=Create").click();
    const planTitle = $("//label[normalize-space()='Title']/input");
    await expect(planTitle).toHaveValue(PLAN);
    await $("//label[normalize-space(text())='Lifecycle']/select").selectByAttribute(
      "value",
      "active",
    );
    await $("button=Save plan").click();

    // ── One manual review dated inside the reported period.
    await setDate("//label[normalize-space(text())='Review date']/input", yesterday);
    await $("//label[normalize-space(text())='Reflection']/textarea").setValue(
      "Phase 20 reflection.",
    );
    await $("button=Save review").click();
    await expect($("//p[contains(normalize-space(),'1 review')]")).toBeDisplayed();

    // ── One known one-off Task linked to that Plan.
    await $("button[aria-label='Today']").click();
    await expect($("h1=Today")).toBeDisplayed();
    await $("button[aria-label='Create task']").click();
    const dialog = $("[role='dialog'][aria-labelledby='task-dialog-heading']");
    await expect(dialog.$("h2=Create task")).toBeDisplayed();
    await dialog.$("//label[normalize-space(text())='Title']/input").setValue(TASK);
    await setDate("//label[normalize-space(text())='Date']/input", yesterday);
    await dialog.$("select[aria-label='Start hour']").selectByVisibleText("15");
    await dialog.$("select[aria-label='Start minute']").selectByVisibleText("00");
    await dialog.$("select[aria-label='End hour']").selectByVisibleText("16");
    await dialog.$("select[aria-label='End minute']").selectByVisibleText("00");
    const planPicker = dialog.$("//label[normalize-space()='Focus Plan']/following-sibling::input");
    await planPicker.click();
    await planPicker.setValue(PLAN);
    await $(`//li[@role='option'][contains(normalize-space(),'${PLAN}')]`).click();
    await dialog.$("button=Save").click();
    await expect(dialog).not.toExist();

    // ── Evaluate that Task through the ordinary Overdue review path.
    await $("button=Overdue").click();
    await expect($(`//strong[normalize-space()='${TASK}']`)).toBeDisplayed();
    await $(`button[aria-label^='Review for ${TASK}']`).click();
    const taskRow = $(`//div[@role='listitem'][.//strong[normalize-space()='${TASK}']]`);
    await expect(taskRow).toBeDisplayed();
    await taskRow.$("button[aria-label^='Assess task']").click();
    await $("//*[@role='option' and normalize-space()='Met expectation']").click();
    await expect(taskRow.$("button[aria-label^='Assess task. Current state: Met expectation']"))
      .toBeDisplayed();

    // ── Analytics, on a period that contains yesterday.
    await $("button[aria-label='Analytics']").click();
    await expect($("h1=Analytics")).toBeDisplayed();
    await $("//button[@role='tab' and normalize-space()='Year']").click();
    if (crossedYearBoundary) {
      await $("button[aria-label='Previous period']").click();
    }

    const section = $("section[aria-labelledby='focus-plan-activity']");
    await expect(section.$("h2=Focus Plan activity")).toBeDisplayed();
    await expect(planRow()).toBeDisplayed();

    // Factual evidence for exactly this Plan: one linked one-off hour, evaluated, not missed,
    // and one review attributed by its review date.
    const row = planRow();
    const rowText = await row.getText();
    expect(rowText).toContain("Active");
    expect(rowText).toContain("1h 0m");
    expect(rowText).toContain("1 (1 one-off, 0 recurring)");
    expect(rowText).toContain(`1 · latest ${yesterday}`);
    expect(rowText).toContain("Not tracked");

    // Retrospective facts only: no percentage, progress element, or health language anywhere in
    // the Focus Plan activity section.
    await expect(section.$("progress")).not.toExist();
    const sectionText = await section.getText();
    expect(sectionText).not.toMatch(/%|percent|health|score|on track/i);
    expect(sectionText).toContain("retrospective facts, not automatic Plan progress");
    expect(sectionText).toContain(
      "does not store historical Plan-link snapshots",
    );

    // ── Open Plan reaches the exact Plan detail through the existing Plans destination.
    await row.$(`button[aria-label='Open Plan ${PLAN}']`).click();
    await expect($("h1=Plans")).toBeDisplayed();
    await expect($("//label[normalize-space()='Title']/input")).toHaveValue(PLAN);

    await expect($("[role='alert']")).not.toExist();
  });
});
