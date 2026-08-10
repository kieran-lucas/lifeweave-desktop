import { $, browser } from "@wdio/globals";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { appLocalDate, seedLayoutFixture } from "../support/layoutFixture.js";
import {
  capturedBranchDownload,
  chooseBranchFile,
  installBranchDownloadCapture,
} from "../support/lifeBranch.js";
import {
  capturedTreeDownload,
  chooseTreeFile,
  installTreeDownloadCapture,
} from "../support/lifeTree.js";
import {
  enterAuditViewport,
  findCollisions,
  requestedViewport,
  utilization,
  type Collision,
} from "../support/spacingAudit.js";
import {
  profileGroups,
  profileIncludes,
  requestedVisualAuditProfile,
} from "../support/visualAuditProfiles.js";

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
const auditProfile = requestedVisualAuditProfile();
const baseLabel =
  process.env.LIFEWEAVE_AUDIT_LABEL ??
  (viewport ? `${viewport.width}x${viewport.height}` : "pass1");
const label = auditProfile === "full" ? baseLabel : `${auditProfile}-${baseLabel}`;
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputRoot = join(repoRoot, "target", "e2e-artifacts", "task-50b", label);
const visualRegression = process.env.LIFEWEAVE_VISUAL_REGRESSION === "1";
const visualTagFilter = process.env.LIFEWEAVE_VISUAL_TAGS
  ? new Set(process.env.LIFEWEAVE_VISUAL_TAGS.split(",").map(tag => tag.trim()).filter(Boolean))
  : null;
const requestedTheme = process.env.LIFEWEAVE_AUDIT_THEME ?? "light";
if (requestedTheme !== "light" && requestedTheme !== "dark")
  throw new Error(`Unsupported LIFEWEAVE_AUDIT_THEME: ${requestedTheme}`);
const forcedColors = process.env.LIFEWEAVE_AUDIT_FORCED_COLORS === "1";
const reducedMotion = process.env.LIFEWEAVE_AUDIT_REDUCED_MOTION === "1";
if ([requestedTheme === "dark", forcedColors, reducedMotion].filter(Boolean).length > 1)
  throw new Error("Dark, forced-colors, and reduced-motion audits must run independently");
const mediaMode = requestedTheme === "dark"
  ? "dark"
  : forcedColors
    ? "forced-colors"
    : reducedMotion
      ? "reduced-motion"
      : "light";
const requestedLanguage = process.env.LIFEWEAVE_AUDIT_LANGUAGE ?? "en";
if (requestedLanguage !== "en" && requestedLanguage !== "vi")
  throw new Error(`Unsupported LIFEWEAVE_AUDIT_LANGUAGE: ${requestedLanguage}`);
if (requestedLanguage === "vi" && mediaMode !== "light")
  throw new Error("The Vietnamese typography audit must run independently in the light theme");
const lightVisualSnapshotFiles = new Set([
  "01-today",
  "01d-today-running-timer",
  "01e-today-assessment",
  "02-task-create",
  "02b-task-tags",
  "02c-task-life-area",
  "02d-task-focus-plan",
  "09-calendar",
  "10-analytics",
  "11-plans",
  "12-life-browse",
  "13-life-edit",
  "13b-life-tree-import",
  "13c-life-branch-import",
  "14-life-pinned",
  "15-life-graph",
  "16-life-reader",
  "16b-life-link-dialog",
  "16c-life-empty",
  "16d-markdown-import",
  "16e-portable-import",
  "17-basic-editor",
  "17b-basic-editor-link-dialog",
  "18-narrative-reader",
  "19-narrative-studio",
  "19b-narrative-only-block-dialog",
  "19c-narrative-paper",
  "19d-narrative-sakura",
  "19e-narrative-aurora",
  "19f-narrative-nocturne",
  "19g-narrative-dirty-exit",
  "08b-saved-view-editor",
  "18-settings",
  "21b-search-results",
  "21c-search-no-results",
  "22-keyboard-help",
]);
const darkVisualSnapshotFiles = new Set([
  "01-today",
  "01d-today-running-timer",
  "01e-today-assessment",
  "02-task-create",
  "02b-task-tags",
  "02c-task-life-area",
  "02d-task-focus-plan",
  "09-calendar",
  "10-analytics",
  "11-plans",
  "12-life-browse",
  "13b-life-tree-import",
  "13c-life-branch-import",
  "15-life-graph",
  "16-life-reader",
  "16b-life-link-dialog",
  "16c-life-empty",
  "16d-markdown-import",
  "16e-portable-import",
  "17-basic-editor",
  "17b-basic-editor-link-dialog",
  "18-narrative-reader",
  "19-narrative-studio",
  "19c-narrative-paper",
  "19d-narrative-sakura",
  "19e-narrative-aurora",
  "19f-narrative-nocturne",
  "19g-narrative-dirty-exit",
  "08b-saved-view-editor",
  "18-settings",
  "21b-search-results",
  "22-keyboard-help",
]);
const forcedColorsVisualSnapshotFiles = new Set([
  "01-today",
  "02-task-create",
  "02c-task-life-area",
  "02d-task-focus-plan",
  "09-calendar",
  "10-analytics",
  "15-life-graph",
  "16-life-reader",
  "17b-basic-editor-link-dialog",
  "18-settings",
  "21b-search-results",
  "22-keyboard-help",
]);
const reducedMotionVisualSnapshotFiles = new Set([
  "01-today",
  "02-task-create",
  "09-calendar",
  "15-life-graph",
  "19-narrative-studio",
]);
const vietnameseVisualSnapshotFiles = new Set([
  "01-today",
  "16-life-reader",
  "17-basic-editor",
  "21b-search-results",
]);

type ScreenRecord = {
  screen: string;
  utilization: Awaited<ReturnType<typeof utilization>>;
  collisions: Collision[];
  note?: string;
};

const records: ScreenRecord[] = [];
let environment: Awaited<ReturnType<typeof enterAuditViewport>> | null = null;
let lifeAreaId = "";
const CONTROL = "\uE009";
let lifeDocumentedChildId = "";
let lifeNarrativeChildId = "";
let lifeEmptyChildId = "";
let portablePackageBytes: number[] = [];
let mediaEmulationSocket: WebSocket | null = null;

type DevToolsTarget = {
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
};

async function emulateMediaFeatures(features: Array<{ name: string; value: string }>) {
  const edgeOptions = browser.capabilities["ms:edgeOptions"] as
    | { debuggerAddress?: string }
    | undefined;
  const address = edgeOptions?.debuggerAddress;
  if (!address) throw new Error("WebView2 session did not expose a DevTools debugger address");

  const response = await fetch(`http://${address}/json/list`);
  if (!response.ok) throw new Error(`WebView2 DevTools target list failed: ${response.status}`);
  const targets = await response.json() as DevToolsTarget[];
  const target = targets.find(candidate =>
    candidate.type === "page" && candidate.url.startsWith("http://tauri.localhost"),
  );
  if (!target?.webSocketDebuggerUrl)
    throw new Error(`WebView2 app target was not found: ${JSON.stringify(targets)}`);

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("WebView2 DevTools socket failed")), {
      once: true,
    });
  });
  const commandId = 1;
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("message", event => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        error?: { message?: string };
      };
      if (message.id !== commandId) return;
      if (message.error) reject(new Error(message.error.message ?? "DevTools media emulation failed"));
      else resolve();
    });
    socket.send(JSON.stringify({
      id: commandId,
      method: "Emulation.setEmulatedMedia",
      params: {
        media: "",
        features,
      },
    }));
  });
  mediaEmulationSocket = socket;
}

async function installPortableDownloadCapture() {
  await browser.execute(() => {
    const state = window as unknown as {
      __task51PortableBlob?: Blob;
      __task51PortableCapture?: boolean;
    };
    if (state.__task51PortableCapture) return;
    state.__task51PortableCapture = true;
    const originalCreate = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object: Blob | MediaSource) => {
      if (object instanceof Blob) state.__task51PortableBlob = object;
      return originalCreate(object as Blob);
    };
  });
}

async function capturedPortablePackage(): Promise<number[]> {
  const result = await browser.execute(async () => {
    const blob = (window as unknown as { __task51PortableBlob?: Blob }).__task51PortableBlob;
    return blob ? Array.from(new Uint8Array(await blob.arrayBuffer())) : [];
  });
  if (result.length === 0) throw new Error("Portable package export produced no captured bytes");
  return result;
}

async function choosePortablePackage(bytes: number[]) {
  await browser.execute((values: number[]) => {
    const input = document.querySelector<HTMLInputElement>(
      "section[aria-label='Lifeweave portable package'] input[type='file']",
    );
    if (!input) throw new Error("Portable package input is missing");
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(values)], "audit.lifeweave.zip", {
      type: "application/zip",
    }));
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, bytes);
}

async function chooseMarkdownImport() {
  await browser.execute(() => {
    const input = [...document.querySelectorAll<HTMLInputElement>("input[type='file']")]
      .find(candidate => candidate.closest("label")?.textContent?.includes("Import Markdown as Canvas"));
    if (!input) throw new Error("Narrative Markdown input is missing");
    const markdown = "# Quarterly reflection\n\nA calm review with **clear priorities**.\n\n## Next steps\n\n- Protect focus time\n- Review progress";
    const transfer = new DataTransfer();
    transfer.items.add(new File([markdown], "quarterly-reflection.md", { type: "text/markdown" }));
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

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
  const visualSnapshotFiles = requestedLanguage === "vi"
    ? vietnameseVisualSnapshotFiles
    : mediaMode === "dark"
    ? darkVisualSnapshotFiles
    : mediaMode === "forced-colors"
      ? forcedColorsVisualSnapshotFiles
      : mediaMode === "reduced-motion"
        ? reducedMotionVisualSnapshotFiles
        : lightVisualSnapshotFiles;
  if (visualRegression && visualSnapshotFiles.has(file) && (!visualTagFilter || visualTagFilter.has(file))) {
    const tag = requestedLanguage === "vi"
      ? `${file}-vi`
      : mediaMode === "light"
        ? file
        : `${file}-${mediaMode}`;
    const restoreCaret = await browser.execute(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLElement && active.isContentEditable)) return false;
      active.setAttribute("data-visual-restore-caret", active.style.caretColor);
      active.style.caretColor = "transparent";
      return true;
    });
    const result = await browser.checkScreen(tag);
    if (restoreCaret) await browser.execute(() => {
      const target = document.querySelector<HTMLElement>("[data-visual-restore-caret]");
      if (!target) return;
      target.style.caretColor = target.getAttribute("data-visual-restore-caret") ?? "";
      target.removeAttribute("data-visual-restore-caret");
    });
    const mismatch = typeof result === "number" ? result : result.misMatchPercentage;
    if (mismatch !== 0) throw new Error(`${tag} visual mismatch: ${mismatch}%`);
  }
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

describe(`Endgame visual audit (${auditProfile}: ${label})`, () => {
  before(async function () {
    this.timeout(300_000);
    mkdirSync(outputRoot, { recursive: true });
    await browser.url("http://tauri.localhost");
    environment = await enterAuditViewport();
    const seeded = await seedLayoutFixture(await appLocalDate(), {
      vietnamese: requestedLanguage === "vi",
    });
    if (!seeded.ok) throw new Error(`fixture seeding failed at ${seeded.stage}: ${seeded.error}`);
    lifeAreaId = seeded.lifeRootChildId;
    lifeDocumentedChildId = seeded.lifeDocumentedChildId;
    lifeNarrativeChildId = seeded.lifeNarrativeChildId;
    lifeEmptyChildId = seeded.lifeEmptyChildId;
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
    const mediaFeatures = [
      ...(requestedTheme === "dark"
        ? [{ name: "prefers-color-scheme", value: "dark" }]
        : []),
      ...(forcedColors ? [{ name: "forced-colors", value: "active" }] : []),
      ...(reducedMotion ? [{ name: "prefers-reduced-motion", value: "reduce" }] : []),
    ];
    if (mediaFeatures.length > 0) {
      await emulateMediaFeatures(mediaFeatures);
      await browser.pause(150);
    }
    const mediaMatches = await browser.execute(() => ({
      dark: window.matchMedia("(prefers-color-scheme: dark)").matches,
      forcedColors: window.matchMedia("(forced-colors: active)").matches,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    }));
    if (
      mediaMatches.dark !== (requestedTheme === "dark") ||
      mediaMatches.forcedColors !== forcedColors ||
      mediaMatches.reducedMotion !== reducedMotion
    )
      throw new Error(
        `Media precondition failed: requested=${mediaMode}, actual=${JSON.stringify(mediaMatches)}`,
      );
  });

  after(() => {
    mediaEmulationSocket?.close();
    mediaEmulationSocket = null;
    const collisions = records.flatMap(r => r.collisions);
    writeFileSync(
      join(outputRoot, "audit.json"),
      `${JSON.stringify({ label, theme: requestedTheme, mediaMode, language: requestedLanguage, environment, records }, null, 2)}\n`,
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
    console.log(`theme: ${requestedTheme}  media: ${mediaMode}  language: ${requestedLanguage}`);
    console.log(`profile: ${auditProfile}  groups: ${profileGroups(auditProfile).join(",")}`);
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

  if (profileIncludes(auditProfile, "shell-task")) {
    it("walks shell and task surfaces", async function () {
    this.timeout(900_000);

    await go("Today", "h1#today-heading");
    await capture("today--unselected", "01-today");

    // The fixture's one-off task exposes both of Today's compact edge controls. Exercise the
    // running strip first because an active timer intentionally disables assessment, then discard
    // the empty segment so the deterministic fixture is restored before opening the assessment fan.
    const timerStart = $("button[aria-label^='Start timer for']");
    if (await timerStart.isExisting()) {
      await timerStart.waitForEnabled({ timeout: 15_000 });
      await timerStart.click();
      await $("section[aria-label='Running task timer']").waitForDisplayed({ timeout: 15_000 });
      await capture("today--running-timer", "01d-today-running-timer");
      await $("button=Discard segment").click();
      await $("section[aria-label='Running task timer']").waitForDisplayed({ reverse: true, timeout: 15_000 });
    }
    const assessmentTrigger = $("button[aria-label^='Assess task.']");
    if (await assessmentTrigger.isExisting()) {
      await assessmentTrigger.waitForEnabled({ timeout: 15_000 });
      await assessmentTrigger.click();
      await $("[role='listbox'][aria-label='Completion assessment']").waitForDisplayed({ timeout: 15_000 });
      await capture("today--assessment", "01e-today-assessment");
      await browser.keys(ESCAPE);
    }

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
      for (const field of ["Life area", "Focus Plan"]) {
        const input = $(`//label[normalize-space()='${field}']/following-sibling::input[@role='combobox'][1]`);
        if (await input.isExisting()) {
          await input.click();
          const listboxId = await input.getAttribute("aria-controls");
          if (!listboxId) throw new Error(`${field} combobox did not expose aria-controls`);
          await $(`#${listboxId}[role='listbox']`).waitForDisplayed({ timeout: 15_000 });
          const suffix = field === "Life area" ? "life-area" : "focus-plan";
          const file = field === "Life area" ? "02c-task-life-area" : "02d-task-focus-plan";
          await capture(`task-create--${suffix}`, file);
          await browser.keys(ESCAPE);
          await $(`#${listboxId}[role='listbox']`).waitForDisplayed({ reverse: true, timeout: 15_000 });
          await $("[role='dialog']").waitForDisplayed({ timeout: 15_000 });
        }
      }
      const tagPicker = $("button=Add tags");
      if (await tagPicker.isExisting()) {
        await tagPicker.waitForEnabled({ timeout: 15_000 });
        const tagPanelId = await tagPicker.getAttribute("aria-controls");
        if (!tagPanelId) throw new Error("Tag picker trigger did not expose aria-controls");
        await tagPicker.click();
        await $(`#${tagPanelId}[role='region']`).waitForDisplayed({ timeout: 15_000 });
        await capture("task-create--tags", "02b-task-tags");
        await browser.keys(ESCAPE);
        await $(`#${tagPanelId}[role='region']`).waitForDisplayed({ reverse: true, timeout: 15_000 });
      }
      // Activate recurrence through its visible label. In forced-colors mode WebView2 hands the
      // checkbox back to the native renderer; the input remains correctly labelled, but its native
      // hit-test box is not exposed to WebDriver. Clicking the label is the real accessible target
      // and works for pointer, touch, and high-contrast users alike.
      if (
        await tryClick(
          "//fieldset[legend[normalize-space()='Recurring']]//label[normalize-space()='Repeat task']",
        )
      )
        await capture("task-recurring", "03-task-recurring");
      await dismiss();
    }
    // S03's edit evidence is specifically the governed recurring occurrence/series scope, not the
    // already-covered one-off form. Target the seeded recurring row so the capture proves that the
    // scope decision precedes every series-owned field at both required viewports.
    if (await tryClick("[role='listitem'][data-series-id] button[aria-label^='Edit ']")) {
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
    // T-21 is the manager/results workspace, not only its empty state. Create through the real UI
    // so the capture proves selected-row grammar, compact lifecycle controls, and structured
    // results against the same deterministic Task fixture used by the planning views.
    await $("button=Create view").click();
    const seededViewDialog = $("[role='dialog'][aria-labelledby='saved-view-editor-heading']");
    await seededViewDialog.waitForDisplayed({ timeout: 15_000 });
    await $("//label[normalize-space()='Name']/input").setValue("Audit focus");
    const saveView = $("button=Save view");
    await saveView.waitForEnabled({ timeout: 15_000 });
    await saveView.click();
    await seededViewDialog.waitForDisplayed({ reverse: true, timeout: 15_000 });
    const seededView = $("button=Audit focus");
    await seededView.waitForDisplayed({ timeout: 15_000 });
    await browser.waitUntil(
      async () => (await seededView.getAttribute("aria-pressed")) === "true",
      { timeout: 15_000, timeoutMsg: "created Saved View was not selected" },
    );
    await $("section[aria-labelledby='saved-view-results-heading'] li").waitForDisplayed({ timeout: 15_000 });
    await capture("saved-views", "08-saved-views");
    await $("button=Create view").click();
    await $("[role='dialog'][aria-labelledby='saved-view-editor-heading']").waitForDisplayed({ timeout: 15_000 });
    await capture("saved-view-editor", "08b-saved-view-editor");
    await dismiss();
    await tab("today");
    });
  }

  if (profileIncludes(auditProfile, "calendar-analytics-plans")) {
    it("walks Calendar, Analytics, and Focus Plans", async function () {
    this.timeout(300_000);
    const calendarAnchor = await appLocalDate();
    await browser.execute(async (anchor) => {
      const invoke = (window as unknown as { __TAURI_INTERNALS__: { invoke: <T>(command: string, payload?: unknown) => Promise<T> } }).__TAURI_INTERNALS__.invoke;
      const [year, month, day] = anchor.split("-").map(Number);
      const missed = new Date(year!, month! - 1, day! - 1, 12);
      const localDate = `${missed.getFullYear()}-${String(missed.getMonth() + 1).padStart(2, "0")}-${String(missed.getDate()).padStart(2, "0")}`;
      await invoke("create_task", { input: { title: "Calendar missed-state fixture", description: "Visual evidence for an unevaluated past day.", local_date: localDate, start_minute: 540, end_minute: 600, category_id: "general", priority: "medium", life_node_id: null, tag_ids: [] } });
    }, calendarAnchor);
    await go("Calendar", "h1#calendar-heading");
    await $("(//button[@aria-current='date']/ancestor::div[@role='gridcell']/following::div[@role='gridcell'][1]//button)[1]").click();
    await $("h1=Today").waitForDisplayed({ timeout: 15_000 });
    await go("Calendar", "h1#calendar-heading");
    await capture("calendar", "09-calendar");

    await go("Analytics", "h1#analytics-heading");
    await $("#scheduled-overview").waitForDisplayed({ timeout: 15_000 });
    await $("#focus-plan-activity").waitForDisplayed({ timeout: 15_000 });
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
    });
  }

  if (profileIncludes(auditProfile, "life-reader-interchange")) {
    it("walks Life, Reader, editor, and interchange surfaces", async function () {
    this.timeout(600_000);
    await go("Life System", "h1#life-heading");
    await capture("life-browse", "12-life-browse");
    if (await tryClick("button=Edit")) {
      await capture("life-edit", "13-life-edit");

      // Produce both package previews entirely through the product's own export/import controls,
      // then cancel. This reviews the real parsing and preview UI without mutating the seeded tree.
      await installTreeDownloadCapture();
      const treeControls = $("section[aria-label='Life tree interchange']");
      await treeControls.$("button=Export Life tree").click();
      await treeControls.$("[role='status']").waitForDisplayed({ timeout: 30_000 });
      const treePackage = await capturedTreeDownload();
      await chooseTreeFile(treePackage.bytes);
      await $("//section[@role='dialog' and .//h2[normalize-space()='Import Life tree']]").waitForDisplayed({ timeout: 30_000 });
      await capture("life-edit--tree-import", "13b-life-tree-import");
      await dismiss();

      await $(`[data-life-edit-id='${lifeAreaId}']`).click();
      await $("h2=Edit Layout Area").waitForDisplayed({ timeout: 15_000 });
      await installBranchDownloadCapture();
      const branchControls = $("section[aria-label='Life branch interchange']");
      await branchControls.$("button=Export branch").click();
      await branchControls.$("[role='status']").waitForDisplayed({ timeout: 30_000 });
      const branchPackage = await capturedBranchDownload();
      await chooseBranchFile(branchPackage.bytes);
      await $("//section[@role='dialog' and .//h2[normalize-space()='Import Life branch']]").waitForDisplayed({ timeout: 30_000 });
      await capture("life-edit--branch-import", "13c-life-branch-import");
      await dismiss();
    }
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
    await $("button=Add link").click();
    await $("[role='dialog'][aria-modal='true']").waitForDisplayed({ timeout: 15_000 });
    await capture("life-reader--add-link", "16b-life-link-dialog");
    await dismiss();
    await installPortableDownloadCapture();
    await $("button=Export Lifeweave package").click();
    await $("section[aria-label='Lifeweave portable package'] [role='status']").waitForDisplayed({ timeout: 30_000 });
    portablePackageBytes = await capturedPortablePackage();

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

    const emptyCard = $(`[data-life-id='${lifeEmptyChildId}']`);
    await emptyCard.waitForDisplayed({ timeout: 15_000 });
    await emptyCard.waitForEnabled({ timeout: 15_000 });
    await emptyCard.click();
    await $("p=This leaf has no document yet.").waitForDisplayed({ timeout: 15_000 });
    await capture("life-reader--empty", "16c-life-empty");
    await chooseMarkdownImport();
    await $("[role='dialog'][aria-labelledby='nc-import-title']").waitForDisplayed({ timeout: 30_000 });
    await capture("life-reader--markdown-import", "16d-markdown-import");
    await dismiss();
    await choosePortablePackage(portablePackageBytes);
    await $("[role='dialog'][aria-labelledby='portable-dialog-title']").waitForDisplayed({ timeout: 30_000 });
    await capture("life-reader--portable-import", "16e-portable-import");
    await dismiss();
    await $("button*=Back to Life Browse").click();
    await $("h1#life-heading").waitForDisplayed({ timeout: 15_000 });
    });
  }

  if (profileIncludes(auditProfile, "narrative")) {
    it("walks Narrative Reader and Studio surfaces", async function () {
    this.timeout(300_000);
    if (!profileIncludes(auditProfile, "life-reader-interchange")) {
      await go("Life System", "h1#life-heading");
      const areaCard = $(`[data-life-id='${lifeAreaId}']`);
      await areaCard.waitForDisplayed({ timeout: 15_000 });
      await areaCard.click();
    }
    const narrativeCard = $(`[data-life-id='${lifeNarrativeChildId}']`);
    await narrativeCard.waitForDisplayed({ timeout: 15_000 });
    await narrativeCard.waitForEnabled({ timeout: 15_000 });
    await narrativeCard.click();
    await $("#nc-canvas-title").waitForDisplayed({ timeout: 30_000 });
    await capture("narrative-reader", "18-narrative-reader");
    await $("button=Edit canvas").click();
    await $("#nc-title").waitForDisplayed({ timeout: 30_000 });
    await capture("narrative-studio", "19-narrative-studio");
    await $("button[aria-label='Delete block']").click();
    await $("[role='dialog']").waitForDisplayed({ timeout: 15_000 });
    await capture("narrative-studio--only-block-dialog", "19b-narrative-only-block-dialog");
    await browser.keys(ESCAPE);

    // Each semantic Visual World is product content, not a cosmetic test theme. Capture all four
    // from the production radio group, then exercise the shared dirty-exit decision surface created
    // by those real edits. The confirm path intentionally leaves the recoverable draft unpublished.
    for (const [world, file] of [
      ["paper", "19c-narrative-paper"],
      ["sakura", "19d-narrative-sakura"],
      ["aurora", "19e-narrative-aurora"],
      ["nocturne", "19f-narrative-nocturne"],
    ] as const) {
      // Forced colors delegates radios to WebView2's native renderer, whose input hit target is not
      // exposed to WebDriver. The wrapping label is the production pointer/touch target in every
      // mode and keeps this audit aligned with the accessible interaction path.
      await $(`//label[input[@name='visual-world' and @value='${world}']]`).click();
      await browser.pause(150);
      await capture(`narrative-studio--${world}`, file);
    }
    await $("button=Back").click();
    await $("[role='dialog'][aria-modal='true']").waitForDisplayed({ timeout: 15_000 });
    await capture("narrative-studio--dirty-exit", "19g-narrative-dirty-exit");
    await $("button=Leave editor").click();
    await $("button=Edit canvas").waitForDisplayed({ timeout: 15_000 });
    await $("button*=Back to Life Browse").click();
    await $("h1#life-heading").waitForDisplayed({ timeout: 15_000 });
    });
  }

  if (
    profileIncludes(auditProfile, "settings") ||
    profileIncludes(auditProfile, "shell-task")
  ) {
    it("walks Settings, Search, backup, and restore preview surfaces", async function () {
    this.timeout(300_000);
    if (profileIncludes(auditProfile, "settings")) {
    await go("Settings", "h1#settings-heading");
    await capture("settings-top", "18-settings");
    await browser.execute(() => {
      const heading = Array.from(document.querySelectorAll("h2")).find(
        element => element.textContent?.trim() === "Tags",
      );
      heading?.scrollIntoView({ block: "start" });
    });
    const sourceTag = $("select[aria-label='Source tag to merge from']");
    const targetTag = $("select[aria-label='Target tag to merge into']");
    if (await sourceTag.isExisting() && await targetTag.isExisting()) {
      await sourceTag.selectByIndex(1);
      await targetTag.selectByIndex(1);
      await $("button=Merge").click();
      await $("[role='region'][aria-label='Confirm merge']").scrollIntoView({ block: "center" });
    }
    await capture("settings-tags", "19-settings-tags");
    await $("#settings-foundation-heading").scrollIntoView({ block: "start" });
    await capture("settings-foundation", "20-settings-foundation");
    await $("button=Keyboard shortcuts").click();
    await $("[role='dialog'][aria-modal='true']").waitForDisplayed({ timeout: 10_000 });
    await capture("keyboard-help", "22-keyboard-help");
    await dismiss();
    }

    if (await tryClick("button[aria-label^='Search']")) {
      await capture("search", "21-search");
      const searchInput = $("input[aria-label='Search tasks, life nodes, and documents']");
      await searchInput.setValue(requestedLanguage === "vi" ? "suc khoe" : "Layout");
      if (requestedLanguage === "vi")
        // The freshly created Task, Life node, and document are indexed through the product's
        // bounded dirty queue. One option only proves that indexing started; three results proves
        // the Vietnamese fixture reached its deterministic complete state before capture.
        await $("p=3 results.").waitForDisplayed({ timeout: 15_000 });
      else await $("[role='option']").waitForDisplayed({ timeout: 15_000 });
      await capture("search--results", "21b-search-results");
      await searchInput.setValue("task51-no-result-sentinel");
      await $("p=No results.").waitForDisplayed({ timeout: 15_000 });
      await capture("search--no-results", "21c-search-no-results");
      await tryClick("button[aria-label='Close search']");
    }
    if (profileIncludes(auditProfile, "settings")) {
    if (await tryClick("button=Create backup")) {
      await browser.pause(3000);
      await capture("backup-settings", "23-backup");
      const restore = $("//section[@aria-labelledby='backup-settings-heading']//tbody/tr[1]//button[normalize-space()='Restore']");
      await restore.waitForDisplayed({ timeout: 30_000 });
      await restore.click();
      await $("[role='dialog'][aria-labelledby='restore-backup-title']").waitForDisplayed({ timeout: 15_000 });
      await capture("restore-confirmation", "23b-restore-confirmation", "Timestamped runtime evidence; intentionally not a visual golden.");
      await dismiss();
    }
    }
    });
  }

  if (profileIncludes(auditProfile, "shell-task")) {
    it("walks shell shortcut and collapsed states", async function () {
    this.timeout(180_000);
    // Keep the visual golden independent from backup timestamps in Settings. The shortcut is the
    // production entry path and Today is a deterministic fixture-backed backdrop for the dialog.
    if (!profileIncludes(auditProfile, "settings")) {
    await go("Today", "h1#today-heading");
    await browser.keys([CONTROL, "/"]);
    await $("[role='dialog'][aria-modal='true']").waitForDisplayed({ timeout: 10_000 });
    await capture("keyboard-help", "22-keyboard-help");
    await dismiss();
    }

    // Collapsed sidebar is the second canonical shell state.
    await tryClick("button[aria-label='Collapse sidebar']");
    await go("Today", "h1#today-heading");
    await capture("today-collapsed", "24-today-collapsed");
    await go("Analytics", "h1#analytics-heading");
    await capture("analytics-collapsed", "25-analytics-collapsed");
    await tryClick("button[aria-label='Expand sidebar']");
    });
  }
});
