import { useState } from "react";
import { exportNarrativeMarkdown } from "../../../ipc/commands";
import * as styles from "./NarrativeCanvas.css";

const LOSSINESS_WARNING =
  "Markdown preserves readable content, not Canvas block structure or layout. Image bytes are not embedded; referenced local assets must already exist.";

export function NarrativeMarkdownExportButton({ documentId }: { documentId: string }) {
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");

  const handleExport = async () => {
    setStatus("pending");
    try {
      const result = await exportNarrativeMarkdown({ document_id: documentId });
      const blob = new Blob([result.markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = result.file_name;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div>
      <p role="note" className={styles.status} id="nc-export-warning">
        {LOSSINESS_WARNING}
      </p>
      <button
        className={styles.button}
        disabled={status === "pending"}
        onClick={() => void handleExport()}
        aria-label="Export canvas as Markdown"
        aria-describedby="nc-export-warning"
      >
        Export Markdown
      </button>
      {status === "error" && (
        <p role="alert" className={styles.missing}>
          Markdown export failed.
        </p>
      )}
    </div>
  );
}
