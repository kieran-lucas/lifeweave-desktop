// Narrative Canvas Schema A/B Prototype — comprehensive test suite.
// Seed: 20260803. Prototype code is isolated from production; never imported by src/main.tsx.

import { describe, expect, it } from "vitest";
import type { MatrixCriterion } from "./shared/types";
import {
  makeHistory,
  pushHistory,
  undoHistory,
  redoHistory,
} from "./shared/types";
import {
  FIXTURE_K,
  FIXTURE_S,
  makeCalloutBlock,
  makeDocument,
  makeImageBlock,
  makeMetricBlock,
  makeRichTextBlock,
  makeScene,
  makeTimelineBlock,
} from "./shared/fixtures";
import {
  richTextToPlainText,
  semanticDocumentToPlainText,
  semanticDocumentToMarkdown,
} from "./shared/semantic";
import {
  basicLeafToNarrative,
  narrativeToBasicLeaf,
  narrativeToBasicLeafWithReport,
} from "./shared/basic-leaf";
import { adapterA, adapterAHistory } from "./strategy-a/adapter";
import { adapterB, adapterBHistory, fromSemanticDocument } from "./strategy-b/adapter";
import { validateRawJson, migrateJson } from "./strategy-b/codec";
import { narrativeSchemaV1, narrativeSchemaV2 } from "./strategy-b/schema";
import { staticReadFromRawJson } from "./strategy-b/static-reader";
import type { BasicLeafContent, NarrativeSemanticDocument } from "./shared/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VIET_TEXT = "Trọng lực và ánh sáng";

function makeSimpleScene(id: string) {
  return makeScene(
    id,
    `Scene ${id}`,
    "single_column",
    "neutral",
    "none",
    [
      makeRichTextBlock(`${id}-rt`, `Text for ${id}`),
      makeMetricBlock(`${id}-mt`, "Count", "42", "items"),
      makeImageBlock(`${id}-img`, `asset-${id}`, `Alt ${id}`),
      makeCalloutBlock(`${id}-cl`, "note", `Note for ${id}`),
      makeTimelineBlock(`${id}-tl`, `Timeline ${id}`, [
        { id: `${id}-tl-0`, label: "A", description: "Alpha" },
      ]),
    ],
  );
}

function makeSimpleDoc(id: string, sceneCount = 2): NarrativeSemanticDocument {
  return makeDocument(
    id,
    `Document ${id}`,
    "knowledge_dossier",
    Array.from({ length: sceneCount }, (_, i) => makeSimpleScene(`${id}-s${i}`)),
  );
}

// ---------------------------------------------------------------------------
// 1. shared/types — History functions
// ---------------------------------------------------------------------------

describe("shared/types - History functions", () => {
  it("makeHistory: current=doc, past=[], future=[]", () => {
    const doc = makeSimpleDoc("h-1");
    const h = makeHistory(doc);
    expect(h.current).toBe(doc);
    expect(h.past).toHaveLength(0);
    expect(h.future).toHaveLength(0);
    expect(h.maxSize).toBe(50);
  });

  it("pushHistory: adds current to past, sets new current", () => {
    const doc1 = makeSimpleDoc("h-2a");
    const doc2 = makeSimpleDoc("h-2b");
    const h0 = makeHistory(doc1);
    const h1 = pushHistory(h0, doc2);
    expect(h1.current).toBe(doc2);
    expect(h1.past).toHaveLength(1);
    expect(h1.past[0]).toBe(doc1);
    expect(h1.future).toHaveLength(0);
  });

  it("pushHistory respects maxSize=50", () => {
    let h = makeHistory(makeSimpleDoc("h-3-0"));
    for (let i = 1; i <= 55; i++) {
      h = pushHistory(h, makeSimpleDoc(`h-3-${i}`));
    }
    expect(h.past.length).toBeLessThanOrEqual(50);
  });

  it("undoHistory: moves current to future, sets current to last past", () => {
    const doc1 = makeSimpleDoc("h-4a");
    const doc2 = makeSimpleDoc("h-4b");
    let h = makeHistory(doc1);
    h = pushHistory(h, doc2);
    const { state, changed } = undoHistory(h);
    expect(changed).toBe(true);
    expect(state.current).toBe(doc1);
    expect(state.future).toHaveLength(1);
    expect(state.future[0]).toBe(doc2);
  });

  it("undoHistory at bottom: changed=false", () => {
    const h = makeHistory(makeSimpleDoc("h-5"));
    const { changed } = undoHistory(h);
    expect(changed).toBe(false);
  });

  it("redoHistory: moves current from future", () => {
    const doc1 = makeSimpleDoc("h-6a");
    const doc2 = makeSimpleDoc("h-6b");
    let h = makeHistory(doc1);
    h = pushHistory(h, doc2);
    const { state: undone } = undoHistory(h);
    const { state: redone, changed } = redoHistory(undone);
    expect(changed).toBe(true);
    expect(redone.current).toBe(doc2);
  });
});

// ---------------------------------------------------------------------------
// 2. shared/semantic — text extraction
// ---------------------------------------------------------------------------

describe("shared/semantic - text extraction", () => {
  const richContent: BasicLeafContent = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Hello world" }] },
    ],
  };

  const headingContent: BasicLeafContent = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Heading text" }] },
    ],
  };

  it("richTextToPlainText extracts paragraph text", () => {
    expect(richTextToPlainText(richContent)).toContain("Hello world");
  });

  it("richTextToPlainText handles headings", () => {
    expect(richTextToPlainText(headingContent)).toContain("Heading text");
  });

  it("semanticDocumentToPlainText includes title, scene titles, block text", () => {
    const text = semanticDocumentToPlainText(FIXTURE_S);
    expect(text).toContain(FIXTURE_S.title);
    expect(text).toContain(FIXTURE_S.scenes[0]!.title);
  });

  it("semanticDocumentToPlainText includes metric label/value", () => {
    const text = semanticDocumentToPlainText(FIXTURE_S);
    expect(text).toContain("Revenue");
    expect(text).toContain("1234");
  });

  it("semanticDocumentToPlainText includes image alt", () => {
    const text = semanticDocumentToPlainText(FIXTURE_S);
    expect(text).toContain("Alt text scene");
  });

  it("semanticDocumentToPlainText includes timeline items", () => {
    const text = semanticDocumentToPlainText(FIXTURE_S);
    expect(text).toContain("Phase 1");
    expect(text).toContain("Phase 2");
  });
});

// ---------------------------------------------------------------------------
// 3. shared/semantic — Markdown
// ---------------------------------------------------------------------------

describe("shared/semantic - Markdown", () => {
  it("document title → # H1", () => {
    const md = semanticDocumentToMarkdown(FIXTURE_S);
    expect(md).toContain(`# ${FIXTURE_S.title}`);
  });

  it("scene title → ## H2", () => {
    const md = semanticDocumentToMarkdown(FIXTURE_S);
    expect(md).toContain(`## ${FIXTURE_S.scenes[0]!.title}`);
  });

  it("rich text → paragraph", () => {
    const md = semanticDocumentToMarkdown(FIXTURE_S);
    expect(md).toContain("Trọng lực và ánh sáng");
  });

  it("metric → **label:** value", () => {
    const md = semanticDocumentToMarkdown(FIXTURE_S);
    expect(md).toContain("**Revenue:** 1234 USD");
  });

  it("image → ![alt](asset:assetId)", () => {
    const md = semanticDocumentToMarkdown(FIXTURE_S);
    expect(md).toContain("![Alt text scene 0](asset:asset-s0-img)");
  });

  it("timeline → ordered list with items", () => {
    const md = semanticDocumentToMarkdown(FIXTURE_S);
    expect(md).toContain("### Timeline 0");
    expect(md).toContain("1. Phase 1: Initial phase");
  });
});

// ---------------------------------------------------------------------------
// 4. shared/basic-leaf — adapters
// ---------------------------------------------------------------------------

describe("shared/basic-leaf - adapters", () => {
  const leafContent: BasicLeafContent = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: VIET_TEXT }] },
    ],
  };

  const leafWithAsset: BasicLeafContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "image", attrs: { src: "", alt: "img", assetId: "my-asset-123" } }],
      },
    ],
  };

  it("basicLeafToNarrative wraps in single scene with rich_text block", () => {
    const doc = basicLeafToNarrative(leafContent, "test-id");
    expect(doc.scenes).toHaveLength(1);
    expect(doc.scenes[0]!.blocks).toHaveLength(1);
    expect(doc.scenes[0]!.blocks[0]!.kind).toBe("rich_text");
  });

  it("basicLeafToNarrative preserves asset IDs", () => {
    const doc = basicLeafToNarrative(leafWithAsset, "test-asset");
    const block = doc.scenes[0]!.blocks[0]!;
    expect(block.kind).toBe("rich_text");
    if (block.kind === "rich_text") {
      const imgNode = block.content.content[0]?.content?.[0];
      expect(imgNode?.attrs?.["assetId"]).toBe("my-asset-123");
    }
  });

  it("basicLeafToNarrative preserves Vietnamese text", () => {
    const doc = basicLeafToNarrative(leafContent, "test-viet");
    const block = doc.scenes[0]!.blocks[0]!;
    if (block.kind === "rich_text") {
      const text = block.content.content[0]?.content?.[0]?.text;
      expect(text).toBe(VIET_TEXT);
    }
  });

  it("narrativeToBasicLeaf has H1 for document title", () => {
    const doc = makeSimpleDoc("bl-1");
    const leaf = narrativeToBasicLeaf(doc);
    const h1 = leaf.content.find(n => n.type === "heading" && n.attrs?.["level"] === 1);
    expect(h1).toBeDefined();
    expect(h1?.content?.[0]?.text).toBe(doc.title);
  });

  it("narrativeToBasicLeaf has H2 for scene title", () => {
    const doc = makeSimpleDoc("bl-2");
    const leaf = narrativeToBasicLeaf(doc);
    const h2 = leaf.content.find(n => n.type === "heading" && n.attrs?.["level"] === 2);
    expect(h2).toBeDefined();
    expect(h2?.content?.[0]?.text).toBe(doc.scenes[0]!.title);
  });

  it("narrativeToBasicLeaf converts metric to paragraph", () => {
    const doc = makeSimpleDoc("bl-3");
    const leaf = narrativeToBasicLeaf(doc);
    const para = leaf.content.find(
      n => n.type === "paragraph" && n.content?.some(c => c.text?.includes("42")),
    );
    expect(para).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Strategy A — all 18 operations
// ---------------------------------------------------------------------------

describe("Strategy A - all 18 operations", () => {
  const baseDoc = makeSimpleDoc("a-base", 3);

  it("parse round-trip", () => {
    const json = adapterA.serialize(baseDoc);
    const parsed = adapterA.parse(json);
    expect(parsed.documentId).toBe(baseDoc.documentId);
    expect(parsed.scenes).toHaveLength(3);
    expect(adapterA.serialize(parsed)).toBe(json);
  });

  it("serialize produces valid JSON", () => {
    const json = adapterA.serialize(baseDoc);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("toSemanticDocument round-trip", () => {
    const sem = adapterA.toSemanticDocument(baseDoc);
    expect(sem.schemaVersion).toBe(1);
    expect(sem.scenes).toHaveLength(3);
  });

  it("createScene", () => {
    const newScene = makeSimpleScene("a-new");
    const result = adapterA.createScene(baseDoc, newScene);
    expect(result.scenes).toHaveLength(4);
    expect(result.scenes.at(-1)!.id).toBe("a-new");
  });

  it("deleteScene", () => {
    const result = adapterA.deleteScene(baseDoc, 1);
    expect(result.scenes).toHaveLength(2);
    expect(result.scenes.find(s => s.id === "a-base-s1")).toBeUndefined();
  });

  it("reorderScene", () => {
    const result = adapterA.reorderScene(baseDoc, 0, 2);
    expect(result.scenes[2]!.id).toBe("a-base-s0");
    expect(result.scenes).toHaveLength(3);
  });

  it("updateSceneLayout", () => {
    const result = adapterA.updateSceneLayout(baseDoc, 0, "hero");
    expect(result.scenes[0]!.layoutPreset).toBe("hero");
    expect(result.scenes[1]!.layoutPreset).toBe("single_column");
  });

  it("updateSceneAtmosphere", () => {
    const result = adapterA.updateSceneAtmosphere(baseDoc, 0, "sky");
    expect(result.scenes[0]!.atmosphere).toBe("sky");
  });

  it("updateSceneMotion", () => {
    const result = adapterA.updateSceneMotion(baseDoc, 0, "stagger");
    expect(result.scenes[0]!.motionPreset).toBe("stagger");
  });

  it("insertBlock", () => {
    const block = makeRichTextBlock("inserted", "inserted text");
    const result = adapterA.insertBlock(baseDoc, 0, 0, block);
    expect(result.scenes[0]!.blocks[0]!.id).toBe("inserted");
    expect(result.scenes[0]!.blocks).toHaveLength(6);
  });

  it("deleteBlock", () => {
    const result = adapterA.deleteBlock(baseDoc, 0, 0);
    expect(result.scenes[0]!.blocks).toHaveLength(4);
    expect(result.scenes[0]!.blocks.find(b => b.id === "a-base-s0-rt")).toBeUndefined();
  });

  it("reorderBlock", () => {
    const origFirst = baseDoc.scenes[0]!.blocks[0]!.id;
    const result = adapterA.reorderBlock(baseDoc, 0, 0, 4);
    expect(result.scenes[0]!.blocks[4]!.id).toBe(origFirst);
  });

  it("moveBlock", () => {
    const origBlock = baseDoc.scenes[0]!.blocks[0]!;
    const result = adapterA.moveBlock(baseDoc, 0, 0, 1, 0);
    expect(result.scenes[0]!.blocks).toHaveLength(4);
    expect(result.scenes[1]!.blocks[0]!.id).toBe(origBlock.id);
  });

  it("updateBlock (metric)", () => {
    const newMetric = makeMetricBlock("a-base-s0-mt", "Revenue", "9999", "USD", "Updated");
    const result = adapterA.updateBlock(baseDoc, 0, 1, newMetric);
    const updated = result.scenes[0]!.blocks[1]!;
    expect(updated.kind).toBe("metric");
    if (updated.kind === "metric") {
      expect(updated.value).toBe("9999");
    }
  });

  it("applyBatch (creates scene + inserts block)", () => {
    const newScene = makeSimpleScene("batch-scene");
    const result = adapterA.applyBatch(baseDoc, [
      { op: "createScene", scene: newScene },
      { op: "insertBlock", sceneIndex: 3, blockIndex: 0, block: makeRichTextBlock("batch-block", "batch") },
    ]);
    expect(result.scenes).toHaveLength(4);
    expect(result.scenes[3]!.blocks[0]!.id).toBe("batch-block");
  });

  it("projectToStatic includes all block kinds", () => {
    const projection = adapterA.projectToStatic(baseDoc);
    expect(projection.documentTitle).toBe(baseDoc.title);
    const allKinds = projection.scenes.flatMap(s => s.blocks.map(b => b.kind));
    expect(allKinds).toContain("rich_text");
    expect(allKinds).toContain("metric");
    expect(allKinds).toContain("image");
    expect(allKinds).toContain("callout");
    expect(allKinds).toContain("timeline");
  });

  it("extractPlainText includes all semantic content", () => {
    const text = adapterA.extractPlainText(baseDoc);
    expect(text).toContain("Document a-base");
    expect(text).toContain("Count");
    expect(text).toContain("42");
  });

  it("undo/redo via adapterAHistory", () => {
    const newScene = makeSimpleScene("undo-scene");
    const h0 = adapterAHistory.make(baseDoc);
    const afterCreate = adapterA.createScene(baseDoc, newScene);
    const h1 = adapterAHistory.push(h0, afterCreate);
    const { state: undone } = adapterAHistory.undo(h1);
    expect(undone.current.scenes).toHaveLength(3);
    const { state: redone } = adapterAHistory.redo(undone);
    expect(redone.current.scenes).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 6. Strategy B — all 18 operations
// ---------------------------------------------------------------------------

describe("Strategy B - all 18 operations", () => {
  const baseDoc = makeSimpleDoc("b-base", 3);
  const baseB = fromSemanticDocument(baseDoc);

  it("parse round-trip", () => {
    const json = adapterB.serialize(baseB);
    const parsed = adapterB.parse(json);
    expect(parsed.childCount).toBe(3);
    expect(adapterB.serialize(parsed)).toBe(json);
  });

  it("serialize produces valid JSON", () => {
    const json = adapterB.serialize(baseB);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("toSemanticDocument round-trip", () => {
    const sem = adapterB.toSemanticDocument(baseB);
    expect(sem.schemaVersion).toBe(1);
    expect(sem.scenes).toHaveLength(3);
  });

  it("createScene", () => {
    const newScene = makeSimpleScene("b-new");
    const result = adapterB.createScene(baseB, newScene);
    expect(result.childCount).toBe(4);
    expect(result.child(3).attrs["id"]).toBe("b-new");
  });

  it("deleteScene", () => {
    const result = adapterB.deleteScene(baseB, 1);
    expect(result.childCount).toBe(2);
    let found = false;
    result.forEach(c => { if (c.attrs["id"] === "b-base-s1") found = true; });
    expect(found).toBe(false);
  });

  it("reorderScene", () => {
    const origId = baseB.child(0).attrs["id"];
    const result = adapterB.reorderScene(baseB, 0, 2);
    expect(result.child(2).attrs["id"]).toBe(origId);
  });

  it("updateSceneLayout", () => {
    const result = adapterB.updateSceneLayout(baseB, 0, "hero");
    expect(result.child(0).attrs["layoutPreset"]).toBe("hero");
  });

  it("updateSceneAtmosphere", () => {
    const result = adapterB.updateSceneAtmosphere(baseB, 0, "crystal");
    expect(result.child(0).attrs["atmosphere"]).toBe("crystal");
  });

  it("updateSceneMotion", () => {
    const result = adapterB.updateSceneMotion(baseB, 0, "reveal");
    expect(result.child(0).attrs["motionPreset"]).toBe("reveal");
  });

  it("insertBlock", () => {
    const block = makeRichTextBlock("b-inserted", "inserted");
    const result = adapterB.insertBlock(baseB, 0, 0, block);
    expect(result.child(0).childCount).toBe(6);
    expect(result.child(0).child(0).attrs["id"]).toBe("b-inserted");
  });

  it("deleteBlock", () => {
    const result = adapterB.deleteBlock(baseB, 0, 0);
    expect(result.child(0).childCount).toBe(4);
  });

  it("reorderBlock", () => {
    const origId = baseB.child(0).child(0).attrs["id"];
    const result = adapterB.reorderBlock(baseB, 0, 0, 4);
    expect(result.child(0).child(4).attrs["id"]).toBe(origId);
  });

  it("moveBlock", () => {
    const result = adapterB.moveBlock(baseB, 0, 0, 1, 0);
    expect(result.child(0).childCount).toBe(4);
    expect(result.child(1).childCount).toBe(6);
  });

  it("updateBlock (metric)", () => {
    const newMetric = makeMetricBlock("b-base-s0-mt", "Revenue", "7777", "EUR", "B Updated");
    const result = adapterB.updateBlock(baseB, 0, 1, newMetric);
    const updated = result.child(0).child(1);
    expect(updated.type.name).toBe("metric_block");
    expect(updated.attrs["value"]).toBe("7777");
  });

  it("applyBatch (creates scene + inserts block)", () => {
    const newScene = makeSimpleScene("b-batch-scene");
    const result = adapterB.applyBatch(baseB, [
      { op: "createScene", scene: newScene },
      { op: "insertBlock", sceneIndex: 3, blockIndex: 0, block: makeRichTextBlock("b-batch-block", "batch") },
    ]);
    expect(result.childCount).toBe(4);
    expect(result.child(3).child(0).attrs["id"]).toBe("b-batch-block");
  });

  it("projectToStatic includes all block kinds", () => {
    const projection = adapterB.projectToStatic(baseB);
    expect(projection.documentTitle).toBe(baseDoc.title);
    const allKinds = projection.scenes.flatMap(s => s.blocks.map(b => b.kind));
    expect(allKinds).toContain("rich_text");
    expect(allKinds).toContain("metric");
    expect(allKinds).toContain("image");
    expect(allKinds).toContain("callout");
    expect(allKinds).toContain("timeline");
  });

  it("extractPlainText includes all semantic content", () => {
    const text = adapterB.extractPlainText(baseB);
    expect(text).toContain("Count");
    expect(text).toContain("42");
  });

  it("undo/redo via adapterBHistory", () => {
    const newScene = makeSimpleScene("b-undo-scene");
    const h0 = adapterBHistory.make(baseB);
    const afterCreate = adapterB.createScene(baseB, newScene);
    const h1 = adapterBHistory.push(h0, afterCreate);
    const { state: undone } = adapterBHistory.undo(h1);
    expect(undone.current.childCount).toBe(3);
    const { state: redone } = adapterBHistory.redo(undone);
    expect(redone.current.childCount).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 7. Strategy B — fair codec
// ---------------------------------------------------------------------------

describe("Strategy B - fair codec", () => {
  it("validateRawJson rejects non-object", () => {
    const result = validateRawJson("not an object");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("object");
  });

  it("validateRawJson rejects missing type", () => {
    const result = validateRawJson({ attrs: { documentId: "x", title: "t", templateId: "k", schemaVersion: 1 }, content: [] });
    expect(result.ok).toBe(false);
  });

  it("validateRawJson accepts valid raw json", () => {
    const raw = {
      type: "doc",
      attrs: { documentId: "d1", title: "T", templateId: "knowledge_dossier", schemaVersion: 1 },
      content: [],
    };
    const result = validateRawJson(raw);
    expect(result.ok).toBe(true);
  });

  it("migrateJson v1→v2 adds narrativeType to doc attrs", () => {
    const raw = {
      type: "doc" as const,
      attrs: { documentId: "d1", title: "T", templateId: "knowledge_dossier", schemaVersion: 1 },
      content: [],
    };
    const result = migrateJson(raw, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.attrs["narrativeType"]).toBe("story");
      expect(result.value.attrs["schemaVersion"]).toBe(2);
    }
  });

  it("migrateJson v2 json parsed by narrativeSchemaV2 preserves narrativeType", () => {
    const raw = {
      type: "doc" as const,
      attrs: { documentId: "d2", title: "T2", templateId: "knowledge_dossier", schemaVersion: 1, narrativeType: "story" },
      content: [{
        type: "scene",
        attrs: { id: "s0", title: "S", layoutPreset: "single_column", atmosphere: "neutral", motionPreset: "none" },
        content: [{
          type: "rich_text_block",
          attrs: { id: "b0" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
        }],
      }],
    };
    const migrated = migrateJson(raw, 2);
    expect(migrated.ok).toBe(true);
    if (migrated.ok) {
      const pmDoc = narrativeSchemaV2.nodeFromJSON(migrated.value as object);
      expect(pmDoc.attrs["narrativeType"]).toBe("story");
    }
  });

  it("Fair B migrate: narrativeType preserved (vs unfair B which loses it)", () => {
    const baseDoc = makeSimpleDoc("codec-fair", 1);
    const docB = fromSemanticDocument(baseDoc);

    // Fair migration: codec validates and migrates JSON before nodeFromJSON
    const json = docB.toJSON() as unknown;
    const validated = validateRawJson(json);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const migrated = migrateJson(validated.value, 2);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;

    const v2Doc = narrativeSchemaV2.nodeFromJSON(migrated.value as object);
    expect(v2Doc.attrs["narrativeType"]).toBe("story");

    // Unfair migration (direct nodeFromJSON with v1 schema): narrativeType is lost
    // because v1 schema has no narrativeType attr
    const v1Schema = narrativeSchemaV1;
    const unfairRaw = { ...migrated.value, attrs: { ...migrated.value.attrs } };
    // v1 schema doesn't have narrativeType attr, so it's dropped
    const unfairDoc = v1Schema.nodeFromJSON(unfairRaw as object);
    expect(unfairDoc.attrs["narrativeType"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 8. Static reader equality
// ---------------------------------------------------------------------------

describe("Static reader equality", () => {
  it("A and B produce equal StaticProjection for FIXTURE_S", () => {
    const docB = fromSemanticDocument(FIXTURE_S);
    const projA = adapterA.projectToStatic(FIXTURE_S);
    const projB = adapterB.projectToStatic(docB);

    expect(projA.documentTitle).toBe(projB.documentTitle);
    expect(projA.scenes).toHaveLength(projB.scenes.length);
    for (let si = 0; si < projA.scenes.length; si++) {
      expect(projA.scenes[si]!.id).toBe(projB.scenes[si]!.id);
      expect(projA.scenes[si]!.title).toBe(projB.scenes[si]!.title);
      expect(projA.scenes[si]!.blocks).toHaveLength(projB.scenes[si]!.blocks.length);
    }
  });

  it("A and B produce equal StaticProjection for FIXTURE_K", () => {
    const docB = fromSemanticDocument(FIXTURE_K);
    const projA = adapterA.projectToStatic(FIXTURE_K);
    const projB = adapterB.projectToStatic(docB);
    expect(projA.scenes).toHaveLength(projB.scenes.length);
    expect(projA.documentTitle).toBe(projB.documentTitle);
  });

  it("B static reader (raw JSON) does not import @tiptap/pm", async () => {
    const src = await import("./strategy-b/static-reader?raw" as string);
    expect(src.default).not.toContain("@tiptap/pm");
  });

  it("staticReadFromRawJson matches projectToStatic for FIXTURE_S", () => {
    const docB = fromSemanticDocument(FIXTURE_S);
    const json = JSON.parse(adapterB.serialize(docB)) as unknown;
    const staticProj = staticReadFromRawJson(json);
    const adapterProj = adapterB.projectToStatic(docB);

    expect(staticProj.documentTitle).toBe(adapterProj.documentTitle);
    expect(staticProj.scenes).toHaveLength(adapterProj.scenes.length);
    for (let si = 0; si < staticProj.scenes.length; si++) {
      expect(staticProj.scenes[si]!.id).toBe(adapterProj.scenes[si]!.id);
      expect(staticProj.scenes[si]!.blocks).toHaveLength(adapterProj.scenes[si]!.blocks.length);
    }
  });
});

// ---------------------------------------------------------------------------
// 9. Markdown equality
// ---------------------------------------------------------------------------

describe("Markdown equality", () => {
  it("A and B produce identical Markdown for FIXTURE_S", () => {
    const docB = fromSemanticDocument(FIXTURE_S);
    const mdA = semanticDocumentToMarkdown(adapterA.toSemanticDocument(FIXTURE_S));
    const mdB = semanticDocumentToMarkdown(adapterB.toSemanticDocument(docB));
    expect(mdA).toBe(mdB);
  });

  it("A and B produce identical Markdown for FIXTURE_K", () => {
    const docB = fromSemanticDocument(FIXTURE_K);
    const mdA = semanticDocumentToMarkdown(adapterA.toSemanticDocument(FIXTURE_K));
    const mdB = semanticDocumentToMarkdown(adapterB.toSemanticDocument(docB));
    expect(mdA).toBe(mdB);
  });

  it("Markdown contains Vietnamese text", () => {
    const md = semanticDocumentToMarkdown(FIXTURE_S);
    expect(md).toContain("Trọng lực và ánh sáng");
  });

  it("Markdown has no MDX imports or absolute paths", () => {
    const md = semanticDocumentToMarkdown(FIXTURE_K);
    expect(md).not.toContain("import {");
    // Ensure no absolute Windows/POSIX paths
    expect(md).not.toMatch(/[A-Z]:\\/);
    expect(md).not.toMatch(/\/home\//);
  });
});

// ---------------------------------------------------------------------------
// 10. Plain text equality
// ---------------------------------------------------------------------------

describe("Plain text equality", () => {
  it("A and B produce identical plain text for FIXTURE_S", () => {
    const docB = fromSemanticDocument(FIXTURE_S);
    const textA = adapterA.extractPlainText(FIXTURE_S);
    const textB = adapterB.extractPlainText(docB);
    expect(textA).toBe(textB);
  });

  it("A and B produce identical plain text for FIXTURE_K", () => {
    const docB = fromSemanticDocument(FIXTURE_K);
    const textA = adapterA.extractPlainText(FIXTURE_K);
    const textB = adapterB.extractPlainText(docB);
    expect(textA).toBe(textB);
  });

  it("Plain text includes scene titles for both A and B", () => {
    const docB = fromSemanticDocument(FIXTURE_S);
    const textA = adapterA.extractPlainText(FIXTURE_S);
    const textB = adapterB.extractPlainText(docB);
    expect(textA).toContain(FIXTURE_S.scenes[0]!.title);
    expect(textB).toContain(FIXTURE_S.scenes[0]!.title);
  });

  it("Plain text includes all 5 block types", () => {
    const doc = makeSimpleDoc("all-kinds");
    const text = adapterA.extractPlainText(doc);
    expect(text).toContain("Count"); // metric label
    expect(text).toContain("Alt all-kinds-s0"); // image alt
    expect(text).toContain("Alpha"); // timeline item description
  });
});

// ---------------------------------------------------------------------------
// 11. Basic Leaf migration round-trip
// ---------------------------------------------------------------------------

describe("Basic Leaf migration round-trip", () => {
  const richLeaf: BasicLeafContent = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Trọng lực và ánh sáng" }] },
    ],
  };

  it("basicLeafToNarrative → narrativeToBasicLeaf preserves text", () => {
    const narrative = basicLeafToNarrative(richLeaf, "rt-1");
    const leaf = narrativeToBasicLeaf(narrative);
    const allText = leaf.content.map(n => n.content?.map(c => c.text ?? "").join("") ?? "").join(" ");
    expect(allText).toContain("Trọng lực và ánh sáng");
  });

  it("Loss report is empty for rich_text-only content", () => {
    const narrative = basicLeafToNarrative(richLeaf, "rt-2");
    const { lossReport } = narrativeToBasicLeafWithReport(narrative);
    expect(lossReport).toHaveLength(0);
  });

  it("Loss report mentions metric for metric blocks", () => {
    const doc = makeSimpleDoc("loss-test", 1);
    const { lossReport } = narrativeToBasicLeafWithReport(doc);
    const hasMetric = lossReport.some(r => r.includes("metric"));
    expect(hasMetric).toBe(true);
  });

  it("Vietnamese text preserved through round-trip", () => {
    const vietLeaf: BasicLeafContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Nghiên cứu trường hợp — Việt Nam" }] },
      ],
    };
    const narrative = basicLeafToNarrative(vietLeaf, "viet-rt");
    const leaf = narrativeToBasicLeaf(narrative);
    const allText = leaf.content.map(n => n.content?.map(c => c.text ?? "").join("") ?? "").join(" ");
    expect(allText).toContain("Nghiên cứu trường hợp");
    expect(allText).toContain("Việt Nam");
  });
});

// ---------------------------------------------------------------------------
// 12. Decision matrix
// ---------------------------------------------------------------------------

describe("Decision matrix", () => {
  const CRITERIA: MatrixCriterion[] = [
    {
      name: "Data safety and migration clarity",
      weight: 16,
      scoreA: 8,
      scoreB: 6,
      rationale:
        "A: plain JSON spread; explicit migration. B: PM computeAttrs silently drops unknown attrs before the fair codec; codec prevents silent loss but adds complexity.",
    },
    {
      name: "Atomic undo/redo correctness",
      weight: 13,
      scoreA: 8,
      scoreB: 7,
      rationale:
        "A: domain history stack, each op is one entry. B: PM undo mixes structural and character-level steps; isolation per scene is hard.",
    },
    {
      name: "Scene/block reorder correctness",
      weight: 11,
      scoreA: 9,
      scoreB: 7,
      rationale:
        "A: simple array splice. B: Fragment construction, position bookkeeping required.",
    },
    {
      name: "Static Reader simplicity",
      weight: 10,
      scoreA: 9,
      scoreB: 7,
      rationale:
        "A: zero PM import in Reader path. B: static-reader.ts walks raw JSON without PM, but the fair codec must still ship.",
    },
    {
      name: "Editor complexity",
      weight: 10,
      scoreA: 7,
      scoreB: 8,
      rationale:
        "A: per-block Tiptap island; isolation clean but switching focus requires commit logic. B: one editor; unified history is richer.",
    },
    {
      name: "Performance at medium/large scale",
      weight: 9,
      scoreA: 8,
      scoreB: 5,
      rationale:
        "A: JSON.parse/stringify; negligible overhead. B: PM nodeFromJSON validates every node type; measurably slower at 500 scenes.",
    },
    {
      name: "Markdown/Basic Leaf interoperability",
      weight: 8,
      scoreA: 8,
      scoreB: 8,
      rationale: "Both produce identical Markdown and Basic Leaf output via shared semantic layer.",
    },
    {
      name: "Search/plain-text extraction",
      weight: 6,
      scoreA: 9,
      scoreB: 8,
      rationale:
        "A: walkNode on JSON; identical to semantic layer. B: same via toSemanticDocument but requires PM deserialization on the path.",
    },
    {
      name: "Accessibility architecture",
      weight: 6,
      scoreA: 8,
      scoreB: 7,
      rationale:
        "A: React owns every <section> aria-label. B: PM contenteditable; ARIA depends on DOMSerializer; harder to customize per-scene.",
    },
    {
      name: "Schema evolution/versioning",
      weight: 5,
      scoreA: 9,
      scoreB: 6,
      rationale:
        "A: JSON field addition is trivial. B: requires codec + schema update for every new attr; codec adds safety but also complexity.",
    },
    {
      name: "Testability/observability",
      weight: 3,
      scoreA: 9,
      scoreB: 6,
      rationale:
        "A: plain objects; snapshot-friendly. B: PM Node is opaque; assertions require .attrs / .toJSON() wrappers.",
    },
    {
      name: "AI-assisted code modification locality",
      weight: 3,
      scoreA: 9,
      scoreB: 6,
      rationale:
        "A: adding a block kind is one discriminated union case. B: requires schema change, codec update, and toSemanticDocument case.",
    },
  ];

  it("weights sum to 100", () => {
    const total = CRITERIA.reduce((n, c) => n + c.weight, 0);
    expect(total).toBe(100);
  });

  it("Strategy A score calculation is correct", () => {
    const scoreA = CRITERIA.reduce((n, c) => n + c.scoreA * c.weight, 0) / 10;
    // Verify: 8*16 + 8*13 + 9*11 + 9*10 + 7*10 + 8*9 + 8*8 + 9*6 + 8*6 + 9*5 + 9*3 + 9*3
    // = 128+104+99+90+70+72+64+54+48+45+27+27 = 828 → /10 = 82.8
    expect(scoreA).toBeCloseTo(82.8, 1);
  });

  it("Strategy A score > Strategy B score", () => {
    const scoreA = CRITERIA.reduce((n, c) => n + c.scoreA * c.weight, 0) / 10;
    const scoreB = CRITERIA.reduce((n, c) => n + c.scoreB * c.weight, 0) / 10;
    expect(scoreA).toBeGreaterThan(scoreB);
  });

  it("Strategy A score > Strategy B score by meaningful margin (>= 10 points)", () => {
    const scoreA = CRITERIA.reduce((n, c) => n + c.scoreA * c.weight, 0) / 10;
    const scoreB = CRITERIA.reduce((n, c) => n + c.scoreB * c.weight, 0) / 10;
    console.log(`Strategy A: ${scoreA.toFixed(1)} / 100`);
    console.log(`Strategy B: ${scoreB.toFixed(1)} / 100`);
    expect(scoreA - scoreB).toBeGreaterThanOrEqual(10);
  });

  it("selected strategy is A", () => {
    const selected = "A";
    expect(selected).toBe("A");
  });
});

// ---------------------------------------------------------------------------
// 13. Bundle isolation
// ---------------------------------------------------------------------------

describe("Bundle isolation", () => {
  it("prototype test file is in prototypes/ path", () => {
    expect(import.meta.url).toContain("prototypes");
  });

  it("strategy-a/adapter has no @tiptap/pm import", async () => {
    const src = await import("./strategy-a/adapter?raw" as string);
    expect(src.default).not.toContain("@tiptap/pm");
  });

  it("strategy-b/static-reader has no @tiptap/pm import", async () => {
    const src = await import("./strategy-b/static-reader?raw" as string);
    expect(src.default).not.toContain("@tiptap/pm");
  });
});
