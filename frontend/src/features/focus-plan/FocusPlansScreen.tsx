import { useCallback, useEffect, useState } from "react";
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
import { PageFrame, PageHeader } from "../../app/layout/PageFrame";
import { LinkedWorkPanel, type TaskNavigate } from "./LinkedWorkPanel";
import { invalidateTaskSavedViewReferenceData } from "../task/saved-views/savedViewQueries";
import { iconPlans } from "../../design-system/visual/icons";
import { EmptyState, SkeletonList } from "../../design-system/primitives/States";
import { button as sharedButton } from "../../design-system/primitives/controls.css";

const primaryButton = sharedButton.primary;
const secondaryButton = sharedButton.secondary;
const dangerButton = sharedButton.destructive;

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
  /** Kept when saving so hiding tag management never destroys existing data. */
  tagIds: string[];
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
  const parts = [plan.life_title ?? "Unlinked"];
  if (plan.target_date) parts.push(`Target ${plan.target_date}`);
  return parts.join(" · ");
}

export function FocusPlansScreen({
  entryRequest,
  onEntryRequestSettled,
  anchorLocalDate,
  onTaskNavigate,
}: Props) {
  const queryClient = useQueryClient();
  const [portfolio, setPortfolio] = useState<FocusPlanPortfolio>("active");
  const [plans, setPlans] = useState<FocusPlanSummaryView[]>([]);
  const [selected, setSelected] = useState<FocusPlanDetailView | null>(null);
  const [form, setForm] = useState<PlanForm | null>(null);
  const [lifeTargets, setLifeTargets] = useState<TaskLifeTargetView[]>([]);
  const [createTitle, setCreateTitle] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);

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

  const openPlan = useCallback(async (planId: string) => {
    setStatus("loading");
    setError(null);
    try {
      syncDetail(await getFocusPlan({ plan_id: planId }));
    } catch (cause) {
      setError(messageFromError(cause));
    } finally {
      setStatus("ready");
    }
  }, [syncDetail]);

  useEffect(() => {
    void loadPortfolio(portfolio);
  }, [loadPortfolio, portfolio]);

  useEffect(() => {
    listTaskLifeTargets()
      .then(setLifeTargets)
      .catch((cause) => setError(messageFromError(cause)));
  }, []);

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
      return true;
    } catch (cause) {
      setError(messageFromError(cause));
      try {
        // Refresh the authoritative revision without replacing the user's rejected local edits.
        setSelected(await getFocusPlan({ plan_id: selected.id }));
      } catch {
        // Keep the original mutation error and local form visible.
      }
      setStatus("ready");
      return false;
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
      setPortfolio("draft");
      syncDetail(plan);
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

  function savePlan() {
    if (!form) return;
    void runMutation({
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
  }

  return (
    <PageFrame as="section" type="standard" aria-labelledby="plans-heading">
      <PageHeader
        actions={
          <form className={styles.createForm} onSubmit={handleCreate}>
            <label className={styles.srOnly} htmlFor="new-plan-title">New plan title</label>
            <input
              id="new-plan-title"
              className={styles.createInput}
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              placeholder="New plan"
            />
            <button className={primaryButton} disabled={status === "saving" || !createTitle.trim()}>
              Create
            </button>
          </form>
        }
      >
        <h1 id="plans-heading" tabIndex={-1} className={styles.heading}>Plans</h1>
        <p className={styles.lede}>A small set of outcomes worth protecting.</p>
      </PageHeader>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.portfolios} role="tablist" aria-label="Plan portfolios">
        {portfolios.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={portfolio === item.id}
            className={styles.tab}
            onClick={() => setPortfolio(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.workspace}>
        <aside className={styles.listPanel} aria-label={`${portfolio} plans`}>
          {status === "loading" && plans.length === 0 ? (
            <SkeletonList rows={4} label="Loading plans…" />
          ) : null}
          {status !== "loading" && plans.length === 0 ? (
            <EmptyState
              compact
              icon={iconPlans}
              title="Nothing here."
              body="Keep this list short; create a plan only for work that deserves sustained attention."
            />
          ) : null}
          <ul className={styles.planList}>
            {plans.map((plan) => (
              <li key={plan.id}>
                <button
                  type="button"
                  className={styles.planButton}
                  aria-current={selected?.id === plan.id ? "true" : undefined}
                  onClick={() => void openPlan(plan.id)}
                >
                  <strong>{plan.title}</strong>
                  <span>{planMeta(plan)}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.detailPanel}>
          {!selected || !form ? (
            <div className={styles.emptyState}>
              <strong>Select a plan.</strong>
              <span>The brief stays deliberately small: outcome, target, criteria, and linked work.</span>
            </div>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <p className={styles.kicker}>{selected.lifecycle}</p>
                  <h2>{selected.title}</h2>
                  <p className={styles.muted}>
                    {selected.life_title ?? "No Life area"}
                    {selected.target_date ? ` · target ${selected.target_date}` : ""}
                  </p>
                </div>
              </div>

              <fieldset className={styles.brief} disabled={status === "saving" || selected.archived}>
                <legend className={styles.srOnly}>Plan brief</legend>

                <label className={styles.field}>
                  <span>Title</span>
                  <input className={styles.input} value={form.title} onChange={(event) => updateForm("title", event.target.value)} />
                </label>

                <label className={styles.field}>
                  <span>Outcome</span>
                  <textarea
                    className={styles.outcome}
                    value={form.outcome}
                    onChange={(event) => updateForm("outcome", event.target.value)}
                    placeholder="What should be true when this plan succeeds?"
                  />
                </label>

                <div className={styles.twoColumns}>
                  <label className={styles.field}>
                    <span>Target date</span>
                    <input className={styles.input} type="date" value={form.targetDate} onChange={(event) => updateForm("targetDate", event.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span>Life area</span>
                    <select className={styles.input} value={form.lifeNodeId} onChange={(event) => updateForm("lifeNodeId", event.target.value)}>
                      <option value="">Unlinked</option>
                      {lifeTargets.map((target) => <option key={target.id} value={target.id}>{target.breadcrumb}</option>)}
                    </select>
                  </label>
                </div>

                <label className={styles.field}>
                  <span>Success criteria</span>
                  <textarea
                    className={styles.criteria}
                    value={form.criteriaText}
                    onChange={(event) => updateForm("criteriaText", event.target.value)}
                    placeholder="One clear criterion per line"
                  />
                </label>

                <div className={styles.actions}>
                  <button type="button" className={primaryButton} onClick={savePlan}>Save</button>
                </div>
              </fieldset>

              <details className={styles.advanced}>
                <summary>More details</summary>
                <div className={styles.advancedBody}>
                  <div className={styles.twoColumns}>
                    <label className={styles.field}>
                      <span>Status</span>
                      <select className={styles.input} value={form.lifecycle} onChange={(event) => updateForm("lifecycle", event.target.value as FocusPlanLifecycle)}>
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Start date</span>
                      <input className={styles.input} type="date" value={form.startDate} onChange={(event) => updateForm("startDate", event.target.value)} />
                    </label>
                  </div>
                  <div className={styles.advancedActions}>
                    <button type="button" className={secondaryButton} onClick={savePlan}>Save details</button>
                    <button
                      type="button"
                      className={dangerButton}
                      disabled={status === "saving"}
                      onClick={() => void runMutation({ action: selected.archived ? "restore_plan" : "archive_plan" })}
                    >
                      {selected.archived ? "Restore plan" : "Archive plan"}
                    </button>
                  </div>
                </div>
              </details>

              <LinkedWorkPanel
                planId={selected.id}
                anchorLocalDate={anchorLocalDate}
                onTaskNavigate={onTaskNavigate}
              />
            </>
          )}
        </div>
      </div>

      <p className={styles.srOnly} aria-live="polite">{status === "saving" ? "Saving plan." : ""}</p>
    </PageFrame>
  );
}
