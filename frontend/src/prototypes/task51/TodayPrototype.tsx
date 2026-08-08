import { useMemo, useState } from "react";

import { Icon, type IconName } from "../../design-system/visual/icons";
import { Ambient } from "./Ambient";
import * as s from "./prototype.css";
import {
  dense,
  formatDuration,
  formatTime,
  lifePreview,
  periodOf,
  periods,
  populated,
  type PrototypeTask,
} from "./fixtures";

export type LockState =
  | "populated"
  | "selected"
  | "dense"
  | "empty"
  | "timer"
  | "dark-selected";

/*
 * Destinations are the *product's*, not the reference image's.
 *
 * The reference sidebar shows Today / Calendar / Focus Plans / Life System / Reader /
 * Narrative Canvas. Lifeweave's actual navigation is Today / Calendar / Analytics / Plans /
 * Life System / Settings, plus Search, and the activation prompt forbids changing keyboard
 * shortcut semantics without authorization — Ctrl+1..6 are bound to exactly these six.
 *
 * So the reference's *treatment* is adopted and its *contents* are not. Reader and Narrative Canvas
 * remain reachable inside Life System, where they actually live.
 */
const destinations: { id: string; label: string; icon: IconName }[] = [
  { id: "today", label: "Today", icon: "today" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
  { id: "plans", label: "Plans", icon: "plans" },
  { id: "life", label: "Life System", icon: "life" },
];

const checkIcon = (evaluation: PrototypeTask["evaluation"]): IconName =>
  evaluation === null ? "circle" : "checkCircle";

const evaluationLabel = (evaluation: PrototypeTask["evaluation"]) =>
  evaluation === null
    ? "Not evaluated"
    : evaluation === "completed"
      ? "Completed"
      : evaluation === "partial"
        ? "Partially completed"
        : "Missed";

function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <nav className={s.sidebar} aria-label="Primary navigation">
      <div className={s.brand}>
        <span className={s.brandMark} aria-hidden="true">
          <Icon name="life" size={14} />
        </span>
        {!collapsed && <span className={s.brandName}>Lifeweave</span>}
      </div>

      <div className={s.navGroup}>
        {destinations.map((destination) => (
          <button
            key={destination.id}
            type="button"
            className={s.navItem}
            aria-current={destination.id === "today" ? "page" : undefined}
            aria-label={destination.label}
          >
            <Icon name={destination.icon} className={s.navIcon} />
            {!collapsed && <span className={s.navLabel}>{destination.label}</span>}
          </button>
        ))}

        <div className={s.sidebarDivider} />

        <button type="button" className={s.navItem} aria-label="Search">
          <Icon name="search" className={s.navIcon} />
          {!collapsed && <span className={s.navLabel}>Search</span>}
        </button>
        <button type="button" className={s.navItem} aria-label="Settings">
          <Icon name="settings" className={s.navIcon} />
          {!collapsed && <span className={s.navLabel}>Settings</span>}
        </button>
      </div>

      {/*
        The reference puts a user avatar and name here. Lifeweave is local-first with no account,
        no login and no server — `AI_CONSTITUTION.md` §2 — so there is no identity to show and none
        is invented. The footer carries the two controls that genuinely belong to the shell.
      */}
      <div className={s.sidebarFooter}>
        <button type="button" className={s.bareButton} aria-label="Collapse sidebar">
          <Icon name="panelLeft" />
        </button>
        <button type="button" className={s.bareButton} aria-label="Switch to dark theme">
          <Icon name="moon" />
        </button>
      </div>
    </nav>
  );
}

function TaskRow({
  task,
  selected,
  onSelect,
}: {
  task: PrototypeTask;
  selected: boolean;
  onSelect: () => void;
}) {
  const done = task.evaluation === "completed" || task.evaluation === "partial";
  return (
    <div
      role="listitem"
      className={`${s.row} ${selected ? s.rowSelected : ""}`}
      tabIndex={0}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <button
        type="button"
        className={s.checkState[task.evaluation ?? "none"]}
        aria-label={`${evaluationLabel(task.evaluation)}: ${task.title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <Icon name={checkIcon(task.evaluation)} />
      </button>

      <span className={s.rowMain}>
        <span className={s.rowTitleLine}>
          <span className={`${s.rowTitle} ${done ? s.rowTitleDone : ""}`}>{task.title}</span>
          {task.focusPlan && (
            <span className={`${s.chip} ${s.chipAccent}`} title={task.focusPlan}>
              {task.focusPlan}
            </span>
          )}
        </span>

        {(task.lifeArea || task.deadline || task.recurring || task.tags?.length) && (
          <span className={s.rowMeta}>
            {task.lifeArea && <span className={s.chip}>{task.lifeArea}</span>}
            {task.deadline && (
              <span className={`${s.chip} ${task.deadline.state === "overdue" ? s.chipDanger : ""}`}>
                {task.deadline.state === "overdue"
                  ? "Deadline overdue"
                  : task.deadline.state === "due_today"
                    ? "Due today"
                    : "Deadline"}
                {" · "}
                {task.deadline.date}
              </span>
            )}
            {task.recurring && <span className={s.chip}>Repeats</span>}
            {task.tags?.map((tag) => (
              <span key={tag} className={s.chip}>
                #{tag}
              </span>
            ))}
          </span>
        )}
      </span>

      <span className={s.rowTail}>
        {task.actualTime?.running && (
          <span className={s.rowTimer}>
            <span className={s.timerDot} aria-hidden="true" />
            Running {formatDuration(task.actualTime.totalSeconds)}
          </span>
        )}
        {task.priority === "high" && (
          <span className={s.rowFlag} title="High priority">
            <Icon name="flagFilled" size={16} />
            <span hidden>High priority</span>
          </span>
        )}
        <span className={s.rowTime}>{formatTime(task.startMinute)}</span>
      </span>
    </div>
  );
}

function Inspector({ task }: { task: PrototypeTask }) {
  const [tab, setTab] = useState("note");

  /*
   * The tabs are the facets a Lifeweave Task actually has.
   *
   * The reference shows Note / Details / Subtasks 3/5 / Links 2. Lifeweave has no subtasks and no
   * task-to-task links, and spec §11 forbids inventing either to match a picture. "Links" is kept
   * because it maps to something real — the Life area and Focus Plan this task is linked to — and
   * "Subtasks" is replaced by "Time", which is a genuine Lifeweave facet (Task 43 actual-time
   * sessions) that the reference had no equivalent for.
   */
  const linkCount = (task.lifeArea ? 1 : 0) + (task.focusPlan ? 1 : 0);
  const tabs: { id: string; label: string; icon: IconName; count?: string | undefined }[] = [
    { id: "note", label: "Note", icon: "note" },
    { id: "details", label: "Details", icon: "details" },
    { id: "time", label: "Time", icon: "subtasks", count: task.actualTime ? formatDuration(task.actualTime.totalSeconds) : undefined },
    { id: "links", label: "Links", icon: "link", count: linkCount ? String(linkCount) : undefined },
  ];

  return (
    <aside className={s.inspector} aria-label="Task details">
      <div className={s.inspectorHeader}>
        <span className={s.inspectorContext}>
          <Icon name="plans" size={16} />
          {task.focusPlan ?? task.category}
        </span>
        <button type="button" className={s.bareButton} aria-label="More actions">
          <Icon name="more" />
        </button>
        <button type="button" className={s.bareButton} aria-label="Close details">
          <Icon name="dismiss" />
        </button>
      </div>

      <div className={s.inspectorScroll}>
        <h2 className={s.inspectorTitle}>
          {task.title}
          {task.priority === "high" && (
            <span className={s.rowFlag} title="High priority">
              <Icon name="flagFilled" size={18} />
            </span>
          )}
        </h2>

        <div className={s.tabs} role="tablist" aria-label="Task facets">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className={s.tab}
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
              {item.count && <span className={s.tabCount}>{item.count}</span>}
            </button>
          ))}
        </div>

        <p className={s.note}>{task.note ?? "No note yet."}</p>
        <ul className={s.noteList}>
          <li>Polish the Today view interactions</li>
          <li>Improve Life System relationship map</li>
          <li>Write help content for Focus Plans</li>
        </ul>

        <dl className={s.metaGrid}>
          <dt className={s.metaLabel}>
            <Icon name="flag" size={15} /> Priority
          </dt>
          <dd className={s.metaValue}>{task.priority === "high" ? "High" : "Normal"}</dd>

          <dt className={s.metaLabel}>
            <Icon name="today" size={15} /> Scheduled
          </dt>
          <dd className={s.metaValue}>
            {formatTime(task.startMinute)} – {formatTime(task.endMinute)}
          </dd>

          <dt className={s.metaLabel}>
            <Icon name="details" size={15} /> Category
          </dt>
          <dd className={s.metaValue}>{task.category}</dd>

          {task.lifeArea && (
            <>
              <dt className={s.metaLabel}>
                <Icon name="life" size={15} /> Life area
              </dt>
              <dd className={s.metaValue}>{task.lifeArea}</dd>
            </>
          )}

          {task.focusPlan && (
            <>
              <dt className={s.metaLabel}>
                <Icon name="plans" size={15} /> Focus Plan
              </dt>
              <dd className={s.metaValue}>{task.focusPlan}</dd>
            </>
          )}

          <dt className={s.metaLabel}>
            <Icon name="checkCircle" size={15} /> Status
          </dt>
          <dd className={s.metaValue}>{evaluationLabel(task.evaluation)}</dd>

          {task.actualTime && (
            <>
              <dt className={s.metaLabel}>
                <Icon name="subtasks" size={15} /> Time recorded
              </dt>
              <dd className={s.metaValue}>{formatDuration(task.actualTime.totalSeconds)}</dd>
            </>
          )}
        </dl>

        <section className={s.lifePreview} aria-label="Life System preview">
          <header className={s.lifePreviewHead}>
            Life System preview
            <button type="button" className={s.lifePreviewOpen}>
              Open <Icon name="chevronRight" size={14} />
            </button>
          </header>
          <div className={s.lifeCanvas}>
            <svg className={s.lifeEdges} viewBox="0 0 100 100" preserveAspectRatio="none">
              {lifePreview.edges.map(([from, to]) => {
                const a = lifePreview.nodes.find((n) => n.id === from)!;
                const b = lifePreview.nodes.find((n) => n.id === to)!;
                return <path key={`${from}-${to}`} d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} vectorEffect="non-scaling-stroke" />;
              })}
            </svg>
            {lifePreview.nodes.map((node) => (
              <span
                key={node.id}
                className={[
                  s.lifeNodeTone[node.tone],
                  s.lifeNodeAt[node.id],
                  node.id === "focus" ? s.lifeFocusNode : "",
                ].join(" ")}
              >
                {node.label}
              </span>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

export function TodayPrototype({ state }: { state: LockState }) {
  const showInspector = state === "selected" || state === "dark-selected" || state === "timer";
  const tasks = state === "empty" ? [] : state === "dense" || state === "timer" ? dense : populated;
  const [selectedId, setSelectedId] = useState<string | null>("t3");

  const grouped = useMemo(
    () => periods.map((p) => ({ ...p, tasks: tasks.filter((t) => periodOf(t) === p.id) })),
    [tasks],
  );

  const selected = tasks.find((t) => t.id === selectedId) ?? tasks.find((t) => t.note) ?? tasks[0];
  const density = state === "empty" ? "quiet" : state === "dense" || state === "timer" ? "dense" : "normal";
  const collapsed = false;

  const withInspector = showInspector && selected;

  return (
    <div className={`${s.shell} ${withInspector ? "" : s.shellNoInspector}`}>
      <Sidebar collapsed={collapsed} />

      <main className={s.workspace}>
        <Ambient density={density} />

        <div className={s.workspaceScroll}>
          <div className={s.workspaceContent}>
            <header className={s.pageHeader}>
              <div>
                <h1 className={s.pageTitle}>Today</h1>
                <p className={s.pageDate}>Saturday, August 8</p>
                <p className={s.pageSummary}>
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                  {tasks.length > 0 && " · 3 focus blocks"}
                </p>
              </div>
              <div className={s.dateNav}>
                <button type="button" className={s.bareButton} aria-label="Previous day">
                  <Icon name="chevronLeft" />
                </button>
                <button type="button" className={s.quietButton}>
                  Today
                </button>
                <button type="button" className={s.bareButton} aria-label="Open calendar">
                  <Icon name="calendar" />
                </button>
                <button type="button" className={s.bareButton} aria-label="Next day">
                  <Icon name="chevronRight" />
                </button>
              </div>
            </header>

            {tasks.length === 0 ? (
              <div className={s.empty}>
                <h2 className={s.emptyTitle}>Nothing scheduled</h2>
                <p className={s.emptyBody}>
                  A clear day. Plan a task when you are ready, or leave it open on purpose.
                </p>
              </div>
            ) : (
              grouped.map((period) => (
                <section key={period.id} className={s.period} aria-labelledby={`${period.id}-heading`}>
                  <h2 id={`${period.id}-heading`} className={s.periodHeading}>
                    <Icon
                      name={period.id === "evening" ? "moon" : "today"}
                      size={16}
                      className={s.periodIcon}
                    />
                    <span className={s.periodName}>{period.name}</span>
                    <span className={s.periodRange}>
                      {formatTime(period.start)} – {formatTime(period.end)}
                    </span>
                    <span className={s.periodCount}>{period.tasks.length}</span>
                  </h2>
                  <div className={s.rows} role="list" aria-label={`${period.name} tasks`}>
                    {period.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        selected={showInspector && task.id === selected?.id}
                        onSelect={() => setSelectedId(task.id)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>

        <footer className={s.workspaceFooter}>
          <span className={s.footerFacts}>
            <Icon name="plans" size={15} />3 focus blocks today · 9:00 AM · 1:00 PM · 7:00 PM
          </span>
          <button type="button" className={s.lifePreviewOpen}>
            Review day <Icon name="chevronRight" size={14} />
          </button>
        </footer>
      </main>

      {withInspector && <Inspector task={selected} />}
    </div>
  );
}
