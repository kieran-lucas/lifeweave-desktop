// Shared types for the Narrative Canvas A/B schema prototype.
// These types are never imported by production code.

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

export interface NarrativeBlock {
  id: string;
  blockType: "rich-text" | "choice" | "pause";
  content: BasicLeafContent;
}

export interface NarrativeScene {
  id: string;
  title: string;
  sceneType: "linear" | "branch" | "ending";
  tags: string[];
  blocks: NarrativeBlock[];
}

export interface NarrativeDocumentA {
  schemaVersion: 1;
  revision: number;
  scenes: NarrativeScene[];
}

export interface BenchmarkResult {
  operation: string;
  strategy: "A" | "B";
  n: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

export interface MatrixCriterion {
  name: string;
  weight: number;
  scoreA: number;
  scoreB: number;
  rationale: string;
}

export interface PrototypeAdapter<TDoc> {
  parse(json: string): TDoc;
  serialize(doc: TDoc): string;
  getSceneCount(doc: TDoc): number;
  getBlockCount(doc: TDoc, sceneIndex: number): number;
  addScene(doc: TDoc, scene: NarrativeScene): TDoc;
  reorderScene(doc: TDoc, from: number, to: number): TDoc;
  deleteScene(doc: TDoc, sceneIndex: number): TDoc;
  editBlockContent(doc: TDoc, sceneIndex: number, blockIndex: number, content: BasicLeafContent): TDoc;
  addBlock(doc: TDoc, sceneIndex: number, block: NarrativeBlock): TDoc;
  moveBlock(doc: TDoc, fromScene: number, fromBlock: number, toScene: number, toBlock: number): TDoc;
  extractPlainText(doc: TDoc): string;
  migrate(doc: TDoc, targetVersion: 2): TDoc;
}
