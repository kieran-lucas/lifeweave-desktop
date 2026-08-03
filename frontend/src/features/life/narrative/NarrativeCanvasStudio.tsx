import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
function dndTransform(t: { x: number; y: number } | null): string | undefined {
  return t ? `translate3d(${Math.round(t.x)}px,${Math.round(t.y)}px,0)` : undefined;
}
import type { NarrativeDocumentView } from "../../../ipc/generated/NarrativeDocumentView";
import {
  discardNarrativeDraft,
  importDocumentAsset,
  saveNarrativeDocument,
  saveNarrativeDraft,
} from "../../../ipc/commands";
import {
  emptyRichText,
  newNarrativeId,
  operationId,
  parseNarrative,
} from "./schema";
import type {
  NarrativeBlock,
  NarrativeDocument,
  RichTextContent,
  UnknownNarrativeBlock,
} from "./schema";
import * as styles from "./NarrativeCanvas.css";

// ---------------------------------------------------------------------------
// Structural history (max 50 snapshots — Tiptap keystrokes do NOT push here)
// ---------------------------------------------------------------------------

type HistoryState = {
  past: NarrativeDocument[];
  current: NarrativeDocument;
  future: NarrativeDocument[];
};

function makeHistory(doc: NarrativeDocument): HistoryState {
  return { past: [], current: doc, future: [] };
}

function push(h: HistoryState, doc: NarrativeDocument): HistoryState {
  const past = [...h.past, h.current].slice(-50);
  return { past, current: doc, future: [] };
}

function undo(h: HistoryState): HistoryState {
  if (h.past.length === 0) return h;
  const past = [...h.past];
  const current = past.pop()!;
  return { past, current, future: [h.current, ...h.future] };
}

function redo(h: HistoryState): HistoryState {
  if (h.future.length === 0) return h;
  const [current, ...future] = h.future;
  return { past: [...h.past, h.current], current: current!, future };
}

// ---------------------------------------------------------------------------
// Tiptap configuration (shared, stable reference)
// ---------------------------------------------------------------------------

const tiptapExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    horizontalRule: false,
    strike: false,
  }),
];

// ---------------------------------------------------------------------------
// TiptapIsland — one active instance at a time
// The key={blockId} on the parent forces a remount on block switch.
// Keystrokes update activeContentRef only (no structural history push).
// ---------------------------------------------------------------------------

type TiptapIslandProps = {
  content: RichTextContent;
  activeContentRef: React.MutableRefObject<RichTextContent | null>;
  onDirty?: () => void;
};

function TiptapIsland({ content, activeContentRef, onDirty }: TiptapIslandProps) {
  const editor = useEditor({
    extensions: tiptapExtensions,
    content,
    onUpdate: ({ editor: e }) => {
      activeContentRef.current = e.getJSON() as RichTextContent;
      onDirty?.();
    },
  });
  return (
    <div className={styles.editorWrap}>
      <EditorContent editor={editor} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static preview for inactive rich_text / callout blocks
// ---------------------------------------------------------------------------

function extractPreviewText(content: RichTextContent): string {
  function walk(nodes: RichTextContent["content"] | undefined): string {
    if (!nodes) return "";
    return nodes
      .map(n => {
        if (n.type === "text" && n.text) return n.text;
        if (n.content) return walk(n.content);
        return "";
      })
      .join("");
  }
  const text = walk(content.content).trim();
  if (!text) return "Click to edit…";
  return text.length > 60 ? text.slice(0, 60) + "…" : text;
}

function RichTextStaticPreview({
  content,
  onActivate,
  label,
}: {
  content: RichTextContent;
  onActivate: () => void;
  label: string;
}) {
  return (
    <button
      className={styles.staticPreview}
      onClick={onActivate}
      aria-label={label}
      type="button"
    >
      {extractPreviewText(content)}
    </button>
  );
}

// ---------------------------------------------------------------------------
// MetricBlockEditor
// ---------------------------------------------------------------------------

type MetricBlock = Extract<NarrativeBlock, { kind: "metric" }>;

function MetricBlockEditor({
  block,
  onChange,
}: {
  block: MetricBlock;
  onChange: (b: MetricBlock) => void;
}) {
  return (
    <div>
      <label className={styles.fieldLabel} htmlFor={`metric-label-${block.id}`}>
        Label
      </label>
      <input
        id={`metric-label-${block.id}`}
        className={styles.fieldInput}
        value={block.label}
        onChange={e => onChange({ ...block, label: e.currentTarget.value })}
      />
      <label className={styles.fieldLabel} htmlFor={`metric-value-${block.id}`}>
        Value
      </label>
      <input
        id={`metric-value-${block.id}`}
        className={styles.fieldInput}
        value={block.value}
        onChange={e => onChange({ ...block, value: e.currentTarget.value })}
      />
      <label className={styles.fieldLabel} htmlFor={`metric-unit-${block.id}`}>
        Unit
      </label>
      <input
        id={`metric-unit-${block.id}`}
        className={styles.fieldInput}
        value={block.unit}
        onChange={e => onChange({ ...block, unit: e.currentTarget.value })}
      />
      <label className={styles.fieldLabel} htmlFor={`metric-desc-${block.id}`}>
        Description
      </label>
      <textarea
        id={`metric-desc-${block.id}`}
        className={styles.fieldTextarea}
        value={block.description}
        onChange={e => onChange({ ...block, description: e.currentTarget.value })}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImageBlockEditor — uses importDocumentAsset (file picker), not raw asset ID
// ---------------------------------------------------------------------------

type ImageBlock = Extract<NarrativeBlock, { kind: "image" }>;

function ImageBlockEditor({
  block,
  onChange,
}: {
  block: ImageBlock;
  onChange: (b: ImageBlock) => void;
}) {
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const previewUrlRef = useRef<string | undefined>(undefined);

  // Revoke object URL on unmount to avoid memory leak
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleImport = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      setImporting(true);
      setImportError(undefined);
      try {
        const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
        const asset = await importDocumentAsset({
          original_name: file.name,
          bytes,
        });
        // Revoke any previous preview URL
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        const url = URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], { type: file.type || "image/jpeg" }),
        );
        previewUrlRef.current = url;
        setPreview(url);
        onChange({ ...block, assetId: asset.asset_id });
      } catch (err: unknown) {
        setImportError(
          err instanceof Error ? err.message : "Image import failed.",
        );
      } finally {
        setImporting(false);
      }
    };
    fileInput.click();
  };

  return (
    <div>
      <button
        className={styles.importButton}
        onClick={handleImport}
        disabled={importing}
        type="button"
      >
        {importing ? "Importing…" : block.assetId ? "Replace image" : "Import image"}
      </button>
      {importError && (
        <p role="alert" className={styles.status}>
          {importError}
        </p>
      )}
      {block.assetId && preview && (
        <img
          className={styles.previewImage}
          src={preview}
          alt={block.alt}
        />
      )}
      {block.assetId && !preview && (
        <p className={styles.status}>Image imported (asset: {block.assetId})</p>
      )}
      <label className={styles.fieldLabel} htmlFor={`img-alt-${block.id}`}>
        Alt text
      </label>
      <input
        id={`img-alt-${block.id}`}
        className={styles.fieldInput}
        value={block.alt}
        onChange={e => onChange({ ...block, alt: e.currentTarget.value })}
      />
      <label className={styles.fieldLabel} htmlFor={`img-caption-${block.id}`}>
        Caption
      </label>
      <input
        id={`img-caption-${block.id}`}
        className={styles.fieldInput}
        value={block.caption}
        onChange={e => onChange({ ...block, caption: e.currentTarget.value })}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimelineBlockEditor — with dnd-kit sortable for items
// ---------------------------------------------------------------------------

type TimelineBlock = Extract<NarrativeBlock, { kind: "timeline" }>;
type TimelineItem = TimelineBlock["items"][number];

function SortableTimelineItem({
  item,
  index,
  total,
  onUpdate,
  onDelete,
}: {
  item: TimelineItem;
  index: number;
  total: number;
  onUpdate: (item: TimelineItem) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  // dnd-kit requires inline style for transforms — unavoidable
  const dndStyle = {
    transform: dndTransform(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={dndStyle} className={styles.timelineItemEditor}>
      <div className={styles.studioBlockHeader}>
        <button
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder timeline item"
          type="button"
          tabIndex={0}
        >
          ⠿
        </button>
        <span className={styles.studioBlockKind}>Item {index + 1}</span>
        <button
          className={styles.button}
          onClick={onDelete}
          disabled={total <= 1}
          aria-label={`Remove timeline item ${index + 1}`}
          type="button"
        >
          ✕
        </button>
      </div>
      <label
        className={styles.fieldLabel}
        htmlFor={`tl-item-label-${item.id}`}
      >
        Label
      </label>
      <input
        id={`tl-item-label-${item.id}`}
        className={styles.fieldInput}
        value={item.label}
        onChange={e => onUpdate({ ...item, label: e.currentTarget.value })}
      />
      <label
        className={styles.fieldLabel}
        htmlFor={`tl-item-desc-${item.id}`}
      >
        Description
      </label>
      <input
        id={`tl-item-desc-${item.id}`}
        className={styles.fieldInput}
        value={item.description}
        onChange={e => onUpdate({ ...item, description: e.currentTarget.value })}
      />
    </div>
  );
}

function TimelineBlockEditor({
  block,
  onChange,
}: {
  block: TimelineBlock;
  onChange: (b: TimelineBlock) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const itemIds = block.items.map(it => it.id);

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = block.items.findIndex(it => it.id === active.id);
    const newIndex = block.items.findIndex(it => it.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange({ ...block, items: arrayMove(block.items, oldIndex, newIndex) });
  };

  const updateItem = (index: number, item: TimelineItem) => {
    onChange({
      ...block,
      items: block.items.map((it, i) => (i === index ? item : it)),
    });
  };

  const deleteItem = (index: number) => {
    onChange({ ...block, items: block.items.filter((_, i) => i !== index) });
  };

  const addItem = () => {
    onChange({
      ...block,
      items: [
        ...block.items,
        { id: newNarrativeId(), label: "", description: "" },
      ],
    });
  };

  return (
    <div>
      <label className={styles.fieldLabel} htmlFor={`tl-title-${block.id}`}>
        Timeline heading
      </label>
      <input
        id={`tl-title-${block.id}`}
        className={styles.fieldInput}
        value={block.title}
        onChange={e => onChange({ ...block, title: e.currentTarget.value })}
      />
      <div className={styles.fieldLabel}>Items</div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleItemDragEnd}
      >
        <SortableContext
          items={itemIds}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.blockList}>
            {block.items.map((item, i) => (
              <SortableTimelineItem
                key={item.id}
                item={item}
                index={i}
                total={block.items.length}
                onUpdate={updated => updateItem(i, updated)}
                onDelete={() => deleteItem(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        className={styles.addBlockButton}
        onClick={addItem}
        type="button"
      >
        Add item
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortableBlockEditor — wraps each block with dnd-kit + up/down/delete
// ---------------------------------------------------------------------------

type SortableBlockEditorProps = {
  block: NarrativeBlock;
  index: number;
  total: number;
  isActive: boolean;
  activeContentRef: React.MutableRefObject<RichTextContent | null>;
  onActivate: () => void;
  onUpdate: (block: NarrativeBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDirty: () => void;
};

function SortableBlockEditor({
  block,
  index,
  total,
  isActive,
  activeContentRef,
  onActivate,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDirty,
}: SortableBlockEditorProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  // dnd-kit requires inline style for transforms — unavoidable
  const dndStyle = {
    transform: dndTransform(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  } as React.CSSProperties;

  const kindLabel = block.kind.replace(/_/g, " ");

  const renderBlockContent = () => {
    switch (block.kind) {
      case "rich_text":
        return isActive ? (
          <TiptapIsland
            key={block.id}
            content={block.content}
            activeContentRef={activeContentRef}
            onDirty={onDirty}
          />
        ) : (
          <RichTextStaticPreview
            content={block.content}
            onActivate={onActivate}
            label="Click to edit rich text block"
          />
        );

      case "callout":
        return (
          <div>
            <label
              className={styles.fieldLabel}
              htmlFor={`callout-variant-${block.id}`}
            >
              Variant
            </label>
            <select
              id={`callout-variant-${block.id}`}
              className={styles.fieldInput}
              value={block.variant}
              onChange={e =>
                onUpdate({
                  ...block,
                  variant: e.currentTarget.value as "note" | "warning" | "tip",
                })
              }
            >
              <option value="note">Note</option>
              <option value="warning">Warning</option>
              <option value="tip">Tip</option>
            </select>
            <div className={styles.fieldLabel}>Content</div>
            {isActive ? (
              <TiptapIsland
                key={block.id}
                content={block.content}
                activeContentRef={activeContentRef}
                onDirty={onDirty}
              />
            ) : (
              <RichTextStaticPreview
                content={block.content}
                onActivate={onActivate}
                label="Click to edit callout content"
              />
            )}
          </div>
        );

      case "metric":
        return (
          <MetricBlockEditor
            block={block}
            onChange={onUpdate}
          />
        );

      case "image":
        return (
          <ImageBlockEditor
            block={block}
            onChange={onUpdate}
          />
        );

      case "timeline":
        return (
          <TimelineBlockEditor
            block={block}
            onChange={onUpdate}
          />
        );
      default: {
        const _b = block as unknown as UnknownNarrativeBlock;
        return <div className={styles.status}>Block type &quot;{_b.kind}&quot; is not editable in this version.</div>;
      }
    }
  };

  return (
    <div ref={setNodeRef} style={dndStyle} className={styles.studioBlock}>
      <div className={styles.studioBlockHeader}>
        {/* drag handle only — NOT the whole block, prevents text inputs from starting drags */}
        <button
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder block"
          type="button"
          tabIndex={0}
        >
          ⠿
        </button>
        <span className={styles.studioBlockKind}>{kindLabel}</span>
        <div className={styles.studioBlockActions}>
          <button
            className={styles.button}
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Move block up"
            type="button"
          >
            ↑
          </button>
          <button
            className={styles.button}
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Move block down"
            type="button"
          >
            ↓
          </button>
          <button
            className={styles.button}
            onClick={onDelete}
            aria-label="Delete block"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>
      {renderBlockContent()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  document: NarrativeDocumentView;
  initialJson: string | null | undefined;
  onCommitted: (value: NarrativeDocumentView) => void;
  onCancel: () => void;
};

// ---------------------------------------------------------------------------
// NarrativeCanvasStudio (main export)
// ---------------------------------------------------------------------------

export default function NarrativeCanvasStudio({
  document,
  initialJson,
  onCommitted,
  onCancel,
}: Props) {
  // ---- Revision tracking ----
  const revision = useRef(document.revision);

  // ---- Operation ID (stable per save attempt; regenerated after success) ----
  const saveOpId = useRef(operationId("narrative-save"));

  // ---- Structural history ----
  const [history, setHistory] = useState<HistoryState>(() => {
    try {
      return makeHistory(parseNarrative(initialJson ?? document.canonical_json));
    } catch {
      return makeHistory(parseNarrative(document.canonical_json));
    }
  });

  // ---- Active Tiptap island ----
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Live editor content (not in state — avoids re-renders per keystroke)
  const activeContentRef = useRef<RichTextContent | null>(null);

  // ---- UI state ----
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Saved");
  const [message, setMessage] = useState<string>();

  // ---- dnd-kit sensors ----
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const doc = history.current;
  const scene = doc.scenes[0];
  const blockIds = scene.blocks.map(b => b.id);

  // ---- Helpers ----

  const markDirty = useCallback(() => {
    setDirty(true);
    setStatus("Unsaved changes");
  }, []);

  /**
   * Commit the active island content into the current history state (in-place,
   * no history push — Tiptap keystrokes are not structural changes).
   * Clears activeContentRef and sets activeBlockId to null (or to newId).
   */
  const deactivateIsland = useCallback(
    (nextActiveId: string | null = null) => {
      if (activeBlockId !== null && activeContentRef.current !== null) {
        const content = activeContentRef.current;
        const closingId = activeBlockId;
        setHistory(h => {
          const blocks = h.current.scenes[0].blocks.map(b => {
            if (b.id === closingId) {
              if (b.kind === "rich_text") return { ...b, content };
              if (b.kind === "callout") return { ...b, content };
            }
            return b;
          });
          return {
            ...h,
            current: {
              ...h.current,
              scenes: [{ ...h.current.scenes[0], blocks }],
            },
          };
        });
        activeContentRef.current = null;
      }
      setActiveBlockId(nextActiveId);
    },
    [activeBlockId],
  );

  /**
   * Activate a block (commits current island first if switching).
   */
  const activateBlock = useCallback(
    (blockId: string) => {
      if (blockId === activeBlockId) return;
      deactivateIsland(blockId);
    },
    [activeBlockId, deactivateIsland],
  );

  /**
   * Materialize the current document including any unsaved Tiptap content.
   * Used for save and draft operations — does NOT push to history.
   */
  const materializeCurrentDocument = useCallback((): NarrativeDocument => {
    const h = history;
    if (activeBlockId !== null && activeContentRef.current !== null) {
      const content = activeContentRef.current;
      const blocks = h.current.scenes[0].blocks.map(b => {
        if (b.id === activeBlockId) {
          if (b.kind === "rich_text") return { ...b, content };
          if (b.kind === "callout") return { ...b, content };
        }
        return b;
      });
      return {
        ...h.current,
        scenes: [{ ...h.current.scenes[0], blocks }],
      };
    }
    return h.current;
  }, [history, activeBlockId]);

  // ---- Structural document mutations (push to history) ----

  const applyStructural = useCallback(
    (next: NarrativeDocument) => {
      setHistory(h => push(h, next));
      markDirty();
    },
    [markDirty],
  );

  const updateBlock = useCallback(
    (blockIndex: number, block: NarrativeBlock) => {
      // For rich_text/callout: these structural-field changes (e.g. variant) go through history
      // Tiptap content changes do NOT come through here — they go via activeContentRef
      const materialized = materializeCurrentDocument();
      const mScene = materialized.scenes[0];
      const newBlocks = mScene.blocks.map((b, i) => (i === blockIndex ? block : b));
      applyStructural({
        ...materialized,
        scenes: [{ ...mScene, blocks: newBlocks }],
      });
    },
    [materializeCurrentDocument, applyStructural],
  );

  const deleteBlock = useCallback(
    (blockIndex: number) => {
      const total = scene.blocks.length;
      if (total <= 1) {
        window.alert("Cannot delete the only block. Add another block first.");
        return;
      }
      const block = scene.blocks[blockIndex];
      if (block) {
        const isEmpty = isBlockEmpty(block);
        if (!isEmpty) {
          const confirmed = window.confirm(
            "Delete this block? This cannot be undone.",
          );
          if (!confirmed) return;
        }
      } else {
        const confirmed = window.confirm(
          "Delete this block? This cannot be undone.",
        );
        if (!confirmed) return;
      }

      // If deleting the active block, deactivate first (discard its content)
      if (block?.id === activeBlockId) {
        activeContentRef.current = null;
        setActiveBlockId(null);
      }

      const newBlocks = scene.blocks.filter((_, i) => i !== blockIndex);

      // Focus restoration: prefer block above, else block below
      const focusTarget =
        newBlocks[blockIndex - 1] ?? newBlocks[blockIndex] ?? null;
      if (focusTarget && (focusTarget.kind === "rich_text" || focusTarget.kind === "callout")) {
        setActiveBlockId(focusTarget.id);
      }

      applyStructural({
        ...doc,
        scenes: [{ ...scene, blocks: newBlocks }],
      });
    },
    [scene, doc, activeBlockId, applyStructural],
  );

  const moveBlock = useCallback(
    (from: number, to: number) => {
      // Materialize so live Tiptap content is not lost during reorder
      const materialized = materializeCurrentDocument();
      const mScene = materialized.scenes[0];
      const blocks = [...mScene.blocks];
      const [item] = blocks.splice(from, 1);
      blocks.splice(to, 0, item!);
      applyStructural({ ...materialized, scenes: [{ ...mScene, blocks }] });
    },
    [materializeCurrentDocument, applyStructural],
  );

  const handleBlockDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = scene.blocks.findIndex(b => b.id === active.id);
      const newIndex = scene.blocks.findIndex(b => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      // Materialize and apply via arrayMove
      const materialized = materializeCurrentDocument();
      const mScene = materialized.scenes[0];
      const newBlocks = arrayMove(mScene.blocks, oldIndex, newIndex);
      applyStructural({ ...materialized, scenes: [{ ...mScene, blocks: newBlocks }] });
    },
    [scene.blocks, materializeCurrentDocument, applyStructural],
  );

  const addBlock = useCallback(
    (kind: NarrativeBlock["kind"]) => {
      const id = newNarrativeId();
      let block: NarrativeBlock;
      switch (kind) {
        case "rich_text":
          block = { kind: "rich_text", id, content: emptyRichText() };
          break;
        case "metric":
          block = { kind: "metric", id, label: "", value: "", unit: "", description: "" };
          break;
        case "image":
          block = { kind: "image", id, assetId: "", alt: "", caption: "" };
          break;
        case "callout":
          block = { kind: "callout", id, variant: "note", content: emptyRichText() };
          break;
        case "timeline":
          block = { kind: "timeline", id, title: "", items: [] };
          break;
      }
      const materialized = materializeCurrentDocument();
      const mScene = materialized.scenes[0];
      applyStructural({
        ...materialized,
        scenes: [{ ...mScene, blocks: [...mScene.blocks, block] }],
      });
      // Auto-activate Tiptap island for rich text and callout blocks
      if (kind === "rich_text" || kind === "callout") {
        setActiveBlockId(id);
      }
    },
    [materializeCurrentDocument, applyStructural],
  );

  // ---- Undo / Redo ----

  const handleUndo = useCallback(() => {
    deactivateIsland(null);
    setHistory(h => undo(h));
  }, [deactivateIsland]);

  const handleRedo = useCallback(() => {
    deactivateIsland(null);
    setHistory(h => redo(h));
  }, [deactivateIsland]);

  // ---- Back with dirty confirmation ----

  const handleBack = () => {
    if (
      dirty &&
      !window.confirm(
        "Leave editor? Your draft is saved and can be recovered.",
      )
    ) {
      return;
    }
    onCancel();
  };

  const handleDiscard = async () => {
    try {
      await discardNarrativeDraft({ document_id: document.id });
    } catch {
      // draft may not exist — ignore
    }
    onCancel();
  };

  // ---- Save (commit) ----

  const commit = useCallback(async () => {
    setSaving(true);
    setMessage(undefined);
    const materialized = materializeCurrentDocument();
    try {
      const canonical = JSON.stringify(materialized);
      const saved = await saveNarrativeDocument({
        document_id: document.id,
        expected_revision: revision.current,
        schema_version: 1,
        canonical_json: canonical,
        operation_id: saveOpId.current,
      });
      revision.current = saved.revision;
      // Generate a new op ID for the next save attempt (revision advanced)
      saveOpId.current = operationId("narrative-save");
      setDirty(false);
      setStatus("Saved");
      onCommitted(saved);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("stale") ||
        msg.toLowerCase().includes("revision")
      ) {
        setMessage(
          "The canvas was saved elsewhere. Refresh to see the latest version. Your draft is preserved.",
        );
      } else {
        setMessage(
          "The canvas could not be saved. Your draft is preserved.",
        );
      }
      setStatus("Error");
      // Do NOT regenerate saveOpId — same op ID + same revision → idempotent retry
    } finally {
      setSaving(false);
    }
  }, [materializeCurrentDocument, document.id, onCommitted]);

  // ---- Auto-save draft (1 second debounce) ----

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      // Compute inside effect to avoid stale closure — materializeCurrentDocument
      // changes when history/activeBlockId change, but we can't include it in deps
      // without risking infinite loops. Compute locally instead.
      const h = history;
      let materialized: NarrativeDocument;
      if (activeBlockId !== null && activeContentRef.current !== null) {
        const content = activeContentRef.current;
        const blocks = h.current.scenes[0].blocks.map(b => {
          if (b.id === activeBlockId) {
            if (b.kind === "rich_text") return { ...b, content };
            if (b.kind === "callout") return { ...b, content };
          }
          return b;
        });
        materialized = {
          ...h.current,
          scenes: [{ ...h.current.scenes[0], blocks }],
        };
      } else {
        materialized = h.current;
      }
      const canonical = JSON.stringify(materialized);
      void saveNarrativeDraft({
        document_id: document.id,
        base_revision: revision.current,
        canonical_json: canonical,
      })
        .then(() => setStatus("Draft saved"))
        .catch(() => {
          setStatus("Error");
          setMessage(
            "Draft storage failed. Keep this editor open and try Save again.",
          );
        });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [dirty, history, activeBlockId, document.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Render ----

  return (
    <div className={styles.shell}>
      <h2>Narrative Canvas — Studio</h2>
      <div className={styles.actions}>
        <button
          className={styles.primary}
          onClick={() => void commit()}
          disabled={saving}
          type="button"
        >
          {saving ? "Saving…" : "Publish"}
        </button>
        <button
          className={styles.button}
          onClick={handleUndo}
          disabled={history.past.length === 0 || saving}
          type="button"
        >
          Undo
        </button>
        <button
          className={styles.button}
          onClick={handleRedo}
          disabled={history.future.length === 0 || saving}
          type="button"
        >
          Redo
        </button>
        <button
          className={styles.button}
          onClick={handleBack}
          type="button"
        >
          Back
        </button>
        <button
          className={styles.button}
          onClick={() => void handleDiscard()}
          type="button"
        >
          Discard &amp; close
        </button>
        <span className={styles.status} aria-live="polite">
          {status}
        </span>
      </div>

      {message && (
        <p role="alert" className={styles.status}>
          {message}
        </p>
      )}

      <label className={styles.fieldLabel} htmlFor="nc-title">
        Canvas title
      </label>
      <input
        id="nc-title"
        className={styles.fieldInput}
        value={doc.title}
        onChange={e => {
          applyStructural({ ...materializeCurrentDocument(), title: e.currentTarget.value });
        }}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleBlockDragEnd}
      >
        <SortableContext
          items={blockIds}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.blockList}>
            {scene.blocks.map((block, i) => (
              <SortableBlockEditor
                key={block.id}
                block={block}
                index={i}
                total={scene.blocks.length}
                isActive={activeBlockId === block.id}
                activeContentRef={activeContentRef}
                onActivate={() => activateBlock(block.id)}
                onUpdate={updated => updateBlock(i, updated)}
                onDelete={() => deleteBlock(i)}
                onMoveUp={() => moveBlock(i, i - 1)}
                onMoveDown={() => moveBlock(i, i + 1)}
                onDirty={markDirty}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className={styles.addBlockBar}>
        <span className={styles.studioBlockKind}>Add block:</span>
        <button
          className={styles.addBlockButton}
          onClick={() => addBlock("rich_text")}
          type="button"
        >
          Rich text
        </button>
        <button
          className={styles.addBlockButton}
          onClick={() => addBlock("metric")}
          type="button"
        >
          Metric
        </button>
        <button
          className={styles.addBlockButton}
          onClick={() => addBlock("image")}
          type="button"
        >
          Image
        </button>
        <button
          className={styles.addBlockButton}
          onClick={() => addBlock("callout")}
          type="button"
        >
          Callout
        </button>
        <button
          className={styles.addBlockButton}
          onClick={() => addBlock("timeline")}
          type="button"
        >
          Timeline
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility: determine whether a block has meaningful content
// ---------------------------------------------------------------------------

function isBlockEmpty(block: NarrativeBlock): boolean {
  switch (block.kind) {
    case "rich_text":
      return isRichTextEmpty(block.content);
    case "callout":
      return isRichTextEmpty(block.content);
    case "metric":
      return !block.label && !block.value && !block.unit && !block.description;
    case "image":
      return !block.assetId && !block.alt && !block.caption;
    case "timeline":
      return !block.title && block.items.length === 0;
    default:
      return false;
  }
}

function isRichTextEmpty(content: RichTextContent): boolean {
  function hasText(nodes: RichTextContent["content"] | undefined): boolean {
    if (!nodes) return false;
    return nodes.some(n => {
      if (n.type === "text" && n.text && n.text.trim()) return true;
      if (n.content) return hasText(n.content);
      return false;
    });
  }
  return !hasText(content.content);
}
