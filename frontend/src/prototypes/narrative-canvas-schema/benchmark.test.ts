// Benchmark test file for Narrative Canvas A/B prototype.
// Measures parse, serialize, projectToStatic, extractPlainText, reorderScene, insertBlock, moveBlock.
// Runs at small (FIXTURE_S), medium (FIXTURE_MEDIUM), and large scales.

import { describe, it } from "vitest";
import { FIXTURE_S, FIXTURE_K, FIXTURE_MEDIUM, makeRichTextBlock } from "./shared/fixtures";
import { adapterA } from "./strategy-a/adapter";
import { adapterB, fromSemanticDocument } from "./strategy-b/adapter";

// ---------------------------------------------------------------------------
// Measurement helper
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

function byteSize(json: string): number {
  return new TextEncoder().encode(json).byteLength;
}

// ---------------------------------------------------------------------------
// Small benchmarks (FIXTURE_S: 8 scenes / 40 blocks)
// ---------------------------------------------------------------------------

describe("Benchmarks — Strategy A (FIXTURE_S)", { timeout: 60_000 }, () => {
  const json = adapterA.serialize(FIXTURE_S);
  const BENCH_N = 500;

  it("parse", () => {
    const r = measure(() => adapterA.parse(json), BENCH_N);
    console.log(`[A/S] parse p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms max=${r.max.toFixed(3)}ms bytes=${byteSize(json)}`);
  });

  it("serialize", () => {
    const r = measure(() => adapterA.serialize(FIXTURE_S), BENCH_N);
    console.log(`[A/S] serialize p50=${r.p50.toFixed(3)}ms`);
  });

  it("projectToStatic", () => {
    const r = measure(() => adapterA.projectToStatic(FIXTURE_S), BENCH_N);
    console.log(`[A/S] projectToStatic p50=${r.p50.toFixed(3)}ms`);
  });

  it("extractPlainText", () => {
    const r = measure(() => adapterA.extractPlainText(FIXTURE_S), BENCH_N);
    console.log(`[A/S] extractPlainText p50=${r.p50.toFixed(3)}ms`);
  });

  it("reorderScene", () => {
    const r = measure(() => adapterA.reorderScene(FIXTURE_S, 0, 5), BENCH_N);
    console.log(`[A/S] reorderScene p50=${r.p50.toFixed(3)}ms`);
  });

  it("insertBlock", () => {
    const block = makeRichTextBlock("bench-block", "bench");
    const r = measure(() => adapterA.insertBlock(FIXTURE_S, 0, 0, block), BENCH_N);
    console.log(`[A/S] insertBlock p50=${r.p50.toFixed(3)}ms`);
  });

  it("moveBlock", () => {
    const r = measure(() => adapterA.moveBlock(FIXTURE_S, 0, 0, 1, 0), BENCH_N);
    console.log(`[A/S] moveBlock p50=${r.p50.toFixed(3)}ms`);
  });
});

describe("Benchmarks — Strategy B (FIXTURE_S)", { timeout: 60_000 }, () => {
  const docB = fromSemanticDocument(FIXTURE_S);
  const json = adapterB.serialize(docB);
  const BENCH_N = 500;

  it("parse", () => {
    const r = measure(() => adapterB.parse(json), BENCH_N);
    console.log(`[B/S] parse p50=${r.p50.toFixed(3)}ms bytes=${byteSize(json)}`);
  });

  it("serialize", () => {
    const r = measure(() => adapterB.serialize(docB), BENCH_N);
    console.log(`[B/S] serialize p50=${r.p50.toFixed(3)}ms`);
  });

  it("projectToStatic", () => {
    const r = measure(() => adapterB.projectToStatic(docB), BENCH_N);
    console.log(`[B/S] projectToStatic p50=${r.p50.toFixed(3)}ms`);
  });

  it("extractPlainText", () => {
    const r = measure(() => adapterB.extractPlainText(docB), BENCH_N);
    console.log(`[B/S] extractPlainText p50=${r.p50.toFixed(3)}ms`);
  });

  it("reorderScene", () => {
    const r = measure(() => adapterB.reorderScene(docB, 0, 5), BENCH_N);
    console.log(`[B/S] reorderScene p50=${r.p50.toFixed(3)}ms`);
  });

  it("insertBlock", () => {
    const block = makeRichTextBlock("bench-block-b", "bench");
    const r = measure(() => adapterB.insertBlock(docB, 0, 0, block), BENCH_N);
    console.log(`[B/S] insertBlock p50=${r.p50.toFixed(3)}ms`);
  });

  it("moveBlock", () => {
    const r = measure(() => adapterB.moveBlock(docB, 0, 0, 1, 0), BENCH_N);
    console.log(`[B/S] moveBlock p50=${r.p50.toFixed(3)}ms`);
  });
});

// ---------------------------------------------------------------------------
// Medium benchmarks (FIXTURE_K: 20 scenes / 100 blocks)
// ---------------------------------------------------------------------------

describe("Benchmarks — Strategy A (FIXTURE_K, 20 scenes)", { timeout: 60_000 }, () => {
  const json = adapterA.serialize(FIXTURE_K);
  const BENCH_N = 300;

  it("parse", () => {
    const r = measure(() => adapterA.parse(json), BENCH_N);
    console.log(`[A/K] parse p50=${r.p50.toFixed(3)}ms bytes=${byteSize(json)}`);
  });

  it("reorderScene", () => {
    const r = measure(() => adapterA.reorderScene(FIXTURE_K, 0, 10), BENCH_N);
    console.log(`[A/K] reorderScene p50=${r.p50.toFixed(3)}ms`);
  });

  it("projectToStatic", () => {
    const r = measure(() => adapterA.projectToStatic(FIXTURE_K), BENCH_N);
    console.log(`[A/K] projectToStatic p50=${r.p50.toFixed(3)}ms`);
  });
});

describe("Benchmarks — Strategy B (FIXTURE_K, 20 scenes)", { timeout: 60_000 }, () => {
  const docB = fromSemanticDocument(FIXTURE_K);
  const json = adapterB.serialize(docB);
  const BENCH_N = 300;

  it("parse", () => {
    const r = measure(() => adapterB.parse(json), BENCH_N);
    console.log(`[B/K] parse p50=${r.p50.toFixed(3)}ms bytes=${byteSize(json)}`);
  });

  it("reorderScene", () => {
    const r = measure(() => adapterB.reorderScene(docB, 0, 10), BENCH_N);
    console.log(`[B/K] reorderScene p50=${r.p50.toFixed(3)}ms`);
  });

  it("projectToStatic", () => {
    const r = measure(() => adapterB.projectToStatic(docB), BENCH_N);
    console.log(`[B/K] projectToStatic p50=${r.p50.toFixed(3)}ms`);
  });
});

// ---------------------------------------------------------------------------
// Large benchmarks (FIXTURE_MEDIUM: 100 scenes / 500 blocks)
// ---------------------------------------------------------------------------

describe("Benchmarks — Strategy A (FIXTURE_MEDIUM, 100 scenes)", { timeout: 60_000 }, () => {
  const json = adapterA.serialize(FIXTURE_MEDIUM);
  const BENCH_N = 100;

  it("parse", () => {
    const r = measure(() => adapterA.parse(json), BENCH_N);
    console.log(`[A/M] parse p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms bytes=${byteSize(json)}`);
  });

  it("reorderScene", () => {
    const r = measure(() => adapterA.reorderScene(FIXTURE_MEDIUM, 0, 50), BENCH_N);
    console.log(`[A/M] reorderScene p50=${r.p50.toFixed(3)}ms`);
  });

  it("projectToStatic", () => {
    const r = measure(() => adapterA.projectToStatic(FIXTURE_MEDIUM), BENCH_N);
    console.log(`[A/M] projectToStatic p50=${r.p50.toFixed(3)}ms`);
  });

  it("extractPlainText", () => {
    const r = measure(() => adapterA.extractPlainText(FIXTURE_MEDIUM), BENCH_N);
    console.log(`[A/M] extractPlainText p50=${r.p50.toFixed(3)}ms`);
  });
});

describe("Benchmarks — Strategy B (FIXTURE_MEDIUM, 100 scenes)", { timeout: 60_000 }, () => {
  const docB = fromSemanticDocument(FIXTURE_MEDIUM);
  const json = adapterB.serialize(docB);
  const BENCH_N = 100;

  it("parse", () => {
    const r = measure(() => adapterB.parse(json), BENCH_N);
    console.log(`[B/M] parse p50=${r.p50.toFixed(3)}ms p95=${r.p95.toFixed(3)}ms bytes=${byteSize(json)}`);
  });

  it("reorderScene", () => {
    const r = measure(() => adapterB.reorderScene(docB, 0, 50), BENCH_N);
    console.log(`[B/M] reorderScene p50=${r.p50.toFixed(3)}ms`);
  });

  it("projectToStatic", () => {
    const r = measure(() => adapterB.projectToStatic(docB), BENCH_N);
    console.log(`[B/M] projectToStatic p50=${r.p50.toFixed(3)}ms`);
  });

  it("extractPlainText", () => {
    const r = measure(() => adapterB.extractPlainText(docB), BENCH_N);
    console.log(`[B/M] extractPlainText p50=${r.p50.toFixed(3)}ms`);
  });
});
