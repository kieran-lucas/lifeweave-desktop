// Strategy B ProseMirror schemas.
// narrativeSchemaV1: schemaVersion 1 document structure.
// narrativeSchemaV2: adds narrativeType to doc attrs.

import { Schema } from "@tiptap/pm/model";

// ---------------------------------------------------------------------------
// Common node and mark specs shared between V1 and V2
// ---------------------------------------------------------------------------

const BLOCK_NODES = {
  // Basic Leaf-compatible block nodes
  paragraph: { content: "inline*", group: "block" },
  heading: { attrs: { level: { default: 2 } }, content: "inline*", group: "block" },
  blockquote: { content: "block+", group: "block" },
  code_block: { content: "text*", marks: "", group: "block" },
  ordered_list: { content: "list_item+", group: "block" },
  bullet_list: { content: "list_item+", group: "block" },
  list_item: { content: "paragraph block*" },
  callout: { attrs: { variant: { default: "note" } }, content: "block+", group: "block" },
  table: { content: "table_row+", group: "block" },
  table_row: { content: "table_cell+" },
  table_cell: { content: "paragraph+" },

  // Inline nodes
  text: { group: "inline" },
  hard_break: { inline: true, group: "inline", selectable: false },
  image: {
    inline: true,
    group: "inline",
    attrs: { src: { default: "" }, alt: { default: null }, assetId: { default: null } },
  },
};

const CANVAS_BLOCK_NODES = {
  // Semantic canvas block nodes
  rich_text_block: {
    attrs: { id: { default: "" } },
    content: "block+",
    group: "canvas_block",
  },
  metric_block: {
    attrs: {
      id: { default: "" },
      label: { default: "" },
      value: { default: "" },
      unit: { default: "" },
      description: { default: "" },
    },
    group: "canvas_block",
    // No content = leaf node in PM
  },
  image_block: {
    attrs: {
      id: { default: "" },
      assetId: { default: "" },
      alt: { default: "" },
      caption: { default: "" },
    },
    group: "canvas_block",
    // No content = leaf node in PM
  },
  callout_block: {
    attrs: { id: { default: "" }, variant: { default: "note" } },
    content: "block+",
    group: "canvas_block",
  },
  timeline_block: {
    attrs: {
      id: { default: "" },
      title: { default: "" },
      itemsJson: { default: "[]" },
    },
    group: "canvas_block",
    // No content = leaf node in PM
  },
};

const SCENE_NODE = {
  scene: {
    attrs: {
      id: { default: "" },
      title: { default: "" },
      layoutPreset: { default: "single_column" },
      atmosphere: { default: "neutral" },
      motionPreset: { default: "none" },
    },
    content: "canvas_block+",
  },
};

const MARKS = {
  bold: {},
  italic: {},
  code: {},
  link: { attrs: { href: { default: "" }, title: { default: null } } },
};

// ---------------------------------------------------------------------------
// narrativeSchemaV1
// ---------------------------------------------------------------------------

export const narrativeSchemaV1 = new Schema({
  nodes: {
    doc: {
      attrs: {
        documentId: { default: "" },
        title: { default: "" },
        templateId: { default: "knowledge_dossier" },
        schemaVersion: { default: 1 },
      },
      content: "scene+",
    },
    ...SCENE_NODE,
    ...CANVAS_BLOCK_NODES,
    ...BLOCK_NODES,
  },
  marks: MARKS,
});

// ---------------------------------------------------------------------------
// narrativeSchemaV2: adds narrativeType to doc attrs
// ---------------------------------------------------------------------------

export const narrativeSchemaV2 = new Schema({
  nodes: {
    doc: {
      attrs: {
        documentId: { default: "" },
        title: { default: "" },
        templateId: { default: "knowledge_dossier" },
        schemaVersion: { default: 2 },
        narrativeType: { default: "story" },
      },
      content: "scene+",
    },
    ...SCENE_NODE,
    ...CANVAS_BLOCK_NODES,
    ...BLOCK_NODES,
  },
  marks: MARKS,
});
