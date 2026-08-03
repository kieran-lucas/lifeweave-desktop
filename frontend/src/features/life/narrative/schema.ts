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

export type KnownNarrativeBlock = NarrativeBlock;

export type UnknownNarrativeBlock = { kind: string; id: string };

export type NarrativeScene = {
  id: string;
  title: string;
  layoutPreset: "single_column";
  atmosphere: "neutral";
  motionPreset: "none";
  blocks: NarrativeBlock[];
};

export type NarrativeDocument = {
  schemaVersion: 1;
  documentId: string;
  title: string;
  templateId: "knowledge_dossier";
  templateVersion: 1;
  scenes: [NarrativeScene, ...NarrativeScene[]];
};

function assertString(v: unknown, field: string): string {
  if (typeof v !== "string") throw new Error(`${field} must be a string`);
  return v;
}

function assertArray(v: unknown, field: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`${field} must be an array`);
  return v;
}

function parseBlock(raw: unknown, index: number): NarrativeBlock {
  if (!raw || typeof raw !== "object") throw new Error(`Block ${index} must be an object`);
  const b = raw as Record<string, unknown>;
  const kind = assertString(b["kind"], `blocks[${index}].kind`);
  const id = assertString(b["id"], `blocks[${index}].id`);
  switch (kind) {
    case "rich_text":
      return { kind: "rich_text", id, content: b["content"] as RichTextContent };
    case "metric":
      return {
        kind: "metric", id,
        label: String(b["label"] ?? ""),
        value: String(b["value"] ?? ""),
        unit: String(b["unit"] ?? ""),
        description: String(b["description"] ?? ""),
      };
    case "image":
      return {
        kind: "image", id,
        assetId: String(b["assetId"] ?? ""),
        alt: String(b["alt"] ?? ""),
        caption: String(b["caption"] ?? ""),
      };
    case "callout": {
      const variant = b["variant"];
      const safeVariant = variant === "warning" || variant === "tip" ? variant : "note";
      return { kind: "callout", id, variant: safeVariant, content: b["content"] as RichTextContent };
    }
    case "timeline": {
      const items = Array.isArray(b["items"])
        ? (b["items"] as unknown[]).map((it, i) => {
            if (!it || typeof it !== "object") return { id: String(i), label: "", description: "" };
            const item = it as Record<string, unknown>;
            return {
              id: String(item["id"] ?? i),
              label: String(item["label"] ?? ""),
              description: String(item["description"] ?? ""),
            };
          })
        : [];
      return { kind: "timeline", id, title: String(b["title"] ?? ""), items };
    }
    default:
      // Unknown block kinds are preserved as-is; Rust strips them from plain_text
      return { kind, id } as unknown as NarrativeBlock;
  }
}

export function parseNarrative(json: string): NarrativeDocument {
  const raw: unknown = JSON.parse(json);
  if (!raw || typeof raw !== "object") throw new Error("Narrative must be an object");
  const doc = raw as Record<string, unknown>;
  if (doc["schemaVersion"] !== 1) throw new Error("Unsupported schemaVersion");
  if (doc["templateId"] !== "knowledge_dossier") throw new Error("Unsupported templateId");
  assertString(doc["documentId"], "documentId");
  const scenes = assertArray(doc["scenes"], "scenes");
  if (scenes.length === 0) throw new Error("Narrative requires at least one scene");
  const parsedScenes = scenes.map((s, si) => {
    if (!s || typeof s !== "object") throw new Error(`Scene ${si} must be an object`);
    const scene = s as Record<string, unknown>;
    const blocks = assertArray(scene["blocks"] ?? [], `scenes[${si}].blocks`);
    return {
      id: assertString(scene["id"], `scenes[${si}].id`),
      title: String(scene["title"] ?? ""),
      layoutPreset: "single_column" as const,
      atmosphere: "neutral" as const,
      motionPreset: "none" as const,
      blocks: blocks.map((b, bi) => parseBlock(b, bi)),
    };
  });
  return {
    schemaVersion: 1,
    documentId: assertString(doc["documentId"], "documentId"),
    title: String(doc["title"] ?? ""),
    templateId: "knowledge_dossier",
    templateVersion: 1,
    scenes: parsedScenes as [NarrativeScene, ...NarrativeScene[]],
  };
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
  // Set unix_ts_ms in first 6 bytes (bits 0-47)
  bytes[0] = Number((ms >> 40n) & 0xffn);
  bytes[1] = Number((ms >> 32n) & 0xffn);
  bytes[2] = Number((ms >> 24n) & 0xffn);
  bytes[3] = Number((ms >> 16n) & 0xffn);
  bytes[4] = Number((ms >> 8n) & 0xffn);
  bytes[5] = Number(ms & 0xffn);
  // Set version 7 (high nibble of byte 6)
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // Set variant bits (byte 8 high two bits = 10)
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
