import { $, browser, expect } from "@wdio/globals";
import {
  BRANCH_BASIC, BRANCH_CANVAS, BRANCH_DESTINATION, BRANCH_EMPTY, BRANCH_INNER,
  BRANCH_OUTSIDE, BRANCH_ROOT, branchControls, capturedBranchDownload, chooseBranchFile,
  establishBranchFixture, importDialog, installBranchDownloadCapture, openLifeEdit,
  readBranchState, selectNode,
} from "../support/lifeBranch.js";

describe("Phase 13 — bounded Life branch interchange", () => {
  it("exports one branch and imports it under another parent through the Life Edit UI", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await establishBranchFixture();

    // ── Eligibility is surfaced before anything is exported.
    await openLifeEdit(BRANCH_EMPTY);
    await expect(branchControls().$("button=Export branch")).toBeDisabled();
    await expect(branchControls()).toHaveText(
      expect.stringContaining("at least one active child"),
    );

    // ── Export the eligible branch through the product button.
    await installBranchDownloadCapture();
    await selectNode(BRANCH_ROOT);
    await expect(branchControls().$("button=Export branch")).toBeEnabled();
    await branchControls().$("button=Export branch").click();
    await expect(branchControls().$("[role='status']")).toHaveText(
      expect.stringContaining("Branch package prepared"),
    );
    const download = await capturedBranchDownload();

    // ── Choose the destination in the UI, then preview through the product dialog.
    await selectNode(BRANCH_DESTINATION);
    await chooseBranchFile(download.bytes);

    const dialog = importDialog();
    await expect(dialog).toBeDisplayed();
    await expect(dialog.$("h2=Import Life branch")).toBeDisplayed();
    await expect(dialog).toHaveText(expect.stringContaining(BRANCH_ROOT));
    await expect(dialog).toHaveText(expect.stringContaining(BRANCH_DESTINATION));
    await expect(dialog).toHaveText(expect.stringContaining("1 Basic Leaf, 1 Narrative Canvas"));
    await expect(dialog).toHaveText(expect.stringContaining("cannot be undone"));
    await expect(dialog).toHaveText(expect.stringContaining("new local identities"));
    await expect(dialog).toHaveText(expect.stringContaining("link(s) leaving this branch"));

    // ── Cancel restores focus and changes nothing, then reopen and confirm.
    await dialog.$("button=Cancel").click();
    await expect(importDialog()).not.toBeDisplayed();

    await chooseBranchFile(download.bytes);
    await expect(importDialog()).toBeDisplayed();
    await importDialog().$("button=Import branch here").click();
    await expect(importDialog()).not.toBeDisplayed();
    await expect(branchControls().$("[role='status']")).toHaveText(
      expect.stringContaining("Imported"),
    );

    // ── The imported subtree is complete, and the source copy is untouched.
    const state = await readBranchState(BRANCH_DESTINATION, BRANCH_ROOT);
    const source = await readBranchState(null, BRANCH_ROOT);
    expect(state.found).toBe(true);
    expect(source.found).toBe(true);
    expect(state.branchTitle).toBe(BRANCH_ROOT);
    expect(state.childTitles).toEqual([BRANCH_INNER, BRANCH_EMPTY]);
    expect(state.innerTitles).toEqual([BRANCH_BASIC, BRANCH_CANVAS]);

    // Internal links travel; the link that left the branch does not.
    expect(state.outgoing).toEqual([BRANCH_CANVAS]);
    expect(state.outgoing).not.toContain(BRANCH_OUTSIDE);

    // Fresh identity: both copies resolve, and every compared node is a distinct row.
    expect(state.branchId).not.toBe(source.branchId);
    expect(state.basicId).not.toBe(source.basicId);
    expect(source.childTitles).toEqual([BRANCH_INNER, BRANCH_EMPTY]);
    expect(source.outgoing).toEqual([BRANCH_CANVAS, BRANCH_OUTSIDE]);

    // The source branch still exists in Life Edit exactly as before.
    await selectNode(BRANCH_ROOT);
    await expect($(`h2=Edit ${BRANCH_ROOT}`)).toBeDisplayed();
    await expect($("[role='alert']")).not.toExist();
  });
});
