import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useModalFocusTrap } from "../../../app/useModalFocusTrap";
import type { OccurrenceEditScope } from "../../../ipc/generated/OccurrenceEditScope";
import type { TaskCategoryView } from "../../../ipc/generated/TaskCategoryView";
import type { TodayItemView } from "../../../ipc/generated/TodayItemView";
import {
  createRecurringTask,
  createTask,
  deleteTask,
  listTaskCategories,
  listTodayItems,
  updateRecurringOccurrence,
  updateTask,
} from "../../../ipc/commands";
import {
  discardTaskActualTime,
  evaluateTask,
  getActiveTaskActualTime,
  listCompletionStates,
  startTaskActualTime,
  stopTaskActualTime,
  undoTaskEvaluation,
} from "../../../ipc/commands";
import { ActualTimeRowControl } from "./ActualTimeRowControl";
import { formatElapsed } from "./actualTime";
import type { CompletionStateView } from "../../../ipc/generated/CompletionStateView";
import { localToday as getLocalToday } from "../../calendar/date";
import { WeekStrip } from "../../calendar/WeekStrip";
import { CategoryIcon } from "../categoryIcons";
import { AssessmentControl } from "../../completion/AssessmentControl";
import * as styles from "./TodayScreen.css";
import * as layout from "../../../app/layout/layout.css";
import { PageFrame, PageHeader } from "../../../app/layout/PageFrame";
import {
  DialogBackdrop,
  DialogFooter,
  DialogHeader,
  DialogSurface,
} from "../../../app/layout/DialogSurface";
import { LifeAreaCombobox } from "../LifeAreaCombobox";
import { FocusPlanCombobox } from "../FocusPlanCombobox";
import { TaskWorkspaceTabs, type TaskWorkspaceMode } from "../planning/TaskWorkspaceTabs";
import { TagChipList } from "../../tag/TagChipList";
import { TagPicker } from "../../tag/TagPicker";
import type { TagSummaryView } from "../../../ipc/generated/TagSummaryView";
import { invalidateTaskSavedViewProjections } from "../saved-views/savedViewQueries";
import { iconToday } from "../../../design-system/visual/icons";
import { EmptyState, LoadingRow, SkeletonList } from "../../../design-system/primitives/States";

/*
 * The inspector mounts only when a task is selected, so it stays out of the Today startup chunk.
 * Eagerly imported it cost 8,835 bytes and pushed `index.js` 6,948 bytes past its locked ceiling.
 */
const TaskInspector = lazy(() =>
  import("./TaskInspector").then((module) => ({ default: module.TaskInspector })),
);
const TaskPlanningPanel = lazy(() => import("../planning/TaskPlanningPanel"));
const DeadlineQueuePanel = lazy(() => import("../planning/DeadlineQueuePanel"));
const TaskSavedViewsPanel = lazy(() => import("../saved-views/TaskSavedViewsPanel"));
// Only mounted while a timer is actually running, so it stays out of the startup chunk.
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
const periods = [
  { name: "Morning", start: 240, end: 720 },
  { name: "Afternoon", start: 720, end: 1080 },
  { name: "Evening", start: 1080, end: 1440 },
];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const localToday = getLocalToday;
export const formatMinute = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const newOperationId = () => globalThis.crypto.randomUUID();
// The Today cache entry is identified by BOTH the viewed day and the observed anchor, because
// deadline state is derived from the anchor. Every read and write must use this exact key or a
// mutation will update a different entry than the one Today renders.
const todayItemsKey = (localDate: string, observedLocalDate: string) =>
  ["today-items", localDate, observedLocalDate] as const;
function normalize(value: TodayItemView): TodayItem {
  if (
    value.kind === "recurring" &&
    value.series_id &&
    value.occurrence_id &&
    value.original_local_date
  )
    return {
      ...value,
      kind: "recurring",
      series_id: value.series_id,
      occurrence_id: value.occurrence_id,
      original_local_date: value.original_local_date,
    };
  return {
    ...value,
    kind: "one_off",
    series_id: null,
    occurrence_id: null,
    original_local_date: null,
  };
}
function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const value = new Date(y!, m! - 1, d! + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
function previewDates(
  date: string,
  frequency: string,
  interval: number,
  selected: number[],
  endMode: string,
  count: number,
  until: string,
) {
  const out: string[] = [];
  const limit = endMode === "count" ? Math.min(5, Math.max(0, count)) : 5;
  for (let n = 0; n < 366 && out.length < limit; n++) {
    const candidate = addDays(date, n);
    if (endMode === "until" && candidate > until) break;
    if (frequency === "daily" && n % interval === 0) out.push(candidate);
    else if (frequency === "weekly") {
      const day = (new Date(`${candidate}T12:00:00`).getDay() + 6) % 7;
      if (Math.floor(n / 7) % interval === 0 && selected.includes(day))
        out.push(candidate);
    } else if (frequency === "monthly") {
      const [, , baseDay] = date.split("-").map(Number);
      const [cy, cm, cd] = candidate.split("-").map(Number);
      const [sy, sm] = date.split("-").map(Number);
      if (cd === baseDay && ((cy! - sy!) * 12 + cm! - sm!) % interval === 0)
        out.push(candidate);
    }
  }
  return out;
}
function TimeWheel({
  name,
  value,
  onChange,
  end = false,
}: {
  name: string;
  value: number;
  onChange: (n: number) => void;
  end?: boolean;
}) {
  const hour = Math.floor(value / 60),
    minute = value % 60;
  // Hour and minute are one compact sub-control pair inside their own bounded group, which §11.2
  // allows to share a line. The group itself is a single field unit on the form grid.
  return (
    <div role="group" aria-label={`${name} time`} className={layout.field}>
      <span>{name}</span>
      <div className={styles.wheel}>
        <label className={styles.wheelPart}>
          <span className={styles.srOnly}>{name} hour</span>
          <select
            className={layout.fieldControl}
            aria-label={`${name} hour`}
            value={hour}
            onChange={(e) => onChange(Number(e.target.value) * 60 + minute)}
          >
            {Array.from({ length: end ? 21 : 20 }, (_, i) => i + 4).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
        <span aria-hidden="true">:</span>
        <label className={styles.wheelPart}>
          <span className={styles.srOnly}>{name} minute</span>
          <select
            className={layout.fieldControl}
            aria-label={`${name} minute`}
            value={minute}
            onChange={(e) => onChange(hour * 60 + Number(e.target.value))}
          >
            {Array.from({ length: 60 }, (_, m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

type FocusRequest = {
  requestId: string;
  taskId: string | null;
  seriesId: string | null;
  originalLocalDate?: string | null;
} | null;
function findTodayTarget(
  taskId: string | null,
  seriesId: string | null,
  originalLocalDate?: string | null,
): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>("[data-task-id],[data-series-id]")].find(
      (element) =>
        (taskId !== null && element.dataset.taskId === taskId) ||
        (seriesId !== null &&
          element.dataset.seriesId === seriesId &&
          (originalLocalDate == null ||
            element.dataset.originalLocalDate === originalLocalDate)),
    ) ?? null
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
  onFocusPlanNavigate?: ((planId: string) => void) | undefined;
  anchorLocalDate?: string;
} = {}) {
  const today = anchorLocalDate ?? localToday(),
    [standaloneDate, setStandaloneDate] = useState(today),
    date = selectedDate ?? standaloneDate,
    client = useQueryClient(),
    trigger = useRef<HTMLButtonElement>(null),
    dialog = useRef<HTMLDivElement>(null),
    dialogInitial = useRef<HTMLInputElement>(null),
    returnFocus = useRef<HTMLElement | null>(null);
  const planningAnchor = anchorLocalDate ?? today;
  const [workspaceMode, setWorkspaceMode] = useState<TaskWorkspaceMode>("today");
  const [internalFocusRequest, setInternalFocusRequest] = useState<FocusRequest>(null);
  const handledInternalFocusRequest = useRef<string | null>(null);
  const handledExternalFocusRequest = useRef<string | null>(null);
  const preparedExternalFocusRequest = useRef<string | null>(null);
  const selectDate = (value: string) =>
    onSelectedDateChange
      ? onSelectedDateChange(value)
      : setStandaloneDate(value);
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<TodayItem | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState(""),
    [recurring, setRecurring] = useState(false),
    [frequency, setFrequency] = useState("daily"),
    [interval, setInterval] = useState(1),
    [selectedDays, setSelectedDays] = useState<number[]>([]),
    [endMode, setEndMode] = useState("never"),
    [count, setCount] = useState(5),
    [until, setUntil] = useState(date),
    [scope, setScope] = useState<OccurrenceEditScope>("only_this_occurrence");
  // True whenever the open editor is producing recurring work, in either direction.
  const isRecurringDraft = editing?.kind === "recurring" || recurring;
  const [draft, setDraft] = useState<Draft>({
    title: "",
    description: "",
    local_date: date,
    start_minute: 480,
    end_minute: 540,
    category_id: "general",
    priority: "medium",
    life_node_id: null,
    focus_plan_id: null,
    deadline_local_date: null,
    tag_ids: [],
    selectedTags: [],
  });
  const [openFan, setOpenFan] = useState<string | null>(null),
    [assessmentError, setAssessmentError] = useState(""),
    [lastOperation, setLastOperation] = useState<{
      itemId: string;
      localDate: string;
      observedLocalDate: string;
      operationId: string;
    } | null>(null);
  const [timerError, setTimerError] = useState(""), [timerNotice, setTimerNotice] = useState("");
  // Independent of the viewed date on purpose: the running task may be scheduled on another day.
  const activeTimer = useQuery({ queryKey: ["task-actual-time-active"], queryFn: getActiveTaskActualTime });
  const items = useQuery({
      queryKey: todayItemsKey(date, today),
      queryFn: async () => (await listTodayItems(date, today)).map(normalize),
    }),
    categories = useQuery({
      queryKey: ["task-categories"],
      queryFn: listTaskCategories,
    }),
    completionStates = useQuery({
      queryKey: ["completion-states"],
      queryFn: listCompletionStates,
    });
  const recurrenceInput = {
    frequency,
    interval,
    weekdays: selectedDays,
    until: endMode === "until" ? until : null,
    count: endMode === "count" ? count : null,
  };
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
    onMutate: () => { setTimerError(""); setTimerNotice(""); },
    onSuccess: async (_result, _work, context) => {
      await refreshActualTime();
      setTimerNotice(typeof context === "string" ? context : "");
    },
    onError: (error) =>
      setTimerError(
        typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : "The timer could not be updated.",
      ),
  });
  const runTimer = (notice: string, work: () => Promise<unknown>) =>
    timer.mutate(work, { onSuccess: async () => { await refreshActualTime(); setTimerNotice(notice); } });
  const save = useMutation({
    mutationFn: async () => {
      // Recurring work owns no deadline in Task 38. Stripping it here means a one-off draft
      // can never leak a deadline onto a series when the editor switches modes.
      const { deadline_local_date: _recurringHasNoDeadline, ...recurringDraft } = draft;
      if (editing?.kind === "recurring")
        return updateRecurringOccurrence({
          series_id: editing.series_id,
          original_local_date: editing.original_local_date,
          replacement_local_date: draft.local_date,
          ...recurringDraft,
          scope,
          cancelled: false,
          series_tag_ids: scope === "entire_series" ? draft.tag_ids : null,
          ...recurrenceInput,
        });
      if (editing) return updateTask({ id: editing.id, ...draft });
      if (recurring)
        return createRecurringTask({ ...recurringDraft, ...recurrenceInput });
      return createTask(draft);
    },
    onSuccess: async () => {
      await refreshSchedule();
      closeDialog();
    },
    onError: (e) =>
      setError(e instanceof Error ? e.message : "Unable to save task."),
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (editing.kind === "recurring")
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
          scope,
          cancelled: true,
          frequency: null,
          interval: null,
          weekdays: null,
          until: null,
          count: null,
          life_node_id: editing.life_area?.id ?? null,
          // Cancelling never changes the relation; echo the inherited value.
          focus_plan_id: editing.focus_plan?.id ?? null,
          series_tag_ids: null,
        });
      return deleteTask(editing.id);
    },
    onSuccess: async () => {
      await refreshSchedule();
      closeDialog();
    },
    onError: (e) =>
      setError(e instanceof Error ? e.message : "Unable to delete task."),
  });
  const assessment = useMutation({
    mutationFn: async ({
      item,
      state,
      operationId,
    }: {
      item: TodayItem;
      state: CompletionStateView;
      operationId: string;
    }) => {
      const now = new Date();
      return evaluateTask({
        subject_kind: item.kind,
        task_id: item.kind === "one_off" ? item.id : null,
        series_id: item.kind === "recurring" ? item.series_id : null,
        original_local_date:
          item.kind === "recurring" ? item.original_local_date : null,
        state_id: state.id,
        operation_id: operationId,
        observed_local_date: localToday(),
        observed_local_minute: now.getHours() * 60 + now.getMinutes(),
      });
    },
    onMutate: async (variables) => {
      setAssessmentError("");
      setOpenFan(null);
      const key = todayItemsKey(variables.item.local_date, today);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<TodayItem[]>(key);
      client.setQueryData<TodayItem[]>(
        key,
        (current) =>
          current?.map((item) =>
            item.id === variables.item.id
              ? {
                  ...item,
                  evaluation: {
                    state_id: variables.state.id,
                    label: variables.state.label,
                    visual_token: variables.state.visual_token,
                    evaluated_at: "",
                    operation_id: variables.operationId,
                  },
                }
              : item,
          ),
      );
      return {
        previous,
        localDate: variables.item.local_date,
        observedLocalDate: today,
      };
    },
    onError: (value, _variables, context) => {
      if (context)
        client.setQueryData(
          todayItemsKey(context.localDate, context.observedLocalDate),
          context.previous,
        );
      setAssessmentError(
        value instanceof Error ? value.message : "Unable to save assessment.",
      );
    },
    onSuccess: async (value, variables) => {
      client.setQueryData<TodayItem[]>(
        todayItemsKey(variables.item.local_date, today),
        (current) =>
          current?.map((item) =>
            item.id === variables.item.id
              ? { ...item, evaluation: value }
              : item,
          ),
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
        // A current evaluation controls active Deadline queue membership.
        client.invalidateQueries({ queryKey: ["deadline-queue"] }),
        invalidateTaskSavedViewProjections(client),
      ]);
    },
  });
  const undoAssessment = useMutation({
    mutationFn: (operationId: string) =>
      undoTaskEvaluation({ operation_id: operationId }),
    onSuccess: async (value) => {
      if (lastOperation)
        client.setQueryData<TodayItem[]>(
          todayItemsKey(lastOperation.localDate, lastOperation.observedLocalDate),
          (current) =>
            current?.map((item) =>
              item.id === lastOperation.itemId
                ? { ...item, evaluation: value }
                : item,
            ),
        );
      setLastOperation(null);
      await Promise.allSettled([
        client.invalidateQueries({ queryKey: ["month-projection"] }),
        client.invalidateQueries({ queryKey: ["analytics"] }),
        client.invalidateQueries({ queryKey: ["task-planning"] }),
        client.invalidateQueries({ queryKey: ["deadline-queue"] }),
        invalidateTaskSavedViewProjections(client),
      ]);
    },
    onError: (value) =>
      setAssessmentError(
        value instanceof Error ? value.message : "Unable to undo assessment.",
      ),
  });
  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setError("");
    queueMicrotask(() => returnFocus.current?.focus());
  }
  function begin(item?: TodayItem, eventTarget?: HTMLElement) {
    returnFocus.current = eventTarget ?? trigger.current;
    setEditing(item ?? null);
    setRecurring(false);
    setScope("only_this_occurrence");
    setDraft(
      item
        ? {
            title: item.title,
            description: item.description,
            local_date: item.local_date,
            start_minute: item.start_minute,
            end_minute: item.end_minute,
            category_id: item.category_id,
            priority: item.priority,
            life_node_id: item.life_area?.id ?? null,
            // Occurrences inherit the series relation; seeding it keeps an occurrence-scope
            // save unchanged and pre-fills the value a this-and-future split carries forward.
            focus_plan_id: item.focus_plan?.id ?? null,
            deadline_local_date: item.deadline?.deadline_local_date ?? null,
            tag_ids: item.tags.map((t) => t.id),
            selectedTags: item.tags,
          }
        : {
            title: "",
            description: "",
            local_date: date,
            start_minute: 480,
            end_minute: 540,
            category_id: categories.data?.[0]?.id ?? "general",
            priority: "medium",
            life_node_id: null,
            focus_plan_id: null,
            deadline_local_date: null,
            tag_ids: [],
            selectedTags: [],
          },
    );
    setOpen(true);
  }
  const settleExternalFocusRequest = (requestId: string) => {
    handledExternalFocusRequest.current = requestId;
    onFocusRequestSettled?.(requestId);
  };
  const cancelPendingFocusRequests = () => {
    if (
      focusRequest &&
      handledExternalFocusRequest.current !== focusRequest.requestId
    )
      settleExternalFocusRequest(focusRequest.requestId);
    setInternalFocusRequest(null);
  };
  useEffect(() => {
    const requestId = focusRequest?.requestId;
    if (!requestId || preparedExternalFocusRequest.current === requestId)
      return;
    preparedExternalFocusRequest.current = requestId;
    setOpenFan(null);
    setInternalFocusRequest(null);
    setWorkspaceMode("today");
  }, [focusRequest?.requestId]);
  useEffect(() => {
    if (
      open ||
      !items.isSuccess ||
      !items.data ||
      items.isFetching ||
      workspaceMode !== "today"
    )
      return;
    const externalPending =
      focusRequest &&
      handledExternalFocusRequest.current !== focusRequest.requestId;
    const source = externalPending
      ? "external"
      : internalFocusRequest
        ? "internal"
        : null;
    const request = externalPending ? focusRequest : internalFocusRequest;
    if (!source || !request) return;
    const handled =
      source === "internal"
        ? handledInternalFocusRequest
        : handledExternalFocusRequest;
    if (handled.current === request.requestId) return;
    const target = findTodayTarget(
      request.taskId,
      request.seriesId,
      request.originalLocalDate,
    );
    if (target) {
      target.scrollIntoView({ block: "nearest" });
      target.focus({ preventScroll: true });
    } else {
      document.getElementById("today-heading")?.focus({ preventScroll: true });
    }
    handled.current = request.requestId;
    if (source === "external") {
      onFocusRequestSettled?.(request.requestId);
    } else {
      setInternalFocusRequest((current) =>
        current?.requestId === request.requestId ? null : current,
      );
    }
  }, [
    focusRequest,
    internalFocusRequest,
    items.data,
    items.isFetching,
    items.isSuccess,
    onFocusRequestSettled,
    open,
    workspaceMode,
  ]);
  useModalFocusTrap({ container: dialog, initialFocus: dialogInitial, onEscape: closeDialog, active: workspaceMode === "today" && open });
  /*
    The inspector reads the same `items` projection the timeline renders, so opening it costs no
    query, no IPC command and no new projection — only a lookup.
  */
  /*
   * Selection provenance, for focus handling.
   *
   * The inspector was pointer-only until this change: the row's `Enter` already opens the editor
   * (a Task 50 gesture that must not change), so no key selected a task and keyboard users could
   * not reach the inspector at all. `Space` now selects, which is the remaining natural key on a
   * focusable row and collides with nothing.
   *
   * `openedByKeyboard` decides whether focus moves into the inspector. A pointer user should not
   * have focus yanked out from under them; a keyboard user must not be left on a row that has just
   * scrolled off-screen behind the stacked inspector.
   */
  const selectionOpener = useRef<HTMLElement | null>(null);
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);
  const selectTask = (id: string, element: HTMLElement | null, viaKeyboard: boolean) => {
    selectionOpener.current = element;
    setOpenedByKeyboard(viaKeyboard);
    setSelected(id);
  };
  /** Close and return focus where the user left it, never to `body`. */
  const closeInspector = () => {
    const opener = selectionOpener.current;
    selectionOpener.current = null;
    setOpenedByKeyboard(false);
    setSelected(null);
    requestAnimationFrame(() => {
      if (opener?.isConnected) opener.focus({ preventScroll: false });
    });
  };

  const selectedItem = useMemo(
    () => (items.data ?? []).find((entry) => entry.id === selected) ?? null,
    [items.data, selected],
  );
  const grouped = useMemo(
    () =>
      periods.map((period) => ({
        ...period,
        groups: Object.values(
          (items.data ?? [])
            .filter(
              (x) =>
                x.start_minute >= period.start && x.start_minute < period.end,
            )
            .reduce(
              (all, item) => {
                (all[`${item.start_minute}-${item.end_minute}`] ??= []).push(
                  item,
                );
                return all;
              },
              {} as Record<string, TodayItem[]>,
            ),
        ),
      })),
    [items.data],
  );
  const previews = useMemo(
    () =>
      previewDates(
        draft.local_date,
        frequency,
        Math.max(1, interval),
        selectedDays,
        endMode,
        count,
        until,
      ),
    [
      draft.local_date,
      frequency,
      interval,
      selectedDays,
      endMode,
      count,
      until,
    ],
  );
  const clock = new Date(),
    clockMinute = clock.getHours() * 60 + clock.getMinutes();
  const openPlanningItem = (request: {
    localDate: string;
    taskId: string | null;
    seriesId: string | null;
    originalLocalDate?: string | null;
  }) => {
    cancelPendingFocusRequests();
    setOpenFan(null);
    selectDate(request.localDate);
    setInternalFocusRequest({
      requestId: globalThis.crypto.randomUUID(),
      taskId: request.taskId,
      seriesId: request.seriesId,
      originalLocalDate: request.originalLocalDate ?? null,
    });
    setWorkspaceMode("today");
  };
  const activateWorkspaceMode = (next: TaskWorkspaceMode) => {
    if (next !== "today") {
      setOpenFan(null);
      cancelPendingFocusRequests();
    }
    setWorkspaceMode(next);
  };
  const selectUserDate = (value: string) => {
    cancelPendingFocusRequests();
    selectDate(value);
  };
  return (
    <PageFrame as="section" type="wide">
      <TaskWorkspaceTabs
        active={workspaceMode}
        disabled={open}
        onActivate={activateWorkspaceMode}
      />
      {/* Outside the Today tabpanel on purpose: one globally active session stays visible while
          the user changes date or switches workspace tab. */}
      {activeTimer.data && (
        <Suspense fallback={<LoadingRow label="Loading timer…" />}>
        <ActiveTimerStrip
          active={activeTimer.data}
          pending={timer.isPending}
          onStop={() =>
            runTimer("Timer stopped.", () =>
              stopTaskActualTime({ session_id: activeTimer.data!.session_id }),
            )
          }
          onDiscard={() =>
            runTimer("Segment discarded.", () =>
              discardTaskActualTime({ session_id: activeTimer.data!.session_id }),
            )
          }
        />
        </Suspense>
      )}
      {timerError && (
        <p className={styles.timerError} role="alert">
          {timerError}
        </p>
      )}
      <span className={styles.srOnly} aria-live="polite">
        {timerNotice}
      </span>
      {workspaceMode === "today" ? (
      <div
        className={styles.workspacePanel}
        role="tabpanel"
        id="task-panel-today"
        aria-labelledby="task-tab-today"
      >
      <PageHeader
        actions={
          <button
            ref={trigger}
            className={styles.create}
            aria-label="Create task"
            onClick={() => begin()}
          >
            Plan task
          </button>
        }
      >
        <p className={styles.eyebrow}>
          {date === today ? "Today" : "Selected day"} · {date}
        </p>
        <h1 id="today-heading" tabIndex={-1}>
          Today
        </h1>
      </PageHeader>
      <WeekStrip selectedDate={date} today={today} onSelectDate={selectUserDate} />
      {assessmentError && <p role="alert">{assessmentError}</p>}
      {lastOperation && (
        <p aria-live="polite" className={styles.undo}>
          Assessment saved.{" "}
          <button
            type="button"
            disabled={undoAssessment.isPending}
            onClick={() => undoAssessment.mutate(lastOperation.operationId)}
          >
            Undo assessment
          </button>
        </p>
      )}
      {/*
        Master/detail via the Task 50 `splitWorkspace` primitive, so the inspector's geometry stays
        governed by the shared layout authority rather than by a private grid. Today moves from
        STANDARD_PAGE to WIDE_WORKSPACE because it now carries a detail rail; that is a deliberate
        taxonomy change, not an incidental one.

        The split is applied only when something is selected. `splitWorkspace` always reserves its
        260-320px detail track, so applying it unconditionally left a dead band down the right of an
        unselected Today — the same defect the prototype hit, caught again here by looking at the
        rendered screen rather than at the code.
      */}
      <div className={selectedItem ? layout.splitWorkspace : undefined}>
      <div className={styles.timelineColumn}>
      {items.isLoading ? (
        <SkeletonList rows={5} label="Loading tasks…" />
      ) : items.isError ? (
        <p role="alert">Unable to load tasks.</p>
      ) : (
        <div className={styles.timeline}>
          {grouped.map((period) => (
            <section
              key={period.name}
              className={styles.period}
              aria-labelledby={`${period.name}-heading`}
            >
              {/*
                The name and the range are two spaced boxes, not one run of text. Before Task 50
                this rendered as `Morning04:00–12:00`, because the separation was relying on
                inter-element whitespace that never existed.
              */}
              <h2 id={`${period.name}-heading`} className={styles.periodHeading}>
                <span>{period.name}</span>
                <span className={styles.periodRange}>
                  {formatMinute(period.start)}–{formatMinute(period.end)}
                </span>
              </h2>
              {period.groups.length === 0 ? (
                <EmptyState
                  compact
                  icon={iconToday}
                  title="No tasks scheduled."
                  body="Nothing is planned for this part of the day."
                />
              ) : (
                /*
                  One bounded group per period, as baseline v2 measures. The time-column rows sit
                  inside it and carry their own separators, so the list reads as a single object
                  rather than as loose lines on the canvas.
                */
                <div className={styles.group_}>
                {period.groups.map((group) => (
                  <div
                    className={styles.group}
                    key={`${group[0]!.start_minute}-${group[0]!.end_minute}`}
                  >
                    <div className={styles.time}>
                      {formatMinute(group[0]!.start_minute)}–
                      {formatMinute(group[0]!.end_minute)}
                    </div>
                    <div
                      role="list"
                      aria-label={`${formatMinute(group[0]!.start_minute)} to ${formatMinute(group[0]!.end_minute)} tasks`}
                    >
                      {group.map((item) => (
                        <div
                          role="listitem"
                          key={item.id}
                          className={`${styles.row} ${selected === item.id ? styles.selected : ""}`}
                          tabIndex={0}
                          data-task-id={item.kind === "one_off" ? item.id : undefined}
                          data-series-id={item.kind === "recurring" ? item.series_id : undefined}
                          data-original-local-date={item.kind === "recurring" ? item.original_local_date : undefined}
                          aria-current={selected === item.id ? "true" : undefined}
                          onClick={(e) => selectTask(item.id, e.currentTarget, false)}
                          onDoubleClick={(e) => begin(item, e.currentTarget)}
                          onKeyDown={(e) => {
                            // Enter keeps opening the editor — a Task 50 gesture, unchanged.
                            if (e.key === "Enter") begin(item, e.currentTarget);
                            else if (e.key === " " || e.key === "Spacebar") {
                              e.preventDefault();
                              selectTask(item.id, e.currentTarget, true);
                            }
                          }}
                        >
                          {/*
                            Title, description, metadata and tags are four stacked units, and the
                            metadata row is a wrapping flex group. Before this they were a bare
                            inline flow, so the category ran straight into the Life-area chip.
                          */}
                          <div className={styles.rowContent}>
                            <strong>{item.title}</strong>
                            <p className={styles.rowDescription}>{item.description}</p>
                            <div className={styles.rowMeta}>
                            <span className={styles.category}>
                              <CategoryIcon
                                iconKey={item.category_icon_key}
                                label={`Category ${item.category_name}`}
                              />{" "}
                              {item.category_name}
                            </span>
                            {item.life_area &&
                              (item.life_area.archived ? (
                                <span aria-label={`Life breadcrumb ${item.life_area.breadcrumb}`}>
                                  Archived life area: {item.life_area.title}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.rowChip}
                                  aria-label={`Life area: ${item.life_area.title}. ${item.life_area.breadcrumb}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onLifeNavigate?.(item.life_area!.id);
                                  }}
                                  onDoubleClick={(event) => event.stopPropagation()}
                                >
                                  Life area: {item.life_area.title}
                                </button>
                              ))}
                            {item.focus_plan &&
                              (item.focus_plan.archived ? (
                                <span>
                                  Archived Focus Plan: {item.focus_plan.title}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.rowChip}
                                  aria-label={`Focus Plan: ${item.focus_plan.title}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onFocusPlanNavigate?.(item.focus_plan!.id);
                                  }}
                                  onDoubleClick={(event) => event.stopPropagation()}
                                >
                                  Focus Plan: {item.focus_plan.title}
                                </button>
                              ))}
                            {item.deadline && (
                              <span>
                                {item.deadline.state === "due_today"
                                  ? "Due today"
                                  : item.deadline.state === "overdue"
                                    ? "Deadline overdue"
                                    : "Deadline"}{" "}
                                <time dateTime={item.deadline.deadline_local_date}>
                                  {item.deadline.deadline_local_date}
                                </time>
                                {item.deadline.scheduled_after_deadline &&
                                  " · Scheduled after deadline"}
                              </span>
                            )}
                            {item.kind === "recurring" && (
                              <span aria-label="Recurring task">↻</span>
                            )}
                            </div>
                            <TagChipList tags={item.tags} />
                          </div>
                          {/*
                            One action track. Before Task 50 these siblings were laid directly on a
                            three-track grid that could render four children, so a fourth implicit
                            auto column appeared whenever a Task carried actual time.
                          */}
                          <div className={styles.rowActions}>
                          {/*
                            `role="img"`, not a bare span. `aria-label` is prohibited on an element
                            with the implicit `generic` role, and the previous markup only escaped
                            that because it had "•" as text content to name itself with. An empty
                            drawn dot has none, so it must declare what it is — axe caught exactly
                            this.
                          */}
                          <span
                            role="img"
                            className={styles.priorityDot}
                            aria-label={`Priority ${item.priority}`}
                          />
                          {/*
                            The visible edit path. Double-click and Enter still work, but neither
                            advertised itself, which is the one MISSING_USER_SURFACE the Task 50
                            census found. This calls the same `begin` the gestures call.
                          */}
                          <button
                            type="button"
                            className={styles.rowEditButton}
                            aria-label={`Edit ${item.title}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              begin(item, event.currentTarget);
                            }}
                            onDoubleClick={(event) => event.stopPropagation()}
                          >
                            Edit
                          </button>
                          {item.kind === "one_off" && item.actual_time && (
                            <ActualTimeRowControl
                              taskId={item.id}
                              taskTitle={item.title}
                              actual={item.actual_time}
                              evaluated={item.evaluation !== null}
                              otherTimerRunning={
                                activeTimer.data !== null &&
                                activeTimer.data !== undefined &&
                                activeTimer.data.task_id !== item.id
                              }
                              pending={timer.isPending}
                              onStart={() =>
                                runTimer("Timer started.", () =>
                                  startTaskActualTime({
                                    task_id: item.id,
                                    operation_id: newOperationId(),
                                  }),
                                )
                              }
                              onStop={(sessionId) =>
                                runTimer("Timer stopped.", () =>
                                  stopTaskActualTime({ session_id: sessionId }),
                                )
                              }
                            />
                          )}
                          <AssessmentControl
                            itemId={item.id}
                            states={completionStates.data ?? []}
                            evaluation={item.evaluation}
                            eligible={
                              item.local_date < today ||
                              (item.local_date === today &&
                                item.end_minute <= clockMinute)
                            }
                            unavailableReason={
                              item.kind === "one_off" &&
                              item.actual_time?.active_session_id
                                ? "Stop or discard the running timer before assessing this task"
                                : null
                            }
                            open={openFan === item.id}
                            onOpen={() => setOpenFan(item.id)}
                            onClose={() => setOpenFan(null)}
                            onSelect={(state) =>
                              assessment.mutate({
                                item,
                                state,
                                operationId: newOperationId(),
                              })
                            }
                          />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      </div>
      {selectedItem && (
        <Suspense fallback={null}>
        <TaskInspector
          item={selectedItem}
          focusOnOpen={openedByKeyboard}
          onClose={closeInspector}
          onLifeNavigate={onLifeNavigate}
          onFocusPlanNavigate={onFocusPlanNavigate}
        />
        </Suspense>
      )}
      </div>
      </div>
      ) : (
        <div role="tabpanel" id={`task-panel-${workspaceMode}`} aria-labelledby={`task-tab-${workspaceMode}`}>
          <Suspense fallback={<SkeletonList rows={5} label={`Loading ${workspaceMode} tasks…`} />}>
            {workspaceMode === "views" ? (
              <TaskSavedViewsPanel anchorLocalDate={planningAnchor} onOpenItem={openPlanningItem} onFocusPlanNavigate={onFocusPlanNavigate} />
            ) : workspaceMode === "deadlines" ? (
              // Deadlines is a distinct projection; it must never be routed through the
              // schedule-based planning modes.
              <DeadlineQueuePanel anchorLocalDate={planningAnchor} onOpenItem={openPlanningItem} onFocusPlanNavigate={onFocusPlanNavigate} />
            ) : (
              <TaskPlanningPanel mode={workspaceMode} anchorLocalDate={planningAnchor} onOpenItem={openPlanningItem} onFocusPlanNavigate={onFocusPlanNavigate} />
            )}
          </Suspense>
        </div>
      )}
      {workspaceMode === "today" && open && (
        <DialogBackdrop
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-dialog-heading"
          ref={dialog}
        >
          <DialogSurface
            as="form"
            width="standard"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              setError("");
              if (draft.start_minute >= draft.end_minute) {
                setError("Start time must be before end time.");
                return;
              }
              if (recurring && !(interval >= 1 && interval <= 366)) {
                setError("Recurrence interval must be between 1 and 366.");
                return;
              }
              if (
                recurring &&
                frequency === "weekly" &&
                selectedDays.length === 0
              ) {
                setError("Choose at least one weekday.");
                return;
              }
              if (
                recurring &&
                endMode === "count" &&
                !(count >= 1 && count <= 1000)
              ) {
                setError("Occurrence count must be between 1 and 1000.");
                return;
              }
              if (
                recurring &&
                endMode === "until" &&
                until < draft.local_date
              ) {
                setError("Recurrence end date cannot be before the task date.");
                return;
              }
              save.mutate();
            }}
          >
            <DialogHeader>
              <h2 id="task-dialog-heading">
                {editing ? "Edit task" : "Create task"}
              </h2>
              {error && (
                <p role="alert" id="task-error">
                  {error}
                </p>
              )}
            </DialogHeader>
            <div className={layout.formGrid}>
              <label className={`${layout.field} ${layout.fieldSpan.full}`}>
                Title
                <input
                  ref={dialogInitial}
                  className={layout.fieldControl}
                  value={draft.title}
                  aria-describedby={error ? "task-error" : undefined}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </label>
              <label className={`${layout.field} ${layout.fieldSpan.full}`}>
                Description
                <textarea
                  className={`${layout.fieldControl} ${styles.textarea}`}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              {/* Schedule is one semantic group, so it gets one common region (Palmer 1992). */}
              <fieldset className={`${layout.fieldGroup} ${layout.fieldSpan.full}`}>
                <legend className={styles.legend}>Schedule</legend>
                <label className={`${layout.field} ${layout.fieldSpan.third}`}>
                  Date
                  <input
                    className={layout.fieldControl}
                    type="date"
                    value={draft.local_date}
                    onChange={(e) =>
                      setDraft({ ...draft, local_date: e.target.value })
                    }
                  />
                </label>
                <div className={layout.fieldSpan.third}>
                  <TimeWheel
                    name="Start"
                    value={draft.start_minute}
                    onChange={(n) => setDraft({ ...draft, start_minute: n })}
                  />
                </div>
                <div className={layout.fieldSpan.third}>
                  <TimeWheel
                    name="End"
                    end
                    value={draft.end_minute}
                    onChange={(n) => setDraft({ ...draft, end_minute: n })}
                  />
                </div>
              </fieldset>
              <label className={`${layout.field} ${layout.fieldSpan.half}`}>
                Category
                <select
                  className={layout.fieldControl}
                  value={draft.category_id}
                  onChange={(e) =>
                    setDraft({ ...draft, category_id: e.target.value })
                  }
                >
                  {(categories.data ?? []).map((c: TaskCategoryView) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${layout.field} ${layout.fieldSpan.half}`}>
                Priority
                <select
                  className={layout.fieldControl}
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft({ ...draft, priority: e.target.value })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <div className={layout.fieldSpan.half}>
                <LifeAreaCombobox
                  value={draft.life_node_id}
                  current={editing?.life_area}
                  onChange={(life_node_id) => {
                    setDraft({ ...draft, life_node_id });
                    if (editing?.kind === "recurring") setScope("entire_series");
                  }}
                />
              </div>
              <div className={layout.fieldSpan.half}>
                <FocusPlanCombobox
                  value={draft.focus_plan_id}
                  current={editing?.focus_plan}
                  disabled={
                    editing?.kind === "recurring" &&
                    scope === "only_this_occurrence"
                  }
                  disabledReason="This Focus Plan belongs to the series. Change scope to Entire series to edit it."
                  onChange={(focus_plan_id) =>
                    setDraft({ ...draft, focus_plan_id })
                  }
                />
              </div>
              <div className={`${layout.field} ${layout.fieldSpan.full}`}>
                <label htmlFor="task-deadline">Deadline</label>
                <p id="task-deadline-help" className={layout.fieldHelp}>
                  {isRecurringDraft
                    ? "Recurring tasks cannot carry a deadline yet."
                    : "Schedule is when you plan to work. Deadline is when it must be finished."}
                </p>
                <div className={layout.controlRow}>
                  <input
                    id="task-deadline"
                    className={styles.dateControl}
                    type="date"
                    aria-describedby="task-deadline-help"
                    disabled={isRecurringDraft}
                    value={draft.deadline_local_date ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        deadline_local_date: event.target.value || null,
                      })
                    }
                  />
                  {draft.deadline_local_date && !isRecurringDraft && (
                    <button
                      type="button"
                      className={styles.rowEditButton}
                      onClick={() =>
                        setDraft({ ...draft, deadline_local_date: null })
                      }
                    >
                      Clear deadline
                    </button>
                  )}
                </div>
              </div>
              {editing?.kind === "recurring" &&
              scope !== "entire_series" ? (
                <div className={`${layout.field} ${layout.fieldSpan.full}`}>
                  <TagChipList tags={editing.tags} maxVisible={12} />
                  <p className={styles.seriesTagsNote}>
                    Tags belong to the series. Change scope to Entire series to edit.
                  </p>
                </div>
              ) : (
                <div className={layout.fieldSpan.full}>
                  <TagPicker
                    selectedTags={draft.selectedTags}
                    onChange={(next) =>
                      setDraft({ ...draft, selectedTags: next, tag_ids: next.map((t) => t.id) })
                    }
                    allowCreate
                  />
                </div>
              )}
              {!editing && (
                <fieldset className={`${layout.fieldGroup} ${layout.fieldSpan.full}`}>
                  <legend className={styles.legend}>Recurring</legend>
                  <label className={`${styles.checkLabel} ${layout.fieldSpan.full}`}>
                    <input
                      type="checkbox"
                      checked={recurring}
                      onChange={(e) => setRecurring(e.target.checked)}
                    />{" "}
                    Repeat task
                  </label>
                  {recurring && (
                    <>
                      <label className={`${layout.field} ${layout.fieldSpan.half}`}>
                        Frequency
                        <select
                          className={layout.fieldControl}
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value)}
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </label>
                      <label className={`${layout.field} ${layout.fieldSpan.half}`}>
                        Interval
                        <input
                          className={layout.fieldControl}
                          aria-label="Recurrence interval"
                          type="number"
                          min="1"
                          max="366"
                          value={interval}
                          onChange={(e) => setInterval(Number(e.target.value))}
                        />
                      </label>
                      {frequency === "weekly" && (
                        <fieldset className={`${styles.subGroup} ${layout.fieldSpan.full}`}>
                          <legend className={styles.legend}>Weekdays</legend>
                          <div className={layout.controlRow}>
                            {weekdays.map((day, index) => (
                              <label key={day} className={styles.checkLabel}>
                                <input
                                  type="checkbox"
                                  checked={selectedDays.includes(index)}
                                  onChange={(e) =>
                                    setSelectedDays(
                                      e.target.checked
                                        ? [...selectedDays, index]
                                        : selectedDays.filter((x) => x !== index),
                                    )
                                  }
                                />
                                {day}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      )}
                      <fieldset className={`${styles.subGroup} ${layout.fieldSpan.full}`}>
                        <legend className={styles.legend}>Ends</legend>
                        <div className={layout.controlRow}>
                          {["never", "count", "until"].map((mode) => (
                            <label key={mode} className={styles.checkLabel}>
                              <input
                                type="radio"
                                name="end-mode"
                                checked={endMode === mode}
                                onChange={() => setEndMode(mode)}
                              />
                              {mode}
                            </label>
                          ))}
                        </div>
                        {endMode === "count" && (
                          <label className={layout.field}>
                            Occurrence count
                            <input
                              className={styles.numberControl}
                              type="number"
                              min="1"
                              max="1000"
                              value={count}
                              onChange={(e) => setCount(Number(e.target.value))}
                            />
                          </label>
                        )}
                        {endMode === "until" && (
                          <label className={layout.field}>
                            Until
                            <input
                              className={styles.dateControl}
                              type="date"
                              value={until}
                              onChange={(e) => setUntil(e.target.value)}
                            />
                          </label>
                        )}
                      </fieldset>
                      <ol
                        className={`${styles.previewList} ${layout.fieldSpan.full}`}
                        aria-label="Recurrence preview"
                      >
                        {previews.map((value) => (
                          <li key={value}>{value}</li>
                        ))}
                      </ol>
                    </>
                  )}
                </fieldset>
              )}
              {editing?.kind === "recurring" && (
                <fieldset className={`${layout.fieldGroup} ${layout.fieldSpan.full}`}>
                  <legend className={styles.legend}>Occurrence scope</legend>
                  <div className={`${styles.scopeList} ${layout.fieldSpan.full}`}>
                    {(
                      [
                        "only_this_occurrence",
                        "this_and_future",
                        "entire_series",
                      ] as OccurrenceEditScope[]
                    ).map((value) => (
                      <label key={value} className={styles.checkLabel}>
                        <input
                          type="radio"
                          name="scope"
                          checked={scope === value}
                          onChange={() => setScope(value)}
                        />
                        {value === "only_this_occurrence"
                          ? "Only this occurrence"
                          : value === "this_and_future"
                            ? "This and future occurrences"
                            : "Entire series"}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
            <DialogFooter>
              {editing && (
                <button
                  type="button"
                  className={layout.dialogFooterLeading}
                  disabled={save.isPending || remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  {remove.isPending ? "Deleting…" : "Delete"}
                </button>
              )}
              <button type="button" onClick={closeDialog}>
                Cancel
              </button>
              <button type="submit" disabled={save.isPending || remove.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </button>
            </DialogFooter>
          </DialogSurface>
        </DialogBackdrop>
      )}
    </PageFrame>
  );
}
