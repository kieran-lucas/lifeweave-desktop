import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { FocusPlanDetailView } from "../../ipc/generated/FocusPlanDetailView";
import type { FocusPlanLifecycle } from "../../ipc/generated/FocusPlanLifecycle";
import type { FocusPlanMutationAction } from "../../ipc/generated/FocusPlanMutationAction";
import type { FocusPlanPortfolio } from "../../ipc/generated/FocusPlanPortfolio";
import type { FocusPlanSummaryView } from "../../ipc/generated/FocusPlanSummaryView";
import {
  createFocusPlan,
  getFocusPlan,
  listFocusPlans,
  mutateFocusPlan,
} from "./ipc";
import * as styles from "./FocusPlansScreen.css";
import { PageFrame } from "../../app/layout/PageFrame";
import { invalidateTaskSavedViewReferenceData } from "../task/saved-views/savedViewQueries";
import { EmptyState, SkeletonList } from "../../design-system/primitives/States";
import { Icon, iconCalendar, iconDetails } from "../../design-system/visual/icons";
import { PlanScoreDialog } from "./PlanScoreDialog";
import { LifeAreaCombobox } from "../task/LifeAreaCombobox";
import { localToday } from "../calendar/date";

const PlanContentEditor = lazy(() => import("./PlanContentEditor"));
const TaskDatePicker = lazy(() =>
  import("../task/today/TaskSchedulePickers").then((module) => ({ default: module.TaskDatePicker })),
);

export type FocusPlanEntryRequest = {
  requestId: string;
  planId: string;
};

type Props = {
  entryRequest: FocusPlanEntryRequest | null;
  onEntryRequestSettled: (requestId: string) => void;
};

type PlanForm = {
  title: string;
  lifecycle: FocusPlanLifecycle;
  lifeNodeId: string;
  startDate: string;
  targetDate: string;
  outcome: string;
};

type ScoreTarget = {
  plan: FocusPlanSummaryView;
  invoker: HTMLButtonElement;
};

const portfolios: Array<{ id: FocusPlanPortfolio; label: string }> = [
  { id: "active", label: "Active" },
  { id: "draft", label: "Drafts" },
  { id: "paused", label: "Paused" },
  { id: "completed", label: "Completed" },
];

function formFromPlan(plan: FocusPlanDetailView): PlanForm {
  return {
    title: plan.title,
    lifecycle: plan.lifecycle,
    lifeNodeId: plan.life_node_id ?? "",
    startDate: plan.start_date ?? "",
    targetDate: plan.target_date ?? "",
    outcome: plan.outcome,
  };
}

function emptyPlanForm(): PlanForm {
  return {
    title: "",
    lifecycle: "draft",
    lifeNodeId: "",
    startDate: "",
    targetDate: "",
    outcome: "",
  };
}

function EditorSection({ id, title, icon, children }: {
  id: string;
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return <section className={styles.planEditorSection} aria-labelledby={id}>
    <header className={styles.planEditorSectionHeading}>
      <span aria-hidden="true"><Icon d={icon} size={18} /></span>
      <h2 id={id}>{title}</h2>
    </header>
    {children}
  </section>;
}

function messageFromError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "The operation could not be completed.";
}

function planMeta(plan: FocusPlanSummaryView) {
  const parts: string[] = [];
  if (plan.life_title) parts.push(plan.life_title);
  if (plan.target_date) parts.push(`Target ${formatPlanDate(plan.target_date)}`);
  return parts.length ? parts.join(" · ") : "No target yet";
}

function formatPlanDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(navigator.language || "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function scoreBand(score: number | null) {
  if (score === null) return "unset";
  if (score < 40) return "low";
  if (score < 70) return "developing";
  if (score < 90) return "strong";
  return "excellent";
}

export function FocusPlansScreen({
  entryRequest,
  onEntryRequestSettled,
}: Props) {
  const queryClient = useQueryClient();
  const completedPortfolioButton = useRef<HTMLButtonElement>(null);
  const [portfolio, setPortfolio] = useState<FocusPlanPortfolio>("active");
  const [plans, setPlans] = useState<FocusPlanSummaryView[]>([]);
  const [selected, setSelected] = useState<FocusPlanDetailView | null>(null);
  const [form, setForm] = useState<PlanForm | null>(null);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);
  const [scoreTarget, setScoreTarget] = useState<ScoreTarget | null>(null);
  const scoreMovesToCompleted = useRef(false);
  const creating = form !== null && selected === null;
  const portfolioKey = (value: FocusPlanPortfolio) => ["focus-plans", value] as const;

  const syncDetail = useCallback((plan: FocusPlanDetailView) => {
    setSelected(plan);
    setForm(formFromPlan(plan));
  }, []);

  const loadPortfolio = useCallback(async (nextPortfolio: FocusPlanPortfolio) => {
    setStatus("loading");
    setError(null);
    try {
      setPlans(await queryClient.fetchQuery({
        queryKey: portfolioKey(nextPortfolio),
        queryFn: () => listFocusPlans({ portfolio: nextPortfolio, limit: 200, offset: 0 }),
        staleTime: 30_000,
      }));
    } catch (cause) {
      setError(messageFromError(cause));
    } finally {
      setStatus("ready");
    }
  }, [queryClient]);

  const openPlan = useCallback(
    async (planId: string) => {
      setStatus("loading");
      setError(null);
      try {
        syncDetail(await getFocusPlan({ plan_id: planId }));
        setEditing(false);
      } catch (cause) {
        setError(messageFromError(cause));
      } finally {
        setStatus("ready");
      }
    },
    [syncDetail],
  );

  useEffect(() => {
    void loadPortfolio(portfolio);
  }, [loadPortfolio, portfolio]);

  useEffect(() => {
    if (!entryRequest) return;
    void openPlan(entryRequest.planId).finally(() =>
      onEntryRequestSettled(entryRequest.requestId),
    );
  }, [entryRequest, onEntryRequestSettled, openPlan]);

  useEffect(() => {
    if (!form || (!editing && selected)) return;
    const viewport = document.querySelector<HTMLElement>("[data-app-viewport]");
    if (viewport) {
      viewport.scrollTop = 0;
      viewport.scrollLeft = 0;
    }
  }, [creating, editing]);

  async function refreshSelected() {
    if (!selected) return;
    syncDetail(await getFocusPlan({ plan_id: selected.id }));
    await loadPortfolio(portfolio);
  }

  async function runMutation(mutation: FocusPlanMutationAction): Promise<boolean> {
    if (!selected) return false;
    setStatus("saving");
    setError(null);
    try {
      await mutateFocusPlan({
        plan_id: selected.id,
        expected_revision: selected.revision,
        operation_id: crypto.randomUUID(),
        mutation,
      });
      await invalidatePlanConsumers();
      await refreshSelected();
      setStatus("ready");
      return true;
    } catch (cause) {
      setError(messageFromError(cause));
      try {
        setSelected(await getFocusPlan({ plan_id: selected.id }));
      } catch {
        // Keep the original mutation error and the user's local draft visible.
      }
      setStatus("ready");
      return false;
    }
  }

  async function saveScore(plan: FocusPlanSummaryView, score: number | null): Promise<string | null> {
    setStatus("saving");
    try {
      const result = await mutateFocusPlan({
        plan_id: plan.id,
        expected_revision: plan.revision,
        operation_id: crypto.randomUUID(),
        mutation: { action: "set_score", score },
      });
      await invalidatePlanConsumers();
      setPlans((current) => current.map((item) => (
        item.id === plan.id
          ? { ...item, score, lifecycle: score === null ? item.lifecycle : "completed", revision: result.revision }
          : item
      )));
      if (score !== null && portfolio !== "completed") scoreMovesToCompleted.current = true;
      setStatus("ready");
      return null;
    } catch (cause) {
      setStatus("ready");
      return messageFromError(cause);
    }
  }

  function updateForm<K extends keyof PlanForm>(key: K, value: PlanForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function savePlan() {
    if (!form) return;
    if (!form.title.trim()) {
      setError("Give this plan a title before saving.");
      return;
    }
    if (creating) {
      setStatus("saving");
      setError(null);
      try {
        const plan = await createFocusPlan({
          title: form.title.trim(),
          life_node_id: form.lifeNodeId || null,
          start_date: form.startDate || null,
          target_date: form.targetDate || null,
          outcome: form.outcome,
          success_criteria: [],
          initial_variant_label: "Primary approach",
          operation_id: crypto.randomUUID(),
        });
        setEditing(false);
        setPortfolio("draft");
        syncDetail(plan);
        await invalidatePlanConsumers();
        await loadPortfolio("draft");
      } catch (cause) {
        setError(messageFromError(cause));
        setStatus("ready");
      }
      return;
    }
    const saved = await runMutation({
      action: "update_plan",
      title: form.title,
      lifecycle: form.lifecycle,
      life_node_id: form.lifeNodeId || null,
      start_date: form.startDate || null,
      target_date: form.targetDate || null,
      outcome: form.outcome,
      success_criteria: selected?.success_criteria ?? [],
      tag_ids: selected?.tags.map((tag) => tag.id) ?? [],
    });
    if (saved) setEditing(false);
  }

  const closePlan = () => {
    setSelected(null);
    setForm(null);
    setEditing(false);
  };

  const beginCreate = () => {
    setSelected(null);
    setForm(emptyPlanForm());
    setEditing(false);
    setError(null);
  };

  const cancelEditor = () => {
    setError(null);
    if (creating) {
      setForm(null);
      return;
    }
    if (selected) setForm(formFromPlan(selected));
    setEditing(false);
  };

  const closeScoreDialog = () => {
    setScoreTarget(null);
    if (!scoreMovesToCompleted.current) return;
    scoreMovesToCompleted.current = false;
    setPortfolio("completed");
  };

  const invalidatePlanConsumers = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["focus-plans"] }),
    invalidateTaskSavedViewReferenceData(queryClient),
    queryClient.invalidateQueries({ queryKey: ["focus-plan-targets"] }),
    queryClient.invalidateQueries({ queryKey: ["analytics"] }),
  ]);

  if (form && (creating || editing)) {
    const today = localToday();
    return (
      <PageFrame as="section" type="focused" className={styles.planEditorFrame} aria-labelledby="plan-editor-heading">
        <form
          className={styles.planEditor}
          data-plan-editor
          onSubmit={(event) => { event.preventDefault(); void savePlan(); }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !event.defaultPrevented) cancelEditor();
          }}
        >
          <header className={styles.planEditorHeader}>
            <h1 id="plan-editor-heading">{creating ? "New plan" : "Edit plan"}</h1>
            <button type="button" onClick={cancelEditor} aria-label="Close plan editor"><span aria-hidden="true" /></button>
          </header>

          <div className={styles.planEditorScroll} data-plan-editor-scroll>
          {error && <p className={styles.error} role="alert">{error}</p>}

          <section className={styles.planEditorIntro} aria-label="Plan details">
            <div className={styles.planEditorBody}>
              <label className={styles.planTitleField}>
                <span>Title</span>
                <input autoFocus aria-label="Plan title" value={form.title} placeholder="Untitled plan" onChange={(event) => updateForm("title", event.target.value)} />
              </label>
              <div className={styles.planOutcomeField}>
                <span>Outcome</span>
                <Suspense fallback={<SkeletonList rows={4} label="Loading Plan content…" />}>
                  <PlanContentEditor
                    value={form.outcome}
                    editing
                    onChange={(outcome) => updateForm("outcome", outcome)}
                  />
                </Suspense>
              </div>
            </div>
          </section>

          <EditorSection id="plan-editor-schedule" title="Schedule" icon={iconCalendar}>
            <div className={styles.planEditorGrid}>
              <Suspense fallback={null}>
                {([['Start date', 'startDate'], ['Target date', 'targetDate']] as const).map(([label, field]) =>
                  <TaskDatePicker key={field} label={label} value={form[field] || null} today={today} optional variant="detail" onChange={(value) => updateForm(field, value ?? "")} />
                )}
              </Suspense>
            </div>
          </EditorSection>

          <EditorSection id="plan-editor-context" title="Context" icon={iconDetails}>
            <div className={styles.planEditorGrid}>
              <LifeAreaCombobox
                value={form.lifeNodeId || null}
                current={selected?.life_node_id && selected.life_title ? {
                  id: selected.life_node_id,
                  title: selected.life_title,
                  breadcrumb: selected.life_title,
                  archived: false,
                } : null}
                onChange={(lifeNodeId) => updateForm("lifeNodeId", lifeNodeId ?? "")}
              />
              <div className={styles.planStatusField}>
                <span id="plan-status-label">Status{creating ? <small>Starts as Draft</small> : null}</span>
                <div className={styles.planStatusControl} role="radiogroup" aria-label="Status">
                  {(["draft", "active", "paused", "completed"] as const).map((value) =>
                    <label key={value}>
                      <input
                        type="radio"
                        name="plan-status"
                        value={value}
                        checked={form.lifecycle === value}
                        disabled={creating}
                        onChange={() => updateForm("lifecycle", value)}
                      />
                      <span>{value[0]!.toUpperCase() + value.slice(1)}</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </EditorSection>
          </div>

          <footer className={styles.planEditorFooter}>
            <button type="button" className={styles.secondaryAction} onClick={cancelEditor}>Cancel</button>
            <button className={styles.primaryAction} disabled={status === "saving"}>
              {status === "saving" ? "Saving…" : creating ? "Create plan" : "Save changes"}
            </button>
          </footer>
        </form>
        <p className={styles.srOnly} aria-live="polite">{status === "saving" ? "Saving plan." : ""}</p>
      </PageFrame>
    );
  }

  if (selected) {
    return (
      <PageFrame as="section" type="focused" aria-labelledby="plan-detail-heading">
        <article className={styles.document}>
          <header className={styles.documentHeader}>
            <button className={styles.backButton} type="button" onClick={closePlan}>
              Back to plans
            </button>
            <div className={styles.documentActions}>
              {!selected.archived && (
                <button className={styles.secondaryAction} type="button" onClick={() => setEditing(true)}>
                  Edit
                </button>
              )}
              <button
                type="button"
                className={styles.archiveAction}
                disabled={status === "saving"}
                onClick={() => void runMutation({ action: selected.archived ? "restore_plan" : "archive_plan" })}
              >
                {selected.archived ? "Restore" : "Archive"}
              </button>
            </div>
          </header>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.hero}>
            <div className={styles.heroIdentity}>
              <span className={styles.lifecycle} data-lifecycle={selected.lifecycle}>{selected.lifecycle}</span>
              <h1 id="plan-detail-heading" className={styles.documentTitle} data-completed={selected.lifecycle === "completed" ? "" : undefined} tabIndex={-1}>
                {selected.title}
              </h1>
            </div>

            <section className={styles.planContent} aria-labelledby="plan-content-heading">
              <h2 id="plan-content-heading" className={styles.srOnly}>Plan content</h2>
              <Suspense fallback={<SkeletonList rows={4} label="Loading Plan content…" />}>
                <PlanContentEditor
                  value={selected.outcome}
                  editing={false}
                  onChange={() => undefined}
                />
              </Suspense>
            </section>

          {(selected.start_date || selected.target_date || selected.life_title) ? (
            <div className={styles.factRow} role="group" aria-label="Plan facts">
              {(selected.start_date || selected.target_date) ? (
                <>
                  <div className={styles.dateFact}>
                    <span>Start date</span>
                    <strong>{selected.start_date ? <time dateTime={selected.start_date}>{formatPlanDate(selected.start_date)}</time> : "Not set"}</strong>
                  </div>
                  <div className={styles.dateFact}>
                    <span>Target date</span>
                    <strong>{selected.target_date ? <time dateTime={selected.target_date}>{formatPlanDate(selected.target_date)}</time> : "Not set"}</strong>
                  </div>
                </>
              ) : null}
              {selected.life_title ? <div><span>Life area</span><strong>{selected.life_title}</strong></div> : null}
            </div>
          ) : null}
          </div>

        </article>
        <p className={styles.srOnly} aria-live="polite">{status === "saving" ? "Saving plan." : ""}</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame as="section" type="standard" aria-labelledby="plans-heading">
      <div className={styles.library}>
        <header className={styles.libraryHeader}>
          <div>
            <h1 id="plans-heading" className={styles.libraryTitle} tabIndex={-1}>Plans</h1>
          </div>
          <button className={styles.primaryAction} type="button" onClick={beginCreate}>
            New plan
          </button>
        </header>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <nav className={styles.portfolioNav} aria-label="Plan portfolios">
          {portfolios.map((item) => (
            <button
              key={item.id}
              type="button"
              ref={item.id === "completed" ? completedPortfolioButton : undefined}
              aria-current={portfolio === item.id ? "page" : undefined}
              onClick={() => setPortfolio(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className={styles.planCollection} aria-live="polite">
          {status === "loading" && plans.length === 0 && <SkeletonList rows={5} label="Loading plans…" />}
          {status !== "loading" && plans.length === 0 && (
            <EmptyState
              compact
              title="Nothing here."
              body="A plan should exist only when an outcome deserves sustained attention."
            />
          )}
          {plans.map((plan) => (
            <div key={plan.id} className={styles.planRow}>
              <button type="button" className={styles.planOpen} onClick={() => void openPlan(plan.id)}>
                <span className={styles.planCopy}>
                  <span className={styles.planTitleLine}>
                    <strong data-completed={plan.lifecycle === "completed" ? "" : undefined}>{plan.title}</strong>
                    {plan.lifecycle === "active" ? <span className={styles.activeBadge}>Active</span> : null}
                  </span>
                  <small>{planMeta(plan)}</small>
                </span>
              </button>
              <button
                type="button"
                className={styles.scoreButton}
                data-score-band={scoreBand(plan.score)}
                aria-label={`${plan.title} score: ${plan.score ?? "Not scored"}. Set score`}
                onClick={(event) => setScoreTarget({ plan, invoker: event.currentTarget })}
              >
                {plan.score ?? "—"}
              </button>
            </div>
          ))}
        </div>
      </div>
      {scoreTarget ? (
        <PlanScoreDialog
          key={`${scoreTarget.plan.id}-${scoreTarget.plan.revision}`}
          planTitle={scoreTarget.plan.title}
          currentScore={scoreTarget.plan.score}
          returnFocus={scoreTarget.invoker}
          completedReturnFocus={completedPortfolioButton.current}
          onSave={(score) => saveScore(scoreTarget.plan, score)}
          onClose={closeScoreDialog}
        />
      ) : null}
      <p className={styles.srOnly} aria-live="polite">{status === "saving" ? "Saving plan." : ""}</p>
    </PageFrame>
  );
}
