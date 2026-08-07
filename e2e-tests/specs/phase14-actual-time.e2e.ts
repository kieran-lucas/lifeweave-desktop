import { $, browser, expect } from "@wdio/globals";
import {
  RECURRING_TASK, SECOND_TASK, TIMED_TASK, attemptConcurrentStart, blockedStartButton,
  establishActualTimeFixture,
  openToday, readActualTime, row, startButton, stopRowButton, timerStrip, yesterday,
} from "../support/actualTime.js";

describe("Phase 14 — explicit actual time sessions", () => {
  it("starts one timer through the UI and refuses a concurrent or recurring one", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    const date = yesterday();
    await establishActualTimeFixture(date);
    await browser.refresh();
    await openToday(date);

    // ── The recurring row exposes no timer control at all.
    await expect(row(RECURRING_TASK)).toBeDisplayed();
    await expect(startButton(RECURRING_TASK)).not.toExist();
    await expect(stopRowButton(RECURRING_TASK)).not.toExist();

    // ── Start the first one-off through the product button.
    await expect(startButton(TIMED_TASK)).toBeEnabled();
    await startButton(TIMED_TASK).click();

    // The row flips to Stop and the strip names the running task.
    await expect(stopRowButton(TIMED_TASK)).toBeDisplayed();
    await expect(timerStrip()).toBeDisplayed();
    await expect(timerStrip()).toHaveText(expect.stringContaining(TIMED_TASK));
    await expect($("[role='timer']")).toBeDisplayed();

    // ── A second one-off cannot become concurrently active. The button is disabled, and the
    // command itself refuses — otherwise this would only prove the frontend gating.
    await expect(blockedStartButton(SECOND_TASK)).toBeDisabled();
    await expect(startButton(SECOND_TASK)).not.toExist();
    const refusal = await attemptConcurrentStart(date, SECOND_TASK);
    expect(refusal).toContain("REFUSED");
    expect(refusal).toContain("Another task timer is already running");

    // ── Assessment is refused while the timer runs.
    await expect(
      row(TIMED_TASK).$("button[aria-label='Stop or discard the running timer before assessing this task']"),
    ).toBeDisabled();

    const state = await readActualTime(date);
    expect(state.activeSessionId).not.toBeNull();
    expect(state.timedActiveSessionId).toBe(state.activeSessionId);
    expect(state.timedTotalSeconds).toBe(0);
    expect(state.recurringActualTime).toBeNull();

    await expect($("[role='alert']")).not.toExist();
    // Deliberately leave the session running: the restart phase proves it survives.
  });
});
