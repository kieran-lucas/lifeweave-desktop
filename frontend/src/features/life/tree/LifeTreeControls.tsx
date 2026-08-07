import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LifeTreeImportPreview } from "../../../ipc/generated/LifeTreeImportPreview";
import {
  confirmLifeTreeImport,
  discardLifeTreeImport,
  prepareLifeTreeExport,
  previewLifeTreeImport,
  readLifeTreeExport,
} from "../../../ipc/commands";
import { invalidateLifeBranchImport } from "../branch/lifeBranchQueries";
import * as styles from "../branch/LifeBranch.css";

const LifeTreeImportDialog = lazy(() => import("../branch/LifeBranchImportDialog").then(module => ({ default: module.LifeTreeImportDialog })));

const MAX_BYTES = 64 * 1024 * 1024;
const newOperationId = () => `life-tree-${crypto.randomUUID()}`;

export function treeExportBlockedReason(node: { parentId: string | null; childCount: number }) {
  if (node.parentId !== null) return "Export Life tree is available only at the Life root.";
  if (node.childCount === 0) return "The Life tree has no active non-root content to export.";
  return undefined;
}

export function treeImportBlockedReason(hasDocument: boolean) {
  return hasDocument ? "A destination holding a document cannot receive a Life tree." : undefined;
}

export function LifeTreeControls({ nodeId, nodeTitle, parentId, childCount, hasDocument, treeRevision, onImported }: {
  nodeId: string;
  nodeTitle: string;
  parentId: string | null;
  childCount: number;
  hasDocument: boolean;
  treeRevision: number;
  onImported: (importedNodeId: string) => void;
}) {
  const client = useQueryClient();
  const trigger = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<LifeTreeImportPreview>();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const currentImportId = useRef<string | undefined>(undefined);
  const currentOperationId = useRef<string | undefined>(undefined);
  const importCommitted = useRef(false);

  const discard = async (restoreFocus = true) => {
    const id = currentImportId.current;
    currentImportId.current = undefined;
    currentOperationId.current = undefined;
    importCommitted.current = false;
    setPreview(undefined); setError(undefined);
    if (id) {
      try { await discardLifeTreeImport({ import_id: id }); } catch { /* startup cleanup remains authoritative */ }
    }
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus());
  };
  useEffect(() => () => {
    const id = currentImportId.current;
    if (id && !importCommitted.current) void discardLifeTreeImport({ import_id: id });
  }, []);

  const choose = async (file?: File) => {
    if (!file) return;
    setError(undefined); setNotice(undefined);
    if (file.size > MAX_BYTES) { setError("The Tree Package is larger than 64 MiB and was not read."); return; }
    await discard(false);
    try {
      const value = await previewLifeTreeImport(new Uint8Array(await file.arrayBuffer()));
      importCommitted.current = false;
      currentImportId.current = value.import_id;
      currentOperationId.current = newOperationId();
      setPreview(value);
    } catch {
      setError("The Life Tree Package could not be validated. Nothing was changed.");
    }
  };

  const confirm = async () => {
    if (!preview || pending) return;
    setPending(true); setError(undefined); setNotice(undefined);
    try {
      const imported = await confirmLifeTreeImport({
        import_id: preview.import_id,
        package_sha256: preview.package_sha256,
        parent_node_id: nodeId,
        expected_tree_revision: treeRevision,
        operation_id: currentOperationId.current ?? newOperationId(),
      });
      importCommitted.current = true;
      currentImportId.current = undefined;
      currentOperationId.current = undefined;
      setPreview(undefined);
      const refresh = await invalidateLifeBranchImport(client);
      setNotice(refresh.every(result => result.status === "fulfilled")
        ? `Imported ${imported.node_count} nodes in ${preview.counts.top_level_nodes} top-level roots beneath “${nodeTitle}”.`
        : "Life tree imported successfully, but this view could not refresh automatically. Reopen Life Edit.");
      onImported(imported.first_imported_node_id);
    } catch {
      setError("Import failed without changing your Life tree. You can retry or cancel.");
      setPending(false);
      return;
    }
    setPending(false);
  };

  const exportBlocked = treeExportBlockedReason({ parentId, childCount });
  const importBlocked = treeImportBlockedReason(hasDocument);
  const exportTree = async () => {
    if (exportBlocked || pending) return;
    setPending(true); setNotice(undefined); setError(undefined);
    try {
      const ticket = await prepareLifeTreeExport({ node_id: nodeId });
      const buffer = await readLifeTreeExport(ticket.export_id);
      if (buffer.byteLength !== Number(ticket.byte_size)) throw new Error("byte length mismatch");
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/zip" }));
      const anchor = window.document.createElement("a");
      anchor.href = url; anchor.download = ticket.file_name;
      window.document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(url);
      setNotice(`Life Tree Package prepared. ${ticket.warnings.join(" ")}`);
    } catch {
      setError("Life tree export failed without changing your Life tree.");
    } finally { setPending(false); }
  };

  return <section className={styles.controls} aria-label="Life tree interchange">
    <div className={styles.actions}>
      <button className={styles.button} type="button" disabled={pending || exportBlocked !== undefined} onClick={() => void exportTree()}>{pending ? "Working…" : "Export Life tree"}</button>
      <button ref={trigger} className={styles.button} type="button" disabled={pending || importBlocked !== undefined} onClick={() => fileInput.current?.click()}>Import Life tree here</button>
      <input ref={fileInput} aria-label="Choose Life Tree Package" className={styles.hiddenFile} type="file" accept=".lifeweave-tree.zip,application/zip" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void choose(file); }}/>
    </div>
    {exportBlocked && <p className={styles.reason}>{exportBlocked}</p>}
    {importBlocked && <p className={styles.reason}>{importBlocked}</p>}
    {notice && <p role="status" aria-live="polite">{notice}</p>}
    {error && !preview && <p className={styles.error} role="alert">{error}</p>}
    {preview && <Suspense fallback={<p role="status">Loading tree preview…</p>}><LifeTreeImportDialog preview={preview} destinationTitle={nodeTitle} pending={pending} {...(error ? { error } : {})} onConfirm={() => void confirm()} onCancel={() => void discard()}/></Suspense>}
  </section>;
}
