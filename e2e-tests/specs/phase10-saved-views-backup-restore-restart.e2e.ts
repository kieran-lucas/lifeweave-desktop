import { $, browser, expect } from "@wdio/globals";

import {
  DEADLINE,
  MATCHING_TASK,
  RENAMED_VIEW,
  SCHEDULED,
  SECOND_VIEW,
  sel,
} from "../support/deadlineSavedViews.js";

/**
 * Phase 10 restart — the restored database survives a fresh native process.
 *
 * Phase 10 proved the restore reinstated the pre-backup values in the running session. Only a
 * relaunch proves the atomic replacement actually landed on disk rather than in memory.
 */
describe("Phase 10 restart — restored deadline and Saved View durability", () => {
  it("keeps the restored deadline, view configuration, and archive state after relaunch", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await expect($(sel.selectedTab("Today"))).toBeDisplayed();

    // --- restored deadline data ------------------------------------------------------------------
    await $("button=Deadlines").click();
    const queued = $(sel.deadlineRow(MATCHING_TASK));
    await expect(queued).toBeDisplayed();
    await expect(queued.$(sel.deadlineTime(DEADLINE))).toBeDisplayed();

    // --- restored lifecycle: one active, one archived ---------------------------------------------
    await $("button=Views").click();
    await expect($(sel.savedViewItem(RENAMED_VIEW))).toBeDisplayed();
    await expect($(sel.savedViewItem(SECOND_VIEW))).not.toExist();
    await $(sel.archivedSummary).click();
    await expect($(sel.archivedViewItem(SECOND_VIEW))).toBeDisplayed();

    // --- restored configuration, field by field ----------------------------------------------------
    await $(sel.savedViewItem(RENAMED_VIEW)).$("button=Edit").click();
    await expect($("h2=Edit Saved View")).toBeDisplayed();
    await expect($(sel.labelledInput("Name"))).toHaveValue(RENAMED_VIEW);
    await expect($(sel.labelledSelect("Base scope"))).toHaveValue("upcoming");
    await expect($(sel.labelledSelect("Sort"))).toHaveValue("title_ascending");
    await expect($(sel.labelledSelect("Group"))).toHaveValue("category");
    await expect($(sel.clauseLegend("Priority"))).toBeDisplayed();
    await expect($(sel.clauseLegend("Has deadline"))).toBeDisplayed();
    await $("button=Cancel").click();

    // --- the restored view still executes and still navigates exactly -------------------------------
    await $(sel.savedViewItem(RENAMED_VIEW)).$(`button=${RENAMED_VIEW}`).click();
    await expect($(sel.title(MATCHING_TASK))).toBeDisplayed();
    await $(sel.openItem(MATCHING_TASK)).click();
    await expect($(sel.selectedTab("Today"))).toBeDisplayed();
    await expect($(sel.selectedDay(SCHEDULED))).toBeDisplayed();
    await expect($(sel.taskRow(MATCHING_TASK))).toBeDisplayed();

    await expect($("[role='alert']")).not.toExist();
  });
});
