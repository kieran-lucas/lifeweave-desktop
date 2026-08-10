import { $, browser, expect } from "@wdio/globals";

const TRACKED = "E2E Analytics Tracked";
const UNTRACKED = "E2E Analytics Untracked";
const CONTROL = "\uE009";

const taskRow = (title: string) =>
  $(`//div[@role='listitem'][.//strong[normalize-space()='${title}']]`);

async function createOneHourTask(title: string, startHour: string, endHour: string) {
  await $("button[aria-label='Create task']").click();
  const dialog = $("[role='dialog'][aria-labelledby='task-dialog-heading']");
  await expect(dialog.$("h2=Create task")).toBeDisplayed();
  await dialog.$("//label[normalize-space(text())='Title']/input").setValue(title);
  await dialog.$("select[aria-label='Start hour']").selectByVisibleText(startHour);
  await dialog.$("select[aria-label='Start minute']").selectByVisibleText("00");
  await dialog.$("select[aria-label='End hour']").selectByVisibleText(endHour);
  await dialog.$("select[aria-label='End minute']").selectByVisibleText("00");
  await dialog.$("button=Save").click();
  await expect(dialog).not.toExist();
  await expect(taskRow(title)).toBeDisplayed();
}

const factValue = (section: WebdriverIO.Element, label: string) =>
  section.$(`.//dt[normalize-space()='${label}']/following-sibling::dd[1]`);

const durationSeconds = (text: string) => {
  const hours = Number(/(\d+)h/.exec(text)?.[1] ?? 0);
  const minutes = Number(/(\d+)m/.exec(text)?.[1] ?? 0);
  const seconds = Number(/(\d+)s/.exec(text)?.[1] ?? 0);
  return hours * 3_600 + minutes * 60 + seconds;
};

describe("Phase 17 — planned versus actual Analytics", () => {
  it("compares only the tracked Task while scheduled totals retain both Tasks", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    await createOneHourTask(TRACKED, "20", "21");
    await createOneHourTask(UNTRACKED, "21", "22");

    await expect(taskRow(TRACKED)).toBeDisplayed();
    await expect(taskRow(UNTRACKED)).toBeDisplayed();
    await $(`button[aria-label='Start timer for ${TRACKED}']`).click();
    await expect($("section[aria-label='Running task timer']")).toBeDisplayed();
    await expect($("[role='timer']")).toBeDisplayed();
    await browser.waitUntil(
      async () => (await $("[role='timer']").getText()).trim() !== "0:00",
      { timeout: 15_000, timeoutMsg: "the real timer never displayed non-zero elapsed time" },
    );
    await $(`button[aria-label='Stop timer for ${TRACKED}']`).click();
    await expect($("section[aria-label='Running task timer']")).not.toExist();

    // Ctrl+3 preserves the historical accelerator while Analytics is owned by Settings.
    await browser.keys([CONTROL, "3"]);
    await expect($("h1=Analytics")).toBeDisplayed();
    await expect($("button[aria-label='Settings'][aria-current='page']")).toBeDisplayed();
    const actual = $("section[aria-labelledby='recorded-actual-time']");
    await expect(actual.$("h2=Recorded actual time")).toBeDisplayed();

    await expect(factValue(actual, "Tracked Tasks")).toHaveText("1");
    await expect(factValue(actual, "Completed segments")).toHaveText("1");
    await expect(factValue(actual, "Tracked plan")).toHaveText("1h 0m");
    const recordedText = await factValue(actual, "Recorded time").getText();
    expect(durationSeconds(recordedText)).toBeGreaterThan(0);

    const scheduled = $("section[aria-labelledby='scheduled-overview']");
    expect(durationSeconds(await scheduled.$("strong").getText())).toBeGreaterThanOrEqual(7_200);
    expect(Number(await factValue(scheduled, "Scheduled tasks").getText())).toBeGreaterThanOrEqual(2);

    await expect($("[role='alert']")).not.toExist();
  });
});
