import { $, browser, expect } from "@wdio/globals";

/**
 * Phase 16 — Global keyboard shortcuts and shortcut help.
 *
 * Single phase with no restart companion: Task 45 persists nothing, so there is no state for a
 * restart to preserve.
 *
 * This phase asserts the Product Owner's locked map literally rather than reading the frontend
 * registry. That is deliberate: the native phase is the outermost acceptance oracle, and it must
 * fail if the registry stops agreeing with the decision. Inside the frontend, the help dialog and
 * every test read the one registry, exactly as ADR 0039 requires.
 */

// WebDriver keyboard code points, written as escapes so the source stays readable.
const CONTROL = "\uE009";
const ESCAPE = "\uE00C";

const chord = (key: string) => browser.keys([CONTROL, key]);

const activeLabel = () =>
  browser.execute(() => {
    const active = document.activeElement;
    if (!active) return "";
    return active.getAttribute("aria-label") ?? active.textContent?.trim() ?? "";
  });

const helpRows = () =>
  browser.execute(() => {
    const dialog = document.querySelector("[role='dialog'][aria-modal='true']");
    const chords = [...(dialog?.querySelectorAll("dd") ?? [])].map(
      node => node.textContent?.trim() ?? "",
    );
    return [...(dialog?.querySelectorAll("dt") ?? [])].map(
      (node, index) => `${node.textContent?.trim() ?? ""} = ${chords[index] ?? ""}`,
    );
  });

describe("Global keyboard shortcuts", () => {
  it("drives destinations, Search, and shortcut help from the keyboard alone", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    await chord("3");
    await expect($("h1=Analytics")).toBeDisplayed();

    await chord("5");
    await expect($("h1=Life System")).toBeDisplayed();

    // Ctrl+K reaches the Search dialog the sidebar control already opens.
    await chord("k");
    await expect($("div[role='dialog'][aria-label='Search']")).toBeDisplayed();
    await $("button[aria-label='Close search']").click();
    await expect($("div[role='dialog'][aria-label='Search']")).not.toExist();

    // Search hands focus back to its invoker, which is therefore the element the help dialog must
    // restore after a shortcut-opened session.
    await expect(await activeLabel()).toBe("Search (Ctrl+K)");

    await chord("/");
    await expect($("h2=Keyboard shortcuts")).toBeDisplayed();
    expect(await helpRows()).toEqual([
      "Today = Ctrl+1",
      "Calendar = Ctrl+2",
      "Analytics = Ctrl+3",
      "Plans = Ctrl+4",
      "Life System = Ctrl+5",
      "Settings = Ctrl+6",
      "Search = Ctrl+K",
      "Keyboard shortcuts = Ctrl+/",
    ]);

    // The open dialog owns the keyboard: a destination chord must not navigate behind it.
    await chord("1");
    await expect($("h2=Keyboard shortcuts")).toBeDisplayed();

    await browser.keys(ESCAPE);
    await expect($("h2=Keyboard shortcuts")).not.toExist();
    await expect($("h1=Life System")).toBeDisplayed();
    await expect(await activeLabel()).toBe("Search (Ctrl+K)");

    await chord("6");
    await expect($("h1=Settings")).toBeDisplayed();

    // The Settings trigger opens the same dialog and gets focus back when it closes.
    await $("button=Keyboard shortcuts").click();
    await expect($("h2=Keyboard shortcuts")).toBeDisplayed();
    expect(await helpRows()).toHaveLength(8);
    await $("button=Close").click();
    await expect($("h2=Keyboard shortcuts")).not.toExist();
    await expect(await activeLabel()).toBe("Keyboard shortcuts");

    await expect($("[role='alert']")).not.toExist();
  });

  it("leaves the keyboard to a text field that is already editing", async () => {
    await expect($("h1=Settings")).toBeDisplayed();
    const field = $("input[aria-label='New tag name']");
    await field.click();
    await field.setValue("Phase16");
    await expect(await activeLabel()).toBe("New tag name");

    // Ctrl+K is the regression that matters: the global layer must not consume it from a text
    // surface, and must not even preventDefault while declining to act.
    await chord("k");
    await expect($("div[role='dialog'][aria-label='Search']")).not.toExist();

    // A destination chord must not navigate away from what the user is typing either.
    await chord("3");
    await expect($("h1=Settings")).toBeDisplayed();
    await expect($("h1=Analytics")).not.toExist();
    await expect(await activeLabel()).toBe("New tag name");
    await expect(field).toHaveValue("Phase16");

    await field.clearValue();
    await expect($("[role='alert']")).not.toExist();
  });
});
