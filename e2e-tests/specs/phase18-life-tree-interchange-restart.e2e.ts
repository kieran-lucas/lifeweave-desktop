import { $, browser, expect } from "@wdio/globals";
import { TREE_CANVAS, TREE_DESTINATION, TREE_ROOT_A, openLifeEdit, readTreeState } from "../support/lifeTree.js";

describe("Phase 18 — whole-Life tree interchange restart", () => {
  it("reopens both source and imported forests with distinct identities", async () => {
    await browser.url("http://tauri.localhost"); await expect($("h1=Today")).toBeDisplayed();
    const imported = await readTreeState(TREE_DESTINATION); const source = await readTreeState(null);
    expect(imported.found).toBe(true); expect(source.found).toBe(true);
    if (!imported.found || !source.found) throw new Error("persisted Tree roots were not resolved");
    expect(imported.rootAId).not.toBe(source.rootAId); expect(imported.rootBId).not.toBe(source.rootBId); expect(imported.basicId).not.toBe(source.basicId);
    expect(imported.hasBasicDocument).toBe(true); expect(imported.outgoing).toContain(TREE_CANVAS);
    await openLifeEdit(TREE_ROOT_A); await expect($(`h2=Edit ${TREE_ROOT_A}`)).toBeDisplayed(); await expect($("[role='alert']")).not.toExist();
  });
});
