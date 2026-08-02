import { useEffect, useId, useRef, useState } from "react";

import { searchGlobal } from "../../ipc/commands";
import type { GlobalSearchProjection } from "../../ipc/generated/GlobalSearchProjection";
import type { SearchNavigationTarget } from "../../ipc/generated/SearchNavigationTarget";
import type { SearchResultView } from "../../ipc/generated/SearchResultView";
import type { SearchTextFragment } from "../../ipc/generated/SearchTextFragment";
import { localToday } from "../calendar/date";
import * as styles from "./GlobalSearchDialog.css";

type Props = {
  onClose: () => void;
  onNavigate: (target: SearchNavigationTarget) => void;
  invokerRef: React.RefObject<HTMLButtonElement | null>;
};

type FlatResult = SearchResultView & { groupLabel: string; optionId: string; isFirstInGroup: boolean };

function flattenResults(proj: GlobalSearchProjection): FlatResult[] {
  const flat: FlatResult[] = [];
  for (const group of proj.groups) {
    const label =
      group.kind === "tasks" ? "Tasks" : group.kind === "life" ? "Life" : "Documents";
    group.results.forEach((result, i) => {
      flat.push({
        ...result,
        groupLabel: label,
        optionId: `search-opt-${result.entity_id}`,
        isFirstInGroup: i === 0,
      });
    });
  }
  return flat;
}

function Fragments({ fragments }: { fragments: SearchTextFragment[] }) {
  return (
    <>
      {fragments.map((f, i) =>
        f.emphasized ? (
          <mark key={i} className={styles.mark}>
            {f.text}
          </mark>
        ) : (
          <span key={i}>{f.text}</span>
        ),
      )}
    </>
  );
}

export default function GlobalSearchDialog({ onClose, onNavigate, invokerRef }: Props) {
  const [query, setQuery] = useState("");
  const [projection, setProjection] = useState<GlobalSearchProjection | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const sequenceRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  const flat = projection ? flattenResults(projection) : [];
  const activeOption = activeIndex >= 0 ? flat[activeIndex] : undefined;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setProjection(null);
      setStatus("idle");
      setActiveIndex(-1);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const seq = ++sequenceRef.current;
    debounceRef.current = setTimeout(async () => {
      setStatus("loading");
      try {
        const result = await searchGlobal({
          query: q,
          observed_local_date: localToday(),
        });
        if (seq !== sequenceRef.current) return;
        setProjection(result);
        setStatus("idle");
        setActiveIndex(result.total_visible_results > 0 ? 0 : -1);
      } catch {
        if (seq !== sequenceRef.current) return;
        setStatus("error");
        setProjection(null);
        setActiveIndex(-1);
      }
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      requestAnimationFrame(() => invokerRef.current?.focus());
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeOption) {
      e.preventDefault();
      activate(activeOption);
    }
  }

  function activate(result: FlatResult) {
    onNavigate(result.navigation_target);
    onClose();
  }

  const totalResults = projection?.total_visible_results ?? 0;
  const resultCountText =
    status === "loading"
      ? "Searching…"
      : status === "error"
        ? "Search failed."
        : query.trim().length >= 2
          ? totalResults === 0
            ? "No results."
            : `${totalResults} result${totalResults === 1 ? "" : "s"}.`
          : "";

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          requestAnimationFrame(() => invokerRef.current?.focus());
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className={styles.card}
      >
        <div className={styles.inputRow}>
          <span className={styles.searchIcon} aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label="Search tasks, life nodes, and documents"
            aria-expanded={flat.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOption?.optionId}
            className={styles.input}
            placeholder="Type to search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close search"
            onClick={() => {
              onClose();
              requestAnimationFrame(() => invokerRef.current?.focus());
            }}
          >
            Esc
          </button>
        </div>

        <div
          className={styles.results}
          role="listbox"
          id={listboxId}
          aria-label="Search results"
        >
          {resultCountText && (
            <p className={styles.statusLine} aria-live="polite" aria-atomic="true">
              {resultCountText}
            </p>
          )}

          {flat.map((result, index) => {
            const isActive = index === activeIndex;
            return (
              <div key={result.entity_id}>
                {result.isFirstInGroup && (
                  <div className={styles.groupHeading} aria-hidden="true">
                    {result.groupLabel}
                  </div>
                )}
                <button
                  type="button"
                  role="option"
                  id={result.optionId}
                  aria-selected={isActive}
                  className={styles.option}
                  onClick={() => activate(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className={styles.optionTitle}>
                    {result.title_fragments.length > 0 ? (
                      <Fragments fragments={result.title_fragments} />
                    ) : (
                      result.title
                    )}
                  </span>
                  {result.context_text && (
                    <span className={styles.optionContext}>{result.context_text}</span>
                  )}
                  {result.snippet_fragments.length > 0 && (
                    <span className={styles.optionSnippet}>
                      <Fragments fragments={result.snippet_fragments} />
                    </span>
                  )}
                </button>
              </div>
            );
          })}

          {projection?.groups.map((g) =>
            g.total_count > g.results.length ? (
              <p key={g.kind} className={styles.moreNote}>
                {g.total_count - g.results.length} more{" "}
                {g.kind === "tasks" ? "task" : g.kind === "life" ? "life" : "document"} result
                {g.total_count - g.results.length === 1 ? "" : "s"} not shown.
              </p>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
