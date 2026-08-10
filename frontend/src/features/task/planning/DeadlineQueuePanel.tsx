import { useQuery } from "@tanstack/react-query";

import { getDeadlineQueue } from "../../../ipc/commands";
import type { DeadlineQueueItemView } from "../../../ipc/generated/DeadlineQueueItemView";
import type { DeadlineState } from "../../../ipc/generated/DeadlineState";
import { CategoryIcon } from "../categoryIcons";
import { TagChipList } from "../../tag/TagChipList";
import { formatMinute } from "../today/TodayScreen";
import * as styles from "./TaskPlanning.css";

const groupHeadings: Record<DeadlineState, string> = {
  overdue: "Overdue deadlines",
  due_today: "Due today",
  upcoming: "Upcoming deadlines",
};

export default function DeadlineQueuePanel({
  anchorLocalDate,
  onOpenItem,
  onFocusPlanNavigate,
}: {
  anchorLocalDate: string;
  onOpenItem: (request: {
    localDate: string;
    taskId: string | null;
    seriesId: string | null;
  }) => void;
  onFocusPlanNavigate?: ((planId: string) => void) | undefined;
}) {
  const query = useQuery({
    queryKey: ["deadline-queue", anchorLocalDate],
    queryFn: () => getDeadlineQueue({ anchor_local_date: anchorLocalDate }),
  });

  if (query.isLoading)
    return (
      <div className={styles.deadlinePanel}>
        <header className={styles.header}><h1 className={styles.title}>Deadlines</h1></header>
        <p role="status" aria-live="polite">Loading deadlines…</p>
      </div>
    );
  if (query.isError)
    return (
      <div className={styles.deadlinePanel}>
        <header className={styles.header}><h1 className={styles.title}>Deadlines</h1></header>
        <div className={styles.error} role="alert">
          <p>Deadlines could not be loaded. Today is still available.</p>
          <button className={styles.retry} type="button" onClick={() => void query.refetch.call(query)}>Retry</button>
        </div>
      </div>
    );

  const projection = query.data!;
  if (projection.total_item_count === 0)
    return (
      <div className={styles.deadlinePanel}>
        <header className={styles.header}>
          <h1 className={styles.title}>Deadlines</h1>
          <p className={styles.summary}>0 tasks</p>
        </header>
        <div className={styles.empty}>
          <p>
            No deadlines between{" "}
            <time dateTime={projection.range_start_local_date}>{projection.range_start_local_date}</time>{" "}
            and <time dateTime={projection.range_end_local_date}>{projection.range_end_local_date}</time>.
          </p>
        </div>
      </div>
    );

  return (
    <div className={styles.deadlinePanel}>
      <header className={styles.header}>
        <h1 className={styles.title}>Deadlines</h1>
        <p className={styles.summary}>{projection.total_item_count} tasks · {projection.range_start_local_date}–{projection.range_end_local_date}</p>
      </header>
      {projection.groups
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <section className={styles.deadlineGroup} key={group.state} aria-labelledby={`deadline-${group.state}`}>
            <h2 className={`${styles.deadlineHeading} ${group.state === "overdue" ? styles.overdueHeading : ""}`} id={`deadline-${group.state}`}>
              {groupHeadings[group.state]} · {group.item_count}
            </h2>
            <ul className={styles.list}>
              {group.items.map((item) => (
                <DeadlineRow
                  key={item.id}
                  item={item}
                  onOpenItem={onOpenItem}
                  onFocusPlanNavigate={onFocusPlanNavigate}
                />
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

function DeadlineRow({
  item,
  onOpenItem,
  onFocusPlanNavigate,
}: {
  item: DeadlineQueueItemView;
  onOpenItem: (request: {
    localDate: string;
    taskId: string | null;
    seriesId: string | null;
  }) => void;
  onFocusPlanNavigate?: ((planId: string) => void) | undefined;
}) {
  const scheduledLabel = new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
  }).format(new Date(`${item.scheduled_local_date}T12:00:00`));
  return (
    <li className={styles.row}>
      <div className={styles.time}>
        <time dateTime={item.deadline_local_date}>
          {item.deadline_local_date}
        </time>
      </div>
      <div className={styles.content}>
        <strong className={styles.rowTitle}>{item.title}</strong>
        {item.description && (
          <p className={styles.description}>{item.description}</p>
        )}
        <div className={styles.metadata}>
          <span>
            Scheduled <time dateTime={item.scheduled_local_date}>{item.scheduled_local_date}</time>{" "}
            {formatMinute(item.start_minute)}–{formatMinute(item.end_minute)}
          </span>
          <span><CategoryIcon iconKey={item.category_icon_key} label={`Category ${item.category_name}`} /> {item.category_name}</span>
          <span>Priority {item.priority}</span>
          {item.life_area && <span>{item.life_area.archived ? "Archived life area: " : "Life area: "}{item.life_area.breadcrumb}</span>}
          {item.focus_plan && (item.focus_plan.archived ? (
            <span>Archived Focus Plan: {item.focus_plan.title}</span>
          ) : (
            <button className={styles.focusPlan} type="button" aria-label={`Focus Plan: ${item.focus_plan.title}`} onClick={() => onFocusPlanNavigate?.(item.focus_plan!.id)}>
              Focus Plan: {item.focus_plan.title}
            </button>
          ))}
          {/* Stated in text, never colour alone. */}
          {item.scheduled_after_deadline && <span className={styles.needsReview}>Scheduled after deadline</span>}
        </div>
        <TagChipList tags={item.tags} />
      </div>
      <button
        className={styles.rowControl}
        type="button"
        onClick={() =>
          // Navigation targets the scheduled day, which is where the Task actually lives.
          onOpenItem({
            localDate: item.scheduled_local_date,
            taskId: item.id,
            seriesId: null,
          })
        }
        aria-label={`Open ${item.title}, scheduled ${scheduledLabel}, deadline ${item.deadline_local_date}`}
      >
        Open task
      </button>
    </li>
  );
}
