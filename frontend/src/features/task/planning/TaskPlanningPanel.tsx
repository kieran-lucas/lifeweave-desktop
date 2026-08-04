import { useQuery } from "@tanstack/react-query";
import type { TaskPlanningItemView } from "../../../ipc/generated/TaskPlanningItemView";
import { getTaskPlanningProjection } from "../../../ipc/commands";
import { CategoryIcon } from "../categoryIcons";
import type { TaskWorkspaceMode } from "./TaskWorkspaceTabs";
import * as styles from "./TaskPlanning.css";
import { TagChipList } from "../../tag/TagChipList";

type PlanningMode = Exclude<TaskWorkspaceMode, "today">;
const formatMinute = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h${rest ? ` ${rest} min` : ""}` : `${rest} min`;
}

function dateLabel(value: string, anchor: string) {
  const [year, month, day] = value.split("-").map(Number);
  const [ay, am, ad] = anchor.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!, 12);
  const anchorDate = new Date(ay!, am! - 1, ad!, 12);
  const difference = Math.round((date.getTime() - anchorDate.getTime()) / 86_400_000);
  if (difference === 1) return "Tomorrow";
  if (difference === -1) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function TaskPlanningPanel({
  mode,
  anchorLocalDate,
  onOpenItem,
}: {
  mode: PlanningMode;
  anchorLocalDate: string;
  onOpenItem: (request: { localDate: string; taskId: string | null; seriesId: string | null }) => void;
}) {
  const query = useQuery({
    queryKey: ["task-planning", mode, anchorLocalDate],
    queryFn: () => getTaskPlanningProjection({ mode, anchor_local_date: anchorLocalDate }),
  });
  const name = mode === "upcoming" ? "Upcoming" : "Overdue";
  if (query.isLoading)
    return <p role="status" aria-live="polite">Loading {mode} tasks…</p>;
  if (query.isError)
    return (
      <div role="alert">
        <p>{name} tasks could not be loaded. Today is still available.</p>
        <button type="button" onClick={() => void query.refetch.call(query)}>Retry</button>
      </div>
    );
  const projection = query.data!;
  return (
    <div className={styles.panelBody}>
      <header>
        <h1 id={`${mode}-heading`}>{name}</h1>
        <p>{mode === "upcoming" ? "Next 14 days" : "Needs review from the last 30 days"}</p>
        <p>{projection.total_item_count} tasks · {duration(projection.scheduled_minutes)}</p>
      </header>
      {projection.groups.length === 0 ? (
        <div className={styles.empty}>
          <p>{mode === "upcoming" ? "No upcoming tasks in the next 14 days." : "No tasks need review from the last 30 days."}</p>
          <p>{mode === "upcoming" ? "Use Today or Calendar to schedule work." : "Past history remains available in Calendar and Analytics."}</p>
        </div>
      ) : projection.groups.map((group) => {
        const headingId = `planning-day-${mode}-${group.local_date}`;
        return (
          <section key={group.local_date} aria-labelledby={headingId} className={styles.dayGroup}>
            <h2 id={headingId}>{dateLabel(group.local_date, anchorLocalDate)}</h2>
            <ul className={styles.list}>
              {group.items.map((item) => (
                <PlanningRow key={item.id} item={item} mode={mode} onOpenItem={onOpenItem} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function PlanningRow({ item, mode, onOpenItem }: {
  item: TaskPlanningItemView;
  mode: PlanningMode;
  onOpenItem: (request: { localDate: string; taskId: string | null; seriesId: string | null }) => void;
}) {
  const action = mode === "upcoming" ? "Open day" : "Review";
  const labelDate = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(`${item.local_date}T12:00:00`));
  return (
    <li className={styles.row}>
      <div className={styles.time}>{formatMinute(item.start_minute)}–{formatMinute(item.end_minute)}</div>
      <div className={styles.content}>
        <strong>{item.title}</strong>
        {item.description && <p className={styles.description}>{item.description}</p>}
        <span><CategoryIcon iconKey={item.category_icon_key} label={`Category ${item.category_name}`} /> {item.category_name}</span>
        <span>Priority {item.priority}</span>
        {item.life_area && <span>{item.life_area.archived ? "Archived life area: " : "Life area: "}{item.life_area.breadcrumb}</span>}
        {item.kind === "recurring" && <span>Recurring</span>}
        {mode === "overdue" && <span className={styles.needsReview}>Needs review</span>}
        <TagChipList tags={item.tags} />
      </div>
      <button
        type="button"
        onClick={() => onOpenItem({
          localDate: item.local_date,
          taskId: item.kind === "one_off" ? item.id : null,
          seriesId: item.kind === "recurring" ? item.series_id : null,
        })}
        aria-label={`${action} for ${item.title}, ${labelDate}`}
      >{action}</button>
    </li>
  );
}
