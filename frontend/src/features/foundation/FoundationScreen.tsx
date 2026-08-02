import { useEffect, useRef, useState } from "react";

import type { FoundationRecordView } from "../../ipc/generated/FoundationRecordView";
import {
  archiveFoundationRecord,
  backupDatabase,
  createFoundationRecord,
  listArchivedFoundationRecords,
  listBackups,
  listFoundationRecords,
  restoreDatabase,
  restoreFoundationRecord,
  updateFoundationRecord,
} from "../../ipc/commands";
import type { BackupSummary } from "../../ipc/generated/BackupSummary";
import * as styles from "./FoundationScreen.css";

type EditState = { id: string; label: string; revision: number } | null;

type PageState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      active: FoundationRecordView[];
      archived: FoundationRecordView[];
      formError: string | null;
      edit: EditState;
      backups: BackupSummary[];
      selectedBackupId: string | null;
      progress: string | null;
      operationBusy: boolean;
      backupMessage: string | null;
      backupError: string | null;
    };

function operationId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extractErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "An unexpected error occurred.";
}

function isRecoveryPendingError(e: unknown): boolean {
  return !!(
    e &&
    typeof e === "object" &&
    (e as { code?: unknown }).code === "RecoveryPending"
  );
}

export function FoundationScreen() {
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [newLabel, setNewLabel] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const [active, archived, backups] = await Promise.all([
        listFoundationRecords(),
        listArchivedFoundationRecords(),
        listBackups(),
      ]);
      setState((prev) => ({
        kind: "ready",
        active,
        archived,
        formError: null,
        edit: prev.kind === "ready" ? prev.edit : null,
        backups,
        selectedBackupId: prev.kind === "ready" ? prev.selectedBackupId : null,
        progress: null,
        operationBusy: false,
        backupMessage: prev.kind === "ready" ? prev.backupMessage : null,
        backupError: null,
      }));
    } catch (e) {
      setState({ kind: "error", message: extractErrorMessage(e) });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (state.kind === "ready" && state.edit) {
      editInputRef.current?.focus();
    }
  }, [state.kind === "ready" && state.edit?.id]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;
    try {
      await createFoundationRecord({
        operation_id: operationId(),
        label: newLabel,
      });
      setNewLabel("");
      setState((prev) =>
        prev.kind === "ready" ? { ...prev, formError: null } : prev,
      );
      await load();
      createInputRef.current?.focus();
    } catch (e) {
      const msg = extractErrorMessage(e);
      setState((prev) =>
        prev.kind === "ready" ? { ...prev, formError: msg } : prev,
      );
    }
  }

  async function handleUpdate(e: React.FormEvent, record: FoundationRecordView) {
    e.preventDefault();
    if (state.kind !== "ready" || !state.edit) return;
    try {
      await updateFoundationRecord({
        operation_id: operationId(),
        id: record.id,
        label: state.edit.label,
        expected_revision: state.edit.revision,
      });
      setState((prev) =>
        prev.kind === "ready" ? { ...prev, edit: null, formError: null } : prev,
      );
      await load();
    } catch (e) {
      const msg = extractErrorMessage(e);
      setState((prev) =>
        prev.kind === "ready" ? { ...prev, formError: msg } : prev,
      );
    }
  }

  async function handleArchive(record: FoundationRecordView) {
    try {
      await archiveFoundationRecord({
        operation_id: operationId(),
        id: record.id,
        expected_revision: record.revision,
      });
      await load();
    } catch (e) {
      const msg = extractErrorMessage(e);
      setState((prev) =>
        prev.kind === "ready" ? { ...prev, formError: msg } : prev,
      );
    }
  }

  async function handleBackup() {
    if (state.kind !== "ready") return;
    setState((prev) => prev.kind === "ready" ? { ...prev, operationBusy: true, progress: "preparing", backupError: null } : prev);
    try {
      const result = await backupDatabase();
      const backups = await listBackups();
      setState((prev) =>
        prev.kind === "ready"
          ? {
              ...prev,
              backups,
              selectedBackupId: result.backup_id,
              backupMessage: `Backup created at ${result.created_at}`,
              backupError: null,
              progress: "completed",
              operationBusy: false,
            }
          : prev,
      );
    } catch (e) {
      setState((prev) =>
        prev.kind === "ready"
          ? { ...prev, backupError: extractErrorMessage(e), backupMessage: null, operationBusy: false }
          : prev,
      );
    }
  }

  async function handleDbRestore() {
    if (state.kind !== "ready" || !state.selectedBackupId) return;
    const id = state.selectedBackupId;
    setState((prev) => prev.kind === "ready" ? { ...prev, operationBusy: true, progress: "inspecting", backupError: null } : prev);
    try {
      await restoreDatabase(id);
      setState((prev) =>
        prev.kind === "ready"
          ? { ...prev, backupMessage: "Restore complete.", backupError: null, progress: "completed", operationBusy: false }
          : prev,
      );
      await load();
    } catch (e) {
      const msg = isRecoveryPendingError(e)
        ? "Restart the application to complete cleanup, then try again."
        : extractErrorMessage(e);
      setState((prev) =>
        prev.kind === "ready"
          ? { ...prev, backupError: msg, backupMessage: null, operationBusy: false }
          : prev,
      );
    }
  }

  async function handleRestore(record: FoundationRecordView) {
    try {
      await restoreFoundationRecord({
        operation_id: operationId(),
        id: record.id,
        expected_revision: record.revision,
      });
      await load();
    } catch (e) {
      const msg = extractErrorMessage(e);
      setState((prev) =>
        prev.kind === "ready" ? { ...prev, formError: msg } : prev,
      );
    }
  }

  if (state.kind === "loading") {
    return (
      <section className={styles.screen} aria-labelledby="fr-heading">
        <h1 id="fr-heading" className={styles.heading}>
          Foundation Records
        </h1>
        <p className={styles.statusText} aria-live="polite">
          Loading…
        </p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className={styles.screen} aria-labelledby="fr-heading">
        <h1 id="fr-heading" className={styles.heading}>
          Foundation Records
        </h1>
        <p className={styles.errorText} role="alert">
          {state.message}
        </p>
      </section>
    );
  }

  const { active, archived } = state;

  return (
    <section className={styles.screen} aria-labelledby="fr-heading">
      <h1 id="fr-heading" className={styles.heading}>
        Foundation Records
      </h1>

      <form onSubmit={handleCreate} aria-label="Create foundation record">
        <div className={styles.form}>
          <input
            ref={createInputRef}
            className={styles.input}
            type="text"
            placeholder="New record label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            aria-label="New record label"
            maxLength={200}
          />
          <button
            type="submit"
            className={styles.button}
            disabled={newLabel.trim().length === 0}
          >
            Add
          </button>
        </div>
        {state.formError && (
          <p className={styles.errorText} role="alert">
            {state.formError}
          </p>
        )}
      </form>

      <div className={styles.form} style={{ marginTop: "1rem" }}>
        <button type="button" className={styles.button} onClick={handleBackup} disabled={state.operationBusy}>
          Backup
        </button>
        <select aria-label="Backup selection" value={state.selectedBackupId ?? ""} onChange={(e) => setState((prev) => prev.kind === "ready" ? { ...prev, selectedBackupId: e.target.value || null } : prev)} disabled={state.operationBusy}>
          <option value="">Select backup</option>
          {state.backups.map((backup) => <option key={backup.backup_id} value={backup.backup_id}>{backup.created_at}</option>)}
        </select>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleDbRestore}
          disabled={!state.selectedBackupId || state.operationBusy}
        >
          Restore
        </button>
      </div>
      {state.backupMessage && (
        <p className={styles.statusText} aria-live="polite">
          {state.backupMessage}
        </p>
      )}
      {state.progress && <p className={styles.statusText} aria-live="polite">Progress: {state.progress}</p>}
      {state.backupError && (
        <p className={styles.errorText} role="alert">
          {state.backupError}
        </p>
      )}

      {active.length === 0 && archived.length === 0 && (
        <p className={styles.statusText}>No records yet. Add one above.</p>
      )}

      {active.length > 0 && (
        <ul className={styles.list} aria-label="Active foundation records">
          {active.map((record) => (
            <li key={record.id} className={styles.item}>
              {state.edit?.id === record.id ? (
                <form
                  style={{ display: "contents" }}
                  onSubmit={(e) => handleUpdate(e, record)}
                  aria-label={`Edit ${record.label}`}
                >
                  <input
                    ref={editInputRef}
                    className={styles.editInput}
                    type="text"
                    value={state.edit.label}
                    onChange={(e) =>
                      setState((prev) =>
                        prev.kind === "ready" && prev.edit
                          ? {
                              ...prev,
                              edit: { ...prev.edit, label: e.target.value },
                            }
                          : prev,
                      )
                    }
                    aria-label="Edit record label"
                    maxLength={200}
                  />
                  <button
                    type="submit"
                    className={styles.button}
                    disabled={state.edit.label.trim().length === 0}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      setState((prev) =>
                        prev.kind === "ready"
                          ? { ...prev, edit: null, formError: null }
                          : prev,
                      )
                    }
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className={styles.itemLabel}>{record.label}</span>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      setState((prev) =>
                        prev.kind === "ready"
                          ? {
                              ...prev,
                              edit: {
                                id: record.id,
                                label: record.label,
                                revision: record.revision,
                              },
                              formError: null,
                            }
                          : prev,
                      )
                    }
                    aria-label={`Edit ${record.label}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => handleArchive(record)}
                    aria-label={`Archive ${record.label}`}
                  >
                    Archive
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <>
          <p className={styles.sectionHeading}>Archived</p>
          <ul className={styles.list} aria-label="Archived foundation records">
            {archived.map((record) => (
              <li key={record.id} className={styles.archivedItem}>
                <span className={styles.itemLabel}>{record.label}</span>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => handleRestore(record)}
                  aria-label={`Restore ${record.label}`}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
