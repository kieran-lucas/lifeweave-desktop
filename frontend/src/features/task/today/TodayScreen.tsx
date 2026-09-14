import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TodayItemView } from "../../../ipc/generated/TodayItemView";
import type { CompletionStateView } from "../../../ipc/generated/CompletionStateView";
import {
  discardTaskActualTime,
  evaluateTask,
  getActiveTaskActualTime,
  listCompletionStates,
  listTodayItems,
  stopTaskActualTime,
  undoTaskEvaluation,
} from "../../../ipc/commands";
import {
  addCalendarDays,
  calendarDateToDate,
  localToday as getLocalToday,
} from "../../calendar/date";
import { WeekStrip } from "../../calendar/WeekStrip";
import { AssessmentControl } from "../../completion/AssessmentControl";
import { invalidateTaskSavedViewProjections } from "../saved-views/savedViewQueries";
import { PageFrame } from "../../../app/layout/PageFrame";
import { EmptyState, LoadingRow, SkeletonList } from "../../../design-system/primitives/States";
import { iconToday } from "../../../design-system/visual/icons";
import * as styles from "./TodayScreen.css";
import { DeferredTaskComposer } from "./DeferredTaskComposer";

const ActiveTimerStrip = lazy(() =>
  import("./ActiveTimerStrip").then((module) => ({ default: module.ActiveTimerStrip })),
);
type CommonItem = Omit<
  TodayItemView,
  "kind" | "series_id" | "occurrence_id" | "original_local_date"
>;

export type TodayItem =
  | (CommonItem & {
      kind: "one_off";
      series_id: null;
      occurrence_id: null;
      original_local_date: null;
    })
  | (CommonItem & {
      kind: "recurring";
      series_id: string;
      occurrence_id: string;
      original_local_date: string;
    });

type FocusRequest = {
  requestId: string;
  taskId: string | null;
  seriesId: string | null;
  originalLocalDate?: string | null;
} | null;

export const localToday = getLocalToday;
export const formatMinute = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

type TaskPriority = "low" | "medium" | "high";

const normalizePriority = (priority: string): TaskPriority => {
  if (priority === "high" || priority === "low") return priority;
  return "medium";
};

const priorityLabel = (priority: string) => {
  const normalized = normalizePriority(priority);
  return normalized[0]!.toUpperCase() + normalized.slice(1);
};

const newOperationId = () => globalThis.crypto.randomUUID();
const todayItemsKey = (localDate: string, observedLocalDate: string) =>
  ["today-items", localDate, observedLocalDate] as const;

function normalize(value: TodayItemView): TodayItem {
  if (
    value.kind === "recurring" &&
    value.series_id &&
    value.occurrence_id &&
    value.original_local_date
  ) {
    return {
      ...value,
      kind: "recurring",
      series_id: value.series_id,
      occurrence_id: value.occurrence_id,
      original_local_date: value.original_local_date,
    };
  }
  return {
    ...value,
    kind: "one_off",
    series_id: null,
    occurrence_id: null,
    original_local_date: null,
  };
}

function headingForDate(value: string, today: string) {
  if (value === today) return "Today";
  if (value === addCalendarDays(today, 1)) return "Tomorrow";
  if (value === addCalendarDays(today, -1)) return "Yesterday";
  return new Intl.DateTimeFormat(navigator.language || "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(calendarDateToDate(value));
}

function matchesFocus(item: TodayItem, request: NonNullable<FocusRequest>) {
  return (
    (request.taskId !== null && item.id === request.taskId) ||
    (request.seriesId !== null &&
      item.series_id === request.seriesId &&
      (request.originalLocalDate == null || item.original_local_date === request.originalLocalDate))
  );
}

export function TodayScreen({
  selectedDate,
  onSelectedDateChange,
  focusRequest,
  onFocusRequestSettled,
  onLifeNavigate,
  onFocusPlanNavigate,
  anchorLocalDate,
}: {
  selectedDate?: string;
  onSelectedDateChange?: (date: string) => void;
  focusRequest?: FocusRequest;
  onFocusRequestSettled?: (requestId: string) => void;
  onLifeNavigate?: (nodeId: string) => void;
  onFocusPlanNavigate?: (planId: string) => void;
  anchorLocalDate?: string;
} = {}) {
  const today = anchorLocalDate ?? localToday();
  const [standaloneDate, setStandaloneDate] = useState(today);
  const date = selectedDate ?? standaloneDate;
  const selectDate = (value: string) =>
    onSelectedDateChange ? onSelectedDateChange(value) : setStandaloneDate(value);

  const client = useQueryClient();
  const returnFocus = useRef<HTMLElement | null>(null);
  const handledFocusRequest = useRef<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TodayItem | null>(null);
  const [openAssessment, setOpenAssessment] = useState<string | null>(null);
  const [assessmentError, setAssessmentError] = useState("");
  const [lastOperation, setLastOperation] = useState<{
    itemId: string;
    localDate: string;
    observedLocalDate: string;
    operationId: string;
  } | null>(null);
  const [timerError, setTimerError] = useState("");

  const items = useQuery({
    queryKey: todayItemsKey(date, today),
    queryFn: async () => (await listTodayItems(date, today)).map(normalize),
  });
  const completionStates = useQuery({
    queryKey: ["completion-states"],
    queryFn: listCompletionStates,
  });
  const activeTimer = useQuery({
    queryKey: ["task-actual-time-active"],
    queryFn: getActiveTaskActualTime,
  });

  const ordered = useMemo(
    () => [...(items.data ?? [])].sort((a, b) => a.start_minute - b.start_minute || a.end_minute - b.end_minute),
    [items.data],
  );

  const scheduledMinutes = useMemo(
    () => ordered.reduce((sum, item) => sum + Math.max(0, item.end_minute - item.start_minute), 0),
    [ordered],
  );

  const refreshActualTime = async () => {
    await Promise.allSettled([
      client.invalidateQueries({ queryKey: ["task-actual-time-active"] }),
      client.invalidateQueries({ queryKey: ["today-items"] }),
      client.invalidateQueries({ queryKey: ["analytics"] }),
    ]);
  };

  const timer = useMutation({
    mutationFn: (work: () => Promise<unknown>) => work(),
    onMutate: () => setTimerError(""),
    onSuccess: refreshActualTime,
    onError: (cause) =>
      setTimerError(cause instanceof Error ? cause.message : "The timer could not be updated."),
  });

  const assessment = useMutation({
    mutationFn: async ({ item, state, operationId }: { item: TodayItem; state: CompletionStateView; operationId: string }) => {
      const now = new Date();
      return evaluateTask({
        subject_kind: item.kind,
        task_id: item.kind === "one_off" ? item.id : null,
        series_id: item.kind === "recurring" ? item.series_id : null,
        original_local_date: item.kind === "recurring" ? item.original_local_date : null,
        state_id: state.id,
        operation_id: operationId,
        observed_local_date: localToday(),
        observed_local_minute: now.getHours() * 60 + now.getMinutes(),
      });
    },
    onMutate: async ({ item, state, operationId }) => {
      setAssessmentError("");
      setOpenAssessment(null);
      const key = todayItemsKey(item.local_date, today);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<TodayItem[]>(key);
      client.setQueryData<TodayItem[]>(key, (current) =>
        current?.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                evaluation: {
                  state_id: state.id,
                  label: state.label,
                  visual_token: state.visual_token,
                  evaluated_at: "",
                  operation_id: operationId,
                },
              }
            : entry,
        ),
      );
      return { previous, localDate: item.local_date, observedLocalDate: today };
    },
    onError: (cause, _variables, context) => {
      if (context) {
        client.setQueryData(todayItemsKey(context.localDate, context.observedLocalDate), context.previous);
      }
      setAssessmentError(cause instanceof Error ? cause.message : "Unable to save assessment.");
    },
    onSuccess: async (value, variables) => {
      client.setQueryData<TodayItem[]>(todayItemsKey(variables.item.local_date, today), (current) =>
        current?.map((entry) => (entry.id === variables.item.id ? { ...entry, evaluation: value } : entry)),
      );
      setLastOperation({
        itemId: variables.item.id,
        localDate: variables.item.local_date,
        observedLocalDate: today,
        operationId: value.operation_id,
      });
      await Promise.allSettled([
        client.invalidateQueries({ queryKey: ["month-projection"] }),
        client.invalidateQueries({ queryKey: ["analytics"] }),
        client.invalidateQueries({ queryKey: ["task-planning"] }),
        client.invalidateQueries({ queryKey: ["deadline-queue"] }),
        invalidateTaskSavedViewProjections(client),
      ]);
    },
  });

  const undoAssessment = useMutation({
    mutationFn: (operationId: string) => undoTaskEvaluation({ operation_id: operationId }),
    onSuccess: async (value) => {
      if (lastOperation) {
        client.setQueryData<TodayItem[]>(
          todayItemsKey(lastOperation.localDate, lastOperation.observedLocalDate),
          (current) =>
            current?.map((entry) =>
              entry.id === lastOperation.itemId ? { ...entry, evaluation: value } : entry,
            ),
        );
      }
      setLastOperation(null);
      await Promise.allSettled([
        client.invalidateQueries({ queryKey: ["month-projection"] }),
        client.invalidateQueries({ queryKey: ["analytics"] }),
        client.invalidateQueries({ queryKey: ["task-planning"] }),
        client.invalidateQueries({ queryKey: ["deadline-queue"] }),
        invalidateTaskSavedViewProjections(client),
      ]);
    },
    onError: (cause) => setAssessmentError(cause instanceof Error ? cause.message : "Unable to undo assessment."),
  });

  useEffect(() => {
    if (!lastOperation) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      ) return;
      event.preventDefault();
      if (!undoAssessment.isPending) undoAssessment.mutate(lastOperation.operationId);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastOperation?.operationId, undoAssessment.isPending]);

  useEffect(() => {
    if (!focusRequest || items.isFetching || !items.data) return;
    if (handledFocusRequest.current === focusRequest.requestId) return;
    const item = items.data.find((entry) => matchesFocus(entry, focusRequest));
    if (item) {
      const target = document.querySelector<HTMLElement>(`[data-agenda-id="${item.id}"]`);
      target?.scrollIntoView({ block: "nearest" });
      target?.focus({ preventScroll: true });
    }
    handledFocusRequest.current = focusRequest.requestId;
    onFocusRequestSettled?.(focusRequest.requestId);
  }, [focusRequest, items.data, items.isFetching, onFocusRequestSettled]);

  function begin(item?: TodayItem, invoker?: HTMLElement) {
    returnFocus.current = invoker ?? document.activeElement as HTMLElement | null;
    setEditing(item ?? null);
    setOpen(true);
  }

  function closeComposer() {
    setOpen(false);
    setEditing(null);
    queueMicrotask(() => returnFocus.current?.focus());
  }

  const clock = new Date();
  const clockMinute = clock.getHours() * 60 + clock.getMinutes();

  return (
    <>
      <PageFrame as="section" type="wide" aria-labelledby="today-heading">
      <div className={styles.dayShell}>
        <header className={styles.masthead}>
          <div className={styles.headingBlock}>
            <span className={styles.kicker}>{date === today ? "Current day" : date}</span>
            <h1 id="today-heading" className={styles.dayTitle} tabIndex={-1}>
              {headingForDate(date, today)}
            </h1>
            <p className={styles.daySummary}>
              {ordered.length} {ordered.length === 1 ? "task" : "tasks"} · {Math.round(scheduledMinutes / 60 * 10) / 10}h planned
            </p>
          </div>
          <button className={styles.planButton} type="button" onClick={(event) => begin(undefined, event.currentTarget)}>
            Plan task
          </button>
        </header>

        <WeekStrip selectedDate={date} today={today} onSelectDate={selectDate} />

        {activeTimer.data && (
          <Suspense fallback={<LoadingRow label="Loading timer…" />}>
            <ActiveTimerStrip
              active={activeTimer.data}
              pending={timer.isPending}
              onStop={() => timer.mutate(() => stopTaskActualTime({ session_id: activeTimer.data!.session_id }))}
              onDiscard={() => timer.mutate(() => discardTaskActualTime({ session_id: activeTimer.data!.session_id }))}
            />
          </Suspense>
        )}

        {(timerError || assessmentError) && (
          <p className={styles.inlineError} role="alert">{timerError || assessmentError}</p>
        )}

        <div className={styles.agenda}>
          {items.isLoading ? (
            <SkeletonList rows={6} label="Loading tasks…" />
          ) : items.isError ? (
            <p role="alert">Unable to load tasks.</p>
          ) : ordered.length === 0 ? (
            <EmptyState
              compact
              icon={iconToday}
              iconTone="neutral"
              title="The day is open."
              body="Plan only what deserves a place on the timeline."
            />
          ) : (
            <ol className={styles.agendaList} aria-label={`Tasks for ${date}`}>
              {ordered.map((item) => (
                <li
                  key={item.id}
                  className={styles.agendaItem}
                  data-completed={(item.evaluation && item.evaluation.visual_token !== "none") || undefined}
                >
                  <div className={styles.timeRail} aria-hidden="true">
                    <strong className={styles.timeValue}>{formatMinute(item.start_minute)}</strong>
                    <span className={styles.timeValue}>{formatMinute(item.end_minute)}</span>
                  </div>

                  <div
                    className={styles.taskRow}
                    data-agenda-id={item.id}
                    role="group"
                    aria-label={`${item.title}. Priority: ${priorityLabel(item.priority)}. Double-click or press Enter to edit.`}
                    tabIndex={0}
                    onDoubleClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest("button, a, input, select, textarea, [role='option']")) return;
                      begin(item, event.currentTarget);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && event.target === event.currentTarget) {
                        event.preventDefault();
                        begin(item, event.currentTarget);
                      }
                    }}
                  >
                    <div className={styles.taskCopy}>
                      <div className={styles.taskTitleLine}>
                        <strong>{item.title}</strong>
                        <span
                          className={styles.priorityBadge}
                          data-priority={normalizePriority(item.priority)}
                          data-task-priority
                        >
                          <svg
                            className={styles.priorityMeter}
                            viewBox="0 0 11 10"
                            width="11"
                            height="10"
                            shapeRendering="crispEdges"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <rect x="0" y="6" width="3" height="4" />
                            <rect x="4" y="3" width="3" height="7" />
                            <rect x="8" y="1" width="3" height="9" />
                          </svg>
                          <span className={styles.priorityText}>{priorityLabel(item.priority)}</span>
                        </span>
                      </div>
                      {item.description.trim() && (
                        <p className={styles.taskDescription}>{item.description}</p>
                      )}
                      <div className={styles.taskMeta}>
                        {item.life_area && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onLifeNavigate?.(item.life_area!.id);
                            }}
                          >
                            {item.life_area.title}
                          </button>
                        )}
                        {item.focus_plan && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onFocusPlanNavigate?.(item.focus_plan!.id);
                            }}
                          >
                            {item.focus_plan.title}
                          </button>
                        )}
                        {item.deadline && <span>Due {item.deadline.deadline_local_date}</span>}
                        {item.kind === "recurring" && <span>Repeats</span>}
                      </div>
                    </div>

                    <div className={styles.assessmentSlot}>
                      <AssessmentControl
                        itemId={item.id}
                        states={completionStates.data ?? []}
                        evaluation={item.evaluation}
                        eligible={
                          item.local_date < today ||
                          (item.local_date === today && item.end_minute <= clockMinute)
                        }
                        unavailableReason={
                          item.kind === "one_off" && item.actual_time?.active_session_id
                            ? "Resolve the earlier running session before assessing this task"
                            : null
                        }
                        open={openAssessment === item.id}
                        onOpen={() => setOpenAssessment(item.id)}
                        onClose={() => setOpenAssessment(null)}
                        onSelect={(state) =>
                          assessment.mutate({ item, state, operationId: newOperationId() })
                        }
                      />
                    </div>

                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      </PageFrame>

      {open && (
        <DeferredTaskComposer date={date} today={today} editing={editing} onClose={closeComposer} />
      )}
    </>
  );
}
