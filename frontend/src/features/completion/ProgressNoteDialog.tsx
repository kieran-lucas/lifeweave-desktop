import { useId, useRef, useState, type FormEvent } from "react";
import { DialogBackdrop, DialogBody, DialogFooter, DialogHeader, DialogSurface } from "../../app/layout/DialogSurface";
import { useModalFocusTrap } from "../../app/useModalFocusTrap";
import * as styles from "./ProgressNoteDialog.css";

export function ProgressNoteDialog({ title, note, returnFocus, onSave, onClose }: {
  title: string;
  note: string | null;
  returnFocus: HTMLElement | null;
  onSave: (note: string) => Promise<void>;
  onClose: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useModalFocusTrap({ container: dialog, initialFocus: input, returnFocus, onEscape: onClose, escapeEnabled: !saving });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try { await onSave(value); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save progress note."); }
    finally { setSaving(false); }
  }

  return (
    <DialogBackdrop onPointerDown={(event: React.PointerEvent) => {
      if (!saving && event.target === event.currentTarget) onClose();
    }}>
      <DialogSurface width="compact" surfaceRef={dialog} role="dialog" aria-modal="true"
        aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
        <form className={styles.form} onSubmit={submit}>
        <DialogHeader><h2 id={`${id}-title`}>Progress note</h2><p id={`${id}-description`}>{title}</p></DialogHeader>
        <DialogBody>
          <label className={styles.field} htmlFor={`${id}-note`}>What did you complete?</label>
          <textarea ref={input} id={`${id}-note`} className={styles.input} rows={4} maxLength={2000}
            placeholder="Planned 50 exercises; completed 20." value={value} readOnly={saving}
            onChange={(event) => setValue(event.target.value)} aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined} />
          <p className={styles.hint}>Leave blank to remove the note.</p>
          {error && <p id={`${id}-error`} role="alert" className={styles.error}>{error}</p>}
        </DialogBody>
        <DialogFooter>
          <button type="button" className={styles.cancel} disabled={saving} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.save} disabled={saving}>{saving ? "Saving…" : "Save note"}</button>
        </DialogFooter>
        </form>
      </DialogSurface>
    </DialogBackdrop>
  );
}
