import { invoke } from "@tauri-apps/api/core";

import type { HealthCheck } from "./generated/HealthCheck";
import type { FoundationRecordView } from "./generated/FoundationRecordView";
import type { CreateFoundationRecordInput } from "./generated/CreateFoundationRecordInput";
import type { UpdateFoundationRecordInput } from "./generated/UpdateFoundationRecordInput";
import type { MutateFoundationRecordInput } from "./generated/MutateFoundationRecordInput";

export function healthCheck(): Promise<HealthCheck> {
  return invoke<HealthCheck>("health_check");
}

export function createFoundationRecord(
  input: CreateFoundationRecordInput,
): Promise<FoundationRecordView> {
  return invoke<FoundationRecordView>("create_foundation_record", { input });
}

export function listFoundationRecords(): Promise<FoundationRecordView[]> {
  return invoke<FoundationRecordView[]>("list_foundation_records");
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
