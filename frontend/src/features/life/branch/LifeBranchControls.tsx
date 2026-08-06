import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LifeBranchImportPreview } from "../../../ipc/generated/LifeBranchImportPreview";
import {
  confirmLifeBranchImport,
  discardLifeBranchImport,
  prepareLifeBranchExport,
  previewLifeBranchImport,
  readLifeBranchExport,
} from "../../../ipc/commands";
import { invalidateLifeBranchImport } from "./lifeBranchQueries";
import * as styles from "./LifeBranch.css";

const ImportDialog = lazy(() => import("./LifeBranchImportDialog"));
const MAX_BYTES = 64 * 1024 * 1024;
const newOperationId = () => `life-branch-${crypto.randomUUID()}`;

/** The reason a node cannot be exported, or `undefined` when it can. */
export function exportBlockedReason(node: { parentId: string | null; childCount: number; hasDocument: boolean }) {
  if (node.parentId === null) return "The Life root cannot be exported as a branch.";
  if (node.hasDocument) return "A node holding a document cannot be exported as a branch.";
  if (node.childCount === 0) return "Export needs a branch with at least one active child.";
  return undefined;
}

export function LifeBranchControls({ nodeId, nodeTitle, parentId, childCount, hasDocument = false, treeRevision, onImported }: {
  nodeId: string;
  nodeTitle: string;
  parentId: string | null;
  childCount: number;
  hasDocument?: boolean;
  treeRevision: number;
  onImported: (importedNodeId: string) => void;
}) {
  const client = useQueryClient();
  const trigger = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<LifeBranchImportPreview>();
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
    setPreview(undefined);
    setError(undefined);
    if (id) {
      try { await discardLifeBranchImport({ import_id: id }); } catch { /* stale cleanup remains authoritative */ }
    }
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus());
  };
  useEffect(() => () => {
    const id = currentImportId.current;
    if (id && !importCommitted.current) void discardLifeBranchImport({ import_id: id });
  }, []);

  const choose = async (file?: File) => {
    if (!file) return;
    setError(undefined); setNotice(undefined);
    if (file.size > MAX_BYTES) { setError("The branch package is larger than 64 MiB and was not read."); return; }
    await discard(false);
    try {
      const value = await previewLifeBranchImport(new Uint8Array(await file.arrayBuffer()));
      importCommitted.current = false;
      currentImportId.current = value.import_id;
      currentOperationId.current = newOperationId();
      setPreview(value);
    } catch {
      setError("The branch package could not be validated. Nothing was changed.");
    }
  };

  const confirm = async () => {
    if (!preview || pending) return;
    setPending(true); setError(undefined); setNotice(undefined);
    let imported;
    try {
      imported = await confirmLifeBranchImport({
        import_id: preview.import_id,
        package_sha256: preview.package_sha256,
        parent_node_id: nodeId,
        expected_tree_revision: treeRevision,
        // Retained across retries so a repeated confirmation is idempotent rather than duplicating.
        operation_id: currentOperationId.current ?? newOperationId(),
      });
    } catch {
      setError("Import failed without changing your Life tree. You can retry or cancel.");
      setPending(false);
      return;
    }
    importCommitted.current = true;
    currentImportId.current = undefined;
    currentOperationId.current = undefined;
    setPreview(undefined);
    const refresh = await invalidateLifeBranchImport(client);
    setNotice(refresh.every(result => result.status === "fulfilled")
      ? `Imported “${imported.node_count}” nodes into “${nodeTitle}”.`
      : "Branch imported successfully, but this view could not refresh automatically. Reopen Life Edit.");
    setPending(false);
    onImported(imported.life_node_id);
  };

  const blocked = exportBlockedReason({ parentId, childCount, hasDocument });

  const exportBranch = async () => {
    if (blocked || pending) return;
    setPending(true); setNotice(undefined); setError(undefined);
    try {
      const ticket = await prepareLifeBranchExport({ node_id: nodeId });
      const buffer = await readLifeBranchExport(ticket.export_id);
      if (buffer.byteLength !== Number(ticket.byte_size)) throw new Error("byte length mismatch");
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/zip" }));
      const anchor = window.document.createElement("a");
      anchor.href = url; anchor.download = ticket.file_name;
      window.document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(url);
      setNotice(`Branch package prepared. ${ticket.warnings.join(" ")}`);
    } catch {
      setError("Branch export failed without changing your Life tree.");
    } finally {
      setPending(false);
    }
  };

  return <section className={styles.controls} aria-label="Life branch interchange">
    <div className={styles.actions}>
      <button className={styles.button} type="button" disabled={pending || blocked !== undefined} onClick={() => void exportBranch()}>
        {pending ? "Working…" : "Export branch"}
      </button>
      <label className={styles.fileLabel}>Import branch here
        <input
          ref={trigger}
          className={styles.hiddenFile}
          type="file"
          accept=".zip,.lifeweave-branch.zip,application/zip"
          onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void choose(file); }}
        />
      </label>
    </div>
    {blocked && <p className={styles.reason}>{blocked}</p>}
    {notice && <p role="status" aria-live="polite">{notice}</p>}
    {error && !preview && <p className={styles.error} role="alert">{error}</p>}
    {preview && <Suspense fallback={<p role="status">Loading branch preview…</p>}>
      <ImportDialog
        preview={preview}
        destinationTitle={nodeTitle}
        pending={pending}
        {...(error ? { error } : {})}
        onConfirm={() => void confirm()}
        onCancel={() => void discard()}
      />
    </Suspense>}
  </section>;
}

export default LifeBranchControls;
