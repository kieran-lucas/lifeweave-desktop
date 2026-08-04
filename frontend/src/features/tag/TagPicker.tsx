import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTags, setLifeNodeTags } from "../../ipc/commands";
import type { TagSummaryView } from "../../ipc/generated/TagSummaryView";
import * as styles from "./TagPicker.css";

export function TagPicker({
  nodeId,
  nodeRevision,
  currentTags = [],
}: {
  nodeId: string;
  nodeRevision: number;
  currentTags?: TagSummaryView[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ["tags", false],
    queryFn: () => listTags(false),
    enabled: open,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (tagIds: string[]) =>
      setLifeNodeTags({ node_id: nodeId, tag_ids: tagIds, expected_node_revision: nodeRevision }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["life"] });
      setOpen(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentIds = new Set(currentTags.map((t) => t.id));
  const all = tagsQuery.data ?? [];
  const filtered = query
    ? all.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : all;

  const toggle = (tagId: string) => {
    const next = currentIds.has(tagId)
      ? [...currentIds].filter((id) => id !== tagId)
      : [...currentIds, tagId];
    mutation.mutate(next);
  };

  const label = currentTags.length
    ? `${currentTags.length} tag${currentTags.length !== 1 ? "s" : ""}`
    : "Add tags";

  return (
    <div className={styles.root} ref={dropdownRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => { setOpen(!open); setQuery(""); }}
      >
        {label}
      </button>
      {open && (
        <div className={styles.dropdown} role="dialog" aria-label="Tag picker">
          <input
            className={styles.search}
            type="search"
            placeholder="Filter tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {tagsQuery.isLoading && <p className={styles.status}>Loading…</p>}
          {!tagsQuery.isLoading && filtered.length === 0 && (
            <p className={styles.status}>No tags found.</p>
          )}
          <ul className={styles.list} role="listbox" aria-multiselectable="true" aria-label="Available tags">
            {filtered.map((tag) => (
              <li key={tag.id} role="option" aria-selected={currentIds.has(tag.id)}>
                <button
                  type="button"
                  className={styles.item}
                  onClick={() => toggle(tag.id)}
                  aria-pressed={currentIds.has(tag.id)}
                  disabled={mutation.isPending}
                >
                  {currentIds.has(tag.id) ? "✓ " : ""}
                  {tag.name}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.close} onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}
