import { $, $$, browser } from "@wdio/globals";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { maximizeAndDescribe } from "../support/spacingAudit.js";

/**
 * Task 51 — MOTION LOCK measurement.
 *
 * Drives real interactions in the real WebView and reads the timings the prototype recorded. No
 * number in the report is estimated: anything the tooling cannot measure is reported absent rather
 * than filled in.
 *
 * Requires a build produced with LIFEWEAVE_PROTOTYPE=1.
 * Run with `pnpm e2e:windows -- task51-motion-lock-capture.e2e.ts`.
 */

const ALT = String.fromCharCode(0xe00a);
const label = process.env.LIFEWEAVE_CAPTURE_LABEL ?? "motion";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputRoot = join(repoRoot, "target", "e2e-artifacts", "task-51-motion", label);

type Report = {
  timings: { name: string; inputToCommit: number; inputToFrame: number }[];
  frameRuns: {
    name: string;
    frames: number;
    longestMs: number;
    p50Ms: number;
    p95Ms: number;
    droppedOver20ms: number;
    durationMs: number;
  }[];
  longTasks: { start: number; duration: number }[];
  longTaskObservable: boolean;
  capabilities: Record<string, boolean>;
};

const runs: { mode: string; report: Report }[] = [];
let environment: Awaited<ReturnType<typeof maximizeAndDescribe>> | null = null;

const read = () => browser.execute(() => window.__lwMotion!.report()) as Promise<Report>;
const reset = () => browser.execute(() => window.__lwMotion!.reset());
const startFrames = (name: string) =>
  browser.execute((n: string) => window.__lwMotion!.startFrameSampling(n), name);
const stopFrames = () => browser.execute(() => window.__lwMotion!.stopFrameSampling());

async function load(state: string, vt = "none") {
  await browser.url(`http://tauri.localhost/prototype.html?state=${state}&vt=${vt}`);
  await browser.pause(800);
  await browser.execute(() => {
    const harness = document.querySelector<HTMLElement>("[data-prototype-harness]");
    if (harness) harness.style.display = "none";
  });
  await reset();
}

/**
 * One pass of every instrumented interaction.
 *
 * Each is repeated so the report carries a spread rather than one lucky sample — a single
 * measurement on a two-core machine says very little.
 */
async function exercise() {
  // 1. Task completion. The check is the highest-frequency control in the product.
  for (let i = 0; i < 6; i += 1) {
    const checks = await $$("[role='listitem'] button[aria-label^='Not evaluated']");
    if (checks.length === 0) break;
    await startFrames("task-complete");
    await checks[0]!.click();
    await browser.pause(420);
    await stopFrames();
  }

  // 2. Row selection, which drives the inspector content.
  for (let i = 0; i < 4; i += 1) {
    const rows = await $$("[role='listitem']");
    if (rows.length <= i + 1) break;
    await rows[i + 1]!.click();
    await browser.pause(280);
  }

  // 3. Layout settling: hiding completed rows removes several at once and the rest resettle.
  for (let i = 0; i < 4; i += 1) {
    await startFrames("layout-settle");
    await $("button[aria-pressed]").click();
    await browser.pause(420);
    await stopFrames();
  }

  // 4. The bounded workspace swap, which is the one View Transition on this screen.
  for (let i = 0; i < 4; i += 1) {
    await startFrames("day-change");
    await $("button[aria-label='Next day']").click();
    await browser.pause(420);
    await stopFrames();
  }

  // 5. Direct manipulation. Alt-drag a row and sample frames across the whole gesture.
  //    The point being measured is that a pointer move does no IPC and no query work.
  const rows = await $$("[role='listitem']");
  if (rows.length > 3) {
    const box = await rows[1]!.getLocation();
    await startFrames("drag");
    await browser.performActions([
      {
        type: "key",
        id: "kb",
        // Alt is held for the whole gesture: the probe is deliberately Alt-drag, so an
        // ordinary click on a row stays an ordinary click.
        actions: [{ type: "keyDown", value: ALT }],
      },
      {
        type: "pointer",
        id: "mouse",
        parameters: { pointerType: "mouse" },
        actions: [
          { type: "pointerMove", duration: 0, x: Math.round(box.x) + 300, y: Math.round(box.y) + 10 },
          { type: "pointerDown", button: 0 },
          ...Array.from({ length: 24 }, (_, step) => ({
            type: "pointerMove" as const,
            duration: 16,
            x: Math.round(box.x) + 300,
            y: Math.round(box.y) + 10 + step * 9,
          })),
          { type: "pointerUp", button: 0 },
        ],
      },
    ]);
    await browser.releaseActions();
    await browser.pause(400);
    await stopFrames();
  }

  // 6. Idle. Today must have no required continuous animation, so an idle window should show
  //    almost no frames at all — the rAF sampler itself is the only thing driving them.
  await startFrames("idle");
  await browser.pause(2000);
  await stopFrames();
}

describe(`Task 51 — motion lock measurement (${label})`, () => {
  before(async function () {
    this.timeout(180_000);
    mkdirSync(outputRoot, { recursive: true });
    await browser.url("http://tauri.localhost/prototype.html");
    environment = await maximizeAndDescribe();
  });

  after(() => {
    writeFileSync(
      join(outputRoot, "motion.json"),
      `${JSON.stringify({ label, environment, runs }, null, 2)}\n`,
      "utf8",
    );
    console.log(`\n=== TASK 51 MOTION LOCK (${label}) ===`);
    console.log(`environment: ${JSON.stringify(environment)}`);
    for (const { mode, report } of runs) {
      console.log(`\n--- ${mode} ---`);
      console.log(`capabilities: ${JSON.stringify(report.capabilities)}`);
      const byName = new Map<string, number[][]>();
      for (const t of report.timings) {
        const bucket = byName.get(t.name) ?? [[], []];
        bucket[0]!.push(t.inputToCommit);
        bucket[1]!.push(t.inputToFrame);
        byName.set(t.name, bucket);
      }
      for (const [name, [commit, frame]] of byName) {
        const stat = (xs: number[]) => {
          const s = [...xs].sort((a, b) => a - b);
          return `n=${s.length} min=${s[0]!.toFixed(1)} p50=${s[Math.floor(s.length / 2)]!.toFixed(1)} max=${s[s.length - 1]!.toFixed(1)}`;
        };
        console.log(`  ${name.padEnd(16)} input→commit ${stat(commit!)}`);
        console.log(`  ${"".padEnd(16)} input→frame  ${stat(frame!)}`);
      }
      for (const run of report.frameRuns) {
        console.log(
          `  frames ${run.name.padEnd(14)} n=${String(run.frames).padStart(3)} p50=${run.p50Ms} p95=${run.p95Ms} longest=${run.longestMs} dropped>20ms=${run.droppedOver20ms} over ${run.durationMs}ms`,
        );
      }
      console.log(
        `  long tasks >50ms: ${report.longTasks.length}${report.longTaskObservable ? "" : " (NOT OBSERVABLE)"}`,
      );
    }
  });

  it("measures normal motion", async function () {
    this.timeout(600_000);
    await load("selected");
    await exercise();
    runs.push({ mode: "normal", report: await read() });
    await browser.saveScreenshot(join(outputRoot, "normal-after.png"));
  });

  /*
   * The three day-change strategies, measured against each other in one run. The first pass of this
   * gate reported ~740 ms for a View Transition; that was an instrumentation defect (the commit
   * effect did not depend on `dayOffset`, so the measurement waited for the next interaction). With
   * that fixed, the comparison below is the real one.
   */
  it("compares day-change strategies", async function () {
    this.timeout(600_000);
    for (const vt of ["none", "document", "element"] as const) {
      await load("selected", vt);
      for (let i = 0; i < 5; i += 1) {
        await startFrames(`day-change:${vt}`);
        await $("button[aria-label='Next day']").click();
        await browser.pause(500);
        await stopFrames();
      }
      runs.push({ mode: `day-change vt=${vt}`, report: await read() });
    }
  });

  it("measures reduced motion", async function () {
    this.timeout(600_000);
    /*
     * `prefers-reduced-motion` is emulated through CDP rather than by changing a Windows setting,
     * so this measures the code path, not the operating system's plumbing. Stated plainly because
     * it is a real limit on what this evidence proves.
     */
    await browser.execute(() => undefined);
    try {
      await (browser as unknown as {
        sendCommandAndGetResult: (cmd: string, args: unknown) => Promise<unknown>;
      }).sendCommandAndGetResult("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
    } catch {
      runs.push({
        mode: "reduced-motion (EMULATION UNAVAILABLE)",
        report: {
          timings: [],
          frameRuns: [],
          longTasks: [],
          longTaskObservable: false,
          capabilities: {},
        },
      });
      return;
    }
    await load("selected");
    const capabilities = await browser.execute(() => window.__lwMotion!.report().capabilities);
    if (!capabilities.reducedMotion) {
      console.log("  reduced-motion emulation did not take effect; reporting as such");
    }
    await exercise();
    runs.push({ mode: "reduced-motion", report: await read() });
    await browser.saveScreenshot(join(outputRoot, "reduced-after.png"));
  });
});
