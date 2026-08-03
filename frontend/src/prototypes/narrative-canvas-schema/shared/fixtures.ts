// Deterministic fixtures for prototype benchmarks and tests.
// S = small (8 scenes / 40 blocks), K = medium-knowledge (20 scenes / 100 blocks).
// FIXTURE_MEDIUM = 100 scenes / 500 blocks. FIXTURE_LARGE = 500 scenes / 2500 blocks (lazy).

import type {
  BasicLeafContent,
  NarrativeSemanticBlock,
  NarrativeSemanticDocument,
  NarrativeSemanticScene,
  NarrativeTemplateId,
  SceneAtmosphere,
  SceneLayoutPreset,
  SceneMotionPreset,
} from "./types";
import { Prng } from "./prng";

// ---------------------------------------------------------------------------
// Block factory helpers
// ---------------------------------------------------------------------------

function makeContent(text: string): BasicLeafContent {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

export function makeRichTextBlock(id: string, text: string): NarrativeSemanticBlock {
  return { kind: "rich_text", id, content: makeContent(text) };
}

export function makeMetricBlock(
  id: string,
  label: string,
  value: string,
  unit: string,
  description = "",
): NarrativeSemanticBlock {
  return { kind: "metric", id, label, value, unit, description };
}

export function makeImageBlock(
  id: string,
  assetId: string,
  alt: string,
  caption = "",
): NarrativeSemanticBlock {
  return { kind: "image", id, assetId, alt, caption };
}

export function makeCalloutBlock(
  id: string,
  variant: "note" | "warning" | "tip",
  text: string,
): NarrativeSemanticBlock {
  return { kind: "callout", id, variant, content: makeContent(text) };
}

export function makeTimelineBlock(
  id: string,
  title: string,
  items: { id: string; label: string; description: string }[],
): NarrativeSemanticBlock {
  return { kind: "timeline", id, title, items };
}

// ---------------------------------------------------------------------------
// Scene and document factory helpers
// ---------------------------------------------------------------------------

export function makeScene(
  id: string,
  title: string,
  layoutPreset: SceneLayoutPreset,
  atmosphere: SceneAtmosphere,
  motionPreset: SceneMotionPreset,
  blocks: NarrativeSemanticBlock[],
): NarrativeSemanticScene {
  return { id, title, layoutPreset, atmosphere, motionPreset, blocks };
}

export function makeDocument(
  id: string,
  title: string,
  templateId: NarrativeTemplateId,
  scenes: NarrativeSemanticScene[],
): NarrativeSemanticDocument {
  return { schemaVersion: 1, documentId: id, title, templateId, scenes };
}

// ---------------------------------------------------------------------------
// Layout/atmosphere/motion cycles
// ---------------------------------------------------------------------------

const LAYOUTS: SceneLayoutPreset[] = ["hero", "single_column", "two_column", "bento"];
const ATMOSPHERES: SceneAtmosphere[] = ["neutral", "sky", "crystal"];
const MOTIONS: SceneMotionPreset[] = ["none", "reveal", "stagger"];

// ---------------------------------------------------------------------------
// Vietnamese text for fixtures
// ---------------------------------------------------------------------------

const VIET_TITLE = "Trọng lực và ánh sáng — Nghiên cứu trường hợp";

// ---------------------------------------------------------------------------
// FIXTURE_S: 8 scenes × 5 blocks = 40 blocks (all block kinds, all layouts, Vietnamese)
// ---------------------------------------------------------------------------

function makeFixtureScene(sceneIdx: number): NarrativeSemanticScene {
  const id = `s${sceneIdx}`;
  const title =
    sceneIdx === 0
      ? VIET_TITLE
      : sceneIdx === 1
        ? VIET_TITLE // duplicate title intentional
        : `Scene ${String.fromCharCode(65 + sceneIdx)}`;

  const blocks: NarrativeSemanticBlock[] = [
    makeRichTextBlock(`${id}-rt`, `Trọng lực và ánh sáng — scene ${sceneIdx} paragraph`),
    makeMetricBlock(`${id}-mt`, "Revenue", "1234", "USD", "Monthly revenue metric"),
    makeImageBlock(`${id}-img`, `asset-s${sceneIdx}-img`, `Alt text scene ${sceneIdx}`),
    makeCalloutBlock(`${id}-cl`, "note", `Callout note for scene ${sceneIdx}`),
    makeTimelineBlock(`${id}-tl`, `Timeline ${sceneIdx}`, [
      { id: `${id}-tl-0`, label: "Phase 1", description: "Initial phase" },
      { id: `${id}-tl-1`, label: "Phase 2", description: "Delivery phase" },
    ]),
  ];

  return makeScene(
    id,
    title,
    LAYOUTS[sceneIdx % LAYOUTS.length]!,
    ATMOSPHERES[sceneIdx % ATMOSPHERES.length]!,
    MOTIONS[sceneIdx % MOTIONS.length]!,
    blocks,
  );
}

export const FIXTURE_S: NarrativeSemanticDocument = makeDocument(
  "fixture-s",
  "Strategy Dashboard — Small",
  "strategy_dashboard",
  Array.from({ length: 8 }, (_, i) => makeFixtureScene(i)),
);

// ---------------------------------------------------------------------------
// FIXTURE_K: 20 scenes × 5 blocks = 100 blocks (all block kinds, long text, Vietnamese)
// ---------------------------------------------------------------------------

const LONG_TEXT =
  "Trọng lực và ánh sáng — Nghiên cứu trường hợp. " +
  "This is a longer paragraph with more content to test text extraction and plain text equality. " +
  "Vietnamese: Nghiên cứu, phân tích, và tổng hợp kết quả. ";

// Vietnamese composed/decomposed: "Việt" NFC vs NFD
const VIET_COMPOSED = "Việt Nam";
const VIET_DECOMPOSED = "Việt Nam";

function makeKnowledgeScene(sceneIdx: number): NarrativeSemanticScene {
  const id = `k${sceneIdx}`;
  const title = sceneIdx === 19 ? "Kết luận" : `Chapter ${sceneIdx + 1} — ${VIET_COMPOSED}`;

  const blocks: NarrativeSemanticBlock[] = [
    makeRichTextBlock(`${id}-rt`, `${LONG_TEXT} (scene ${sceneIdx}) ${VIET_DECOMPOSED}`),
    makeMetricBlock(`${id}-mt`, `Metric ${sceneIdx}`, String(sceneIdx * 100), "units", `Description ${sceneIdx}`),
    makeImageBlock(`${id}-img`, `asset-k${sceneIdx}-img`, `Knowledge image ${sceneIdx}`, `Caption ${sceneIdx}`),
    makeCalloutBlock(`${id}-cl`, sceneIdx % 3 === 0 ? "note" : sceneIdx % 3 === 1 ? "warning" : "tip", `Callout ${sceneIdx}`),
    makeTimelineBlock(`${id}-tl`, `Timeline chapter ${sceneIdx}`, [
      { id: `${id}-tl-0`, label: "Start", description: `Start of chapter ${sceneIdx}` },
      { id: `${id}-tl-1`, label: "Middle", description: `Middle of chapter ${sceneIdx}` },
      { id: `${id}-tl-2`, label: "End", description: `End of chapter ${sceneIdx}` },
    ]),
  ];

  return makeScene(
    id,
    title,
    LAYOUTS[sceneIdx % LAYOUTS.length]!,
    ATMOSPHERES[sceneIdx % ATMOSPHERES.length]!,
    MOTIONS[sceneIdx % MOTIONS.length]!,
    blocks,
  );
}

export const FIXTURE_K: NarrativeSemanticDocument = makeDocument(
  "fixture-k",
  "Knowledge Dossier — Medium",
  "knowledge_dossier",
  Array.from({ length: 20 }, (_, i) => makeKnowledgeScene(i)),
);

// ---------------------------------------------------------------------------
// Deterministic fixture generator for medium / large fixtures
// ---------------------------------------------------------------------------

const BLOCK_KINDS = ["rich_text", "metric", "image", "callout", "timeline"] as const;
const CALLOUT_VARIANTS = ["note", "warning", "tip"] as const;

export function generateFixture(
  prng: Prng,
  sceneCount: number,
  blocksPerScene: number,
): NarrativeSemanticDocument {
  const scenes: NarrativeSemanticScene[] = [];

  for (let si = 0; si < sceneCount; si++) {
    const sceneId = `gen-s${si}-${prng.int(100000)}`;
    const blocks: NarrativeSemanticBlock[] = [];

    for (let bi = 0; bi < blocksPerScene; bi++) {
      const kind = BLOCK_KINDS[bi % BLOCK_KINDS.length]!;
      const blockId = `${sceneId}-b${bi}`;

      switch (kind) {
        case "rich_text":
          blocks.push(makeRichTextBlock(blockId, `Generated text si=${si} bi=${bi} rand=${prng.int(10000)}`));
          break;
        case "metric":
          blocks.push(makeMetricBlock(blockId, `Metric ${bi}`, String(prng.int(9999)), "units", `Desc ${si}`));
          break;
        case "image":
          blocks.push(makeImageBlock(blockId, `asset-gen-${si}-${bi}`, `Alt ${si} ${bi}`));
          break;
        case "callout":
          blocks.push(makeCalloutBlock(blockId, CALLOUT_VARIANTS[prng.int(3)]!, `Callout si=${si} bi=${bi}`));
          break;
        case "timeline":
          blocks.push(makeTimelineBlock(blockId, `Timeline ${si}`, [
            { id: `${blockId}-t0`, label: "Alpha", description: `Alpha desc ${prng.int(100)}` },
            { id: `${blockId}-t1`, label: "Beta", description: `Beta desc ${prng.int(100)}` },
          ]));
          break;
      }
    }

    scenes.push(makeScene(
      sceneId,
      `Generated Scene ${si} — ${prng.int(10000)}`,
      LAYOUTS[prng.int(LAYOUTS.length)]!,
      ATMOSPHERES[prng.int(ATMOSPHERES.length)]!,
      MOTIONS[prng.int(MOTIONS.length)]!,
      blocks,
    ));
  }

  return makeDocument(
    `generated-${sceneCount}-${blocksPerScene}`,
    `Generated Document (${sceneCount} scenes)`,
    prng.int(2) === 0 ? "strategy_dashboard" : "knowledge_dossier",
    scenes,
  );
}

// ---------------------------------------------------------------------------
// FIXTURE_MEDIUM: 100 scenes × 5 blocks = 500 blocks
// Seed: 20260803 (numeric) with "_M" suffix => use seed 202608030
// ---------------------------------------------------------------------------

export const FIXTURE_MEDIUM: NarrativeSemanticDocument = generateFixture(
  new Prng(202608030),
  100,
  5,
);

// ---------------------------------------------------------------------------
// FIXTURE_LARGE: 500 scenes × 5 blocks = 2500 blocks (lazy getter)
// Seed: 20260803 with "_L" suffix => use seed 202608031
// ---------------------------------------------------------------------------

let _fixtureLarge: NarrativeSemanticDocument | undefined;

export function getFixtureLarge(): NarrativeSemanticDocument {
  if (!_fixtureLarge) {
    _fixtureLarge = generateFixture(new Prng(202608031), 500, 5);
  }
  return _fixtureLarge;
}

// Named export for convenience (eagerly loaded — use with care)
export const FIXTURE_LARGE: NarrativeSemanticDocument = getFixtureLarge();
