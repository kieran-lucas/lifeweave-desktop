import { useEffect, useId, useRef } from "react";
import type { LifeBranchImportPreview } from "../../../ipc/generated/LifeBranchImportPreview";
import * as styles from "./LifeBranch.css";

const formatBytes = (value: bigint) => `${(Number(value) / 1024).toFixed(1)} KiB`;

export function LifeBranchImportDialog({ preview, destinationTitle, pending, error, onConfirm, onCancel }: {
  preview: LifeBranchImportPreview;
  destinationTitle: string;
  pending: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Escape must not abandon a commit that is already in flight.
      if (event.key === "Escape" && !pending) { event.preventDefault(); onCancel(); return; }
      if (event.key === "Tab") {
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? []);
        const first = controls[0]; const last = controls.at(-1); const active = document.activeElement;
        if (event.shiftKey && (active === heading.current || active === first)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && active === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  const counts = preview.counts;
  return <div className={styles.backdrop} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !pending) onCancel(); }}>
    <section ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <h2 id={titleId} tabIndex={-1} ref={heading}>Import Life branch</h2>
      <p id={descriptionId}>Review this branch before importing it as a new child of “{destinationTitle}”.</p>
      <dl className={styles.metadata}>
        <dt>Branch</dt><dd>{preview.root_title}</dd>
        <dt>Destination</dt><dd>{destinationTitle}</dd>
        <dt>Nodes</dt><dd>{counts.nodes} ({counts.branches} branch, {counts.empty_leaves} empty leaf)</dd>
        <dt>Documents</dt><dd>{counts.documents} ({counts.basic_leaf_documents} Basic Leaf, {counts.narrative_documents} Narrative Canvas)</dd>
        <dt>Depth</dt><dd>{counts.maximum_depth}</dd>
        <dt>Assets</dt><dd>{counts.assets} ({formatBytes(preview.total_asset_bytes)})</dd>
        <dt>Tags</dt><dd>{counts.tags}</dd>
        <dt>Links inside the branch</dt><dd>{counts.internal_links}</dd>
        <dt>Package</dt><dd>{formatBytes(preview.package_bytes)}</dd>
      </dl>
      <ul className={styles.warnings}>{preview.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button className={styles.button} type="button" disabled={pending} onClick={onCancel}>Cancel</button>
        <button className={styles.button} type="button" disabled={pending} onClick={onConfirm}>{pending ? "Importing…" : "Import branch here"}</button>
      </div>
    </section>
  </div>;
}

export default LifeBranchImportDialog;
