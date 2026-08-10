import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import {
  getLifeBrowseProjection,
  getPinnedLifeNodes,
  pinLifeNode,
  saveLifeNavigationPreference,
  unpinLifeNode,
} from "../../ipc/commands";
import type { LifeNodeView } from "../../ipc/generated/LifeNodeView";
import type { PinnedLifeNodeView } from "../../ipc/generated/PinnedLifeNodeView";
import * as styles from "./LifeScreen.css";
import { PageFrame, PageHeader } from "../../app/layout/PageFrame";
import { TagChipList } from "../tag/TagChipList";
import { LifeEditWorkspace } from "./LifeEditWorkspace";
import { BasicLeafReader } from "./document/BasicLeafReader";
import { RelatedTasksPanel } from "./RelatedTasksPanel";
import { EmptyState, LoadingRow, SkeletonList } from "../../design-system/primitives/States";
import { Icon, iconChevronLeft, iconLife, iconNote } from "../../design-system/visual/icons";

type Mode = "browse" | "edit" | "pinned" | "reader";
type HistoryEntry = {
  nodeId: string;
  page: number;
  mode: "browse" | "pinned" | "reader";
  reader?: LifeNodeView | PinnedLifeNodeView;
  focusId?: string;
};
type Line = { key: string; d: string };
const lifeKeys = {
  browse: (id: string | undefined, page: number) =>
    ["life", "browse", id ?? "remembered", page] as const,
  pinned: ["life", "pinned"] as const,
};
const LifeLinksPanel = lazy(() => import("./links/LifeLinksPanel"));
// Lazy so the graph explorer never enters the startup chunk: LifeScreen is imported eagerly.
const LifeGraphWorkspace = lazy(() => import("./graph/LifeGraphWorkspace"));

function NodeIcon({ iconKey }: { iconKey: string }) {
  return (
    <span className={styles.icon} aria-hidden="true">
      <Icon d={iconKey === "life-leaf" || iconKey === "life-note" ? iconNote : iconLife} size={17} />
    </span>
  );
}

function useConnectors(
  container: React.RefObject<HTMLDivElement | null>,
  focal: React.RefObject<HTMLDivElement | null>,
  children: React.RefObject<Map<string, HTMLElement>>,
) {
  const [lines, setLines] = useState<Line[]>([]);
  useLayoutEffect(() => {
    const root = container.current;
    const focus = focal.current;
    if (!root || !focus) return;
    const measure = () => {
      const base = root.getBoundingClientRect();
      const top = focus.getBoundingClientRect();
      setLines(
        Array.from(children.current.entries()).map(([key, el]) => {
          const child = el.getBoundingClientRect();
          const x1 = top.left + top.width / 2 - base.left,
            y1 = top.bottom - base.top,
            x2 = child.left + child.width / 2 - base.left,
            y2 = child.top - base.top;
          return {
            key,
            d: `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`,
          };
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(focus);
    children.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [container, focal, children]);
  return lines;
}

type EntryRequest = {
  requestId: string;
  nodeId: string;
  mode: "browse" | "reader";
} | null;
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
  const reduced = useReducedMotion();
  const [nodeId, setNodeId] = useState<string>();
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<Mode>("browse");
  // Graph is a transient overlay on the current mode, never a Mode itself: `last_life_mode` is
  // constrained to browse/edit/pinned/reader in Rust, and nothing about the graph is persisted.
  const [graphOpen, setGraphOpen] = useState(false);
  const [graphError, setGraphError] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [reader, setReader] = useState<LifeNodeView | PinnedLifeNodeView>();
  const [busy, setBusy] = useState(false);
  const linkedReaderNavigationGeneration = useRef(0);
  const linkedReaderBusyOwner = useRef<number | null>(null);
  const currentReaderIdRef = useRef<string | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null),
    focalRef = useRef<HTMLDivElement>(null),
    readerHeadingRef = useRef<HTMLHeadingElement>(null),
    childRefs = useRef(new Map<string, HTMLElement>()),
    restoreFocus = useRef<string | undefined>(undefined),
    preparedEntryRequestId = useRef<string | null>(null),
    settledEntryRequestId = useRef<string | null>(null);
  currentReaderIdRef.current = mode === "reader" && reader
    ? "id" in reader ? reader.id : reader.node_id
    : null;
  const invalidateLinkedReaderNavigation = () => {
    linkedReaderNavigationGeneration.current += 1;
    currentReaderIdRef.current = null;
    if (linkedReaderBusyOwner.current !== null) {
      linkedReaderBusyOwner.current = null;
      setBusy(false);
    }
  };
  const browse = useQuery({
    queryKey: lifeKeys.browse(nodeId, page),
    queryFn: () =>
      getLifeBrowseProjection({ node_id: nodeId ?? null, child_page: page }),
    placeholderData: (previous) => previous,
  });
  const pins = useQuery({
    queryKey: lifeKeys.pinned,
    queryFn: getPinnedLifeNodes,
    enabled: mode === "pinned",
  });
  const lines = useConnectors(sceneRef, focalRef, childRefs);
  useEffect(() => {
    if (!browse.data || initialized) return;
    const preferred = browse.data.preferred_mode as Mode;
    const safe =
      preferred === "reader" && !browse.data.selected.is_leaf
        ? "browse"
        : preferred;
    setMode(safe);
    if (preferred === "reader" && browse.data.selected.is_leaf)
      setReader(browse.data.selected);
    setInitialized(true);
  }, [browse.data, initialized]);
  useEffect(() => {
    if (!browse.data || !initialized) return;
    const selected = browse.data.selected.id;
    saveLifeNavigationPreference({
      node_id: selected,
      mode,
      path_version: 1,
      viewport_anchor: restoreFocus.current ?? null,
    }).catch(() => {});
  }, [browse.data, initialized, mode]);
  useEffect(() => {
    if (mode === "browse" && browse.data)
      requestAnimationFrame(() => {
        const target = restoreFocus.current
          ? document.querySelector<HTMLElement>(
              `[data-life-id="${restoreFocus.current}"]`,
            )
          : document.querySelector<HTMLElement>("[data-life-focal]");
        target?.focus({ preventScroll: true });
        restoreFocus.current = undefined;
      });
  }, [browse.data, mode]);
  useEffect(() => {
    if (mode === "reader" && reader)
      requestAnimationFrame(() => readerHeadingRef.current?.focus({ preventScroll: true }));
  }, [mode, reader]);
  const settleEntryRequest = (requestId: string) => {
    if (settledEntryRequestId.current === requestId) return;
    settledEntryRequestId.current = requestId;
    onEntryRequestSettled?.(requestId);
  };
  const cancelPendingEntryRequest = () => {
    if (entryRequest) settleEntryRequest(entryRequest.requestId);
  };
  const pushEntryHistory = (focusId?: string) => {
    setHistory((value) => [
      ...value,
      {
        nodeId: browse.data?.selected.id ?? entryRequest?.nodeId ?? "life-root",
        page,
        mode: mode === "pinned" ? "pinned" : "browse",
        ...(focusId ? { focusId } : {}),
      },
    ]);
  };
  useEffect(() => {
    const requestId = entryRequest?.requestId;
    if (
      !entryRequest ||
      !requestId ||
      !initialized ||
      !browse.data ||
      settledEntryRequestId.current === requestId ||
      preparedEntryRequestId.current === requestId
    )
      return;
    invalidateLinkedReaderNavigation();
    // An external entry request takes over the workspace, so a graph left open must not reappear
    // when the user later leaves Reader.
    setGraphOpen(false);
    preparedEntryRequestId.current = requestId;
    const selected = browse.data.selected;
    const directChild = browse.data.children.find(
      (child) => child.id === entryRequest.nodeId,
    );
    if (entryRequest.mode === "reader" && selected.id === entryRequest.nodeId) {
      if (selected.is_leaf) {
        pushEntryHistory(selected.id);
        setReader(selected);
        setMode("reader");
      } else {
        setReader(undefined);
        setMode("browse");
      }
      // Defer settlement when data is stale so the second effect can overwrite
      // the reader with fresh tag data once the background refetch completes.
      if (!browse.isFetching) settleEntryRequest(requestId);
      return;
    }
    if (entryRequest.mode === "reader" && directChild?.is_leaf) {
      pushEntryHistory(directChild.id);
      setReader(directChild);
      setMode("reader");
      settleEntryRequest(requestId);
      return;
    }
    if (selected.id !== entryRequest.nodeId)
      pushEntryHistory(entryRequest.nodeId);
    setReader(undefined);
    setNodeId(entryRequest.nodeId);
    setPage(0);
    setMode("browse");
  }, [entryRequest?.requestId, initialized]);
  useEffect(() => {
    if (
      !entryRequest ||
      preparedEntryRequestId.current !== entryRequest.requestId ||
      settledEntryRequestId.current === entryRequest.requestId ||
      !browse.isSuccess ||
      browse.isFetching ||
      !browse.data
    )
      return;
    if (browse.data.resolved_from_fallback) {
      setReader(undefined);
      setMode("browse");
      settleEntryRequest(entryRequest.requestId);
      return;
    }
    if (browse.data.selected.id !== entryRequest.nodeId) return;
    if (entryRequest.mode === "reader" && browse.data.selected.is_leaf) {
      setReader(browse.data.selected);
      setMode("reader");
    } else {
      setReader(undefined);
      setMode("browse");
    }
    settleEntryRequest(entryRequest.requestId);
  }, [
    browse.data,
    browse.isFetching,
    browse.isSuccess,
    entryRequest,
    onEntryRequestSettled,
  ]);
  const pin = useMutation({
    mutationFn: (value: { id: string; pinned: boolean }) =>
      value.pinned
        ? unpinLifeNode({ node_id: value.id })
        : pinLifeNode({ node_id: value.id }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["life"] });
    },
  });
  const navigate = (
    node: LifeNodeView | PinnedLifeNodeView,
    originMode: "browse" | "pinned" = mode === "pinned" ? "pinned" : "browse",
  ) => {
    if ("available" in node && !node.available) return;
    const supersedesLinkedNavigation = linkedReaderBusyOwner.current !== null;
    if (busy && !supersedesLinkedNavigation) return;
    invalidateLinkedReaderNavigation();
    cancelPendingEntryRequest();
    setBusy(true);
    const id = "id" in node ? node.id : node.node_id;
    if (node.is_leaf) {
      setHistory((v) => [
        ...v,
        {
          nodeId: browse.data?.selected.id ?? id,
          page,
          mode: originMode,
          focusId: id,
        },
      ]);
      setReader(node);
      setMode("reader");
      setBusy(false);
      return;
    }
    setHistory((v) => [
      ...v,
      {
        nodeId: browse.data?.selected.id ?? id,
        page,
        mode: originMode,
        focusId: id,
      },
    ]);
    setNodeId(id);
    setPage(0);
    setMode("browse");
    setTimeout(() => setBusy(false), reduced ? 0 : 320);
  };
  const goTo = (id: string) => {
    invalidateLinkedReaderNavigation();
    cancelPendingEntryRequest();
    if (browse.data?.selected.id !== id)
      setHistory((v) => [
        ...v,
        { nodeId: browse.data?.selected.id ?? id, page, mode: "browse" },
      ]);
    setNodeId(id);
    setPage(0);
    setMode("browse");
  };
  const openLinkedReader = async (targetNodeId: string) => {
    if (busy || !reader) return;
    cancelPendingEntryRequest();
    const sourceReader = reader;
    const sourceReaderId = "id" in sourceReader ? sourceReader.id : sourceReader.node_id;
    const generation = linkedReaderNavigationGeneration.current + 1;
    linkedReaderNavigationGeneration.current = generation;
    linkedReaderBusyOwner.current = generation;
    setBusy(true);
    try {
      const target = await client.fetchQuery({
        queryKey: lifeKeys.browse(targetNodeId, 0),
        queryFn: () => getLifeBrowseProjection({ node_id: targetNodeId, child_page: 0 }),
      });
      if (
        generation !== linkedReaderNavigationGeneration.current ||
        currentReaderIdRef.current !== sourceReaderId
      ) return;
      if (target.resolved_from_fallback || target.selected.id !== targetNodeId || !target.selected.is_leaf)
        throw new Error("That Life leaf is unavailable.");
      setHistory((value) => [...value, { nodeId: sourceReaderId, page: 0, mode: "reader", reader: sourceReader }]);
      setNodeId(targetNodeId);
      setPage(0);
      setReader(target.selected);
      setMode("reader");
    } catch (error) {
      if (
        generation !== linkedReaderNavigationGeneration.current ||
        currentReaderIdRef.current !== sourceReaderId
      ) return;
      throw error;
    } finally {
      if (linkedReaderBusyOwner.current === generation) {
        linkedReaderBusyOwner.current = null;
        setBusy(false);
      }
    }
  };
  /**
   * Graph hand-off. Graph is a top-level view, so this is top-level navigation: it resolves the
   * exact stable node ID and deliberately appends **no** history, neither Browse history nor the
   * Task 41 linked-Reader history that `openLinkedReader` owns. A target that no longer resolves to
   * the requested node fails safely by staying put and reporting, rather than opening a fallback.
   */
  const openGraphNode = async (id: string, target: "reader" | "browse") => {
    invalidateLinkedReaderNavigation();
    cancelPendingEntryRequest();
    // Both destinations resolve the exact stable ID *before* committing anything. The graph
    // projection is a snapshot, so a node can be archived between loading it and acting on it; a
    // Browse hand-off that committed first would silently open whatever the fallback resolved to.
    const projection = await client.fetchQuery({
      queryKey: lifeKeys.browse(id, 0),
      queryFn: () => getLifeBrowseProjection({ node_id: id, child_page: 0 }),
    });
    if (projection.resolved_from_fallback || projection.selected.id !== id)
      throw new Error("That Life node is unavailable.");
    if (target === "reader" && !projection.selected.is_leaf)
      throw new Error("That Life leaf is unavailable.");
    setGraphOpen(false);
    setNodeId(id);
    setPage(0);
    setReader(target === "reader" ? projection.selected : undefined);
    setMode(target === "reader" ? "reader" : "browse");
  };
  const back = () => {
    invalidateLinkedReaderNavigation();
    cancelPendingEntryRequest();
    const previous = history.at(-1);
    if (mode === "reader") {
      setReader(undefined);
    }
    if (previous) {
      setHistory((v) => v.slice(0, -1));
      restoreFocus.current = previous.focusId;
      setNodeId(previous.nodeId);
      setPage(previous.page);
      if (previous.mode === "reader" && previous.reader) setReader(previous.reader);
      setMode(previous.mode);
    } else if (browse.data?.parent) {
      setNodeId(browse.data.parent.id);
      setPage(0);
      setMode("browse");
    } else setMode("browse");
  };
  if (browse.isLoading)
    return (
      <p className={styles.status} aria-live="polite">
        Loading Life System…
      </p>
    );
  if (browse.isError || !browse.data)
    return (
      <PageFrame as="section" type="wide">
        <h1 className={styles.heading}>Life System</h1>
        <p role="alert">
          Life System could not be loaded. Your tree context is preserved.
        </p>
      </PageFrame>
    );
  const projection = browse.data;
  if (mode === "reader" && reader) {
    const readerId = "id" in reader ? reader.id : reader.node_id;
    return (
      <PageFrame as="section" type="reading" aria-labelledby="life-reader-title">
        <button className={styles.quietButton} onClick={back}>
          <Icon d={iconChevronLeft} size={16} /> Back to Life Browse
        </button>
        <div className={styles.readerHero}>
          <NodeIcon iconKey={reader.icon_key} />
          <h1 id="life-reader-title" className={styles.readerTitle} tabIndex={-1} ref={readerHeadingRef}>
            {reader.title}
          </h1>
          <p className={styles.nodeDescription}>{reader.short_description}</p>
          <TagChipList tags={reader.tags} maxVisible={12} />
          <BasicLeafReader nodeId={readerId} />
          <Suspense fallback={<LoadingRow label="Loading links…" />}>
            <LifeLinksPanel nodeId={readerId} onNavigate={openLinkedReader} />
          </Suspense>
          <RelatedTasksPanel nodeId={readerId} anchorLocalDate={anchorLocalDate} onNavigate={onTaskNavigate} />
        </div>
      </PageFrame>
    );
  }
  return (
    <PageFrame as="section" type="wide" aria-labelledby="life-heading">
      <PageHeader
        actions={
        <div className={styles.modes} aria-label="Life view">
          <button
            className={styles.modeButton}
            aria-pressed={!graphOpen && mode === "browse"}
            onClick={() => {
              invalidateLinkedReaderNavigation();
              cancelPendingEntryRequest();
              setGraphOpen(false);
              setMode("browse");
            }}
          >
            Browse
          </button>
          <button
            className={styles.modeButton}
            aria-pressed={!graphOpen && mode === "edit"}
            onClick={() => {
              invalidateLinkedReaderNavigation();
              cancelPendingEntryRequest();
              setGraphOpen(false);
              setMode("edit");
            }}
          >
            Edit
          </button>
          <button
            className={styles.modeButton}
            aria-pressed={!graphOpen && mode === "pinned"}
            onClick={() => {
              invalidateLinkedReaderNavigation();
              cancelPendingEntryRequest();
              setGraphOpen(false);
              setMode("pinned");
            }}
          >
            Pinned
          </button>
          <button
            className={styles.modeButton}
            aria-pressed={graphOpen}
            onClick={() => {
              invalidateLinkedReaderNavigation();
              cancelPendingEntryRequest();
              setGraphError(false);
              setGraphOpen(value => !value);
            }}
          >
            Graph
          </button>
        </div>
        }
      >
        <h1 id="life-heading" className={styles.heading} tabIndex={-1}>
          Life System
        </h1>
        <p className={styles.nodeDescription}>
          {graphOpen
            ? "Explore the active Life tree and explicit links in a read-only workspace."
            : mode === "edit"
            ? "Edit the complete structure with atomic moves and undo."
            : "Browse one branch at a time."}
        </p>
      </PageHeader>
      {graphOpen ? (
        <Suspense fallback={<LoadingRow label="Loading the Life graph…" />}>
          {graphError && (
            <p role="alert" className={styles.unavailable}>
              That Life node is unavailable. Refresh the graph and try again.
            </p>
          )}
          <LifeGraphWorkspace
            currentNodeId={projection.selected.id}
            onOpenNode={(id, target) => {
              setGraphError(false);
              void openGraphNode(id, target).catch(() => setGraphError(true));
            }}
            onClose={() => setGraphOpen(false)}
          />
        </Suspense>
      ) : mode === "edit" ? (
        <LifeEditWorkspace
          initialNodeId={projection.selected.id}
          onBrowse={(id) => {
            invalidateLinkedReaderNavigation();
            cancelPendingEntryRequest();
            setNodeId(id);
            setPage(0);
            setMode("browse");
          }}
        />
      ) : mode === "pinned" ? (
        <PinnedView
          items={pins.data ?? []}
          loading={pins.isLoading}
          onActivate={(node) => navigate(node, "pinned")}
          onUnpin={(id) => pin.mutate({ id, pinned: true })}
        />
      ) : (
        <>
          <div className={styles.toolbar}>
            <button
              className={styles.quietButton}
              onClick={back}
              disabled={history.length === 0 && !projection.parent}
            >
              <Icon d={iconChevronLeft} size={15} /> Back
            </button>
            <nav className={styles.breadcrumb} aria-label="Life breadcrumb">
              {projection.breadcrumb.map((item, index) => (
                <span key={item.id}>
                  {index > 0 && <span aria-hidden="true"> / </span>}
                  <button
                    className={styles.crumb}
                    onClick={() => goTo(item.id)}
                    aria-current={
                      item.id === projection.selected.id ? "page" : undefined
                    }
                  >
                    {item.title}
                  </button>
                </span>
              ))}
            </nav>
          </div>
          {projection.resolved_from_fallback && (
            <p role="status">
              The remembered location was unavailable, so the nearest available
              branch was opened.
            </p>
          )}
          <div className={styles.scene} ref={sceneRef}>
            <svg className={styles.connectors} aria-hidden="true">
              {lines.map((line) => (
                <path key={line.key} d={line.d} />
              ))}
            </svg>
            <div className={styles.focalWrap}>
              <div
                ref={focalRef}
                className={styles.focal}
                tabIndex={-1}
                data-life-focal
                data-life-id={projection.selected.id}
              >
                <div className={styles.nodeMeta}>
                  <NodeIcon iconKey={projection.selected.icon_key} />
                  <span>
                    {projection.selected.child_count} direct{" "}
                    {projection.selected.child_count === 1
                      ? "child"
                      : "children"}
                  </span>
                </div>
                <h2 className={styles.focalTitle}>
                  {projection.selected.title}
                </h2>
                <p className={styles.nodeDescription}>
                  {projection.selected.short_description}
                </p>
                <TagChipList tags={projection.selected.tags} />
                <button
                  className={styles.quietButton}
                  onClick={() =>
                    pin.mutate({
                      id: projection.selected.id,
                      pinned: projection.selected.is_pinned,
                    })
                  }
                >
                  {projection.selected.is_pinned
                    ? "Unpin focal node"
                    : "Pin focal node"}
                </button>
              </div>
            </div>
            {projection.children.length === 0 ? (
              <div className={styles.empty}>
                <h3>This branch is ready</h3>
                <EmptyState compact icon={iconLife} title="No child nodes have been added yet." body="Add a child to grow this part of your Life tree." />
              </div>
            ) : (
              <ul
                className={styles.children}
                aria-label={`Direct children of ${projection.selected.title}`}
              >
                {projection.children.map((child) => (
                  <li
                    className={styles.childItem}
                    key={child.id}
                    ref={(el) => {
                      if (el) childRefs.current.set(child.id, el);
                      else childRefs.current.delete(child.id);
                    }}
                  >
                    <button
                      className={styles.card}
                      data-life-id={child.id}
                      onClick={() => navigate(child)}
                      disabled={busy}
                    >
                      <NodeIcon iconKey={child.icon_key} />
                      <span className={styles.cardTitle}>{child.title}</span>
                      <p className={styles.nodeDescription}>
                        {child.short_description}
                      </p>
                      <span className={styles.nodeMeta}>
                        {child.is_leaf
                          ? "Leaf — opens Reader"
                          : `${child.child_count} direct children`}
                      </span>
                      <TagChipList tags={child.tags} />
                    </button>
                    <button
                      className={styles.pinButton}
                      aria-label={
                        child.is_pinned
                          ? `Unpin ${child.title}`
                          : `Pin ${child.title}`
                      }
                      onClick={() =>
                        pin.mutate({ id: child.id, pinned: child.is_pinned })
                      }
                    >
                      {child.is_pinned ? "Pinned" : "Pin"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {projection.child_page_count > 1 && (
            <nav className={styles.paging} aria-label="Child pages">
              <button
                className={styles.quietButton}
                disabled={page === 0}
                onClick={() => {
                  invalidateLinkedReaderNavigation();
                  cancelPendingEntryRequest();
                  setNodeId(projection.selected.id);
                  setPage((v) => v - 1);
                }}
              >
                Previous children
              </button>
              <span aria-live="polite">
                Page {projection.child_page + 1} of{" "}
                {projection.child_page_count}
              </span>
              <button
                className={styles.quietButton}
                disabled={page + 1 >= projection.child_page_count}
                onClick={() => {
                  invalidateLinkedReaderNavigation();
                  cancelPendingEntryRequest();
                  setNodeId(projection.selected.id);
                  setPage((v) => v + 1);
                }}
              >
                Next children
              </button>
            </nav>
          )}
          <RelatedTasksPanel nodeId={projection.selected.id} anchorLocalDate={anchorLocalDate} onNavigate={onTaskNavigate} />
        </>
      )}
    </PageFrame>
  );
}

function PinnedView({
  items,
  loading,
  onActivate,
  onUnpin,
}: {
  items: PinnedLifeNodeView[];
  loading: boolean;
  onActivate: (node: PinnedLifeNodeView) => void;
  onUnpin: (id: string) => void;
}) {
  if (loading) return <SkeletonList rows={4} label="Loading pinned nodes…" />;
  if (items.length === 0)
    return (
      <div className={styles.empty}>
        <h2>No pinned nodes</h2>
        <p>Pin a Life node from Browse for quick local access.</p>
      </div>
    );
  return (
    <ul className={styles.pinList} aria-label="Pinned Life nodes">
      {items.map((item) => (
        <li
          className={`${styles.childItem} ${item.available ? "" : styles.unavailable}`}
          key={item.node_id}
        >
          <button
            className={styles.card}
            onClick={() => onActivate(item)}
            disabled={!item.available}
          >
            <NodeIcon iconKey={item.icon_key} />
            <span className={styles.cardTitle}>{item.title}</span>
            <p>
              {item.available
                ? item.short_description
                : "Unavailable — this node is archived."}
            </p>
            <span>
              {item.available
                ? item.is_leaf
                  ? "Opens Reader"
                  : "Opens Browse"
                : "Unavailable"}
            </span>
            {item.available && <TagChipList tags={item.tags} />}
          </button>
          <button
            className={styles.pinButton}
            aria-label={`Unpin ${item.title}`}
            onClick={() => onUnpin(item.node_id)}
          >
            Unpin
          </button>
        </li>
      ))}
    </ul>
  );
}
