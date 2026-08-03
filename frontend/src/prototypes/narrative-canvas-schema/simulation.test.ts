// Separate simulation test file (long-running, ~100k operations).
// Run separately from prototype.test.ts to avoid timeout issues.

import { describe, it, expect } from "vitest";
import { Prng } from "./shared/prng";
import { FIXTURE_K, makeCalloutBlock, makeImageBlock, makeMetricBlock, makeRichTextBlock, makeScene, makeTimelineBlock } from "./shared/fixtures";
import { adapterA } from "./strategy-a/adapter";
import { adapterB, fromSemanticDocument } from "./strategy-b/adapter";
import type {
  NarrativeSemanticDocument,
  NarrativeSemanticBlock,
  NarrativeSemanticScene,
  HistoryState,
  SimulationResult,
} from "./shared/types";
import { makeHistory, pushHistory, undoHistory, redoHistory } from "./shared/types";
import type { PrototypeAdapter } from "./shared/types";

const SEED = 20260803;
const TARGET_APPLIED = 100_000;
const MAX_ATTEMPTS = 500_000;
const MAX_SCENES = 80;
const MAX_BLOCKS = 40;

// ---------------------------------------------------------------------------
// Simulation helpers
// ---------------------------------------------------------------------------

const LAYOUTS = ["hero", "single_column", "two_column", "bento"] as const;
const ATMOSPHERES = ["neutral", "sky", "crystal"] as const;
const MOTIONS = ["none", "reveal", "stagger"] as const;
const CALLOUT_VARIANTS = ["note", "warning", "tip"] as const;

function makeSampleBlock(prng: Prng, id: string): NarrativeSemanticBlock {
  const kind = prng.int(5);
  switch (kind) {
    case 0:
      return makeRichTextBlock(id, `sim-text-${prng.int(10000)}`);
    case 1:
      return makeMetricBlock(id, `Metric`, String(prng.int(9999)), "units");
    case 2:
      return makeImageBlock(id, `asset-${prng.int(10000)}`, `Alt ${prng.int(1000)}`);
    case 3:
      return makeCalloutBlock(id, CALLOUT_VARIANTS[prng.int(3)]!, `Callout ${prng.int(10000)}`);
    default:
      return makeTimelineBlock(id, `Timeline ${prng.int(1000)}`, [
        { id: `${id}-t0`, label: "A", description: `Desc ${prng.int(100)}` },
      ]);
  }
}

function makeSampleScene(prng: Prng): NarrativeSemanticScene {
  const id = `sim-s-${prng.int(1000000)}`;
  return makeScene(
    id,
    `Sim Scene ${prng.int(10000)}`,
    LAYOUTS[prng.int(LAYOUTS.length)]!,
    ATMOSPHERES[prng.int(ATMOSPHERES.length)]!,
    MOTIONS[prng.int(MOTIONS.length)]!,
    [makeSampleBlock(prng, `${id}-b0`)],
  );
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < Math.min(s.length, 10000); i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h.toString(16);
}

function runSimulation<TDoc>(
  adapter: PrototypeAdapter<TDoc>,
  fromSemantic: (doc: NarrativeSemanticDocument) => TDoc,
  initialDoc: NarrativeSemanticDocument,
  seed: number,
  targetApplied: number,
  maxAttempts: number,
): SimulationResult {
  const prng = new Prng(seed);
  let doc = fromSemantic(initialDoc);
  let history: HistoryState<TDoc> = makeHistory(doc);

  let applied = 0;
  let attempted = 0;
  let skipped = 0;
  let undoCount = 0;
  let redoCount = 0;
  let batchCount = 0;
  const errors: string[] = [];
  const opCounts: Record<string, number> = {};

  const countOp = (op: string) => {
    opCounts[op] = (opCounts[op] ?? 0) + 1;
  };

  while (applied < targetApplied && attempted < maxAttempts) {
    attempted++;
    const r = prng.float();

    try {
      const sc = adapter.getSceneCount(doc);

      // Undo (5%)
      if (r < 0.05) {
        const { state, changed } = undoHistory(history);
        if (changed) {
          history = state;
          doc = state.current;
          undoCount++;
          applied++;
          countOp("undo");
        } else {
          skipped++;
        }
        continue;
      }

      // Redo (5%)
      if (r < 0.10) {
        const { state, changed } = redoHistory(history);
        if (changed) {
          history = state;
          doc = state.current;
          redoCount++;
          applied++;
          countOp("redo");
        } else {
          skipped++;
        }
        continue;
      }

      // Must have at least one scene
      if (sc === 0) {
        const newDoc = adapter.createScene(doc, makeSampleScene(prng));
        history = pushHistory(history, newDoc);
        doc = newDoc;
        applied++;
        countOp("createScene");
        continue;
      }

      // createScene (10%)
      if (r < 0.20) {
        if (sc >= MAX_SCENES) { skipped++; continue; }
        const newDoc = adapter.createScene(doc, makeSampleScene(prng));
        history = pushHistory(history, newDoc);
        doc = newDoc;
        applied++;
        countOp("createScene");
        continue;
      }

      // deleteScene (5%)
      if (r < 0.25) {
        if (sc <= 1) { skipped++; continue; }
        const si = prng.int(sc);
        const newDoc = adapter.deleteScene(doc, si);
        history = pushHistory(history, newDoc);
        doc = newDoc;
        applied++;
        countOp("deleteScene");
        continue;
      }

      // reorderScene (8%)
      if (r < 0.33) {
        if (sc < 2) { skipped++; continue; }
        const from = prng.int(sc);
        let to = prng.int(sc);
        while (to === from) to = prng.int(sc);
        const newDoc = adapter.reorderScene(doc, from, to);
        history = pushHistory(history, newDoc);
        doc = newDoc;
        applied++;
        countOp("reorderScene");
        continue;
      }

      // updateSceneLayout (5%)
      if (r < 0.38) {
        const si = prng.int(sc);
        const newDoc = adapter.updateSceneLayout(doc, si, LAYOUTS[prng.int(LAYOUTS.length)]!);
        history = pushHistory(history, newDoc);
        doc = newDoc;
        applied++;
        countOp("updateSceneLayout");
        continue;
      }

      // insertBlock (15%)
      if (r < 0.53) {
        const si = prng.int(sc);
        const bc = adapter.getBlockCount(doc, si);
        if (bc >= MAX_BLOCKS) { skipped++; continue; }
        const bi = prng.int(bc + 1);
        const blockId = `sim-b-${prng.int(1000000)}`;
        const newDoc = adapter.insertBlock(doc, si, bi, makeSampleBlock(prng, blockId));
        history = pushHistory(history, newDoc);
        doc = newDoc;
        applied++;
        countOp("insertBlock");
        continue;
      }

      // deleteBlock (10%)
      if (r < 0.63) {
        const si = prng.int(sc);
        const bc = adapter.getBlockCount(doc, si);
        if (bc <= 0) { skipped++; continue; }
        const newDoc = adapter.deleteBlock(doc, si, prng.int(bc));
        history = pushHistory(history, newDoc);
        doc = newDoc;
        applied++;
        countOp("deleteBlock");
        continue;
      }

      // reorderBlock (8%)
      if (r < 0.71) {
        const si = prng.int(sc);
        const bc = adapter.getBlockCount(doc, si);
        if (bc < 2) { skipped++; continue; }
        const from = prng.int(bc);
        let to = prng.int(bc);
        while (to === from) to = prng.int(bc);
        const newDoc = adapter.reorderBlock(doc, si, from, to);
        history = pushHistory(history, newDoc);
        doc = newDoc;
        applied++;
        countOp("reorderBlock");
        continue;
      }

      // moveBlock (7%)
      if (r < 0.78) {
        if (sc < 2) { skipped++; continue; }
        const fromS = prng.int(sc);
        const fromBc = adapter.getBlockCount(doc, fromS);
        if (fromBc <= 0) { skipped++; continue; }
        const fromB = prng.int(fromBc);
        const toS = prng.int(sc);
        const toBc = adapter.getBlockCount(doc, toS);
        const newDoc = adapter.moveBlock(doc, fromS, fromB, toS, prng.int(toBc + 1));
        history = pushHistory(history, newDoc);
        doc = newDoc;
        applied++;
        countOp("moveBlock");
        continue;
      }

      // updateBlock (8%)
      if (r < 0.86) {
        const si = prng.int(sc);
        const bc = adapter.getBlockCount(doc, si);
        if (bc <= 0) { skipped++; continue; }
        const bi = prng.int(bc);
        const blockId = `upd-b-${prng.int(1000000)}`;
        const newDoc = adapter.updateBlock(doc, si, bi, makeSampleBlock(prng, blockId));
        history = pushHistory(history, newDoc);
        doc = newDoc;
        applied++;
        countOp("updateBlock");
        continue;
      }

      // applyBatch (7%): createScene + insertBlock as atomic unit
      if (r < 0.93) {
        if (sc >= MAX_SCENES) { skipped++; continue; }
        const newScene = makeSampleScene(prng);
        const newDoc = adapter.applyBatch(doc, [
          { op: "createScene", scene: newScene },
        ]);
        history = pushHistory(history, newDoc);
        doc = newDoc;
        applied++;
        batchCount++;
        countOp("applyBatch");
        continue;
      }

      // projectToStatic (4%)
      if (r < 0.97) {
        adapter.projectToStatic(doc);
        applied++;
        countOp("projectToStatic");
        continue;
      }

      // extractPlainText (3%)
      adapter.extractPlainText(doc);
      applied++;
      countOp("extractPlainText");

    } catch (e) {
      errors.push(`attempt ${attempted}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const finalSem = adapter.toSemanticDocument(doc);
  const hash = simpleHash(JSON.stringify({
    sceneCount: finalSem.scenes.length,
    blockCounts: finalSem.scenes.map(s => s.blocks.length),
    sceneIds: finalSem.scenes.map(s => s.id).slice(0, 10),
  }));

  return {
    applied,
    attempted,
    skipped,
    opCounts,
    errors,
    undoCount,
    redoCount,
    batchCount,
    finalSemanticHash: hash,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Strategy A simulation: 100k applied ops", () => {
  it("completes with 0 errors", { timeout: 120_000 }, () => {
    const stats = runSimulation(adapterA, doc => doc, FIXTURE_K, SEED, TARGET_APPLIED, MAX_ATTEMPTS);

    console.log(`[A] applied=${stats.applied} attempted=${stats.attempted} skipped=${stats.skipped}`);
    console.log(`[A] undos=${stats.undoCount} redos=${stats.redoCount} batches=${stats.batchCount}`);
    console.log(`[A] opCounts=${JSON.stringify(stats.opCounts)}`);
    console.log(`[A] finalHash=${stats.finalSemanticHash}`);

    expect(stats.applied).toBeGreaterThanOrEqual(TARGET_APPLIED);
    expect(stats.errors).toHaveLength(0);
    expect(stats.finalSemanticHash.length).toBeGreaterThan(0);
  });
});

describe("Strategy B simulation: 100k applied ops", () => {
  it("completes with 0 errors", { timeout: 180_000 }, () => {
    const stats = runSimulation(
      adapterB,
      fromSemanticDocument,
      FIXTURE_K,
      SEED,
      TARGET_APPLIED,
      MAX_ATTEMPTS,
    );

    console.log(`[B] applied=${stats.applied} attempted=${stats.attempted} skipped=${stats.skipped}`);
    console.log(`[B] undos=${stats.undoCount} redos=${stats.redoCount} batches=${stats.batchCount}`);
    console.log(`[B] opCounts=${JSON.stringify(stats.opCounts)}`);
    console.log(`[B] finalHash=${stats.finalSemanticHash}`);

    expect(stats.applied).toBeGreaterThanOrEqual(TARGET_APPLIED);
    expect(stats.errors).toHaveLength(0);
    expect(stats.finalSemanticHash.length).toBeGreaterThan(0);
  });
});

describe("A and B final state comparison", () => {
  it("produce equivalent final state from same operation sequence", { timeout: 300_000 }, () => {
    const statsA = runSimulation(adapterA, doc => doc, FIXTURE_K, SEED, TARGET_APPLIED, MAX_ATTEMPTS);
    const statsB = runSimulation(
      adapterB,
      fromSemanticDocument,
      FIXTURE_K,
      SEED,
      TARGET_APPLIED,
      MAX_ATTEMPTS,
    );

    // Both should complete without errors
    expect(statsA.errors).toHaveLength(0);
    expect(statsB.errors).toHaveLength(0);

    // Both applied the same number of ops
    expect(statsA.applied).toBe(statsB.applied);

    // Same op distribution (same prng seed → same op types applied in same order)
    expect(statsA.opCounts).toEqual(statsB.opCounts);

    console.log(`[A final] hash=${statsA.finalSemanticHash}`);
    console.log(`[B final] hash=${statsB.finalSemanticHash}`);
    // Hashes should match since both process same logical ops in same order
    expect(statsA.finalSemanticHash).toBe(statsB.finalSemanticHash);
  });
});
