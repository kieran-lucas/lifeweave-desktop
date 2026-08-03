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
export type NarrativeTemplateId = "knowledge_dossier" | "project_blueprint" | "learning_journey";

// Known block kinds — closed union for component dispatch
export type NarrativeBlock =
  | { kind: "rich_text"; id: string; content: RichTextContent }
  | { kind: "metric"; id: string; label: string; value: string; unit: string; description: string }
  | { kind: "image"; id: string; assetId: string; alt: string; caption: string }
  | { kind: "callout"; id: string; variant: "note" | "warning" | "tip"; content: RichTextContent }
  | { kind: "timeline"; id: string; title: string; items: Array<{ id: string; label: string; description: string }> };

// Unknown block — preserves the entire raw object for round-trip fidelity
export type UnknownNarrativeBlock = {
  category: "unknown";
  kind: string;
  canonical: Readonly<Record<string, unknown>>;
  canonicalId: string | null;
  uiKey: string;
};

// Union for components that must handle both known and unknown blocks
export type ParsedNarrativeBlock = NarrativeBlock | UnknownNarrativeBlock;

export function isUnknownBlock(b: ParsedNarrativeBlock): b is UnknownNarrativeBlock {
  return (b as UnknownNarrativeBlock).category === "unknown";
}

export type NarrativeScene = {
  id: string;
  title: string;
  layoutPreset: "single_column";
  atmosphere: "neutral";
  motionPreset: "none";
  blocks: ParsedNarrativeBlock[];
};

// NarrativeDocument uses ParsedNarrativeBlock (includes unknowns)
export type ParsedNarrativeDocument = {
  schemaVersion: 1;
  documentId: string;
  title: string;
  templateId: NarrativeTemplateId;
  templateVersion: 1;
  scenes: [NarrativeScene, ...NarrativeScene[]];
};

// Kept for backwards compat where callers only work with known blocks
export type NarrativeDocument = ParsedNarrativeDocument;

function assertString(v: unknown, field: string): string {
  if (typeof v !== "string") throw new Error(`${field} must be a string`);
  return v;
}

function assertArray(v: unknown, field: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`${field} must be an array`);
  return v;
}

function assertStringExact<T extends string>(v: unknown, field: string, allowed: readonly T[]): T {
  assertString(v, field);
  if (!allowed.includes(v as T)) throw new Error(`${field} must be one of: ${allowed.join(", ")}`);
  return v as T;
}

function parseRichTextContent(v: unknown, field: string): RichTextContent {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`${field} must be an object`);
  const c = v as Record<string, unknown>;
  if (c["type"] !== "doc") throw new Error(`${field}.type must be "doc"`);
  if (!Array.isArray(c["content"])) throw new Error(`${field}.content must be an array`);
  return v as RichTextContent;
}

function parseBlock(raw: unknown, index: number): ParsedNarrativeBlock {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Block ${index} must be an object`);
  const b = raw as Record<string, unknown>;
  const kind = assertString(b["kind"], `blocks[${index}].kind`);
  const id = assertString(b["id"], `blocks[${index}].id`);

  switch (kind) {
    case "rich_text":
      return { kind: "rich_text", id, content: parseRichTextContent(b["content"], `blocks[${index}].content`) };

    case "metric": {
      const label = b["label"];
      const value = b["value"];
      const unit = b["unit"];
      const description = b["description"];
      if (typeof label !== "string") throw new Error(`blocks[${index}].label must be a string`);
      if (typeof value !== "string") throw new Error(`blocks[${index}].value must be a string`);
      if (typeof unit !== "string") throw new Error(`blocks[${index}].unit must be a string`);
      if (typeof description !== "string") throw new Error(`blocks[${index}].description must be a string`);
      return { kind: "metric", id, label, value, unit, description };
    }

    case "image": {
      const assetId = b["assetId"];
      const alt = b["alt"];
      const caption = b["caption"];
      if (typeof assetId !== "string") throw new Error(`blocks[${index}].assetId must be a string`);
      if (typeof alt !== "string") throw new Error(`blocks[${index}].alt must be a string`);
      if (typeof caption !== "string") throw new Error(`blocks[${index}].caption must be a string`);
      return { kind: "image", id, assetId, alt, caption };
    }

    case "callout": {
      const variant = assertStringExact(b["variant"], `blocks[${index}].variant`, ["note", "warning", "tip"] as const);
      return { kind: "callout", id, variant, content: parseRichTextContent(b["content"], `blocks[${index}].content`) };
    }

    case "timeline": {
      const rawItems = assertArray(b["items"], `blocks[${index}].items`);
      const items = rawItems.map((it, i) => {
        if (!it || typeof it !== "object" || Array.isArray(it)) throw new Error(`blocks[${index}].items[${i}] must be an object`);
        const item = it as Record<string, unknown>;
        const itemId = item["id"];
        const label = item["label"];
        const desc = item["description"];
        if (typeof itemId !== "string") throw new Error(`blocks[${index}].items[${i}].id must be a string`);
        if (typeof label !== "string") throw new Error(`blocks[${index}].items[${i}].label must be a string`);
        if (typeof desc !== "string") throw new Error(`blocks[${index}].items[${i}].description must be a string`);
        return { id: itemId, label, description: desc };
      });
      const title = b["title"];
      if (typeof title !== "string") throw new Error(`blocks[${index}].title must be a string`);
      return { kind: "timeline", id, title, items };
    }

    default: {
      // Preserve entire raw object for lossless round-trip
      return {
        category: "unknown",
        kind,
        canonical: Object.freeze({ ...b }) as Readonly<Record<string, unknown>>,
        canonicalId: typeof b["id"] === "string" ? b["id"] : null,
        uiKey: typeof b["id"] === "string" ? b["id"] : `unknown-${index}`,
      };
    }
  }
}

export function parseNarrative(json: string): ParsedNarrativeDocument {
  const raw: unknown = JSON.parse(json);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Narrative must be an object");
  const doc = raw as Record<string, unknown>;
  if (doc["schemaVersion"] !== 1) throw new Error("Unsupported schemaVersion");
  const templateId = assertStringExact(doc["templateId"], "templateId", ["knowledge_dossier", "project_blueprint", "learning_journey"] as const);
  if (doc["templateVersion"] !== 1) throw new Error("Unsupported templateVersion");
  assertString(doc["documentId"], "documentId");
  assertString(doc["title"], "title");
  const scenes = assertArray(doc["scenes"], "scenes");
  if (scenes.length === 0 || scenes.length > 20) throw new Error("Narrative must have 1 to 20 scenes");
  const parsedScenes = scenes.map((s, si) => {
    if (!s || typeof s !== "object" || Array.isArray(s)) throw new Error(`Scene ${si} must be an object`);
    const scene = s as Record<string, unknown>;
    assertStringExact(scene["layoutPreset"], `scenes[${si}].layoutPreset`, ["single_column"] as const);
    assertStringExact(scene["atmosphere"], `scenes[${si}].atmosphere`, ["neutral"] as const);
    assertStringExact(scene["motionPreset"], `scenes[${si}].motionPreset`, ["none"] as const);
    const blocks = assertArray(scene["blocks"] ?? [], `scenes[${si}].blocks`);
    return {
      id: assertString(scene["id"], `scenes[${si}].id`),
      title: assertString(scene["title"], `scenes[${si}].title`),
      layoutPreset: "single_column" as const,
      atmosphere: "neutral" as const,
      motionPreset: "none" as const,
      blocks: blocks.map((b, bi) => parseBlock(b, bi)),
    };
  });
  return {
    schemaVersion: 1,
    documentId: assertString(doc["documentId"], "documentId"),
    title: assertString(doc["title"], "title"),
    templateId,
    templateVersion: 1,
    scenes: parsedScenes as [NarrativeScene, ...NarrativeScene[]],
  };
}

// Serializes a ParsedNarrativeDocument to canonical JSON string.
// Known blocks: emit only V1 fields. Unknown blocks: emit their canonical raw object exactly.
export function toNarrativeCanonicalValue(doc: ParsedNarrativeDocument): Record<string, unknown> {
  return {
    schemaVersion: doc.schemaVersion,
    documentId: doc.documentId,
    title: doc.title,
    templateId: doc.templateId,
    templateVersion: doc.templateVersion,
    scenes: doc.scenes.map(scene => ({
      id: scene.id,
      title: scene.title,
      layoutPreset: scene.layoutPreset,
      atmosphere: scene.atmosphere,
      motionPreset: scene.motionPreset,
      blocks: scene.blocks.map(serializeBlock),
    })),
  };
}

function serializeBlock(block: ParsedNarrativeBlock): Record<string, unknown> {
  if (isUnknownBlock(block)) {
    // Emit the canonical raw object exactly — lossless round-trip
    return { ...block.canonical };
  }
  switch (block.kind) {
    case "rich_text":
      return { kind: "rich_text", id: block.id, content: block.content };
    case "metric":
      return { kind: "metric", id: block.id, label: block.label, value: block.value, unit: block.unit, description: block.description };
    case "image":
      return { kind: "image", id: block.id, assetId: block.assetId, alt: block.alt, caption: block.caption };
    case "callout":
      return { kind: "callout", id: block.id, variant: block.variant, content: block.content };
    case "timeline":
      return { kind: "timeline", id: block.id, title: block.title, items: block.items };
  }
}

export function serializeNarrative(doc: ParsedNarrativeDocument): string {
  return JSON.stringify(toNarrativeCanonicalValue(doc));
}

export function emptyRichText(): RichTextContent {
  return { type: "doc", content: [{ type: "paragraph", content: [] }] };
}

export function operationId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function newNarrativeId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const ms = BigInt(Date.now());
  bytes[0] = Number((ms >> 40n) & 0xffn);
  bytes[1] = Number((ms >> 32n) & 0xffn);
  bytes[2] = Number((ms >> 24n) & 0xffn);
  bytes[3] = Number((ms >> 16n) & 0xffn);
  bytes[4] = Number((ms >> 8n) & 0xffn);
  bytes[5] = Number(ms & 0xffn);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
