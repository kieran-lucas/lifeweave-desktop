import { browser } from "@wdio/globals";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { findCollisions, maximizeAndDescribe, type Collision } from "../support/spacingAudit.js";

/**
 * Task 51 — VISUAL LOCK capture.
 *
 * Renders the isolated prototype at `/prototype.html` in the real WebView2, at the canonical
 * maximized viewport and at the three additional required sizes, and captures every Light lock state.
 *
 * It reuses the Task 50 semantic-collision detector deliberately: the composition is new, so the
 * evidence that it does not reintroduce `Morning04:00–12:00`-class defects has to be measured
 * rather than assumed from the fact that it looks right.
 *
 * Requires a build produced with LIFEWEAVE_PROTOTYPE=1 so `prototype.html` exists in `dist`.
 * Run with `pnpm e2e:windows -- task51-visual-lock-capture.e2e.ts`.
 */

const label = process.env.LIFEWEAVE_CAPTURE_LABEL ?? "pass1";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputRoot = join(repoRoot, "target", "e2e-artifacts", "task-51", label);

const states = ["populated", "selected", "dense", "empty", "timer"] as const;

/** The canonical lock size is whatever the maximized window actually measures, never a request. */
const extraViewports = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "960x640", width: 960, height: 640 },
];

type Record_ = {
  state: string;
  viewport: string;
  inner: { width: number; height: number };
  collisions: Collision[];
  overflow: { document: number; workspace: number };
  enclosureDepth: number;
};

const records: Record_[] = [];
let environment: Awaited<ReturnType<typeof maximizeAndDescribe>> | null = null;

async function enclosureDepth(): Promise<number> {
  return browser.execute(() => {
    const root = document.querySelector<HTMLElement>("[data-prototype-harness]")?.parentElement;
    if (!root) return -1;

    const encloses = (node: Element): boolean => {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const box = node.getBoundingClientRect();
      if (box.width < 24 || box.height < 16) return false;
      const hasBorder = ["Top", "Right", "Bottom", "Left"].filter((side) => {
        const width = parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`));
        const colour = style.getPropertyValue(`border-${side.toLowerCase()}-color`);
        return width > 0 && colour !== "rgba(0, 0, 0, 0)" && colour !== "transparent";
      }).length;
      if (hasBorder >= 3) return true;
      if (style.boxShadow !== "none" && !style.boxShadow.startsWith("inset")) return true;
      const bg = style.backgroundColor;
      if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        const parent = node.parentElement;
        if (parent && getComputedStyle(parent).backgroundColor !== bg) return true;
      }
      return false;
    };

    let deepest = 0;
    const walk = (node: Element, depth: number) => {
      const next = encloses(node) ? depth + 1 : depth;
      if (next > deepest) deepest = next;
      for (const child of Array.from(node.children)) {
        if (child.hasAttribute("data-prototype-harness")) continue;
        walk(child, next);
      }
    };
    walk(root, 0);
    return deepest;
  });
}

async function overflow() {
  return browser.execute(() => {
    const doc = document.documentElement;
    const main = document.querySelector<HTMLElement>("main");
    return {
      document: Math.max(0, doc.scrollWidth - doc.clientWidth),
      workspace: main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0,
    };
  });
}

async function show(state: string) {
  await browser.url(`http://tauri.localhost/prototype.html?state=${state}`);
  await browser.pause(700);
  await browser.execute(() => {
    const harness = document.querySelector<HTMLElement>("[data-prototype-harness]");
    if (harness) harness.style.display = "none";
  });
  await browser.pause(120);
}

async function capture(state: string, viewport: string) {
  const inner = await browser.execute(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  records.push({
    state,
    viewport,
    inner,
    collisions: await findCollisions(`${state}@${viewport}`),
    overflow: await overflow(),
    enclosureDepth: await enclosureDepth(),
  });
  await browser.saveScreenshot(join(outputRoot, `${viewport}--${state}.png`));
}

describe(`Task 51 — visual lock capture (${label})`, () => {
  before(async function () {
    this.timeout(180_000);
    mkdirSync(outputRoot, { recursive: true });
    await browser.url("http://tauri.localhost/prototype.html");
    environment = await maximizeAndDescribe();
  });

  after(() => {
    const collisions = records.flatMap((r) => r.collisions);
    writeFileSync(
      join(outputRoot, "capture.json"),
      `${JSON.stringify({ label, environment, records }, null, 2)}\n`,
      "utf8",
    );
    console.log(`\n=== TASK 51 VISUAL LOCK CAPTURE (${label}) ===`);
    console.log(`environment: ${JSON.stringify(environment)}`);
    console.log(`captures: ${records.length}  collisions: ${collisions.length}`);
    const worstDepth = Math.max(...records.map((r) => r.enclosureDepth));
    console.log(`deepest enclosure chain across all captures: ${worstDepth}`);
    for (const r of records) {
      console.log(
        `- ${r.viewport.padEnd(10)} ${r.state.padEnd(14)} inner=${r.inner.width}x${r.inner.height} ` +
          `docOv=${r.overflow.document} wsOv=${r.overflow.workspace} enclosure=${r.enclosureDepth} ` +
          `collisions=${r.collisions.length}`,
      );
      for (const c of r.collisions.slice(0, 6))
        console.log(`    [${c.kind}] gap=${c.gap} ${c.first} | ${c.second}`);
    }
  });

  it("captures every Light lock state at the canonical maximized viewport", async function () {
    this.timeout(600_000);
    for (const state of states) {
      await show(state);
      await capture(state, "maximized");
    }
  });

  it("captures the selected state at every additional supported viewport", async function () {
    this.timeout(600_000);
    for (const viewport of extraViewports) {
      await browser.setWindowRect(null, null, viewport.width, viewport.height);
      await browser.pause(400);
      for (const state of ["selected", "dense"] as const) {
        await show(state);
        await capture(state, viewport.name);
      }
    }
  });
});
