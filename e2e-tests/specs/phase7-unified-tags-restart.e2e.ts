import { $, browser, expect } from "@wdio/globals";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";

const taskRow = (title: string) =>
  $(`//div[@role='listitem'][.//strong[normalize-space()="${title}"]]`);

const researchChip = (root: WebdriverIO.Element) =>
  root.$("./descendant::*[self::span or self::li][normalize-space()='#Research']");

const searchResult = (group: "Tasks" | "Life" | "Documents", title: string) => {
  const context = group === "Life" ? "original remains" : group === "Documents" ? "portable persisted text" : "";
  return $("//button[@role='option'][contains(translate(normalize-space(.), '" + UPPERCASE + "', '" + LOWERCASE + "'), '" + title.toLowerCase() + "')" + (context ? " and contains(translate(normalize-space(.), '" + UPPERCASE + "', '" + LOWERCASE + "'), '" + context + "')" : "") + "]");
};

async function searchResearch() {
  await $("button[aria-label='Search (Ctrl+K)']").click();
  const input = $("[aria-label='Search tasks, life nodes, and documents']");
  await input.setValue("research");
  const results = $("[role='listbox'][aria-label='Search results']");
  await expect(results).toBeDisplayed();
  await browser.waitUntil(
    async () => /^\d+ results?\.$/.test(await results.$("p[aria-live='polite']").getText()),
    { timeout: 15_000, timeoutMsg: "Research search did not return results after restart" },
  );
}

describe("Phase 7 — Unified Tags fresh-process persistence", () => {
  it("keeps Task, recurring, Life, Reader, Pinned, document, and Search tag state", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    const oneOff = taskRow("E2E Tagged Task Renamed");
    const series = taskRow("E2E Tagged Series");
    await expect(researchChip(oneOff)).toBeDisplayed();
    await expect(researchChip(series)).toBeDisplayed();

    await searchResearch();
    const document = searchResult("Documents", "Portable Source");
    await document.click();
    const reader = $("section[aria-labelledby='life-reader-title']");
    await expect(reader.$("h1=Portable Source")).toBeDisplayed();
    await expect(researchChip(reader)).toBeDisplayed();
    await reader.$("button*=Back to Life Browse").click();
    await $("button=Pinned").click();
    const pinned = $("//ul[@aria-label='Pinned Life nodes']/li[.//button[.//*[normalize-space()='Portable Source']]]");
    await expect(researchChip(pinned)).toBeDisplayed();

    await searchResearch();
    await expect(searchResult("Tasks", "E2E Tagged Task Renamed")).toBeDisplayed();
    await expect(searchResult("Tasks", "E2E Tagged Series")).toBeDisplayed();
    await expect(searchResult("Life", "Portable Source")).toBeDisplayed();
    await expect(searchResult("Documents", "Portable Source")).toBeDisplayed();
    await expect($("[role='alert']")).not.toExist();
  });
});
