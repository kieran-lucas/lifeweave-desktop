import { useId, useRef, useState, type FormEvent } from "react";
import { DialogBackdrop, DialogBody, DialogFooter, DialogHeader, DialogSurface } from "../../app/layout/DialogSurface";
import { useModalFocusTrap } from "../../app/useModalFocusTrap";
import { button } from "../../design-system/primitives/controls.css";
import type { MilestoneView } from "../../ipc/generated/MilestoneView";
import type { SaveMilestoneInput } from "../../ipc/generated/SaveMilestoneInput";
import { validMilestoneDate } from "./timeline";
import * as styles from "./MilestonesScreen.css";

export function milestoneError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === "StaleRevision") return "This milestone changed. Close and reopen it to use the latest version.";
  if (code === "Validation") return (error as { message: string }).message;
  return "Unable to save your change. Please try again.";
}
export function MilestoneEditor({ milestone, today, returnFocus, onSave, onClose }: {
  milestone?: MilestoneView; today: string; returnFocus: HTMLElement | null;
  onSave: (input: SaveMilestoneInput) => Promise<void>; onClose: () => void;
}) {
  const prefix = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const [identity] = useState(() => milestone?.id ?? crypto.randomUUID());
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [date, setDate] = useState(milestone?.date ?? today);
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [pinned, setPinned] = useState(milestone?.pinned ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  useModalFocusTrap({ container: dialog, initialFocus: first, returnFocus, onEscape: onClose, escapeEnabled: !saving });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    if (!title.trim() || !validMilestoneDate(date)) { setError("Enter a title and valid calendar date."); return; }
    submitting.current = true;
    setSaving(true); setError("");
    try {
      await onSave({ id: identity, title: title.trim(), date, description, pinned, expected_revision: milestone?.revision ?? null });
      onClose();
    } catch (cause) { setError(milestoneError(cause)); }
    finally { submitting.current = false; setSaving(false); }
  }
  return <DialogBackdrop onPointerDown={(event: React.PointerEvent) => {
    if (event.target === event.currentTarget && !saving) onClose();
  }}>
    <DialogSurface width="compact" surfaceRef={dialog} role="dialog" aria-modal="true" aria-labelledby={`${prefix}-heading`}>
      <form onSubmit={submit} className={styles.form}>
        <DialogHeader><h2 id={`${prefix}-heading`}>{milestone ? "Edit milestone" : "Pin milestone"}</h2></DialogHeader>
        <DialogBody><div className={styles.fields}>
          <label className={styles.field}>Title<input ref={first} className={styles.input} value={title} onChange={event => setTitle(event.target.value)}
            required maxLength={200} readOnly={saving} placeholder="A moment that matters" /></label>
          <label className={styles.field}>Date<input type="date" className={styles.input} value={date} onChange={event => setDate(event.target.value)}
            min="0100-01-01" max="9999-12-31" required readOnly={saving} /></label>
          <label className={styles.field}>Description <span className={styles.hint}>Optional</span>
            <textarea className={styles.textarea} rows={4} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} readOnly={saving} /></label>
          <label className={styles.check}><input type="checkbox" checked={pinned} onChange={event => setPinned(event.target.checked)} disabled={saving} />Pinned to timeline</label>
          {error && <p role="alert" className={styles.error}>{error}</p>}
        </div></DialogBody>
        <DialogFooter><button type="button" className={button.secondary} disabled={saving} onClick={onClose}>Cancel</button>
          <button type="submit" className={button.primary} disabled={saving}>{saving ? "Saving…" : "Save milestone"}</button></DialogFooter>
      </form>
    </DialogSurface>
  </DialogBackdrop>;
}
