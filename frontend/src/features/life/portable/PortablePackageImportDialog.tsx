import { useEffect, useRef } from "react";
import type { PortablePackageImportPreview } from "../../../ipc/generated/PortablePackageImportPreview";
import * as styles from "./PortablePackage.css";

const formatBytes = (value: bigint) => `${(Number(value) / 1024).toFixed(1)} KiB`;

export function PortablePackageImportDialog({ preview, pending, error, onConfirm, onCancel }: {
  preview: PortablePackageImportPreview;
  pending: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
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
  return <div className={styles.backdrop} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !pending) onCancel(); }}>
    <section ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="portable-dialog-title" aria-describedby="portable-dialog-description">
      <h2 id="portable-dialog-title" tabIndex={-1} ref={heading}>Import Lifeweave package</h2>
      <p id="portable-dialog-description">Review the committed document before importing it into this empty leaf.</p>
      <dl className={styles.metadata}>
        <dt>Title</dt><dd>{preview.title}</dd>
        <dt>Type</dt><dd>{preview.document_kind === "basic_leaf" ? "Basic Leaf" : "Narrative Canvas"}</dd>
        {preview.template_id && <><dt>Template</dt><dd>{preview.template_id} v{preview.template_version}</dd></>}
        {preview.visual_world_id && <><dt>Visual World</dt><dd>{preview.visual_world_id}</dd></>}
        {preview.scene_count !== null && <><dt>Scenes</dt><dd>{preview.scene_count}</dd></>}
        <dt>Assets</dt><dd>{preview.asset_count} ({formatBytes(preview.total_asset_bytes)})</dd>
        <dt>Package</dt><dd>{formatBytes(preview.package_bytes)}</dd>
      </dl>
      <ul>{preview.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button className={styles.button} type="button" disabled={pending} onClick={onCancel}>Cancel</button>
        <button className={styles.button} type="button" disabled={pending} onClick={onConfirm}>{pending ? "Importing…" : "Import into this empty leaf"}</button>
      </div>
    </section>
  </div>;
}
