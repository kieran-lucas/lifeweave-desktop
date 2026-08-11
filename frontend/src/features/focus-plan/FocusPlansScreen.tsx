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
import { PageFrame } from "../../app/layout/PageFrame";
import { LinkedWorkPanel, type TaskNavigate } from "./LinkedWorkPanel";
import { invalidateTaskSavedViewReferenceData } from "../task/saved-views/savedViewQueries";
import { Icon, iconChevronLeft, iconPlans } from "../../design-system/visual/icons";
import { EmptyState, SkeletonList } from "../../design-system/primitives/States";

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
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
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
    const criteria = selected.success_criteria;
    return (
      <PageFrame as="section" type="standard" aria-labelledby="plan-detail-heading">
        <article className={styles.document}>
          <header className={styles.documentHeader}>
            <button className={styles.backButton} type="button" onClick={closePlan}>
              <Icon d={iconChevronLeft} size={16} />
              Plans
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
            </div>
          </header>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.hero}>
            <span className={styles.lifecycle}>{selected.lifecycle}</span>
            {editing ? (
              <input
                className={styles.titleInput}
                aria-label="Plan title"
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
              />
            ) : (
              <h1 id="plan-detail-heading" className={styles.documentTitle} tabIndex={-1}>
                {selected.title}
              </h1>
            )}

            {editing ? (
              <textarea
                className={styles.outcomeEditor}
                aria-label="Plan outcome"
                value={form.outcome}
                onChange={(event) => updateForm("outcome", event.target.value)}
                placeholder="What should be true when this succeeds?"
              />
            ) : (
              <p className={styles.outcomeStatement}>
                {selected.outcome || "Define the outcome that makes this plan worth doing."}
              </p>
            )}
          </div>

          <div className={styles.factRow} aria-label="Plan facts">
            {editing ? (
              <>
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
                <div><span>Target</span><strong>{selected.target_date ?? "Open"}</strong></div>
                <div><span>Life area</span><strong>{selected.life_title ?? "Unlinked"}</strong></div>
                <div><span>Updated</span><strong>{selected.updated_at.slice(0, 10)}</strong></div>
              </>
            )}
          </div>

          <section className={styles.criteriaSection} aria-labelledby="criteria-heading">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIndex}>01</span>
              <h2 id="criteria-heading">Definition of done</h2>
            </div>
            {editing ? (
              <textarea
                className={styles.criteriaEditor}
                value={form.criteriaText}
                onChange={(event) => updateForm("criteriaText", event.target.value)}
                placeholder="One criterion per line"
              />
            ) : criteria.length ? (
              <ol className={styles.criteriaList}>
                {criteria.map((criterion, index) => (
                  <li key={`${criterion}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{criterion}</p></li>
                ))}
              </ol>
            ) : (
              <p className={styles.missingContent}>No success criteria yet.</p>
            )}
          </section>

          <section className={styles.linkedSection} aria-labelledby="linked-heading">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIndex}>02</span>
              <h2 id="linked-heading">Work in motion</h2>
            </div>
            <LinkedWorkPanel
              planId={selected.id}
              anchorLocalDate={anchorLocalDate}
              onTaskNavigate={onTaskNavigate}
            />
          </section>

          <footer className={styles.documentFooter}>
            {editing && (
              <label className={styles.startDateEditor}>
                <span>Start date</span>
                <input type="date" value={form.startDate} onChange={(event) => updateForm("startDate", event.target.value)} />
              </label>
            )}
            <button
              type="button"
              className={styles.archiveAction}
              disabled={status === "saving"}
              onClick={() => void runMutation({ action: selected.archived ? "restore_plan" : "archive_plan" })}
            >
              {selected.archived ? "Restore plan" : "Archive plan"}
            </button>
          </footer>
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
            <span className={styles.libraryKicker}>Focus</span>
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
              icon={iconPlans}
              title="Nothing here."
              body="A plan should exist only when an outcome deserves sustained attention."
            />
          )}
          {plans.map((plan, index) => (
            <button
              key={plan.id}
              type="button"
              className={styles.planRow}
              onClick={() => void openPlan(plan.id)}
            >
              <span className={styles.planOrdinal}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.planCopy}>
                <strong>{plan.title}</strong>
                <small>{planMeta(plan)}</small>
              </span>
              <span className={styles.planStatus}>{plan.lifecycle}</span>
              <span className={styles.planArrow} aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      </div>
      <p className={styles.srOnly} aria-live="polite">{status === "saving" ? "Saving plan." : ""}</p>
    </PageFrame>
  );
}
