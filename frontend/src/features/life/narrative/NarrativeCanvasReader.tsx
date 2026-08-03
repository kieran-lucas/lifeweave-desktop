import { lazy, Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createNarrativeDocument,
  discardNarrativeDraft,
  getNarrativeDocument,
  recoverNarrativeDraft,
} from "../../../ipc/commands";
import type { NarrativeDocumentView } from "../../../ipc/generated/NarrativeDocumentView";
import { operationId, parseNarrative, isUnknownBlock } from "./schema";
import type { ParsedNarrativeDocument, ParsedNarrativeBlock, RichTextNode as RichTextNodeType } from "./schema";
import * as styles from "./NarrativeCanvas.css";
import { getDocumentAsset } from "../../../ipc/commands";

const NarrativeCanvasStudio = lazy(() => import("./NarrativeCanvasStudio"));

export const narrativeKey = (nodeId: string) => ["life", "narrative", nodeId] as const;

// ---------------------------------------------------------------------------
// Rich-text static renderer (no Tiptap)
// ---------------------------------------------------------------------------

function RichTextNode({ node, depth = 0 }: { node: RichTextNodeType; depth?: number }): React.ReactNode {
  if (depth > 32) return null;
  const children = node.content?.map((child, i) => <RichTextNode key={i} node={child} depth={depth + 1} />);
  switch (node.type) {
    case "text": {
      let el: React.ReactNode = node.text ?? "";
      for (const mark of [...(node.marks ?? [])].reverse()) {
        if (mark.type === "bold") el = <strong>{el}</strong>;
        else if (mark.type === "italic") el = <em>{el}</em>;
      }
      return el;
    }
    case "paragraph": return <p>{children}</p>;
    case "heading": {
      const level = Number(node.attrs?.["level"] ?? 2);
      return level === 1 ? <h1>{children}</h1> : level === 3 ? <h3>{children}</h3> : <h2>{children}</h2>;
    }
    case "bulletList": return <ul>{children}</ul>;
    case "orderedList": return <ol>{children}</ol>;
    case "listItem": return <li>{children}</li>;
    case "blockquote": return <blockquote>{children}</blockquote>;
    case "codeBlock": return <pre><code>{node.content?.map(c => c.text ?? "").join("")}</code></pre>;
    case "hardBreak": return <br />;
    default: return <span>{children}</span>;
  }
}

function RichTextReader({ content }: { content: { type: string; content?: RichTextNodeType[] } }) {
  return (
    <div className={styles.richText} aria-label="Rich text content">
      {content.content?.map((node, i) => <RichTextNode key={i} node={node} />)}
    </div>
  );
}

function NarrativeAssetImage({ assetId, alt }: { assetId: string; alt: string }) {
  const [source, setSource] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    void getDocumentAsset({ asset_id: assetId })
      .then(result => {
        if (!active) return;
        objectUrl = URL.createObjectURL(new Blob([new Uint8Array(result.bytes)], { type: result.asset.mime }));
        setSource(objectUrl);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assetId]);
  if (failed) return <div className={styles.missing} role="img" aria-label={`Missing image: ${alt || "Untitled"}`}>Image unavailable.</div>;
  if (!source) return <p className={styles.status} aria-live="polite">Loading image…</p>;
  return <img className={styles.image} src={source} alt={alt} loading="lazy" decoding="async" />;
}

function BlockReader({ block }: { block: ParsedNarrativeBlock }) {
  if (isUnknownBlock(block)) {
    return (
      <div className={styles.missing} role="note" aria-label="Unsupported block">
        This block type ({block.kind}) is not supported in this version.
      </div>
    );
  }
  switch (block.kind) {
    case "rich_text":
      return <RichTextReader content={block.content} />;
    case "metric":
      return (
        <div className={styles.metricBlock}>
          <div className={styles.metricLabel}>{block.label}</div>
          <div>
            <span className={styles.metricValue}>{block.value}</span>
            {block.unit && <span className={styles.metricUnit}>{block.unit}</span>}
          </div>
          {block.description && <div className={styles.metricDescription}>{block.description}</div>}
        </div>
      );
    case "image":
      return (
        <figure>
          <NarrativeAssetImage assetId={block.assetId} alt={block.alt} />
          {block.caption && <figcaption className={styles.imageCaption}>{block.caption}</figcaption>}
        </figure>
      );
    case "callout":
      return (
        <aside className={styles.calloutBlock} aria-label={`${block.variant} callout`}>
          <div className={styles.calloutVariant}>{block.variant}</div>
          <RichTextReader content={block.content} />
        </aside>
      );
    case "timeline":
      return (
        <div className={styles.timelineBlock}>
          <div className={styles.timelineHeading}>{block.title}</div>
          <ol className={styles.timelineList} aria-label={`Timeline: ${block.title}`}>
            {block.items.map(item => (
              <li key={item.id} className={styles.timelineItem}>
                <span className={styles.timelineItemLabel}>{item.label}</span>
                {item.description && <span className={styles.timelineItemDesc}>{item.description}</span>}
              </li>
            ))}
          </ol>
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Static reader view
// ---------------------------------------------------------------------------

function StaticCanvasView({ doc }: { doc: ParsedNarrativeDocument }) {
  const scene = doc.scenes[0];
  return (
    <article aria-labelledby="nc-canvas-title">
      <header>
        <h1 id="nc-canvas-title" className={styles.title}>{doc.title || "Untitled Canvas"}</h1>
      </header>
      {scene.title && (
        <section aria-labelledby="nc-scene-title">
          <h2 id="nc-scene-title" className={styles.sceneTitle}>{scene.title}</h2>
          <div className={styles.blockList}>
            {scene.blocks.map(block => <BlockReader key={isUnknownBlock(block) ? block.uiKey : block.id} block={block} />)}
          </div>
        </section>
      )}
      {!scene.title && (
        <div className={styles.blockList}>
          {scene.blocks.map(block => <BlockReader key={isUnknownBlock(block) ? block.uiKey : block.id} block={block} />)}
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main reader component
// ---------------------------------------------------------------------------

export function NarrativeCanvasReader({ nodeId }: { nodeId: string }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string>();

  const query = useQuery({
    queryKey: narrativeKey(nodeId),
    queryFn: () => getNarrativeDocument({ life_node_id: nodeId }),
  });

  const create = useMutation({
    mutationFn: () =>
      createNarrativeDocument({
        life_node_id: nodeId,
        operation_id: operationId("narrative-create"),
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: narrativeKey(nodeId) }),
  });

  if (query.isLoading) {
    return (
      <div className={styles.shell}>
        <h2>Narrative Canvas</h2>
        <p className={styles.status} aria-live="polite">Loading canvas…</p>
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className={styles.shell}>
        <h2>Narrative Canvas</h2>
        <div className={styles.missing} role="alert">This canvas could not be opened.</div>
      </div>
    );
  }

  const projection = query.data;
  const document = projection.document;

  const committed = (value: NarrativeDocumentView) => {
    client.setQueryData(narrativeKey(nodeId), {
      ...projection,
      document: value,
      draft_state: "none",
      draft_json: null,
      draft_base_revision: null,
    });
  };

  if (!document) {
    return (
      <div className={styles.shell}>
        <h2>Narrative Canvas</h2>
        <p>This leaf has no Narrative Canvas yet.</p>
        <div className={styles.actions}>
          <button
            className={styles.primary}
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            Create Narrative Canvas
          </button>
        </div>
        {create.isError && <p role="alert">The canvas could not be created.</p>}
      </div>
    );
  }

  if (editing) {
    return (
      <Suspense fallback={<p className={styles.status}>Loading studio…</p>}>
        <NarrativeCanvasStudio
          document={document}
          initialJson={projection.draft_state === "available" ? projection.draft_json : null}
          onCommitted={committed}
          onCancel={() => setEditing(false)}
        />
      </Suspense>
    );
  }

  let parsed: ParsedNarrativeDocument | null = null;
  try {
    parsed = parseNarrative(document.canonical_json);
  } catch {
    return (
      <div className={styles.shell}>
        <div className={styles.missing} role="alert">
          This canvas contains unsupported content. Open Edit to repair it.
        </div>
      </div>
    );
  }

  const recover = async () => {
    try {
      const value = await recoverNarrativeDraft({ document_id: document.id });
      committed(value);
      setNotice("Draft recovered and committed.");
    } catch {
      setNotice("The draft conflicts with a newer revision. Both copies remain preserved.");
    }
  };

  const discard = async () => {
    await discardNarrativeDraft({ document_id: document.id });
    await client.invalidateQueries({ queryKey: narrativeKey(nodeId) });
    setNotice("Recoverable draft discarded.");
  };

  return (
    <div className={styles.shell}>
      <h2>Narrative Canvas</h2>
      {projection.draft_state !== "none" && (
        <section className={styles.recovery} aria-labelledby="nc-recovery-title">
          <h3 id="nc-recovery-title">Recoverable draft</h3>
          <p>
            {projection.draft_state === "conflict"
              ? "This draft is based on an older revision. The current canvas remains safe."
              : "An interrupted editing draft is available."}
          </p>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => void recover()}>Recover draft</button>
            <button className={styles.button} onClick={() => void discard()}>Discard draft</button>
          </div>
        </section>
      )}
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => setEditing(true)}>Edit canvas</button>
      </div>
      {notice && <p role="status" aria-live="polite">{notice}</p>}
      <StaticCanvasView doc={parsed} />
    </div>
  );
}
