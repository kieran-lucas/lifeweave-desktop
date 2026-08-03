import { useState } from "react";
import { exportNarrativeMarkdown } from "../../../ipc/commands";
import * as styles from "./NarrativeCanvas.css";

export function NarrativeMarkdownExportButton({ documentId }: { documentId: string }) {
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [warning, setWarning] = useState<string | null>(null);

  const handleExport = async () => {
    setStatus("pending");
    try {
      const result = await exportNarrativeMarkdown({ document_id: documentId });
      setWarning(result.warning);
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
      <button
        className={styles.button}
        disabled={status === "pending"}
        onClick={() => void handleExport()}
        aria-label="Export canvas as Markdown"
      >
        Export Markdown
      </button>
      {warning && (
        <p role="note" className={styles.status}>
          {warning}
        </p>
      )}
      {status === "error" && (
        <p role="alert" className={styles.missing}>
          Markdown export failed.
        </p>
      )}
    </div>
  );
}
