import type { ReactNode } from "react";

import { Icon } from "../visual/icons";
import * as styles from "./states.css";

/**
 * The shared empty, loading and error primitives.
 *
 * Kept deliberately small. These render on almost every surface, so anything expensive here is paid
 * for everywhere; the composition is a few elements and the art is one tinted disc.
 */

export function EmptyState({
  icon,
  title,
  body,
  action,
  compact = false,
}: {
  /** A path from `visual/icons`. Optional: a one-line empty panel does not need a mark. */
  icon?: string;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? `${styles.empty} ${styles.emptyCompact}` : styles.empty}>
      {icon ? (
        <span className={styles.emptyMark}>
          <Icon d={icon} size={compact ? 18 : 20} />
        </span>
      ) : null}
      <p className={styles.emptyTitle}>{title}</p>
      {body ? <p className={styles.emptyBody}>{body}</p> : null}
      {action}
    </div>
  );
}

/**
 * A list-shaped loading placeholder.
 *
 * `aria-hidden` with the announcement carried by a sibling live region: a screen reader should hear
 * "Loading tasks", not a description of six grey rectangles. `rows` lets a caller match the shape of
 * what is actually coming, which is the difference between a skeleton and a grey box.
 */
export function SkeletonList({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <>
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {label}
      </span>
      <div className={styles.skeletonList} aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <span key={index} className={styles.skeleton} />
        ))}
      </div>
    </>
  );
}

/**
 * The inline pending row, for Suspense fallbacks where no meaningful shape can be previewed.
 *
 * `role="status"` so the label is announced; the spinner itself is decorative.
 */
export function LoadingRow({ label }: { label: string }) {
  return (
    <p className={styles.loadingRow} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      {label}
    </p>
  );
}
