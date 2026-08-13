import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createTag, listTags } from "../../ipc/commands";
import type { TagSummaryView } from "../../ipc/generated/TagSummaryView";
import * as styles from "./TagPicker.css";
import { EmptyState, LoadingRow } from "../../design-system/primitives/States";

const MAX_TAGS = 12;

type TagPickerProps = {
  selectedTags: TagSummaryView[];
  onChange: (next: TagSummaryView[]) => void | Promise<void>;
  disabled?: boolean;
  readOnly?: boolean;
  legend?: string;
  allowCreate?: boolean;
  busy?: boolean;
  error?: string | null;
};

function normalizeSearch(s: string): string {
  return s
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function TagPicker({
  selectedTags,
  onChange,
  disabled = false,
  readOnly = false,
  legend = "Tags",
  allowCreate = false,
  busy = false,
  error = null,
}: TagPickerProps) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingFocus, setPendingFocus] = useState<{
    id: string;
    refreshSettled: boolean;
  } | null>(null);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const tagsQuery = useQuery({
    queryKey: ["tags", false],
    queryFn: () => listTags(false),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createTag({ name }),
    onSuccess: async (tag) => {
      setPendingFocus({ id: tag.id, refreshSettled: false });
      setQuery("");
      setCreateError(null);
      const next = selectedTags.some((t) => t.id === tag.id)
        ? selectedTags
        : [...selectedTags, { id: tag.id, name: tag.name }];
      await onChange(next);
      await tagsQuery.refetch();
      setPendingFocus((current) =>
        current?.id === tag.id
          ? { ...current, refreshSettled: true }
          : current,
      );
    },
    onError: (e: unknown) => {
      setCreateError(e instanceof Error ? e.message : "Could not create tag.");
    },
  });

  useEffect(() => {
    if (!pendingFocus) return;
    const selected = selectedTags.some((tag) => tag.id === pendingFocus.id);
    const listed = tagsQuery.data?.some((tag) => tag.id === pendingFocus.id);
    if (selected && listed) {
      const checkbox = document.getElementById(
        `${uid}-check-${pendingFocus.id}`,
      );
      if (checkbox) {
        checkbox.focus();
        setPendingFocus(null);
        return;
      }
    }
    if (pendingFocus.refreshSettled) {
      searchRef.current?.focus();
      setPendingFocus(null);
    }
  }, [pendingFocus, selectedTags, tagsQuery.data, uid]);

  const openPanel = () => {
    setOpen(true);
    setQuery("");
    setCreateError(null);
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const closePanel = () => {
    setOpen(false);
    toggleBtnRef.current?.focus();
  };

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (fieldsetRef.current && !fieldsetRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Escape key to close.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
    }
  };

  const selectedIds = new Set(selectedTags.map((t) => t.id));
  const all = tagsQuery.data ?? [];
  const normalizedQuery = normalizeSearch(query);
  const filtered = query
    ? all.filter((t) => normalizeSearch(t.name).includes(normalizedQuery))
    : all;
  const atLimit = selectedTags.length >= MAX_TAGS;

  const toggle = (tag: TagSummaryView) => {
    const next = selectedIds.has(tag.id)
      ? selectedTags.filter((t) => t.id !== tag.id)
      : [...selectedTags, tag];
    void onChange(next);
  };

  const triggerLabel =
    selectedTags.length > 0
      ? `Edit tags, ${selectedTags.length} selected`
      : "Add tags";

  const legendId = `${uid}-legend`;
  const panelId = `${uid}-panel`;
  const searchLabelId = `${uid}-search-label`;
  const countId = `${uid}-count`;

  return (
    <fieldset
      ref={fieldsetRef}
      className={styles.fieldset}
      onKeyDown={handleKeyDown}
      disabled={disabled}
    >
      <legend id={legendId} className={styles.legend}>{legend}</legend>

      {readOnly ? (
        <span className={styles.status}>
          {selectedTags.length > 0
            ? selectedTags.map((t) => t.name).join(", ")
            : "No tags"}
        </span>
      ) : (
        <>
          <button
            ref={toggleBtnRef}
            type="button"
            className={styles.trigger}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => (open ? closePanel() : openPanel())}
            disabled={disabled || busy}
          >
            {triggerLabel}
          </button>

          {open && (
            <div
              id={panelId}
              className={styles.panel}
              role="region"
              aria-labelledby={legendId}
            >
              <div>
                <label id={searchLabelId} className={styles.searchLabel} htmlFor={`${uid}-search`}>
                  Search tags
                </label>
                <input
                  ref={searchRef}
                  id={`${uid}-search`}
                  type="search"
                  className={styles.search}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCreateError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Filter…"
                  aria-describedby={searchLabelId}
                />
              </div>

              {createError && (
                <p className={styles.errorMsg} role="alert">{createError}</p>
              )}

              <span
                id={countId}
                className={atLimit ? styles.limitWarning : styles.selectedCount}
                aria-live="polite"
              >
                {atLimit
                  ? `${MAX_TAGS} of ${MAX_TAGS} selected — limit reached`
                  : `${selectedTags.length} of ${MAX_TAGS} selected`}
              </span>

              {tagsQuery.isError && (
                <div role="alert">
                  <p className={styles.errorMsg}>Could not load tags.</p>
                  <button
                    type="button"
                    className={styles.retryButton}
                    onClick={() => void tagsQuery.refetch()}
                  >
                    Retry
                  </button>
                </div>
              )}

              {tagsQuery.isLoading && (
                <LoadingRow label="Loading…" />
              )}

              {!tagsQuery.isLoading && !tagsQuery.isError && filtered.length === 0 && !query && (
                <EmptyState compact title="No tags yet." body="Tags you create will appear here." />
              )}

              {filtered.length > 0 && (
                <ul className={styles.list} aria-describedby={countId}>
                  {filtered.map((tag) => {
                    const checked = selectedIds.has(tag.id);
                    const checkId = `${uid}-check-${tag.id}`;
                    const wouldExceed = !checked && atLimit;
                    return (
                      <li key={tag.id}>
                        <label
                          className={
                            wouldExceed
                              ? `${styles.checkLabel} ${styles.checkLabelDisabled}`
                              : styles.checkLabel
                          }
                          htmlFor={checkId}
                        >
                          <input
                            id={checkId}
                            type="checkbox"
                            checked={checked}
                            disabled={wouldExceed || busy}
                            onChange={() => toggle(tag)}
                          />
                          {tag.name}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}

              {allowCreate && query.trim() && (
                <button
                  type="button"
                  className={styles.createButton}
                  disabled={createMutation.isPending || atLimit}
                  onClick={() => createMutation.mutate(query.trim())}
                >
                  Create and select &ldquo;#{query.trim()}&rdquo;
                </button>
              )}

              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.doneButton}
                  onClick={closePanel}
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {error && <p className={styles.errorMsg} role="alert">{error}</p>}
          {busy && <p className={styles.status} aria-live="polite">Saving…</p>}
        </>
      )}
    </fieldset>
  );
}
