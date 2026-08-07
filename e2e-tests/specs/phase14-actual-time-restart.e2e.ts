import { $, browser, expect } from "@wdio/globals";
import {
  TIMED_TASK, blockedStartButton, openToday, readActualTime, row, startButton,
  stopRowButton, timerStrip, yesterday,
} from "../support/actualTime.js";

describe("Phase 14 — explicit actual time sessions restart", () => {
  it("resumes the same session across restart, then stops and assesses through the UI", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    const date = yesterday();

    // ── The session started before the restart is still running, with its original start.
    const resumed = await readActualTime(date);
    expect(resumed.activeSessionId).not.toBeNull();
    expect(resumed.timedActiveSessionId).toBe(resumed.activeSessionId);
    expect(resumed.timedTotalSeconds).toBe(0);

    await openToday(date);
    await expect(timerStrip()).toBeDisplayed();
    await expect(timerStrip()).toHaveText(expect.stringContaining(TIMED_TASK));

    // ── Stop through the product UI.
    await stopRowButton(TIMED_TASK).click();
    await expect(timerStrip()).not.toBeDisplayed();
    await expect(startButton(TIMED_TASK)).toBeDisplayed();

    const stopped = await readActualTime(date);
    expect(stopped.activeSessionId).toBeNull();
    expect(stopped.timedActiveSessionId).toBeNull();
    expect(stopped.timedCompletedCount).toBe(1);
    // Wall-clock elapsed across a real process restart is necessarily non-zero.
    expect(stopped.timedTotalSeconds).toBeGreaterThan(0);

    // ── Assess through the UI now that no timer is running.
    await row(TIMED_TASK).$("button[aria-label^='Assess task']").click();
    await $("//*[@role='option' and normalize-space()='Met expectation']").click();
    await expect(row(TIMED_TASK).$("button[aria-label^='Assess task. Current state: Met expectation']"))
      .toBeDisplayed();

    // ── An assessed task can no longer start a new session.
    await expect(blockedStartButton(TIMED_TASK)).toBeDisabled();

    // ── Reload the webview: the closed total and the assessment are persisted, not in-memory.
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    const reloaded = await readActualTime(date);
    expect(reloaded.timedCompletedCount).toBe(1);
    expect(reloaded.timedTotalSeconds).toBe(stopped.timedTotalSeconds);
    expect(reloaded.timedEvaluated).toBe(true);
    expect(reloaded.activeSessionId).toBeNull();

    await expect($("[role='alert']")).not.toExist();
  });
});
