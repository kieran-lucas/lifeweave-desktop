import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { listTaskLifeTargets } from "../../ipc/commands";
import type { FocusPlanDetailView } from "../../ipc/generated/FocusPlanDetailView";
import type { FocusPlanLifecycle } from "../../ipc/generated/FocusPlanLifecycle";
import type { FocusPlanMutationAction } from "../../ipc/generated/FocusPlanMutationAction";
import type { FocusPlanPortfolio } from "../../ipc/generated/FocusPlanPortfolio";
import type { FocusPlanSummaryView } from "../../ipc/generated/FocusPlanSummaryView";
import type { TaskLifeTargetView } from "../../ipc/generated/TaskLifeTargetView";
import {
  createFocusPlan,
  getFocusPlan,
  listFocusPlans,
  mutateFocusPlan,
} from "./ipc";
import * as styles from "./FocusPlansScreen.css";
import { PageFrame } from "../../app/layout/PageFrame";
import type { TaskNavigate } from "./LinkedWorkPanel";
import { invalidateTaskSavedViewReferenceData } from "../task/saved-views/savedViewQueries";
import { EmptyState, SkeletonList } from "../../design-system/primitives/States";
import { PlanScoreDialog } from "./PlanScoreDialog";

const PlanContentEditor = lazy(() => import("./PlanContentEditor"));

export type FocusPlanEntryRequest = {
  requestId: string;
  planId: string;
};

type Props = {
  entryRequest: FocusPlanEntryRequest | null;
  onEntryRequestSettled: (requestId: string) => void;
  anchorLocalDate: string;
  onTaskNavigate?: TaskNavigate | undefined;
};

type PlanForm = {
  title: string;
  lifecycle: FocusPlanLifecycle;
  lifeNodeId: string;
  startDate: string;
  targetDate: string;
  outcome: string;
  criteriaText: string;
  tagIds: string[];
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
    criteriaText: plan.success_criteria.join("\n"),
    tagIds: plan.tags.map((tag) => tag.id),
  };
}

function messageFromError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "The operation could not be completed.";
}

function planMeta(plan: FocusPlanSummaryView) {
  const parts: string[] = [];
  if (plan.life_title) parts.push(plan.life_title);
  if (plan.target_date) parts.push(plan.target_date);
  return parts.length ? parts.join(" · ") : "No target yet";
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
  const [portfolio, setPortfolio] = useState<FocusPlanPortfolio>("active");
  const [plans, setPlans] = useState<FocusPlanSummaryView[]>([]);
  const [selected, setSelected] = useState<FocusPlanDetailView | null>(null);
  const [form, setForm] = useState<PlanForm | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lifeTargets, setLifeTargets] = useState<TaskLifeTargetView[]>([]);
  const [createTitle, setCreateTitle] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);
  const [scoreTarget, setScoreTarget] = useState<ScoreTarget | null>(null);

  const syncDetail = useCallback((plan: FocusPlanDetailView) => {
    setSelected(plan);
    setForm(formFromPlan(plan));
  }, []);

  const loadPortfolio = useCallback(async (nextPortfolio: FocusPlanPortfolio) => {
    setStatus("loading");
    setError(null);
    try {
      setPlans(await listFocusPlans({ portfolio: nextPortfolio, limit: 200, offset: 0 }));
    } catch (cause) {
      setError(messageFromError(cause));
    } finally {
      setStatus("ready");
    }
  }, []);

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
    if (!editing || lifeTargets.length > 0) return;
    listTaskLifeTargets()
      .then(setLifeTargets)
      .catch((cause) => setError(messageFromError(cause)));
  }, [editing, lifeTargets.length]);

  useEffect(() => {
    if (!entryRequest) return;
    void openPlan(entryRequest.planId).finally(() =>
      onEntryRequestSettled(entryRequest.requestId),
    );
  }, [entryRequest, onEntryRequestSettled, openPlan]);

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
        operation_id: globalThis.crypto.randomUUID(),
        mutation,
      });
      await invalidateTaskSavedViewReferenceData(queryClient);
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
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
        operation_id: globalThis.crypto.randomUUID(),
        mutation: { action: "set_score", score },
      });
      setPlans((current) => current.map((item) => (
        item.id === plan.id ? { ...item, score, revision: result.revision } : item
      )));
      setStatus("ready");
      return null;
    } catch (cause) {
      setStatus("ready");
      return messageFromError(cause);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const title = createTitle.trim();
    if (!title) return;
    setStatus("saving");
    setError(null);
    try {
      const plan = await createFocusPlan({
        title,
        life_node_id: null,
        start_date: null,
        target_date: null,
        outcome: "",
        success_criteria: [],
        initial_variant_label: "Primary approach",
        operation_id: globalThis.crypto.randomUUID(),
      });
      setCreateTitle("");
      setCreating(false);
      setPortfolio("draft");
      syncDetail(plan);
      setEditing(true);
      await invalidateTaskSavedViewReferenceData(queryClient);
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await loadPortfolio("draft");
    } catch (cause) {
      setError(messageFromError(cause));
      setStatus("ready");
    }
  }

  function updateForm<K extends keyof PlanForm>(key: K, value: PlanForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function savePlan() {
    if (!form) return;
    const saved = await runMutation({
      action: "update_plan",
      title: form.title,
      lifecycle: form.lifecycle,
      life_node_id: form.lifeNodeId || null,
      start_date: form.startDate || null,
      target_date: form.targetDate || null,
      outcome: form.outcome,
      success_criteria: form.criteriaText
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      tag_ids: form.tagIds,
    });
    if (saved) setEditing(false);
  }

  const closePlan = () => {
    setSelected(null);
    setForm(null);
    setEditing(false);
  };

  if (selected && form) {
    return (
      <PageFrame as="section" type="focused" aria-labelledby="plan-detail-heading">
        <article className={styles.document}>
          <header className={styles.documentHeader}>
            <button className={styles.backButton} type="button" onClick={closePlan}>
              Back to plans
            </button>
            <div className={styles.documentActions}>
              {!selected.archived && !editing && (
                <button className={styles.secondaryAction} type="button" onClick={() => setEditing(true)}>
                  Edit
                </button>
              )}
              {editing && (
                <>
                  <button
                    className={styles.secondaryAction}
                    type="button"
                    onClick={() => {
                      setForm(formFromPlan(selected));
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.primaryAction}
                    type="button"
                    disabled={status === "saving"}
                    onClick={() => void savePlan()}
                  >
                    {status === "saving" ? "Saving…" : "Save"}
                  </button>
                </>
              )}
              {!editing && (
                <button
                  type="button"
                  className={styles.archiveAction}
                  disabled={status === "saving"}
                  onClick={() => void runMutation({ action: selected.archived ? "restore_plan" : "archive_plan" })}
                >
                  {selected.archived ? "Restore" : "Archive"}
                </button>
              )}
            </div>
          </header>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.hero}>
            <div className={styles.heroIdentity}>
              <span className={styles.lifecycle}>{selected.lifecycle}</span>
              {editing ? (
                <>
                  <h1 id="plan-detail-heading" className={styles.srOnly}>Edit plan {selected.title}</h1>
                  <input
                    className={styles.titleInput}
                    aria-label="Plan title"
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                  />
                </>
              ) : (
                <h1 id="plan-detail-heading" className={styles.documentTitle} data-completed={selected.lifecycle === "completed" ? "" : undefined} tabIndex={-1}>
                  {selected.title}
                </h1>
              )}
            </div>

            <section className={styles.planContent} aria-labelledby="plan-content-heading">
              <h2 id="plan-content-heading" className={styles.srOnly}>Plan content</h2>
              <Suspense fallback={<SkeletonList rows={4} label="Loading Plan content…" />}>
                <PlanContentEditor
                  key={`${selected.id}-${selected.revision}-${editing ? "edit" : "read"}`}
                  value={editing ? form.outcome : selected.outcome}
                  editing={editing}
                  onChange={(outcome) => updateForm("outcome", outcome)}
                />
              </Suspense>
            </section>
          </div>

          {(editing || selected.start_date || selected.target_date || selected.life_title) ? (
            <div className={styles.factRow} data-editing={editing ? "" : undefined} aria-label="Plan facts">
              {editing ? (
                <>
                  <label className={styles.factEditor}>
                    <span>Start</span>
                    <input type="date" value={form.startDate} onChange={(event) => updateForm("startDate", event.target.value)} />
                  </label>
                  <label className={styles.factEditor}>
                    <span>Target</span>
                    <input type="date" value={form.targetDate} onChange={(event) => updateForm("targetDate", event.target.value)} />
                  </label>
                  <label className={styles.factEditor}>
                    <span>Life area</span>
                    <select value={form.lifeNodeId} onChange={(event) => updateForm("lifeNodeId", event.target.value)}>
                      <option value="">Unlinked</option>
                      {lifeTargets.map((target) => (
                        <option key={target.id} value={target.id}>{target.breadcrumb}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.factEditor}>
                    <span>Status</span>
                    <select value={form.lifecycle} onChange={(event) => updateForm("lifecycle", event.target.value as FocusPlanLifecycle)}>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  {(selected.start_date || selected.target_date) ? (
                    <div><span>Dates</span><strong>{selected.start_date ?? "No start"} – {selected.target_date ?? "No target"}</strong></div>
                  ) : null}
                  {selected.life_title ? <div><span>Life area</span><strong>{selected.life_title}</strong></div> : null}
                </>
              )}
            </div>
          ) : null}

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
          <button className={styles.primaryAction} type="button" onClick={() => setCreating(true)}>
            New plan
          </button>
        </header>

        {creating && (
          <form className={styles.quickCreate} onSubmit={handleCreate}>
            <input
              autoFocus
              aria-label="New plan title"
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              placeholder="Name the outcome worth protecting…"
            />
            <button type="button" className={styles.secondaryAction} onClick={() => { setCreating(false); setCreateTitle(""); }}>
              Cancel
            </button>
            <button className={styles.primaryAction} disabled={status === "saving" || !createTitle.trim()}>
              Create
            </button>
          </form>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        <nav className={styles.portfolioNav} aria-label="Plan portfolios">
          {portfolios.map((item) => (
            <button
              key={item.id}
              type="button"
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
                  <strong data-completed={plan.lifecycle === "completed" ? "" : undefined}>{plan.title}</strong>
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
          onSave={(score) => saveScore(scoreTarget.plan, score)}
          onClose={() => setScoreTarget(null)}
        />
      ) : null}
      <p className={styles.srOnly} aria-live="polite">{status === "saving" ? "Saving plan." : ""}</p>
    </PageFrame>
  );
}
