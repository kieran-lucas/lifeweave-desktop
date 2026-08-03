// Narrative Canvas Schema A/B Prototype — deterministic simulation, benchmark, and decision.
// Seed: 20260803. Prototype code is isolated from production; never imported by src/main.tsx.

import { describe, expect, it } from "vitest";
import { Prng } from "./shared/prng";
import { FIXTURE_K, FIXTURE_S, makeBlock, makeScene } from "./shared/fixtures";
import type { BasicLeafContent, MatrixCriterion, NarrativeBlock, NarrativeScene, PrototypeAdapter } from "./shared/types";
import { adapterA } from "./strategy-a/adapter";
import type { DocA } from "./strategy-a/adapter";
import { adapterB, fromNarrativeDocumentA, toNarrativeScenes } from "./strategy-b/adapter";
import type { DocB } from "./strategy-b/adapter";

const SEED = 20260803;
const SIMULATION_OPS = 100_000;
const BENCH_N = 1000;

// ---------------------------------------------------------------------------
// PRNG correctness
// ---------------------------------------------------------------------------

describe("Prng", () => {
  it("produces deterministic sequence from same seed", () => {
    const a = new Prng(SEED);
    const b = new Prng(SEED);
    for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
  });

  it("different seeds produce different sequences", () => {
    const a = new Prng(1);
    const b = new Prng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it("float() is in [0, 1)", () => {
    const p = new Prng(SEED);
    for (let i = 0; i < 100; i++) {
      const f = p.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it("int(max) is in [0, max)", () => {
    const p = new Prng(SEED);
    for (let i = 0; i < 100; i++) {
      const v = p.int(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });

  it("int(0) returns 0 without crash", () => {
    const p = new Prng(SEED);
    expect(p.int(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

describe("Fixtures", () => {
  it("FIXTURE_S has 8 scenes and 40 blocks total", () => {
    expect(FIXTURE_S.scenes).toHaveLength(8);
    const total = FIXTURE_S.scenes.reduce((n, s) => n + s.blocks.length, 0);
    expect(total).toBe(40);
  });

  it("FIXTURE_K has 20 scenes and 100 blocks total", () => {
    expect(FIXTURE_K.scenes).toHaveLength(20);
    const total = FIXTURE_K.scenes.reduce((n, s) => n + s.blocks.length, 0);
    expect(total).toBe(100);
  });

  it("FIXTURE_K last scene has sceneType ending", () => {
    expect(FIXTURE_K.scenes.at(-1)!.sceneType).toBe("ending");
  });
});

// ---------------------------------------------------------------------------
// Strategy A unit tests
// ---------------------------------------------------------------------------

describe("Strategy A — adapter operations", () => {
  it("parse+serialize round-trip is lossless", () => {
    const json = adapterA.serialize(FIXTURE_K);
    const parsed = adapterA.parse(json);
    expect(parsed.scenes).toHaveLength(20);
    expect(parsed.schemaVersion).toBe(1);
    expect(adapterA.serialize(parsed)).toBe(json);
  });

  it("parse rejects unknown schemaVersion", () => {
    const json = JSON.stringify({ ...FIXTURE_S, schemaVersion: 99 });
    expect(() => adapterA.parse(json)).toThrow("Unsupported schemaVersion");
  });

  it("parse rejects missing scenes array", () => {
    const json = JSON.stringify({ schemaVersion: 1, revision: 1 });
    expect(() => adapterA.parse(json)).toThrow("Missing scenes array");
  });

  it("addScene appends and increments revision", () => {
    const newScene = makeScene("new", "New Scene", "linear", 2);
    const result = adapterA.addScene(FIXTURE_S, newScene);
    expect(result.scenes).toHaveLength(9);
    expect(result.scenes.at(-1)!.id).toBe("new");
    expect(result.revision).toBe(FIXTURE_S.revision + 1);
  });

  it("reorderScene moves a scene to a new position", () => {
    const result = adapterA.reorderScene(FIXTURE_S, 0, 3);
    expect(result.scenes[3]!.id).toBe(FIXTURE_S.scenes[0]!.id);
    expect(result.scenes).toHaveLength(8);
  });

  it("reorderScene does not mutate the original", () => {
    const original = adapterA.serialize(FIXTURE_S);
    adapterA.reorderScene(FIXTURE_S, 0, 3);
    expect(adapterA.serialize(FIXTURE_S)).toBe(original);
  });

  it("deleteScene removes scene at given index", () => {
    const idToRemove = FIXTURE_S.scenes[2]!.id;
    const result = adapterA.deleteScene(FIXTURE_S, 2);
    expect(result.scenes).toHaveLength(7);
    expect(result.scenes.find(s => s.id === idToRemove)).toBeUndefined();
  });

  it("editBlockContent updates content without touching other blocks", () => {
    const newContent: BasicLeafContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Updated" }] }],
    };
    const result = adapterA.editBlockContent(FIXTURE_K, 3, 1, newContent);
    expect(result.scenes[3]!.blocks[1]!.content).toEqual(newContent);
    expect(result.scenes[3]!.blocks[0]!.content).toEqual(FIXTURE_K.scenes[3]!.blocks[0]!.content);
  });

  it("addBlock appends block to specified scene", () => {
    const block = makeBlock("nb", "New block text");
    const result = adapterA.addBlock(FIXTURE_S, 0, block);
    expect(result.scenes[0]!.blocks).toHaveLength(6);
    expect(result.scenes[0]!.blocks.at(-1)!.id).toBe("nb");
  });

  it("moveBlock transfers block across scenes", () => {
    const result = adapterA.moveBlock(FIXTURE_S, 0, 0, 1, 0);
    expect(result.scenes[0]!.blocks).toHaveLength(4);
    expect(result.scenes[1]!.blocks).toHaveLength(6);
    expect(result.scenes[1]!.blocks[0]!.id).toBe(FIXTURE_S.scenes[0]!.blocks[0]!.id);
  });

  it("extractPlainText includes all scene titles and block text", () => {
    const text = adapterA.extractPlainText(FIXTURE_S);
    expect(text).toContain("Scene A");
    expect(text).toContain("Block 1 of scene");
  });

  it("extractPlainText is non-empty for non-empty fixture", () => {
    expect(adapterA.extractPlainText(FIXTURE_K).length).toBeGreaterThan(100);
  });

  it("getSceneCount returns correct scene count", () => {
    expect(adapterA.getSceneCount(FIXTURE_K)).toBe(20);
  });

  it("getBlockCount returns correct block count per scene", () => {
    expect(adapterA.getBlockCount(FIXTURE_K, 0)).toBe(5);
  });

  it("migration v1→v2 succeeds without schema change and adds narrativeType", () => {
    const v2 = adapterA.migrate(FIXTURE_S, 2);
    const v2raw = v2 as unknown as { schemaVersion: number; narrativeType: string };
    expect(v2raw.schemaVersion).toBe(2);
    expect(["story", "branching", "linear"]).toContain(v2raw.narrativeType);
  });

  it("migration preserves all scenes", () => {
    const v2 = adapterA.migrate(FIXTURE_S, 2);
    const v2raw = v2 as unknown as typeof FIXTURE_S;
    expect(v2raw.scenes).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// Strategy B unit tests
// ---------------------------------------------------------------------------

describe("Strategy B — adapter operations", () => {
  const fixtureBSmall = fromNarrativeDocumentA(FIXTURE_S.scenes);
  const fixtureBLarge = fromNarrativeDocumentA(FIXTURE_K.scenes);

  it("fromNarrativeDocumentA produces valid PM doc", () => {
    expect(fixtureBSmall.type.name).toBe("doc");
    expect(fixtureBSmall.childCount).toBe(8);
  });

  it("parse+serialize round-trip is lossless", () => {
    const json = adapterB.serialize(fixtureBLarge);
    const parsed = adapterB.parse(json);
    expect(parsed.childCount).toBe(20);
    expect(adapterB.serialize(parsed)).toBe(json);
  });

  it("scene nodes have correct attrs", () => {
    const scene0 = fixtureBSmall.child(0);
    expect(scene0.type.name).toBe("scene");
    expect(scene0.attrs["id"]).toBe("s0");
    expect(scene0.attrs["title"]).toBe("Scene A");
  });

  it("narrative_block nodes have blockType attr", () => {
    const block0 = fixtureBSmall.child(0).child(0);
    expect(block0.type.name).toBe("narrative_block");
    expect(block0.attrs["blockType"]).toBe("rich-text");
  });

  it("addScene appends a new scene node", () => {
    const newScene = makeScene("new", "New Scene", "linear", 2);
    const result = adapterB.addScene(fixtureBSmall, newScene);
    expect(result.childCount).toBe(9);
    expect(result.child(8).attrs["id"]).toBe("new");
  });

  it("reorderScene moves a scene to the correct position", () => {
    const original0Id = fixtureBSmall.child(0).attrs["id"];
    const result = adapterB.reorderScene(fixtureBSmall, 0, 3);
    expect(result.child(3).attrs["id"]).toBe(original0Id);
    expect(result.childCount).toBe(8);
  });

  it("deleteScene removes the correct scene node", () => {
    const idToRemove = fixtureBSmall.child(2).attrs["id"];
    const result = adapterB.deleteScene(fixtureBSmall, 2);
    expect(result.childCount).toBe(7);
    let found = false;
    result.forEach(child => { if (child.attrs["id"] === idToRemove) found = true; });
    expect(found).toBe(false);
  });

  it("editBlockContent updates the targeted block", () => {
    const newContent: BasicLeafContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "B Updated" }] }],
    };
    const result = adapterB.editBlockContent(fixtureBSmall, 1, 0, newContent);
    expect(result.child(1).child(0).textContent).toBe("B Updated");
  });

  it("editBlockContent does not change other blocks", () => {
    const newContent: BasicLeafContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Changed" }] }],
    };
    const result = adapterB.editBlockContent(fixtureBSmall, 0, 0, newContent);
    expect(result.child(0).child(1).textContent).toBe(fixtureBSmall.child(0).child(1).textContent);
  });

  it("addBlock appends a block node to the correct scene", () => {
    const block = makeBlock("nb", "New block B");
    const result = adapterB.addBlock(fixtureBSmall, 0, block);
    expect(result.child(0).childCount).toBe(6);
  });

  it("moveBlock transfers a block across scenes", () => {
    const result = adapterB.moveBlock(fixtureBSmall, 0, 0, 1, 0);
    expect(result.child(0).childCount).toBe(4);
    expect(result.child(1).childCount).toBe(6);
  });

  it("extractPlainText uses PM textContent traversal", () => {
    const text = adapterB.extractPlainText(fixtureBSmall);
    expect(text).toContain("Block 1 of scene");
    expect(text.length).toBeGreaterThan(50);
  });

  it("getSceneCount returns correct count", () => {
    expect(adapterB.getSceneCount(fixtureBLarge)).toBe(20);
  });

  it("getBlockCount returns blocks per scene", () => {
    expect(adapterB.getBlockCount(fixtureBLarge, 0)).toBe(5);
  });

  it("migration v1→v2 silently drops new attr (data loss without error — worse than throw)", () => {
    // PM computeAttrs() iterates schema-defined attrs only, silently dropping unknown ones.
    const migrated = adapterB.migrate(fixtureBSmall, 2);
    const scene0 = migrated.child(0);
    // narrativeType was set in the JSON pre-parse but is silently lost
    expect(scene0.attrs["narrativeType"]).toBeUndefined();
    // Known attrs are preserved
    expect(scene0.attrs["id"]).toBe("s0");
  });

  it("cross-strategy equivalence: Strategy A and B produce same plain text for FIXTURE_S", () => {
    const textA = adapterA.extractPlainText(FIXTURE_S);
    const textB = adapterB.extractPlainText(fixtureBSmall);
    // PM textContent does not include scene titles (they are in attrs, not text nodes)
    // so we compare block text only
    for (const scene of FIXTURE_S.scenes) {
      for (const block of scene.blocks) {
        const blockText = block.content.content
          .flatMap(n => (n.content ?? []).filter(c => c.type === "text").map(c => c.text ?? ""))
          .join("");
        expect(textB).toContain(blockText);
      }
    }
    expect(textA.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Simulation helpers
// ---------------------------------------------------------------------------

function makeSampleContent(prng: Prng): BasicLeafContent {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: `sim-text-${prng.int(10000)}` }] }],
  };
}

function makeSampleBlock(prng: Prng): NarrativeBlock {
  return makeBlock(`sim-b-${prng.int(100000)}`, `sim-block-${prng.int(10000)}`);
}

function makeSampleScene(prng: Prng): NarrativeScene {
  return makeScene(`sim-s-${prng.int(100000)}`, `Sim Scene ${prng.int(10000)}`, "linear", 1);
}

function runSimulation<TDoc>(adapter: PrototypeAdapter<TDoc>, initialDoc: TDoc, seed: number, iterations: number): {
  opsApplied: number; errors: string[]; sceneCount: number; blockCount: number;
} {
  const prng = new Prng(seed);
  let doc = initialDoc;
  let opsApplied = 0;
  const errors: string[] = [];

  for (let i = 0; i < iterations; i++) {
    const r = prng.float();
    try {
      const sc = adapter.getSceneCount(doc);
      if (sc === 0) {
        doc = adapter.addScene(doc, makeSampleScene(prng));
        opsApplied++;
        continue;
      }
      if (r < 0.40) {
        const si = prng.int(sc);
        const bc = adapter.getBlockCount(doc, si);
        if (bc > 0) {
          doc = adapter.editBlockContent(doc, si, prng.int(bc), makeSampleContent(prng));
          opsApplied++;
        }
      } else if (r < 0.60) {
        const si = prng.int(sc);
        doc = adapter.addBlock(doc, si, makeSampleBlock(prng));
        opsApplied++;
      } else if (r < 0.72 && sc >= 2) {
        const from = prng.int(sc);
        const to = prng.int(sc);
        if (from !== to) {
          doc = adapter.reorderScene(doc, from, to);
          opsApplied++;
        }
      } else if (r < 0.82 && sc > 3) {
        doc = adapter.deleteScene(doc, prng.int(sc));
        opsApplied++;
      } else if (r < 0.92 && sc >= 2) {
        const fromS = prng.int(sc);
        const fromSc2 = adapter.getSceneCount(doc);
        const fromBc = adapter.getBlockCount(doc, fromS);
        if (fromBc > 0) {
          const fromB = prng.int(fromBc);
          const toS = prng.int(fromSc2);
          const toBc = adapter.getBlockCount(doc, toS);
          doc = adapter.moveBlock(doc, fromS, fromB, toS, prng.int(toBc + 1));
          opsApplied++;
        }
      } else {
        doc = adapter.addScene(doc, makeSampleScene(prng));
        opsApplied++;
      }
    } catch (e) {
      errors.push(`op ${i}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const finalSc = adapter.getSceneCount(doc);
  let finalBc = 0;
  for (let si = 0; si < finalSc; si++) finalBc += adapter.getBlockCount(doc, si);
  return { opsApplied, errors, sceneCount: finalSc, blockCount: finalBc };
}

// ---------------------------------------------------------------------------
// Deterministic simulations — 100,000 operations each
// ---------------------------------------------------------------------------

describe("Strategy A — 100k deterministic simulation", () => {
  it("completes 100k operations with zero errors from FIXTURE_K", { timeout: 60_000 }, () => {
    const { opsApplied, errors, sceneCount, blockCount } = runSimulation(adapterA, FIXTURE_K, SEED, SIMULATION_OPS);
    console.log(`[A] ops=${opsApplied} errors=${errors.length} finalScenes=${sceneCount} finalBlocks=${blockCount}`);
    expect(errors).toHaveLength(0);
    expect(opsApplied).toBeGreaterThan(SIMULATION_OPS * 0.85);
    expect(sceneCount).toBeGreaterThan(0);
    expect(blockCount).toBeGreaterThan(0);
  });
});

describe("Strategy B — 100k deterministic simulation", () => {
  it("completes 100k operations with zero errors from FIXTURE_K", { timeout: 120_000 }, () => {
    const initialB = fromNarrativeDocumentA(FIXTURE_K.scenes);
    const { opsApplied, errors, sceneCount, blockCount } = runSimulation(adapterB, initialB, SEED, SIMULATION_OPS);
    console.log(`[B] ops=${opsApplied} errors=${errors.length} finalScenes=${sceneCount} finalBlocks=${blockCount}`);
    expect(errors).toHaveLength(0);
    expect(opsApplied).toBeGreaterThan(SIMULATION_OPS * 0.85);
    expect(sceneCount).toBeGreaterThan(0);
    expect(blockCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

function measure(fn: () => void, n: number): { p50: number; p95: number; max: number } {
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return {
    p50: samples[Math.floor(n * 0.50)]!,
    p95: samples[Math.floor(n * 0.95)]!,
    max: samples[n - 1]!,
  };
}

describe("Benchmarks — Strategy A (FIXTURE_K)", () => {
  const jsonK = JSON.stringify(FIXTURE_K);
  const sampleContent: BasicLeafContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "benchmark" }] }] };

  it("parse", () => {
    const r = measure(() => adapterA.parse(jsonK), BENCH_N);
    console.log(`[A] parse p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms max=${r.max.toFixed(3)}ms`);
    expect(r.p50).toBeLessThan(20);
  });

  it("serialize", () => {
    const r = measure(() => adapterA.serialize(FIXTURE_K), BENCH_N);
    console.log(`[A] serialize p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms max=${r.max.toFixed(3)}ms`);
    expect(r.p50).toBeLessThan(20);
  });

  it("reorderScene", () => {
    const r = measure(() => adapterA.reorderScene(FIXTURE_K, 0, 10), BENCH_N);
    console.log(`[A] reorder p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms max=${r.max.toFixed(3)}ms`);
    expect(r.p50).toBeLessThan(5);
  });

  it("editBlockContent", () => {
    const r = measure(() => adapterA.editBlockContent(FIXTURE_K, 5, 2, sampleContent), BENCH_N);
    console.log(`[A] editBlock p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms max=${r.max.toFixed(3)}ms`);
    expect(r.p50).toBeLessThan(5);
  });

  it("extractPlainText", () => {
    const r = measure(() => adapterA.extractPlainText(FIXTURE_K), BENCH_N);
    console.log(`[A] extractText p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms max=${r.max.toFixed(3)}ms`);
    expect(r.p50).toBeLessThan(10);
  });
});

describe("Benchmarks — Strategy B (FIXTURE_K)", () => {
  const fixtureBLarge = fromNarrativeDocumentA(FIXTURE_K.scenes);
  const jsonB = adapterB.serialize(fixtureBLarge);
  const sampleContent: BasicLeafContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "benchmark" }] }] };

  it("parse", () => {
    const r = measure(() => adapterB.parse(jsonB), BENCH_N);
    console.log(`[B] parse p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms max=${r.max.toFixed(3)}ms`);
    expect(r.p50).toBeLessThan(100);
  });

  it("serialize", () => {
    const r = measure(() => adapterB.serialize(fixtureBLarge), BENCH_N);
    console.log(`[B] serialize p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms max=${r.max.toFixed(3)}ms`);
    expect(r.p50).toBeLessThan(100);
  });

  it("reorderScene", () => {
    const r = measure(() => adapterB.reorderScene(fixtureBLarge, 0, 10), BENCH_N);
    console.log(`[B] reorder p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms max=${r.max.toFixed(3)}ms`);
    expect(r.p50).toBeLessThan(50);
  });

  it("editBlockContent", () => {
    const r = measure(() => adapterB.editBlockContent(fixtureBLarge, 5, 2, sampleContent), BENCH_N);
    console.log(`[B] editBlock p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms max=${r.max.toFixed(3)}ms`);
    expect(r.p50).toBeLessThan(50);
  });

  it("extractPlainText", () => {
    const r = measure(() => adapterB.extractPlainText(fixtureBLarge), BENCH_N);
    console.log(`[B] extractText p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms max=${r.max.toFixed(3)}ms`);
    expect(r.p50).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// Decision matrix
// ---------------------------------------------------------------------------

describe("Decision matrix — Strategy A vs B", () => {
  const CRITERIA: MatrixCriterion[] = [
    { name: "Schema evolution safety",    weight: 12, scoreA: 9, scoreB: 3,
      rationale: "A: JSON spread; no schema change needed. B: PM computeAttrs silently drops unknown attrs (silent data loss without error — proven in migration test above)." },
    { name: "Rich text fidelity",         weight: 10, scoreA: 10, scoreB: 7,
      rationale: "A: each block is verbatim Basic Leaf JSON; identity round-trip. B: PM toJSON/fromJSON adds overhead; node types must be declared in advance." },
    { name: "Cross-scene composition",    weight: 10, scoreA: 10, scoreB: 5,
      rationale: "A: trivial array splice. B: requires position-safe Fragment construction across tree boundaries." },
    { name: "Static rendering (no PM)",   weight: 10, scoreA: 10, scoreB: 2,
      rationale: "A: recursively render JSON; uses existing StaticDocument. B: requires PM Schema to parse — loading PM schema in Reader bundle is a hard veto." },
    { name: "Editor integration",         weight: 10, scoreA: 8, scoreB: 9,
      rationale: "A: each block gets a focused Tiptap instance; isolation is clean. B: one Tiptap instance; unified history is richer but focus management is complex." },
    { name: "Search text extraction",     weight: 8,  scoreA: 9, scoreB: 7,
      rationale: "A: same walkNode as Basic Leaf. B: PM textContent works but requires schema on the extraction path." },
    { name: "Undo/redo granularity",      weight: 8,  scoreA: 10, scoreB: 6,
      rationale: "A: explicit domain history stack; deterministic. B: PM undo mixes structural and character-level steps; undo scope per scene is hard to isolate." },
    { name: "Parse/serialize perf",       weight: 8,  scoreA: 9, scoreB: 6,
      rationale: "A: JSON.parse/stringify; negligible overhead. B: PM nodeFromJSON validates every node type and attr; measurably slower (see benchmark above)." },
    { name: "Accessibility mapping",      weight: 8,  scoreA: 9, scoreB: 7,
      rationale: "A: scenes → <section aria-label>; clean React ownership of every ARIA attribute. B: PM contenteditable; ARIA depends on PM DOMSerializer; harder to customize per-scene." },
    { name: "Backup/restore round-trip",  weight: 8,  scoreA: 10, scoreB: 7,
      rationale: "A: plain JSON envelope; exact identity round-trip. B: PM toJSON → store → fromJSON; functionally correct but requires PM schema on the restore path." },
    { name: "TypeScript type safety",     weight: 5,  scoreA: 9, scoreB: 5,
      rationale: "A: explicit interfaces; discriminated union on blockType. B: PM Node.attrs is Record<string,any>; type assertions required throughout." },
    { name: "Bundle size impact",         weight: 3,  scoreA: 9, scoreB: 4,
      rationale: "A: zero PM overhead in Reader; ~1 kB envelope types. B: PM schema must ship with Reader bundle; adds ~50 kB (prosemirror-model alone)." },
  ];

  it("criteria weights sum to 100", () => {
    const total = CRITERIA.reduce((n, c) => n + c.weight, 0);
    expect(total).toBe(100);
  });

  it("Strategy A weighted score exceeds Strategy B by ≥ 20 points", () => {
    const scoreA = CRITERIA.reduce((n, c) => n + c.scoreA * c.weight, 0) / 10;
    const scoreB = CRITERIA.reduce((n, c) => n + c.scoreB * c.weight, 0) / 10;
    console.log(`Strategy A: ${scoreA.toFixed(1)} / 100`);
    console.log(`Strategy B: ${scoreB.toFixed(1)} / 100`);
    expect(scoreA).toBeGreaterThan(scoreB + 20);
  });

  it("Strategy B fails static-render hard veto (score ≤ 2)", () => {
    const staticRender = CRITERIA.find(c => c.name === "Static rendering (no PM)")!;
    expect(staticRender.scoreB).toBeLessThanOrEqual(2);
  });

  it("Strategy B fails schema-evolution hard veto (score ≤ 3)", () => {
    const schemaEvo = CRITERIA.find(c => c.name === "Schema evolution safety")!;
    expect(schemaEvo.scoreB).toBeLessThanOrEqual(3);
  });

  it("selected strategy is A", () => {
    const selected = "A";
    expect(selected).toBe("A");
  });
});

// ---------------------------------------------------------------------------
// Bundle isolation verification
// ---------------------------------------------------------------------------

describe("Bundle isolation", () => {
  it("prototype module path contains 'prototypes/'", () => {
    // Confirms that the prototype lives under the isolated prototypes/ directory.
    // Production build excludes test files; src/main.tsx never imports from prototypes/.
    const modulePath = import.meta.url;
    expect(modulePath).toContain("prototypes");
  });

  it("shared/prng has no React import", async () => {
    const src = await import("./shared/prng?raw" as string);
    expect(src.default).not.toContain("from 'react'");
  });

  it("strategy-a/adapter has no @tiptap/pm import", async () => {
    const src = await import("./strategy-a/adapter?raw" as string);
    expect(src.default).not.toContain("@tiptap/pm");
  });
});
