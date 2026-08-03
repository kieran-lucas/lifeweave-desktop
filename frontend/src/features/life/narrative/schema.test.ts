import { describe, it, expect } from "vitest";
import { parseNarrative, serializeNarrative, isUnknownBlock, toNarrativeCanonicalValue } from "./schema";

const KNOWN_DOC = JSON.stringify({
  schemaVersion: 1,
  documentId: "019700000000-0000-7000-8000-000000000001",
  title: "Test",
  templateId: "knowledge_dossier",
  templateVersion: 1,
  scenes: [{
    id: "019700000000-0000-7000-8000-000000000002",
    title: "",
    layoutPreset: "single_column",
    atmosphere: "neutral",
    motionPreset: "none",
    blocks: [],
  }],
});

const UNKNOWN_BLOCK_DOC = JSON.stringify({
  schemaVersion: 1,
  documentId: "019700000000-0000-7000-8000-000000000001",
  title: "Test",
  templateId: "knowledge_dossier",
  templateVersion: 1,
  scenes: [{
    id: "019700000000-0000-7000-8000-000000000002",
    title: "",
    layoutPreset: "single_column",
    atmosphere: "neutral",
    motionPreset: "none",
    blocks: [{
      kind: "future_block_v2",
      id: "019700000000-0000-7000-8000-000000000003",
      someField: "someValue",
      nested: { a: 1 },
    }],
  }],
});

describe("parseNarrative", () => {
  it("parses a known document", () => {
    const doc = parseNarrative(KNOWN_DOC);
    expect(doc.documentId).toBe("019700000000-0000-7000-8000-000000000001");
    expect(doc.scenes).toHaveLength(1);
  });

  it("throws on schemaVersion !== 1", () => {
    expect(() => parseNarrative(JSON.stringify({ ...JSON.parse(KNOWN_DOC), schemaVersion: 2 }))).toThrow("schemaVersion");
  });

  it("throws on wrong templateId", () => {
    expect(() => parseNarrative(JSON.stringify({ ...JSON.parse(KNOWN_DOC), templateId: "other" }))).toThrow("templateId");
  });

  it("throws on wrong templateVersion", () => {
    expect(() => parseNarrative(JSON.stringify({ ...JSON.parse(KNOWN_DOC), templateVersion: 2 }))).toThrow("templateVersion");
  });

  it("throws on more than one scene", () => {
    const d = JSON.parse(KNOWN_DOC);
    d.scenes.push({ ...d.scenes[0], id: "other" });
    expect(() => parseNarrative(JSON.stringify(d))).toThrow("exactly one scene");
  });

  it("throws on wrong layoutPreset", () => {
    const d = JSON.parse(KNOWN_DOC);
    d.scenes[0].layoutPreset = "two_column";
    expect(() => parseNarrative(JSON.stringify(d))).toThrow("layoutPreset");
  });

  it("throws on wrong atmosphere", () => {
    const d = JSON.parse(KNOWN_DOC);
    d.scenes[0].atmosphere = "dark";
    expect(() => parseNarrative(JSON.stringify(d))).toThrow("atmosphere");
  });

  it("throws on wrong motionPreset", () => {
    const d = JSON.parse(KNOWN_DOC);
    d.scenes[0].motionPreset = "fast";
    expect(() => parseNarrative(JSON.stringify(d))).toThrow("motionPreset");
  });

  it("throws on non-string metric.label", () => {
    const d = JSON.parse(KNOWN_DOC);
    d.scenes[0].blocks = [{ kind: "metric", id: "b1", label: 42, value: "v", unit: "", description: "" }];
    expect(() => parseNarrative(JSON.stringify(d))).toThrow("label");
  });

  it("preserves unknown block as UnknownNarrativeBlock with full canonical", () => {
    const doc = parseNarrative(UNKNOWN_BLOCK_DOC);
    const block = doc.scenes[0]!.blocks[0]!;
    expect(isUnknownBlock(block)).toBe(true);
    if (isUnknownBlock(block)) {
      expect(block.kind).toBe("future_block_v2");
      expect(block.canonical["someField"]).toBe("someValue");
      expect((block.canonical["nested"] as Record<string, unknown>)["a"]).toBe(1);
      expect(block.canonicalId).toBe("019700000000-0000-7000-8000-000000000003");
    }
  });
});

describe("serializeNarrative round-trip", () => {
  it("round-trips a known document", () => {
    const doc = parseNarrative(KNOWN_DOC);
    const re = parseNarrative(serializeNarrative(doc));
    expect(re.documentId).toBe(doc.documentId);
  });

  it("round-trips unknown block with all fields preserved", () => {
    const doc = parseNarrative(UNKNOWN_BLOCK_DOC);
    const serialized = serializeNarrative(doc);
    const parsed2 = JSON.parse(serialized);
    const block = parsed2.scenes[0].blocks[0];
    expect(block.kind).toBe("future_block_v2");
    expect(block.someField).toBe("someValue");
    expect(block.nested.a).toBe(1);
    expect(block.id).toBe("019700000000-0000-7000-8000-000000000003");
  });

  it("known blocks emit only V1 fields (no extra keys)", () => {
    const d = JSON.parse(KNOWN_DOC);
    d.scenes[0].blocks = [{ kind: "metric", id: "b1", label: "L", value: "V", unit: "u", description: "d", extraField: "SHOULD_NOT_APPEAR" }];
    const doc = parseNarrative(JSON.stringify(d));
    const out = JSON.parse(serializeNarrative(doc));
    expect(out.scenes[0].blocks[0].extraField).toBeUndefined();
  });
});

// Ensure toNarrativeCanonicalValue is exported and callable (used by serializeNarrative)
describe("toNarrativeCanonicalValue", () => {
  it("returns a plain object with expected top-level keys", () => {
    const doc = parseNarrative(KNOWN_DOC);
    const val = toNarrativeCanonicalValue(doc);
    expect(val.schemaVersion).toBe(1);
    expect(val.templateId).toBe("knowledge_dossier");
    expect(Array.isArray(val.scenes)).toBe(true);
  });
});

describe("parseNarrative + serializeNarrative performance", () => {
  function makeDoc(blockCount: number): string {
    const blocks = Array.from({ length: blockCount }, (_, i) => ({
      kind: "rich_text",
      id: `019700000000-0000-7000-8000-${String(i).padStart(12, "0")}`,
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `Block ${i} content text here` }] }] },
    }));
    return JSON.stringify({
      schemaVersion: 1,
      documentId: "019700000000-0000-7fff-8000-000000000001",
      title: "Perf test",
      templateId: "knowledge_dossier",
      templateVersion: 1,
      scenes: [{
        id: "019700000000-0000-7fff-8000-000000000002",
        title: "",
        layoutPreset: "single_column",
        atmosphere: "neutral",
        motionPreset: "none",
        blocks,
      }],
    });
  }

  function measure(fn: () => void, iterations = 100): { p50: number; p95: number; max: number } {
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    return {
      p50: times[Math.floor(iterations * 0.50)]!,
      p95: times[Math.floor(iterations * 0.95)]!,
      max: times[times.length - 1]!,
    };
  }

  for (const blockCount of [5, 50, 128] as const) {
    it(`parse + serialize ${blockCount} blocks: p95 ≤ 50ms`, () => {
      const json = makeDoc(blockCount);
      const stats = measure(() => {
        const doc = parseNarrative(json);
        serializeNarrative(doc);
      });
      console.log(`parse+serialize ${blockCount} blocks: p50=${stats.p50.toFixed(2)}ms p95=${stats.p95.toFixed(2)}ms max=${stats.max.toFixed(2)}ms`);
      expect(stats.p95).toBeLessThan(50); // 50ms p95 target
    });
  }
});
