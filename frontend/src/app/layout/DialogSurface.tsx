import type { ReactNode, Ref } from "react";

import * as styles from "./layout.css";

/**
 * Modal **geometry** (ADR 0044). Deliberately not a modal framework.
 *
 * These components carry no focus trap, no Escape handling, no portal and no open/close state. Each
 * dialog keeps exactly the behaviour it already has, so the ADR 0039 modal-detection contract —
 * `role="dialog"` plus `aria-modal="true"` on the element the dialog itself renders — is untouched,
 * and the global shortcut layer keeps suppressing correctly.
 *
 * What they do provide is the containment the Task dialog never had: a real surface with a bounded
 * inline size, a bounded block size, and its own scroll.
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
  return (
    <div
      {...rest}
      className={className ? `${styles.dialogBackdrop} ${className}` : styles.dialogBackdrop}
    >
      {children}
    </div>
  );
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
      // `Element` is chosen at the call site, so React cannot narrow the ref for us here.
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
