import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import {
  getLifeBrowseProjection,
  saveLifeNavigationPreference,
} from "../../ipc/commands";
import type { LifeNodeView } from "../../ipc/generated/LifeNodeView";
import * as styles from "./LifeScreen.css";
import { PageFrame, PageHeader } from "../../app/layout/PageFrame";
import { TagChipList } from "../tag/TagChipList";
import { LifeEditWorkspace } from "./LifeEditWorkspace";
import { BasicLeafReader } from "./document/BasicLeafReader";
import { RelatedTasksPanel } from "./RelatedTasksPanel";
import { EmptyState, LoadingRow } from "../../design-system/primitives/States";
import { Icon, iconChevronLeft, iconLife, iconNote } from "../../design-system/visual/icons";

type Mode = "browse" | "edit" | "reader";
type HistoryEntry = {
  nodeId: string;
  page: number;
  mode: "browse" | "reader";
  reader?: LifeNodeView;
  focusId?: string;
};
type Line = { key: string; d: string };
const lifeKeys = {
  browse: (id: string | undefined, page: number) =>
    ["life", "browse", id ?? "remembered", page] as const,
};
const LifeLinksPanel = lazy(() => import("./links/LifeLinksPanel"));

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
  version: string,
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
          const x1 = top.left + top.width / 2 - base.left;
          const y1 = top.bottom - base.top;
          const x2 = child.left + child.width / 2 - base.left;
          const y2 = child.top - base.top;
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
  }, [container, focal, children, version]);
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
  const [initialized, setInitialized] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [reader, setReader] = useState<LifeNodeView>();
  const [busy, setBusy] = useState(false);
  const linkedReaderNavigationGeneration = useRef(0);
  const linkedReaderBusyOwner = useRef<number | null>(null);
  const currentReaderIdRef = useRef<string | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const focalRef = useRef<HTMLDivElement>(null);
  const readerHeadingRef = useRef<HTMLHeadingElement>(null);
  const childRefs = useRef(new Map<string, HTMLElement>());
  const restoreFocus = useRef<string | undefined>(undefined);
  const preparedEntryRequestId = useRef<string | null>(null);
  const settledEntryRequestId = useRef<string | null>(null);

  currentReaderIdRef.current = mode === "reader" && reader ? reader.id : null;

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
    queryFn: () => getLifeBrowseProjection({ node_id: nodeId ?? null, child_page: page }),
    placeholderData: (previous) => previous,
  });
  const connectorVersion = `${browse.data?.selected.id ?? "loading"}:${page}:${(browse.data?.children ?? []).map((child) => child.id).join(",")}`;
  const lines = useConnectors(sceneRef, focalRef, childRefs, connectorVersion);

  useEffect(() => {
    if (!browse.data || initialized) return;
    const preferred = browse.data.preferred_mode;
    const safe: Mode =
      preferred === "reader" && browse.data.selected.is_leaf
        ? "reader"
        : preferred === "edit"
          ? "edit"
          : "browse";
    setMode(safe);
    if (safe === "reader") setReader(browse.data.selected);
    setInitialized(true);
  }, [browse.data, initialized]);

  useEffect(() => {
    if (!browse.data || !initialized) return;
    saveLifeNavigationPreference({
      node_id: browse.data.selected.id,
      mode,
      path_version: 1,
      viewport_anchor: restoreFocus.current ?? null,
    }).catch(() => {});
  }, [browse.data, initialized, mode]);

  useEffect(() => {
    if (mode === "browse" && browse.data)
      requestAnimationFrame(() => {
        const target = restoreFocus.current
          ? document.querySelector<HTMLElement>(`[data-life-id="${restoreFocus.current}"]`)
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
        mode: "browse",
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
    preparedEntryRequestId.current = requestId;
    const selected = browse.data.selected;
    const directChild = browse.data.children.find((child) => child.id === entryRequest.nodeId);

    if (entryRequest.mode === "reader" && selected.id === entryRequest.nodeId) {
      if (selected.is_leaf) {
        pushEntryHistory(selected.id);
        setReader(selected);
        setMode("reader");
      } else {
        setReader(undefined);
        setMode("browse");
      }
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

    if (selected.id !== entryRequest.nodeId) pushEntryHistory(entryRequest.nodeId);
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

  const navigate = (node: LifeNodeView) => {
    const supersedesLinkedNavigation = linkedReaderBusyOwner.current !== null;
    if (busy && !supersedesLinkedNavigation) return;
    invalidateLinkedReaderNavigation();
    cancelPendingEntryRequest();
    setBusy(true);
    const id = node.id;
    if (node.is_leaf) {
      setHistory((value) => [
        ...value,
        {
          nodeId: browse.data?.selected.id ?? id,
          page,
          mode: "browse",
          focusId: id,
        },
      ]);
      setReader(node);
      setMode("reader");
      setBusy(false);
      return;
    }
    setHistory((value) => [
      ...value,
      {
        nodeId: browse.data?.selected.id ?? id,
        page,
        mode: "browse",
        focusId: id,
      },
    ]);
    setNodeId(id);
    setPage(0);
    setMode("browse");
    setTimeout(() => setBusy(false), reduced ? 0 : 240);
  };

  const goTo = (id: string) => {
    invalidateLinkedReaderNavigation();
    cancelPendingEntryRequest();
    if (browse.data?.selected.id !== id)
      setHistory((value) => [
        ...value,
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
    const sourceReaderId = sourceReader.id;
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
      )
        return;
      if (
        target.resolved_from_fallback ||
        target.selected.id !== targetNodeId ||
        !target.selected.is_leaf
      )
        throw new Error("That Life leaf is unavailable.");
      setHistory((value) => [
        ...value,
        { nodeId: sourceReaderId, page: 0, mode: "reader", reader: sourceReader },
      ]);
      setNodeId(targetNodeId);
      setPage(0);
      setReader(target.selected);
      setMode("reader");
    } finally {
      if (linkedReaderBusyOwner.current === generation) {
        linkedReaderBusyOwner.current = null;
        setBusy(false);
      }
    }
  };

  const back = () => {
    invalidateLinkedReaderNavigation();
    cancelPendingEntryRequest();
    const previous = history.at(-1);
    if (mode === "reader") setReader(undefined);
    if (previous) {
      setHistory((value) => value.slice(0, -1));
      restoreFocus.current = previous.focusId;
      setNodeId(previous.nodeId);
      setPage(previous.page);
      if (previous.mode === "reader" && previous.reader) setReader(previous.reader);
      setMode(previous.mode);
    } else if (browse.data?.parent) {
      setNodeId(browse.data.parent.id);
      setPage(0);
      setMode("browse");
    } else {
      setMode("browse");
    }
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
        <p role="alert">Life System could not be loaded. Your tree context is preserved.</p>
      </PageFrame>
    );

  const projection = browse.data;

  if (mode === "reader" && reader) {
    return (
      <PageFrame as="section" type="wide" aria-labelledby="life-reader-title">
        <div className={styles.readerShell}>
          <button className={styles.quietButton} onClick={back}>
            <Icon d={iconChevronLeft} size={16} /> Back to Life Browse
          </button>
          <div className={styles.readerHero}>
            <NodeIcon iconKey={reader.icon_key} />
            <h1
              id="life-reader-title"
              className={styles.readerTitle}
              tabIndex={-1}
              ref={readerHeadingRef}
            >
              {reader.title}
            </h1>
            <p className={styles.nodeDescription}>{reader.short_description}</p>
            <TagChipList tags={reader.tags} maxVisible={12} />
            <BasicLeafReader nodeId={reader.id} />
            <Suspense fallback={<LoadingRow label="Loading links…" />}>
              <LifeLinksPanel nodeId={reader.id} onNavigate={openLinkedReader} />
            </Suspense>
            <RelatedTasksPanel
              nodeId={reader.id}
              anchorLocalDate={anchorLocalDate}
              onNavigate={onTaskNavigate}
            />
          </div>
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
              aria-pressed={mode === "browse"}
              onClick={() => {
                invalidateLinkedReaderNavigation();
                cancelPendingEntryRequest();
                setMode("browse");
              }}
            >
              Browse
            </button>
            <button
              className={styles.modeButton}
              aria-pressed={mode === "edit"}
              onClick={() => {
                invalidateLinkedReaderNavigation();
                cancelPendingEntryRequest();
                setMode("edit");
              }}
            >
              Edit
            </button>
          </div>
        }
      >
        <h1 id="life-heading" className={styles.heading} tabIndex={-1}>
          Life System
        </h1>
        <p className={styles.nodeDescription}>
          {mode === "edit"
            ? "Shape the structure, then return to Browse."
            : "Follow one branch at a time; open a leaf when you want depth."}
        </p>
      </PageHeader>

      {mode === "edit" ? (
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
                    aria-current={item.id === projection.selected.id ? "page" : undefined}
                  >
                    {item.title}
                  </button>
                </span>
              ))}
            </nav>
          </div>

          {projection.resolved_from_fallback && (
            <p role="status">
              The remembered location was unavailable, so the nearest available branch was opened.
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
                    {projection.selected.child_count === 1 ? "child" : "children"}
                  </span>
                </div>
                <h2 className={styles.focalTitle}>{projection.selected.title}</h2>
                <p className={styles.nodeDescription}>{projection.selected.short_description}</p>
              </div>
            </div>

            {projection.children.length === 0 ? (
              <div className={styles.empty}>
                <h3>This branch is ready</h3>
                <EmptyState
                  compact
                  icon={iconLife}
                  title="No child nodes have been added yet."
                  body="Use Edit when you want to grow this branch."
                />
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
                    ref={(element) => {
                      if (element) childRefs.current.set(child.id, element);
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
                      <span className={styles.nodeMeta}>
                        {child.is_leaf
                          ? "Leaf · open reader"
                          : `${child.child_count} direct ${child.child_count === 1 ? "child" : "children"}`}
                      </span>
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
                  setPage((value) => value - 1);
                }}
              >
                Previous children
              </button>
              <span aria-live="polite">
                Page {projection.child_page + 1} of {projection.child_page_count}
              </span>
              <button
                className={styles.quietButton}
                disabled={page + 1 >= projection.child_page_count}
                onClick={() => {
                  invalidateLinkedReaderNavigation();
                  cancelPendingEntryRequest();
                  setNodeId(projection.selected.id);
                  setPage((value) => value + 1);
                }}
              >
                Next children
              </button>
            </nav>
          )}

          <RelatedTasksPanel
            nodeId={projection.selected.id}
            anchorLocalDate={anchorLocalDate}
            onNavigate={onTaskNavigate}
          />
        </>
      )}
    </PageFrame>
  );
}
