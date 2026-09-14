import { Suspense, lazy, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useModalFocusTrap } from "../../../app/useModalFocusTrap";
import { DialogBackdrop, DialogSurface } from "../../../app/layout/DialogSurface";
import { LoadingRow } from "../../../design-system/primitives/States";
import { Icon, iconCalendar, iconOptions } from "../../../design-system/visual/icons";
import { createRecurringTask, createTask, deleteTask, listTaskCategories, updateRecurringOccurrence, updateTask } from "../../../ipc/commands";
import type { TagSummaryView } from "../../../ipc/generated/TagSummaryView";
import { TagChipList } from "../../tag/TagChipList";
import { invalidateTaskSavedViewProjections } from "../saved-views/savedViewQueries";
import type { TodayItem } from "./TodayScreen";
import * as styles from "./TaskComposer.css";

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
const TaskDatePicker = lazy(() =>
  import("./TaskSchedulePickers").then((module) => ({ default: module.TaskDatePicker })),
);
const TaskCategoryPicker = lazy(() =>
  import("./TaskCategoryPicker").then((module) => ({ default: module.TaskCategoryPicker })),
);

function ComposerSection({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return <section className={styles.composerSection} aria-labelledby={id}>
    <header className={styles.sectionHeading}>
      <span className={styles.sectionIcon} aria-hidden="true"><Icon d={icon} size={18} /></span>
      <h3 id={id}>{title}</h3>
    </header>
    <div className={styles.sectionBody}>{children}</div>
  </section>;
}

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

export default function TaskComposer({ date, today, editing, onClose }: {
  date: string;
  today: string;
  editing: TodayItem | null;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const dialog = useRef<HTMLElement>(null);
  const initialField = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft>(() => editing ? draftFromItem(editing) : defaultDraft(date, "general"));
  const [repeat, setRepeat] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [error, setError] = useState("");
  const closeComposer = onClose;
  const categories = useQuery({
    queryKey: ["task-categories"],
    queryFn: listTaskCategories,
  });
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

  useModalFocusTrap({
    container: dialog,
    initialFocus: initialField,
    onEscape: closeComposer,
  });

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

  return (
        <DialogBackdrop
          role="presentation"
          onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget && !save.isPending && !remove.isPending) {
              closeComposer();
            }
          }}
        >
          <DialogSurface
            as="section"
            width="standard"
            className={styles.composerSurface}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-composer-heading"
            surfaceRef={dialog}
          >
            <form className={styles.composer} onSubmit={submit}>
              <header className={styles.composerHeader}>
                <div className={styles.composerHeadingCopy}>
                  <h2 id="task-composer-heading">{editing ? "Edit task" : "Plan task"}</h2>
                </div>
                <button type="button" className={styles.closeButton} onClick={closeComposer} aria-label="Close task composer">
                  <span aria-hidden="true" />
                </button>
              </header>

              {error && <p role="alert" className={styles.composerError}>{error}</p>}

              <section className={styles.composerIntro} aria-label="Task details">
                <div className={styles.sectionBody}>
                  <label className={styles.titleFieldWrap}>
                    <span>Title</span>
                    <input
                      ref={initialField}
                      className={styles.titleField}
                      value={draft.title}
                      placeholder="Name the task…"
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    />
                  </label>

                  <label className={styles.detailFieldWide}>
                    <span>Description</span>
                    <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Describe the task or its next concrete step…" />
                  </label>
                </div>
              </section>

              <ComposerSection id="task-schedule-heading" title="Schedule" icon={iconCalendar}>
                  <div className={styles.scheduleBar} data-form-grid="six-column">
                    <Suspense fallback={null}>
                      <TaskDatePicker value={draft.local_date} today={today} onChange={(local_date) => { if (local_date) setDraft((current) => ({ ...current, local_date })); }} />
                      <TaskTimeWheelPicker label="Start" value={draft.start_minute} onChange={(start_minute) => setDraft((current) => ({ ...current, start_minute }))} />
                      <TaskTimeWheelPicker label="End" value={draft.end_minute} onChange={(end_minute) => setDraft((current) => ({ ...current, end_minute }))} />
                    </Suspense>
                  </div>
              </ComposerSection>

              <ComposerSection id="task-context-heading" title="Context" icon={iconOptions}>
                  <div className={styles.detailsPanel} data-form-grid="six-column">

                  <Suspense fallback={<LoadingRow label="Loading categories…" />}>
                    <TaskCategoryPicker
                      value={draft.category_id}
                      categories={categories.data ?? []}
                      current={editing ? {
                        id: editing.category_id,
                        name: editing.category_name,
                        icon_key: editing.category_icon_key,
                        color_key: editing.category_color_key,
                      } : null}
                      loading={categories.isLoading}
                      error={categories.isError}
                      onChange={(category_id) => setDraft({ ...draft, category_id })}
                    />
                  </Suspense>

                  <div className={styles.choiceField} role="group" aria-labelledby="task-priority-label">
                    <span id="task-priority-label" className={styles.fieldLabel}>Priority</span>
                    <div className={styles.choiceGrid} data-columns="3">
                      {(["low", "medium", "high"] as const).map((priority) => <button
                        key={priority}
                        type="button"
                        className={styles.choiceButton}
                        data-tone={priority}
                        aria-pressed={draft.priority === priority}
                        onClick={() => setDraft({ ...draft, priority })}
                      ><strong>{priority[0]!.toUpperCase()}{priority.slice(1)}</strong></button>)}
                    </div>
                  </div>

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

                  <Suspense fallback={<LoadingRow label="Loading deadline calendar…" />}>
                    <TaskDatePicker
                      label="Deadline"
                      value={draft.deadline_local_date}
                      today={today}
                      optional
                      variant="detail"
                      disabled={editing?.kind === "recurring" || repeat}
                      onChange={(deadline_local_date) => setDraft({ ...draft, deadline_local_date })}
                    />
                  </Suspense>

                  {!editing && (
                    <div className={styles.choiceField} role="group" aria-labelledby="task-repeat-label">
                      <span id="task-repeat-label" className={styles.fieldLabel}>Repeat</span>
                      <div className={styles.choiceGrid} data-columns="4">
                        {(["none", "daily", "weekly", "monthly"] as const).map((frequency) => <button
                          key={frequency}
                          type="button"
                          className={styles.choiceButton}
                          aria-pressed={frequency === "none" ? !repeat : repeat && repeatFrequency === frequency}
                          onClick={() => {
                            if (frequency === "none") setRepeat(false);
                            else {
                              setRepeat(true);
                              setRepeatFrequency(frequency);
                              setDraft((current) => ({ ...current, deadline_local_date: null }));
                            }
                          }}
                        ><strong>{frequency === "none" ? "One time" : frequency[0]!.toUpperCase() + frequency.slice(1)}</strong></button>)}
                      </div>
                    </div>
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
              </ComposerSection>

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
            </form>
          </DialogSurface>
        </DialogBackdrop>
  );
}
