// Strategy B editor: ONE Tiptap instance covers the whole canvas.
// Custom extensions for all block types. Scene nodes use a React NodeView.
// Safe: no direct DOM mutation APIs, no network calls.

import { useState } from "react";
import { Node } from "@tiptap/core";
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { NarrativeSemanticDocument } from "../shared/types";
import { fromSemanticDocument } from "./adapter";

// ---------------------------------------------------------------------------
// Scene NodeView (React component)
// ---------------------------------------------------------------------------

function SceneNodeView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper
      as="section"
      data-scene-id={node.attrs["id"] as string}
      aria-label={`Scene: ${node.attrs["title"] as string}`}
      data-layout={node.attrs["layoutPreset"] as string}
      data-atmosphere={node.attrs["atmosphere"] as string}
    >
      <h2 contentEditable={false}>{node.attrs["title"] as string}</h2>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}

// ---------------------------------------------------------------------------
// Tiptap Node extensions
// In Tiptap 3.x, attrs are defined via addAttributes(), not attrs: {...}
// ---------------------------------------------------------------------------

const SceneNode = Node.create({
  name: "scene",
  group: "block",
  content: "canvas_block+",

  addAttributes() {
    return {
      id: { default: "" },
      title: { default: "" },
      layoutPreset: { default: "single_column" },
      atmosphere: { default: "neutral" },
      motionPreset: { default: "none" },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(SceneNodeView);
  },

  parseHTML() {
    return [{ tag: "section[data-scene-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["section", HTMLAttributes, 0];
  },
});

const RichTextBlockNode = Node.create({
  name: "rich_text_block",
  group: "canvas_block",
  content: "block+",

  addAttributes() {
    return { id: { default: "" } };
  },

  parseHTML() {
    return [{ tag: "div[data-block-kind=rich_text]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-block-kind": "rich_text" }, 0];
  },
});

const MetricBlockNode = Node.create({
  name: "metric_block",
  group: "canvas_block",
  atom: true,

  addAttributes() {
    return {
      id: { default: "" },
      label: { default: "" },
      value: { default: "" },
      unit: { default: "" },
      description: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block-kind=metric]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-block-kind": "metric" }];
  },
});

const ImageBlockNode = Node.create({
  name: "image_block",
  group: "canvas_block",
  atom: true,

  addAttributes() {
    return {
      id: { default: "" },
      assetId: { default: "" },
      alt: { default: "" },
      caption: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block-kind=image]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-block-kind": "image" }];
  },
});

const CalloutBlockNode = Node.create({
  name: "callout_block",
  group: "canvas_block",
  content: "block+",

  addAttributes() {
    return {
      id: { default: "" },
      variant: { default: "note" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block-kind=callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-block-kind": "callout" }, 0];
  },
});

const TimelineBlockNode = Node.create({
  name: "timeline_block",
  group: "canvas_block",
  atom: true,

  addAttributes() {
    return {
      id: { default: "" },
      title: { default: "" },
      itemsJson: { default: "[]" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block-kind=timeline]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-block-kind": "timeline" }];
  },
});

// ---------------------------------------------------------------------------
// CanvasEditorB
// ---------------------------------------------------------------------------

export function CanvasEditorB({
  initialDoc,
  onCommit,
}: {
  initialDoc: NarrativeSemanticDocument;
  onCommit?: (doc: NarrativeSemanticDocument) => void;
}) {
  const [_pmDoc, setPmDoc] = useState(() => fromSemanticDocument(initialDoc));
  void onCommit; // available for future integration

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable StarterKit's doc node since we define custom top-level structure
        document: false,
        paragraph: {},
        heading: {},
        bold: {},
        italic: {},
        code: {},
        codeBlock: {},
        blockquote: {},
        orderedList: {},
        bulletList: {},
        listItem: {},
        horizontalRule: false,
        strike: false,
        hardBreak: {},
      }),
      SceneNode,
      RichTextBlockNode,
      MetricBlockNode,
      ImageBlockNode,
      CalloutBlockNode,
      TimelineBlockNode,
    ],
    content: fromSemanticDocument(initialDoc).toJSON() as object,
    onUpdate: ({ editor: e }) => {
      setPmDoc(e.state.doc);
    },
  });

  return (
    <div data-testid="canvas-editor-b" aria-label="Canvas editor B">
      <EditorContent editor={editor} />
    </div>
  );
}

// Export node constructors for testing
export {
  SceneNode,
  SceneNodeView,
  RichTextBlockNode,
  MetricBlockNode,
  ImageBlockNode,
  CalloutBlockNode,
  TimelineBlockNode,
};
