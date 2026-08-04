import { useQuery } from "@tanstack/react-query";
import { getRelatedTasksForLifeNode } from "../../ipc/commands";
import type { RelatedTaskView } from "../../ipc/generated/RelatedTaskView";

export function RelatedTasksPanel({
  nodeId,
  onNavigate,
}: {
  nodeId: string;
  onNavigate?:
    | ((
        localDate: string,
        taskId: string | null,
        seriesId: string | null,
      ) => void)
    | undefined;
}) {
  const query = useQuery({
    queryKey: ["life", "related-tasks", nodeId],
    queryFn: () => getRelatedTasksForLifeNode(nodeId),
    enabled: nodeId !== "life-root",
  });
  if (nodeId === "life-root") return null;
  if (query.isLoading)
    return (
      <section aria-labelledby="related-tasks-heading">
        <h2 id="related-tasks-heading">Related tasks</h2>
        <p aria-live="polite">Loading related tasks…</p>
      </section>
    );
  if (query.isError)
    return (
      <section aria-labelledby="related-tasks-heading">
        <h2 id="related-tasks-heading">Related tasks</h2>
        <p role="alert">Related tasks could not be loaded.</p>
      </section>
    );
  const rows = query.data ?? [];
  const group = (name: "active" | "completed") =>
    rows.filter((row) => row.group === name);
  const render = (row: RelatedTaskView) => (
    <li key={`${row.kind}-${row.id}`}>
      <button
        type="button"
        onClick={() =>
          row.local_date &&
          onNavigate?.(
            row.local_date,
            row.kind === "one_off" ? row.id : null,
            row.kind === "recurring" ? row.series_id : null,
          )
        }
      >
        {row.title}
      </button>
    </li>
  );
  const active = group("active"),
    completed = group("completed");
  return (
    <section aria-labelledby="related-tasks-heading">
      <h2 id="related-tasks-heading">Related tasks</h2>
      <section aria-labelledby="related-active-heading">
        <h3 id="related-active-heading">Active ({active.length})</h3>
        {active.length ? (
          <ul>{active.map(render)}</ul>
        ) : (
          <p>No active related tasks.</p>
        )}
      </section>
      <section aria-labelledby="related-completed-heading">
        <h3 id="related-completed-heading">Completed ({completed.length})</h3>
        {completed.length ? (
          <ul>{completed.map(render)}</ul>
        ) : (
          <p>No completed related tasks.</p>
        )}
      </section>
    </section>
  );
}
