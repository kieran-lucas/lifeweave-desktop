import { $, browser } from "@wdio/globals";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { appLocalDate, seedLayoutFixture } from "../support/layoutFixture.js";
import {
  enterAuditViewport,
  findCollisions,
  requestedViewport,
  utilization,
  type Collision,
} from "../support/spacingAudit.js";

/**
 * Task 50 follow-up — maximized-window layout audit.
 *
 * Reports rather than asserts, so it can be run repeatedly against a UI that is being fixed. The
 * canonical presentation is a real Windows window maximized to the usable work area, not a
 * requested pixel size; the measured viewport is the authority and nothing here hard-codes one.
 *
 * Run with `pnpm e2e:windows -- task50b-maximized-audit.e2e.ts`. Set
 * `LIFEWEAVE_AUDIT_LABEL=pass2` for a later pass.
 */

const ESCAPE = String.fromCharCode(0xe00c);
const viewport = requestedViewport();
const label =
  process.env.LIFEWEAVE_AUDIT_LABEL ??
  (viewport ? `${viewport.width}x${viewport.height}` : "pass1");
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputRoot = join(repoRoot, "target", "e2e-artifacts", "task-50b", label);

type ScreenRecord = {
  screen: string;
  utilization: Awaited<ReturnType<typeof utilization>>;
  collisions: Collision[];
  note?: string;
};

const records: ScreenRecord[] = [];
let environment: Awaited<ReturnType<typeof enterAuditViewport>> | null = null;
let lifeAreaId = "";
let lifeDocumentedChildId = "";

const shot = async (name: string) => {
  await browser.saveScreenshot(join(outputRoot, `${name}.png`));
};

async function capture(screen: string, file: string, note?: string) {
  await browser.pause(350);
  const record: ScreenRecord = {
    screen,
    utilization: await utilization(),
    collisions: await findCollisions(screen),
  };
  if (note) record.note = note;
  records.push(record);
  await shot(file);
}

const go = async (destination: string, heading: string) => {
  await $(`button[aria-label='${destination}']`).click();
  await $(heading).waitForDisplayed({ timeout: 30_000 });
  await browser.pause(300);
};

const tab = async (name: string) => {
  await $(`#task-tab-${name}`).click();
  await browser.pause(600);
};

const dismiss = async () => {
  const dialog = $("[role='dialog'][aria-modal='true']");
  if (await dialog.isExisting()) {
    const cancel = dialog.$("button=Cancel");
    if (await cancel.isExisting()) await cancel.click();
    else await browser.keys(ESCAPE);
    await browser.pause(300);
  }
};

const tryClick = async (selector: string) => {
  const element = $(selector);
  if ((await element.isExisting()) && (await element.isDisplayed())) {
    await element.click();
    await browser.pause(500);
    return true;
  }
  return false;
};

describe(`Task 50 follow-up — maximized layout audit (${label})`, () => {
  before(async function () {
    this.timeout(300_000);
    mkdirSync(outputRoot, { recursive: true });
    await browser.url("http://tauri.localhost");
    environment = await enterAuditViewport();
    const seeded = await seedLayoutFixture(await appLocalDate());
    if (!seeded.ok) throw new Error(`fixture seeding failed at ${seeded.stage}: ${seeded.error}`);
    lifeAreaId = seeded.lifeRootChildId;
    lifeDocumentedChildId = seeded.lifeDocumentedChildId;
    await browser.url("http://tauri.localhost");
    await browser.pause(700);
    /*
     * Re-assert the audited presentation after the reload.
     *
     * In canonical mode this re-maximizes, as it always has. In explicit-viewport mode it re-applies
     * and re-verifies the requested size — the previous attempt re-maximized unconditionally here,
     * which silently discarded the requested viewport and measured a maximized window while
     * reporting a small one.
     */
    environment = await enterAuditViewport();
  });

  after(() => {
    const collisions = records.flatMap(r => r.collisions);
    writeFileSync(
      join(outputRoot, "audit.json"),
      `${JSON.stringify({ label, environment, records }, null, 2)}\n`,
      "utf8",
    );
    const byKind = collisions.reduce<Record<string, number>>((acc, c) => {
      acc[c.kind] = (acc[c.kind] ?? 0) + 1;
      return acc;
    }, {});
    // Printed so the run log itself carries the finding, not only the artifact.
    console.log(`\n=== MAXIMIZED AUDIT (${label}) ===`);
    console.log(
      `mode: ${environment?.mode ?? "?"}  requested: ${
        environment?.requested ? `${environment.requested.width}x${environment.requested.height}` : "maximized"
      }  achieved: ${environment?.innerWidth}x${environment?.innerHeight} @ DPR ${environment?.devicePixelRatio}`,
    );
    console.log(`environment: ${JSON.stringify(environment)}`);
    console.log(`screens: ${records.length}  collisions: ${collisions.length} ${JSON.stringify(byKind)}`);
    for (const record of records) {
      const u = record.utilization;
      console.log(
        `- ${record.screen.padEnd(24)} type=${u?.pageType ?? "-"} frame=${u?.frameWidth ?? "-"}/${u?.innerWidth ?? "-"} ratio=${u?.ratio ?? "-"} docOv=${u?.documentOverflow ?? "-"} vpOv=${u?.viewportOverflow ?? "-"} collisions=${record.collisions.length}`,
      );
      for (const c of record.collisions.slice(0, 8))
        console.log(`    [${c.kind}] gap=${c.gap} space=${c.literalSpace} ${c.first} | ${c.second}  @ ${c.path}`);
    }
  });

  it("walks every surface with the window maximized", async function () {
    this.timeout(900_000);

    await go("Today", "h1#today-heading");
    await capture("today--unselected", "01-today");

    /*
     * Today with the production context inspector open.
     *
     * Selection is semantic, not coordinate-based: the first seeded row carries `data-task-id`, and
     * clicking it is exactly what a user does. The wait is on the inspector's own accessible name
     * rather than on a fixed pause, because the inspector is lazily imported and an arbitrary
     * timeout would either flake or hide a slow load.
     *
     * This asserts the *production* inspector — `aside[aria-label^="Details for"]` exists only in
     * `features/task/today/TaskInspector.tsx`, never in the isolated prototype.
     */
    /*
     * Click the row's *title*, not the row's centre.
     *
     * The row selects on click, but its Life-area and Focus-Plan chips are buttons that correctly
     * `stopPropagation`, and on the seeded fixture a long Focus-Plan chip sits across the middle of
     * the row — so a naive centre-click lands on the chip and selects nothing. The title is inert
     * and bubbles to the row, which is what a user clicking the task name actually does.
     */
    const firstRow = $("[role='listitem'][data-task-id] strong");
    if (await firstRow.isExisting()) {
      await firstRow.click();
      const inspector = $("aside[aria-label^='Details for']");
      await inspector.waitForDisplayed({ timeout: 15_000 });
      await capture("today--selected", "01b-today-selected");

      // Each inspector facet is a separate composition and each is measured.
      for (const facet of ["Details", "Time", "Links"]) {
        const tab = $(`[role='tab']=${facet}`);
        if (await tab.isExisting()) {
          await tab.click();
          await browser.pause(250);
          await capture(`today--selected-${facet.toLowerCase()}`, `01c-today-${facet.toLowerCase()}`);
        }
      }

      const close = $("button[aria-label='Close details']");
      if (await close.isExisting()) {
        await close.click();
        await browser.pause(300);
      }
    } else {
      records.push({
        screen: "today--selected",
        utilization: null,
        collisions: [],
        note: "NOT TESTED: no seeded row exposed data-task-id",
      });
    }

    if (await tryClick("button[aria-label='Create task']")) {
      await capture("task-create", "02-task-create");
      if (await tryClick("[data-dialog-surface] fieldset input[type='checkbox']"))
        await capture("task-recurring", "03-task-recurring");
      await dismiss();
    }
    if (await tryClick("button[aria-label^='Edit ']")) {
      await capture("task-edit", "04-task-edit");
      await dismiss();
    }

    await tab("upcoming");
    await capture("upcoming", "05-upcoming");
    await tab("overdue");
    await capture("overdue", "06-overdue");
    await tab("deadlines");
    await capture("deadlines", "07-deadlines");
    await tab("views");
    await capture("saved-views", "08-saved-views");
    await tab("today");

    await go("Calendar", "h1#calendar-heading");
    await capture("calendar", "09-calendar");

    await go("Analytics", "h1#analytics-heading");
    await capture("analytics", "10-analytics");

    await go("Plans", "h1#plans-heading");
    await capture("plans", "11-plans");
    const seededPlan = $("aside[aria-label='active plans'] button");
    if (await seededPlan.isExisting()) {
      await seededPlan.waitForEnabled({ timeout: 15_000 });
      await seededPlan.click();
      await $("fieldset").waitForDisplayed({ timeout: 15_000 });
      await capture("plans--selected", "11b-plans-selected");
    } else {
      records.push({
        screen: "plans--selected",
        utilization: null,
        collisions: [],
        note: "NOT TESTED: seeded active plan was not reachable",
      });
    }

    await go("Life System", "h1#life-heading");
    await capture("life-browse", "12-life-browse");
    if (await tryClick("button=Edit")) await capture("life-edit", "13-life-edit");
    if (await tryClick("button=Pinned")) await capture("life-pinned", "14-life-pinned");
    if (await tryClick("button=Browse")) {
      if (await tryClick("button=Graph")) {
        await capture("life-graph", "15-life-graph");
        await tryClick("button=Graph");
      }
    }
    /*
     * The documented leaf is a child of the seeded Layout Area, not a direct child of `life-root`.
     * Browse intentionally renders only the focal node and its direct children, so the audit must
     * traverse both real UI levels. The fixture returns both stable IDs; no title matching or raw
     * navigation shortcut can accidentally bypass the production Browse interaction.
     */
    const areaCard = $(`[data-life-id='${lifeAreaId}']`);
    await areaCard.waitForDisplayed({ timeout: 15_000 });
    await areaCard.click();
    const leafCard = $(`[data-life-id='${lifeDocumentedChildId}']`);
    await leafCard.waitForDisplayed({ timeout: 15_000 });
    await leafCard.waitForEnabled({ timeout: 15_000 });
    await leafCard.click();
    await $("h1#life-reader-title").waitForDisplayed({ timeout: 15_000 });
    await capture("life-reader", "16-life-reader");

    // Enter and leave without editing or saving; this exercises only presentation/navigation.
    await $("button=Edit document").click();
    await $("section[aria-label='Document editor']").waitForDisplayed({ timeout: 30_000 });
    await capture("basic-editor", "17-basic-editor");
    const editorSurface = $("section[aria-label='Document editor']");
    await editorSurface.$("button=Link").click();
    await $("[role='dialog']").waitForDisplayed({ timeout: 15_000 });
    await capture("basic-editor--link-dialog", "17b-basic-editor-link-dialog");
    await browser.keys(ESCAPE);
    await editorSurface.$("button=Link").waitForDisplayed({ timeout: 15_000 });
    await $("button=Back to Reader").click();
    await $("button=Edit document").waitForDisplayed({ timeout: 15_000 });
    await $("button*=Back to Life Browse").click();
    await $("h1#life-heading").waitForDisplayed({ timeout: 15_000 });

    await go("Settings", "h1#settings-heading");
    await capture("settings-top", "18-settings");
    await browser.execute(() => {
      const main = document.querySelector("[data-app-viewport]");
      if (main) main.scrollTop = main.scrollHeight / 2;
    });
    await capture("settings-tags", "19-settings-tags");
    await browser.execute(() => {
      const main = document.querySelector("[data-app-viewport]");
      if (main) main.scrollTop = main.scrollHeight;
    });
    await capture("settings-foundation", "20-settings-foundation");
    await browser.execute(() => {
      const main = document.querySelector("[data-app-viewport]");
      if (main) main.scrollTop = 0;
    });

    if (await tryClick("button[aria-label^='Search']")) {
      await capture("search", "21-search");
      await tryClick("button[aria-label='Close search']");
    }
    if (await tryClick("button=Keyboard shortcuts")) {
      await capture("keyboard-help", "22-keyboard-help");
      await dismiss();
    }
    if (await tryClick("button=Create backup")) {
      await browser.pause(3000);
      await capture("backup-settings", "23-backup");
    }

    // Collapsed sidebar is the second canonical shell state.
    await tryClick("button[aria-label='Collapse sidebar']");
    await go("Today", "h1#today-heading");
    await capture("today-collapsed", "24-today-collapsed");
    await go("Analytics", "h1#analytics-heading");
    await capture("analytics-collapsed", "25-analytics-collapsed");
    await tryClick("button[aria-label='Expand sidebar']");
  });
});
