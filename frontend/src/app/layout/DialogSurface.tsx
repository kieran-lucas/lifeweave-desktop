import { useId, useRef, type FormEvent, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";

import * as decisionStyles from "../DecisionDialog.css";
import { useModalFocusTrap } from "../useModalFocusTrap";
import * as styles from "./layout.css";

/**
 * Shared dialog containment. Individual workflows own their content architecture; this shell stays
 * deliberately neutral so a dialog never imposes a visual world on the feature using it.
 * Material is owned by layout.css.ts so frontend security policy never depends on inline styles.
 */
export type DialogWidth = "compact" | "standard" | "wide";

export function DialogBackdrop({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & Record<string, unknown>) {
  const backdrop = (
    <div
      {...rest}
      data-dialog-backdrop=""
      className={className ? `${styles.dialogBackdrop} ${className}` : styles.dialogBackdrop}
    >
      {children}
    </div>
  );

  return typeof document === "undefined" ? backdrop : createPortal(backdrop, document.body);
}

export function DialogSurface({
  width = "standard",
  as: Element = "div",
  surfaceRef,
  children,
  className,
  ...rest
}: {
  width?: DialogWidth;
  as?: "div" | "form" | "section";
  surfaceRef?: Ref<HTMLElement>;
  children: ReactNode;
  className?: string;
} & Record<string, unknown>) {
  return (
    <Element
      {...rest}
      ref={surfaceRef as Ref<never>}
      data-dialog-surface=""
      data-dialog-width={width}
      className={
        className
          ? `${styles.dialogSurface[width]} ${className}`
          : styles.dialogSurface[width]
      }
    >
      {children}
    </Element>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className={styles.dialogHeader}>{children}</div>;
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className={styles.dialogBody}>{children}</div>;
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className={styles.dialogFooter}>{children}</div>;
}

export function DecisionDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  inputLabel,
  inputPlaceholder,
  returnFocus,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string | null;
  destructive?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  returnFocus?: HTMLElement | null;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const dialog = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useModalFocusTrap({
    container: dialog,
    initialFocus: inputLabel ? input : heading,
    onEscape: onCancel,
    returnFocus,
  });

  return (
    <div className={styles.dialogBackdrop} data-dialog-backdrop="" role="presentation">
      <form
        ref={dialog}
        data-dialog-surface=""
        data-dialog-width="compact"
        className={styles.dialogSurface.compact}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onConfirm(input.current?.value ?? "");
        }}
      >
        <div className={styles.dialogHeader}>
          <h2 id={titleId} ref={heading} tabIndex={-1}>{title}</h2>
          <p id={descriptionId} className={decisionStyles.description}>{description}</p>
        </div>
        {inputLabel ? (
          <div className={styles.dialogBody}>
            <label className={decisionStyles.field} htmlFor={inputId}>
              {inputLabel}
              <input ref={input} id={inputId} className={decisionStyles.input} inputMode="url" placeholder={inputPlaceholder} />
            </label>
          </div>
        ) : null}
        <div className={styles.dialogFooter}>
          {cancelLabel ? <button type="button" className={decisionStyles.cancel} onClick={onCancel}>{cancelLabel}</button> : null}
          <button type="submit" className={destructive ? decisionStyles.destructive : decisionStyles.confirm}>{confirmLabel}</button>
        </div>
      </form>
    </div>
  );
}
