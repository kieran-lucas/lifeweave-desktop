import { $, browser, expect } from "@wdio/globals";
import {
  BRANCH_BASIC, BRANCH_CANVAS, BRANCH_DESTINATION, BRANCH_EMPTY, BRANCH_INNER,
  BRANCH_OUTSIDE, BRANCH_ROOT, openLifeEdit, readBranchState,
} from "../support/lifeBranch.js";

describe("Phase 13 — bounded Life branch interchange restart", () => {
  it("reopens the imported branch with its structure, documents, and internal link intact", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    const state = await readBranchState(BRANCH_DESTINATION, BRANCH_ROOT);
    expect(state.found).toBe(true);
    expect(state.branchTitle).toBe(BRANCH_ROOT);
    expect(state.childTitles).toEqual([BRANCH_INNER, BRANCH_EMPTY]);
    expect(state.innerTitles).toEqual([BRANCH_BASIC, BRANCH_CANVAS]);
    expect(state.outgoing).toEqual([BRANCH_CANVAS]);
    expect(state.outgoing).not.toContain(BRANCH_OUTSIDE);

    // Both copies survive the restart independently.
    const source = await readBranchState(null, BRANCH_ROOT);
    expect(source.found).toBe(true);
    expect(source.branchId).not.toBe(state.branchId);
    expect(source.basicId).not.toBe(state.basicId);

    await openLifeEdit(BRANCH_DESTINATION);
    await expect($(`h2=Edit ${BRANCH_DESTINATION}`)).toBeDisplayed();
    await expect($("[role='alert']")).not.toExist();
  });
});
