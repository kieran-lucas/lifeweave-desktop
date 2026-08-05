import { invoke } from "@tauri-apps/api/core";

import type { CreateFocusPlanInput } from "../../ipc/generated/CreateFocusPlanInput";
import type { FocusPlanDetailView } from "../../ipc/generated/FocusPlanDetailView";
import type { FocusPlanIdInput } from "../../ipc/generated/FocusPlanIdInput";
import type { FocusPlanListInput } from "../../ipc/generated/FocusPlanListInput";
import type { FocusPlanMutationResult } from "../../ipc/generated/FocusPlanMutationResult";
import type { FocusPlanSummaryView } from "../../ipc/generated/FocusPlanSummaryView";
import type { MutateFocusPlanInput } from "../../ipc/generated/MutateFocusPlanInput";
import type { SaveFocusPlanDraftInput } from "../../ipc/generated/SaveFocusPlanDraftInput";

export const listFocusPlans = (input: FocusPlanListInput) =>
  invoke<FocusPlanSummaryView[]>("list_focus_plans", { input });

export const getFocusPlan = (input: FocusPlanIdInput) =>
  invoke<FocusPlanDetailView>("get_focus_plan", { input });

export const createFocusPlan = (input: CreateFocusPlanInput) =>
  invoke<FocusPlanDetailView>("create_focus_plan", { input });

export const mutateFocusPlan = (input: MutateFocusPlanInput) =>
  invoke<FocusPlanMutationResult>("mutate_focus_plan", { input });

export const saveFocusPlanDraft = (input: SaveFocusPlanDraftInput) =>
  invoke<void>("save_focus_plan_draft", { input });

export const discardFocusPlanDraft = (input: FocusPlanIdInput) =>
  invoke<void>("discard_focus_plan_draft", { input });
