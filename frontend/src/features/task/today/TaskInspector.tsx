import { useEffect, useRef, useState } from "react";

import {
  Icon,
  iconDetails,
  iconDismiss,
  iconFlag,
  iconLife,
  iconLink,
  iconNote,
  iconPlans,
  iconSubtasks,
  iconToday,
} from "../../../design-system/visual/icons";
import * as styles from "./TaskInspector.css";
import type { TodayItem } from "./TodayScreen";

/**
 * The Today context inspector, composed for Visual Baseline v2.
 *
 * It shares the workspace plane: no outer card, no panel fill, no shadow. The only separation is a
 * vertical hairline, which is what the v2 reference draws and what keeps the composition
 * continuous rather than panelled.
 *
 * **Facets are the ones a Lifeweave Task actually has.** The reference shows Note / Details /
 * Subtasks / Links, and Lifeweave has no subtasks and no task-to-task links. So "Subtasks" is
 * replaced by **Time** — a real facet backed by Task 43 actual-time sessions — and "Links" is kept
 * but remapped to the real relationships a Task carries: its Life area and its Focus Plan. Nothing
 * is invented to make a label match a picture.
 *
 * Every value rendered here already exists on the `TodayItem` projection the timeline reads, so the
 * inspector introduces no query, no IPC command and no new projection.
 */

const formatMinute = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type Facet = "note" | "details" | "time" | "links";

export function TaskInspector({
  item,
  focusOnOpen,
  onClose,
  onLifeNavigate,
  onFocusPlanNavigate,
}: {
  item: TodayItem;
  /** True when a keyboard action opened this; see the focus policy on `heading` below. */
  focusOnOpen: boolean;
  onClose: () => void;
  onLifeNavigate?: ((id: string) => void) | undefined;
  onFocusPlanNavigate?: ((id: string) => void) | undefined;
}) {
  const [facet, setFacet] = useState<Facet>("note");
  const root = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  /*
   * Bring the inspector into view when it opens *stacked*.
   *
   * `splitWorkspace` drops to a single column below 900px of container width, which puts the
   * inspector under the whole timeline. Measured at a 960x640 viewport, selecting a task then
   * highlighted the row and showed nothing — the detail was real, correctly ordered and entirely
   * off-screen, so selection looked like it had failed.
   *
   * The fix is a scroll, not a reorder. Task 50 stacks in DOM order precisely so reading and focus
   * order survive narrow widths, and CSS `order` would break that for a visual gain. `block:
   * "nearest"` is a no-op when the inspector is already beside the timeline, so the wide layout is
   * untouched, and the default instant behaviour respects reduced motion without a media query.
   */
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const stacked = node.getBoundingClientRect().top > window.innerHeight - 80;
    if (stacked) node.scrollIntoView({ block: "nearest" });

    /*
     * Focus follows the user's own modality.
     *
     * Keyboard selection moves focus to the heading, which carries `tabIndex={-1}` so it is a
     * programmatic target and never enters the tab order. Without this a keyboard user at a narrow
     * width scrolls the inspector into view while their focus stays on a row that just went
     * off-screen — the exact stranding the brief rules out.
     *
     * Pointer selection deliberately does not move focus: taking it would be a surprise, and the
     * inspector is contextual detail, not a dialog.
     */
    if (focusOnOpen) heading.current?.focus({ preventScroll: true });
  }, [item.id, focusOnOpen]);

  const linkCount = (item.life_area ? 1 : 0) + (item.focus_plan ? 1 : 0);
  /*
   * `total_completed_seconds` covers closed segments only — a running segment is deliberately not
   * folded in server-side so the client can tick it live. The inspector reports the closed total
   * and states the timer separately rather than inventing a combined number.
   */
  const recordedSeconds = Number(item.actual_time?.total_completed_seconds ?? 0);

  const facets: { id: Facet; label: string; d: string; count?: string | undefined }[] = [
    { id: "note", label: "Note", d: iconNote },
    { id: "details", label: "Details", d: iconDetails },
    ...(item.kind === "one_off" && item.actual_time
      ? [
          {
            id: "time" as const,
            label: "Time",
            d: iconSubtasks,
            ...(recordedSeconds > 0 ? { count: formatDuration(recordedSeconds) } : {}),
          },
        ]
      : []),
    {
      id: "links",
      label: "Links",
      d: iconLink,
      ...(linkCount > 0 ? { count: String(linkCount) } : {}),
    },
  ];

  return (
    /*
     * A labelled region, not a dialog. It is non-modal in both presentations, so it gets no
     * `role="dialog"`, no focus trap and no `aria-modal` — Escape simply closes it, which matches
     * the application's existing convention without pretending the surface is modal.
     */
    <aside
      ref={root}
      className={styles.inspector}
      aria-label={`Details for ${item.title}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className={styles.inspectorHeader}>
        <span className={styles.inspectorContext}>
          <Icon d={iconPlans} size={15} />
          {item.focus_plan?.title ?? item.category_name}
        </span>
        <button
          type="button"
          className={styles.inspectorClose}
          aria-label="Close details"
          onClick={onClose}
        >
          <Icon d={iconDismiss} size={16} />
        </button>
      </div>

      <h2 ref={heading} className={styles.inspectorTitle} tabIndex={-1}>
        {item.title}
      </h2>

      {/* Low-chrome inline navigation: text, an accent underline, and the hairline it sits on. */}
      <div className={styles.inspectorTabs} role="tablist" aria-label="Task facets">
        {facets.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            className={styles.inspectorTab}
            aria-selected={facet === entry.id}
            onClick={() => setFacet(entry.id)}
          >
            <Icon d={entry.d} size={15} />
            {entry.label}
            {entry.count && <span className={styles.inspectorTabCount}>{entry.count}</span>}
          </button>
        ))}
      </div>

      <div className={styles.inspectorBody}>
        {facet === "note" && (
          <p className={styles.inspectorNote}>
            {item.description?.trim() ? item.description : "No note yet."}
          </p>
        )}

        {facet === "details" && (
          <dl className={styles.metaGrid}>
            <dt className={styles.metaLabel}>
              <Icon d={iconToday} size={15} /> Scheduled
            </dt>
            <dd className={styles.metaValue}>
              {formatMinute(item.start_minute)}–{formatMinute(item.end_minute)}
            </dd>

            <dt className={styles.metaLabel}>
              <Icon d={iconDetails} size={15} /> Category
            </dt>
            <dd className={styles.metaValue}>{item.category_name}</dd>

            <dt className={styles.metaLabel}>
              <Icon d={iconFlag} size={15} /> Priority
            </dt>
            <dd className={styles.metaValue}>{item.priority}</dd>

            {item.deadline && (
              <>
                <dt className={styles.metaLabel}>
                  <Icon d={iconFlag} size={15} /> Deadline
                </dt>
                <dd className={styles.metaValue}>
                  <time dateTime={item.deadline.deadline_local_date}>
                    {item.deadline.deadline_local_date}
                  </time>
                  {item.deadline.state === "overdue" && " · Overdue"}
                  {item.deadline.state === "due_today" && " · Due today"}
                </dd>
              </>
            )}

            {item.kind === "recurring" && (
              <>
                <dt className={styles.metaLabel}>
                  <Icon d={iconDetails} size={15} /> Repeats
                </dt>
                <dd className={styles.metaValue}>Recurring occurrence</dd>
              </>
            )}
          </dl>
        )}

        {facet === "time" && item.actual_time && (
          <dl className={styles.metaGrid}>
            <dt className={styles.metaLabel}>
              <Icon d={iconSubtasks} size={15} /> Recorded
            </dt>
            <dd className={styles.metaValue}>
              {recordedSeconds > 0 ? formatDuration(recordedSeconds) : "None yet"}
            </dd>
            <dt className={styles.metaLabel}>
              <Icon d={iconToday} size={15} /> Timer
            </dt>
            <dd className={styles.metaValue}>
              {item.actual_time.active_session_id ? "Running" : "Stopped"}
            </dd>
          </dl>
        )}

        {facet === "links" && (
          <div className={styles.inspectorLinks}>
            {!item.life_area && !item.focus_plan && (
              <p className={styles.inspectorNote}>No Life area or Focus Plan linked.</p>
            )}
            {item.life_area &&
              (item.life_area.archived ? (
                <p className={styles.inspectorNote}>
                  Archived Life area: {item.life_area.title}
                </p>
              ) : (
                <button
                  type="button"
                  className={styles.inspectorLink}
                  aria-label={`Life area: ${item.life_area.title}. ${item.life_area.breadcrumb}`}
                  onClick={() => onLifeNavigate?.(item.life_area!.id)}
                >
                  <Icon d={iconLife} size={15} />
                  <span>
                    {item.life_area.title}
                    <span className={styles.inspectorLinkMeta}>{item.life_area.breadcrumb}</span>
                  </span>
                </button>
              ))}
            {item.focus_plan &&
              (item.focus_plan.archived ? (
                <p className={styles.inspectorNote}>
                  Archived Focus Plan: {item.focus_plan.title}
                </p>
              ) : (
                <button
                  type="button"
                  className={styles.inspectorLink}
                  aria-label={`Focus Plan: ${item.focus_plan.title}`}
                  onClick={() => onFocusPlanNavigate?.(item.focus_plan!.id)}
                >
                  <Icon d={iconPlans} size={15} />
                  <span>{item.focus_plan.title}</span>
                </button>
              ))}
          </div>
        )}
      </div>
    </aside>
  );
}
