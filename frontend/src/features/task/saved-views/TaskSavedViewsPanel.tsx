import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useModalFocusTrap } from "../../../app/useModalFocusTrap";

import {
  archiveTaskSavedView,
  createTaskSavedView,
  getTaskSavedView,
  getTaskSavedViewEditorOptions,
  getTaskSavedViewProjection,
  listArchivedTaskSavedViews,
  listTaskSavedViews,
  reorderTaskSavedViews,
  restoreTaskSavedView,
  updateTaskSavedView,
} from "../../../ipc/commands";
import type { TaskSavedViewClause } from "../../../ipc/generated/TaskSavedViewClause";
import type { TaskSavedViewDetail } from "../../../ipc/generated/TaskSavedViewDetail";
import type { TaskSavedViewEditorOptions } from "../../../ipc/generated/TaskSavedViewEditorOptions";
import type { TaskSavedViewReferenceOption } from "../../../ipc/generated/TaskSavedViewReferenceOption";
import type { TaskSavedViewView } from "../../../ipc/generated/TaskSavedViewView";
import type { TaskSavedViewBaseScope } from "../../../ipc/generated/TaskSavedViewBaseScope";
import type { TaskSavedViewGroupMode } from "../../../ipc/generated/TaskSavedViewGroupMode";
import type { TaskSavedViewPredicate } from "../../../ipc/generated/TaskSavedViewPredicate";
import type { TaskSavedViewSortMode } from "../../../ipc/generated/TaskSavedViewSortMode";
import type { DeadlineState } from "../../../ipc/generated/DeadlineState";
import type { TaskSavedViewPriority } from "../../../ipc/generated/TaskSavedViewPriority";
import type { TaskSavedViewTaskKind } from "../../../ipc/generated/TaskSavedViewTaskKind";
import { taskSavedViewKeys } from "./savedViewQueries";
import * as styles from "./TaskSavedViews.css";
import { EmptyState, LoadingRow, SkeletonList } from "../../../design-system/primitives/States";
import { iconToday } from "../../../design-system/visual/icons";

type ClauseKind = TaskSavedViewClause["kind"];
type Draft = {
  name: string;
  base_scope: TaskSavedViewBaseScope;
  predicate: TaskSavedViewPredicate;
  sort_mode: TaskSavedViewSortMode;
  group_mode: TaskSavedViewGroupMode;
};

const clauseKinds: ClauseKind[] = [
  "task_kind_in",
  "priority_in",
  "category_id_in",
  "tag_id_any",
  "life_area_id_in",
  "focus_plan_id_in",
  "has_deadline_is",
  "deadline_state_in",
  "scheduled_after_deadline_is",
];
const clauseLabels: Record<ClauseKind, string> = {
  task_kind_in: "Task kind",
  priority_in: "Priority",
  category_id_in: "Category",
  tag_id_any: "Any tag",
  life_area_id_in: "Life area",
  focus_plan_id_in: "Focus Plan",
  has_deadline_is: "Has deadline",
  deadline_state_in: "Deadline state",
  scheduled_after_deadline_is: "Scheduled after deadline",
};

const emptyDraft = (): Draft => ({
  name: "",
  base_scope: "today",
  predicate: { type: "all", clauses: [] },
  sort_mode: "base_default",
  group_mode: "none",
});

function draftFrom(detail: TaskSavedViewDetail): Draft {
  return {
    name: detail.view.name,
    base_scope: detail.view.base_scope,
    predicate: detail.predicate ?? { type: "all", clauses: [] },
    sort_mode: detail.view.sort_mode,
    group_mode: detail.view.group_mode,
  };
}

function normalizeMergedTagAliases(
  draft: Draft,
  options: TaskSavedViewReferenceOption[],
): Draft {
  let changed = false;
  const clauses = draft.predicate.clauses.map((clause) => {
    if (clause.kind !== "tag_id_any") return clause;
    const seen = new Set<string>();
    const ids = clause.ids.flatMap((id) => {
      const direct = options.find((option) => option.id === id);
      const canonical = direct ?? options.find((option) => option.merged_from_id === id);
      const resolved = canonical?.id ?? id;
      if (seen.has(resolved)) {
        changed = true;
        return [];
      }
      seen.add(resolved);
      if (resolved !== id) changed = true;
      return [resolved];
    });
    return changed ? { ...clause, ids } : clause;
  });
  return changed ? { ...draft, predicate: { ...draft.predicate, clauses } } : draft;
}

function newClause(kind: ClauseKind, options?: TaskSavedViewEditorOptions): TaskSavedViewClause {
  switch (kind) {
    case "task_kind_in": return { kind, values: ["one_off"] };
    case "priority_in": return { kind, values: ["high"] };
    case "category_id_in": return { kind, ids: options?.categories[0] ? [options.categories[0].id] : [] };
    case "tag_id_any": return { kind, ids: options?.tags[0] ? [options.tags[0].id] : [] };
    case "life_area_id_in": return { kind, ids: options?.life_areas[0] ? [options.life_areas[0].id] : [] };
    case "focus_plan_id_in": return { kind, ids: options?.focus_plans[0] ? [options.focus_plans[0].id] : [] };
    case "has_deadline_is": return { kind, value: true };
    case "deadline_state_in": return { kind, values: ["overdue"] };
    case "scheduled_after_deadline_is": return { kind, value: true };
  }
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "The Saved View could not be saved. Your draft is still here.";
}

function formatMinute(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function ReferenceSelect({
  clause,
  options,
  onChange,
}: {
  clause: Extract<TaskSavedViewClause, { ids: string[] }>;
  options: TaskSavedViewReferenceOption[];
  onChange: (ids: string[]) => void;
}) {
  const visibleOptions = options.filter(
    (option, index) => options.findIndex((candidate) => candidate.id === option.id) === index,
  );
  const labels = clause.ids.map((id) => visibleOptions.find((option) => option.id === id)?.label ?? id);
  return (
    <>
      <select
        multiple
        className={styles.multi}
        aria-label={`${clauseLabels[clause.kind]} values`}
        value={clause.ids}
        onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}
      >
        {visibleOptions.map((option) => (
          <option key={`${option.id}-${option.merged_from_id ?? ""}`} value={option.id}>
            {option.label}{option.archived ? " — archived" : ""}{option.missing ? " — missing" : ""}
            {option.merged_from_id ? " — merged target" : ""}
          </option>
        ))}
      </select>
      <span>Selected: {labels.length ? labels.join(", ") : "none"}</span>
    </>
  );
}

function ToggleSet<T extends string>({
  label,
  choices,
  values,
  onChange,
}: {
  label: string;
  choices: readonly { value: T; label: string }[];
  values: T[];
  onChange: (values: T[]) => void;
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className={styles.checkboxRow}>
        {choices.map((choice) => (
          <label key={choice.value}>
            <input
              type="checkbox"
              checked={values.includes(choice.value)}
              onChange={(event) => onChange(event.target.checked
                ? [...values, choice.value]
                : values.filter((value) => value !== choice.value))}
            /> {choice.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ClauseEditor({
  clause,
  options,
  onChange,
  onRemove,
}: {
  clause: TaskSavedViewClause;
  options: TaskSavedViewEditorOptions;
  onChange: (clause: TaskSavedViewClause) => void;
  onRemove: () => void;
}) {
  let control;
  switch (clause.kind) {
    case "task_kind_in":
      control = <ToggleSet<TaskSavedViewTaskKind> label="Included task kinds" values={clause.values} choices={[{ value: "one_off", label: "One-off" }, { value: "recurring", label: "Recurring" }]} onChange={(values) => onChange({ ...clause, values })} />;
      break;
    case "priority_in":
      control = <ToggleSet<TaskSavedViewPriority> label="Included priorities" values={clause.values} choices={[{ value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} onChange={(values) => onChange({ ...clause, values })} />;
      break;
    case "deadline_state_in":
      control = <ToggleSet<DeadlineState> label="Included deadline states" values={clause.values} choices={[{ value: "overdue", label: "Overdue" }, { value: "due_today", label: "Due today" }, { value: "upcoming", label: "Upcoming" }]} onChange={(values) => onChange({ ...clause, values })} />;
      break;
    case "category_id_in":
      control = <ReferenceSelect clause={clause} options={options.categories} onChange={(ids) => onChange({ ...clause, ids })} />;
      break;
    case "tag_id_any":
      control = <ReferenceSelect clause={clause} options={options.tags} onChange={(ids) => onChange({ ...clause, ids })} />;
      break;
    case "life_area_id_in":
      control = <ReferenceSelect clause={clause} options={options.life_areas} onChange={(ids) => onChange({ ...clause, ids })} />;
      break;
    case "focus_plan_id_in":
      control = <ReferenceSelect clause={clause} options={options.focus_plans} onChange={(ids) => onChange({ ...clause, ids })} />;
      break;
    case "has_deadline_is":
    case "scheduled_after_deadline_is":
      control = (
        <label>
          Value
          <select value={clause.value ? "true" : "false"} onChange={(event) => onChange({ ...clause, value: event.target.value === "true" })}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
      );
      break;
  }
  return (
    <fieldset className={styles.clause}>
      <legend>{clauseLabels[clause.kind]}</legend>
      {control}
      <button type="button" onClick={onRemove}>Remove {clauseLabels[clause.kind]}</button>
    </fieldset>
  );
}

export default function TaskSavedViewsPanel({
  anchorLocalDate,
  onOpenItem,
  onFocusPlanNavigate,
}: {
  anchorLocalDate: string;
  onOpenItem: (request: { localDate: string; taskId: string | null; seriesId: string | null; originalLocalDate?: string | null }) => void;
  onFocusPlanNavigate?: ((planId: string) => void) | undefined;
}) {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; viewId: string | null; revision: number; unsupported: boolean } | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [addKind, setAddKind] = useState<ClauseKind>("task_kind_in");
  const [saveError, setSaveError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const active = useQuery({ queryKey: taskSavedViewKeys.active, queryFn: listTaskSavedViews });
  const archived = useQuery({ queryKey: taskSavedViewKeys.archived, queryFn: listArchivedTaskSavedViews });
  const options = useQuery({
    queryKey: taskSavedViewKeys.options(editor?.viewId ?? null),
    queryFn: () => getTaskSavedViewEditorOptions({ view_id: editor?.viewId ?? null }),
    enabled: editor !== null,
  });
  const projection = useQuery({
    queryKey: selectedId ? taskSavedViewKeys.projection(selectedId, anchorLocalDate) : ["task-saved-view-projection", "none", anchorLocalDate],
    queryFn: () => getTaskSavedViewProjection({ view_id: selectedId!, anchor_local_date: anchorLocalDate }),
    enabled: selectedId !== null,
  });

  useEffect(() => {
    if (selectedId && active.data && !active.data.some((view) => view.id === selectedId)) setSelectedId(null);
  }, [active.data, selectedId]);
  useEffect(() => { if (saveError) errorRef.current?.focus(); }, [saveError]);

  const closeEditor = () => {
    setEditor(null);
    requestAnimationFrame(() => returnFocus.current?.focus({ preventScroll: true }));
  };

  useModalFocusTrap({ container: editorRef, initialFocus: nameRef, onEscape: closeEditor, active: editor !== null });

  const refreshLifecycle = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["task-saved-views"] }),
      client.invalidateQueries({ queryKey: ["task-saved-view"] }),
      client.invalidateQueries({ queryKey: taskSavedViewKeys.projectionPrefix }),
      client.invalidateQueries({ queryKey: ["task-saved-view-options"] }),
    ]);
  };
  const save = useMutation({
    mutationFn: async () => {
      const input = { ...draft };
      if (editor?.mode === "edit") {
        return updateTaskSavedView({ ...input, id: editor.viewId!, expected_revision: editor.revision });
      }
      return createTaskSavedView(input);
    },
    onSuccess: async (detail) => {
      closeEditor();
      setSaveError(null);
      // Select only after the active list has been refetched. Selecting first would hand the
      // stale-selection effect an id that the still-stale list cannot contain, and it would clear
      // the selection before the new view ever arrives.
      await refreshLifecycle();
      setSelectedId(detail.view.id);
    },
    onError: (error) => setSaveError(errorText(error)),
  });
  const lifecycle = useMutation({
    mutationFn: ({ action, view }: { action: "archive" | "restore"; view: TaskSavedViewView }) =>
      action === "archive"
        ? archiveTaskSavedView({ id: view.id, expected_revision: view.revision })
        : restoreTaskSavedView({ id: view.id, expected_revision: view.revision }),
    onSuccess: async (detail, variables) => {
      // Archiving removes the view, so clearing its selection is correct before the refetch.
      if (variables.action === "archive" && selectedId === detail.view.id) setSelectedId(null);
      await refreshLifecycle();
      // Restoring adds it back, so the selection has to wait for the refreshed active list.
      if (variables.action === "restore") setSelectedId(detail.view.id);
    },
  });
  const reorder = useMutation({
    mutationFn: reorderTaskSavedViews,
    onSuccess: refreshLifecycle,
  });

  const unused = useMemo(() => clauseKinds.filter((kind) => !draft.predicate.clauses.some((clause) => clause.kind === kind)), [draft.predicate.clauses]);
  useEffect(() => { if (!unused.includes(addKind) && unused[0]) setAddKind(unused[0]); }, [addKind, unused]);

  const beginEdit = async (view: TaskSavedViewView, trigger: HTMLElement) => {
    returnFocus.current = trigger;
    const [detail, editorOptions] = await Promise.all([
      client.fetchQuery({ queryKey: taskSavedViewKeys.detail(view.id), queryFn: () => getTaskSavedView(view.id) }),
      client.fetchQuery({
        queryKey: taskSavedViewKeys.options(view.id),
        queryFn: () => getTaskSavedViewEditorOptions({ view_id: view.id }),
      }),
    ]);
    setDraft(normalizeMergedTagAliases(draftFrom(detail), editorOptions.tags));
    setEditor({ mode: "edit", viewId: view.id, revision: view.revision, unsupported: detail.predicate === null });
    setSaveError(null);
  };
  const move = (view: TaskSavedViewView, delta: number) => {
    const views = active.data ?? [];
    const index = views.findIndex((candidate) => candidate.id === view.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= views.length) return;
    const ids = views.map((candidate) => candidate.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    reorder.mutate({ ordered_ids: ids });
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.manager} aria-labelledby="saved-view-manager-heading">
        <h2 id="saved-view-manager-heading">Saved Views</h2>
        <button type="button" onClick={(event) => { returnFocus.current = event.currentTarget; setDraft(emptyDraft()); setEditor({ mode: "create", viewId: null, revision: 0, unsupported: false }); setSaveError(null); }}>Create view</button>
        {active.isLoading ? <SkeletonList rows={3} label="Loading Saved Views…" /> : active.isError ? <p role="alert">Saved Views could not be loaded.</p> : active.data!.length === 0 ? <EmptyState compact title="No active Saved Views." body="Save a filtered task view to return to it quickly." /> : (
          <ul className={styles.viewList} aria-label="Active Saved Views">
            {active.data!.map((view, index) => (
              <li key={view.id} className={styles.viewLine}>
                <div>
                  <button type="button" aria-pressed={selectedId === view.id} onClick={() => setSelectedId(view.id)}>{view.name}</button>
                  {view.support_state !== "supported" && <span> Unsupported filter</span>}
                </div>
                <span className={styles.actions}>
                  <button type="button" aria-label={`Move ${view.name} up`} disabled={index === 0 || reorder.isPending} onClick={() => move(view, -1)}>↑</button>
                  <button type="button" aria-label={`Move ${view.name} down`} disabled={index === active.data!.length - 1 || reorder.isPending} onClick={() => move(view, 1)}>↓</button>
                  <button type="button" onClick={(event) => void beginEdit(view, event.currentTarget)}>Edit</button>
                  <button type="button" onClick={() => lifecycle.mutate({ action: "archive", view })}>Archive</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <details>
          <summary>Archived views ({archived.data?.length ?? 0})</summary>
          {archived.isLoading ? <SkeletonList rows={2} label="Loading archived views…" /> : archived.isError ? <p role="alert">Archived views could not be loaded.</p> : archived.data!.length === 0 ? <EmptyState compact title="No archived Saved Views." /> : (
            <ul className={styles.viewList}>
              {(archived.data ?? []).map((view) => <li key={view.id} className={styles.viewLine}><span>{view.name}</span><button type="button" onClick={() => lifecycle.mutate({ action: "restore", view })}>Restore</button></li>)}
            </ul>
          )}
        </details>
        {lifecycle.isError || reorder.isError ? <p role="alert">The Saved View change failed. Reload and try again.</p> : null}
      </aside>

      <section className={styles.results} aria-labelledby="saved-view-results-heading">
        <h2 id="saved-view-results-heading">Results</h2>
        {!selectedId ? <p>Select or create a Saved View.</p> : projection.isLoading ? <LoadingRow label="Loading Saved View results…" /> : projection.isError ? <div role="alert"><p>This Saved View could not be executed.</p><button type="button" onClick={() => void projection.refetch()}>Retry</button></div> : projection.data!.unsupported_reason ? (
          <div role="alert" className={styles.notice}><strong>Unsupported Saved View</strong><p>{projection.data!.unsupported_reason}</p><p>You can edit this view to replace its filter or archive it.</p></div>
        ) : (
          <>
            <p>{projection.data!.total_visible_count} of {projection.data!.total_source_count} source tasks</p>
            {projection.data!.warnings.length > 0 && <div className={styles.notice} role="status"><strong>Reference warnings</strong><ul>{projection.data!.warnings.map((warning, index) => <li key={`${warning.code}-${warning.reference_id}-${index}`}>{warning.message}</li>)}</ul></div>}
            {projection.data!.total_visible_count === 0 ? <EmptyState compact icon={iconToday} title="No tasks match this view." body="Adjust the filter to widen what this view returns." /> : projection.data!.groups.map((group) => (
              <section key={group.key} aria-labelledby={`saved-group-${group.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`}>
                <h3 id={`saved-group-${group.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`}>{group.label} · {group.items.length}</h3>
                <ul className={styles.resultList}>
                  {group.items.map((item) => (
                    <li key={item.task_id ?? `${item.series_id}:${item.original_local_date}`} className={styles.resultRow}>
                      <time dateTime={item.scheduled_local_date}>{item.scheduled_local_date}<br />{formatMinute(item.start_minute)}–{formatMinute(item.end_minute)}</time>
                      <div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}<div className={styles.metadata}><span>{item.category_name}{item.category_archived ? " (archived)" : ""}</span><span>Priority {item.priority}</span>{item.kind === "recurring" && <span>Recurring</span>}{item.life_area && <span>{item.life_area.archived ? "Archived Life area" : "Life area"}: {item.life_area.title}</span>}{item.focus_plan && (item.focus_plan.archived ? <span>Archived Focus Plan: {item.focus_plan.title}</span> : <button type="button" onClick={() => onFocusPlanNavigate?.(item.focus_plan!.id)}>Focus Plan: {item.focus_plan.title}</button>)}{item.deadline && <span>Deadline <time dateTime={item.deadline.deadline_local_date}>{item.deadline.deadline_local_date}</time> · {item.deadline.state}{item.deadline.scheduled_after_deadline ? " · scheduled after deadline" : ""}</span>}{item.tags.map((tag) => <span key={tag.id}>#{tag.name}{tag.archived ? " (archived)" : ""}</span>)}</div></div>
                      <button type="button" aria-label={`Open ${item.title}, scheduled ${item.scheduled_local_date}`} onClick={() => onOpenItem({ localDate: item.scheduled_local_date, taskId: item.task_id, seriesId: item.series_id, originalLocalDate: item.original_local_date })}>Open</button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </section>

      {editor && (
        <div className={styles.dialog} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
          <div
            ref={editorRef}
            className={styles.editor}
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-view-editor-heading"
          >
            <form onSubmit={(event) => { event.preventDefault(); setSaveError(null); save.mutate(); }}>
              <h2 id="saved-view-editor-heading">{editor.mode === "create" ? "Create Saved View" : "Edit Saved View"}</h2>
              {editor.unsupported && <p className={styles.notice}>This view has an unsupported stored filter. Saving replaces it with the typed controls below.</p>}
              {saveError && <div ref={errorRef} tabIndex={-1} role="alert">{saveError}</div>}
              <label className={styles.field}>Name<input ref={nameRef} value={draft.name} maxLength={80} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
              <div className={styles.fieldRow}>
                <label className={styles.field}>Base scope<select value={draft.base_scope} onChange={(event) => setDraft({ ...draft, base_scope: event.target.value as TaskSavedViewBaseScope })}><option value="today">Today</option><option value="upcoming">Upcoming</option><option value="overdue">Overdue</option><option value="deadlines">Deadlines</option></select></label>
                <label className={styles.field}>Sort<select value={draft.sort_mode} onChange={(event) => setDraft({ ...draft, sort_mode: event.target.value as TaskSavedViewSortMode })}><option value="base_default">Base default</option><option value="scheduled_ascending">Scheduled ascending</option><option value="priority_then_scheduled">Priority, then scheduled</option><option value="title_ascending">Title ascending</option></select></label>
                <label className={styles.field}>Group<select value={draft.group_mode} onChange={(event) => setDraft({ ...draft, group_mode: event.target.value as TaskSavedViewGroupMode })}><option value="base_default">Base default</option><option value="none">No groups</option><option value="category">Category</option><option value="life_area">Life area</option><option value="focus_plan">Focus Plan</option></select></label>
              </div>
              <section aria-labelledby="saved-view-filter-heading"><h3 id="saved-view-filter-heading">Filters (all must match)</h3>{options.isLoading ? <LoadingRow label="Loading filter choices…" /> : options.isError ? <p role="alert">Filter choices could not be loaded.</p> : <>{draft.predicate.clauses.map((clause, index) => <ClauseEditor key={clause.kind} clause={clause} options={options.data!} onChange={(next) => setDraft({ ...draft, predicate: { type: "all", clauses: draft.predicate.clauses.map((value, candidate) => candidate === index ? next : value) } })} onRemove={() => setDraft({ ...draft, predicate: { type: "all", clauses: draft.predicate.clauses.filter((_, candidate) => candidate !== index) } })} />)}{unused.length > 0 && <div className={styles.actions}><label>Add filter<select value={addKind} onChange={(event) => setAddKind(event.target.value as ClauseKind)}>{unused.map((kind) => <option key={kind} value={kind}>{clauseLabels[kind]}</option>)}</select></label><button type="button" onClick={() => setDraft({ ...draft, predicate: { type: "all", clauses: [...draft.predicate.clauses, newClause(addKind, options.data)] } })}>Add</button></div>}</>}</section>
              <div className={styles.actions}><button type="submit" disabled={save.isPending || options.isLoading}>{save.isPending ? "Saving…" : "Save view"}</button><button type="button" onClick={closeEditor}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
