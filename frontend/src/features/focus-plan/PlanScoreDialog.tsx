import { useId, useRef, useState, type FormEvent, type MouseEvent } from "react";

import {
  DialogBackdrop,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSurface,
} from "../../app/layout/DialogSurface";
import { useModalFocusTrap } from "../../app/useModalFocusTrap";
import * as styles from "./PlanScoreDialog.css";

type Props = {
  planTitle: string;
  currentScore: number | null;
  returnFocus: HTMLElement | null;
  onSave: (score: number | null) => Promise<string | null>;
  onClose: () => void;
};

export function PlanScoreDialog({ planTitle, currentScore, returnFocus, onSave, onClose }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const dialog = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(currentScore?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useModalFocusTrap({
    container: dialog,
    initialFocus: input,
    onEscape: onClose,
    escapeEnabled: !saving,
    returnFocus,
  });

  async function commit(score: number | null) {
    setSaving(true);
    setError(null);
    const message = await onSave(score);
    setSaving(false);
    if (message) {
      setError(message);
      input.current?.focus();
      return;
    }
    onClose();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const score = Number(value);
    if (!/^\d+$/.test(value) || !Number.isInteger(score) || score < 1 || score > 100) {
      setError("Enter a whole number from 1 to 100.");
      input.current?.focus();
      return;
    }
    void commit(score);
  }

  return (
    <DialogBackdrop
      role="presentation"
      onMouseDown={(event: MouseEvent) => {
        if (!saving && event.target === event.currentTarget) onClose();
      }}
    >
      <DialogSurface
        as="form"
        width="compact"
        surfaceRef={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onSubmit={submit}
      >
        <DialogHeader>
          <h2 id={titleId}>Evaluate plan</h2>
          <p id={descriptionId}>Give “{planTitle}” a manual score. This does not complete the plan.</p>
        </DialogHeader>
        <DialogBody>
          <label className={styles.field} htmlFor={inputId}>
            Score from 1 to 100
            <input
              ref={input}
              id={inputId}
              className={styles.input}
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              step={1}
              required
              value={value}
              disabled={saving}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
            />
          </label>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          {currentScore !== null ? (
            <button type="button" className={styles.clear} disabled={saving} onClick={() => void commit(null)}>
              Clear score
            </button>
          ) : null}
          <button type="button" className={styles.cancel} disabled={saving} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.save} disabled={saving}>
            {saving ? "Saving…" : "Save score"}
          </button>
        </DialogFooter>
      </DialogSurface>
    </DialogBackdrop>
  );
}

