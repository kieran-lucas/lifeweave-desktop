import type { ElementType, ReactNode, Ref } from "react";

import * as styles from "./layout.css";

/**
 * The page-frame primitives (ADR 0044).
 *
 * `PageFrame` is the only thing in Lifeweave that decides how wide a page is. A screen picks one
 * type from the finite taxonomy and stops owning geometry.
 *
 * The `data-page-frame` and `data-page-type` attributes are layout test hooks. Native phase 21
 * reads them to assert the overflow, centring and cross-page agreement invariants against the real
 * WebView box model, which jsdom cannot report.
 */

export type PageType = "standard" | "wide" | "reading";

type FrameProps = {
  type?: PageType;
  as?: ElementType;
  className?: string;
  /** React 19 takes `ref` as an ordinary prop; the shell uses it to move focus to the heading. */
  ref?: Ref<HTMLElement>;
  children: ReactNode;
} & Record<`aria-${string}`, string | undefined>;

export function PageFrame({
  type = "standard",
  as: Element = "div",
  className,
  ref,
  children,
  ...rest
}: FrameProps) {
  return (
    <Element
      {...rest}
      // `Element` is chosen at the call site, so React cannot narrow the ref for us here.
      ref={ref as Ref<never>}
      data-page-frame=""
      data-page-type={type}
      className={className ? `${styles.pageFrame[type]} ${className}` : styles.pageFrame[type]}
    >
      {children}
    </Element>
  );
}

/**
 * Page identity on the left, page actions on the right, on the frame's own alignment axis. Screens
 * must not solve their header by adding a private margin.
 */
export function PageHeader({
  children,
  actions,
  className,
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={className ? `${styles.pageHeader} ${className}` : styles.pageHeader}>
      <div className={styles.pageIdentity}>{children}</div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}

/** Large-gap vertical rhythm: each child reads as a new major section. */
export function SectionStack({
  children,
  as: Element = "div",
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}) {
  return (
    <Element className={className ? `${styles.sectionStack} ${className}` : styles.sectionStack}>
      {children}
    </Element>
  );
}
