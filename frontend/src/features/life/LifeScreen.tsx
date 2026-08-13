import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLifeBrowseProjection,
  saveLifeNavigationPreference,
} from "../../ipc/commands";
import type { LifeNodeView } from "../../ipc/generated/LifeNodeView";
import * as styles from "./LifeScreen.css";
import { PageFrame } from "../../app/layout/PageFrame";
import { LifeEditWorkspace } from "./LifeEditWorkspace";
import { BasicLeafReader } from "./document/BasicLeafReader";
import { RelatedTasksPanel } from "./RelatedTasksPanel";
import { EmptyState, LoadingRow } from "../../design-system/primitives/States";
import {
  Icon,
  iconChevronLeft,
  iconChevronRight,
  iconLife,
  iconNote,
} from "../../design-system/visual/icons";

type Mode = "browse" | "edit" | "reader";
type HistoryEntry = {
  nodeId: string;
  page: number;
  mode: "browse" | "reader";
  reader?: LifeNodeView;
};

type EntryRequest = {
  requestId: string;
  nodeId: string;
  mode: "browse" | "reader";
} | null;

const lifeKeys = {
  browse: (id: string | undefined, page: number) =>
    ["life", "browse", id ?? "remembered", page] as const,
};

const LifeLinksPanel = lazy(() => import("./links/LifeLinksPanel"));

function NodeIcon({ iconKey, size = 17 }: { iconKey: string; size?: number }) {
  return (
    <span className={styles.icon} aria-hidden="true">
      <Icon
        d={iconKey === "life-leaf" || iconKey === "life-note" ? iconNote : iconLife}
        size={size}
      />
    </span>
  );
}

export function LifeScreen({
  entryRequest,
  onEntryRequestSettled,
  onTaskNavigate,
  anchorLocalDate,
}: {
  entryRequest?: EntryRequest;
  onEntryRequestSettled?: (requestId: string) => void;
  onTaskNavigate?: (localDate: string, taskId: string | null, seriesId: string | null) => void;
  anchorLocalDate: string;
}) {
  const client = useQueryClient();
  const [nodeId, setNodeId] = useState<string>();
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<Mode>("browse");
  const [reader, setReader] = useState<LifeNodeView>();
  const [outlineControl, setOutlineControl] = useState<{
    nodeId: string | null;
    available: boolean;
    visible: boolean;
  }>({ nodeId: null, available: false, visible: false });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);
  const preparedEntryRequest = useRef<string | null>(null);
  const settledEntryRequest = useRef<string | null>(null);
  const linkedNavigationGeneration = useRef(0);
  const readerHeading = useRef<HTMLHeadingElement>(null);

  const reportOutlineAvailability = useCallback((available: boolean) => {
    const activeNodeId = reader?.id;
    if (!activeNodeId) return;
    setOutlineControl((current) => {
      if (current.nodeId !== activeNodeId) {
        return { nodeId: activeNodeId, available, visible: false };
      }
      const visible = available ? current.visible : false;
      if (current.available === available && current.visible === visible) return current;
      return { ...current, available, visible };
    });
  }, [reader?.id]);

  const browse = useQuery({
    queryKey: lifeKeys.browse(nodeId, page),
    queryFn: () => getLifeBrowseProjection({ node_id: nodeId ?? null, child_page: page }),
    placeholderData: (previous) => previous,
  });

  const settle = (requestId: string) => {
    if (settledEntryRequest.current === requestId) return;
    settledEntryRequest.current = requestId;
    onEntryRequestSettled?.(requestId);
  };

  const cancelPendingEntryRequest = () => {
    if (entryRequest) settle(entryRequest.requestId);
  };

  useEffect(() => {
    if (!browse.data || initialized.current) return;
    initialized.current = true;
    const preferred = browse.data.preferred_mode;
    if (preferred === "reader" && browse.data.selected.is_leaf) {
      setReader(browse.data.selected);
      setMode("reader");
    } else if (preferred === "edit") {
      setMode("edit");
    }
  }, [browse.data]);

  useEffect(() => {
    if (!browse.data || !initialized.current) return;
    void saveLifeNavigationPreference({
      node_id: browse.data.selected.id,
      mode,
      path_version: 1,
      viewport_anchor: null,
    }).catch(() => {});
  }, [browse.data, mode]);

  useEffect(() => {
    if (mode !== "reader" || !reader) return;
    requestAnimationFrame(() => readerHeading.current?.focus({ preventScroll: true }));
  }, [mode, reader]);

  useEffect(() => {
    if (!entryRequest || !browse.data || !initialized.current) return;
    if (settledEntryRequest.current === entryRequest.requestId) return;

    const selected = browse.data.selected;
    const directChild = browse.data.children.find((child) => child.id === entryRequest.nodeId);

    if (preparedEntryRequest.current !== entryRequest.requestId) {
      preparedEntryRequest.current = entryRequest.requestId;
      linkedNavigationGeneration.current += 1;
      if (entryRequest.mode === "reader" && selected.id === entryRequest.nodeId && selected.is_leaf) {
        setReader(selected);
        setMode("reader");
        settle(entryRequest.requestId);
        return;
      }
      if (entryRequest.mode === "reader" && directChild?.is_leaf) {
        setReader(directChild);
        setMode("reader");
        settle(entryRequest.requestId);
        return;
      }
      setReader(undefined);
      setMode("browse");
      setNodeId(entryRequest.nodeId);
      setPage(0);
      return;
    }

    if (browse.isFetching) return;
    if (browse.data.resolved_from_fallback) {
      setMode("browse");
      settle(entryRequest.requestId);
      return;
    }
    if (browse.data.selected.id !== entryRequest.nodeId) return;
    if (entryRequest.mode === "reader" && browse.data.selected.is_leaf) {
      setReader(browse.data.selected);
      setMode("reader");
    }
    settle(entryRequest.requestId);
  }, [browse.data, browse.isFetching, entryRequest]);

  const remember = (nextMode: "browse" | "reader", currentReader?: LifeNodeView) => {
    const currentId = browse.data?.selected.id;
    if (!currentId) return;
    setHistory((entries) => [
      ...entries,
      {
        nodeId: currentId,
        page,
        mode: nextMode,
        ...(currentReader ? { reader: currentReader } : {}),
      },
    ]);
  };

  const openNode = (node: LifeNodeView) => {
    if (busy) return;
    cancelPendingEntryRequest();
    linkedNavigationGeneration.current += 1;
    if (node.is_leaf) {
      remember("browse");
      setReader(node);
      setMode("reader");
      return;
    }
    remember("browse");
    setReader(undefined);
    setNodeId(node.id);
    setPage(0);
    setMode("browse");
  };

  const goTo = (id: string) => {
    if (browse.data?.selected.id === id) return;
    cancelPendingEntryRequest();
    linkedNavigationGeneration.current += 1;
    remember(mode === "reader" ? "reader" : "browse", mode === "reader" ? reader : undefined);
    setReader(undefined);
    setNodeId(id);
    setPage(0);
    setMode("browse");
  };

  const openLinkedReader = async (targetNodeId: string) => {
    if (busy || !reader) return;
    cancelPendingEntryRequest();
    const generation = linkedNavigationGeneration.current + 1;
    linkedNavigationGeneration.current = generation;
    const source = reader;
    setBusy(true);
    try {
      const target = await client.fetchQuery({
        queryKey: lifeKeys.browse(targetNodeId, 0),
        queryFn: () => getLifeBrowseProjection({ node_id: targetNodeId, child_page: 0 }),
      });
      if (generation !== linkedNavigationGeneration.current) return;
      if (
        target.resolved_from_fallback ||
        target.selected.id !== targetNodeId ||
        !target.selected.is_leaf
      ) {
        throw new Error("That Life leaf is unavailable.");
      }
      remember("reader", source);
      setNodeId(targetNodeId);
      setPage(0);
      setReader(target.selected);
      setMode("reader");
    } finally {
      if (generation === linkedNavigationGeneration.current) setBusy(false);
    }
  };

  const back = () => {
    cancelPendingEntryRequest();
    linkedNavigationGeneration.current += 1;
    setBusy(false);
    const previous = history.at(-1);
    if (previous) {
      setHistory((entries) => entries.slice(0, -1));
      setNodeId(previous.nodeId);
      setPage(previous.page);
      setReader(previous.reader);
      setMode(previous.mode);
      return;
    }
    if (browse.data?.parent) {
      setNodeId(browse.data.parent.id);
      setPage(0);
      setReader(undefined);
      setMode("browse");
      return;
    }
    setReader(undefined);
    setMode("browse");
  };

  if (browse.isLoading) {
    return <LoadingRow label="Loading Life System…" />;
  }

  if (browse.isError || !browse.data) {
    return (
      <PageFrame as="section" type="wide" flush className={styles.lifeFrame}>
        <h1>Life System</h1>
        <p role="alert">Life System could not be loaded. Your tree context is preserved.</p>
      </PageFrame>
    );
  }

  const projection = browse.data;
  const canBack = history.length > 0 || projection.parent !== null || mode === "reader";
  const outlineAvailable = mode === "reader" && reader !== undefined
    && outlineControl.nodeId === reader.id && outlineControl.available;
  const outlineVisible = outlineAvailable && outlineControl.visible;

  return (
    <PageFrame as="section" type="wide" flush className={styles.lifeFrame} aria-labelledby="life-workspace-heading">
      <div className={styles.workspace} data-life-workspace="">
        <aside className={styles.navigator} aria-label="Life navigator">
          <header className={styles.navigatorHeader}>
            <button
              className={styles.backButton}
              type="button"
              onClick={back}
              disabled={!canBack}
              aria-label="Go back in Life System"
            >
              <Icon d={iconChevronLeft} size={16} />
            </button>
            <span className={styles.navigatorLabel}>Life</span>
            <button
              className={styles.editButton}
              type="button"
              aria-pressed={mode === "edit"}
              onClick={() => {
                cancelPendingEntryRequest();
                linkedNavigationGeneration.current += 1;
                setReader(undefined);
                setMode((current) => (current === "edit" ? "browse" : "edit"));
              }}
            >
              {mode === "edit" ? "Close tree" : "Tree"}
            </button>
          </header>

          <nav className={styles.breadcrumb} aria-label="Life breadcrumb">
            {projection.breadcrumb.map((item, index) => (
              <span key={item.id}>
                {index > 0 && <span aria-hidden="true">/</span>}
                <button
                  type="button"
                  onClick={() => goTo(item.id)}
                  aria-current={item.id === projection.selected.id ? "page" : undefined}
                >
                  {item.title}
                </button>
              </span>
            ))}
          </nav>

          <div className={styles.branchIdentity}>
            <NodeIcon iconKey={projection.selected.icon_key} size={20} />
            <div>
              <span>{projection.selected.is_leaf ? "Leaf" : "Branch"}</span>
              <strong>{projection.selected.title}</strong>
            </div>
          </div>

          <div className={styles.navigatorTools}>
            {outlineAvailable && (
              <button
                className={styles.navigatorToolButton}
                type="button"
                aria-pressed={outlineVisible}
                aria-label={outlineVisible ? "Hide contents" : "Show contents"}
                onClick={() => setOutlineControl((current) => ({ ...current, visible: !current.visible }))}
              >
                <Icon d={iconNote} size={16} />
                <span>Contents</span>
              </button>
            )}
          </div>

          <div className={styles.childHeader}>
            <span>Inside</span>
            <strong>{projection.selected.child_count}</strong>
          </div>

          {projection.children.length ? (
            <ul className={styles.nodeList} aria-label={`Inside ${projection.selected.title}`}>
              {projection.children.map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    className={styles.nodeRow}
                    data-life-id={child.id}
                    disabled={busy}
                    onClick={() => openNode(child)}
                  >
                    <NodeIcon iconKey={child.icon_key} />
                    <span className={styles.nodeRowCopy}>
                      <strong>{child.title}</strong>
                      <small>
                        {child.is_leaf
                          ? "Document"
                          : `${child.child_count} ${child.child_count === 1 ? "item" : "items"}`}
                      </small>
                    </span>
                    <Icon d={iconChevronRight} size={14} className={styles.rowArrow} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.noChildren}>Nothing inside this branch yet.</p>
          )}

          {projection.child_page_count > 1 && (
            <div className={styles.paging} aria-label="Child pages">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((value) => value - 1)}
              >
                Prev
              </button>
              <span>{projection.child_page + 1}/{projection.child_page_count}</span>
              <button
                type="button"
                disabled={page + 1 >= projection.child_page_count}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </div>
          )}
        </aside>

        <main className={styles.canvas} data-life-mode={mode}>
          {projection.resolved_from_fallback && (
            <p className={styles.notice} role="status">
              The remembered location was unavailable, so the nearest branch was opened.
            </p>
          )}

          {mode === "edit" ? (
            <div key={`edit-${projection.selected.id}`} className={styles.editCanvas} data-life-tree-shell="">
              <header className={styles.treeHeader} data-life-tree-header="">
                <div>
                  <div className={styles.canvasEyebrow}>Structure</div>
                  <h1 id="life-workspace-heading" className={styles.treeTitle}>
                    Life tree
                  </h1>
                </div>
                <p>Hold and drag the canvas to navigate</p>
              </header>
              <LifeEditWorkspace
                initialNodeId={projection.selected.id}
                onBrowse={(id) => {
                  setNodeId(id);
                  setPage(0);
                  setMode("browse");
                }}
              />
            </div>
          ) : mode === "reader" && reader ? (
            <article key={`reader-${reader.id}`} className={styles.readerCanvas} data-life-reader="">
              <header className={styles.readerHeader}>
                <h1
                  id="life-workspace-heading"
                  className={styles.readerTitle}
                  ref={readerHeading}
                  tabIndex={-1}
                >
                  {reader.title}
                </h1>
              </header>

              <div className={styles.documentBody} data-life-document-body="">
                <BasicLeafReader
                  nodeId={reader.id}
                  outlineVisible={outlineVisible}
                  onOutlineAvailabilityChange={reportOutlineAvailability}
                />
              </div>

              <details className={styles.contextDisclosure}>
                <summary>Related</summary>
                <Suspense fallback={<LoadingRow label="Loading links…" />}>
                  <LifeLinksPanel nodeId={reader.id} onNavigate={openLinkedReader} />
                </Suspense>
                <RelatedTasksPanel
                  nodeId={reader.id}
                  anchorLocalDate={anchorLocalDate}
                  onNavigate={onTaskNavigate}
                />
              </details>
            </article>
          ) : (
            <section key={`browse-${projection.selected.id}`} className={styles.branchCanvas}>
              <div className={styles.canvasEyebrow}>Current branch</div>
              <div className={styles.branchHeroIcon}>
                <NodeIcon iconKey={projection.selected.icon_key} size={26} />
              </div>
              <h1 id="life-workspace-heading" className={styles.canvasTitle} tabIndex={-1}>
                {projection.selected.title}
              </h1>
              {projection.selected.short_description ? (
                <p className={styles.branchDescription}>{projection.selected.short_description}</p>
              ) : (
                <p className={styles.branchDescriptionMuted}>No description yet.</p>
              )}

              <div className={styles.branchFacts}>
                <div>
                  <span>Direct items</span>
                  <strong>{projection.selected.child_count}</strong>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{projection.selected.is_leaf ? "Document" : "Branch"}</strong>
                </div>
              </div>

              {projection.children.length === 0 && (
                <EmptyState
                  compact
                  icon={iconLife}
                  title="This branch is open."
                  body="Open Tree when you want to grow its structure."
                />
              )}

              <section className={styles.contextSection} aria-label="Tasks in this Life area">
                <RelatedTasksPanel
                  nodeId={projection.selected.id}
                  anchorLocalDate={anchorLocalDate}
                  onNavigate={onTaskNavigate}
                />
              </section>
            </section>
          )}
        </main>
      </div>
    </PageFrame>
  );
}
