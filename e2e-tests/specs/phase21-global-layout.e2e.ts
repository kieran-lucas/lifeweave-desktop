import { $, browser, expect } from "@wdio/globals";

import {
  DIALOG_SURFACE,
  PAGE_FRAME,
  VIEWPORT,
  assertCentered,
  assertLocalScrollOwnership,
  assertNoHorizontalOverflow,
  assertNoOverlap,
  assertPageHorizontallyStable,
  assertWithinViewport,
  controlRects,
  rect,
} from "../support/layoutGeometry.js";
import { appLocalDate, seedLayoutFixture } from "../support/layoutFixture.js";
import {
  enterMeasuredViewport,
  findCollisions,
  utilization,
  type AuditViewportRequest,
} from "../support/spacingAudit.js";

/**
 * Phase 21 — global layout invariants (ADR 0044).
 *
 * Search and Analytics are Settings-owned tools. Layout coverage remains unchanged, but the audit
 * reaches Analytics through its preserved Ctrl+3 accelerator and Search through Settings → Tools.
 */

const ESCAPE = String.fromCharCode(0xe00c);
const CONTROL = "\uE009";

const VIEWPORT_MATRIX: Array<{ label: string; request: AuditViewportRequest }> = [
  { label: "maximized", request: null },
  { label: "1280x800", request: { width: 1280, height: 800 } },
  { label: "1280x720", request: { width: 1280, height: 720 } },
  { label: "960x640", request: { width: 960, height: 640 } },
];

async function assertGeometryClean(label: string) {
  const measured = await utilization();
  if (!measured) throw new Error(`${label}: page utilization could not be measured`);
  expect(measured.documentOverflow).toBe(0);
  expect(measured.viewportOverflow).toBe(0);

  const collisions = await findCollisions(label);
  if (collisions.length > 0)
    throw new Error(
      `${label}: ${collisions.length} semantic collision(s): ${collisions
        .slice(0, 8)
        .map(collision =>
          `[${collision.kind}] gap=${collision.gap} ${collision.first} | ${collision.second} @ ${collision.path}`,
        )
        .join("; ")}`,
    );
}

const go = async (destination: string, heading: string) => {
  if (destination === "Analytics") await browser.keys([CONTROL, "3"]);
  else await $(`button[aria-label='${destination}']`).click();
  await $(heading).waitForDisplayed({ timeout: 30_000 });
  await browser.pause(250);
  await assertGeometryClean(destination);
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

const innerWidth = () => browser.execute(() => document.documentElement.clientWidth);

describe("Global layout invariants", () => {
  before(async () => {
    await browser.url("http://tauri.localhost");
    const seeded = await seedLayoutFixture(await appLocalDate());
    if (!seeded.ok)
      throw new Error(`layout fixture seeding failed at ${seeded.stage}: ${seeded.error}`);
    await browser.url("http://tauri.localhost");
    await browser.pause(600);
  });

  for (const { label: viewport, request } of VIEWPORT_MATRIX) {
    describe(`at ${viewport}`, () => {
      before(async () => {
        await browser.url("http://tauri.localhost");
        await enterMeasuredViewport(request);
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
          if (frameBox.width < viewportBox.width - 8) await assertCentered();
        }
      });

      it("gives each page family one frame geometry", async () => {
        const families: Array<{
          type: "wide" | "standard";
          pages: Array<[destination: string, heading: string]>;
        }> = [
          {
            type: "wide",
            pages: [
              ["Today", "h1#today-heading"],
              ["Calendar", "h1#calendar-heading"],
            ],
          },
          {
            type: "standard",
            pages: [
              ["Analytics", "h1#analytics-heading"],
              ["Plans", "h1#plans-heading"],
              ["Settings", "h1#settings-heading"],
            ],
          },
        ];

        for (const family of families) {
          const widths: Array<{ page: string; frame: number; inner: number }> = [];
          for (const [destination, heading] of family.pages) {
            await go(destination, heading);
            const type = await browser.execute(
              () => document.querySelector("[data-page-frame]")?.getAttribute("data-page-type") ?? "",
            );
            expect(type).toBe(family.type);
            widths.push({
              page: destination,
              frame: (await rect(PAGE_FRAME)).width,
              inner: await innerWidth(),
            });
          }
          const inner = new Set(widths.map(entry => entry.inner));
          if (inner.size !== 1)
            throw new Error(
              `${family.type} pages were measured at different inner widths: ${widths
                .map(entry => `${entry.page}=${entry.inner}`)
                .join(", ")}`,
            );
          const distinct = new Set(widths.map(entry => Math.round(entry.frame)));
          if (distinct.size !== 1)
            throw new Error(
              `${family.type} pages disagree on frame width: ${widths
                .map(entry => `${entry.page}=${Math.round(entry.frame)}`)
                .join(", ")}`,
            );
        }
      });

      it("contains the Task dialog and lets no two of its controls overlap", async () => {
        await go("Today", "h1#today-heading");
        await $("button[aria-label='Create task']").click();
        await $(DIALOG_SURFACE).waitForDisplayed({ timeout: 10_000 });
        await browser.pause(250);

        await assertWithinViewport(DIALOG_SURFACE);
        await assertNoHorizontalOverflow(DIALOG_SURFACE, `Create task (${viewport})`);
        assertNoOverlap(await controlRects(DIALOG_SURFACE), `Create task (${viewport})`);
        await assertGeometryClean(`Create task (${viewport})`);

        await $(`${DIALOG_SURFACE} fieldset input[type='checkbox']`).click();
        await browser.pause(300);
        await assertWithinViewport(DIALOG_SURFACE);
        await assertNoHorizontalOverflow(DIALOG_SURFACE, `Create recurring task (${viewport})`);
        assertNoOverlap(
          await controlRects(DIALOG_SURFACE),
          `Create recurring task (${viewport})`,
        );
        await assertGeometryClean(`Create recurring task (${viewport})`);

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
        const edit = $("button[aria-label^='Edit ']");
        await expect(edit).toBeDisplayed();
        await edit.click();
        await $(DIALOG_SURFACE).waitForDisplayed({ timeout: 10_000 });
        await browser.pause(250);
        await assertWithinViewport(DIALOG_SURFACE);
        assertNoOverlap(await controlRects(DIALOG_SURFACE), `Edit task (${viewport})`);
        await assertGeometryClean(`Edit task (${viewport})`);
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
          await assertGeometryClean(`Life edit (${viewport})`);
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
          await assertGeometryClean(`Life graph (${viewport})`);
          await graphButton.click();
        }
      });

      it("keeps Search and the shortcut dialog inside the viewport", async () => {
        await go("Settings", "h1#settings-heading");
        await $("//button[.//strong[normalize-space()='Search']]").click();
        await $("div[role='dialog'][aria-label='Search']").waitForDisplayed({ timeout: 10_000 });
        await assertWithinViewport("div[role='dialog'][aria-label='Search']");
        await assertGeometryClean(`Search dialog (${viewport})`);
        await $("button[aria-label='Close search']").click();
        await browser.pause(250);

        await $("button=Keyboard shortcuts").click();
        await $(DIALOG_SURFACE).waitForDisplayed({ timeout: 10_000 });
        await assertWithinViewport(DIALOG_SURFACE);
        await assertGeometryClean(`Shortcut dialog (${viewport})`);
        await $(`${DIALOG_SURFACE} button`).click();
        await browser.pause(250);
        await assertPageHorizontallyStable(`after dialogs (${viewport})`);
      });
    });
  }

  it("leaves no stale geometry behind a sidebar transition", async () => {
    await browser.url("http://tauri.localhost");
    await enterMeasuredViewport(null);
    await go("Analytics", "h1#analytics-heading");
    const expanded = await rect(PAGE_FRAME);

    await $("button[aria-label='Collapse sidebar']").click();
    await browser.pause(600);
    const collapsed = await rect(PAGE_FRAME);
    await assertPageHorizontallyStable("Analytics collapsed");
    await assertGeometryClean("Analytics collapsed");
    expect(collapsed.width).toBeGreaterThan(expanded.width - 1);

    await $("button[aria-label='Expand sidebar']").click();
    await browser.pause(600);
    await assertPageHorizontallyStable("Analytics re-expanded");
    await assertGeometryClean("Analytics re-expanded");
    const restored = await rect(PAGE_FRAME);
    expect(Math.abs(restored.width - expanded.width)).toBeLessThanOrEqual(1);
  });
});
