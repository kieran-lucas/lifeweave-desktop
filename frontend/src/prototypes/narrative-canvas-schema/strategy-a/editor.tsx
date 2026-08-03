// Strategy A editor prototype: React owns scene/block shell.
// One active rich-text block mounts a Tiptap island.
// Switching active block commits the previous island before unmounting.
// Safe: no direct DOM mutation APIs, no network calls.

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type {
  BasicLeafContent,
  NarrativeSemanticBlock,
  NarrativeSemanticDocument,
} from "../shared/types";
import { adapterA } from "./adapter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveBlock = {
  sceneIndex: number;
  blockIndex: number;
  content: BasicLeafContent;
} | null;

// ---------------------------------------------------------------------------
// CanvasEditorA
// ---------------------------------------------------------------------------

export function CanvasEditorA({
  initialDoc,
  onCommit,
}: {
  initialDoc: NarrativeSemanticDocument;
  onCommit?: (doc: NarrativeSemanticDocument) => void;
}) {
  const [doc, setDoc] = useState(initialDoc);
  const [activeBlock, setActiveBlock] = useState<ActiveBlock>(null);

  const commitActive = (
    currentDoc: NarrativeSemanticDocument,
    active: ActiveBlock,
  ): NarrativeSemanticDocument => {
    if (!active) return currentDoc;
    const existingBlock = currentDoc.scenes[active.sceneIndex]?.blocks[active.blockIndex];
    if (
      !existingBlock ||
      (existingBlock.kind !== "rich_text" && existingBlock.kind !== "callout")
    ) {
      return currentDoc;
    }
    return adapterA.updateBlock(
      currentDoc,
      active.sceneIndex,
      active.blockIndex,
      { ...existingBlock, content: active.content },
    );
  };

  const activateBlock = (si: number, bi: number) => {
    const committed = commitActive(doc, activeBlock);
    setDoc(committed);
    const block = committed.scenes[si]?.blocks[bi];
    if (block && (block.kind === "rich_text" || block.kind === "callout")) {
      setActiveBlock({ sceneIndex: si, blockIndex: bi, content: block.content });
    } else {
      setActiveBlock(null);
    }
  };

  const deactivate = () => {
    if (!activeBlock) return;
    const committed = commitActive(doc, activeBlock);
    setDoc(committed);
    if (onCommit) onCommit(committed);
    setActiveBlock(null);
  };

  return (
    <div data-testid="canvas-editor-a" aria-label={`Canvas: ${doc.title}`}>
      {doc.scenes.map((scene, si) => (
        <section
          key={scene.id}
          data-layout={scene.layoutPreset}
          data-atmosphere={scene.atmosphere}
          aria-label={`Scene: ${scene.title}`}
        >
          <h2>{scene.title}</h2>
          {scene.blocks.map((block, bi) => {
            const isActive =
              activeBlock?.sceneIndex === si && activeBlock?.blockIndex === bi;
            return (
              <div
                key={block.id}
                data-testid={`block-${block.id}`}
                data-block-kind={block.kind}
                data-active={isActive}
              >
                {isActive &&
                (block.kind === "rich_text" || block.kind === "callout") ? (
                  <IslandEditor
                    content={activeBlock!.content}
                    onUpdate={c =>
                      setActiveBlock(prev =>
                        prev ? { ...prev, content: c } : null,
                      )
                    }
                    onBlur={deactivate}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => activateBlock(si, bi)}
                    aria-label={`Edit block ${block.id}`}
                  >
                    <StaticBlockPreview block={block} />
                  </button>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IslandEditor: one Tiptap instance per active rich-text block
// ---------------------------------------------------------------------------

function IslandEditor({
  content,
  onUpdate,
  onBlur,
}: {
  content: BasicLeafContent;
  onUpdate: (c: BasicLeafContent) => void;
  onBlur: () => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
        strike: false,
      }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onUpdate(e.getJSON() as BasicLeafContent);
    },
  });

  return (
    <EditorContent
      editor={editor}
      data-testid="island-editor"
      onBlur={onBlur}
    />
  );
}

// ---------------------------------------------------------------------------
// StaticBlockPreview: read-only preview for non-active blocks
// ---------------------------------------------------------------------------

function StaticBlockPreview({ block }: { block: NarrativeSemanticBlock }) {
  switch (block.kind) {
    case "rich_text":
      return (
        <p>
          {block.content.content
            .map(n => n.content?.map(c => c.text).join("") ?? "")
            .join(" ")}
        </p>
      );
    case "metric":
      return (
        <p>
          <strong>{block.label}:</strong> {block.value} {block.unit}
        </p>
      );
    case "image":
      return <p>[Image: {block.alt}]</p>;
    case "callout":
      return (
        <p>
          [{block.variant}]{" "}
          {block.content.content
            .map(n => n.content?.map(c => c.text).join("") ?? "")
            .join(" ")}
        </p>
      );
    case "timeline":
      return <p>[Timeline: {block.title}]</p>;
  }
}
