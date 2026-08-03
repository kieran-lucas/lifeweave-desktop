export type RichTextNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: RichTextNode[];
};

export type RichTextContent = {
  type: "doc";
  content: RichTextNode[];
};

export type NarrativeBlock =
  | { kind: "rich_text"; id: string; content: RichTextContent }
  | { kind: "metric"; id: string; label: string; value: string; unit: string; description: string }
  | { kind: "image"; id: string; assetId: string; alt: string; caption: string }
  | { kind: "callout"; id: string; variant: "note" | "warning" | "tip"; content: RichTextContent }
  | { kind: "timeline"; id: string; title: string; items: Array<{ id: string; label: string; description: string }> };

export type NarrativeScene = {
  id: string;
  title: string;
  layoutPreset: "hero" | "single_column" | "two_column" | "bento";
  atmosphere: "neutral" | "sky" | "crystal";
  motionPreset: "none" | "reveal" | "stagger";
  blocks: NarrativeBlock[];
};

export type NarrativeDocument = {
  schemaVersion: 1;
  documentId: string;
  title: string;
  templateId: "strategy_dashboard" | "knowledge_dossier";
  scenes: [NarrativeScene, ...NarrativeScene[]];
};

export function parseNarrative(json: string): NarrativeDocument {
  const raw: unknown = JSON.parse(json);
  if (!raw || typeof raw !== "object") throw new Error("Narrative must be an object");
  const doc = raw as Record<string, unknown>;
  if (doc["schemaVersion"] !== 1) throw new Error("Unsupported schemaVersion");
  if (!Array.isArray(doc["scenes"]) || doc["scenes"].length === 0) throw new Error("Missing scenes");
  return doc as unknown as NarrativeDocument;
}

export function emptyRichText(): RichTextContent {
  return { type: "doc", content: [{ type: "paragraph", content: [] }] };
}

export function operationId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
