import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { NarrativeDocumentView } from "../../../ipc/generated/NarrativeDocumentView";
import { discardNarrativeDraft, saveNarrativeDocument, saveNarrativeDraft } from "../../../ipc/commands";
import { emptyRichText, operationId, parseNarrative } from "./schema";
import type { NarrativeBlock, NarrativeDocument, RichTextContent } from "./schema";
import * as styles from "./NarrativeCanvas.css";

// ---------------------------------------------------------------------------
// Local undo/redo history (max 50 snapshots)
// ---------------------------------------------------------------------------

type HistoryState = { past: NarrativeDocument[]; current: NarrativeDocument; future: NarrativeDocument[] };

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
// Block editors
// ---------------------------------------------------------------------------

const tiptapExtensions = [StarterKit.configure({ heading: { levels: [2, 3] }, horizontalRule: false, strike: false })];

function RichTextBlockEditor({
  block,
  onChange,
}: {
  block: Extract<NarrativeBlock, { kind: "rich_text" }>;
  onChange: (content: RichTextContent) => void;
}) {
  const editor = useEditor({
    extensions: tiptapExtensions,
    content: block.content,
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichTextContent),
  });
  return <div className={styles.editorWrap}><EditorContent editor={editor} /></div>;
}

function MetricBlockEditor({
  block,
  onChange,
}: {
  block: Extract<NarrativeBlock, { kind: "metric" }>;
  onChange: (b: Extract<NarrativeBlock, { kind: "metric" }>) => void;
}) {
  return (
    <div>
      <label className={styles.fieldLabel} htmlFor={`metric-label-${block.id}`}>Label</label>
      <input id={`metric-label-${block.id}`} className={styles.fieldInput} value={block.label} onChange={e => onChange({ ...block, label: e.currentTarget.value })} />
      <label className={styles.fieldLabel} htmlFor={`metric-value-${block.id}`}>Value</label>
      <input id={`metric-value-${block.id}`} className={styles.fieldInput} value={block.value} onChange={e => onChange({ ...block, value: e.currentTarget.value })} />
      <label className={styles.fieldLabel} htmlFor={`metric-unit-${block.id}`}>Unit</label>
      <input id={`metric-unit-${block.id}`} className={styles.fieldInput} value={block.unit} onChange={e => onChange({ ...block, unit: e.currentTarget.value })} />
      <label className={styles.fieldLabel} htmlFor={`metric-desc-${block.id}`}>Description</label>
      <textarea id={`metric-desc-${block.id}`} className={styles.fieldTextarea} value={block.description} onChange={e => onChange({ ...block, description: e.currentTarget.value })} />
    </div>
  );
}

function ImageBlockEditor({
  block,
  onChange,
}: {
  block: Extract<NarrativeBlock, { kind: "image" }>;
  onChange: (b: Extract<NarrativeBlock, { kind: "image" }>) => void;
}) {
  return (
    <div>
      <label className={styles.fieldLabel} htmlFor={`img-assetid-${block.id}`}>Asset ID</label>
      <input id={`img-assetid-${block.id}`} className={styles.fieldInput} value={block.assetId} onChange={e => onChange({ ...block, assetId: e.currentTarget.value })} />
      <label className={styles.fieldLabel} htmlFor={`img-alt-${block.id}`}>Alt text</label>
      <input id={`img-alt-${block.id}`} className={styles.fieldInput} value={block.alt} onChange={e => onChange({ ...block, alt: e.currentTarget.value })} />
      <label className={styles.fieldLabel} htmlFor={`img-caption-${block.id}`}>Caption</label>
      <input id={`img-caption-${block.id}`} className={styles.fieldInput} value={block.caption} onChange={e => onChange({ ...block, caption: e.currentTarget.value })} />
    </div>
  );
}

function CalloutBlockEditor({
  block,
  onChange,
}: {
  block: Extract<NarrativeBlock, { kind: "callout" }>;
  onChange: (b: Extract<NarrativeBlock, { kind: "callout" }>) => void;
}) {
  const editor = useEditor({
    extensions: tiptapExtensions,
    content: block.content,
    onUpdate: ({ editor: e }) => onChange({ ...block, content: e.getJSON() as RichTextContent }),
  });
  return (
    <div>
      <label className={styles.fieldLabel} htmlFor={`callout-variant-${block.id}`}>Variant</label>
      <select id={`callout-variant-${block.id}`} className={styles.fieldInput} value={block.variant} onChange={e => onChange({ ...block, variant: e.currentTarget.value as "note" | "warning" | "tip" })}>
        <option value="note">Note</option>
        <option value="warning">Warning</option>
        <option value="tip">Tip</option>
      </select>
      <div className={styles.fieldLabel}>Content</div>
      <div className={styles.editorWrap}><EditorContent editor={editor} /></div>
    </div>
  );
}

function TimelineBlockEditor({
  block,
  onChange,
}: {
  block: Extract<NarrativeBlock, { kind: "timeline" }>;
  onChange: (b: Extract<NarrativeBlock, { kind: "timeline" }>) => void;
}) {
  return (
    <div>
      <label className={styles.fieldLabel} htmlFor={`tl-title-${block.id}`}>Timeline heading</label>
      <input id={`tl-title-${block.id}`} className={styles.fieldInput} value={block.title} onChange={e => onChange({ ...block, title: e.currentTarget.value })} />
      <div className={styles.fieldLabel}>Items</div>
      {block.items.map((item, i) => (
        <div key={item.id} className={styles.studioBlock}>
          <input aria-label={`Item ${i + 1} label`} className={styles.fieldInput} value={item.label} onChange={e => onChange({ ...block, items: block.items.map((it, j) => j === i ? { ...it, label: e.currentTarget.value } : it) })} />
          <input aria-label={`Item ${i + 1} description`} className={styles.fieldInput} value={item.description} onChange={e => onChange({ ...block, items: block.items.map((it, j) => j === i ? { ...it, description: e.currentTarget.value } : it) })} />
          <button className={styles.button} onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}>Remove item</button>
        </div>
      ))}
      <button
        className={styles.addBlockButton}
        onClick={() => onChange({ ...block, items: [...block.items, { id: crypto.randomUUID(), label: "", description: "" }] })}
      >
        Add item
      </button>
    </div>
  );
}

function BlockEditor({
  block,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  block: NarrativeBlock;
  index: number;
  total: number;
  onUpdate: (block: NarrativeBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className={styles.studioBlock}>
      <div className={styles.studioBlockHeader}>
        <span className={styles.studioBlockKind}>{block.kind.replace("_", " ")}</span>
        <div className={styles.studioBlockActions}>
          <button className={styles.button} onClick={onMoveUp} disabled={index === 0} aria-label="Move block up">↑</button>
          <button className={styles.button} onClick={onMoveDown} disabled={index === total - 1} aria-label="Move block down">↓</button>
          <button className={styles.button} onClick={onDelete} aria-label="Delete block">✕</button>
        </div>
      </div>
      {block.kind === "rich_text" && (
        <RichTextBlockEditor block={block} onChange={content => onUpdate({ ...block, content })} />
      )}
      {block.kind === "metric" && (
        <MetricBlockEditor block={block} onChange={onUpdate} />
      )}
      {block.kind === "image" && (
        <ImageBlockEditor block={block} onChange={onUpdate} />
      )}
      {block.kind === "callout" && (
        <CalloutBlockEditor block={block} onChange={onUpdate} />
      )}
      {block.kind === "timeline" && (
        <TimelineBlockEditor block={block} onChange={onUpdate} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Studio
// ---------------------------------------------------------------------------

type Props = {
  document: NarrativeDocumentView;
  initialJson: string | null | undefined;
  onCommitted: (value: NarrativeDocumentView) => void;
  onCancel: () => void;
};

export default function NarrativeCanvasStudio({ document, initialJson, onCommitted, onCancel }: Props) {
  const revision = useRef(document.revision);
  const [history, setHistory] = useState<HistoryState>(() => {
    try {
      return makeHistory(parseNarrative(initialJson ?? document.canonical_json));
    } catch {
      return makeHistory(parseNarrative(document.canonical_json));
    }
  });
  const [status, setStatus] = useState("Saved");
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string>();

  const doc = history.current;
  const scene = doc.scenes[0];

  const applyDoc = (next: NarrativeDocument) => {
    setHistory(h => push(h, next));
    setDirty(true);
    setStatus("Unsaved changes");
  };

  const updateBlock = (blockIndex: number, block: NarrativeBlock) => {
    const newBlocks = scene.blocks.map((b, i) => (i === blockIndex ? block : b));
    applyDoc({ ...doc, scenes: [{ ...scene, blocks: newBlocks }] });
  };

  const deleteBlock = (blockIndex: number) => {
    applyDoc({ ...doc, scenes: [{ ...scene, blocks: scene.blocks.filter((_, i) => i !== blockIndex) }] });
  };

  const moveBlock = (from: number, to: number) => {
    const blocks = [...scene.blocks];
    const [item] = blocks.splice(from, 1);
    blocks.splice(to, 0, item!);
    applyDoc({ ...doc, scenes: [{ ...scene, blocks }] });
  };

  const addBlock = (kind: NarrativeBlock["kind"]) => {
    const id = crypto.randomUUID();
    let block: NarrativeBlock;
    switch (kind) {
      case "rich_text": block = { kind: "rich_text", id, content: emptyRichText() }; break;
      case "metric": block = { kind: "metric", id, label: "", value: "", unit: "", description: "" }; break;
      case "image": block = { kind: "image", id, assetId: "", alt: "", caption: "" }; break;
      case "callout": block = { kind: "callout", id, variant: "note", content: emptyRichText() }; break;
      case "timeline": block = { kind: "timeline", id, title: "", items: [] }; break;
    }
    applyDoc({ ...doc, scenes: [{ ...scene, blocks: [...scene.blocks, block] }] });
  };

  const commit = async () => {
    setStatus("Saving canvas"); setMessage(undefined);
    try {
      const canonical = JSON.stringify(doc);
      const saved = await saveNarrativeDocument({
        document_id: document.id,
        expected_revision: revision.current,
        schema_version: 1,
        canonical_json: canonical,
        operation_id: operationId("narrative-save"),
      });
      revision.current = saved.revision;
      setDirty(false);
      setStatus("Saved");
      onCommitted(saved);
      return true;
    } catch {
      setStatus("Error / recovery required");
      setMessage("The canvas could not be committed. Your recoverable draft is preserved.");
      return false;
    }
  };

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      const canonical = JSON.stringify(doc);
      void saveNarrativeDraft({
        document_id: document.id,
        base_revision: revision.current,
        canonical_json: canonical,
      })
        .then(() => setStatus("Draft saved"))
        .catch(() => {
          setStatus("Error / recovery required");
          setMessage("Draft storage failed. Keep this editor open and try Save again.");
        });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [dirty, doc, document.id]);

  const handleDiscard = async () => {
    try {
      await discardNarrativeDraft({ document_id: document.id });
    } catch { /* draft may not exist */ }
    onCancel();
  };

  return (
    <div className={styles.shell}>
      <h2>Narrative Canvas — Studio</h2>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => void commit()}>Publish</button>
        <button className={styles.button} onClick={() => setHistory(h => undo(h))} disabled={history.past.length === 0}>Undo</button>
        <button className={styles.button} onClick={() => setHistory(h => redo(h))} disabled={history.future.length === 0}>Redo</button>
        <button className={styles.button} onClick={() => void handleDiscard()}>Discard &amp; close</button>
        <span className={styles.status} aria-live="polite">{status}</span>
      </div>
      {message && <p role="alert">{message}</p>}
      <label className={styles.fieldLabel} htmlFor="nc-title">Canvas title</label>
      <input id="nc-title" className={styles.fieldInput} value={doc.title} onChange={e => applyDoc({ ...doc, title: e.currentTarget.value })} />
      <div className={styles.blockList}>
        {scene.blocks.map((block, i) => (
          <BlockEditor
            key={block.id}
            block={block}
            index={i}
            total={scene.blocks.length}
            onUpdate={b => updateBlock(i, b)}
            onDelete={() => deleteBlock(i)}
            onMoveUp={() => moveBlock(i, i - 1)}
            onMoveDown={() => moveBlock(i, i + 1)}
          />
        ))}
      </div>
      <div className={styles.addBlockBar}>
        <span className={styles.studioBlockKind}>Add block:</span>
        <button className={styles.addBlockButton} onClick={() => addBlock("rich_text")}>Rich text</button>
        <button className={styles.addBlockButton} onClick={() => addBlock("metric")}>Metric</button>
        <button className={styles.addBlockButton} onClick={() => addBlock("image")}>Image</button>
        <button className={styles.addBlockButton} onClick={() => addBlock("callout")}>Callout</button>
        <button className={styles.addBlockButton} onClick={() => addBlock("timeline")}>Timeline</button>
      </div>
    </div>
  );
}
