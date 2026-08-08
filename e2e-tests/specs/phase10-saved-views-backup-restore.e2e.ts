import { $, browser, expect } from "@wdio/globals";
import { createManagedBackup, restoreManagedBackup } from "../support/managedBackups.js";

import {
  DEADLINE,
  MATCHING_TASK,
  RENAMED_VIEW,
  SCHEDULED,
  SECOND_VIEW,
  sel,
} from "../support/deadlineSavedViews.js";

/**
 * Phase 10 — full backup and restore over deadline data and both Saved View lifecycle states.
 *
 * The live state is deliberately mutated in three independent ways before the restore, so a
 * restore that only reinstated row counts, or only active views, would fail here.
 */

const MUTATED_VIEW = "E2E Mutated View";

describe("Phase 10 — Saved View and deadline backup/restore", () => {
  it("restores deadline and both active and archived view state from an opaque backup", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    // --- establish: one active view, one archived view, and live deadline data -----------------
    await $("button=Views").click();
    await expect($(sel.selectedTab("Views"))).toBeDisplayed();
    await $(sel.savedViewItem(SECOND_VIEW)).$("button=Archive").click();
    await expect($(sel.savedViewItem(SECOND_VIEW))).not.toExist();
    await expect($(sel.savedViewItem(RENAMED_VIEW))).toBeDisplayed();
    await $(sel.archivedSummary).click();
    await expect($(sel.archivedViewItem(SECOND_VIEW))).toBeDisplayed();

    await $("button=Deadlines").click();
    await expect($(sel.deadlineRow(MATCHING_TASK))).toBeDisplayed();

    // --- back up ---------------------------------------------------------------------------------
    await $("button[aria-label='Settings']").click();
    await expect($("h1=Settings")).toBeDisplayed();
    const selectedBackup = await createManagedBackup();

    // --- mutate live state in three independent ways ----------------------------------------------
    await $("button[aria-label='Today']").click();
    await $("button=Views").click();

    // 1. rename the active view and change one of its stored modes
    await $(sel.savedViewItem(RENAMED_VIEW)).$("button=Edit").click();
    await expect($("h2=Edit Saved View")).toBeDisplayed();
    const name = $(sel.labelledInput("Name"));
    await name.clearValue();
    await name.setValue(MUTATED_VIEW);
    await $(sel.labelledSelect("Group")).selectByVisibleText("No groups");
    await $("button=Save view").click();
    await expect($(sel.savedViewItem(MUTATED_VIEW))).toBeDisplayed();
    await expect($(sel.savedViewItem(RENAMED_VIEW))).not.toExist();

    // 2. flip the archived view back to active, so lifecycle differs from the backup
    await $(sel.archivedSummary).click();
    await $(sel.archivedViewItem(SECOND_VIEW)).$("button=Restore").click();
    await expect($(sel.savedViewItem(SECOND_VIEW))).toBeDisplayed();

    // 3. clear the deadline on the queued Task
    await $("button=Deadlines").click();
    await $(sel.openItem(MATCHING_TASK)).click();
    await expect($(sel.selectedDay(SCHEDULED))).toBeDisplayed();
    await $(sel.taskRow(MATCHING_TASK)).doubleClick();
    await expect($("h2=Edit task")).toBeDisplayed();
    await $("button=Clear deadline").click();
    await expect($("#task-deadline")).toHaveValue("");
    await $("button=Save").click();
    await expect($("h2=Edit task")).not.toExist();

    await $("button=Deadlines").click();
    await expect($(sel.title(MATCHING_TASK))).not.toExist();

    // --- restore -----------------------------------------------------------------------------------
    await $("button[aria-label='Settings']").click();
    await restoreManagedBackup(selectedBackup);

    // --- verify the pre-backup values, not merely the counts -------------------------------------
    await $("button[aria-label='Today']").click();
    await expect($("h1=Today")).toBeDisplayed();

    await $("button=Deadlines").click();
    const queued = $(sel.deadlineRow(MATCHING_TASK));
    await expect(queued).toBeDisplayed();
    await expect(queued.$(sel.deadlineTime(DEADLINE))).toBeDisplayed();

    await $("button=Views").click();
    await expect($(sel.savedViewItem(RENAMED_VIEW))).toBeDisplayed();
    await expect($(sel.savedViewItem(MUTATED_VIEW))).not.toExist();
    // The archived view came back archived; restoring rows is not the same as restoring lifecycle.
    await expect($(sel.savedViewItem(SECOND_VIEW))).not.toExist();
    await $(sel.archivedSummary).click();
    await expect($(sel.archivedViewItem(SECOND_VIEW))).toBeDisplayed();

    await $(sel.savedViewItem(RENAMED_VIEW)).$("button=Edit").click();
    await expect($(sel.labelledSelect("Group"))).toHaveValue("category");
    await $("button=Cancel").click();

    await expect($("[role='alert']")).not.toExist();
  });
});
