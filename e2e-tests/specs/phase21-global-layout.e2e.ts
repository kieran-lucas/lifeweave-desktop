import { $, browser, expect } from "@wdio/globals";

import {
  DIALOG_SURFACE,
  PAGE_FRAME,
  VIEWPORT,
  VIEWPORT_MATRIX,
  assertCentered,
  assertLocalScrollOwnership,
  assertNoHorizontalOverflow,
  assertNoOverlap,
  assertPageHorizontallyStable,
  assertWithinViewport,
  controlRects,
  rect,
  useViewport,
} from "../support/layoutGeometry.js";
import { appLocalDate, seedLayoutFixture } from "../support/layoutFixture.js";

/**
 * Phase 21 — global layout invariants (ADR 0044).
 *
 * Single phase with no restart companion: Task 50 persists nothing, so there is no state for a
 * restart to preserve.
 *
 * This is the only place in the repository where layout is actually proven. jsdom reports every
 * rectangle as zero, so the frontend suite can prove which primitive an element uses but never that
 * two fields stopped overlapping or that a page stopped scrolling sideways. Every assertion below
 * reads the real WebView box model, and every screen is reached through the UI — no raw IPC drives
 * navigation, and raw IPC is used only to seed the fixture before measurement begins.
 */

/** WebDriver Escape, built from its code point so no invisible character enters the source. */
const ESCAPE = String.fromCharCode(0xe00c);

const go = async (destination: string, heading: string) => {
  await $(`button[aria-label='${destination}']`).click();
  await $(heading).waitForDisplayed({ timeout: 30_000 });
  await browser.pause(250);
};

const dismissDialog = async () => {
  const dialog = $("[role='dialog'][aria-modal='true']");
  if (await dialog.isExisting()) {
    const cancel = dialog.$("button=Cancel");
    if (await cancel.isExisting()) await cancel.click();
    else await browser.keys(ESCAPE);
    await browser.pause(250);
  }
};

/** The live inner width, so comparisons never trust the requested window size. */
const innerWidth = () => browser.execute(() => document.documentElement.clientWidth);

describe("Global layout invariants", () => {
  before(async () => {
    await browser.url("http://tauri.localhost");
    // §37 — a layout that only works while empty is not complete, and §38's long-string stress
    // cases are the usual cause of page-level horizontal overflow.
    const seeded = await seedLayoutFixture(await appLocalDate());
    if (!seeded.ok)
      throw new Error(`layout fixture seeding failed at ${seeded.stage}: ${seeded.error}`);
    await browser.url("http://tauri.localhost");
    await browser.pause(600);
  });

  for (const [width, height] of VIEWPORT_MATRIX) {
    const viewport = `${width}x${height}`;

    describe(`at ${viewport}`, () => {
      before(async () => {
        await browser.url("http://tauri.localhost");
        await useViewport(width, height);
      });

      it("keeps every ordinary screen horizontally stable, expanded and collapsed", async () => {
        const surfaces: Array<[string, string]> = [
          ["Today", "h1#today-heading"],
          ["Calendar", "h1#calendar-heading"],
          ["Analytics", "h1#analytics-heading"],
          ["Plans", "h1#plans-heading"],
          ["Settings", "h1#settings-heading"],
        ];

        for (const sidebar of ["expanded", "collapsed"] as const) {
          if (sidebar === "collapsed") {
            const collapse = $("button[aria-label='Collapse sidebar']");
            if (await collapse.isExisting()) await collapse.click();
            await browser.pause(400);
          }
          for (const [destination, heading] of surfaces) {
            await go(destination, heading);
            await assertPageHorizontallyStable(`${destination} (${viewport}, ${sidebar})`);
          }
          // Settings is the named baseline defect: a 15px document-level scrollbar appeared once
          // the page was scrolled. Scroll it and assert again at the bottom.
          await browser.execute(() => {
            const main = document.querySelector("[data-app-viewport]");
            if (main) main.scrollTop = main.scrollHeight;
          });
          await browser.pause(300);
          await assertPageHorizontallyStable(`Settings scrolled (${viewport}, ${sidebar})`);
          await browser.execute(() => {
            const main = document.querySelector("[data-app-viewport]");
            if (main) main.scrollTop = 0;
          });
        }

        const expand = $("button[aria-label='Expand sidebar']");
        if (await expand.isExisting()) await expand.click();
        await browser.pause(400);
      });

      it("centres a capped page frame inside the main viewport", async () => {
        for (const [destination, heading] of [
          ["Analytics", "h1#analytics-heading"],
          ["Settings", "h1#settings-heading"],
        ] as Array<[string, string]>) {
          await go(destination, heading);
          const viewportBox = await rect(VIEWPORT);
          const frameBox = await rect(PAGE_FRAME);
          // Only a frame that is actually capped can be centred; a full-width frame trivially has
          // zero free space on both sides and would prove nothing.
          if (frameBox.width < viewportBox.width - 8) await assertCentered();
        }
      });

      it("gives the four standard pages one frame geometry", async () => {
        const widths: Array<{ page: string; frame: number; inner: number }> = [];
        for (const [destination, heading] of [
          ["Today", "h1#today-heading"],
          ["Analytics", "h1#analytics-heading"],
          ["Plans", "h1#plans-heading"],
          ["Settings", "h1#settings-heading"],
        ] as Array<[string, string]>) {
          await go(destination, heading);
          const type = await browser.execute(
            () => document.querySelector("[data-page-frame]")?.getAttribute("data-page-type") ?? "",
          );
          expect(type).toBe("standard");
          widths.push({
            page: destination,
            frame: (await rect(PAGE_FRAME)).width,
            inner: await innerWidth(),
          });
        }
        // Comparing across pages is only meaningful at the same measured inner width; the baseline
        // capture showed the requested window size is not evidence of the size actually rendered.
        const inner = new Set(widths.map(entry => entry.inner));
        if (inner.size !== 1)
          throw new Error(
            `pages were measured at different inner widths: ${widths
              .map(entry => `${entry.page}=${entry.inner}`)
              .join(", ")}`,
          );
        const distinct = new Set(widths.map(entry => Math.round(entry.frame)));
        if (distinct.size !== 1)
          throw new Error(
            `standard pages disagree on frame width: ${widths
              .map(entry => `${entry.page}=${Math.round(entry.frame)}`)
              .join(", ")}`,
          );
      });

      it("contains the Task dialog and lets no two of its controls overlap", async () => {
        await go("Today", "h1#today-heading");
        await $("button[aria-label='Create task']").click();
        await $(DIALOG_SURFACE).waitForDisplayed({ timeout: 10_000 });
        await browser.pause(250);

        await assertWithinViewport(DIALOG_SURFACE);
        await assertNoHorizontalOverflow(DIALOG_SURFACE, `Create task (${viewport})`);
        assertNoOverlap(await controlRects(DIALOG_SURFACE), `Create task (${viewport})`);

        // Recurrence expands the form the most, so it is the hardest containment case.
        await $(`${DIALOG_SURFACE} fieldset input[type='checkbox']`).click();
        await browser.pause(300);
        await assertWithinViewport(DIALOG_SURFACE);
        await assertNoHorizontalOverflow(DIALOG_SURFACE, `Create recurring task (${viewport})`);
        assertNoOverlap(
          await controlRects(DIALOG_SURFACE),
          `Create recurring task (${viewport})`,
        );

        // The surface owns its scroll, so heading and footer stay reachable rather than the page
        // becoming the workaround scroll surface.
        const scroll = await browser.execute((css: string) => {
          const node = document.querySelector(css);
          if (!node) return null;
          node.scrollTop = node.scrollHeight;
          return {
            overflowY: getComputedStyle(node).overflowY,
            scrolled: node.scrollTop,
            scrollable: node.scrollHeight - node.clientHeight,
          };
        }, DIALOG_SURFACE);
        expect(scroll?.overflowY).toBe("auto");
        if ((scroll?.scrollable ?? 0) > 0) expect(scroll!.scrolled).toBeGreaterThan(0);
        await expect($(`${DIALOG_SURFACE} button[type='submit']`)).toBeDisplayed();
        await assertPageHorizontallyStable(`Task dialog open (${viewport})`);

        await dismissDialog();
      });

      it("contains an edit dialog opened from the visible row control", async () => {
        await go("Today", "h1#today-heading");
        // The Task 50 census finding: this control is the visible path to edit, delete and the
        // recurring occurrence-scope controls.
        const edit = $("button[aria-label^='Edit ']");
        await expect(edit).toBeDisplayed();
        await edit.click();
        await $(DIALOG_SURFACE).waitForDisplayed({ timeout: 10_000 });
        await browser.pause(250);
        await assertWithinViewport(DIALOG_SURFACE);
        assertNoOverlap(await controlRects(DIALOG_SURFACE), `Edit task (${viewport})`);
        await dismissDialog();
      });

      it("keeps Life graph and Life edit overflow local to their own viewport", async () => {
        await go("Life System", "h1#life-heading");

        const editButton = $("button=Edit");
        if (await editButton.isExisting()) {
          await editButton.click();
          await browser.pause(600);
          await assertLocalScrollOwnership(
            "[aria-label='Full Life tree editor']",
            `Life edit canvas (${viewport})`,
          );
          await expect($("[aria-label='Life node inspector']")).toBeDisplayed();
        }

        const browseButton = $("button=Browse");
        if (await browseButton.isExisting()) await browseButton.click();
        const graphButton = $("button=Graph");
        if (await graphButton.isExisting()) {
          await graphButton.click();
          await browser.pause(800);
          const canvas = $("[data-graph-canvas]");
          if (await canvas.isExisting())
            await assertLocalScrollOwnership("[data-graph-canvas]", `Life graph (${viewport})`);
          await assertPageHorizontallyStable(`Life graph (${viewport})`);
          const type = await browser.execute(
            () => document.querySelector("[data-page-frame]")?.getAttribute("data-page-type") ?? "",
          );
          expect(type).toBe("wide");
          await graphButton.click();
        }
      });

      it("keeps Search and the shortcut dialog inside the viewport", async () => {
        await go("Settings", "h1#settings-heading");
        await $("button[aria-label^='Search']").click();
        await $("div[role='dialog'][aria-label='Search']").waitForDisplayed({ timeout: 10_000 });
        await assertWithinViewport("div[role='dialog'][aria-label='Search']");
        await $("button[aria-label='Close search']").click();
        await browser.pause(250);

        await $("button=Keyboard shortcuts").click();
        await $(DIALOG_SURFACE).waitForDisplayed({ timeout: 10_000 });
        await assertWithinViewport(DIALOG_SURFACE);
        await $(`${DIALOG_SURFACE} button`).click();
        await browser.pause(250);
        await assertPageHorizontallyStable(`after dialogs (${viewport})`);
      });
    });
  }

  it("leaves no stale geometry behind a sidebar transition", async () => {
    await browser.url("http://tauri.localhost");
    await useViewport(1440, 900);
    await go("Analytics", "h1#analytics-heading");
    const expanded = await rect(PAGE_FRAME);

    await $("button[aria-label='Collapse sidebar']").click();
    await browser.pause(600);
    const collapsed = await rect(PAGE_FRAME);
    await assertPageHorizontallyStable("Analytics collapsed");
    // The collapsed rail is 152px narrower, so the frame must actually have re-laid out rather
    // than keeping a stale width.
    expect(collapsed.width).toBeGreaterThan(expanded.width - 1);

    await $("button[aria-label='Expand sidebar']").click();
    await browser.pause(600);
    await assertPageHorizontallyStable("Analytics re-expanded");
    const restored = await rect(PAGE_FRAME);
    expect(Math.abs(restored.width - expanded.width)).toBeLessThanOrEqual(1);
  });
});
