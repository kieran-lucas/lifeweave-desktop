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

/**
 * Linked work for one Focus Plan. Navigation dates are authored by Rust — a recurring series
 * resolves to its appropriate occurrence relative to the supplied anchor — so this component
 * never computes a date itself.
 */
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

  return (
    <section aria-labelledby="linked-work-heading">
      <h3 id="linked-work-heading">Linked work</h3>
      {status === "loading" && (
        <p role="status" aria-live="polite">
          Loading linked work…
        </p>
      )}
      {status === "error" && (
        <p role="alert" className={styles.error}>
          Linked work could not be loaded.
        </p>
      )}
      {status === "ready" && work && (
        <>
          <p className={styles.muted}>
            {work.one_off_count} linked{" "}
            {work.one_off_count === 1 ? "task" : "tasks"} and {work.series_count}{" "}
            recurring {work.series_count === 1 ? "series" : "series"}.
          </p>
          {work.items.length === 0 ? (
            <EmptyState compact title="No Tasks reference this Plan yet." body="Link a Task to this Plan to see it here." />
          ) : (
            <ul className={styles.planList} aria-label="Linked work">
              {work.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.planButton}
                    onClick={() =>
                      onTaskNavigate?.(
                        item.navigation_local_date,
                        item.kind === "one_off" ? item.id : null,
                        item.kind === "recurring" ? item.series_id : null,
                      )
                    }
                  >
                    <strong>{item.title}</strong>
                    <span className={styles.muted}>
                      {item.kind === "recurring" ? "Recurring series" : "Task"} ·{" "}
                      {item.group} ·{" "}
                      <time dateTime={item.navigation_local_date}>
                        {item.navigation_local_date}
                      </time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
