import { useEffect, useState } from "react";

import { getFocusPlanLinkedWork } from "../../ipc/commands";
import type { FocusPlanLinkedWorkView } from "../../ipc/generated/FocusPlanLinkedWorkView";
import * as styles from "./FocusPlansScreen.css";
import { EmptyState } from "../../design-system/primitives/States";

export type TaskNavigate = (
  localDate: string,
  taskId: string | null,
  seriesId: string | null,
) => void;

export function LinkedWorkPanel({
  planId,
  anchorLocalDate,
  onTaskNavigate,
}: {
  planId: string;
  anchorLocalDate: string;
  onTaskNavigate?: TaskNavigate | undefined;
}) {
  const [work, setWork] = useState<FocusPlanLinkedWorkView | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getFocusPlanLinkedWork({ plan_id: planId, anchor_local_date: anchorLocalDate })
      .then((value) => {
        if (cancelled) return;
        setWork(value);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [planId, anchorLocalDate]);

  if (status === "loading") {
    return <p className={styles.linkedMeta} role="status" aria-live="polite">Loading linked work…</p>;
  }

  if (status === "error") {
    return <p role="alert" className={styles.error}>Linked work could not be loaded.</p>;
  }

  if (!work || work.items.length === 0) {
    return (
      <EmptyState
        compact
        title="No linked work yet."
        body="Tasks connected to this plan will appear here automatically."
      />
    );
  }

  return (
    <>
      <p className={styles.linkedMeta}>
        {work.one_off_count} {work.one_off_count === 1 ? "task" : "tasks"} · {work.series_count}{" "}
        recurring {work.series_count === 1 ? "series" : "series"}
      </p>
      <ul className={styles.linkedList} aria-label="Linked work">
        {work.items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.linkedRow}
              onClick={() =>
                onTaskNavigate?.(
                  item.navigation_local_date,
                  item.kind === "one_off" ? item.id : null,
                  item.kind === "recurring" ? item.series_id : null,
                )
              }
            >
              <span className={styles.linkedCopy}>
                <strong>{item.title}</strong>
                <span>
                  {item.kind === "recurring" ? "Recurring series" : "Task"} · {item.group} ·{" "}
                  <time dateTime={item.navigation_local_date}>{item.navigation_local_date}</time>
                </span>
              </span>
              <span className={styles.linkedArrow} aria-hidden="true">↗</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
