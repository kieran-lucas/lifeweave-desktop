import { useCallback, useEffect, useMemo, useState } from "react";

import { listTags, listTaskLifeTargets } from "../../ipc/commands";
import type { FocusPlanDetailView } from "../../ipc/generated/FocusPlanDetailView";
import type { FocusPlanLifecycle } from "../../ipc/generated/FocusPlanLifecycle";
import type { FocusPlanMutationAction } from "../../ipc/generated/FocusPlanMutationAction";
import type { FocusPlanPortfolio } from "../../ipc/generated/FocusPlanPortfolio";
import type { FocusPlanSummaryView } from "../../ipc/generated/FocusPlanSummaryView";
import type { TagView } from "../../ipc/generated/TagView";
import type { TaskLifeTargetView } from "../../ipc/generated/TaskLifeTargetView";
import {
  createFocusPlan,
  discardFocusPlanDraft,
  getFocusPlan,
  listFocusPlans,
  mutateFocusPlan,
  saveFocusPlanDraft,
} from "./ipc";
import * as styles from "./FocusPlansScreen.css";
import { PageFrame, PageHeader } from "../../app/layout/PageFrame";
import { LinkedWorkPanel, type TaskNavigate } from "./LinkedWorkPanel";
import { ReviewsPanel } from "./ReviewsPanel";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateTaskSavedViewReferenceData } from "../task/saved-views/savedViewQueries";

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
  { id: "archived", label: "Archived" },
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
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "The operation could not be completed.";
}

function canonicalBody(plainText: string): string {
  if (!plainText.trim()) return JSON.stringify({ type: "doc", content: [] });
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: plainText }],
      },
    ],
  });
}

function recoveryForm(raw: string, fallback: PlanForm): PlanForm {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid recovery draft");
  }

  const draft = value as Record<string, unknown>;
  const lifecycle =
    draft.lifecycle === "draft" ||
    draft.lifecycle === "active" ||
    draft.lifecycle === "paused" ||
    draft.lifecycle === "completed"
      ? draft.lifecycle
      : fallback.lifecycle;
  const criteria = Array.isArray(draft.success_criteria)
    ? draft.success_criteria.filter((item): item is string => typeof item === "string").join("\n")
    : typeof draft.criteriaText === "string"
      ? draft.criteriaText
      : fallback.criteriaText;
  const tags = Array.isArray(draft.tag_ids)
    ? draft.tag_ids.filter((item): item is string => typeof item === "string")
    : Array.isArray(draft.tagIds)
      ? draft.tagIds.filter((item): item is string => typeof item === "string")
      : fallback.tagIds;

  return {
    title: typeof draft.title === "string" ? draft.title : fallback.title,
    lifecycle,
    lifeNodeId:
      typeof draft.life_node_id === "string"
        ? draft.life_node_id
        : draft.life_node_id === null
          ? ""
          : typeof draft.lifeNodeId === "string"
            ? draft.lifeNodeId
            : fallback.lifeNodeId,
    startDate:
      typeof draft.start_date === "string"
        ? draft.start_date
        : draft.start_date === null
          ? ""
          : typeof draft.startDate === "string"
            ? draft.startDate
            : fallback.startDate,
    targetDate:
      typeof draft.target_date === "string"
        ? draft.target_date
        : draft.target_date === null
          ? ""
          : typeof draft.targetDate === "string"
            ? draft.targetDate
            : fallback.targetDate,
    outcome: typeof draft.outcome === "string" ? draft.outcome : fallback.outcome,
    criteriaText: criteria,
    tagIds: tags,
  };
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
  const [tags, setTags] = useState<TagView[]>([]);
  const [createTitle, setCreateTitle] = useState("");
  const [newVariantLabel, setNewVariantLabel] = useState("");
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [variantLabel, setVariantLabel] = useState("");
  const [variantBody, setVariantBody] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);

  const selectedVariant = useMemo(
    () => selected?.variants.find((variant) => variant.id === selected.selected_variant_id) ?? null,
    [selected],
  );
  const orderedPhases = useMemo(
    () => [...(selectedVariant?.phases ?? [])].sort((a, b) => a.sort_key - b.sort_key || a.id.localeCompare(b.id)),
    [selectedVariant],
  );
  const activePhaseIds = useMemo(
    () => orderedPhases.filter((phase) => !phase.archived).map((phase) => phase.id),
    [orderedPhases],
  );

  const syncDetail = useCallback((plan: FocusPlanDetailView) => {
    setSelected(plan);
    setForm(formFromPlan(plan));
    const variant = plan.variants.find((item) => item.id === plan.selected_variant_id);
    setVariantLabel(variant?.label ?? "");
    setVariantBody(variant?.plain_text ?? "");
  }, []);

  const loadPortfolio = useCallback(async (nextPortfolio: FocusPlanPortfolio) => {
    setStatus("loading");
    setError(null);
    try {
      const result = await listFocusPlans({ portfolio: nextPortfolio, limit: 200, offset: 0 });
      setPlans(result);
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
    Promise.all([listTaskLifeTargets(), listTags(false)])
      .then(([targets, activeTags]) => {
        setLifeTargets(targets);
        setTags(activeTags.filter((tag) => !tag.archived && !tag.merged_into));
      })
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
      // Title, lifecycle, archive, and restore all change what Focus Plan Analytics reports.
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await refreshSelected();
      return true;
    } catch (cause) {
      setError(messageFromError(cause));
      try {
        setSelected(await getFocusPlan({ plan_id: selected.id }));
      } catch {
        // Preserve the original mutation error and the local form.
      }
      setStatus("ready");
      return false;
    }
  }

  async function addVariant() {
    const label = newVariantLabel.trim();
    if (!label) return;
    if (await runMutation({ action: "add_variant", label })) {
      setNewVariantLabel("");
    }
  }

  async function addPhase() {
    const title = newPhaseTitle.trim();
    if (!selectedVariant || !title) return;
    if (
      await runMutation({
        action: "add_phase",
        variant_id: selectedVariant.id,
        title,
      })
    ) {
      setNewPhaseTitle("");
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

  async function saveRecoveryDraft() {
    if (!selected || !form) return;
    setStatus("saving");
    setError(null);
    try {
      await saveFocusPlanDraft({
        plan_id: selected.id,
        base_revision: selected.revision,
        draft_json: JSON.stringify(form),
      });
      await refreshSelected();
    } catch (cause) {
      setError(messageFromError(cause));
      setStatus("ready");
    }
  }

  function loadRecoveryDraft() {
    if (!selected?.recovery_draft || !form) return;
    try {
      setForm(recoveryForm(selected.recovery_draft.draft_json, form));
      setError(null);
    } catch (cause) {
      setError(messageFromError(cause));
    }
  }

  async function discardRecoveryDraft() {
    if (!selected) return;
    setStatus("saving");
    setError(null);
    try {
      await discardFocusPlanDraft({ plan_id: selected.id });
      await refreshSelected();
    } catch (cause) {
      setError(messageFromError(cause));
      setStatus("ready");
    }
  }

  return (
    <PageFrame as="section" type="standard" aria-labelledby="plans-heading">
      <PageHeader
        actions={
          <form className={styles.createForm} onSubmit={handleCreate}>
            <label className={styles.srOnly} htmlFor="new-plan-title">New plan title</label>
            <input id="new-plan-title" className={styles.createInput} value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="New focus plan" />
            <button className={styles.primaryButton} disabled={status === "saving" || !createTitle.trim()}>Create</button>
          </form>
        }
      >
        <h1 id="plans-heading" tabIndex={-1} className={styles.heading}>Plans</h1>
        <p className={styles.lede}>Medium-term strategies without fragmenting your Life tree.</p>
      </PageHeader>

      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.portfolios} role="tablist" aria-label="Plan portfolios">
        {portfolios.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={portfolio === item.id} className={styles.tab} onClick={() => setPortfolio(item.id)}>{item.label}</button>
        ))}
      </div>

      <div className={styles.workspace}>
        <aside className={styles.listPanel} aria-label={`${portfolio} plans`}>
          {status === "loading" && plans.length === 0 ? <p className={styles.muted}>Loading plans…</p> : null}
          {status !== "loading" && plans.length === 0 ? <p className={styles.muted}>No plans in this portfolio.</p> : null}
          <ul className={styles.planList}>
            {plans.map((plan) => (
              <li key={plan.id}>
                <button type="button" className={styles.planButton} aria-current={selected?.id === plan.id ? "true" : undefined} onClick={() => void openPlan(plan.id)}>
                  <strong>{plan.title}</strong>
                  <span>{plan.selected_variant_label}</span>
                  <span>{plan.life_title ?? "No Life area"} · {plan.active_phase_count} phases</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.detailPanel}>
          {!selected || !form ? (
            <p className={styles.emptyState}>Select a plan or create a new one.</p>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <h2>{selected.title}</h2>
                  <p className={styles.muted}>Revision {selected.revision} · Updated {selected.updated_at}</p>
                </div>
                <button type="button" className={styles.dangerButton} disabled={status === "saving"} onClick={() => void runMutation({ action: selected.archived ? "restore_plan" : "archive_plan" })}>{selected.archived ? "Restore plan" : "Archive plan"}</button>
              </div>

              <fieldset className={styles.fieldset} disabled={status === "saving" || selected.archived}>
                <legend>Plan details</legend>
                <label>Title<input className={styles.input} value={form.title} onChange={(event) => updateForm("title", event.target.value)} /></label>
                <div className={styles.twoColumns}>
                  <label>Lifecycle<select className={styles.input} value={form.lifecycle} onChange={(event) => updateForm("lifecycle", event.target.value as FocusPlanLifecycle)}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></label>
                  <label>Life area<select className={styles.input} value={form.lifeNodeId} onChange={(event) => updateForm("lifeNodeId", event.target.value)}><option value="">Unlinked</option>{lifeTargets.map((target) => <option key={target.id} value={target.id}>{target.breadcrumb}</option>)}</select></label>
                  <label>Start date<input className={styles.input} type="date" value={form.startDate} onChange={(event) => updateForm("startDate", event.target.value)} /></label>
                  <label>Target date<input className={styles.input} type="date" value={form.targetDate} onChange={(event) => updateForm("targetDate", event.target.value)} /></label>
                </div>
                <label>Outcome<textarea className={styles.textarea} value={form.outcome} onChange={(event) => updateForm("outcome", event.target.value)} /></label>
                <label>Success criteria, one per line<textarea className={styles.textarea} value={form.criteriaText} onChange={(event) => updateForm("criteriaText", event.target.value)} /></label>
                <fieldset className={styles.tagFieldset}><legend>Tags</legend>{tags.map((tag) => <label key={tag.id} className={styles.checkLabel}><input type="checkbox" checked={form.tagIds.includes(tag.id)} onChange={(event) => updateForm("tagIds", event.target.checked ? [...form.tagIds, tag.id] : form.tagIds.filter((id) => id !== tag.id))} />{tag.name}</label>)}</fieldset>
                <div className={styles.actions}>
                  <button type="button" className={styles.primaryButton} onClick={savePlan}>Save plan</button>
                  <button type="button" className={styles.secondaryButton} onClick={() => void saveRecoveryDraft()}>Save recovery draft</button>
                  {selected.recovery_draft && <button type="button" className={styles.secondaryButton} onClick={loadRecoveryDraft}>Load recovery draft</button>}
                  {selected.recovery_draft && <button type="button" className={styles.secondaryButton} onClick={() => void discardRecoveryDraft()}>Discard recovery draft</button>}
                </div>
                {selected.recovery_draft && <p className={styles.draftNote}>Recovery draft saved at {selected.recovery_draft.updated_at}{selected.recovery_draft.conflict ? " · revision conflict" : ""}.</p>}
              </fieldset>

              <section aria-labelledby="variants-heading">
                <h3 id="variants-heading">Approaches</h3>
                <div className={styles.variantTabs}>{selected.variants.map((variant) => <span key={variant.id} className={styles.variantControl}><button type="button" className={styles.tab} aria-pressed={variant.id === selected.selected_variant_id} disabled={variant.archived || status === "saving"} onClick={() => void runMutation({ action: "select_variant", variant_id: variant.id })}>{variant.label}{variant.archived ? " (archived)" : ""}</button>{variant.id !== selected.selected_variant_id && <button type="button" className={styles.iconButton} aria-label={`${variant.archived ? "Restore" : "Archive"} ${variant.label}`} onClick={() => void runMutation({ action: variant.archived ? "restore_variant" : "archive_variant", variant_id: variant.id })}>{variant.archived ? "↺" : "×"}</button>}</span>)}</div>
                <form className={styles.inlineForm} onSubmit={(event) => { event.preventDefault(); void addVariant(); }}><input className={styles.input} value={newVariantLabel} onChange={(event) => setNewVariantLabel(event.target.value)} placeholder="Alternative approach" /><button className={styles.secondaryButton} disabled={!newVariantLabel.trim() || status === "saving"}>Add approach</button></form>
                {selectedVariant && <div className={styles.variantEditor}>
                  <div className={styles.inlineForm}><input className={styles.input} value={variantLabel} onChange={(event) => setVariantLabel(event.target.value)} /><button type="button" className={styles.secondaryButton} disabled={!variantLabel.trim()} onClick={() => void runMutation({ action: "rename_variant", variant_id: selectedVariant.id, label: variantLabel.trim() })}>Rename</button></div>
                  <label>Approach notes<textarea className={styles.textarea} value={variantBody} onChange={(event) => setVariantBody(event.target.value)} /></label>
                  <button type="button" className={styles.secondaryButton} onClick={() => void runMutation({ action: "update_variant_body", variant_id: selectedVariant.id, canonical_json: canonicalBody(variantBody), plain_text: variantBody })}>Save approach notes</button>

                  <h4>Phases</h4>
                  <ol className={styles.phaseList}>{orderedPhases.map((phase, index) => {
                    const activeIndex = activePhaseIds.indexOf(phase.id);
                    return <li key={phase.id} className={styles.phaseRow}><input key={`${phase.id}:${phase.title}`} className={styles.input} defaultValue={phase.title} disabled={phase.archived} aria-label={`Phase ${index + 1} title`} onBlur={(event) => { const title = event.target.value.trim(); if (title && title !== phase.title) void runMutation({ action: "rename_phase", variant_id: selectedVariant.id, phase_id: phase.id, title }); }} /><button type="button" className={styles.iconButton} aria-label={`Move ${phase.title} up`} disabled={phase.archived || activeIndex <= 0} onClick={() => void runMutation({ action: "move_phase", variant_id: selectedVariant.id, phase_id: phase.id, new_index: activeIndex - 1 })}>↑</button><button type="button" className={styles.iconButton} aria-label={`Move ${phase.title} down`} disabled={phase.archived || activeIndex < 0 || activeIndex >= activePhaseIds.length - 1} onClick={() => void runMutation({ action: "move_phase", variant_id: selectedVariant.id, phase_id: phase.id, new_index: activeIndex + 1 })}>↓</button><button type="button" className={styles.secondaryButton} onClick={() => void runMutation({ action: phase.archived ? "restore_phase" : "archive_phase", variant_id: selectedVariant.id, phase_id: phase.id })}>{phase.archived ? "Restore" : "Archive"}</button></li>;
                  })}</ol>
                  <form className={styles.inlineForm} onSubmit={(event) => { event.preventDefault(); void addPhase(); }}><input className={styles.input} value={newPhaseTitle} onChange={(event) => setNewPhaseTitle(event.target.value)} placeholder="New phase" /><button className={styles.secondaryButton} disabled={!newPhaseTitle.trim() || status === "saving"}>Add phase</button></form>
                </div>}
              </section>
              <LinkedWorkPanel
                planId={selected.id}
                anchorLocalDate={anchorLocalDate}
                onTaskNavigate={onTaskNavigate}
              />
              <ReviewsPanel
                planId={selected.id}
                anchorLocalDate={anchorLocalDate}
                disabled={selected.archived}
              />
            </>
          )}
        </div>
      </div>
      <p className={styles.srOnly} aria-live="polite">{status === "saving" ? "Saving plan." : ""}</p>
    </PageFrame>
  );
}
