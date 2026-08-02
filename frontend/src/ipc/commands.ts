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
import type { CreateTaskInput } from "./generated/CreateTaskInput";
import type { UpdateTaskInput } from "./generated/UpdateTaskInput";
import type { CreateRecurringTaskInput } from "./generated/CreateRecurringTaskInput";
import type { RecurringOccurrenceView } from "./generated/RecurringOccurrenceView";
import type { UpdateRecurringOccurrenceInput } from "./generated/UpdateRecurringOccurrenceInput";
import type { TodayItemView } from "./generated/TodayItemView";

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
export const listTasksForDate = (localDate: string) => invoke<TaskView[]>("list_tasks_for_date", { localDate });
export const createTask = (input: CreateTaskInput) => invoke<TaskView>("create_task", { input });
export const updateTask = (input: UpdateTaskInput) => invoke<TaskView>("update_task", { input });
export const deleteTask = (id: string) => invoke<void>("delete_task", { id });
export const createRecurringTask = (input: CreateRecurringTaskInput) => invoke<string>("create_recurring_task", { input });
export const listRecurringOccurrences = (localDate: string) => invoke<RecurringOccurrenceView[]>("list_recurring_occurrences", { localDate });
export const updateRecurringOccurrence = (input: UpdateRecurringOccurrenceInput) => invoke<void>("update_recurring_occurrence", { input });
export const listTodayItems = (localDate: string) => invoke<TodayItemView[]>("list_today_items", { localDate });
