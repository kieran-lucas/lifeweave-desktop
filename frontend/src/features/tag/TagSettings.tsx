import { useState } from "react";
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
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ["tags", showArchived],
    queryFn: () => listTags(showArchived),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["tags"] });

  const createMutation = useMutation({
    mutationFn: () => createTag({ name: createName }),
    onSuccess: () => { setCreateName(""); invalidate(); },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      renameTag({ tag_id: id, name: renameValue, expected_revision: revision }),
    onSuccess: () => { setRenamingId(null); setRenameValue(""); invalidate(); },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      archiveTag({ tag_id: id, expected_revision: revision }),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      restoreTag({ tag_id: id, expected_revision: revision }),
    onSuccess: invalidate,
  });

  const mergeMutation = useMutation({
    mutationFn: ({
      sourceId,
      sourceRev,
      targetId,
      targetRev,
    }: {
      sourceId: string;
      sourceRev: number;
      targetId: string;
      targetRev: number;
    }) =>
      mergeTags({
        source_tag_id: sourceId,
        source_expected_revision: sourceRev,
        target_tag_id: targetId,
        target_expected_revision: targetRev,
      }),
    onSuccess: () => { setMergeSourceId(""); setMergeTargetId(""); invalidate(); },
  });

  const tags = tagsQuery.data ?? [];
  const activeTags = tags.filter((t) => !t.archived && !t.merged_into);

  const handleMerge = () => {
    const source = tags.find((t) => t.id === mergeSourceId);
    const target = tags.find((t) => t.id === mergeTargetId);
    if (!source || !target) return;
    if (!confirm(`Merge "${source.name}" into "${target.name}"? This cannot be undone.`)) return;
    mergeMutation.mutate({
      sourceId: source.id,
      sourceRev: source.revision,
      targetId: target.id,
      targetRev: target.revision,
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
        <p className={styles.warning} role="alert">
          {String(createMutation.error)}
        </p>
      )}

      <div className={styles.toggleRow}>
        <label>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />{" "}
          Show archived tags
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
                isPending={
                  archiveMutation.isPending ||
                  restoreMutation.isPending ||
                  renameMutation.isPending
                }
              />
            ))}
          </tbody>
        </table>
      )}

      {activeTags.length >= 2 && (
        <div className={styles.mergePanel}>
          <h3 style={{ margin: 0 }}>Merge tags</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #666)" }}>
            All assignments from the source tag move to the target. The source becomes a permanent alias.
          </p>
          <div className={styles.mergeRow}>
            <select
              className={styles.select}
              value={mergeSourceId}
              onChange={(e) => setMergeSourceId(e.target.value)}
              aria-label="Source tag to merge from"
            >
              <option value="">Source tag…</option>
              {activeTags
                .filter((t) => t.id !== mergeTargetId)
                .map((t) => (
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
              {activeTags
                .filter((t) => t.id !== mergeSourceId)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleMerge}
              disabled={!mergeSourceId || !mergeTargetId || mergeMutation.isPending}
            >
              Merge
            </button>
          </div>
          {mergeMutation.isError && (
            <p className={styles.warning} role="alert">{String(mergeMutation.error)}</p>
          )}
        </div>
      )}
    </div>
  );
}

function TagRow({
  tag,
  renamingId,
  renameValue,
  onStartRename,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
  onArchive,
  onRestore,
  isPending,
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
}) {
  const isRenaming = renamingId === tag.id;
  const isArchived = tag.archived;
  const isMerged = !!tag.merged_into;

  return (
    <tr>
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
              <span style={{ fontSize: 11, marginLeft: 6, color: "var(--text-muted, #666)" }}>
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
            </>
          ) : isArchived && !isMerged ? (
            <button type="button" onClick={onRestore} disabled={isPending}>Restore</button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
