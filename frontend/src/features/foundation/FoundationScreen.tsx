import { useEffect, useRef, useState } from "react";

import type { FoundationRecordView } from "../../ipc/generated/FoundationRecordView";
import {
  archiveFoundationRecord,
  backupDatabase,
  createFoundationRecord,
  listArchivedFoundationRecords,
  listFoundationRecords,
  restoreDatabase,
  restoreFoundationRecord,
  updateFoundationRecord,
} from "../../ipc/commands";
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
      backupDir: string | null;
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

export function FoundationScreen() {
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [newLabel, setNewLabel] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const [active, archived] = await Promise.all([
        listFoundationRecords(),
        listArchivedFoundationRecords(),
      ]);
      setState((prev) => ({
        kind: "ready",
        active,
        archived,
        formError: null,
        edit: prev.kind === "ready" ? prev.edit : null,
        backupDir: prev.kind === "ready" ? prev.backupDir : null,
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
    try {
      const result = await backupDatabase();
      setState((prev) =>
        prev.kind === "ready"
          ? {
              ...prev,
              backupDir: result.backup_dir,
              backupMessage: `Backup created at ${result.created_at}`,
              backupError: null,
            }
          : prev,
      );
    } catch (e) {
      setState((prev) =>
        prev.kind === "ready"
          ? { ...prev, backupError: extractErrorMessage(e), backupMessage: null }
          : prev,
      );
    }
  }

  async function handleDbRestore() {
    if (state.kind !== "ready" || !state.backupDir) return;
    const dir = state.backupDir;
    try {
      await restoreDatabase(dir);
      setState((prev) =>
        prev.kind === "ready"
          ? { ...prev, backupMessage: "Restore complete.", backupError: null }
          : prev,
      );
      await load();
    } catch (e) {
      setState((prev) =>
        prev.kind === "ready"
          ? { ...prev, backupError: extractErrorMessage(e) }
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
        <button type="button" className={styles.button} onClick={handleBackup}>
          Backup
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleDbRestore}
          disabled={!state.backupDir}
        >
          Restore
        </button>
      </div>
      {state.backupMessage && (
        <p className={styles.statusText} aria-live="polite">
          {state.backupMessage}
        </p>
      )}
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
