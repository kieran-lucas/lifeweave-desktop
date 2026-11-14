import { useId, useRef, useState } from "react";
import { DialogBackdrop, DialogBody, DialogFooter, DialogHeader, DialogSurface } from "../../app/layout/DialogSurface";
import { useModalFocusTrap } from "../../app/useModalFocusTrap";
import { button } from "../../design-system/primitives/controls.css";
import type { MilestoneView } from "../../ipc/generated/MilestoneView";
import { formatMilestoneDate, validMilestoneDate } from "./timeline";
import * as styles from "./MilestonesScreen.css";

export function MilestoneLibrary({ items, deleted, returnFocus, onChoose, onNavigate, onRestore, onClose }: {
  items: MilestoneView[]; deleted: MilestoneView[]; returnFocus: HTMLElement | null;
  onChoose: (id: string) => void; onNavigate: (date: string) => void;
  onRestore: (item: MilestoneView) => Promise<boolean>; onClose: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [date, setDate] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");
  useModalFocusTrap({ container: dialog, initialFocus: heading, returnFocus, onEscape: onClose, escapeEnabled: !restoring });
  return <DialogBackdrop onPointerDown={(event: React.PointerEvent) => { if (!restoring && event.target === event.currentTarget) onClose(); }}>
    <DialogSurface width="compact" surfaceRef={dialog} role="dialog" aria-modal="true" aria-labelledby={id}>
      <DialogHeader><h2 ref={heading} tabIndex={-1} id={id}>All milestones</h2></DialogHeader>
      <DialogBody><div className={styles.fields}>
        <ul className={styles.libraryList}>{items.map(item => <li key={item.id}><button type="button" className={styles.libraryButton} disabled={restoring} onClick={() => onChoose(item.id)}>
          <span>{item.title}</span><span className={styles.facts}>{formatMilestoneDate(item.date)}{item.pinned ? "" : " · Unpinned"}</span>
        </button></li>)}</ul>
        <form className={styles.jump} onSubmit={event => { event.preventDefault(); if (validMilestoneDate(date)) onNavigate(date); }}>
          <label className={styles.field}>Go to date<input className={styles.input} type="date" min="0100-01-01" max="9999-12-31" required readOnly={restoring} value={date} onChange={event => setDate(event.target.value)} /></label>
          <button className={button.ghost} type="submit" disabled={restoring}>Go</button>
        </form>
        {deleted.length > 0 && <details><summary>Deleted milestones ({deleted.length})</summary>
          {deleted.map(item => <div key={item.id} className={styles.deletedRow}><span className={styles.libraryCopy}>{item.title}</span>
            <button type="button" className={button.ghost} aria-label={`Restore ${item.title}`} disabled={restoring} onClick={async () => {
              setRestoring(true); setError("");
              try { if (await onRestore(item)) onClose(); else setError("Unable to restore milestone. Try again."); }
              finally { setRestoring(false); }
            }}>Restore</button></div>)}
        </details>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div></DialogBody>
      <DialogFooter><button type="button" className={button.secondary} disabled={restoring} onClick={onClose}>Close</button></DialogFooter>
    </DialogSurface>
  </DialogBackdrop>;
}
