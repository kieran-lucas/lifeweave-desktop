import { useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLifeLink,
  getLifeLinkPanel,
  removeLifeLink,
  searchLifeLinkTargets,
} from "../../../ipc/commands";
import type { LifeLinkRowView } from "../../../ipc/generated/LifeLinkRowView";
import type { LifeLinkTargetView } from "../../../ipc/generated/LifeLinkTargetView";
import {
  invalidateLifeLinkMutations,
  lifeLinkKeys,
} from "./lifeLinkQueries";
import * as styles from "./LifeLinksPanel.css";
import { EmptyState, LoadingRow } from "../../../design-system/primitives/States";
import { Icon, iconNote, iconSearch } from "../../../design-system/visual/icons";
import { useModalFocusTrap } from "../../../app/useModalFocusTrap";

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const documentKind = (kind: "basic_leaf" | "narrative_canvas" | null) =>
  kind === "narrative_canvas" ? "Narrative Canvas" : kind === "basic_leaf" ? "Basic Leaf" : "Document unavailable";

function LinkRows({
  rows,
  direction,
  onNavigate,
  onRemove,
  removing,
}: {
  rows: LifeLinkRowView[];
  direction: "outgoing" | "backlink";
  onNavigate: (nodeId: string) => Promise<void> | void;
  onRemove: (linkId: string) => void;
  removing: boolean;
}) {
  if (!rows.length)
    return <p className={styles.muted}>No {direction === "outgoing" ? "outgoing links" : "backlinks"}.</p>;
  return (
    <ul className={styles.list}>
      {rows.map((row) => {
        const active = row.availability === "active";
        const state = row.availability === "archived" ? "Archived" : row.availability === "unavailable" ? "Unavailable" : null;
        return (
          <li className={styles.row} key={row.link_id}>
            <div className={styles.rowBody}>
              <button
                type="button"
                className={styles.linkButton}
                disabled={!active}
                onClick={() => void onNavigate(row.endpoint_node_id)}
                aria-label={active ? `Open ${row.title} in Life Reader` : `${row.title} is ${state?.toLowerCase()}`}
              >
                <Icon d={iconNote} size={14} /> {row.title}
              </button>
              {state && <span className={styles.state}>{state}</span>}
              <p className={styles.meta}>{row.breadcrumb || "Life"} · {documentKind(row.document_kind)}</p>
              {row.short_description && <p className={styles.meta}>{row.short_description}</p>}
            </div>
            {direction === "outgoing" && (
              <button
                type="button"
                className={styles.destructive}
                disabled={removing}
                onClick={() => onRemove(row.link_id)}
                aria-label={`Remove link to ${row.title}`}
              >
                Remove link
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AddLinkDialog({
  sourceNodeId,
  sourceTitle,
  onClose,
  onCreated,
}: {
  sourceNodeId: string;
  sourceTitle: string;
  onClose: () => void;
  onCreated: (targetNodeId: string) => Promise<void>;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const queryId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [selected, setSelected] = useState<LifeLinkTargetView | null>(null);
  const [message, setMessage] = useState("");
  const search = useQuery({
    queryKey: lifeLinkKeys.targets(sourceNodeId, submittedQuery ?? ""),
    queryFn: () => searchLifeLinkTargets({ source_node_id: sourceNodeId, query: submittedQuery! }),
    enabled: submittedQuery !== null,
  });
  const create = useMutation({
    mutationFn: () => createLifeLink({ source_node_id: sourceNodeId, target_node_id: selected!.node_id }),
    onSuccess: async (value) => {
      await onCreated(value.target_node_id);
      onClose();
    },
    onError: (error) => setMessage(errorText(error, "The link could not be created.")),
  });
  useModalFocusTrap({ container: dialogRef, initialFocus: inputRef, onEscape: onClose, escapeEnabled: !create.isPending });
  const runSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const next = query.trim();
    setSelected(null);
    setMessage("");
    if (next.length < 1 || next.length > 120) {
      setSubmittedQuery(null);
      setMessage("Enter 1 to 120 characters.");
      return;
    }
    setSubmittedQuery(next);
  };
  return (
    <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget && !create.isPending) onClose(); }}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId}>Add link from {sourceTitle}</h2>
        <p id={descriptionId} className={styles.muted}>Search eligible committed Life leaves, select one result, then confirm.</p>
        <form onSubmit={runSearch}>
          <div className={styles.field}>
            <label htmlFor={queryId}>Find a Life leaf</label>
            <div className={styles.searchRow}>
              <input
                id={queryId}
                ref={inputRef}
                className={styles.input}
                value={query}
                maxLength={120}
                onChange={(event) => setQuery(event.target.value)}
                disabled={create.isPending}
              />
              <button className={styles.button} type="submit" disabled={create.isPending || !query.trim()}>
                Search
              </button>
            </div>
          </div>
        </form>
        <p role={message ? "alert" : "status"} aria-live="polite">
          {message || (search.isFetching ? "Searching eligible Life leaves…" : submittedQuery && search.isSuccess ? `${search.data.length} results.` : "")}
        </p>
        {search.isError && <p role="alert">{errorText(search.error, "Target search failed.")}</p>}
        {submittedQuery && search.isSuccess && (
          search.data.length ? (
            <fieldset>
              <legend>Select a target</legend>
              <ul className={styles.list}>
                {search.data.map((target) => (
                  <li key={target.node_id}>
                    <label className={styles.result}>
                      <input
                        type="radio"
                        name="life-link-target"
                        checked={selected?.node_id === target.node_id}
                        onChange={() => setSelected(target)}
                        disabled={create.isPending}
                      />
                      <span>
                        <strong>{target.title}</strong>
                        <span className={styles.meta}>{target.breadcrumb || "Life"} · {documentKind(target.document_kind)}</span>
                        {target.short_description && <span className={styles.meta}>{target.short_description}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : <EmptyState compact icon={iconSearch} title="No eligible targets matched this query." body="Try a shorter or different search term." />
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onClose} disabled={create.isPending}>Cancel</button>
          <button type="button" className={styles.button} onClick={() => create.mutate()} disabled={!selected || create.isPending}>
            {create.isPending ? "Adding link…" : "Confirm link"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LifeLinksPanel({
  nodeId,
  onNavigate,
}: {
  nodeId: string;
  onNavigate: (nodeId: string) => Promise<void> | void;
}) {
  const client = useQueryClient();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const panel = useQuery({
    queryKey: lifeLinkKeys.panel(nodeId),
    queryFn: () => getLifeLinkPanel({ source_node_id: nodeId }),
  });
  const remove = useMutation({
    mutationFn: (linkId: string) => removeLifeLink({ link_id: linkId }),
    onSuccess: async (value) => {
      await invalidateLifeLinkMutations(client, value.source_node_id, value.target_node_id);
      setMessage("Link removed.");
    },
    onError: (error) => setMessage(errorText(error, "The link could not be removed.")),
  });
  const closeDialog = () => {
    setDialogOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const navigate = async (targetNodeId: string) => {
    try {
      await onNavigate(targetNodeId);
    } catch (error) {
      setMessage(errorText(error, "That Life leaf is unavailable."));
    }
  };
  if (panel.isLoading)
    return <section className={styles.panel} aria-labelledby="life-links-heading"><h2 id="life-links-heading">Links</h2><LoadingRow label="Loading links…" /></section>;
  if (panel.isError || !panel.data)
    return <section className={styles.panel} aria-labelledby="life-links-heading"><h2 id="life-links-heading">Links</h2><p role="alert">Links could not be loaded.</p></section>;
  const value = panel.data;
  return (
    <section className={styles.panel} aria-labelledby="life-links-heading">
      <div className={styles.header}>
        <h2 id="life-links-heading" className={styles.heading}>Links</h2>
        <button
          ref={triggerRef}
          type="button"
          className={styles.button}
          disabled={!value.source.eligible}
          onClick={() => { setMessage(""); setDialogOpen(true); }}
        >
          Add link
        </button>
      </div>
      {!value.source.eligible && <p role="status">{value.source.ineligible_reason ?? "Links require a committed Basic Leaf or Narrative Canvas document."}</p>}
      <p role="status" aria-live="polite">{message}</p>
      <section aria-labelledby="outgoing-links-heading">
        <h3 id="outgoing-links-heading" className={styles.subheading}>Outgoing links ({value.outgoing.length})</h3>
        <LinkRows rows={value.outgoing} direction="outgoing" onNavigate={navigate} onRemove={(id) => remove.mutate(id)} removing={remove.isPending} />
      </section>
      <section aria-labelledby="backlinks-heading">
        <h3 id="backlinks-heading" className={styles.subheading}>Backlinks ({value.backlinks.length})</h3>
        <LinkRows rows={value.backlinks} direction="backlink" onNavigate={navigate} onRemove={() => {}} removing={false} />
      </section>
      {dialogOpen && (
        <AddLinkDialog
          sourceNodeId={nodeId}
          sourceTitle={value.source.title}
          onClose={closeDialog}
          onCreated={async (targetNodeId) => {
            await invalidateLifeLinkMutations(client, nodeId, targetNodeId);
            setMessage("Link added.");
          }}
        />
      )}
    </section>
  );
}

export default LifeLinksPanel;
