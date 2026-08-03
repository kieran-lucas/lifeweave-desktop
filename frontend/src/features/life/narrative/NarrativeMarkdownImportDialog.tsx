import { useEffect, useRef, useState } from "react";
import { importNarrativeMarkdown } from "../../../ipc/commands";
import type { NarrativeDocumentView } from "../../../ipc/generated/NarrativeDocumentView";
import type { NarrativeMarkdownPreview } from "../../../ipc/generated/NarrativeMarkdownPreview";
import { operationId } from "./schema";
import * as styles from "./NarrativeMarkdownImportDialog.css";

interface Props {
  nodeId: string;
  originalName: string;
  markdown: string;
  preview: NarrativeMarkdownPreview;
  onConfirmed: (doc: NarrativeDocumentView) => void;
  onCancel: () => void;
}

export function NarrativeMarkdownImportDialog({
  nodeId,
  originalName,
  markdown,
  preview,
  onConfirmed,
  onCancel,
}: Props) {
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const operationIdRef = useRef(operationId("md-import"));
  const priorFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    priorFocusRef.current = document.activeElement;
    confirmRef.current?.focus();
    return () => {
      if (priorFocusRef.current instanceof HTMLElement) {
        priorFocusRef.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "pending") {
        onCancel();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, status]);

  const handleConfirm = async () => {
    setStatus("pending");
    try {
      const doc = await importNarrativeMarkdown({
        life_node_id: nodeId,
        original_name: originalName,
        markdown,
        operation_id: operationIdRef.current,
      });
      onConfirmed(doc);
    } catch {
      setStatus("error");
    }
  };

  const warningsId = "nc-import-warnings";

  return (
    <div
      className={styles.overlay}
      onClick={status === "pending" ? undefined : onCancel}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nc-import-title"
        aria-describedby={preview.warnings.length > 0 ? warningsId : undefined}
        onClick={e => e.stopPropagation()}
      >
        <h2 id="nc-import-title" className={styles.title}>
          Import Markdown as Canvas
        </h2>
        <p className={styles.excerpt} aria-label="Document excerpt">
          {preview.plain_text_excerpt || "(empty)"}
        </p>
        <dl className={styles.meta}>
          <dt>Proposed title</dt>
          <dd>{preview.proposed_title}</dd>
          <dt>Sections</dt>
          <dd>{preview.top_level_node_count}</dd>
          {preview.referenced_asset_count > 0 && (
            <>
              <dt>Asset refs</dt>
              <dd>{preview.referenced_asset_count}</dd>
            </>
          )}
        </dl>
        {preview.warnings.length > 0 && (
          <div
            id={warningsId}
            className={styles.warnings}
            role="note"
            aria-label="Import warnings"
          >
            {preview.warnings.map((w, i) => (
              <p key={i} className={styles.warningItem}>
                {w}
              </p>
            ))}
          </div>
        )}
        {status === "error" && (
          <p className={styles.errorMsg} role="alert">
            Import failed. The document was not changed.
          </p>
        )}
        <div className={styles.actions}>
          <button
            className={styles.button}
            onClick={onCancel}
            disabled={status === "pending"}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            className={styles.primary}
            onClick={() => void handleConfirm()}
            disabled={status === "pending"}
          >
            {status === "pending" ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
