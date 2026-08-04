import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PortableDocumentKind } from "../../../ipc/generated/PortableDocumentKind";
import type { PortablePackageImportPreview } from "../../../ipc/generated/PortablePackageImportPreview";
import { confirmPortablePackageImport, discardPortablePackageImport, preparePortablePackageExport, previewPortablePackageImport, readPortablePackageExport } from "../../../ipc/commands";
import { operationId } from "../document/schema";
import * as styles from "./PortablePackage.css";

const ImportDialog = lazy(() => import("./PortablePackageImportDialog").then(module => ({ default: module.PortablePackageImportDialog })));
const MAX_BYTES = 64 * 1024 * 1024;
const readerKey = (nodeId: string) => ["life", "document", nodeId] as const;
const canvasKey = (nodeId: string) => ["life", "narrative", nodeId] as const;

export function PortablePackageControls({ nodeId, documentKind, documentId, hasDraft = false }: {
  nodeId: string;
  documentKind?: PortableDocumentKind;
  documentId?: string;
  hasDraft?: boolean;
}) {
  const client = useQueryClient();
  const trigger = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PortablePackageImportPreview>();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const currentImportId = useRef<string | undefined>(undefined);
  const currentOperationId = useRef<string | undefined>(undefined);

  const discard = async (restoreFocus = true) => {
    const id = currentImportId.current; currentImportId.current = undefined; currentOperationId.current = undefined; setPreview(undefined); setError(undefined);
    if (id) { try { await discardPortablePackageImport(id); } catch { /* stale cleanup remains authoritative */ } }
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus());
  };
  useEffect(() => () => { const id = currentImportId.current; if (id) void discardPortablePackageImport(id); }, []);

  const choose = async (file?: File) => {
    if (!file) return;
    setError(undefined); setNotice(undefined);
    if (file.size > MAX_BYTES) { setError("The package is larger than 64 MiB and was not read."); return; }
    await discard(false);
    try {
      const value = await previewPortablePackageImport(new Uint8Array(await file.arrayBuffer()));
      currentImportId.current = value.import_id; currentOperationId.current = operationId("portable-import"); setPreview(value);
    } catch { setError("The package could not be validated. The empty leaf was not changed."); }
  };

  const confirm = async () => {
    if (!preview || pending) return; setPending(true); setError(undefined);
    try {
      await confirmPortablePackageImport({ import_id: preview.import_id, life_node_id: nodeId, operation_id: currentOperationId.current ?? operationId("portable-import") });
      currentImportId.current = undefined; currentOperationId.current = undefined; setPreview(undefined);
      await Promise.all([client.invalidateQueries({ queryKey: readerKey(nodeId) }), client.invalidateQueries({ queryKey: canvasKey(nodeId) }), client.invalidateQueries({ queryKey: ["search"] })]);
      setNotice("Lifeweave package imported into this empty leaf.");
    } catch { setError("Import failed without changing this leaf. You can retry or cancel."); }
    finally { setPending(false); }
  };

  const exportPackage = async () => {
    if (!documentKind || !documentId || pending) return; setPending(true); setNotice(undefined); setError(undefined);
    try {
      const ticket = await preparePortablePackageExport({ document_kind: documentKind, document_id: documentId });
      const buffer = await readPortablePackageExport(ticket.export_id);
      if (buffer.byteLength !== Number(ticket.byte_size)) throw new Error("byte length mismatch");
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/zip" }));
      const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = ticket.file_name;
      window.document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setNotice(`Portable package prepared. ${ticket.warnings.join(" ")}`);
    } catch { setError("Portable package export failed without changing the document."); }
    finally { setPending(false); }
  };

  return <section className={styles.controls} aria-label="Lifeweave portable package">
    <p className={styles.explanation}>Portable package preserves Lifeweave document structure and local images. Markdown is better for reading in other apps but does not preserve Canvas layout.</p>
    {documentId ? <div className={styles.actions}><button className={styles.button} type="button" disabled={pending} onClick={() => void exportPackage()}>{pending ? "Preparing package…" : "Export Lifeweave package"}</button></div>
      : <label className={styles.fileLabel}>Import Lifeweave package<input ref={trigger} className={styles.hiddenFile} type="file" accept=".zip,.lifeweave.zip,application/zip" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void choose(file); }} /></label>}
    {hasDraft && <p className={styles.note} role="note">The portable package includes the committed document only. The recoverable draft is not included.</p>}
    {notice && <p role="status" aria-live="polite">{notice}</p>}
    {error && !preview && <p className={styles.error} role="alert">{error}</p>}
    {preview && <Suspense fallback={<p role="status">Loading package preview…</p>}><ImportDialog preview={preview} pending={pending} {...(error ? { error } : {})} onConfirm={() => void confirm()} onCancel={() => void discard()} /></Suspense>}
  </section>;
}
