import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import type { ReaderDocumentView } from "../../../ipc/generated/ReaderDocumentView";
import type { NarrativeDocumentView } from "../../../ipc/generated/NarrativeDocumentView";
import { createNarrativeDocument, createReaderDocument, discardReaderDraft, exportReaderMarkdown, getNarrativeDocument, getReaderDocument, importReaderMarkdown, previewNarrativeMarkdown, recoverReaderDraft } from "../../../ipc/commands";
import { NarrativeMarkdownImportDialog } from "../narrative/NarrativeMarkdownImportDialog";
import { operationId, parseDocument } from "./schema";
import { buildDocumentOutline } from "./outline";
import { DocumentOutline } from "./DocumentOutline";
import { StaticDocument } from "./StaticDocument";
import * as styles from "./BasicLeafDocument.css";
import { NarrativeCanvasReader, narrativeKey } from "../narrative/NarrativeCanvasReader";
import { NarrativeTemplateChooser } from "../narrative/NarrativeTemplateChooser";
import { PortablePackageControls } from "../portable/PortablePackageControls";
import { invalidateLifeLinkLifecycle } from "../links/lifeLinkQueries";
import { LoadingRow } from "../../../design-system/primitives/States";

const BasicLeafEditor = lazy(() => import("./BasicLeafEditor"));
export const documentKey = (nodeId: string) => ["life", "document", nodeId] as const;


type MarkdownImportPending = {
  originalName: string;
  markdown: string;
  preview: import("../../../ipc/generated/NarrativeMarkdownPreview").NarrativeMarkdownPreview;
};

export function BasicLeafReader({ nodeId }: { nodeId: string }) {
  const reducedMotion = useReducedMotion() ?? false;
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [markdownImport, setMarkdownImport] = useState<MarkdownImportPending | null>(null);
  const query = useQuery({ queryKey: documentKey(nodeId), queryFn: () => getReaderDocument({ life_node_id: nodeId }) });
  const narrativeQuery = useQuery({ queryKey: narrativeKey(nodeId), queryFn: () => getNarrativeDocument({ life_node_id: nodeId }) });
  const create = useMutation({
    mutationFn: () => createReaderDocument({ life_node_id: nodeId, operation_id: operationId("document-create") }),
    onSuccess: () => void Promise.all([
      client.invalidateQueries({ queryKey: documentKey(nodeId) }),
      invalidateLifeLinkLifecycle(client),
    ]),
  });

  if (query.isLoading || narrativeQuery.isLoading) {
    return <div className={styles.shell}><h2>Reader</h2><LoadingRow label="Loading document…" /></div>;
  }
  if (query.isError || !query.data) {
    return <div className={styles.shell}><h2>Reader</h2><div className={styles.missing} role="alert">This document could not be opened. Life navigation is still available.</div></div>;
  }

  // Conflict: both a Basic Leaf document and a Canvas document exist
  if (query.data.document && narrativeQuery.data?.document) {
    return (
      <div className={styles.shell}>
        <h2>Reader</h2>
        <div role="alert" className={styles.missing}>
          This leaf has both a Basic Leaf document and a Narrative Canvas. This state is not expected and requires manual resolution. Contact support or restore from backup.
        </div>
      </div>
    );
  }

  // Canvas only (no Basic Leaf document)
  if (!query.data.document && narrativeQuery.data?.document) {
    return <NarrativeCanvasReader nodeId={nodeId} />;
  }

  const canShowMarkdownImport =
    !query.isError &&
    !narrativeQuery.isError &&
    query.isFetched &&
    narrativeQuery.isFetched &&
    !query.data.document &&
    !narrativeQuery.data?.document;

  const handleMarkdownImportFile = async (file?: File) => {
    if (!file) return;
    try {
      const bytes = await file.arrayBuffer();
      const markdown = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const preview = await previewNarrativeMarkdown({ original_name: file.name, markdown });
      setMarkdownImport({ originalName: file.name, markdown, preview });
    } catch {
      setNotice("Could not read the Markdown file.");
    }
  };

  const handleMarkdownImportConfirmed = (doc: NarrativeDocumentView) => {
    setMarkdownImport(null);
    void client.invalidateQueries({ queryKey: narrativeKey(nodeId) });
    void client.invalidateQueries({ queryKey: documentKey(nodeId) });
    void invalidateLifeLinkLifecycle(client);
    setNotice(`Markdown imported as Narrative Canvas "${doc.life_node_id}".`);
  };

  const projection = query.data;
  const document = projection.document;
  if (!document) {
    return (
      <div className={styles.shell}>
        <h2>Reader</h2>
        <p>This leaf has no document yet.</p>
        {canShowMarkdownImport && <PortablePackageControls nodeId={nodeId} />}
        <div className={styles.actions}>
          <button className={styles.primary} disabled={create.isPending} onClick={() => create.mutate()}>Create Basic Leaf document</button>
          {!narrativeQuery.isError && <NarrativeTemplateChooser nodeId={nodeId} />}
          {canShowMarkdownImport && (
            <label className={styles.fileLabel}>Import Markdown as Canvas
              <input
                className={styles.hiddenFile}
                type="file"
                accept=".md,text/markdown,text/plain"
                onChange={event => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  void handleMarkdownImportFile(file);
                }}
              />
            </label>
          )}
        </div>
        {create.isError && <p role="alert">The document could not be created.</p>}
        {notice && <p role="status" aria-live="polite">{notice}</p>}
        {markdownImport && (
          <NarrativeMarkdownImportDialog
            nodeId={nodeId}
            originalName={markdownImport.originalName}
            markdown={markdownImport.markdown}
            preview={markdownImport.preview}
            onConfirmed={handleMarkdownImportConfirmed}
            onCancel={() => setMarkdownImport(null)}
          />
        )}
      </div>
    );
  }

  const committed = (value: ReaderDocumentView) => {
    client.setQueryData(documentKey(nodeId), { ...projection, document: value, draft_state: "none", draft_json: null, draft_base_revision: null });
    void invalidateLifeLinkLifecycle(client);
  };

  if (editing) {
    return (
      <Suspense fallback={<LoadingRow label="Loading focused editor…" />}>
        <BasicLeafEditor document={document} initialJson={projection.draft_state === "available" ? projection.draft_json : null} onCommitted={committed} onCancel={() => setEditing(false)} />
      </Suspense>
    );
  }

  let parsed;
  try { parsed = parseDocument(document.canonical_json); }
  catch { return <div className={styles.missing} role="alert">This document contains unsupported content. Open Edit to repair it.</div>; }

  const recover = async () => {
    try {
      const value = await recoverReaderDraft({ document_id: document.id });
      committed(value);
      setNotice("Draft recovered and committed.");
    } catch {
      setNotice("The draft conflicts with a newer committed revision. Both copies remain preserved.");
    }
  };

  const discard = async () => {
    await discardReaderDraft({ document_id: document.id });
    await client.invalidateQueries({ queryKey: documentKey(nodeId) });
    setNotice("Recoverable draft discarded.");
  };

  const importMarkdown = async (file?: File) => {
    if (!file) return;
    try {
      const { normalizeMarkdown } = await import("./markdown");
      const normalized = await normalizeMarkdown(await file.text());
      const value = await importReaderMarkdown({ document_id: document.id, expected_revision: document.revision, markdown: normalized, operation_id: operationId("markdown-import") });
      committed(value);
      setNotice("Markdown imported. Unsupported constructs were rejected before commit.");
    } catch {
      setNotice("Markdown import failed; the committed document was not changed.");
    }
  };

  const exportMarkdown = async () => {
    try {
      const result = await exportReaderMarkdown({ document_id: document.id });
      const { normalizeMarkdown } = await import("./markdown");
      const normalized = await normalizeMarkdown(result.markdown);
      const url = URL.createObjectURL(new Blob([normalized], { type: "text/markdown;charset=utf-8" }));
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = result.file_name;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("Markdown export prepared.");
    } catch {
      setNotice("Markdown export failed without changing the document.");
    }
  };

  const outline = buildDocumentOutline(parsed);
  const showOutline = outline.entries.length >= 2;

  return (
    <div className={styles.shell}>
      <h2>Reader</h2>
      {projection.draft_state !== "none" && (
        <section className={styles.recovery} aria-labelledby="recovery-title">
          <h2 id="recovery-title">Recoverable draft</h2>
          <p>{projection.draft_state === "conflict" ? "This draft is based on an older revision. The current document remains safe." : "An interrupted editing draft is available."}</p>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => void recover()}>Recover draft</button>
            <button className={styles.button} onClick={() => void discard()}>Discard draft</button>
          </div>
        </section>
      )}
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => setEditing(true)}>Edit document</button>
        <label className={styles.fileLabel}>Import Markdown
          <input className={styles.hiddenFile} type="file" accept="text/markdown,.md" onChange={event => void importMarkdown(event.currentTarget.files?.[0])} />
        </label>
        <button className={styles.button} onClick={() => void exportMarkdown()}>Export Markdown</button>
      </div>
      <PortablePackageControls nodeId={nodeId} documentKind="basic_leaf" documentId={document.id} hasDraft={projection.draft_state !== "none"} />
      {notice && <p role="status" aria-live="polite">{notice}</p>}
      <div className={styles.outlineContainer}>
        {showOutline
          ? <div className={styles.outlineGrid}><div className={styles.outlineColumn}><DocumentOutline outline={outline} reducedMotion={reducedMotion} /></div><StaticDocument document={parsed} /></div>
          : <StaticDocument document={parsed} />}
      </div>
    </div>
  );
}
