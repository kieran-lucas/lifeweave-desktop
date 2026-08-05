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
  if (!value || typeof value !== "object") throw new Error("Invalid recovery draft");
  const draft = value as Partial<PlanForm>;
  const lifecycle =
    draft.lifecycle === "draft" ||
    draft.lifecycle === "active" ||
    draft.lifecycle === "paused" ||
    draft.lifecycle === "completed"
      ? draft.lifecycle
      : fallback.lifecycle;
  return {
    title: typeof draft.title === "string" ? draft.title : fallback.title,
    lifecycle,
    lifeNodeId: typeof draft.lifeNodeId === "string" ? draft.lifeNodeId : fallback.lifeNodeId,
    startDate: typeof draft.startDate === "string" ? draft.startDate : fallback.startDate,
    targetDate: typeof draft.targetDate === "string" ? draft.targetDate : fallback.targetDate,
    outcome: typeof draft.outcome === "string" ? draft.outcome : fallback.outcome,
    criteriaText:
      typeof draft.criteriaText === "string" ? draft.criteriaText : fallback.criteriaText,
    tagIds: Array.isArray(draft.tagIds)
      ? draft.tagIds.filter((value): value is string => typeof value === "string")
      : fallback.tagIds,
  };
}

export function FocusPlansScreen({ entryRequest, onEntryRequestSettled }: Props) {
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
      const result = await listFocusPlans({ portfolio nextPortfolio, limit: 200, offset: 0 });
      setPlans(result);
      setStatus("ready");
    } catch (cause) {
      setError(messageFromError(cause));
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

  async function runMutation(mutation: FocusPlanMutationAction) {
    if (!selected) return;
    setStatus("saving");
    setError(null);
    try {
      await mutateFocusPlan({
        plan_id: selected.id,
        expected_revision: selected.revision,
        operation_id: globalThis.crypto.randomUUID(),
        mutation,
      });
      await refreshSelected();
    } catch (cause) {
      setError(messageFromError(cause));
      setStatus("ready");
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const title = createTitle.trim();
    if (!title) return;
    setStatus("saving");
    setError(null);
    try {
      const plan = await createFocusPlan(
        title,
        life_node_id: null,
        start_date: null,
        target_date: null,
        outcome: "",
        success_criteria: [],
        initial_variant_label: "Primary approach",
        operation_id: globalThis.crypto.randomUUID(),
      });
    setCountTitle("");
    setPortfolio("draft");
    syncDetail(plan-¹Û­…ªì¶»§q«^