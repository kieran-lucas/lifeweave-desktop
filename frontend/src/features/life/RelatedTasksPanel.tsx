import { useQuery } from "@tanstack/react-query";
import { getRelatedTasksForLifeNode } from "../../ipc/commands";
import type { RelatedTaskView } from "../../ipc/generated/RelatedTaskView";
import { TagChipList } from "../tag/TagChipList";
import { EmptyState, SkeletonList } from "../../design-system/primitives/States";
import * as styles from "./RelatedTasksPanel.css";

export function RelatedTasksPanel({
  nodeId,
  anchorLocalDate,
  onNavigate,
}: {
  nodeId: string;
  anchorLocalDate: string;
  onNavigate?:
    | ((
        localDate: string,
        taskId: string | null,
        seriesId: string | null,
      ) => void)
    | undefined;
}) {
  const query = useQuery({
    queryKey: ["life", "related-tasks", nodeId, anchorLocalDate],
    queryFn: () => getRelatedTasksForLifeNode(nodeId, anchorLocalDate),
    enabled: nodeId !== "life-root",
  });
  if (nodeId === "life-root") return null;
  if (query.isLoading)
    return (
      <section className={styles.panel} aria-labelledby="related-tasks-heading">
        <h2 className={styles.heading} id="related-tasks-heading">Related tasks</h2>
        <SkeletonList rows={3} label="Loading related tasks…" />
      </section>
    );
  if (query.isError)
    return (
      <section className={styles.panel} aria-labelledby="related-tasks-heading">
        <h2 className={styles.heading} id="related-tasks-heading">Related tasks</h2>
        <p role="alert">Related tasks could not be loaded.</p>
      </section>
    );
  const rows = query.data ?? [];
  const group = (name: "active" | "completed") =>
    rows.filter((row) => row.group === name);
  const render = (row: RelatedTaskView) => (
    <li className={row.group === "completed" ? styles.completedRow : styles.row} key={`${row.kind}-${row.id}`}>
      <button
        type="button"
        className={styles.taskButton}
        onClick={() =>
          onNavigate?.(
            row.navigation_local_date,
            row.kind === "one_off" ? row.id : null,
            row.kind === "recurring" ? row.series_id : null,
          )
        }
      >
        {row.title}
        <TagChipList tags={row.tags} />
      </button>
    </li>
  );
  const active = group("active"),
    completed = group("completed");
  return (
    <section className={styles.panel} aria-labelledby="related-tasks-heading">
      <h2 className={styles.heading} id="related-tasks-heading">Related tasks</h2>
      <section className={styles.group} aria-labelledby="related-active-heading">
        <h3 className={styles.subheading} id="related-active-heading">Active ({active.length})</h3>
        {active.length ? (
          <ul className={styles.list}>{active.map(render)}</ul>
        ) : (
          <EmptyState compact title="No active related tasks." />
        )}
      </section>
      <section className={styles.group} aria-labelledby="related-completed-heading">
        <h3 className={styles.subheading} id="related-completed-heading">Completed ({completed.length})</h3>
        {completed.length ? (
          <ul className={styles.list}>{completed.map(render)}</ul>
        ) : (
          <EmptyState compact title="No completed related tasks." />
        )}
      </section>
    </section>
  );
}
