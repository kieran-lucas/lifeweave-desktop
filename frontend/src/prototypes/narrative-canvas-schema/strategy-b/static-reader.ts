// Strategy B static reader — walks raw JSON without loading PM schema.
// No prosemirror-model import. Pure JSON tree walking.
// Reads the serialized JSON from adapterB.serialize() and produces a StaticProjection.

import type { StaticBlockProjection, StaticProjection, StaticSceneProjection } from "../shared/types";

// ---------------------------------------------------------------------------
// Raw JSON types (no PM dependency)
// ---------------------------------------------------------------------------

type RawNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RawNode[];
  text?: string;
};

// ---------------------------------------------------------------------------
// Plain text extraction from raw PM-style JSON
// ---------------------------------------------------------------------------

function rawNodeToPlainText(node: RawNode): string {
  if (node.type === "text" && node.text) return node.text;
  if (node.content) return node.content.map(rawNodeToPlainText).join("");
  return "";
}

// ---------------------------------------------------------------------------
// Block projection from raw node
// ---------------------------------------------------------------------------

function rawBlockToProjection(node: RawNode): StaticBlockProjection {
  const attrs = node.attrs ?? {};
  const id = (attrs["id"] as string) ?? "";

  switch (node.type) {
    case "rich_text_block": {
      const plainText = (node.content ?? []).map(rawNodeToPlainText).join(" ");
      return { kind: "rich_text", id, plainText, data: { content: node.content } };
    }
    case "metric_block": {
      const label = (attrs["label"] as string) ?? "";
      const value = (attrs["value"] as string) ?? "";
      const unit = (attrs["unit"] as string) ?? "";
      const description = (attrs["description"] as string) ?? "";
      const plainText = `${label} ${value} ${unit} ${description}`.trim();
      return { kind: "metric", id, plainText, data: { label, value, unit, description } };
    }
    case "image_block": {
      const assetId = (attrs["assetId"] as string) ?? "";
      const alt = (attrs["alt"] as string) ?? "";
      const caption = (attrs["caption"] as string) ?? "";
      const plainText = `${alt} ${caption}`.trim();
      return { kind: "image", id, plainText, data: { assetId, alt, caption } };
    }
    case "callout_block": {
      const variant = (attrs["variant"] as string) ?? "note";
      const plainText = (node.content ?? []).map(rawNodeToPlainText).join(" ");
      return { kind: "callout", id, plainText, data: { variant, content: node.content } };
    }
    case "timeline_block": {
      const title = (attrs["title"] as string) ?? "";
      const itemsJson = (attrs["itemsJson"] as string) ?? "[]";
      let items: { id: string; label: string; description: string }[] = [];
      try {
        items = JSON.parse(itemsJson) as typeof items;
      } catch {
        items = [];
      }
      const parts = [title, ...items.map(it => `${it.label} ${it.description}`)];
      const plainText = parts.filter(Boolean).join(" ");
      return { kind: "timeline", id, plainText, data: { title, items } };
    }
    default: {
      const plainText = rawNodeToPlainText(node);
      return { kind: node.type, id, plainText, data: attrs };
    }
  }
}

// ---------------------------------------------------------------------------
// Scene projection from raw node
// ---------------------------------------------------------------------------

function rawSceneToProjection(node: RawNode): StaticSceneProjection {
  const attrs = node.attrs ?? {};
  return {
    id: (attrs["id"] as string) ?? "",
    title: (attrs["title"] as string) ?? "",
    layout: (attrs["layoutPreset"] as string) ?? "single_column",
    atmosphere: (attrs["atmosphere"] as string) ?? "neutral",
    motion: (attrs["motionPreset"] as string) ?? "none",
    blocks: (node.content ?? []).map(rawBlockToProjection),
  };
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Reads a StaticProjection from the raw JSON produced by adapterB.serialize().
 * Pure JSON tree walking. No prosemirror-model needed.
 */
export function staticReadFromRawJson(rawJson: unknown): StaticProjection {
  const root = rawJson as RawNode;

  if (!root || root.type !== "doc") {
    return { documentTitle: "", scenes: [] };
  }

  const attrs = root.attrs ?? {};
  const documentTitle = (attrs["title"] as string) ?? "";

  const scenes: StaticSceneProjection[] = (root.content ?? [])
    .filter(n => n.type === "scene")
    .map(rawSceneToProjection);

  return { documentTitle, scenes };
}
