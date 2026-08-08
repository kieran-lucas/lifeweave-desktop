import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";

import { spring, reduced } from "../../design-system/visual/motion.css";
import { Icon, type IconName } from "../../design-system/visual/icons";
import { beginInteraction, commitInteraction } from "./instrumentation";
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
  dragging,
  onSelect,
  onToggle,
  onDragStart,
}: {
  task: PrototypeTask;
  selected: boolean;
  dragging: boolean;
  /** Keyboard activation is instrumented on the same path as the pointer, so it takes any event. */
  onSelect: (event: React.SyntheticEvent) => void;
  onToggle: (event: React.MouseEvent) => void;
  onDragStart: (event: React.PointerEvent, id: string) => void;
}) {
  const done = task.evaluation === "completed" || task.evaluation === "partial";
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="listitem"
      /*
       * `layout` is Motion's layout projection: when this row's position changes because a sibling
       * left the list, it is animated with a transform rather than by interpolating `top` frame by
       * frame. That is what keeps a reflow on the compositor instead of in layout.
       */
      layout
      transition={reduce ? reduced.spring : spring.settle}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      className={`${s.row} ${selected ? s.rowSelected : ""} ${dragging ? s.rowDragging : ""}`}
      tabIndex={0}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      onPointerDown={(event) => onDragStart(event, task.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(event);
        }
      }}
    >
      <button
        type="button"
        className={s.checkState[task.evaluation ?? "none"]}
        aria-label={`${evaluationLabel(task.evaluation)}: ${task.title}`}
        onClick={onToggle}
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
    </motion.div>
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

  const reduce = useReducedMotion();
  return (
    /*
     * The inspector reads as the plane rebalancing, not a card appearing.
     *
     * `layout` lets Motion project the column's geometry with a transform instead of animating
     * `width` frame by frame, which would force layout on every frame of the open. The content
     * fades slightly behind the geometry so the panel does not appear to slide text in from
     * off-screen.
     */
    <motion.aside
      layout
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
      transition={reduce ? reduced.spring : spring.settle}
      className={s.inspector}
      aria-label="Task details"
    >
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
    </motion.aside>
  );
}

export function TodayPrototype({ state }: { state: LockState }) {
  const showInspector = state === "selected" || state === "dark-selected" || state === "timer";
  const source = state === "empty" ? [] : state === "dense" || state === "timer" ? dense : populated;
  const [selectedId, setSelectedId] = useState<string | null>("t3");
  const reduce = useReducedMotion();

  /*
   * Optimistic state (spec §8). Completion is held locally and applied immediately; in production
   * this is the optimistic projection over the TanStack Query cache, and the mutation reconciles
   * behind it. Nothing here waits for an animation, and the animation cannot prevent the change.
   */
  const [overrides, setOverrides] = useState<Record<string, PrototypeTask["evaluation"]>>({});
  const [hideCompleted, setHideCompleted] = useState(false);
  const [order, setOrder] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  /** `none` | `document` | `element` — see `changeDay`. Prototype-only measurement switch. */
  const viewTransition = useMemo(
    () => new URLSearchParams(location.search).get("vt") ?? "none",
    [],
  );

  const dayLabel = useMemo(() => {
    const base = new Date(2026, 7, 8);
    base.setDate(base.getDate() + dayOffset);
    return base.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }, [dayOffset]);

  const tasks = useMemo(() => {
    const applied = source.map((t) =>
      t.id in overrides ? { ...t, evaluation: overrides[t.id]! } : t,
    );
    const ordered = order
      ? [...applied].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
      : applied;
    return hideCompleted
      ? ordered.filter((t) => t.evaluation !== "completed" && t.evaluation !== "partial")
      : ordered;
  }, [source, overrides, order, hideCompleted]);

  /*
   * `useLayoutEffect` runs after React has mutated the DOM and before paint, which is the exact
   * boundary the "input → commit" metric wants. It deliberately does not wait for the animation.
   */
  useLayoutEffect(() => {
    commitInteraction();
    // `dayOffset` belongs here. Omitting it made the day-change measurement wait for the *next*
    // interaction's commit and report ~740 ms, which was read as a View Transition cost and was
    // not one. The correction and its consequences are recorded in `task-51-motion-lock.md` §6.
  }, [overrides, hideCompleted, selectedId, order, dayOffset]);

  const toggle = useCallback((task: PrototypeTask) => (event: React.MouseEvent) => {
    event.stopPropagation();
    beginInteraction("task-complete", event.timeStamp);
    setOverrides((current) => ({
      ...current,
      [task.id]: current[task.id] === "completed" || (!(task.id in current) && task.evaluation === "completed")
        ? null
        : "completed",
    }));
  }, []);

  const select = useCallback((task: PrototypeTask) => (event: React.SyntheticEvent) => {
    beginInteraction("row-select", event.timeStamp);
    setSelectedId(task.id);
  }, []);

  /*
   * Direct-manipulation probe.
   *
   * This is instrumentation for the motion contract, **not a proposed Today behaviour** — Today
   * orders rows by scheduled time and Task 51 changes no product semantics. It exists because the
   * gate requires measured drag responsiveness, and the surface that will actually use this contract
   * in production is the Life Edit tree, which already runs dnd-kit.
   *
   * The critical property being proven: a pointer move does *no* IPC, no query, and no database
   * work. It reorders an in-memory array and lets Motion's layout projection settle the transforms.
   */
  const dragState = useRef<{ id: string; startY: number } | null>(null);
  const onDragStart = useCallback((event: React.PointerEvent, id: string) => {
    if (event.button !== 0 || !event.altKey) return; // Alt-drag, so ordinary clicks stay ordinary.
    dragState.current = { id, startY: event.clientY };
    setDragId(id);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }, []);

  useEffect(() => {
    if (!dragId) return;
    const move = (event: PointerEvent) => {
      const drag = dragState.current;
      if (!drag) return;
      const delta = event.clientY - drag.startY;
      if (Math.abs(delta) < 40) return;
      drag.startY = event.clientY;
      setOrder((current) => {
        const ids = current ?? tasks.map((t) => t.id);
        const from = ids.indexOf(drag.id);
        const to = Math.max(0, Math.min(ids.length - 1, from + (delta > 0 ? 1 : -1)));
        if (from === to || from < 0) return current;
        const next = [...ids];
        next.splice(to, 0, next.splice(from, 1)[0]!);
        return next;
      });
    };
    const up = () => {
      dragState.current = null;
      setDragId(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragId, tasks]);

  const grouped = useMemo(
    () => periods.map((p) => ({ ...p, tasks: tasks.filter((t) => periodOf(t) === p.id) })),
    [tasks],
  );

  const selected = tasks.find((t) => t.id === selectedId) ?? tasks.find((t) => t.note) ?? tasks[0];
  const density = state === "empty" ? "quiet" : state === "dense" || state === "timer" ? "dense" : "normal";
  const collapsed = false;

  const withInspector = showInspector && selected;

  /*
   * The day change is the one bounded large-surface swap on this screen, so it is the one place a
   * native View Transition earns its cost (ADR 0045 §5).
   *
   * Only the day header and the timeline carry a `view-transition-name`; the sidebar and the
   * inspector do not, so they stay put and stay interactive rather than the whole document
   * cross-fading. It is feature-detected, and the fallback is simply to apply the state — the
   * change is never gated on the API existing.
   *
   * Element-scoped `element.startViewTransition` is probed separately in `capabilities()`; where it
   * is unavailable the document-scoped API is used with named elements, which is the supported way
   * to bound a transition today.
   */
  const timelineRef = useRef<HTMLDivElement>(null);

  /*
   * The day change is the one bounded large-surface swap on this screen, so it is the one place a
   * native View Transition could earn its cost (ADR 0045 §5).
   *
   * All three strategies are implemented and selected by `?vt=`, so the gate compares them on
   * measurement in a single run rather than on argument:
   *
   *     ?vt=none      (default) state commits, a keyed transform/opacity cross-fade follows
   *     ?vt=document  document.startViewTransition
   *     ?vt=element   Element.prototype.startViewTransition on the timeline subtree
   *
   * Reduced motion always takes the `none` path: a snapshot cross-fade is exactly the kind of
   * travel that preference asks to remove.
   */
  const changeDay = useCallback(
    (direction: -1 | 1, event: React.MouseEvent) => {
      beginInteraction("day-change", event.timeStamp);
      const apply = () => setDayOffset((current) => current + direction);

      if (reduce || viewTransition === "none") {
        apply();
        return;
      }
      if (viewTransition === "document") {
        const start = (document as Document & { startViewTransition?: (cb: () => void) => unknown })
          .startViewTransition;
        if (start) start.call(document, apply);
        else apply();
        return;
      }
      const element = timelineRef.current as
        | (HTMLDivElement & { startViewTransition?: (cb: () => void) => unknown })
        | null;
      if (element?.startViewTransition) element.startViewTransition(apply);
      else apply();
    },
    [reduce, viewTransition],
  );

  return (
    <div className={`${s.shell} ${withInspector ? "" : s.shellNoInspector}`}>
      <Sidebar collapsed={collapsed} />

      <main className={s.workspace}>
        <Ambient density={density} />

        <div className={s.workspaceScroll}>
          {/*
            The day change's continuity, without a snapshot. Keying on `dayOffset` gives the old
            timeline an exit and the new one an entrance, both on transform and opacity only, both
            interruptible, and neither able to delay the state that produced them.
          */}
          <motion.div
            key={dayOffset}
            className={s.workspaceContent}
            ref={timelineRef}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? reduced.spring : { duration: 0.19, ease: [0.2, 0, 0, 1] }}
          >
            <header className={`${s.pageHeader} ${s.vtHeader}`}>
              <div>
                <h1 className={s.pageTitle}>Today</h1>
                <p className={s.pageDate}>{dayLabel}</p>
                <p className={s.pageSummary}>
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                  {tasks.length > 0 && " · 3 focus blocks"}
                </p>
              </div>
              <div className={s.dateNav}>
                <button
                  type="button"
                  className={s.bareButton}
                  aria-label="Previous day"
                  onClick={(event) => changeDay(-1, event)}
                >
                  <Icon name="chevronLeft" />
                </button>
                <button type="button" className={s.quietButton} onClick={() => setDayOffset(0)}>
                  Today
                </button>
                <button
                  type="button"
                  className={s.quietButton}
                  aria-pressed={hideCompleted}
                  onClick={(event) => {
                    beginInteraction("hide-completed", event.timeStamp);
                    setHideCompleted((v) => !v);
                  }}
                >
                  {hideCompleted ? "Show all" : "Hide done"}
                </button>
                <button
                  type="button"
                  className={s.bareButton}
                  aria-label="Next day"
                  onClick={(event) => changeDay(1, event)}
                >
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
              <LayoutGroup>{grouped.map((period) => (
                <section
                  key={period.id}
                  className={`${s.period} ${period.id === "morning" ? s.vtTimeline : ""}`}
                  aria-labelledby={`${period.id}-heading`}
                >
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
                    <AnimatePresence initial={false}>
                      {period.tasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          selected={showInspector && task.id === selected?.id}
                          dragging={dragId === task.id}
                          onSelect={select(task)}
                          onToggle={toggle(task)}
                          onDragStart={onDragStart}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              ))}</LayoutGroup>
            )}
          </motion.div>
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

      <AnimatePresence>{withInspector && <Inspector task={selected} />}</AnimatePresence>
    </div>
  );
}
