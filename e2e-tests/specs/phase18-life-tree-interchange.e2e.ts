import { $, browser, expect } from "@wdio/globals";
import {
  TREE_BASIC, TREE_CANVAS, TREE_DESTINATION, TREE_EMPTY, TREE_INNER, TREE_ROOT_A, TREE_ROOT_B,
  capturedTreeDownload, chooseTreeFile, establishTreeFixture, importDialog, installTreeDownloadCapture,
  openLifeEdit, readTreeState, treeControls,
} from "../support/lifeTree.js";

describe("Phase 18 — whole-Life tree interchange", () => {
  it("exports the active forest and append-imports all roots through Life Edit", async () => {
    await browser.url("http://tauri.localhost"); await expect($("h1=Today")).toBeDisplayed();
    const fixture = await establishTreeFixture();
    await openLifeEdit("Life");
    await installTreeDownloadCapture();
    await expect(treeControls().$("button=Export Life tree")).toBeEnabled();
    await treeControls().$("button=Export Life tree").click();
    await expect(treeControls().$("[role='status']")).toHaveText(expect.stringContaining("Life Tree Package prepared"));
    const download = await capturedTreeDownload();

    // Created only after export, so the destination cannot be present in the package snapshot.
    const title = $("input[aria-label='New child title']"); await title.setValue(TREE_DESTINATION);
    await $("button=Create child").click(); await expect($(`h2=Edit ${TREE_DESTINATION}`)).toBeDisplayed();
    await chooseTreeFile(download.bytes);
    const dialog = importDialog(); await expect(dialog).toBeDisplayed();
    await expect(dialog.$("h2=Import Life tree")).toBeDisplayed();
    await expect(dialog).toHaveText(expect.stringContaining("Life Tree Package"));
    await expect(dialog).toHaveText(expect.stringContaining("Top-level roots"));
    await expect(dialog).toHaveText(expect.stringContaining("fresh local identity"));
    await expect(dialog).toHaveText(expect.stringContaining("append every top-level root"));
    await expect(dialog).toHaveText(expect.stringContaining("never merged, replaced, reordered, or overwritten"));
    await expect(dialog).toHaveText(expect.stringContaining("cannot be undone"));

    const trigger = treeControls().$("button=Import Life tree here");
    await dialog.$("button=Cancel").click(); await expect(importDialog()).not.toBeDisplayed(); await expect(trigger).toBeFocused();
    expect((await readTreeState(TREE_DESTINATION)).found).toBe(false);

    await chooseTreeFile(download.bytes); await expect(importDialog()).toBeDisplayed();
    await importDialog().$("button=Import Life tree here").click(); await expect(importDialog()).not.toBeDisplayed();
    await expect(treeControls().$("[role='status']")).toHaveText(expect.stringContaining("Imported"));

    const imported = await readTreeState(TREE_DESTINATION); const source = await readTreeState(null);
    expect(imported.found).toBe(true); expect(source.found).toBe(true);
    if (!imported.found || !source.found) throw new Error("known Tree roots were not resolved");
    expect(imported.alphaChildTitles).toEqual([TREE_INNER, TREE_EMPTY]);
    expect(imported.innerTitles).toEqual([TREE_BASIC, TREE_CANVAS]);
    expect(imported.rootTitles).toEqual(expect.arrayContaining([TREE_ROOT_A, TREE_ROOT_B]));
    expect(imported.hasBasicDocument).toBe(true); expect(imported.outgoing).toContain(TREE_CANVAS);
    expect(imported.rootAId).not.toBe(source.rootAId); expect(imported.rootBId).not.toBe(source.rootBId); expect(imported.basicId).not.toBe(source.basicId);
    expect(source.rootAId).toBe(fixture.rootAId); expect(source.rootBId).toBe(fixture.rootBId);
    await expect($("[role='alert']")).not.toExist();
  });
});
