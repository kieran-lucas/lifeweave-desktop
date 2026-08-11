import { useState } from "react";
import type { DocumentOutlineProjection } from "./outline";
import * as styles from "./DocumentOutline.css";

export function DocumentOutline({
  id,
  outline,
  reducedMotion,
}: {
  id?: string;
  outline: DocumentOutlineProjection;
  reducedMotion: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const activate = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(id);
    if (!el) return;
    const behavior = reducedMotion ? "auto" : "smooth";
    const viewport = el.closest<HTMLElement>("[data-app-viewport]");
    el.focus({ preventScroll: true });
    if (!viewport) {
      el.scrollIntoView({ behavior, block: "start" });
      return;
    }
    const top = viewport.scrollTop
      + el.getBoundingClientRect().top
      - viewport.getBoundingClientRect().top
      - 24;
    viewport.scrollTo({ top: Math.max(0, top), behavior });
  };

  return (
    <nav id={id} aria-label="Document outline" className={styles.nav}>
      <p className={styles.heading} aria-hidden="true">Contents</p>
      <ol className={styles.list}>
        {outline.entries.map(entry => (
          <li key={entry.id}>
            <button
              className={styles.entryButton}
              data-level={entry.level}
              aria-current={activeId === entry.id ? "true" : undefined}
              onClick={() => activate(entry.id)}
            >
              {entry.label}
            </button>
          </li>
        ))}
      </ol>
      {outline.truncated && (
        <p className={styles.truncationNote}>
          Outline limited to the first 256 sections.
        </p>
      )}
    </nav>
  );
}
