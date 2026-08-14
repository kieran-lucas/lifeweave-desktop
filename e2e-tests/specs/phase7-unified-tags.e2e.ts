import { $, browser, expect } from "@wdio/globals";

const ONE_OFF = "E2E Tagged Task Renamed";
const SERIES = "E2E Tagged Series";
const LIFE = "Portable Source";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";

const taskRow = (title: string) =>
  $(`//*[@role='group'][.//strong[normalize-space()="${title}"]]`);

const researchChip = (root: WebdriverIO.Element) =>
  root.$("./descendant::*[self::span or self::li][normalize-space()='#Research']");

const searchResult = (group: "Tasks" | "Life" | "Documents", title: string) => {
  const context = group === "Life" ? "original remains" : group === "Documents" ? "portable persisted text" : "";
  return $("//button[@role='option'][contains(translate(normalize-space(.), '" + UPPERCASE + "', '" + LOWERCASE + "'), '" + title.toLowerCase() + "')" + (context ? " and contains(translate(normalize-space(.), '" + UPPERCASE + "', '" + LOWERCASE + "'), '" + context + "')" : "") + "]");
};

async function setTime(dialog: WebdriverIO.Element, start: string, end: string) {
  await dialog.$("select[aria-label='Start hour']").selectByVisibleText(start);
  await dialog.$("select[aria-label='Start minute']").selectByVisibleText("00");
  await dialog.$("select[aria-label='End hour']").selectByVisibleText(end);
  await dialog.$("select[aria-label='End minute']").selectByVisibleText("00");
}

async function openSearch(expectResults = true) {
  await $("button[aria-label='Search (Ctrl+K)']").click();
  const input = $("[aria-label='Search tasks, life nodes, and documents']");
  await expect(input).toBeDisplayed();
  await input.setValue("research");
  const results = $("[role='listbox'][aria-label='Search results']");
  await expect(results).toBeDisplayed();
  await browser.waitUntil(async () => {
    const status = await results.$("p[aria-live='polite']").getText();
    return expectResults ? /^\d+ results?\.$/.test(status) : status === "No results.";
  }, { timeout: 15_000, timeoutMsg: expectResults ? "Research search did not return results" : "Archived Research search still returned results" });
  return input;
}

async function createOneOffWithResearch() {
  await $("button=Plan task").click();
  const dialog = $("[role='dialog'][aria-labelledby='task-dialog-heading']");
  await expect(dialog.$("h2=Plan task")).toBeDisplayed();
  await dialog.$("//label[normalize-space()='Title']/input").setValue("E2E Tagged Task");
  await setTime(dialog, "05", "06");
  await dialog.$("button=Add tags").click();
  const search = dialog.$("//fieldset[legend[normalize-space()='Tags']]//input[@type='search']");
  await search.setValue("Research");
  await dialog.$("button*=Create and select").click();
  const research = dialog.$("//fieldset[legend[normalize-space()='Tags']]//label[normalize-space()='Research']/input");
  await expect(research).toBeChecked();
  await dialog.$("button=Done").click();
  await dialog.$("button=Save").click();
}

async function createRecurringWithResearch() {
  await $("button=Plan task").click();
  const dialog = $("[role='dialog'][aria-labelledby='task-dialog-heading']");
  await expect(dialog.$("h2=Plan task")).toBeDisplayed();
  await dialog.$("//label[normalize-space()='Title']/input").setValue(SERIES);
  await setTime(dialog, "06", "07");
  await dialog.$("button=Add tags").click();
  const research = dialog.$("//fieldset[legend[normalize-space()='Tags']]//label[normalize-space()='Research']/input");
  await expect(research).toBeDisplayed();
  await research.click();
  await expect(research).toBeChecked();
  await dialog.$("button=Done").click();
  await dialog.$("//label[contains(normalize-space(.),'Repeat task')]/input[@type='checkbox']").click();
  await dialog.$("//fieldset[legend[normalize-space()='Ends']]//label[normalize-space()='count']/input").click();
  await dialog.$("//label[normalize-space()='Occurrence count']/input").setValue("3");
  await dialog.$("button=Save").click();
}

async function assignResearchToPortableSource() {
  await $("button[aria-label='Life System']").click();
  await expect($("h1=Life System")).toBeDisplayed();
  await $("button=Edit").click();
  const sourceNode = $("//button[@data-life-edit-id][.//span[normalize-space()='Portable Source']]");
  await expect(sourceNode).toBeDisplayed();
  await sourceNode.click();
  const inspector = $("aside[aria-label='Life node inspector']");
  await expect(inspector.$("h2=Edit Portable Source")).toBeDisplayed();
  await inspector.$("button=Add tags").click();
  const research = inspector.$("//fieldset[legend[normalize-space()='Tags']]//label[normalize-space()='Research']/input");
  await expect(research).toBeDisplayed();
  await research.click();
  await expect(inspector.$("button*=Edit tags, 1 selected")).toBeEnabled();
  await inspector.$("button=Done").click();
  await inspector.$("button=Open in Browse").click();
}

async function verifyBrowseReaderAndPinned() {
  const focal = $(`[data-life-focal][data-life-id]`);
  await expect(focal.$("h2=Portable Source")).toBeDisplayed();
  await expect(researchChip(focal)).toBeDisplayed();
  await $("//nav[@aria-label='Life breadcrumb']//button[normalize-space()='Life']").click();
  const sourceCard = $("//button[@data-life-id][.//*[normalize-space()='Portable Source']]");
  await expect(sourceCard).toBeDisplayed();
  await sourceCard.click();
  const reader = $("section[aria-labelledby='life-reader-title']");
  await expect(reader.$("h1=Portable Source")).toBeDisplayed();
  await expect(researchChip(reader)).toBeDisplayed();
  await reader.$("button*=Back to Life Browse").click();
  await $("button[aria-label='Pin Portable Source']").click();
  await $("button=Pinned").click();
  const pinned = $("//ul[@aria-label='Pinned Life nodes']/li[.//button[.//*[normalize-space()='Portable Source']]]");
  await expect(pinned).toBeDisplayed();
  await expect(researchChip(pinned)).toBeDisplayed();
}

describe("Phase 7 — Unified Tags full UI lifecycle", () => {
  it("creates, assigns, navigates, archives, restores, and preserves tags through product UI", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    await createOneOffWithResearch();
    const original = taskRow("E2E Tagged Task");
    await expect(original).toBeDisplayed();
    await expect(researchChip(original)).toBeDisplayed();

    await original.doubleClick();
    const edit = $("[role='dialog'][aria-labelledby='task-dialog-heading']");
    const title = edit.$("//label[normalize-space()='Title']/input");
    await title.clearValue();
    await title.setValue(ONE_OFF);
    await edit.$("button=Save").click();
    const renamed = taskRow(ONE_OFF);
    await expect(renamed).toBeDisplayed();
    await expect(researchChip(renamed)).toBeDisplayed();

    await createRecurringWithResearch();
    const series = taskRow(SERIES);
    await expect(series).toBeDisplayed();
    await expect(researchChip(series)).toBeDisplayed();

    await assignResearchToPortableSource();
    await verifyBrowseReaderAndPinned();

    await openSearch();
    const taskResult = searchResult("Tasks", ONE_OFF);
    await expect(taskResult).toBeDisplayed();
    await taskResult.click();
    await expect(taskRow(ONE_OFF)).toBeDisplayed();

    await openSearch();
    const lifeResult = searchResult("Life", LIFE);
    await expect(lifeResult).toBeDisplayed();
    await lifeResult.click();
    await expect($("//*[@data-life-focal]//h2[normalize-space()='Portable Source']")).toBeDisplayed();

    await openSearch();
    const documentResult = searchResult("Documents", LIFE);
    await expect(documentResult).toBeDisplayed();
    await documentResult.click();
    await expect($("//section[@aria-labelledby='life-reader-title']//h1[normalize-space()='Portable Source']")).toBeDisplayed();

    await $("button[aria-label='Settings']").click();
    const archive = $("//section[@aria-label='Active tags']//tr[td[normalize-space()='Research']]//button[normalize-space()='Archive']");
    await expect(archive).toBeDisplayed();
    await archive.click();
    await expect($("//section[@aria-label='Archived tags']//tr[td[normalize-space()='Research']]")).toBeDisplayed();

    await $("button[aria-label='Today']").click();
    await expect(taskRow(ONE_OFF)).toBeDisplayed();
    await expect(researchChip(taskRow(ONE_OFF))).not.toExist();
    await expect(researchChip(taskRow(SERIES))).not.toExist();
    await $("button[aria-label='Life System']").click();
    await $("button=Pinned").click();
    const archivedPinned = $("//ul[@aria-label='Pinned Life nodes']/li[.//button[.//*[normalize-space()='Portable Source']]]");
    await expect(archivedPinned).toBeDisplayed();
    await expect(researchChip(archivedPinned)).not.toExist();
    await openSearch(false);
    await expect(searchResult("Tasks", ONE_OFF)).not.toExist();
    await expect(searchResult("Life", LIFE)).not.toExist();
    await expect(searchResult("Documents", LIFE)).not.toExist();
    await $("button[aria-label='Close search']").click();

    await $("button[aria-label='Settings']").click();
    const restore = $("//section[@aria-label='Archived tags']//tr[td[normalize-space()='Research']]//button[normalize-space()='Restore']");
    await expect(restore).toBeDisplayed();
    await restore.click();
    await expect($("//section[@aria-label='Active tags']//tr[td[normalize-space()='Research']]")).toBeDisplayed();

    await $("button[aria-label='Today']").click();
    await expect(researchChip(taskRow(ONE_OFF))).toBeDisplayed();
    await expect(researchChip(taskRow(SERIES))).toBeDisplayed();
    await openSearch();
    const restoredDocument = searchResult("Documents", LIFE);
    await restoredDocument.click();
    const restoredReader = $("section[aria-labelledby='life-reader-title']");
    await expect(restoredReader.$("h1=Portable Source")).toBeDisplayed();
    await expect(researchChip(restoredReader)).toBeDisplayed();
    await $("//section[@aria-labelledby='life-reader-title']//button[contains(normalize-space(), 'Back to Life Browse')]").click();
    await $("button=Pinned").click();
    const restoredPinned = $("//ul[@aria-label='Pinned Life nodes']/li[.//button[.//*[normalize-space()='Portable Source']]]");
    await expect(researchChip(restoredPinned)).toBeDisplayed();
    await openSearch();
    await expect(searchResult("Tasks", ONE_OFF)).toBeDisplayed();
    await expect(searchResult("Life", LIFE)).toBeDisplayed();
    await expect(searchResult("Documents", LIFE)).toBeDisplayed();
    await $("button[aria-label='Close search']").click();
    await expect($("[role='alert']")).not.toExist();
  });
});
