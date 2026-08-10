import { useEffect, useRef, useState } from "react";
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
import { invalidateTaskSavedViewReferenceData } from "../task/saved-views/savedViewQueries";
import { SkeletonList } from "../../design-system/primitives/States";

export function TagSettings() {
  const [createName, setCreateName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergePending, setMergePending] = useState<{
    sourceId: string;
    sourceName: string;
    sourceRev: number;
    sourceTaskCount: number;
    sourceSeriesCount: number;
    sourceLifeCount: number;
    targetId: string;
    targetName: string;
    targetRev: number;
  } | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeAnnouncement, setMergeAnnouncement] = useState("");
  const [focusTargetId, setFocusTargetId] = useState<string | null>(null);
  const targetRowRef = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["tags"] });
    void queryClient.invalidateQueries({ queryKey: ["today-items"] });
    void queryClient.invalidateQueries({ queryKey: ["task-planning"] });
    void queryClient.invalidateQueries({ queryKey: ["life"] });
    void invalidateTaskSavedViewReferenceData(queryClient);
  };

  const tagsQuery = useQuery({
    queryKey: ["tags", true],
    queryFn: () => listTags(true),
  });

  const createMutation = useMutation({
    mutationFn: () => createTag({ name: createName }),
    onSuccess: () => { setCreateName(""); invalidateAll(); },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      renameTag({ tag_id: id, name: renameValue, expected_revision: revision }),
    onSuccess: () => { setRenamingId(null); setRenameValue(""); invalidateAll(); },
    onError: async () => { await tagsQuery.refetch(); },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      archiveTag({ tag_id: id, expected_revision: revision }),
    onSuccess: invalidateAll,
    onError: async () => { await tagsQuery.refetch(); },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      restoreTag({ tag_id: id, expected_revision: revision }),
    onSuccess: invalidateAll,
    onError: async () => { await tagsQuery.refetch(); },
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
      setMergeError(null);
      setMergeSourceId("");
      setMergeTargetId("");
      invalidateAll();
      setMergeAnnouncement("Tags merged successfully.");
      setFocusTargetId(vars.targetId);
    },
    onError: (e: unknown) => {
      setMergeError(e instanceof Error ? e.message : "Merge failed. Try again.");
      void tagsQuery.refetch();
    },
  });

  const tags = tagsQuery.data ?? [];
  const activeTags = tags.filter((t) => !t.archived && !t.merged_into);
  const archivedTags = tags.filter((t) => t.archived && !t.merged_into);
  const mergedTags = tags.filter((t) => !!t.merged_into);

  useEffect(() => {
    if (!focusTargetId) return;
    const target = targetRowRef.current.get(focusTargetId);
    if (!target) return;
    target.focus();
    setFocusTargetId(null);
  }, [focusTargetId, tags]);

  const beginMerge = () => {
    const source = tags.find((t) => t.id === mergeSourceId);
    const target = tags.find((t) => t.id === mergeTargetId);
    if (!source || !target) return;
    setMergeError(null);
    setMergePending({
      sourceId: source.id, sourceName: source.name, sourceRev: source.revision,
      sourceTaskCount: source.task_count,
      sourceSeriesCount: source.series_count,
      sourceLifeCount: source.life_node_count,
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

      <section aria-label="Create tag">
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
          className={styles.createButton}
          onClick={() => createMutation.mutate()}
          disabled={!createName.trim() || createMutation.isPending}
        >
          Create
        </button>
      </div>
      {createMutation.isError && (
        <p className={styles.warning} role="alert">{String(createMutation.error)}</p>
      )}
      </section>

      {tagsQuery.isLoading && <SkeletonList rows={4} label="Loading tags…" />}
      {tagsQuery.isError && (
        <div role="alert">
          <p className={styles.warning}>Failed to load tags.</p>
          <button
            type="button"
            onClick={() => void tagsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      )}

      <section aria-label="Active tags">
          <h3 className={styles.mergeHeading}>Active tags</h3>
          <div className={styles.tableScroll}>
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
              {activeTags.map((tag) => (
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
                  archiveError={archiveMutation.isError && archiveMutation.variables?.id === tag.id ? String(archiveMutation.error) : null}
                  restoreError={restoreMutation.isError && restoreMutation.variables?.id === tag.id ? String(restoreMutation.error) : null}
                  renameError={renameMutation.isError && renameMutation.variables?.id === tag.id ? String(renameMutation.error) : null}
                  rowRef={(el) => {
                    if (el) targetRowRef.current.set(tag.id, el);
                    else targetRowRef.current.delete(tag.id);
                  }}
                />
              ))}
            </tbody>
          </table>
          </div>
        </section>

      <section aria-label="Archived tags">
          <h3 className={styles.mergeHeading}>Archived tags</h3>
          <div className={styles.tableScroll}>
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
              {archivedTags.map((tag) => (
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
                  archiveError={archiveMutation.isError && archiveMutation.variables?.id === tag.id ? String(archiveMutation.error) : null}
                  restoreError={restoreMutation.isError && restoreMutation.variables?.id === tag.id ? String(restoreMutation.error) : null}
                  renameError={renameMutation.isError && renameMutation.variables?.id === tag.id ? String(renameMutation.error) : null}
                  rowRef={(el) => {
                    if (el) targetRowRef.current.set(tag.id, el);
                    else targetRowRef.current.delete(tag.id);
                  }}
                />
              ))}
            </tbody>
          </table>
          </div>
        </section>

      <section aria-label="Merged aliases">
          <h3 className={styles.mergeHeading}>Merged aliases</h3>
          <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alias</th>
                <th>Canonical tag</th>
              </tr>
            </thead>
            <tbody>
              {mergedTags.map((tag) => (
                <tr key={tag.id} ref={(el) => {
                  if (el) targetRowRef.current.set(tag.id, el);
                  else targetRowRef.current.delete(tag.id);
                }} tabIndex={-1}>
                  <td className={styles.archived}>{tag.name}</td>
                  <td>{tag.merged_into?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

      <span aria-live="polite" className={styles.srOnly}>{mergeAnnouncement}</span>

      <section aria-label="Merge tags" className={styles.mergePanel}>
          <h3 className={styles.mergeHeading}>Merge tags</h3>
          <p className={styles.mergeDescription}>
            All assignments move to the target. The source becomes a permanent alias.
          </p>
          {activeTags.length >= 2 ? <div className={styles.mergeRow}>
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
            <span>into</span>
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
              className={styles.mergeButton}
              onClick={beginMerge}
              disabled={!mergeSourceId || !mergeTargetId || mergeMutation.isPending}
            >
              Merge
            </button>
          </div> : <p className={styles.mergeDescription}>At least two active tags are required.</p>}

          {mergePending && (
            <div
              className={styles.mergeConfirm}
              role="region"
              aria-label="Confirm merge"
            >
              <p className={styles.mergeConfirmText}>
                Merge <strong>{mergePending.sourceName}</strong>{" "}
                ({mergePending.sourceTaskCount} tasks, {mergePending.sourceSeriesCount} series,{" "}
                {mergePending.sourceLifeCount} life nodes) into{" "}
                <strong>{mergePending.targetName}</strong>? This creates a permanent alias and
                cannot be undone.
              </p>
              {mergeError && (
                <p className={styles.warning} role="alert">{mergeError}</p>
              )}
              <div className={styles.mergeConfirmActions}>
                <button
                  type="button"
                  className={styles.mergeConfirmButton}
                  onClick={confirmMerge}
                  disabled={mergeMutation.isPending}
                >
                  {mergeError ? "Retry" : "Confirm merge"}
                </button>
                <button
                  type="button"
                  className={styles.mergeCancelButton}
                  onClick={() => { setMergePending(null); setMergeError(null); }}
                  disabled={mergeMutation.isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
    </div>
  );
}

function TagRow({
  tag, renamingId, renameValue,
  onStartRename, onRenameChange, onRenameConfirm, onRenameCancel,
  onArchive, onRestore, isPending, archiveError, restoreError, renameError, rowRef,
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
  renameError: string | null;
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
                Merged into {tag.merged_into.name}
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
              {renameError && <span className={styles.warning} role="alert">{renameError}</span>}
            </>
          ) : !isArchived && !isMerged ? (
            <>
              <button type="button" onClick={onStartRename} disabled={isPending}>Rename</button>
              <button type="button" onClick={onArchive} disabled={isPending}>Archive</button>
              {archiveError && <span className={styles.warning} role="alert">{archiveError}</span>}
            </>
          ) : isArchived && !isMerged ? (
            <>
              <button type="button" onClick={onStartRename} disabled={isPending}>Rename</button>
              <button type="button" onClick={onRestore} disabled={isPending}>Restore</button>
              {restoreError && <span className={styles.warning} role="alert">{restoreError}</span>}
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
