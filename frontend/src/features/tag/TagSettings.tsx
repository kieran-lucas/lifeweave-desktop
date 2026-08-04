import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveTag,
  createTag,
  listTags,
  mergeTags,
  renameTag,
  restoreTag,
} from "../../ipc/commands";
import type { TagView } from "../../ipc/generated/TagView";
import * as styles from "./TagSettings.css";

export function TagSettings() {
  const [showArchived, setShowArchived] = useState(false);
  const [createName, setCreateName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergePending, setMergePending] = useState<{
    sourceId: string;
    sourceName: string;
    sourceRev: number;
    targetId: string;
    targetName: string;
    targetRev: number;
  } | null>(null);
  const [mergeAnnouncement, setMergeAnnouncement] = useState("");
  const targetRowRef = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["tags"] });
    void queryClient.invalidateQueries({ queryKey: ["today-items"] });
    void queryClient.invalidateQueries({ queryKey: ["task-planning"] });
    void queryClient.invalidateQueries({ queryKey: ["life"] });
  };

  const tagsQuery = useQuery({
    queryKey: ["tags", showArchived],
    queryFn: () => listTags(showArchived),
  });

  const createMutation = useMutation({
    mutationFn: () => createTag({ name: createName }),
    onSuccess: () => { setCreateName(""); invalidateAll(); },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      renameTag({ tag_id: id, name: renameValue, expected_revision: revision }),
    onSuccess: () => { setRenamingId(null); setRenameValue(""); invalidateAll(); },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      archiveTag({ tag_id: id, expected_revision: revision }),
    onSuccess: invalidateAll,
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      restoreTag({ tag_id: id, expected_revision: revision }),
    onSuccess: invalidateAll,
    onError: () => invalidateAll(),
  });

  const mergeMutation = useMutation({
    mutationFn: ({
      sourceId, sourceRev, targetId, targetRev,
    }: { sourceId: string; sourceRev: number; targetId: string; targetRev: number }) =>
      mergeTags({
        source_tag_id: sourceId,
        source_expected_revision: sourceRev,
        target_tag_id: targetId,
        target_expected_revision: targetRev,
      }),
    onSuccess: (_, vars) => {
      setMergePending(null);
      setMergeSourceId("");
      setMergeTargetId("");
      invalidateAll();
      setMergeAnnouncement("Tags merged successfully.");
      setTimeout(() => {
        targetRowRef.current.get(vars.targetId)?.focus();
      }, 100);
    },
    onError: () => {
      setMergePending(null);
      invalidateAll();
    },
  });

  const tags = tagsQuery.data ?? [];
  const activeTags = tags.filter((t) => !t.archived && !t.merged_into);

  const beginMerge = () => {
    const source = tags.find((t) => t.id === mergeSourceId);
    const target = tags.find((t) => t.id === mergeTargetId);
    if (!source || !target) return;
    setMergePending({
      sourceId: source.id, sourceName: source.name, sourceRev: source.revision,
      targetId: target.id, targetName: target.name, targetRev: target.revision,
    });
  };

  const confirmMerge = () => {
    if (!mergePending) return;
    mergeMutation.mutate({
      sourceId: mergePending.sourceId,
      sourceRev: mergePending.sourceRev,
      targetId: mergePending.targetId,
      targetRev: mergePending.targetRev,
    });
  };

  return (
    <div className={styles.root}>
      <h2>Tags</h2>

      <div className={styles.createRow}>
        <input
          className={styles.input}
          type="text"
          placeholder="New tag name"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && createName.trim()) createMutation.mutate(); }}
          aria-label="New tag name"
        />
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!createName.trim() || createMutation.isPending}
        >
          Create
        </button>
      </div>
      {createMutation.isError && (
        <p className={styles.warning} role="alert">{String(createMutation.error)}</p>
      )}

      <div className={styles.toggleRow}>
        <label>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />{" "}
          Show archived and merged tags
        </label>
      </div>

      {tagsQuery.isLoading && <p>Loading tags…</p>}
      {tagsQuery.isError && <p role="alert">Failed to load tags.</p>}

      {tags.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Tasks</th>
              <th>Series</th>
              <th>Life nodes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                renamingId={renamingId}
                renameValue={renameValue}
                onStartRename={() => { setRenamingId(tag.id); setRenameValue(tag.name); }}
                onRenameChange={setRenameValue}
                onRenameConfirm={() => renameMutation.mutate({ id: tag.id, revision: tag.revision })}
                onRenameCancel={() => setRenamingId(null)}
                onArchive={() => archiveMutation.mutate({ id: tag.id, revision: tag.revision })}
                onRestore={() => restoreMutation.mutate({ id: tag.id, revision: tag.revision })}
                isPending={archiveMutation.isPending || restoreMutation.isPending || renameMutation.isPending}
                archiveError={archiveMutation.isError ? String(archiveMutation.error) : null}
                restoreError={restoreMutation.isError ? String(restoreMutation.error) : null}
                rowRef={(el) => {
                  if (el) targetRowRef.current.set(tag.id, el);
                  else targetRowRef.current.delete(tag.id);
                }}
              />
            ))}
          </tbody>
        </table>
      )}

      <span aria-live="polite" className={styles.srOnly}>{mergeAnnouncement}</span>

      {activeTags.length >= 2 && (
        <div className={styles.mergePanel}>
          <h3 className={styles.mergeHeading}>Merge tags</h3>
          <p className={styles.mergeDescription}>
            All assignments move to the target. The source becomes a permanent alias.
          </p>
          <div className={styles.mergeRow}>
            <select
              className={styles.select}
              value={mergeSourceId}
              onChange={(e) => setMergeSourceId(e.target.value)}
              aria-label="Source tag to merge from"
            >
              <option value="">Source tag…</option>
              {activeTags.filter((t) => t.id !== mergeTargetId).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <span aria-hidden="true">→</span>
            <select
              className={styles.select}
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              aria-label="Target tag to merge into"
            >
              <option value="">Target tag…</option>
              {activeTags.filter((t) => t.id !== mergeSourceId).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={beginMerge}
              disabled={!mergeSourceId || !mergeTargetId || mergeMutation.isPending}
            >
              Merge
            </button>
          </div>

          {mergePending && (
            <div
              className={styles.mergeConfirm}
              role="region"
              aria-label="Confirm merge"
            >
              <p className={styles.mergeConfirmText}>
                Merge <strong>{mergePending.sourceName}</strong> into{" "}
                <strong>{mergePending.targetName}</strong>? This creates a permanent alias and
                cannot be undone.
              </p>
              <div className={styles.mergeConfirmActions}>
                <button
                  type="button"
                  onClick={confirmMerge}
                  disabled={mergeMutation.isPending}
                >
                  Confirm merge
                </button>
                <button
                  type="button"
                  onClick={() => setMergePending(null)}
                  disabled={mergeMutation.isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mergeMutation.isError && (
            <p className={styles.warning} role="alert">{String(mergeMutation.error)}</p>
          )}
        </div>
      )}
    </div>
  );
}

function TagRow({
  tag, renamingId, renameValue,
  onStartRename, onRenameChange, onRenameConfirm, onRenameCancel,
  onArchive, onRestore, isPending, archiveError, restoreError, rowRef,
}: {
  tag: TagView;
  renamingId: string | null;
  renameValue: string;
  onStartRename: () => void;
  onRenameChange: (v: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
  onArchive: () => void;
  onRestore: () => void;
  isPending: boolean;
  archiveError: string | null;
  restoreError: string | null;
  rowRef: (el: HTMLTableRowElement | null) => void;
}) {
  const isRenaming = renamingId === tag.id;
  const isArchived = tag.archived;
  const isMerged = !!tag.merged_into;

  return (
    <tr ref={rowRef} tabIndex={-1}>
      <td className={isArchived || isMerged ? styles.archived : undefined}>
        {isRenaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameConfirm();
              if (e.key === "Escape") onRenameCancel();
            }}
            autoFocus
            aria-label={`Rename ${tag.name}`}
          />
        ) : (
          <>
            {tag.name}
            {isMerged && tag.merged_into && (
              <span className={styles.mergedAlias}>
                → {tag.merged_into.name}
              </span>
            )}
          </>
        )}
      </td>
      <td>{tag.task_count}</td>
      <td>{tag.series_count}</td>
      <td>{tag.life_node_count}</td>
      <td>
        <div className={styles.actions}>
          {isRenaming ? (
            <>
              <button type="button" onClick={onRenameConfirm} disabled={!renameValue.trim()}>Save</button>
              <button type="button" onClick={onRenameCancel}>Cancel</button>
            </>
          ) : !isArchived && !isMerged ? (
            <>
              <button type="button" onClick={onStartRename} disabled={isPending}>Rename</button>
              <button type="button" onClick={onArchive} disabled={isPending}>Archive</button>
              {archiveError && <span className={styles.warning} role="alert">{archiveError}</span>}
            </>
          ) : isArchived && !isMerged ? (
            <>
              <button type="button" onClick={onRestore} disabled={isPending}>Restore</button>
              {restoreError && <span className={styles.warning} role="alert">{restoreError}</span>}
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
