import { useEffect, useRef, useState } from "react";

import { backupDatabase, listBackups, restoreDatabase } from "../../ipc/commands";
import type { BackupCompatibility } from "../../ipc/generated/BackupCompatibility";
import type { BackupSummary } from "../../ipc/generated/BackupSummary";
import * as styles from "./BackupSettings.css";
import { EmptyState, SkeletonList } from "../../design-system/primitives/States";
import { iconSettings } from "../../design-system/visual/icons";
import { useModalFocusTrap } from "../../app/useModalFocusTrap";

const compatibilityText: Record<BackupCompatibility, string> = {
  ready: "Ready",
  migration_required: "Will migrate when restored",
  newer_schema: "Requires a newer Lifeweave schema",
  newer_format: "Uses a newer backup format",
};

function canRestore(backup: BackupSummary): boolean {
  return backup.compatibility === "ready" || backup.compatibility === "migration_required";
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && error.code === "RecoveryPending") {
    return "Restart Lifeweave to complete restore cleanup, then try again.";
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "The backup operation could not be completed.";
}

function formatBytes(bytes: bigint): string {
  if (bytes < 1024n) return `${bytes} B`;
  const kib = Number(bytes) / 1024;
  if (kib < 1024) return `${kib.toFixed(1)} KiB`;
  return `${(kib / 1024).toFixed(1)} MiB`;
}

export function BackupSettings({ onDatabaseRestored }: { onDatabaseRestored: () => void }) {
  const [backups, setBackups] = useState<BackupSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"create" | "restore" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BackupSummary | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const restoreTriggerRef = useRef<HTMLButtonElement | null>(null);
  const rowRestoreRefs = useRef(new Map<string, HTMLButtonElement>());

  async function loadInventory() {
    try {
      const next = await listBackups();
      setBackups(next);
      setLoadError(null);
      return next;
    } catch (error) {
      setLoadError(errorMessage(error));
      return null;
    }
  }

  useEffect(() => {
    void loadInventory();
  }, []);

  function closeConfirmation() {
    if (busy === "restore") return;
    setConfirmation(null);
    requestAnimationFrame(() => restoreTriggerRef.current?.focus());
  }

  useModalFocusTrap({ container: dialogRef, initialFocus: cancelRef, onEscape: closeConfirmation, escapeEnabled: busy !== "restore", active: confirmation !== null });

  async function createBackup() {
    setBusy("create");
    setMessage(null);
    setOperationError(null);
    try {
      const result = await backupDatabase();
      await loadInventory();
      const parts = [`Backup created at ${result.backup.created_at}.`];
      if (result.pruned_backup_count > 0) {
        parts.push(
          `${result.pruned_backup_count} older managed ${result.pruned_backup_count === 1 ? "backup was" : "backups were"} removed.`,
        );
      }
      if (result.retention_cleanup_pending) {
        parts.push("The backup succeeded, but older-version cleanup did not fully complete.");
      }
      setMessage(parts.join(" "));
      requestAnimationFrame(() => rowRestoreRefs.current.get(result.backup.backup_id)?.focus());
    } catch (error) {
      setOperationError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  function openConfirmation(backup: BackupSummary, trigger: HTMLButtonElement) {
    restoreTriggerRef.current = trigger;
    setOperationError(null);
    setConfirmation(backup);
  }

  async function confirmRestore() {
    if (!confirmation || busy === "restore") return;
    setBusy("restore");
    setOperationError(null);
    try {
      await restoreDatabase(confirmation.backup_id);
      onDatabaseRestored();
      await loadInventory();
      setConfirmation(null);
      setMessage("Restore complete.");
    } catch (error) {
      setOperationError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="backup-settings-heading">
      <div className={styles.headingRow}>
        <div>
          <h2 id="backup-settings-heading" className={styles.heading}>Backup &amp; restore</h2>
          <p className={styles.intro}>Create and restore verified local managed backups.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={createBackup} disabled={busy !== null}>
          {busy === "create" ? "Creating backup…" : "Create backup"}
        </button>
      </div>

      <h3 className={styles.subheading}>Retention policy</h3>
      <p className={styles.policy}>
        Lifeweave keeps the fresh backup and up to 11 other recent restorable managed backups (12
        total). Older restorable versions are removed only after the new backup is safely published.
        Backups from a newer format or schema are never automatically removed by this version.
      </p>

      <h3 className={styles.subheading}>Managed backup versions</h3>
      {backups === null && !loadError && <SkeletonList rows={3} label="Loading managed backups…" />}
      {loadError && <p role="alert" className={styles.error}>{loadError}</p>}
      {backups?.length === 0 && <EmptyState compact icon={iconSettings} title="No managed backups yet." body="Create a backup to keep a restorable copy of your data." />}
      {backups && backups.length > 0 && (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <caption className={styles.visuallyHidden}>Managed backup versions, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Created</th><th scope="col">App</th><th scope="col">Format</th>
                <th scope="col">Schema</th><th scope="col">DB size</th><th scope="col">Compatibility</th>
                <th scope="col"><span className={styles.visuallyHidden}>Action</span></th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.backup_id} data-backup-id={backup.backup_id}>
                  <td><time dateTime={backup.created_at}>{backup.created_at}</time></td>
                  <td>{backup.app_version}</td><td>{backup.format_version}</td>
                  <td>{backup.schema_version}</td><td>{formatBytes(backup.db_size_bytes)}</td>
                  <td>{compatibilityText[backup.compatibility]}</td>
                  <td>
                    <button
                      ref={(node) => {
                        if (node) rowRestoreRefs.current.set(backup.backup_id, node);
                        else rowRestoreRefs.current.delete(backup.backup_id);
                      }}
                      type="button"
                      className={styles.secondaryButton}
                      aria-label={`Restore backup from ${backup.created_at}`}
                      disabled={!canRestore(backup) || busy !== null}
                      aria-describedby={!canRestore(backup) ? `compatibility-${backup.backup_id}` : undefined}
                      onClick={(event) => openConfirmation(backup, event.currentTarget)}
                    >Restore</button>
                    {!canRestore(backup) && (
                      <span id={`compatibility-${backup.backup_id}`} className={styles.visuallyHidden}>
                        {compatibilityText[backup.compatibility]}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message && <p className={styles.status} aria-live="polite">{message}</p>}
      {operationError && <p className={styles.error} role="alert">{operationError}</p>}

      {confirmation && (
        <div className={styles.backdrop}>
          <section
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-backup-title"
            aria-describedby="restore-backup-description"
          >
            <h2 id="restore-backup-title">Restore managed backup?</h2>
            <div id="restore-backup-description">
              <p><time dateTime={confirmation.created_at}>{confirmation.created_at}</time></p>
              <p>Backup format {confirmation.format_version} · schema {confirmation.schema_version}</p>
              <p>{compatibilityText[confirmation.compatibility]}</p>
              {confirmation.compatibility === "migration_required" && (
                <p>The restore candidate will migrate forward. The source backup remains unchanged.</p>
              )}
              <p>Before replacing local data, Lifeweave creates a safety snapshot of the current local database.</p>
            </div>
            <div className={styles.dialogActions}>
              <button ref={cancelRef} type="button" className={styles.secondaryButton} onClick={closeConfirmation} disabled={busy === "restore"}>Cancel</button>
              <button type="button" className={styles.primaryButton} onClick={confirmRestore} disabled={busy === "restore"}>
                {busy === "restore" ? "Restoring…" : "Restore backup"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
