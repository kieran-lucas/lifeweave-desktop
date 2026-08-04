import { invoke } from "@tauri-apps/api/core";

import type { BackupSummary } from "./generated/BackupSummary";
import type { BackupProgress } from "./generated/BackupProgress";
import type { RestoreResult } from "./generated/RestoreResult";
import type { HealthCheck } from "./generated/HealthCheck";
import type { FoundationRecordView } from "./generated/FoundationRecordView";
import type { CreateFoundationRecordInput } from "./generated/CreateFoundationRecordInput";
import type { UpdateFoundationRecordInput } from "./generated/UpdateFoundationRecordInput";
import type { MutateFoundationRecordInput } from "./generated/MutateFoundationRecordInput";
import type { TaskCategoryView } from "./generated/TaskCategoryView";
import type { TaskView } from "./generated/TaskView";
import type { RelatedTaskView } from "./generated/RelatedTaskView";
import type { CreateTaskInput } from "./generated/CreateTaskInput";
import type { UpdateTaskInput } from "./generated/UpdateTaskInput";
import type { CreateRecurringTaskInput } from "./generated/CreateRecurringTaskInput";
import type { RecurringOccurrenceView } from "./generated/RecurringOccurrenceView";
import type { UpdateRecurringOccurrenceInput } from "./generated/UpdateRecurringOccurrenceInput";
import type { TodayItemView } from "./generated/TodayItemView";
import type { MonthProjection } from "./generated/MonthProjection";
import type { CompletionStateView } from "./generated/CompletionStateView";
import type { EvaluateTaskInput } from "./generated/EvaluateTaskInput";
import type { TaskEvaluationView } from "./generated/TaskEvaluationView";
import type { UndoTaskEvaluationInput } from "./generated/UndoTaskEvaluationInput";
import type { AnalyticsProjection } from "./generated/AnalyticsProjection";
import type { AnalyticsProjectionInput } from "./generated/AnalyticsProjectionInput";
import type { UpdateCategoryGoalsInput } from "./generated/UpdateCategoryGoalsInput";
import type { GetLifeBrowseInput } from "./generated/GetLifeBrowseInput";
import type { LifeBrowseProjection } from "./generated/LifeBrowseProjection";
import type { PinnedLifeNodeView } from "./generated/PinnedLifeNodeView";
import type { TaskLifeTargetView } from "./generated/TaskLifeTargetView";
import type { LifeNodeIdInput } from "./generated/LifeNodeIdInput";
import type { LifeMutationResult } from "./generated/LifeMutationResult";
import type { SaveLifeNavigationPreferenceInput } from "./generated/SaveLifeNavigationPreferenceInput";
import type { LifeNavigationPreferenceView } from "./generated/LifeNavigationPreferenceView";
import type { CreateLifeNodeOperationInput } from "./generated/CreateLifeNodeOperationInput";
import type { EditLifeNodeTextInput } from "./generated/EditLifeNodeTextInput";
import type { EditLifeNodeMetadataInput } from "./generated/EditLifeNodeMetadataInput";
import type { EditLifeNodeAppearanceInput } from "./generated/EditLifeNodeAppearanceInput";
import type { EditLifeNodeStateInput } from "./generated/EditLifeNodeStateInput";
import type { ReorderLifeSiblingInput } from "./generated/ReorderLifeSiblingInput";
import type { ReparentLifeNodeInput } from "./generated/ReparentLifeNodeInput";
import type { UndoLifeOperationInput } from "./generated/UndoLifeOperationInput";
import type { LifeEditProjection } from "./generated/LifeEditProjection";
import type { ReaderDocumentProjection } from "./generated/ReaderDocumentProjection";
import type { ReaderDocumentView } from "./generated/ReaderDocumentView";
import type { ReaderNodeInput } from "./generated/ReaderNodeInput";
import type { CreateReaderDocumentInput } from "./generated/CreateReaderDocumentInput";
import type { SaveReaderDocumentInput } from "./generated/SaveReaderDocumentInput";
import type { SaveReaderDraftInput } from "./generated/SaveReaderDraftInput";
import type { ReaderDocumentIdInput } from "./generated/ReaderDocumentIdInput";
import type { ImportReaderMarkdownInput } from "./generated/ImportReaderMarkdownInput";
import type { MarkdownExportView } from "./generated/MarkdownExportView";
import type { ImportDocumentAssetInput } from "./generated/ImportDocumentAssetInput";
import type { DocumentAssetView } from "./generated/DocumentAssetView";
import type { DocumentAssetIdInput } from "./generated/DocumentAssetIdInput";
import type { DocumentAssetBytes } from "./generated/DocumentAssetBytes";
import type { SearchGlobalInput } from "./generated/SearchGlobalInput";
import type { GlobalSearchProjection } from "./generated/GlobalSearchProjection";
import type { NarrativeDocumentProjection } from "./generated/NarrativeDocumentProjection";
import type { NarrativeDocumentView } from "./generated/NarrativeDocumentView";
import type { NarrativeNodeInput } from "./generated/NarrativeNodeInput";
import type { CreateNarrativeDocumentInput } from "./generated/CreateNarrativeDocumentInput";
import type { SaveNarrativeDocumentInput } from "./generated/SaveNarrativeDocumentInput";
import type { SaveNarrativeDraftInput } from "./generated/SaveNarrativeDraftInput";
import type { NarrativeDocumentIdInput } from "./generated/NarrativeDocumentIdInput";
import type { PreviewNarrativeMarkdownInput } from "./generated/PreviewNarrativeMarkdownInput";
import type { NarrativeMarkdownPreview } from "./generated/NarrativeMarkdownPreview";
import type { ImportNarrativeMarkdownInput } from "./generated/ImportNarrativeMarkdownInput";
import type { NarrativeMarkdownExport } from "./generated/NarrativeMarkdownExport";

export function healthCheck(): Promise<HealthCheck> {
  return invoke<HealthCheck>("health_check");
}

/** Returns all active (non-archived) foundation records, ordered by created_at ASC. */
export function listFoundationRecords(): Promise<FoundationRecordView[]> {
  return invoke<FoundationRecordView[]>("list_foundation_records");
}

/** Returns all archived foundation records, ordered by created_at ASC. */
export function listArchivedFoundationRecords(): Promise<FoundationRecordView[]> {
  return invoke<FoundationRecordView[]>("list_archived_foundation_records");
}

export function createFoundationRecord(
  input: CreateFoundationRecordInput,
): Promise<FoundationRecordView> {
  return invoke<FoundationRecordView>("create_foundation_record", { input });
}

export function updateFoundationRecord(
  input: UpdateFoundationRecordInput,
): Promise<FoundationRecordView> {
  return invoke<FoundationRecordView>("update_foundation_record", { input });
}

export function archiveFoundationRecord(
  input: MutateFoundationRecordInput,
): Promise<void> {
  return invoke<void>("archive_foundation_record", { input });
}

export function restoreFoundationRecord(
  input: MutateFoundationRecordInput,
): Promise<void> {
  return invoke<void>("restore_foundation_record", { input });
}

/** Creates a backup package and returns the backup location and checksum. */
export function backupDatabase(): Promise<BackupSummary> {
  return invoke<BackupSummary>("backup_database");
}

export function listBackups(): Promise<BackupSummary[]> {
  return invoke<BackupSummary[]>("list_backups");
}

/** Restores a backend-owned backup selected by opaque identity. */
export function restoreDatabase(backupId: string): Promise<RestoreResult> {
  return invoke<RestoreResult>("restore_database", { backupId });
}

export type { BackupProgress };

export const listTaskCategories = () => invoke<TaskCategoryView[]>("list_task_categories");
export const getRelatedTasksForLifeNode = (nodeId: string, anchorLocalDate: string) =>
  invoke<RelatedTaskView[]>("get_related_tasks_for_life_node", { nodeId, anchorLocalDate });
export const listTasksForDate = (localDate: string) => invoke<TaskView[]>("list_tasks_for_date", { localDate });
export const createTask = (input: CreateTaskInput) => invoke<TaskView>("create_task", { input });
export const updateTask = (input: UpdateTaskInput) => invoke<TaskView>("update_task", { input });
export const deleteTask = (id: string) => invoke<void>("delete_task", { id });
export const createRecurringTask = (input: CreateRecurringTaskInput) => invoke<string>("create_recurring_task", { input });
export const listRecurringOccurrences = (localDate: string) => invoke<RecurringOccurrenceView[]>("list_recurring_occurrences", { localDate });
export const updateRecurringOccurrence = (input: UpdateRecurringOccurrenceInput) => invoke<void>("update_recurring_occurrence", { input });
export const listTodayItems = (localDate: string) => invoke<TodayItemView[]>("list_today_items", { localDate });
export const getMonthProjection = (year: number, month: number, selectedDate: string, today: string) =>
  invoke<MonthProjection>("get_month_projection", { year, month, selectedDate, today });
export const listCompletionStates = () => invoke<CompletionStateView[]>("list_completion_states");
export const evaluateTask = (input: EvaluateTaskInput) => invoke<TaskEvaluationView>("evaluate_task", { input });
export const undoTaskEvaluation = (input: UndoTaskEvaluationInput) => invoke<TaskEvaluationView|null>("undo_task_evaluation", { input });
export const getAnalyticsProjection = (input: AnalyticsProjectionInput) => invoke<AnalyticsProjection>("get_analytics_projection", { input });
export const updateCategoryGoals = (input: UpdateCategoryGoalsInput) => invoke<TaskCategoryView>("update_category_goals", { input });
export const getLifeBrowseProjection = (input: GetLifeBrowseInput) => invoke<LifeBrowseProjection>("get_life_browse_projection", { input });
export const getPinnedLifeNodes = () => invoke<PinnedLifeNodeView[]>("get_pinned_life_nodes");
export const listTaskLifeTargets = () => invoke<TaskLifeTargetView[]>("list_task_life_targets");
export const pinLifeNode = (input: LifeNodeIdInput) => invoke<LifeMutationResult>("pin_life_node", { input });
export const unpinLifeNode = (input: LifeNodeIdInput) => invoke<LifeMutationResult>("unpin_life_node", { input });
export const saveLifeNavigationPreference = (input: SaveLifeNavigationPreferenceInput) => invoke<LifeNavigationPreferenceView>("save_life_navigation_preference", { input });
export const getLifeEditProjection = () => invoke<LifeEditProjection>("get_life_edit_projection");
export const createLifeNode = (input: CreateLifeNodeOperationInput) => invoke<LifeMutationResult>("create_life_node", { input });
export const renameLifeNode = (input: EditLifeNodeTextInput) => invoke<LifeMutationResult>("rename_life_node", { input });
export const updateLifeNodeSummary = (input: EditLifeNodeMetadataInput) => invoke<LifeMutationResult>("update_life_node_summary", { input });
export const archiveLifeNode = (input: EditLifeNodeStateInput) => invoke<LifeMutationResult>("archive_life_node", { input });
export const restoreLifeNode = (input: EditLifeNodeStateInput) => invoke<LifeMutationResult>("restore_life_node", { input });
export const setLifeNodeIcon = (input: EditLifeNodeAppearanceInput) => invoke<LifeMutationResult>("set_life_node_icon", { input });
export const setLifeNodeThemeVariant = (input: EditLifeNodeAppearanceInput) => invoke<LifeMutationResult>("set_life_node_theme_variant", { input });
export const reorderLifeSibling = (input: ReorderLifeSiblingInput) => invoke<LifeMutationResult>("reorder_life_sibling", { input });
export const reparentLifeNode = (input: ReparentLifeNodeInput) => invoke<LifeMutationResult>("reparent_life_node", { input });
export const undoLifeOperation = (input: UndoLifeOperationInput) => invoke<LifeMutationResult>("undo_life_operation", { input });
export const getReaderDocument = (input: ReaderNodeInput) => invoke<ReaderDocumentProjection>("get_reader_document", { input });
export const createReaderDocument = (input: CreateReaderDocumentInput) => invoke<ReaderDocumentView>("create_reader_document", { input });
export const saveReaderDocument = (input: SaveReaderDocumentInput) => invoke<ReaderDocumentView>("save_reader_document", { input });
export const saveReaderDraft = (input: SaveReaderDraftInput) => invoke<ReaderDocumentProjection>("save_reader_draft", { input });
export const discardReaderDraft = (input: ReaderDocumentIdInput) => invoke<ReaderDocumentProjection>("discard_reader_draft", { input });
export const recoverReaderDraft = (input: ReaderDocumentIdInput) => invoke<ReaderDocumentView>("recover_reader_draft", { input });
export const importReaderMarkdown = (input: ImportReaderMarkdownInput) => invoke<ReaderDocumentView>("import_reader_markdown", { input });
export const exportReaderMarkdown = (input: ReaderDocumentIdInput) => invoke<MarkdownExportView>("export_reader_markdown", { input });
export const importDocumentAsset = (input: ImportDocumentAssetInput) => invoke<DocumentAssetView>("import_document_asset", { input });
export const getDocumentAsset = (input: DocumentAssetIdInput) => invoke<DocumentAssetBytes>("get_document_asset", { input });
export const searchGlobal = (input: SearchGlobalInput) => invoke<GlobalSearchProjection>("search_global", { input });
export const getNarrativeDocument = (input: NarrativeNodeInput) => invoke<NarrativeDocumentProjection>("get_narrative_document", { input });
export const createNarrativeDocument = (input: CreateNarrativeDocumentInput) => invoke<NarrativeDocumentView>("create_narrative_document", { input });
export const saveNarrativeDocument = (input: SaveNarrativeDocumentInput) => invoke<NarrativeDocumentView>("save_narrative_document", { input });
export const saveNarrativeDraft = (input: SaveNarrativeDraftInput) => invoke<NarrativeDocumentProjection>("save_narrative_draft", { input });
export const discardNarrativeDraft = (input: NarrativeDocumentIdInput) => invoke<NarrativeDocumentProjection>("discard_narrative_draft", { input });
export const recoverNarrativeDraft = (input: NarrativeDocumentIdInput) => invoke<NarrativeDocumentView>("recover_narrative_draft", { input });
export const previewNarrativeMarkdown = (input: PreviewNarrativeMarkdownInput) => invoke<NarrativeMarkdownPreview>("preview_narrative_markdown", { input });
export const importNarrativeMarkdown = (input: ImportNarrativeMarkdownInput) => invoke<NarrativeDocumentView>("import_narrative_markdown", { input });
export const exportNarrativeMarkdown = (input: NarrativeDocumentIdInput) => invoke<NarrativeMarkdownExport>("export_narrative_markdown", { input });
