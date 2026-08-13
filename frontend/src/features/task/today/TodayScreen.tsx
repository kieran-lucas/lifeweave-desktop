import { Suspense, lazy, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useModalFocusTrap } from "../../../app/useModalFocusTrap";
import type { TaskCategoryView } from "../../../ipc/generated/TaskCategoryView";
import type { TodayItemView } from "../../../ipc/generated/TodayItemView";
import type { CompletionStateView } from "../../../ipc/generated/CompletionStateView";
import type { TagSummaryView } from "../../../ipc/generated/TagSummaryView";
import {
  createRecurringTask,
  createTask,
  deleteTask,
  discardTaskActualTime,
  evaluateTask,
  getActiveTaskActualTime,
  listCompletionStates,
  listTaskCategories,
  listTodayItems,
  stopTaskActualTime,
  undoTaskEvaluation,
  updateRecurringOccurrence,
  updateTask,
} from "../../../ipc/commands";
import {
  addCalendarDays,
  calendarDateToDate,
  localToday as getLocalToday,
} from "../../calendar/date";
import { WeekStrip } from "../../calendar/WeekStrip";
import { AssessmentControl } from "../../completion/AssessmentControl";
import { TagChipList } from "../../tag/TagChipList";
import { invalidateTaskSavedViewProjections } from "../saved-views/savedViewQueries";
import { PageFrame } from "../../../app/layout/PageFrame";
import {
  DialogBackdrop,
  DialogSurface,
} from "../../../app/layout/DialogSurface";
import { EmptyState, LoadingRow, SkeletonList } from "../../../design-system/primitives/States";
import { iconToday } from "../../../design-system/visual/icons";
import * as styles from "./TodayScreen.css";

const ActiveTimerStrip = lazy(() =>
  import("./ActiveTimerStrip").then((module) => ({ default: module.ActiveTimerStrip })),
);
const LifeAreaCombobox = lazy(() =>
  import("../LifeAreaCombobox").then((module) => ({ default: module.LifeAreaCombobox })),
);
const FocusPlanCombobox = lazy(() =>
  import("../FocusPlanCombobox").then((module) => ({ default: module.FocusPlanCombobox })),
);
const TagPicker = lazy(() =>
  import("../../tag/TagPicker").then((module) => ({ default: module.TagPicker })),
);
const TaskTimeWheelPicker = lazy(() =>
  import("./TaskSchedulePickers").then((module) => ({ default: module.TaskTimeWheelPicker })),
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

type Draft = {
  title: string;
  description: string;
  local_date: string;
  start_minute: number;
  end_minute: number;
  category_id: string;
  priority: string;
  life_node_id: string | null;
  focus_plan_id: string | null;
  deadline_local_date: string | null;
  tag_ids: string[];
  selectedTags: TagSummaryView[];
};

type FocusRequest = {
  requestId: string;
  taskId: string | null;
  seriesId: string | null;
  originalLocalDate?: string | null;
} | null;

export const localToday = getLocalToday;
export const formatMinute = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

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

function defaultDraft(date: string, categoryId: string): Draft {
  return {
    title: "",
    description: "",
    local_date: date,
    start_minute: 480,
    end_minute: 540,
    category_id: categoryId,
    priority: "medium",
    life_node_id: null,
    focus_plan_id: null,
    deadline_local_date: null,
    tag_ids: [],
    selectedTags: [],
  };
}

function draftFromItem(item: TodayItem): Draft {
  return {
    title: item.title,
    description: item.description,
    local_date: item.local_date,
    start_minute: item.start_minute,
    end_minute: item.end_minute,
    category_id: item.category_id,
    priority: item.priority,
    life_node_id: item.life_area?.id ?? null,
    focus_plan_id: item.focus_plan?.id ?? null,
    deadline_local_date: item.deadline?.deadline_local_date ?? null,
    tag_ids: item.tags.map((tag) => tag.id),
    selectedTags: item.tags,
  };
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
  const dialog = useRef<HTMLFormElement>(null);
  const initialField = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const handledFocusRequest = useRef<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TodayItem | null>(null);
  const [draft, setDraft] = useState<Draft>(() => defaultDraft(date, "general"));
  const [repeat, setRepeat] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [openAssessment, setOpenAssessment] = useState<string | null>(null);
  const [error, setError] = useState("");
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
  const categories = useQuery({
    queryKey: ["task-categories"],
    queryFn: listTaskCategories,
    enabled: open && !editing,
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

  const refreshSchedule = async () => {
    await Promise.allSettled([
      client.invalidateQueries({ queryKey: ["today-items"] }),
      client.invalidateQueries({ queryKey: ["month-projection"] }),
      client.invalidateQueries({ queryKey: ["analytics"] }),
      client.invalidateQueries({ queryKey: ["task-planning"] }),
      client.invalidateQueries({ queryKey: ["deadline-queue"] }),
      invalidateTaskSavedViewProjections(client),
      client.invalidateQueries({ queryKey: ["life"] }),
      client.invalidateQueries({ queryKey: ["tags"] }),
    ]);
  };

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

  const save = useMutation({
    mutationFn: async () => {
      if (editing?.kind === "recurring") {
        return updateRecurringOccurrence({
          series_id: editing.series_id,
          original_local_date: editing.original_local_date,
          replacement_local_date: draft.local_date,
          title: draft.title,
          description: draft.description,
          category_id: draft.category_id,
          priority: draft.priority,
          start_minute: draft.start_minute,
          end_minute: draft.end_minute,
          scope: "only_this_occurrence",
          cancelled: false,
          frequency: null,
          interval: null,
          weekdays: null,
          until: null,
          count: null,
          life_node_id: draft.life_node_id,
          focus_plan_id: editing.focus_plan?.id ?? null,
          series_tag_ids: null,
        });
      }
      if (editing) return updateTask({ id: editing.id, ...draft });
      if (repeat) {
        const weekday = (new Date(`${draft.local_date}T12:00:00`).getDay() + 6) % 7;
        const { deadline_local_date: _deadline, ...recurringDraft } = draft;
        return createRecurringTask({
          ...recurringDraft,
          frequency: repeatFrequency,
          interval: 1,
          weekdays: repeatFrequency === "weekly" ? [weekday] : [],
          until: null,
          count: null,
        });
      }
      return createTask(draft);
    },
    onSuccess: async () => {
      await refreshSchedule();
      closeComposer();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to save task."),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (editing.kind === "recurring") {
        return updateRecurringOccurrence({
          series_id: editing.series_id,
          original_local_date: editing.original_local_date,
          replacement_local_date: null,
          title: null,
          description: null,
          category_id: null,
          priority: null,
          start_minute: null,
          end_minute: null,
          scope: "only_this_occurrence",
          cancelled: true,
          frequency: null,
          interval: null,
          weekdays: null,
          until: null,
          count: null,
          life_node_id: editing.life_area?.id ?? null,
          focus_plan_id: editing.focus_plan?.id ?? null,
          series_tag_ids: null,
        });
      }
      return deleteTask(editing.id);
    },
    onSuccess: async () => {
      await refreshSchedule();
      closeComposer();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to delete task."),
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

  useModalFocusTrap({
    container: dialog,
    initialFocus: initialField,
    onEscape: closeComposer,
    active: open,
  });

  function begin(item?: TodayItem, invoker?: HTMLElement) {
    returnFocus.current = invoker ?? document.activeElement as HTMLElement | null;
    setEditing(item ?? null);
    setDraft(item ? draftFromItem(item) : defaultDraft(date, "general"));
    setRepeat(false);
    setRepeatFrequency("weekly");
    setError("");
    setOpen(true);
  }

  function closeComposer() {
    setOpen(false);
    setEditing(null);
    setError("");
    queueMicrotask(() => returnFocus.current?.focus());
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!draft.title.trim()) {
      setError("Give this task a title.");
      return;
    }
    if (draft.start_minute >= draft.end_minute) {
      setError("End time must be after start time.");
      return;
    }
    save.mutate();
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
                    <strong>{formatMinute(item.start_minute)}</strong>
                    <span>{formatMinute(item.end_minute)}</span>
                  </div>

                  <div
                    className={styles.taskRow}
                    data-agenda-id={item.id}
                    role="group"
                    aria-label={`${item.title}. Double-click or press Enter to edit.`}
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
                      <strong>{item.title}</strong>
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
        <DialogBackdrop
          role="presentation"
          onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget && !save.isPending && !remove.isPending) {
              closeComposer();
            }
          }}
        >
          <DialogSurface
            as="form"
            width="wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-composer-heading"
            surfaceRef={dialog}
            onSubmit={submit}
          >
            <div className={styles.composer}>
              <header className={styles.composerHeader}>
                <div>
                  <span>{editing ? "Task" : "New task"}</span>
                  <h2 id="task-composer-heading">{editing ? "Edit the plan" : "Plan the moment"}</h2>
                </div>
                <button type="button" className={styles.closeButton} onClick={closeComposer} aria-label="Close task composer">×</button>
              </header>

              {error && <p role="alert" className={styles.composerError}>{error}</p>}

              <input
                ref={initialField}
                className={styles.titleField}
                aria-label="Task title"
                value={draft.title}
                placeholder="What needs your attention?"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />

              <div className={styles.scheduleBar}>
                <label className={styles.scheduleDateField}>
                  <span>Date</span>
                  <input aria-label="Task date" type="date" value={draft.local_date} onChange={(event) => setDraft((current) => ({ ...current, local_date: event.target.value }))} />
                </label>
                <Suspense fallback={null}>
                  <TaskTimeWheelPicker label="Start" value={draft.start_minute} onChange={(start_minute) => setDraft((current) => ({ ...current, start_minute }))} />
                  <TaskTimeWheelPicker label="End" value={draft.end_minute} onChange={(end_minute) => setDraft((current) => ({ ...current, end_minute }))} />
                </Suspense>
              </div>

              <div className={styles.detailsPanel}>
                  <label className={styles.detailFieldWide}>
                    <span>Notes</span>
                    <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Optional context" />
                  </label>

                  {!editing && (
                    <label className={styles.detailField}>
                      <span>Category</span>
                      <select value={draft.category_id} onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}>
                        {(categories.data ?? []).map((category: TaskCategoryView) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className={styles.detailField}>
                    <span>Priority</span>
                    <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>

                  <div className={styles.detailField}>
                    <Suspense fallback={<LoadingRow label="Loading Life areas…" />}>
                      <LifeAreaCombobox
                        value={draft.life_node_id}
                        current={editing?.life_area}
                        onChange={(life_node_id) => setDraft({ ...draft, life_node_id })}
                      />
                    </Suspense>
                  </div>

                  <div className={styles.detailField}>
                    <Suspense fallback={<LoadingRow label="Loading Focus Plans…" />}>
                      <FocusPlanCombobox
                        value={draft.focus_plan_id}
                        current={editing?.focus_plan}
                        disabled={editing?.kind === "recurring"}
                        disabledReason="The Focus Plan belongs to the recurring series."
                        onChange={(focus_plan_id) => setDraft({ ...draft, focus_plan_id })}
                      />
                    </Suspense>
                  </div>

                  <label className={styles.detailField}>
                    <span>Deadline</span>
                    <input
                      type="date"
                      disabled={editing?.kind === "recurring" || repeat}
                      value={draft.deadline_local_date ?? ""}
                      onChange={(event) => setDraft({ ...draft, deadline_local_date: event.target.value || null })}
                    />
                  </label>

                  {!editing && (
                    <label className={styles.detailField}>
                      <span>Repeat</span>
                      <select
                        value={repeat ? repeatFrequency : "none"}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === "none") setRepeat(false);
                          else {
                            setRepeat(true);
                            setRepeatFrequency(value as "daily" | "weekly" | "monthly");
                            setDraft((current) => ({ ...current, deadline_local_date: null }));
                          }
                        }}
                      >
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                  )}

                  <div className={styles.detailFieldWide}>
                    {editing?.kind === "recurring" ? (
                      <>
                        <span className={styles.fieldLabel}>Tags</span>
                        <TagChipList tags={editing.tags} maxVisible={12} />
                      </>
                    ) : (
                      <Suspense fallback={<LoadingRow label="Loading tags…" />}>
                        <TagPicker
                          selectedTags={draft.selectedTags}
                          onChange={(next) => setDraft({ ...draft, selectedTags: next, tag_ids: next.map((tag) => tag.id) })}
                          allowCreate
                        />
                      </Suspense>
                    )}
                  </div>
              </div>

              <footer className={styles.composerFooter}>
                {editing && (
                  <button
                    type="button"
                    className={styles.deleteButton}
                    disabled={save.isPending || remove.isPending}
                    onClick={() => remove.mutate()}
                  >
                    {remove.isPending ? "Deleting…" : "Delete"}
                  </button>
                )}
                <span className={styles.footerSpacer} />
                <button type="button" className={styles.cancelButton} onClick={closeComposer}>Cancel</button>
                <button className={styles.saveButton} type="submit" disabled={save.isPending || remove.isPending}>
                  {save.isPending ? "Saving…" : editing ? "Save changes" : "Add to day"}
                </button>
              </footer>
            </div>
          </DialogSurface>
        </DialogBackdrop>
      )}
    </>
  );
}
