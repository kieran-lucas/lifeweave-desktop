import { Fragment, useEffect, useId, useRef } from "react";

import { shortcutCommands } from "./keyboardShortcuts";
import * as styles from "./App.css";

/**
 * The read-only Keyboard shortcuts dialog (ADR 0039).
 *
 * Every row is produced by mapping over the registry, so there is no hand-written chord here that
 * could fall out of date. It follows the dialog pattern already used by `LifeBranchImportDialog`:
 * `role="dialog"` + `aria-modal="true"`, deterministic initial focus on the heading, a cycling Tab
 * trap, and Escape or Close to dismiss. Focus restoration belongs to the opener, which is the only
 * layer that knows what opened it.
 *
 * Because it is itself an open modal, the global shortcut layer suppresses every chord while it is
 * mounted — the same clause that protects every other modal in the product.
 */
export function ShortcutHelpDialog({ onClose }: { onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        const controls = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [],
        );
        const first = controls[0];
        const last = controls.at(-1);
        const active = document.activeElement;
        if (event.shiftKey && (active === heading.current || active === first)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={styles.dialogBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialog}
        className={styles.dialogCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId} tabIndex={-1} ref={heading}>
          Keyboard shortcuts
        </h2>
        <p id={descriptionId}>
          These work anywhere except inside a text field, a document editor, or an open dialog.
        </p>
        <dl className={styles.shortcutList}>
          {shortcutCommands.map((command) => (
            <Fragment key={command.id}>
              <dt>{command.label}</dt>
              <dd>
                <kbd className={styles.shortcutChord}>{command.chord}</kbd>
              </dd>
            </Fragment>
          ))}
        </dl>
        <button type="button" className={styles.dialogButton} onClick={onClose}>
          Close
        </button>
      </section>
    </div>
  );
}

export default ShortcutHelpDialog;
