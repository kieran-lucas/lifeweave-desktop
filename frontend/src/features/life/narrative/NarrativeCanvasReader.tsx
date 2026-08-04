import { lazy, Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createNarrativeDocument,
  discardNarrativeDraft,
  getNarrativeDocument,
  recoverNarrativeDraft,
} from "../../../ipc/commands";
import { NarrativeMarkdownExportButton } from "./NarrativeMarkdownExportButton";
import type { NarrativeDocumentView } from "../../../ipc/generated/NarrativeDocumentView";
import { operationId, parseNarrative, isUnknownBlock } from "./schema";
import type { ParsedNarrativeDocument, ParsedNarrativeBlock } from "./schema";
import { parseDocument } from "../document/schema";
import { StaticDocument } from "../document/StaticDocument";
import * as styles from "./NarrativeCanvas.css";
import { getDocumentAsset } from "../../../ipc/commands";
import { NarrativeVisualWorld } from "./NarrativeVisualWorld";
import { PortablePackageControls } from "../portable/PortablePackageControls";

const NarrativeCanvasStudio = lazy(() => import("./NarrativeCanvasStudio"));

export const narrativeKey = (nodeId: string) => ["life", "narrative", nodeId] as const;

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
    case "rich_text": {
      let parsed;
      try {
        parsed = parseDocument(JSON.stringify(block.content));
      } catch {
        return (
          <div className={styles.missing} role="note" aria-label="Unsupported text island">
            This text block contains unsupported content.
          </div>
        );
      }
      return <StaticDocument document={parsed} />;
    }
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
    case "callout": {
      let parsedContent;
      try {
        parsedContent = parseDocument(JSON.stringify(block.content));
      } catch {
        return (
          <aside className={styles.calloutBlock} aria-label={`${block.variant} callout`}>
            <div className={styles.calloutVariant}>{block.variant}</div>
            <div className={styles.missing} role="note">This callout contains unsupported content.</div>
          </aside>
        );
      }
      return (
        <aside className={styles.calloutBlock} aria-label={`${block.variant} callout`}>
          <div className={styles.calloutVariant}>{block.variant}</div>
          <StaticDocument document={parsedContent} />
        </aside>
      );
    }
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
  return (
    <NarrativeVisualWorld id={doc.visualWorldId}><article aria-labelledby="nc-canvas-title">
      <header>
        <h1 id="nc-canvas-title" className={styles.title}>{doc.title || "Untitled Canvas"}</h1>
      </header>
      {doc.scenes.map((scene, i) => (
        <section key={scene.id} aria-labelledby={`nc-scene-title-${scene.id}`}>
          <h2
            id={`nc-scene-title-${scene.id}`}
            className={scene.title ? styles.sceneTitle : styles.srOnly}
          >
            {scene.title || `Scene ${i + 1}`}
          </h2>
          <div className={styles.blockList}>
            {scene.blocks.map(block => (
              <BlockReader key={isUnknownBlock(block) ? block.uiKey : block.id} block={block} />
            ))}
          </div>
        </section>
      ))}
    </article></NarrativeVisualWorld>
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
        template_id: "knowledge_dossier",
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
        <NarrativeMarkdownExportButton documentId={document.id} />
      </div>
      <PortablePackageControls nodeId={nodeId} documentKind="narrative_canvas" documentId={document.id} hasDraft={projection.draft_state !== "none"} />
      {notice && <p role="status" aria-live="polite">{notice}</p>}
      <StaticCanvasView doc={parsed} />
    </div>
  );
}
