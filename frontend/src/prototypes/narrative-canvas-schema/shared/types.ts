// Shared types for the Narrative Canvas A/B schema prototype.
// These types are never imported by production code.

// ---------------------------------------------------------------------------
// ProseMirror JSON leaf types
// ---------------------------------------------------------------------------

export interface PMLeafNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMLeafNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

export interface BasicLeafContent {
  type: "doc";
  content: PMLeafNode[];
}

// ---------------------------------------------------------------------------
// Narrative vocabulary
// ---------------------------------------------------------------------------

export type NarrativeTemplateId = "strategy_dashboard" | "knowledge_dossier";
export type SceneLayoutPreset = "hero" | "single_column" | "two_column" | "bento";
export type SceneAtmosphere = "neutral" | "sky" | "crystal";
export type SceneMotionPreset = "none" | "reveal" | "stagger";

export type NarrativeSemanticBlock =
  | { kind: "rich_text"; id: string; content: BasicLeafContent }
  | { kind: "metric"; id: string; label: string; value: string; unit: string; description: string }
  | { kind: "image"; id: string; assetId: string; alt: string; caption: string }
  | { kind: "callout"; id: string; variant: "note" | "warning" | "tip"; content: BasicLeafContent }
  | { kind: "timeline"; id: string; title: string; items: { id: string; label: string; description: string }[] };

export type NarrativeSemanticScene = {
  id: string;
  title: string;
  layoutPreset: SceneLayoutPreset;
  atmosphere: SceneAtmosphere;
  motionPreset: SceneMotionPreset;
  blocks: NarrativeSemanticBlock[];
};

export type NarrativeSemanticDocument = {
  schemaVersion: 1;
  documentId: string;
  title: string;
  templateId: NarrativeTemplateId;
  scenes: NarrativeSemanticScene[];
};

// ---------------------------------------------------------------------------
// Static projection (strategy-neutral render model)
// ---------------------------------------------------------------------------

export type StaticBlockProjection = {
  kind: string;
  id: string;
  plainText: string;
  data: Record<string, unknown>;
};

export type StaticSceneProjection = {
  id: string;
  title: string;
  layout: string;
  atmosphere: string;
  motion: string;
  blocks: StaticBlockProjection[];
};

export type StaticProjection = {
  documentTitle: string;
  scenes: StaticSceneProjection[];
};

// ---------------------------------------------------------------------------
// Batch operations
// ---------------------------------------------------------------------------

export type BatchOperation =
  | { op: "createScene"; scene: NarrativeSemanticScene }
  | { op: "deleteScene"; sceneIndex: number }
  | { op: "reorderScene"; from: number; to: number }
  | { op: "updateSceneLayout"; sceneIndex: number; layout: SceneLayoutPreset }
  | { op: "updateSceneAtmosphere"; sceneIndex: number; atm: SceneAtmosphere }
  | { op: "updateSceneMotion"; sceneIndex: number; motion: SceneMotionPreset }
  | { op: "insertBlock"; sceneIndex: number; blockIndex: number; block: NarrativeSemanticBlock }
  | { op: "deleteBlock"; sceneIndex: number; blockIndex: number }
  | { op: "reorderBlock"; sceneIndex: number; from: number; to: number }
  | { op: "moveBlock"; fromScene: number; fromBlock: number; toScene: number; toBlock: number }
  | { op: "updateBlock"; sceneIndex: number; blockIndex: number; block: NarrativeSemanticBlock };

// ---------------------------------------------------------------------------
// Adapter interface (18 operations)
// ---------------------------------------------------------------------------

export interface PrototypeAdapter<TDoc> {
  parse(json: string): TDoc;
  serialize(doc: TDoc): string;
  toSemanticDocument(doc: TDoc): NarrativeSemanticDocument;
  getSceneCount(doc: TDoc): number;
  getBlockCount(doc: TDoc, sceneIndex: number): number;
  createScene(doc: TDoc, scene: NarrativeSemanticScene): TDoc;
  deleteScene(doc: TDoc, sceneIndex: number): TDoc;
  reorderScene(doc: TDoc, from: number, to: number): TDoc;
  updateSceneLayout(doc: TDoc, sceneIndex: number, layout: SceneLayoutPreset): TDoc;
  updateSceneAtmosphere(doc: TDoc, sceneIndex: number, atm: SceneAtmosphere): TDoc;
  updateSceneMotion(doc: TDoc, sceneIndex: number, motion: SceneMotionPreset): TDoc;
  insertBlock(doc: TDoc, sceneIndex: number, blockIndex: number, block: NarrativeSemanticBlock): TDoc;
  deleteBlock(doc: TDoc, sceneIndex: number, blockIndex: number): TDoc;
  reorderBlock(doc: TDoc, sceneIndex: number, from: number, to: number): TDoc;
  moveBlock(doc: TDoc, fromScene: number, fromBlock: number, toScene: number, toBlock: number): TDoc;
  updateBlock(doc: TDoc, sceneIndex: number, blockIndex: number, block: NarrativeSemanticBlock): TDoc;
  applyBatch(doc: TDoc, ops: BatchOperation[]): TDoc;
  projectToStatic(doc: TDoc): StaticProjection;
  extractPlainText(doc: TDoc): string;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export type HistoryState<TDoc> = {
  past: TDoc[];
  current: TDoc;
  future: TDoc[];
  maxSize: 50;
};

export function makeHistory<T>(doc: T): HistoryState<T> {
  return { past: [], current: doc, future: [], maxSize: 50 };
}

export function pushHistory<T>(h: HistoryState<T>, doc: T): HistoryState<T> {
  const past = [...h.past, h.current];
  const trimmed = past.length > h.maxSize ? past.slice(past.length - h.maxSize) : past;
  return { past: trimmed, current: doc, future: [], maxSize: 50 };
}

export function undoHistory<T>(h: HistoryState<T>): { state: HistoryState<T>; changed: boolean } {
  if (h.past.length === 0) return { state: h, changed: false };
  const past = [...h.past];
  const current = past.pop()!;
  return {
    state: { past, current, future: [h.current, ...h.future], maxSize: 50 },
    changed: true,
  };
}

export function redoHistory<T>(h: HistoryState<T>): { state: HistoryState<T>; changed: boolean } {
  if (h.future.length === 0) return { state: h, changed: false };
  const [current, ...future] = h.future;
  return {
    state: { past: [...h.past, h.current], current: current!, future, maxSize: 50 },
    changed: true,
  };
}

// ---------------------------------------------------------------------------
// Simulation / benchmark result types
// ---------------------------------------------------------------------------

export interface SimulationResult {
  applied: number;
  attempted: number;
  skipped: number;
  opCounts: Record<string, number>;
  errors: string[];
  undoCount: number;
  redoCount: number;
  batchCount: number;
  finalSemanticHash: string;
}

export interface BenchmarkResult {
  operation: string;
  strategy: "A" | "B";
  n: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  bytes: number;
}

export interface MatrixCriterion {
  name: string;
  weight: number;
  scoreA: number;
  scoreB: number;
  rationale: string;
}
