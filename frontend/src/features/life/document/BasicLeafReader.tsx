import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import type { ReaderDocumentView } from "../../../ipc/generated/ReaderDocumentView";
import type { NarrativeDocumentView } from "../../../ipc/generated/NarrativeDocumentView";
import type { MarkdownImportDiagnostic } from "../../../ipc/generated/MarkdownImportDiagnostic";
import { createReaderDocument, discardReaderDraft, exportReaderMarkdown, getNarrativeDocument, getReaderDocument, importReaderMarkdown, previewNarrativeMarkdown, recoverReaderDraft } from "../../../ipc/commands";
import { NarrativeMarkdownImportDialog } from "../narrative/NarrativeMarkdownImportDialog";
import { operationId, parseDocument } from "./schema";
import { buildDocumentOutline } from "./outline";
import { repeatsLeafIdentity, type LeafIdentity } from "./leafIdentity";
import { DocumentOutline } from "./DocumentOutline";
import { StaticDocument } from "./StaticDocument";
import * as styles from "./BasicLeafDocument.css";
import { Icon, iconEdit, iconMore } from "../../../design-system/visual/icons";
import { NarrativeCanvasReader, narrativeKey } from "../narrative/NarrativeCanvasReader";
import { NarrativeTemplateChooser } from "../narrative/NarrativeTemplateChooser";
import { PortablePackageControls } from "../portable/PortablePackageControls";
import { invalidateLifeLinkLifecycle } from "../links/lifeLinkQueries";
import { LoadingRow } from "../../../design-system/primitives/States";

const BasicLeafEditor = lazy(() => import("./BasicLeafEditor"));
export const documentKey = (nodeId: string) => ["life", "document", nodeId] as const;

function importErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    const code = String(error.code);
    const message = String(error.message);
    if (code === "Validation" && message.length > 0) return message;
  }
  if (error instanceof TypeError) return "The file is not valid UTF-8 Markdown.";
  return fallback;
}


type MarkdownImportPending = {
  originalName: string;
  markdown: string;
  preview: import("../../../ipc/generated/NarrativeMarkdownPreview").NarrativeMarkdownPreview;
};

function AvailabilityReporter({
  available,
  onChange,
}: {
  available: boolean;
  onChange: ((available: boolean) => void) | undefined;
}) {
  useEffect(() => {
    onChange?.(available);
    return () => onChange?.(false);
  }, [available, onChange]);
  return null;
}

export function BasicLeafReader({
  nodeId,
  identity,
  commandSlot,
  outlineVisible = true,
  onOutlineAvailabilityChange,
  onOpenInTree,
}: {
  nodeId: string;
  /** What the Leaf header already shows, so the document does not repeat it. */
  identity?: LeafIdentity;
  /** The Leaf header's top-right corner. The commands render in place when there is none. */
  commandSlot?: HTMLElement | null;
  outlineVisible?: boolean;
  onOutlineAvailabilityChange?: (available: boolean) => void;
  onOpenInTree?: () => void;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [markdownDiagnostics, setMarkdownDiagnostics] = useState<MarkdownImportDiagnostic[]>([]);
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
    } catch (error) {
      setNotice(`Markdown preview failed: ${importErrorMessage(error, "Could not read or validate the Markdown file.")}`);
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
      const bytes = await file.arrayBuffer();
      const markdown = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const result = await importReaderMarkdown({ document_id: document.id, expected_revision: document.revision, markdown, operation_id: operationId("markdown-import") });
      committed(result.document);
      setMarkdownDiagnostics(result.diagnostics);
      setNotice(result.diagnostics.length === 0
        ? "Markdown imported with supported formatting preserved."
        : `Markdown imported with ${result.diagnostics.length} documented fallback${result.diagnostics.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMarkdownDiagnostics([]);
      setNotice(`Markdown import rejected: ${importErrorMessage(error, "The file could not be imported.")} The committed document was not changed.`);
    }
  };

  const exportMarkdown = async () => {
    try {
      const result = await exportReaderMarkdown({ document_id: document.id });
      const url = URL.createObjectURL(new Blob([result.markdown], { type: "text/markdown;charset=utf-8" }));
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

  // The Leaf header above the document already draws the leaf's name, so an authored title line
  // that only repeats it is left out of both the rendered document and its contents list.
  const skipLeadingHeading = repeatsLeafIdentity(parsed, identity);
  const full = buildDocumentOutline(parsed);
  const outline = skipLeadingHeading
    ? { ...full, entries: full.entries.filter(entry => entry.sourceIndex !== 0) }
    : full;
  const showOutline = outline.entries.length >= 2;

  /*
   * The leaf's two controls: one explicit Edit, and everything else behind one quiet overflow.
   * They belong in the Leaf header's top-right corner, so they are rendered into the slot the
   * header exposes. The Reader keeps ownership — it is the only thing that knows a document is
   * there to edit — and falls back to rendering them in place if the header is not mounted.
   */
  const commands = (
    <div className={styles.documentCommands}>
      <button className={styles.editCommand} onClick={() => setEditing(true)}>
        <Icon d={iconEdit} size={15} />
        Edit
      </button>
      <details className={styles.documentOptions}>
        <summary aria-label="More leaf actions">
          <Icon d={iconMore} size={17} />
        </summary>
        <div className={styles.optionsPanel}>
          <div className={styles.actions}>
            <label className={styles.fileLabel}>Import Markdown
              <input className={styles.hiddenFile} type="file" accept="text/markdown,.md" onChange={event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                void importMarkdown(file);
              }} />
            </label>
            <button className={styles.button} onClick={() => void exportMarkdown()}>Export Markdown</button>
            {onOpenInTree && <button className={styles.button} onClick={onOpenInTree}>Open in Life tree</button>}
          </div>
          <PortablePackageControls nodeId={nodeId} documentKind="basic_leaf" documentId={document.id} hasDraft={projection.draft_state !== "none"} />
        </div>
      </details>
    </div>
  );

  return (
    <div className={styles.shell}>
      <AvailabilityReporter available={showOutline} onChange={onOutlineAvailabilityChange} />
      {projection.draft_state !== "none" && (
        <section className={styles.recovery} aria-labelledby="recovery-title">
          <h2 id="recovery-title">Recoverable draft</h2>
          <p>{projection.draft_state === "conflict" ? "This draft is based on an older revision. The current document remains safe." : "An interrupted editing draft is available."}</p>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => void recover()}>Recover draft</button>
            <button className={styles.destructive} onClick={() => void discard()}>Discard draft</button>
          </div>
        </section>
      )}
      {commandSlot ? createPortal(commands, commandSlot) : commands}
      {notice && <p role="status" aria-live="polite">{notice}</p>}
      {markdownDiagnostics.length > 0 && (
        <ul aria-label="Markdown import fallbacks">
          {markdownDiagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.kind}-${diagnostic.line}-${diagnostic.column}-${index}`}>
              Line {diagnostic.line}, column {diagnostic.column}: {diagnostic.message} {diagnostic.fallback}
            </li>
          ))}
        </ul>
      )}
      <div className={styles.outlineContainer}>
        {showOutline && outlineVisible
          ? <div className={styles.outlineGrid}><div className={styles.outlineColumn}><DocumentOutline id="life-document-outline" outline={outline} reducedMotion={reducedMotion} /></div><StaticDocument document={parsed} skipLeadingHeading={skipLeadingHeading} /></div>
          : <StaticDocument document={parsed} skipLeadingHeading={skipLeadingHeading} />}
      </div>
    </div>
  );
}
