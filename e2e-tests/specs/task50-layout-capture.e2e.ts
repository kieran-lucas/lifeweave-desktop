import { $, browser } from "@wdio/globals";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { VIEWPORT_MATRIX, useViewport } from "../support/layoutGeometry.js";
import { appLocalDate, seedLayoutFixture } from "../support/layoutFixture.js";

/**
 * Task 50 layout capture — evidence tooling, not a gate.
 *
 * Search and Analytics are Settings-owned in the current IA. Analytics keeps Ctrl+3 as its direct
 * entry path, while Search is opened through Settings → Tools.
 */

const ESCAPE = String.fromCharCode(0xe00c);
const CONTROL = "\uE009";
const label = process.env.LIFEWEAVE_LAYOUT_CAPTURE_LABEL ?? "baseline";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputRoot = join(repoRoot, "target", "e2e-artifacts", "task-50", label);

type Measurement = {
  screen: string;
  viewport: string;
  sidebar: string;
  innerWidth: number;
  innerHeight: number;
  rootOverflow: number;
  rootHeightOverflow: number;
  viewportOverflow: number;
  frameSelector: string;
  frameWidth: number;
  frameLeftFree: number;
  frameRightFree: number;
  frameImbalance: number;
  controlCount: number;
  overlaps: string[];
  notes: string[];
};

const records: Measurement[] = [];
const blank = (screen: string, notes: string[]): Measurement => ({
  screen,
  viewport: "-",
  sidebar: "-",
  innerWidth: 0,
  innerHeight: 0,
  rootOverflow: 0,
  rootHeightOverflow: 0,
  viewportOverflow: 0,
  frameSelector: "-",
  frameWidth: 0,
  frameLeftFree: 0,
  frameRightFree: 0,
  frameImbalance: 0,
  controlCount: 0,
  overlaps: [],
  notes,
});

const round = (value: number) => Math.round(value * 100) / 100;

async function measure(screen: string, viewport: string, sidebar: string) {
  const value = await browser.execute(() => {
    const root = document.documentElement;
    const main = document.querySelector("main");
    const explicit = document.querySelector("[data-page-frame]");
    const frameNode =
      explicit ??
      main?.querySelector(":scope > section, :scope > div > section, :scope > div") ??
      main;
    const notes: string[] = [];
    let frameWidth = 0;
    let leftFree = 0;
    let rightFree = 0;
    if (main && frameNode) {
      const mainBox = main.getBoundingClientRect();
      const frameBox = frameNode.getBoundingClientRect();
      const style = getComputedStyle(main);
      const innerLeft = mainBox.left + parseFloat(style.paddingLeft);
      const innerRight = mainBox.right - parseFloat(style.paddingRight);
      frameWidth = frameBox.width;
      leftFree = frameBox.left - innerLeft;
      rightFree = innerRight - frameBox.right;
    } else {
      notes.push("no main viewport element found");
    }

    const container =
      document.querySelector("[role='dialog'][aria-modal='true']") ?? main ?? document.body;
    const nodes = [
      ...container.querySelectorAll<HTMLElement>(
        "input:not([type='hidden']), select, textarea, button",
      ),
    ].filter(node => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return (
        box.width > 0 &&
        box.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    });
    const outer = nodes.filter(
      node => !nodes.some(other => other !== node && other.contains(node)),
    );
    const named = outer.map(node => ({
      name: (
        node.getAttribute("aria-label") ??
        node.closest("label")?.textContent?.trim() ??
        node.textContent?.trim() ??
        node.tagName.toLowerCase()
      ).slice(0, 44),
      box: node.getBoundingClientRect(),
    }));
    const overlaps: string[] = [];
    for (let i = 0; i < named.length; i += 1)
      for (let j = i + 1; j < named.length; j += 1) {
        const a = named[i]!.box;
        const b = named[j]!.box;
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (x > 1 && y > 1) overlaps.push(`${named[i]!.name} × ${named[j]!.name}`);
      }

    if (root.scrollWidth > root.clientWidth + 1 || root.scrollHeight > root.clientHeight + 1) {
      const describe = (node: Element) =>
        `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}${
          node.className && typeof node.className === "string"
            ? `.${node.className.trim().split(/\s+/).slice(0, 2).join(".")}`
            : ""
        }`;
      for (const node of document.querySelectorAll("*")) {
        const box = node.getBoundingClientRect();
        if (box.width === 0 && box.height === 0) continue;
        if (box.right > root.clientWidth + 1)
          notes.push(
            `wider than root: ${describe(node)} right=${Math.round(box.right)} vs ${root.clientWidth}`,
          );
        if (box.bottom > root.clientHeight + 1 && node.closest("main") === null)
          notes.push(
            `taller than root outside main: ${describe(node)} bottom=${Math.round(box.bottom)} vs ${root.clientHeight}`,
          );
        if (notes.length > 12) break;
      }
      const style = getComputedStyle(document.querySelector("body > div > div") ?? document.body);
      notes.push(`appRoot computed width=${style.width}`);
    }

    return {
      innerWidth: root.clientWidth,
      innerHeight: root.clientHeight,
      rootOverflow: root.scrollWidth - root.clientWidth,
      rootHeightOverflow: root.scrollHeight - root.clientHeight,
      viewportOverflow: main ? main.scrollWidth - main.clientWidth : 0,
      frameSelector: explicit ? "[data-page-frame]" : "main first content element",
      frameWidth,
      leftFree,
      rightFree,
      controlCount: outer.length,
      overlaps: overlaps.slice(0, 30),
      notes,
    };
  });

  records.push({
    screen,
    viewport,
    sidebar,
    innerWidth: value.innerWidth,
    innerHeight: value.innerHeight,
    rootOverflow: value.rootOverflow,
    rootHeightOverflow: value.rootHeightOverflow,
    viewportOverflow: value.viewportOverflow,
    frameSelector: value.frameSelector,
    frameWidth: round(value.frameWidth),
    frameLeftFree: round(value.leftFree),
    frameRightFree: round(value.rightFree),
    frameImbalance: round(Math.abs(value.leftFree - value.rightFree)),
    controlCount: value.controlCount,
    overlaps: value.overlaps,
    notes: value.notes,
  });

  const safe = `${screen}-${viewport}-${sidebar}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  await browser.saveScreenshot(join(outputRoot, `${safe}.png`));
}

const go = async (destination: string, heading: string) => {
  if (destination === "Analytics") await browser.keys([CONTROL, "3"]);
  else await $(`button[aria-label='${destination}']`).click();
  await $(heading).waitForDisplayed({ timeout: 30_000 });
  await browser.pause(350);
};

const dismissDialog = async () => {
  const dialog = $("[role='dialog'][aria-modal='true']");
  if (await dialog.isExisting()) {
    await browser.keys(ESCAPE);
    await browser.pause(250);
  }
  if (await dialog.isExisting()) {
    const cancel = dialog.$("button=Cancel");
    if (await cancel.isExisting()) await cancel.click();
    await browser.pause(250);
  }
};

const tryClick = async (selector: string, note: string) => {
  const element = $(selector);
  if ((await element.isExisting()) && (await element.isDisplayed())) {
    await element.click();
    await browser.pause(450);
    return true;
  }
  records.push(blank(`SKIPPED ${note}`, [`selector not reachable: ${selector}`]));
  return false;
};

async function walk(viewport: string, sidebar: string) {
  await go("Today", "h1#today-heading");
  await measure("today", viewport, sidebar);

  if (await tryClick("button[aria-label='Create task']", "create task dialog")) {
    await measure("create-task", viewport, sidebar);
    if (
      await tryClick(
        "[role='dialog'] fieldset input[type='checkbox']",
        "recurring toggle",
      )
    )
      await measure("create-task-recurring", viewport, sidebar);
    await dismissDialog();
  }

  await go("Calendar", "h1#calendar-heading");
  await measure("calendar", viewport, sidebar);

  await go("Analytics", "h1#analytics-heading");
  await measure("analytics", viewport, sidebar);

  await go("Plans", "h1#plans-heading");
  await measure("plans", viewport, sidebar);

  await go("Life System", "h1");
  await measure("life-browse", viewport, sidebar);
  if (await tryClick("button=Edit", "life edit")) await measure("life-edit", viewport, sidebar);
  if (await tryClick("button=Pinned", "life pinned"))
    await measure("life-pinned", viewport, sidebar);
  if (await tryClick("button=Browse", "life browse")) {
    if (await tryClick("button=Graph", "life graph")) {
      await measure("life-graph", viewport, sidebar);
      await tryClick("button=Graph", "life graph close");
    }
  }

  await go("Settings", "h1#settings-heading");
  await measure("settings-top", viewport, sidebar);
  await browser.execute(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = main.scrollHeight;
  });
  await browser.pause(300);
  await measure("settings-foundation", viewport, sidebar);
  await browser.execute(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  });

  if (await tryClick("//button[.//strong[normalize-space()='Search']]", "settings search")) {
    await measure("global-search", viewport, sidebar);
    await dismissDialog();
  }
  if (await tryClick("button=Keyboard shortcuts", "shortcut help")) {
    await measure("shortcut-help", viewport, sidebar);
    await dismissDialog();
  }
}

describe(`Task 50 layout capture (${label})`, () => {
  before(() => {
    mkdirSync(outputRoot, { recursive: true });
  });

  after(() => {
    writeFileSync(
      join(outputRoot, "geometry.json"),
      `${JSON.stringify({ label, capturedAt: new Date().toISOString(), records }, null, 2)}\n`,
      "utf8",
    );
  });

  it("captures the empty state, then seeds every surface", async function () {
    this.timeout(600_000);
    await browser.url("http://tauri.localhost");
    const inner = await useViewport(1440, 900);
    records.push(
      blank("VIEWPORT 1440x900", [
        `measured inner ${inner.innerWidth}x${inner.innerHeight} for requested outer 1440x900`,
      ]),
    );

    await go("Today", "h1#today-heading");
    await measure("today-empty", "1440x900", "expanded");
    await go("Analytics", "h1#analytics-heading");
    await measure("analytics-empty", "1440x900", "expanded");
    await go("Plans", "h1#plans-heading");
    await measure("plans-empty", "1440x900", "expanded");

    const seeded = await seedLayoutFixture(await appLocalDate());
    records.push(
      blank("SEED", [
        `ok=${seeded.ok} stage=${seeded.stage} tasks=${seeded.taskCount} error=${seeded.error}`,
      ]),
    );
    if (!seeded.ok) throw new Error(`layout fixture seeding failed at ${seeded.stage}: ${seeded.error}`);
    await browser.url("http://tauri.localhost");
    await browser.pause(600);
  });

  for (const [width, height] of VIEWPORT_MATRIX) {
    const viewport = `${width}x${height}`;

    it(`captures every populated surface at ${viewport}`, async function () {
      this.timeout(900_000);
      await browser.url("http://tauri.localhost");
      const inner = await useViewport(width, height);
      records.push(
        blank(`VIEWPORT ${viewport}`, [
          `measured inner ${inner.innerWidth}x${inner.innerHeight} for requested outer ${viewport}`,
        ]),
      );

      await walk(viewport, "expanded");

      await tryClick("button[aria-label='Collapse sidebar']", "collapse sidebar");
      await go("Today", "h1#today-heading");
      await measure("today", viewport, "collapsed");
      await go("Analytics", "h1#analytics-heading");
      await measure("analytics", viewport, "collapsed");
      await go("Settings", "h1#settings-heading");
      await measure("settings-top", viewport, "collapsed");
      await tryClick("button[aria-label='Expand sidebar']", "expand sidebar");
    });
  }
});
